<?php
/**
 * API endpoint: График приёма и закрытий сектора 1С
 *
 * Реализует контракт из TASK-041-02:
 * - Неделя ISO-8601 (пн–вс), расчёт в UTC.
 * - product=1C фильтруется первым шагом.
 * - Закрывающие стадии: DT140_12:SUCCESS, DT140_12:FAIL, DT140_12:UC_0GBU8Z.
 * - Ответ: meta + data (newTickets, closedTickets, series, stages, responsible).
 *
 * Примечание: минимальная реализация напрямую читает Bitrix24 через CRest.
 * При необходимости можно заменить на кеш/логи.
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: application/json; charset=utf-8');

function jsonResponse($data)
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function parseJsonBody(): array
{
    $input = file_get_contents('php://input');
    if (!$input) {
        return [];
    }
    $decoded = json_decode($input, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Возвращает границы текущей ISO-недели (UTC) если не переданы в запросе.
 */
function getWeekBounds(?string $start, ?string $end): array
{
    $tz = new DateTimeZone('UTC');

    if ($start && $end) {
        return [
            new DateTimeImmutable($start, $tz),
            new DateTimeImmutable($end, $tz)
        ];
    }

    $now = new DateTimeImmutable('now', $tz);
    $isoYear = (int)$now->format('o');
    $isoWeek = (int)$now->format('W');

    $weekStart = (new DateTimeImmutable('now', $tz))
        ->setISODate($isoYear, $isoWeek, 1)
        ->setTime(0, 0, 0);
    $weekEnd = $weekStart
        ->modify('+6 days')
        ->setTime(23, 59, 59);

    return [$weekStart, $weekEnd];
}

/**
 * Проверка попадания даты в интервал [start, end]
 */
function isInRange(?string $dateStr, DateTimeImmutable $start, DateTimeImmutable $end): bool
{
    if (!$dateStr) {
        return false;
    }
    $ts = strtotime($dateStr);
    if ($ts === false) {
        return false;
    }
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    return $dt >= $start && $dt <= $end;
}

/**
 * Определение категории срока для переходящего тикета
 * 
 * Срок считается от weekStartUtc (начала текущего периода) до createdTime (даты создания тикета).
 * 
 * @param string $createdTime Дата создания тикета (ISO-8601)
 * @param DateTimeImmutable $weekStart Начало недели (UTC)
 * @return string Категория срока: up_to_month, less_than_month, more_than_month, more_than_2_months, more_than_half_year, more_than_year
 */
function calculateDurationCategory(string $createdTime, DateTimeImmutable $weekStart): string
{
    $ts = strtotime($createdTime);
    if ($ts === false) {
        return 'up_to_month'; // По умолчанию, если дата некорректна
    }
    
    $createdDt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    $diff = $weekStart->diff($createdDt);
    $days = (int)$diff->format('%a'); // Количество дней
    
    if ($days < 14) {
        return 'up_to_month'; // До 1 месяца (0-13 дней)
    } elseif ($days < 30) {
        return 'less_than_month'; // Менее 1 месяца (14-29 дней)
    } elseif ($days < 60) {
        return 'more_than_month'; // Более 1 месяца (30-59 дней)
    } elseif ($days < 180) {
        return 'more_than_2_months'; // Более 2 месяцев (60-179 дней)
    } elseif ($days < 365) {
        return 'more_than_half_year'; // Более полугода (180-364 дня)
    } else {
        return 'more_than_year'; // Более года (≥365 дней)
    }
}

/**
 * Проверка, является ли тикет переходящим
 * 
 * Переходящий тикет — это тикет, который:
 * 1. Создан до начала текущей недели (createdTime < weekStart)
 * 2. Находится в рабочих стадиях (targetStages)
 * 3. Не в закрывающих стадиях (closingStages)
 * 
 * @param array $ticket Данные тикета
 * @param DateTimeImmutable $weekStart Начало недели (UTC)
 * @param array $targetStages Рабочие стадии
 * @param array $closingStages Закрывающие стадии
 * @return bool
 */
