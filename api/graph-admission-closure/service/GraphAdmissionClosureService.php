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

        // Обработка режима months (заглушка, будет реализовано позже)
        if ($periodMode === 'months') {
            throw new RuntimeException('TASK-065: months mode not migrated yet. Use legacy endpoint.');
        }

        // Недельный режим
        [$weekStart, $weekEnd] = $this->dateHelper->getWeekBounds($weekStartParam, $weekEndParam);
        $weeks = $this->dateHelper->getFourWeeksBounds($weekStart, $weekEnd);

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
        $aggregated = $this->aggregator->aggregateWeeks(
            $weeks,
            $tickets,
            $this->config->getTargetStages(),
            $this->config->getClosingStages(),
            $this->config->getKeeperId(),
            $debug,
            $allStages
        );

        $series = $aggregated['series'];
        $weeksData = $aggregated['weeksData'];
        $stagesByWeek = $aggregated['stagesByWeek'];
        $currentWeekData = $aggregated['currentWeekData'];
        $stageAgg = $aggregated['stageAgg'];

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
            'responsibleCreatedThisWeek' => [],
            'responsibleCreatedOtherWeek' => [],
            'newTicketsByStages' => $includeNewTicketsByStages ? [] : null
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
            $responseData['carryoverTicketsByDuration'] = [];
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

        return $response;
    }
}
