<?php

require_once __DIR__ . '/../bitrix/BitrixClient.php';
require_once __DIR__ . '/../domain/Aggregator.php';
require_once __DIR__ . '/../cache/CacheStore.php';
require_once __DIR__ . '/../config/Config.php';
require_once __DIR__ . '/../util/DatePeriodHelper.php';

/**
 * TASK-065: Сервисный слой оркестрации.
 * Ответственность: валидация входа, выбор режима (weeks/months),
 * обращение к BitrixClient, агрегатору, кешу и формирование ответа.
 */
class GraphAdmissionClosureService
{
    public function __construct(
        private readonly BitrixClient $bitrixClient,
        private readonly Aggregator $aggregator,
        private readonly CacheStore $cacheStore,
        private readonly Config $config,
        private readonly DatePeriodHelper $dateHelper
    ) {
    }

    /**
     * Обработка запроса (оркестрация всего процесса)
     * Логика перенесена из legacy без изменений контракта (TASK-065)
     */
    public function handle(array $payload): array
    {
        $product = $payload['product'] ?? '1C';
        $weekStartParam = $payload['weekStartUtc'] ?? null;
        $weekEndParam = $payload['weekEndUtc'] ?? null;
        $periodMode = $payload['periodMode'] ?? 'weeks';
        $includeTickets = $payload['includeTickets'] ?? false;
        $includeNewTicketsByStages = $payload['includeNewTicketsByStages'] ?? false;
        $includeCarryoverTickets = $payload['includeCarryoverTickets'] ?? false;
        $includeCarryoverTicketsByDuration = $payload['includeCarryoverTicketsByDuration'] ?? false;
        $forceRefresh = $payload['forceRefresh'] ?? false;
        $debug = $payload['debug'] ?? false;

        // Валидация periodMode
        if (!in_array($periodMode, ['weeks', 'months'], true)) {
            throw new InvalidArgumentException('Invalid periodMode. Must be "weeks" or "months".');
        }

        // Обработка режима months
        if ($periodMode === 'months') {
            return $this->handleMonthsMode($payload);
        }

        // Недельный режим
        // TASK-068-04: Начало измерения времени (перед проверкой кеша)
        $weeksModeStartTime = microtime(true);
        
        [$weekStart, $weekEnd] = $this->dateHelper->getWeekBounds($weekStartParam, $weekEndParam);
        $weeks = $this->dateHelper->getFourWeeksBounds($weekStart, $weekEnd);

        // TASK-068-03: Проверка кеша для режима "weeks" (если не forceRefresh)
        // TASK-076: Использование предварительно созданных кешей
        if (!$forceRefresh) {
            $cacheKey = $this->getCacheKeyForWeeks($payload, $weekStart, $weekEnd);
            
            $cachedData = $this->cacheStore->get($cacheKey);
            if ($cachedData !== null) {
                // TASK-068-04: Логирование времени при cache hit
                // TASK-076: Добавление информации об использовании кеша
                $cacheResponseTime = microtime(true) - $weeksModeStartTime;
                error_log("[Cache] Cache hit for key: {$cacheKey}");
                error_log("[Cache] Using pre-created cache for key: {$cacheKey}");
                error_log("[WEEKS-PERFORMANCE] Total execution time (from cache): " . round($cacheResponseTime, 3) . " seconds");
                
                // Добавляем информацию об использовании кеша в ответ
                if (is_array($cachedData)) {
                    $cachedData['cache_used'] = true;
                    $cachedData['cache_key'] = $cacheKey;
                }
                
                return $cachedData;
            }
            
            error_log("[Cache] Cache miss for key: {$cacheKey}");
        } else {
            error_log("[Cache] Force refresh requested, skipping cache check");
        }

        // Загрузка тикетов через BitrixClient
        $periodStart = $weeks[0]['weekStart'];
        $periodEnd = $weeks[count($weeks) - 1]['weekEnd'];

        $createdTickets = $this->bitrixClient->fetchCreatedTickets($periodStart, $periodEnd, $debug);
        $closedTickets = $this->bitrixClient->fetchClosedTickets(
            $periodStart,
            $periodEnd,
            $this->config->getClosingStages(),
            $debug
        );

        $allTickets = $this->bitrixClient->mergeTickets($createdTickets, $closedTickets);

        if ($includeCarryoverTickets) {
            $carryoverTickets = $this->bitrixClient->fetchCarryoverTickets(
                $this->config->getTargetStages(),
                $periodEnd,
                $debug
            );
            $allTickets = $this->bitrixClient->mergeTickets($allTickets, $carryoverTickets);
        }

        // Фильтрация по product=1C
        $tickets = $this->bitrixClient->filterByProduct($allTickets, $product);

        // Агрегация через Aggregator
        $allStages = $this->config->getStagesWithMeta();
        $durationCategories = $this->config->getDurationCategories();
        $aggregated = $this->aggregator->aggregateWeeks(
            $weeks,
            $tickets,
            $this->config->getTargetStages(),
            $this->config->getClosingStages(),
            $this->config->getKeeperId(),
            $debug,
            $allStages,
            $includeNewTicketsByStages,
            $includeTickets,
            $includeCarryoverTicketsByDuration,
            $durationCategories
        );

        $series = $aggregated['series'];
        $weeksData = $aggregated['weeksData'];
        $stagesByWeek = $aggregated['stagesByWeek'];
        $currentWeekData = $aggregated['currentWeekData'];
        $stageAgg = $aggregated['stageAgg'];
        
        // TASK-070: Получаем newTicketsByStages, carryoverTicketsByDuration и responsible для текущей недели из aggregated
        $newTicketsByStages = $aggregated['currentWeekNewTicketsByStages'] ?? null;
        $carryoverTicketsByDuration = $aggregated['currentWeekCarryoverTicketsByDuration'] ?? null;
        $responsibleCreatedThisWeek = $aggregated['currentWeekResponsibleCreatedThisWeek'] ?? [];
        $responsibleCreatedOtherWeek = $aggregated['currentWeekResponsibleCreatedOtherWeek'] ?? [];

        // Формирование ответа (контракт legacy)
        $newCount = $currentWeekData['newTickets'] ?? 0;
        $closedCount = $currentWeekData['closedTickets'] ?? 0;
        $closedTicketsCreatedThisWeek = $currentWeekData['closedTicketsCreatedThisWeek'] ?? 0;
        $closedTicketsCreatedOtherWeek = $currentWeekData['closedTicketsCreatedOtherWeek'] ?? 0;
        $carryoverCount = $currentWeekData['carryoverTickets'] ?? 0;
        $carryoverTicketsCreatedThisWeek = $currentWeekData['carryoverTicketsCreatedThisWeek'] ?? 0;
        $carryoverTicketsCreatedPreviousWeek = $currentWeekData['carryoverTicketsCreatedPreviousWeek'] ?? 0;
        $carryoverTicketsCreatedOlder = $currentWeekData['carryoverTicketsCreatedOlder'] ?? 0;
        $carryoverTicketsCreatedOtherWeek = $currentWeekData['carryoverTicketsCreatedOtherWeek'] ?? 0;

        $responseData = [
            'newTickets' => $newCount,
            'closedTickets' => $closedCount,
            'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek,
            'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek,
            'series' => $series,
            'weeksData' => $weeksData,
            'currentWeek' => $currentWeekData,
            'stagesByWeek' => $stagesByWeek,
            'stages' => array_map(function ($stageId) use ($stageAgg, $allStages) {
                $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
                return [
                    'stageId' => $stageId,
                    'stageName' => $stageName,
                    'count' => $stageAgg[$stageId] ?? 0
                ];
            }, array_keys($stageAgg)),
            'responsible' => [],
            'responsibleCreatedThisWeek' => $responsibleCreatedThisWeek, // TASK-070: Данные из Aggregator
            'responsibleCreatedOtherWeek' => $responsibleCreatedOtherWeek, // TASK-070: Данные из Aggregator
            'newTicketsByStages' => $newTicketsByStages
        ];

        if ($includeCarryoverTickets) {
            $responseData['carryoverTickets'] = $carryoverCount;
            $responseData['carryoverTicketsCreatedThisWeek'] = $carryoverTicketsCreatedThisWeek;
            $responseData['carryoverTicketsCreatedPreviousWeek'] = $carryoverTicketsCreatedPreviousWeek;
            $responseData['carryoverTicketsCreatedOlder'] = $carryoverTicketsCreatedOlder;
            $responseData['carryoverTicketsCreatedOtherWeek'] = $carryoverTicketsCreatedOtherWeek;
        } else {
            $series['carryover'] = [0];
            $series['carryoverCreatedThisWeek'] = [0];
            $series['carryoverCreatedPreviousWeek'] = [0];
            $series['carryoverCreatedOlder'] = [0];
            $series['carryoverCreatedOtherWeek'] = [0];
        }

        if ($includeCarryoverTicketsByDuration) {
            $responseData['carryoverTicketsByDuration'] = $carryoverTicketsByDuration ?? [];
        }

        $response = [
            'success' => true,
            'meta' => [
                'weekNumber' => (int)$weekStart->format('W'),
                'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
                'currentWeek' => [
                    'weekNumber' => (int)$weekStart->format('W'),
                    'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                    'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z')
                ],
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'weekStartUtc' => $week['weekStartUtc'],
                        'weekEndUtc' => $week['weekEndUtc']
                    ];
                }, $weeks)
            ],
            'data' => $responseData,
            'carryoverDebug' => [
                'total' => $carryoverCount ?? 0,
                'thisWeek' => $carryoverTicketsCreatedThisWeek ?? 0,
                'previousWeek' => $carryoverTicketsCreatedPreviousWeek ?? 0,
                'older' => $carryoverTicketsCreatedOlder ?? 0,
                'sum' => ($carryoverTicketsCreatedThisWeek ?? 0) + ($carryoverTicketsCreatedPreviousWeek ?? 0) + ($carryoverTicketsCreatedOlder ?? 0),
                'series' => [
                    'carryover' => $series['carryover'] ?? [],
                    'carryoverCreatedThisWeek' => $series['carryoverCreatedThisWeek'] ?? [],
                    'carryoverCreatedPreviousWeek' => $series['carryoverCreatedPreviousWeek'] ?? [],
                    'carryoverCreatedOlder' => $series['carryoverCreatedOlder'] ?? [],
                ],
                'currentWeekData' => $currentWeekData ? [
                    'weekNumber' => $currentWeekData['weekNumber'] ?? null,
                    'carryoverTickets' => $currentWeekData['carryoverTickets'] ?? 0,
                    'carryoverTicketsCreatedThisWeek' => $currentWeekData['carryoverTicketsCreatedThisWeek'] ?? 0,
                    'carryoverTicketsCreatedPreviousWeek' => $currentWeekData['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                    'carryoverTicketsCreatedOlder' => $currentWeekData['carryoverTicketsCreatedOlder'] ?? 0,
                ] : null,
                'weeksData' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'] ?? null,
                        'carryoverTickets' => $week['carryoverTickets'] ?? 0,
                        'carryoverTicketsCreatedThisWeek' => $week['carryoverTicketsCreatedThisWeek'] ?? 0,
                        'carryoverTicketsCreatedPreviousWeek' => $week['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                        'carryoverTicketsCreatedOlder' => $week['carryoverTicketsCreatedOlder'] ?? 0,
                    ];
                }, $weeksData ?? [])
            ],
            'debug' => $debug ? [
                'fetchedTotal' => count($tickets),
                'sample' => array_slice($tickets, 0, 5),
                'stageCounts' => $stageAgg,
                'carryoverBreakdown' => [
                    'total' => $carryoverCount ?? 0,
                    'thisWeek' => $carryoverTicketsCreatedThisWeek ?? 0,
                    'previousWeek' => $carryoverTicketsCreatedPreviousWeek ?? 0,
                    'older' => $carryoverTicketsCreatedOlder ?? 0,
                    'sum' => ($carryoverTicketsCreatedThisWeek ?? 0) + ($carryoverTicketsCreatedPreviousWeek ?? 0) + ($carryoverTicketsCreatedOlder ?? 0),
                ],
                'params' => [
                    'product' => $product,
                    'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                    'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
                    'includeCarryoverTickets' => $includeCarryoverTickets
                ]
            ] : null
        ];

        // TASK-068-03: Сохранение в кеш для режима "weeks"
        // Сохраняем только успешные ответы
        if (isset($response['success']) && $response['success'] === true) {
            $cacheKey = $this->getCacheKeyForWeeks($payload, $weekStart, $weekEnd);
            
            if ($this->cacheStore->set($cacheKey, $response, 120)) {
                error_log("[Cache] Cache saved for key: {$cacheKey}");
            } else {
                error_log("[Cache] Failed to save cache for key: {$cacheKey}");
            }
            
            // Периодическая очистка устаревших кешей (каждый 10-й запрос)
            if (rand(1, 10) === 1) {
                $deleted = $this->cacheStore->clearExpired();
                if ($deleted > 0) {
                    error_log("[Cache] Cleared {$deleted} expired cache entries");
                }
            }
        }

        // TASK-068-04: Логирование общего времени выполнения
        $weeksModeTotalTime = microtime(true) - $weeksModeStartTime;
        error_log("[WEEKS-PERFORMANCE] Total execution time: " . round($weeksModeTotalTime, 2) . " seconds");

        return $response;
    }

    /**
     * TASK-067-5: Обработка месячного режима
     * 
     * Реализует функционал режима "3 месяца" (TASK-053-03) и "4 месяца" (TASK-058-01).
     * 
     * @param array $payload Входные параметры запроса
     * @return array Структура ответа (success, meta, data)
     */
    private function handleMonthsMode(array $payload): array
    {
        $monthsModeStartTime = microtime(true);

        // Валидация параметров
        $product = $payload['product'] ?? '1C';
        $includeTickets = $payload['includeTickets'] ?? false;
        $includeNewTicketsByStages = $payload['includeNewTicketsByStages'] ?? false;
        $includeCarryoverTickets = $payload['includeCarryoverTickets'] ?? false;
        $includeCarryoverTicketsByDuration = $payload['includeCarryoverTicketsByDuration'] ?? false;
        $forceRefresh = $payload['forceRefresh'] ?? false;
        $debug = $payload['debug'] ?? false;

        // Проверка кеша
        // TASK-076: Использование предварительно созданных кешей
        if (!$forceRefresh) {
            $cacheKey = $this->cacheStore->generateKey([
                'product' => $product,
                'periodMode' => 'months',
                'includeTickets' => $includeTickets,
                'includeNewTicketsByStages' => $includeNewTicketsByStages,
                'includeCarryoverTickets' => $includeCarryoverTickets,
                'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
            ]);

            $cachedData = $this->cacheStore->get($cacheKey);
            if ($cachedData !== null) {
                $cacheResponseTime = microtime(true) - $monthsModeStartTime;
                error_log("[Cache] Cache hit for key: {$cacheKey}");
                error_log("[Cache] Using pre-created cache for key: {$cacheKey}");
                error_log("[MONTHS-PERFORMANCE] Total execution time (from cache): " . round($cacheResponseTime, 3) . " seconds");
                
                // Добавляем информацию об использовании кеша в ответ
                if (is_array($cachedData)) {
                    $cachedData['cache_used'] = true;
                    $cachedData['cache_key'] = $cacheKey;
                }
                
                return $cachedData;
            }

            error_log("[Cache] Cache miss for key: {$cacheKey}");
        } else {
            error_log("[Cache] Force refresh requested, skipping cache check");
        }

        // TASK-058-01: Получаем 4 месяца (3 для отображения + 1 для процентов)
        $allMonths = $this->dateHelper->calculateLastFourMonths();
        // Структура $allMonths: [0 => Сентябрь (4-й, для процентов), 1 => Октябрь, 2 => Ноябрь, 3 => Декабрь]

        // Последние 3 месяца для отображения (Октябрь, Ноябрь, Декабрь)
        $months = array_slice($allMonths, 1, 3); // Индексы 1, 2, 3

        // 4-й месяц (самый старый, Сентябрь) для расчета процентов
        $previousMonth = $allMonths[0] ?? null; // Индекс 0

        // Период для загрузки тикетов (от начала 4-го месяца до конца 3-го месяца)
        $periodStart = $allMonths[0]['monthStart'];
        $periodEnd = $allMonths[3]['monthEnd'];
        $periodStartUtc = $periodStart->format('Y-m-d\TH:i:s\Z');
        $periodEndUtc = $periodEnd->format('Y-m-d\TH:i:s\Z');

        // Загрузка тикетов через BitrixClient
        $allTickets = $this->bitrixClient->fetchTicketsForMonths(
            $periodStart,
            $periodEnd,
            $product,
            $this->config->getClosingStages(),
            $debug
        );

        // Загрузка переходящих тикетов (если запрошено)
        if ($includeCarryoverTickets) {
            $carryoverTickets = $this->bitrixClient->fetchCarryoverTicketsForMonths(
                $this->config->getTargetStages(),
                $periodEnd,
                $product,
                $debug
            );
            $allTickets = $this->bitrixClient->mergeTickets($allTickets, $carryoverTickets);
        }

        // Агрегация через Aggregator
        $aggregationResult = $this->aggregator->aggregateMonths(
            $months,
            $allTickets,
            $this->config->getTargetStages(),
            $this->config->getClosingStages(),
            $this->config->getKeeperId(),
            $debug
        );
        $monthMetrics = $aggregationResult['monthMetrics'];
        $stageAgg = $aggregationResult['stageAgg'];

        // Расчёт previousPeriodData
        $previousPeriodData = $this->aggregator->calculatePreviousPeriodData(
            $previousMonth,
            $allTickets,
            $this->config->getTargetStages(),
            $this->config->getClosingStages(),
            $this->config->getKeeperId()
        );

        // Формирование ответа из агрегированных данных
        $newTicketsByMonth = [];
        $closedTicketsByMonth = [];
        $carryoverTicketsByMonth = [];
        $totalNewTickets = 0;
        $totalClosedTickets = 0;
        $totalCarryoverTickets = 0;

        $allStages = $this->config->getStagesWithMeta();

        foreach ($months as $month) {
            $monthNumber = $month['monthNumber'];
            $metrics = $monthMetrics[$monthNumber];

            // Подсчёт итогов
            $totalNewTickets += $metrics['newTickets'];
            $totalClosedTickets += $metrics['closedTickets'];
            $totalCarryoverTickets += $metrics['carryoverTickets'];

            // Формирование данных для недель
            $weeksData = [];
            foreach ($month['weeks'] as $week) {
                $weekNumber = $week['weekNumber'];
                $weekMetrics = $metrics['weeks'][$weekNumber] ?? [
                    'newTickets' => 0,
                    'closedTickets' => 0,
                    'closedTicketsCreatedThisWeek' => 0,
                    'closedTicketsCreatedOtherWeek' => 0,
                    'carryoverTickets' => 0,
                    'carryoverTicketsCreatedThisWeek' => 0,
                    'carryoverTicketsCreatedPreviousWeek' => 0,
                    'carryoverTicketsCreatedOlder' => 0,
                    'carryoverTicketsCreatedOtherWeek' => 0
                ];

                $weeksData[] = [
                    'weekNumber' => $weekNumber,
                    'count' => $weekMetrics['newTickets'],
                    'closedCount' => $weekMetrics['closedTickets'],
                    'closedCreatedThisWeek' => $weekMetrics['closedTicketsCreatedThisWeek'],
                    'closedCreatedOtherWeek' => $weekMetrics['closedTicketsCreatedOtherWeek'],
                    'carryoverCount' => $weekMetrics['carryoverTickets'],
                    'carryoverCreatedThisWeek' => $weekMetrics['carryoverTicketsCreatedThisWeek'],
                    'carryoverCreatedPreviousWeek' => $weekMetrics['carryoverTicketsCreatedPreviousWeek'] ?? 0,
                    'carryoverCreatedOlder' => $weekMetrics['carryoverTicketsCreatedOlder'] ?? 0,
                    'carryoverCreatedOtherWeek' => $weekMetrics['carryoverTicketsCreatedOtherWeek'] ?? 0
                ];
            }

            // Формирование ответа для месяца
            $newTicketsByMonth[] = [
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['newTickets'],
                'weeks' => $weeksData
            ];

            $closedTicketsByMonth[] = [
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['closedTickets'],
                'closedCreatedThisWeek' => $metrics['closedTicketsCreatedThisWeek'],
                'closedCreatedOtherWeek' => $metrics['closedTicketsCreatedOtherWeek'],
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'count' => $week['closedCount'],
                        'closedCreatedThisWeek' => $week['closedCreatedThisWeek'],
                        'closedCreatedOtherWeek' => $week['closedCreatedOtherWeek']
                    ];
                }, $weeksData)
            ];

            $carryoverTicketsByMonth[] = [
                'month' => $monthNumber,
                'monthName' => $month['monthName'],
                'count' => $metrics['carryoverTickets'],
                'carryoverCreatedThisWeek' => $metrics['carryoverTicketsCreatedThisWeek'],
                'carryoverCreatedOtherWeek' => $metrics['carryoverTicketsCreatedOtherWeek'],
                'weeks' => array_map(function($week) {
                    return [
                        'weekNumber' => $week['weekNumber'],
                        'count' => $week['carryoverCount'],
                        'carryoverCreatedThisWeek' => $week['carryoverCreatedThisWeek'],
                        'carryoverCreatedOtherWeek' => $week['carryoverCreatedOtherWeek']
                    ];
                }, $weeksData)
            ];
        }

        // Формирование массива стадий
        $stages = [];
        foreach ($stageAgg as $stageId => $count) {
            $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
            $stages[] = [
                'stageId' => $stageId,
                'stageName' => $stageName,
                'count' => $count
            ];
        }

        // Формирование ответа
        $response = [
            'success' => true,
            'meta' => [
                'periodMode' => 'months',
                'periodStartUtc' => $periodStartUtc,
                'periodEndUtc' => $periodEndUtc,
                'months' => array_map(function($month) {
                    return [
                        'monthNumber' => $month['monthNumber'],
                        'monthName' => $month['monthName'],
                        'year' => $month['year'],
                        'monthStartUtc' => $month['monthStartUtc'],
                        'monthEndUtc' => $month['monthEndUtc'],
                        'weeks' => array_map(function($week) {
                            return [
                                'weekNumber' => $week['weekNumber'],
                                'weekStartUtc' => $week['weekStartUtc'],
                                'weekEndUtc' => $week['weekEndUtc']
                            ];
                        }, $month['weeks'])
                    ];
                }, $months)
            ],
            'data' => [
                'newTickets' => $totalNewTickets,
                'newTicketsByMonth' => $newTicketsByMonth,
                'closedTickets' => $totalClosedTickets,
                'closedTicketsByMonth' => $closedTicketsByMonth,
                'carryoverTickets' => $totalCarryoverTickets,
                'carryoverTicketsByMonth' => $carryoverTicketsByMonth,
                'stages' => $stages,
                'responsible' => [], // TODO: Реализовать агрегацию по сотрудникам при необходимости
                'previousPeriodData' => $previousPeriodData
            ]
        ];

        // Сохранение в кеш
        $cacheKey = $this->cacheStore->generateKey([
            'product' => $product,
            'periodMode' => 'months',
            'includeTickets' => $includeTickets,
            'includeNewTicketsByStages' => $includeNewTicketsByStages,
            'includeCarryoverTickets' => $includeCarryoverTickets,
            'includeCarryoverTicketsByDuration' => $includeCarryoverTicketsByDuration
        ]);

        if ($this->cacheStore->set($cacheKey, $response, 300)) {
            error_log("[Cache] Cache saved for key: {$cacheKey}");
        } else {
            error_log("[Cache] Failed to save cache for key: {$cacheKey}");
        }

        // Периодическая очистка устаревших кешей (каждый 10-й запрос)
        if (rand(1, 10) === 1) {
            $deleted = $this->cacheStore->clearExpired();
            if ($deleted > 0) {
                error_log("[Cache] Cleared {$deleted} expired cache entries");
            }
        }

        // Логирование общего времени выполнения
        $monthsModeTotalTime = microtime(true) - $monthsModeStartTime;
        error_log("[MONTHS-PERFORMANCE] Total execution time: " . round($monthsModeTotalTime, 2) . " seconds");

        return $response;
    }

    /**
     * Генерация ключа кеша для режима "weeks"
     * 
     * TASK-068-03: Создан для избежания дублирования кода
     * 
     * @param array $payload Параметры запроса (payload)
     * @param DateTimeImmutable $weekStart Начало недели
     * @param DateTimeImmutable $weekEnd Конец недели
     * @return string Ключ кеша
     */
    private function getCacheKeyForWeeks(array $payload, DateTimeImmutable $weekStart, DateTimeImmutable $weekEnd): string
    {
        return $this->cacheStore->generateKey([
            'product' => $payload['product'] ?? '1C',
            'periodMode' => 'weeks',
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
            'includeTickets' => $payload['includeTickets'] ?? false,
            'includeNewTicketsByStages' => $payload['includeNewTicketsByStages'] ?? false,
            'includeCarryoverTickets' => $payload['includeCarryoverTickets'] ?? false,
            'includeCarryoverTicketsByDuration' => $payload['includeCarryoverTicketsByDuration'] ?? false
        ]);
    }
}