function isCarryoverTicket(array $ticket, DateTimeImmutable $weekStart, array $targetStages, array $closingStages): bool
{
    $createdTime = $ticket['createdTime'] ?? null;
    $stageId = $ticket['stageId'] ?? null;
    
    if (!$createdTime || !$stageId) {
        return false;
    }
    
    // Нормализация stageId
    $stageId = strtoupper($stageId);
    
    // Условие 1: Создан до начала недели
    $ts = strtotime($createdTime);
    if ($ts === false) {
        return false;
    }
    $createdDt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('UTC'));
    if ($createdDt >= $weekStart) {
        return false; // Создан в текущую неделю, не переходящий
    }
    
    // Условие 2: Находится в рабочих стадиях
    if (!in_array($stageId, $targetStages, true)) {
        return false; // Не в рабочей стадии
    }
    
    // Условие 3: Не в закрывающих стадиях (дополнительная проверка)
    if (in_array($stageId, $closingStages, true)) {
        return false; // В закрывающей стадии
    }
    
    return true;
}

try {
    $body = parseJsonBody();

    $product = isset($body['product']) ? (string)$body['product'] : '1C';
    $weekStartParam = isset($body['weekStartUtc']) ? (string)$body['weekStartUtc'] : null;
    $weekEndParam = isset($body['weekEndUtc']) ? (string)$body['weekEndUtc'] : null;
    $includeTickets = isset($body['includeTickets']) ? (bool)$body['includeTickets'] : false;
    $includeNewTicketsByStages = isset($body['includeNewTicketsByStages']) ? (bool)$body['includeNewTicketsByStages'] : false;
    $includeCarryoverTickets = isset($body['includeCarryoverTickets']) ? (bool)$body['includeCarryoverTickets'] : false;
    $includeCarryoverTicketsByDuration = isset($body['includeCarryoverTicketsByDuration']) ? (bool)$body['includeCarryoverTicketsByDuration'] : false;
    $debug = isset($body['debug']) ? (bool)$body['debug'] : false;

    // Границы недели
    [$weekStart, $weekEnd] = getWeekBounds($weekStartParam, $weekEndParam);

    // Опорные значения (совпадают с модулями 1/2), но выборку делаем по всем стадиям,
    // чтобы не потерять новые тикеты, которые появляются вне targetStages.
    $targetStages = [
        'DT140_12:UC_0VHWE2',   // formed
        'DT140_12:PREPARATION', // review
        'DT140_12:CLIENT'       // execution
    ];
    $closingStages = [
        'DT140_12:SUCCESS',
        'DT140_12:FAIL',
        'DT140_12:UC_0GBU8Z'
    ];
    $keeperId = 1051; // KEEPER_OBJECTS_ID

    // Запрос элементов смарт-процесса 140
    // Стратегия: запрашиваем тикеты, которые либо созданы в неделю, либо закрыты в неделю
    $entityTypeId = 140;
    $pageSize = 50;
    $start = 0;
    $tickets = [];
    $debugRaw = [];
    
    // Форматируем даты для фильтра Bitrix24 (нужен формат YYYY-MM-DD HH:MI:SS)
    $weekStartStr = $weekStart->format('Y-m-d H:i:s');
    $weekEndStr = $weekEnd->format('Y-m-d H:i:s');

    // Запрос 1: тикеты, созданные в неделю (для новых)
    // Запрос 2: тикеты, закрытые в неделю (movedTime в неделе + закрывающие стадии)
    // Объединяем оба запроса
    
    $allTicketsMap = []; // Используем map по ID, чтобы избежать дублей
    
    // Запрос тикетов, созданных в неделю
    $start = 0;
    do {
        $result = CRest::call('crm.item.list', [
            'entityTypeId' => $entityTypeId,
            'filter' => [
                '>=createdTime' => $weekStartStr,
                '<=createdTime' => $weekEndStr
            ],
            'select' => [
                'id',
                'title',
                'stageId',
                'assignedById',
                'createdTime',
                'updatedTime',
                'movedTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'ufCrm7TypeProduct'
            ],
            'start' => $start
        ]);

        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        $start += $pageSize;
    } while (isset($result['result']['next']));
    
    // Запрос тикетов, закрытых в неделю (movedTime в неделе + закрывающие стадии)
    $start = 0;
    do {
        $result = CRest::call('crm.item.list', [
            'entityTypeId' => $entityTypeId,
            'filter' => [
                '>=movedTime' => $weekStartStr,
                '<=movedTime' => $weekEndStr,
                'stageId' => $closingStages
            ],
            'select' => [
                'id',
                'title',
                'stageId',
                'assignedById',
                'createdTime',
                'updatedTime',
                'movedTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'ufCrm7TypeProduct'
            ],
            'start' => $start
        ]);

        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        $start += $pageSize;
    } while (isset($result['result']['next']));
    
    // Запрос 3: переходящие тикеты (созданные до начала недели, в рабочих стадиях)
    // Запрашиваем только если includeCarryoverTickets === true
    // ВАЖНО: Запрашиваем каждую стадию отдельно, так как Bitrix24 может некорректно обрабатывать фильтр по массиву стадий
    if ($includeCarryoverTickets) {
        $carryoverQueryCount = 0; // Счётчик для отладки
        
        // Запрашиваем тикеты для каждой рабочей стадии отдельно
        foreach ($targetStages as $stageId) {
            $start = 0;
            do {
                $result = CRest::call('crm.item.list', [
                    'entityTypeId' => $entityTypeId,
                    'filter' => [
                        '<createdTime' => $weekStartStr,
                        'stageId' => $stageId  // Фильтр по одной стадии
                    ],
                    'select' => [
                        'id',
                        'title',
                        'stageId',
                        'assignedById',
                        'createdTime',
                        'updatedTime',
                        'movedTime',
                        'UF_CRM_7_TYPE_PRODUCT',
                        'ufCrm7TypeProduct'
                    ],
                    'start' => $start
                ]);

                if (isset($result['error'])) {
                    throw new Exception($result['error_description'] ?? $result['error']);
                }

                $items = $result['result']['items'] ?? [];
                $carryoverQueryCount += count($items);
                
                foreach ($items as $item) {
                    // Добавляем только если тикет ещё не был добавлен
                    if (!isset($allTicketsMap[$item['id']])) {
                        $allTicketsMap[$item['id']] = $item;
                    }
                }

                // Проверяем наличие следующей страницы
                $hasNext = isset($result['result']['next']) && $result['result']['next'] > 0;
                $start += $pageSize;
                
                // Дополнительная проверка: если получили меньше pageSize элементов, значит это последняя страница
                if (count($items) < $pageSize) {
                    $hasNext = false;
                }
            } while ($hasNext);
        }
        
        // Отладочная информация
        if ($debug) {
            $debugRaw['carryover_query_total'] = $carryoverQueryCount;
            $debugRaw['carryover_query_unique'] = count(array_filter($allTicketsMap, function($item) use ($weekStartStr, $targetStages) {
                $createdTime = $item['createdTime'] ?? null;
                $stageId = $item['stageId'] ?? null;
                if (!$createdTime || !$stageId) {
                    return false;
                }
                $stageIdUpper = strtoupper($stageId);
                $createdDt = new DateTimeImmutable($createdTime, new DateTimeZone('UTC'));
                $weekStart = new DateTimeImmutable($weekStartStr, new DateTimeZone('UTC'));
                return $createdDt < $weekStart && in_array($stageIdUpper, $targetStages, true);
            }));
        }
    }
    
    // Преобразуем map в массив
    $allTickets = array_values($allTicketsMap);

    // Фильтруем по product=1C (первым шагом, как в модулях 1/2)
    foreach ($allTickets as $item) {
        // Фильтр product первым шагом
        $tagRaw = $item['UF_CRM_7_TYPE_PRODUCT'] ?? $item['ufCrm7TypeProduct'] ?? null;
        $tags = [];
        if (is_array($tagRaw)) {
            $tags = $tagRaw;
        } elseif (is_string($tagRaw)) {
            $parts = array_map('trim', explode(',', $tagRaw));
            $tags = $parts;
        }
        $normalized = array_map(function ($v) {
            return mb_strtoupper(str_replace('С', 'C', trim((string)$v)));
        }, $tags);
        $is1C = in_array('1C', $normalized, true);
        if (!$is1C && mb_strtoupper($product) === '1C') {
            continue;
        }

        if ($debug && count($debugRaw) < 10) {
            $debugRaw[] = $item;
        }
        $tickets[] = $item;
    }

    // Определение всех стадий с названиями и цветами
    $allStages = [
        'DT140_12:UC_0VHWE2' => ['name' => 'Сформировано обращение', 'color' => '#007bff'],
        'DT140_12:PREPARATION' => ['name' => 'Рассмотрение ТЗ', 'color' => '#ffc107'],
        'DT140_12:CLIENT' => ['name' => 'Исполнение', 'color' => '#28a745'],
        'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
        'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
        'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
    ];
    
    // Определение всех категорий сроков с названиями и цветами (TASK-044-04)
    // Порядок важен: от меньшего к большему сроку
    $durationCategories = [
        'up_to_month' => [
            'label' => 'До 1 месяца',
            'color' => '#28a745' // Зелёный (свежие тикеты, 0-13 дней)
        ],
        'less_than_month' => [
            'label' => 'Менее 1 месяца',
            'color' => '#6cbd45' // Светло-зелёный (14-29 дней)
        ],
        'more_than_month' => [
            'label' => 'Более 1 месяца',
            'color' => '#ffc107' // Жёлтый (30-59 дней)
        ],
        'more_than_2_months' => [
            'label' => 'Более 2 месяцев',
            'color' => '#ff9800' // Оранжевый (60-179 дней)
        ],
        'more_than_half_year' => [
            'label' => 'Более полугода',
            'color' => '#dc3545' // Красный (180-364 дня)
        ],
        'more_than_year' => [
            'label' => 'Более года',
            'color' => '#c82333' // Тёмно-красный (≥365 дней)
        ]
    ];

    // Инициализация агрегации новых тикетов по стадиям
    $newTicketsByStagesAgg = [];
    if ($includeNewTicketsByStages) {
        foreach ($allStages as $stageId => $stageInfo) {
            $newTicketsByStagesAgg[$stageId] = [
                'stageId' => $stageId,
                'stageName' => $stageInfo['name'],
                'color' => $stageInfo['color'],
                'count' => 0,
                'tickets' => []
            ];
        }
    }

    // Агрегации
    $newCount = 0;
    $closedCount = 0;
    $carryoverCount = 0;
    $carryoverTickets = []; // Для будущего использования
    $stageAgg = [];
    $responsibleAgg = [];
    
    // Инициализация агрегации переходящих тикетов по срокам (TASK-044-04)
    $carryoverTicketsByDurationAgg = [];
    if ($includeCarryoverTicketsByDuration) {
        foreach ($durationCategories as $category => $info) {
            $carryoverTicketsByDurationAgg[$category] = [
                'durationCategory' => $category,
                'durationLabel' => $info['label'],
                'color' => $info['color'],
                'count' => 0,
                'tickets' => []
            ];
        }
    }

    foreach ($tickets as $ticket) {
        $createdTime = $ticket['createdTime'] ?? null;
        // Для закрытых используем movedTime, если нет — fallback на updatedTime
        $movedTime = $ticket['movedTime'] ?? $ticket['updatedTime'] ?? null;
        $stageId = $ticket['stageId'] ?? null;
        $stageId = $stageId ? strtoupper($stageId) : null;
        $assignedRaw = $ticket['assignedById'] ?? null;

        // Новые за неделю
        if (isInRange($createdTime, $weekStart, $weekEnd)) {
            $newCount++;
            
            // Если нужно включить новые тикеты по стадиям
            if ($includeNewTicketsByStages && $stageId && isset($newTicketsByStagesAgg[$stageId])) {
                $newTicketsByStagesAgg[$stageId]['count']++;
                
                // Если нужно включить тикеты, сохранить данные тикета
                if ($includeTickets) {
                    // Нормализация assignedById (как для закрытых тикетов)
                    $responsibleId = $assignedRaw;
                    if (is_array($responsibleId)) {
                        $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
                    }
                    $responsibleId = $responsibleId ? (int)$responsibleId : null;
                    
                    $newTicketsByStagesAgg[$stageId]['tickets'][] = [
                        'id' => (int)$ticket['id'],
                        'title' => $ticket['title'] ?? 'Без названия',
                        'createdTime' => $ticket['createdTime'] ?? null,
                        'stageId' => $stageId,
                        'assignedById' => $responsibleId
                    ];
                }
            }
        }

        // Закрытые за неделю
        if ($stageId && in_array($stageId, $closingStages, true) && isInRange($movedTime, $weekStart, $weekEnd)) {
            $closedCount++;

            // Агрегация по стадиям
            if (!isset($stageAgg[$stageId])) {
                $stageAgg[$stageId] = 0;
            }
            $stageAgg[$stageId]++;

            // Агрегация по ответственным (для попапа 1-го уровня)
            $responsibleId = $assignedRaw;
            if (is_array($responsibleId)) {
                $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
            }
            $responsibleId = $responsibleId ? (int)$responsibleId : null;
            $responsibleKey = ($responsibleId === null || $responsibleId === $keeperId) ? 'unassigned' : (string)$responsibleId;

            if (!isset($responsibleAgg[$responsibleKey])) {
                $responsibleAgg[$responsibleKey] = [
                    'id' => $responsibleId,
                    'name' => ($responsibleId === null || $responsibleId === $keeperId) ? 'Не назначен' : ('ID ' . $responsibleId),
                    'count' => 0,
                    'tickets' => [] // Добавить массив для тикетов
                ];
            }
            $responsibleAgg[$responsibleKey]['count']++;
            
            // Если нужно включить тикеты, сохранить данные тикета
            if ($includeTickets) {
                $responsibleAgg[$responsibleKey]['tickets'][] = [
                    'id' => (int)$ticket['id'],
                    'title' => $ticket['title'] ?? 'Без названия',
                    'createdTime' => $ticket['createdTime'] ?? null,
                    'movedTime' => $movedTime,
                    'stageId' => $stageId,
                    'assignedById' => $responsibleId
                ];
            }
        }
        
        // Переходящие тикеты (созданные до начала недели, в рабочих стадиях, не закрытые)
        if ($includeCarryoverTickets && isCarryoverTicket($ticket, $weekStart, $targetStages, $closingStages)) {
            $carryoverCount++;
            
            // Нормализация assignedById (как для закрытых тикетов)
            $responsibleId = $assignedRaw;
            if (is_array($responsibleId)) {
                $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
            }
            $responsibleId = $responsibleId ? (int)$responsibleId : null;
            
            // Сохранить данные тикета для будущего использования
            if ($includeTickets) {
                $carryoverTickets[] = [
                    'id' => (int)$ticket['id'],
                    'title' => $ticket['title'] ?? 'Без названия',
                    'createdTime' => $createdTime,
                    'stageId' => $stageId,
                    'assignedById' => $responsibleId
                ];
            }
            
            // Группировка переходящих тикетов по срокам (TASK-044-04)
            if ($includeCarryoverTicketsByDuration && $createdTime) {
                $category = calculateDurationCategory($createdTime, $weekStart);
                
                if (isset($carryoverTicketsByDurationAgg[$category])) {
                    $carryoverTicketsByDurationAgg[$category]['count']++;
                    
                    // Если нужно включить тикеты, сохранить данные тикета
                    if ($includeTickets) {
                        $carryoverTicketsByDurationAgg[$category]['tickets'][] = [
                            'id' => (int)$ticket['id'],
                            'title' => $ticket['title'] ?? 'Без названия',
                            'createdTime' => $createdTime,
                            'stageId' => $stageId,
                            'assignedById' => $responsibleId
                        ];
                    }
                }
            }
        }
    }

    // Формирование ответа
    $responseData = [
        'newTickets' => $newCount,
        'closedTickets' => $closedCount,
        'series' => [
            'new' => [$newCount],
            'closed' => [$closedCount]
        ],
        'stages' => array_map(function ($stageId) use ($stageAgg, $allStages) {
            $stageName = isset($allStages[$stageId]) ? $allStages[$stageId]['name'] : $stageId;
            return [
                'stageId' => $stageId,
                'stageName' => $stageName,
                'count' => $stageAgg[$stageId]
            ];
        }, array_keys($stageAgg)),
        'responsible' => array_map(function ($item) use ($includeTickets) {
            $result = [
                'id' => $item['id'],
                'name' => $item['name'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets'])) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($responsibleAgg)),
        'newTicketsByStages' => $includeNewTicketsByStages 
            ? array_map(function ($item) use ($includeTickets) {
                $result = [
                    'stageId' => $item['stageId'],
                    'stageName' => $item['stageName'],
                    'color' => $item['color'],
                    'count' => $item['count']
                ];
                
                // Включить тикеты только если запрошено
                if ($includeTickets && isset($item['tickets'])) {
                    $result['tickets'] = $item['tickets'];
                }
                
                return $result;
            }, array_values($newTicketsByStagesAgg))
            : null
    ];
    
    // Добавить переходящие тикеты, если запрошено
    if ($includeCarryoverTickets) {
        $responseData['carryoverTickets'] = $carryoverCount;
        $responseData['series']['carryover'] = [$carryoverCount];
    }
    
    // Добавить переходящие тикеты по срокам, если запрошено (TASK-044-04)
    if ($includeCarryoverTicketsByDuration) {
        $responseData['carryoverTicketsByDuration'] = array_map(function ($item) use ($includeTickets) {
            $result = [
                'durationCategory' => $item['durationCategory'],
                'durationLabel' => $item['durationLabel'],
                'color' => $item['color'],
                'count' => $item['count']
            ];
            
            // Включить тикеты только если запрошено
            if ($includeTickets && isset($item['tickets']) && count($item['tickets']) > 0) {
                $result['tickets'] = $item['tickets'];
            }
            
            return $result;
        }, array_values($carryoverTicketsByDurationAgg));
    }
    
    $response = [
        'success' => true,
        'meta' => [
            'weekNumber' => (int)$weekStart->format('W'),
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z')
        ],
        'data' => $responseData,
        'debug' => $debug ? [
            'fetchedTotal' => count($tickets),
            'sample' => array_slice($debugRaw, 0, 5),
            'stageCounts' => $stageAgg,
            'carryoverCount' => $includeCarryoverTickets ? $carryoverCount : null,
            'params' => [
                'product' => $product,
                'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
                'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
                'includeCarryoverTickets' => $includeCarryoverTickets
            ]
        ] : null
    ];

    jsonResponse($response);
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse([
        'success' => false,
        'message' => 'Ошибка получения данных: ' . $e->getMessage()
    ]);
}

