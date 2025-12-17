<?php
/**
 * Тест получения детальной информации о задаче
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: text/plain; charset=utf-8');

// Получаем одну задачу
$tasksResult = CRest::call('tasks.task.list', [
    'filter' => [
        '>=CREATED_DATE' => date('Y-m-d', strtotime('-90 days'))
    ],
    'select' => ['ID'],
    'start' => 0
]);

if (isset($tasksResult['error']) || empty($tasksResult['result']['tasks'] ?? [])) {
    echo "Нет задач для тестирования\n";
    exit;
}

$taskId = $tasksResult['result']['tasks'][0]['id'] ?? null;
if (!$taskId) {
    echo "Не удалось получить ID задачи\n";
    exit;
}

echo "Тестирую задачу ID: $taskId\n\n";

// Пробуем разные варианты получения задачи
$variants = [
    [
        'name' => 'tasks.task.get с taskId',
        'params' => [
            'taskId' => $taskId,
            'select' => ['*', 'UF_*']
        ]
    ],
    [
        'name' => 'tasks.task.get с id',
        'params' => [
            'id' => $taskId,
            'select' => ['*', 'UF_*']
        ]
    ],
    [
        'name' => 'tasks.task.get без select',
        'params' => [
            'taskId' => $taskId
        ]
    ]
];

foreach ($variants as $variant) {
    echo "=== {$variant['name']} ===\n";
    $result = CRest::call('tasks.task.get', $variant['params']);
    
    if (isset($result['error'])) {
        echo "Ошибка: " . $result['error'] . " - " . ($result['error_description'] ?? '') . "\n\n";
        continue;
    }
    
    $task = $result['result']['task'] ?? $result['result'] ?? null;
    if (!$task) {
        echo "Задача не найдена в ответе\n\n";
        continue;
    }
    
    echo "Поля задачи:\n";
    foreach ($task as $key => $value) {
        if (is_array($value)) {
            echo "  $key: [массив, элементов: " . count($value) . "]\n";
            if (count($value) > 0 && count($value) < 5) {
                foreach ($value as $subKey => $subValue) {
                    $displayValue = is_array($subValue) ? json_encode($subValue) : (strlen((string)$subValue) > 50 ? substr((string)$subValue, 0, 50) . '...' : $subValue);
                    echo "    $subKey: $displayValue\n";
                }
            }
        } else {
            $displayValue = strlen((string)$value) > 100 ? substr((string)$value, 0, 100) . '...' : $value;
            echo "  $key: $displayValue\n";
        }
    }
    
    // Ищем поля связанные с трудозатратами
    echo "\nПоля связанные с трудозатратами:\n";
    $elapsedFields = ['elapsedTime', 'ELAPSED_TIME', 'elapsedItems', 'ELAPSED_ITEMS', 'timeSpentInLogs', 'TIME_SPENT_IN_LOGS'];
    $found = false;
    foreach ($elapsedFields as $field) {
        if (isset($task[$field])) {
            $found = true;
            echo "  ✅ $field: " . (is_array($task[$field]) ? json_encode($task[$field]) : $task[$field]) . "\n";
        }
    }
    if (!$found) {
        echo "  ⚠️  Поля трудозатрат не найдены\n";
    }
    
    // Ищем поля связи с тикетами
    echo "\nПоля связи с тикетами (UF_CRM_*):\n";
    $found = false;
    foreach ($task as $key => $value) {
        if (strpos($key, 'UF_CRM') === 0 || strpos($key, 'ufCrm') === 0 || strpos($key, 'CRM') === 0) {
            $found = true;
            $displayValue = is_array($value) ? json_encode($value) : (strlen((string)$value) > 50 ? substr((string)$value, 0, 50) . '...' : $value);
            echo "  ✅ $key: $displayValue\n";
        }
    }
    if (!$found) {
        echo "  ⚠️  Поля связи с тикетами не найдены\n";
    }
    
    echo "\n";
    break; // Если успешно получили задачу, прекращаем
}

