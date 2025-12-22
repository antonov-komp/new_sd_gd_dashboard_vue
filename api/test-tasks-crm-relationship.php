<?php
/**
 * Тестовый скрипт для проверки связи задач с CRM объектами
 * 
 * Использование:
 * POST /api/test-tasks-crm-relationship.php
 * Body: { "taskIds": [123, 456, 789] }
 * 
 * Результат: JSON с анализом связи каждой задачи с CRM объектом
 * 
 * Создан для TASK-057: Поиск связи Задач с Объектами CRM в Bitrix24
 * Дата: 2025-12-17 14:30 (UTC+3, Брест)
 */

require_once __DIR__ . '/../crest.php';

// Устанавливаем заголовок только для HTTP запросов
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

function jsonResponse($data) {
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Получение списка ID задач из запроса
$taskIds = [];

// Поддержка CLI (аргументы командной строки)
if (php_sapi_name() === 'cli') {
    $args = array_slice($argv, 1);
    if (!empty($args)) {
        $taskIds = array_map('intval', $args);
    } else {
        // Попытка прочитать из stdin
        $input = trim(file_get_contents('php://stdin'));
        if (!empty($input)) {
            $body = json_decode($input, true);
            $taskIds = $body['taskIds'] ?? [];
        }
    }
} else {
    // HTTP запрос
    $input = file_get_contents('php://input');
    $body = json_decode($input, true);
    $taskIds = $body['taskIds'] ?? [];
}

if (empty($taskIds)) {
    jsonResponse([
        'error' => 'No task IDs provided',
        'message' => 'Please provide taskIds array in request body or as CLI arguments',
        'example' => [
            'taskIds' => [123, 456, 789]
        ],
        'cli_usage' => 'php test-tasks-crm-relationship.php 73885 73881 74110'
    ]);
}

// Валидация ID задач
$taskIds = array_filter(array_map('intval', $taskIds), fn($id) => $id > 0);
if (empty($taskIds)) {
    jsonResponse([
        'error' => 'Invalid task IDs',
        'message' => 'All task IDs must be positive integers'
    ]);
}

// Получение задач батч-запросом
$batchData = [];
foreach ($taskIds as $taskId) {
    $batchData["task_{$taskId}"] = [
        'method' => 'tasks.task.get',
        'params' => [
            'taskId' => (int)$taskId,
            'select' => ['*', 'UF_*'] // Получаем все поля, включая пользовательские
        ]
    ];
}

$result = CRest::callBatch($batchData);

if (isset($result['error'])) {
    jsonResponse([
        'error' => $result['error'],
        'error_description' => $result['error_description'] ?? 'Unknown error',
        'result' => $result
    ]);
}

// Анализ результатов
$analysis = [];
$summary = [
    'totalTasks' => count($taskIds),
    'successful' => 0,
    'errors' => 0,
    'linked' => 0,
    'notLinked' => 0,
    'fieldsFound' => []
];

foreach ($taskIds as $taskId) {
    $key = "task_{$taskId}";
    $taskData = $result['result']['result'][$key] ?? null;
    
    if (!$taskData || isset($taskData['error'])) {
        $analysis[$taskId] = [
            'status' => 'error',
            'error' => $taskData['error'] ?? 'Task not found',
            'taskData' => null
        ];
        $summary['errors']++;
        continue;
    }
    
    // Обработка структуры ответа батч-запроса
    // В батч-запросе данные могут быть в ['task'] или напрямую
    if (isset($taskData['task']) && is_array($taskData['task'])) {
        $taskData = $taskData['task'];
    }
    
    $summary['successful']++;
    
    // Поиск поля связи с CRM
    $crmFields = [];
    $crmObjectId = null;
    $crmObjectType = null;
    $crmObjectFormat = null;
    
    // Проверка различных вариантов полей
    $possibleFields = [
        'ufCrmTask',
        'UF_CRM_TASK',
        'ufCrmTicketId',
        'UF_CRM_TICKET_ID',
        'UF_CRM_140_ID',
        'ufCrm140Id',
        'UF_CRM_DEAL_ID',
        'UF_CRM_LEAD_ID',
        'UF_CRM_CONTACT_ID',
        'UF_CRM_COMPANY_ID'
    ];
    
    foreach ($possibleFields as $field) {
        if (isset($taskData[$field])) {
            $crmFields[$field] = $taskData[$field];
            $summary['fieldsFound'][$field] = ($summary['fieldsFound'][$field] ?? 0) + 1;
            
            // Парсинг значения для получения ID CRM объекта
            $value = $taskData[$field];
            
            // Формат ["T8c_3093"] где 8c = 140 в hex, 3093 = ID тикета
            if (is_array($value) && !empty($value)) {
                $stringValue = $value[0] ?? null;
                
                // Формат T8c_XXXX (8c = 140 в hex, XXXX = ID тикета)
                if ($stringValue && preg_match('/T8c_(\d+)/', $stringValue, $matches)) {
                    $crmObjectId = (int)$matches[1];
                    $crmObjectType = 140; // Сервис деск
                    $crmObjectFormat = 'T8c_ID';
                }
                // Общий формат T[hex]_ID для других типов
                elseif ($stringValue && preg_match('/T([0-9a-f]+)_(\d+)/i', $stringValue, $matches)) {
                    $crmObjectType = hexdec($matches[1]);
                    $crmObjectId = (int)$matches[2];
                    $crmObjectFormat = 'T' . $matches[1] . '_ID';
                }
                // Формат D_123, L_456, C_789, CO_012
                elseif ($stringValue && preg_match('/^(D|L|C|CO)_(\d+)$/', $stringValue, $matches)) {
                    $crmObjectId = (int)$matches[2];
                    $prefixMap = [
                        'D' => 2,   // Deal
                        'L' => 1,   // Lead
                        'C' => 3,   // Contact
                        'CO' => 4   // Company
                    ];
                    $crmObjectType = $prefixMap[$matches[1]] ?? null;
                    $crmObjectFormat = $matches[1] . '_ID';
                }
            }
            // Прямое значение ID (число)
            elseif (is_numeric($value)) {
                $crmObjectId = (int)$value;
                $crmObjectType = 140; // Предполагаем сервис деск по умолчанию
                $crmObjectFormat = 'direct_id';
            }
        }
    }
    
    // Проверка связи с тикетом (если найден ID и тип = 140)
    $ticketData = null;
    if ($crmObjectId && $crmObjectType === 140) {
        $ticketResult = CRest::call('crm.item.get', [
            'entityTypeId' => 140,
            'id' => $crmObjectId,
            'select' => ['id', 'title', 'createdTime', 'UF_CRM_7_TYPE_PRODUCT']
        ]);
        
        if (!isset($ticketResult['error'])) {
            $ticketData = $ticketResult['result']['item'] ?? null;
        }
    }
    
    $isLinked = $ticketData !== null;
    if ($isLinked) {
        $summary['linked']++;
    } else {
        $summary['notLinked']++;
    }
    
    $analysis[$taskId] = [
        'status' => 'success',
        'taskId' => $taskId,
        'taskTitle' => $taskData['title'] ?? null,
        'taskCreatedDate' => $taskData['createdDate'] ?? null,
        'taskCreatedBy' => $taskData['createdBy'] ?? null,
        'crmFields' => $crmFields,
        'crmObjectId' => $crmObjectId,
        'crmObjectType' => $crmObjectType,
        'crmObjectFormat' => $crmObjectFormat,
        'ticketData' => $ticketData,
        'isLinked' => $isLinked,
        'allFields' => array_keys($taskData) // Список всех полей для анализа
    ];
}

jsonResponse([
    'summary' => $summary,
    'analysis' => $analysis,
    'notes' => [
        'crmObjectTypes' => [
            1 => 'Lead',
            2 => 'Deal',
            3 => 'Contact',
            4 => 'Company',
            140 => 'Service Desk (Ticket)'
        ],
        'fieldFormats' => [
            'T8c_ID' => 'Format: T8c_XXXX where 8c = 140 (hex), XXXX = ticket ID',
            'T[hex]_ID' => 'Format: T[hex]_ID for other CRM types',
            'D_ID, L_ID, C_ID, CO_ID' => 'Formats for Deal, Lead, Contact, Company',
            'direct_id' => 'Direct numeric ID (assumed to be ticket ID)'
        ]
    ]
]);

