<?php
/**
 * Вспомогательные функции для работы со слепками
 * 
 * Используются скриптами создания слепков
 */

/**
 * Получение данных сектора через API
 * 
 * @param bool $useCache Использовать кеш
 * @return array Данные сектора
 * @throws Exception При ошибке получения данных
 */
function getSectorDataFromApi($useCache = true) {
    // Определяем базовый URL (можно настроить через переменные окружения)
    $baseUrl = getBaseUrl();
    $url = $baseUrl . '/api/get-sector-data.php';
    if (!$useCache) {
        $url .= '?useCache=false';
    }
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300); // 5 минут таймаут
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-Requested-With: CronScript'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception("CURL error: $curlError");
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP error: $httpCode");
    }
    
    $data = json_decode($response, true);
    if (!$data || !$data['success']) {
        throw new Exception("API error: " . ($data['message'] ?? 'Unknown error'));
    }
    
    return $data['data'];
}

/**
 * Нормализация данных сектора в формат слепка
 * 
 * Преобразует данные из формата get-sector-data.php в формат слепка версии 1.0
 * 
 * @param array $sectorData Данные сектора
 * @return array Нормализованные данные для слепка
 */
function normalizeSectorDataForSnapshot($sectorData) {
    // Маппинг этапов
    $stageMapping = [
        'formed' => [
            'bitrixId' => 'DT140_12:UC_0VHWE2',
            'name' => 'Сформировано обращение'
        ],
        'review' => [
            'bitrixId' => 'DT140_12:PREPARATION',
            'name' => 'Рассмотрение ТЗ'
        ],
        'execution' => [
            'bitrixId' => 'DT140_12:CLIENT',
            'name' => 'Исполнение'
        ]
    ];
    
    $keeperEmployeeId = 1051;
    
    // Статистика по этапам
    $stagesStatistics = [
        'formed' => ['count' => 0, 'stageId' => $stageMapping['formed']['bitrixId'], 'stageName' => $stageMapping['formed']['name']],
        'review' => ['count' => 0, 'stageId' => $stageMapping['review']['bitrixId'], 'stageName' => $stageMapping['review']['name']],
        'execution' => ['count' => 0, 'stageId' => $stageMapping['execution']['bitrixId'], 'stageName' => $stageMapping['execution']['name']],
        'total' => 0
    ];
    
    // Статистика по сотрудникам
    $employeesMap = [];
    
    // Статистика нулевой точки
    $zeroPointStats = ['unassigned' => 0, 'keeper' => 0, 'total' => 0];
    
    // Данные о тикетах
    $ticketIds = [];
    $tickets = [];
    
    // Обработка этапов
    foreach ($sectorData['stages'] ?? [] as $stage) {
        $stageId = $stage['id'] ?? '';
        if (!isset($stagesStatistics[$stageId])) {
            continue;
        }
        
        foreach ($stage['employees'] ?? [] as $employee) {
            $employeeId = $employee['id'] ?? 0;
            $employeeName = $employee['name'] ?? 'Неизвестный сотрудник';
            
            if (!isset($employeesMap[$employeeId])) {
                $employeesMap[$employeeId] = [
                    'id' => $employeeId,
                    'name' => $employeeName,
                    'ticketsByStage' => ['formed' => 0, 'review' => 0, 'execution' => 0],
                    'totalTickets' => 0
                ];
            }
            
            $ticketCount = count($employee['tickets'] ?? []);
            $employeesMap[$employeeId]['ticketsByStage'][$stageId] = $ticketCount;
            $employeesMap[$employeeId]['totalTickets'] += $ticketCount;
            $stagesStatistics[$stageId]['count'] += $ticketCount;
            $stagesStatistics['total'] += $ticketCount;
            
            // Обработка тикетов
            foreach ($employee['tickets'] ?? [] as $ticket) {
                $ticketId = (int)($ticket['id'] ?? 0);
                if ($ticketId > 0) {
                    $ticketIds[] = $ticketId;
                    $tickets[] = [
                        'id' => $ticketId,
                        'title' => $ticket['title'] ?? 'Без названия',
                        'assignedTo' => $ticket['assignedTo'] ?? null,
                        'createdAt' => normalizeDate($ticket['createdAt'] ?? null),
                        'updatedAt' => normalizeDate($ticket['updatedAt'] ?? null)
                    ];
                }
            }
        }
    }
    
    // Обработка нулевой точки
    foreach ($sectorData['zeroPointTickets'] ?? [] as $stageId => $stageTickets) {
        foreach ($stageTickets as $ticket) {
            $ticketId = (int)($ticket['id'] ?? 0);
            if ($ticketId > 0) {
                $ticketIds[] = $ticketId;
                
                $assignedTo = $ticket['assignedTo'] ?? null;
                if (!$assignedTo) {
                    $zeroPointStats['unassigned']++;
                } elseif (($assignedTo['id'] ?? 0) == $keeperEmployeeId) {
                    $zeroPointStats['keeper']++;
                } else {
                    $zeroPointStats['unassigned']++;
                }
                
                $tickets[] = [
                    'id' => $ticketId,
                    'title' => $ticket['title'] ?? 'Без названия',
                    'assignedTo' => $assignedTo,
                    'createdAt' => normalizeDate($ticket['createdAt'] ?? null),
                    'updatedAt' => normalizeDate($ticket['updatedAt'] ?? null)
                ];
            }
        }
    }
    
    $zeroPointStats['total'] = $zeroPointStats['unassigned'] + $zeroPointStats['keeper'];
    $stagesStatistics['total'] += $zeroPointStats['total'];
    
    return [
        'statistics' => [
            'stages' => $stagesStatistics,
            'employees' => array_values($employeesMap),
            'zeroPoint' => $zeroPointStats
        ],
        'ticketIds' => array_unique($ticketIds),
        'tickets' => $tickets
    ];
}

