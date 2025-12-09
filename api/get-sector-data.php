<?php
/**
 * API endpoint для получения данных сектора
 * 
 * Используется cron-скриптами для получения данных сектора 1С
 * 
 * Расположение: api/get-sector-data.php
 */

require_once(__DIR__ . '/../crest.php');

header('Content-Type: application/json');

try {
    // Получение параметра useCache
    $useCache = isset($_GET['useCache']) ? filter_var($_GET['useCache'], FILTER_VALIDATE_BOOLEAN) : true;
    
    // ID смарт-процесса сектора 1С
    $entityTypeId = 140;
    
    // Стадии смарт-процесса 140
    $targetStages = [
        'DT140_12:UC_0VHWE2',    // Сформировано обращение
        'DT140_12:PREPARATION',  // Рассмотрение ТЗ
        'DT140_12:CLIENT'         // Исполнение
    ];
    
    // Тег сектора 1С
    $sectorTag = '1C';
    
    // Получение всех тикетов из целевых стадий
    $allTickets = [];
    foreach ($targetStages as $stageId) {
        $start = 0;
        do {
            $result = CRest::call('crm.item.list', [
                'entityTypeId' => $entityTypeId,
                'filter' => [
                    'stageId' => $stageId
                ],
                'select' => ['id', 'title', 'stageId', 'assignedById', 'createdTime', 'updatedTime', 'ufCrm7TypeProduct'],
                'start' => $start
            ]);
            
            if (isset($result['error'])) {
                throw new Exception("Bitrix24 API error: " . ($result['error_description'] ?? $result['error']));
            }
            
            if (isset($result['result']['items'])) {
                foreach ($result['result']['items'] as $item) {
                    // Фильтрация по тегу сектора 1С
                    $tags = $item['ufCrm7TypeProduct'] ?? [];
                    if (in_array($sectorTag, $tags)) {
                        $allTickets[] = $item;
                    }
                }
            }
            
            $start += 50;
        } while (isset($result['result']['next']));
    }
    
    // Извлечение уникальных ID сотрудников
    $employeeIds = [];
    foreach ($allTickets as $ticket) {
        $assignedById = $ticket['assignedById'] ?? null;
        if ($assignedById && !in_array($assignedById, $employeeIds)) {
            $employeeIds[] = $assignedById;
        }
    }
    
    // Получение данных сотрудников
    $employees = [];
    if (!empty($employeeIds)) {
        $chunkSize = 50;
        $chunks = array_chunk($employeeIds, $chunkSize);
        
        foreach ($chunks as $chunk) {
            $result = CRest::call('user.get', [
                'ID' => implode(',', $chunk)
            ]);
            
            if (isset($result['error'])) {
                throw new Exception("Bitrix24 API error: " . ($result['error_description'] ?? $result['error']));
            }
            
            if (isset($result['result'])) {
                foreach ($result['result'] as $user) {
                    $employees[$user['ID']] = [
                        'id' => (int)$user['ID'],
                        'name' => $user['NAME'] . ' ' . $user['LAST_NAME'],
                        'email' => $user['EMAIL'] ?? null
                    ];
                }
            }
        }
    }
    
    // Группировка тикетов по этапам и сотрудникам
    $stages = [
        [
            'id' => 'formed',
            'name' => 'Сформировано обращение',
            'color' => '#007bff',
            'employees' => []
        ],
        [
            'id' => 'review',
            'name' => 'Рассмотрение ТЗ',
            'color' => '#ffc107',
            'employees' => []
        ],
        [
            'id' => 'execution',
            'name' => 'Исполнение',
            'color' => '#28a745',
            'employees' => []
        ]
    ];
    
    $stageMapping = [
        'DT140_12:UC_0VHWE2' => 'formed',
        'DT140_12:PREPARATION' => 'review',
        'DT140_12:CLIENT' => 'execution'
    ];
    
    $zeroPointTickets = [
        'formed' => [],
        'review' => [],
        'execution' => []
    ];
    
    $keeperEmployeeId = 1051; // ID хранителя объектов
    
    foreach ($allTickets as $ticket) {
        $stageId = $ticket['stageId'] ?? '';
        $internalStageId = $stageMapping[$stageId] ?? 'formed';
        $assignedById = $ticket['assignedById'] ?? null;
        
        // Определяем, является ли тикет нулевой точкой
        $isZeroPoint = !$assignedById || $assignedById == $keeperEmployeeId;
        
        if ($isZeroPoint) {
            $zeroPointTickets[$internalStageId][] = [
                'id' => (int)$ticket['id'],
                'title' => $ticket['title'] ?? 'Без названия',
                'assignedTo' => $assignedById == $keeperEmployeeId ? [
                    'id' => $keeperEmployeeId,
                    'name' => 'Хранитель объектов'
                ] : null,
                'createdAt' => $ticket['createdTime'] ?? null,
                'updatedAt' => $ticket['updatedTime'] ?? null
            ];
        } else {
            // Находим этап
            $stageIndex = array_search($internalStageId, array_column($stages, 'id'));
            if ($stageIndex === false) {
                continue;
            }
            
            // Находим или создаём сотрудника в этапе
            $employeeIndex = null;
            foreach ($stages[$stageIndex]['employees'] as $idx => $emp) {
                if ($emp['id'] == $assignedById) {
                    $employeeIndex = $idx;
                    break;
                }
            }
            
            if ($employeeIndex === null) {
                $employee = $employees[$assignedById] ?? [
                    'id' => (int)$assignedById,
                    'name' => 'Неизвестный сотрудник'
                ];
                $stages[$stageIndex]['employees'][] = [
                    'id' => $employee['id'],
                    'name' => $employee['name'],
                    'tickets' => []
                ];
                $employeeIndex = count($stages[$stageIndex]['employees']) - 1;
            }
            
            // Добавляем тикет
            $stages[$stageIndex]['employees'][$employeeIndex]['tickets'][] = [
                'id' => (int)$ticket['id'],
                'title' => $ticket['title'] ?? 'Без названия',
                'assignedTo' => [
                    'id' => $employees[$assignedById]['id'] ?? (int)$assignedById,
                    'name' => $employees[$assignedById]['name'] ?? 'Неизвестный сотрудник'
                ],
                'createdAt' => $ticket['createdTime'] ?? null,
                'updatedAt' => $ticket['updatedTime'] ?? null
            ];
        }
    }
    
    // Формирование ответа
    $sectorData = [
        'stages' => $stages,
        'employees' => array_values($employees),
        'zeroPointTickets' => $zeroPointTickets
    ];
    
    echo json_encode([
        'success' => true,
        'data' => $sectorData
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}