/**
 * Нормализация даты в формат ISO 8601
 * 
 * @param string|null $date Дата
 * @return string|null Дата в формате ISO 8601 или null
 */
function normalizeDate($date) {
    if (!$date) {
        return null;
    }
    
    try {
        $dt = new DateTime($date);
        return $dt->format('c'); // ISO 8601
    } catch (Exception $e) {
        return null;
    }
}

/**
 * Создание слепка через API
 * 
 * @param array $normalizedData Нормализованные данные сектора
 * @param string $type Тип слепка (week_start, week_end, manual, current)
 * @param string $date Дата слепка (YYYY-MM-DD)
 * @return array Результат создания слепка
 * @throws Exception При ошибке создания
 */
function createSnapshotViaApi($normalizedData, $type, $date) {
    $baseUrl = getBaseUrl();
    $url = $baseUrl . '/api/snapshots.php';
    
    // Генерация метаданных
    $metadata = [
        'version' => '1.0',
        'createdAt' => date('c'), // ISO 8601
        'createdBy' => [
            'id' => 0, // Системный пользователь
            'name' => 'Cron Script'
        ],
        'type' => $type,
        'sectorId' => '1C',
        'sectorName' => 'Сектор 1С'
    ];
    
    // Формирование структуры слепка
    $snapshot = [
        'metadata' => $metadata,
        'statistics' => $normalizedData['statistics'] ?? [],
        'ticketIds' => $normalizedData['ticketIds'] ?? [],
        'tickets' => $normalizedData['tickets'] ?? []
    ];
    
    $payload = [
        'action' => 'create',
        'snapshot' => $snapshot,
        'type' => $type,
        'date' => $date
    ];
    
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'X-Requested-With: CronScript'
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 300);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    if ($curlError) {
        throw new Exception("CURL error: $curlError");
    }
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP error: $httpCode");
    }
    
    $result = json_decode($response, true);
    if (!$result || !$result['success']) {
        throw new Exception("API error: " . ($result['message'] ?? 'Unknown error'));
    }
    
    return $result['data'];
}

/**
 * Получение базового URL приложения
 * 
 * @return string Базовый URL
 */
function getBaseUrl() {
    // Можно настроить через переменные окружения или settings.php
    if (defined('BASE_URL')) {
        return BASE_URL;
    }
    
    // Определяем автоматически
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $scriptPath = dirname($_SERVER['SCRIPT_NAME'] ?? '');
    
    return $protocol . '://' . $host . $scriptPath;
}




