<?php
/**
 * Тестовый скрипт для диагностики проблемы с трудозатратами
 * 
 * Использование: php api/test-time-tracking-debug.php
 */

require_once __DIR__ . '/../crest.php';

header('Content-Type: text/plain; charset=utf-8');

echo "=== ДИАГНОСТИКА МОДУЛЯ ТРУДОЗАТРАТ ===\n\n";

// Константы
const SECTOR_1C_DEPARTMENT_ID = 366;
const ENTITY_TYPE_ID = 140;
const SECTOR_1C_TAG = '1C';

// 1. Проверка получения сотрудников
echo "1. Проверка получения сотрудников сектора 1С (отдел 366)...\n";
$employeesResult = CRest::call('user.get', [
    'filter' => [
        'ACTIVE' => 'Y',
        'UF_DEPARTMENT' => SECTOR_1C_DEPARTMENT_ID
    ],
    'select' => ['ID', 'NAME', 'LAST_NAME', 'UF_DEPARTMENT']
]);

if (isset($employeesResult['error'])) {
    echo "   ❌ ОШИБКА: " . $employeesResult['error'] . " - " . ($employeesResult['error_description'] ?? '') . "\n";
} else {
    $employees = $employeesResult['result'] ?? [];
    echo "   ✅ Найдено сотрудников: " . count($employees) . "\n";
    if (count($employees) > 0) {
        echo "   Примеры сотрудников:\n";
        foreach (array_slice($employees, 0, 3) as $emp) {
            echo "     - ID: {$emp['ID']}, Имя: {$emp['NAME']} {$emp['LAST_NAME']}\n";
        }
        $employeeIds = array_column($employees, 'ID');
        echo "   ID сотрудников: " . implode(', ', array_slice($employeeIds, 0, 5)) . (count($employeeIds) > 5 ? '...' : '') . "\n";
    } else {
        echo "   ⚠️  НЕТ СОТРУДНИКОВ В ОТДЕЛЕ 366!\n";
        echo "   Проверьте, что сотрудники действительно в отделе 366 и активны.\n";
        exit;
    }
}

echo "\n";

// 2. Проверка методов API для трудозатрат
echo "2. Проверка методов API для получения трудозатрат...\n";

// Расширяем период для поиска данных
$periodStart = date('Y-m-d', strtotime('-90 days'));
$periodEnd = date('Y-m-d');

$methodsToTest = [
    'task.elapseditem.getlist',      // Без "s" в начале
    'tasks.elapseditem.getlist',     // С "s"
    'task.elapseditem.list',         // Без "s" и без "get"
    'tasks.elapseditem.list',        // С "s" и без "get"
    'task.elapseditem.get',          // Без "s", только get
    'tasks.elapseditem.get',         // С "s", только get
    'tasks.task.elapseditem.getlist',
    'tasks.task.elapseditem.list',
    'tasks.task.get' // Для проверки структуры задачи
];

$workingMethod = null;
// Сначала получаем одну задачу для тестирования методов elapseditem
$testTaskId = null;
$testTasksResult = CRest::call('tasks.task.list', [
    'filter' => [
        '>=CREATED_DATE' => $periodStart
    ],
    'select' => ['ID'],
    'start' => 0
]);

if (!isset($testTasksResult['error']) && !empty($testTasksResult['result']['tasks'] ?? [])) {
    $testTaskId = $testTasksResult['result']['tasks'][0]['id'] ?? null;
    echo "   Найдена тестовая задача ID: $testTaskId\n\n";
}

$testParamsVariants = [
    // Вариант 1: С taskId
    $testTaskId ? ['taskId' => $testTaskId, 'start' => 0] : null,
    // Вариант 2: С id
    $testTaskId ? ['id' => $testTaskId, 'start' => 0] : null,
    // Вариант 3: С фильтром
    [
        'filter' => [
            '>=CREATED_DATE' => $periodStart,
            '<=CREATED_DATE' => $periodEnd
        ],
        'select' => ['*'],
        'start' => 0
    ]
];

foreach ($methodsToTest as $method) {
    echo "   Тестирую метод: $method\n";
    
    $success = false;
    
    // Пробуем разные варианты параметров
    foreach ($testParamsVariants as $idx => $params) {
        if ($params === null) {
            continue;
        }
        
        echo "     Вариант параметров " . ($idx + 1) . "...\n";
        $result = CRest::call($method, $params);
        
        if (isset($result['error'])) {
            $errorCode = $result['error'] ?? '';
            $errorDesc = $result['error_description'] ?? '';
            echo "       ❌ Ошибка: $errorCode - $errorDesc\n";
        } else {
            $items = $result['result'] ?? [];
            $count = is_array($items) ? count($items) : 0;
            echo "       ✅ Успех! Получено записей: $count\n";
            
            if ($count > 0 && is_array($items)) {
                echo "       Пример записи:\n";
                $firstItem = $items[0];
                foreach (array_slice($firstItem, 0, 10) as $key => $value) {
                    $displayValue = is_array($value) ? json_encode($value) : (strlen((string)$value) > 50 ? substr((string)$value, 0, 50) . '...' : $value);
                    echo "         $key: $displayValue\n";
                }
                $workingMethod = $method;
                $success = true;
                break;
            } elseif ($count === 0) {
                echo "       ⚠️  Метод работает, но записей нет\n";
                $workingMethod = $method; // Метод работает, просто нет данных
                $success = true;
                break;
            }
        }
    }
    
    if ($success) {
        break;
    }
}

if (!$workingMethod) {
    echo "\n   ⚠️  НИ ОДИН МЕТОД НЕ РАБОТАЕТ!\n";
    echo "   Возможные причины:\n";
    echo "   - Методы API не существуют в вашей версии Bitrix24\n";
    echo "   - Нет прав доступа к этим методам\n";
    echo "   - Нужна другая версия API\n";
}

echo "\n";

// 3. Проверка с фильтром по сотрудникам
if (isset($employeeIds) && !empty($employeeIds) && $workingMethod) {
    echo "3. Проверка получения трудозатрат для сотрудников сектора 1С...\n";
    
    // Берем первых 3 сотрудников для теста
    $testEmployeeIds = array_slice($employeeIds, 0, 3);
    
    $paramsWithEmployees = [
        'filter' => [
            'USER_ID' => $testEmployeeIds,
            '>=CREATED_DATE' => $periodStart,
            '<=CREATED_DATE' => $periodEnd
        ],
        'select' => ['*'],
        'start' => 0
    ];
    
    echo "   Параметры запроса:\n";
    echo "   - Сотрудники: " . implode(', ', $testEmployeeIds) . "\n";
    echo "   - Период: $periodStart - $periodEnd\n";
    echo "   - Метод: $workingMethod\n";
    
    $result = CRest::call($workingMethod, $paramsWithEmployees);
    
    if (isset($result['error'])) {
        echo "   ❌ Ошибка: " . $result['error'] . " - " . ($result['error_description'] ?? '') . "\n";
    } else {
        $items = $result['result'] ?? [];
        $count = is_array($items) ? count($items) : 0;
        echo "   ✅ Получено записей трудозатрат: $count\n";
        
        if ($count > 0) {
            echo "   Пример записи:\n";
            $firstItem = $items[0];
            foreach ($firstItem as $key => $value) {
                $displayValue = is_array($value) ? json_encode($value) : (strlen((string)$value) > 50 ? substr((string)$value, 0, 50) . '...' : $value);
                echo "     $key: $displayValue\n";
            }
        } else {
            echo "   ⚠️  НЕТ ЗАПИСЕЙ ТРУДОЗАТРАТ ЗА ПЕРИОД!\n";
            echo "   Возможные причины:\n";
            echo "   - Сотрудники не фиксировали время в задачах\n";
            echo "   - Период выбран неправильно\n";
            echo "   - Фильтр по USER_ID не работает (попробуйте без него)\n";
        }
    }
}

echo "\n";

// 4. Проверка структуры задачи (для понимания связи с тикетами)
if (isset($employeeIds) && !empty($employeeIds)) {
    echo "4. Проверка получения задач сотрудников...\n";
    
    $testEmployeeId = $employeeIds[0];
    
    // Пробуем разные варианты получения задач
    $taskMethods = [
        'tasks.task.list',
        'tasks.task.get'
    ];
    
    foreach ($taskMethods as $taskMethod) {
        echo "   Тестирую метод: $taskMethod\n";
        
        if ($taskMethod === 'tasks.task.list') {
            // Пробуем разные варианты фильтров
            $filterVariants = [
                [
                    'filter' => [
                        'CREATED_BY' => $testEmployeeId,
                        '>=CREATED_DATE' => $periodStart
                    ],
                    'select' => ['ID', 'TITLE', 'CREATED_DATE', 'CREATED_BY', 'ELAPSED_TIME', 'UF_*'],
                    'start' => 0
                ],
                [
                    'filter' => [
                        'RESPONSIBLE_ID' => $testEmployeeId,
                        '>=CREATED_DATE' => $periodStart
                    ],
                    'select' => ['ID', 'TITLE', 'CREATED_DATE', 'CREATED_BY', 'RESPONSIBLE_ID', 'ELAPSED_TIME', 'UF_*'],
                    'start' => 0
                ],
                [
                    'filter' => [
                        '>=CREATED_DATE' => $periodStart,
                        '>ELAPSED_TIME' => 0  // Только задачи с трудозатратами
                    ],
                    'select' => ['ID', 'TITLE', 'CREATED_DATE', 'CREATED_BY', 'RESPONSIBLE_ID', 'ELAPSED_TIME', 'UF_*'],
                    'start' => 0
                ]
            ];
            
            $tasksResult = null;
            foreach ($filterVariants as $idx => $params) {
                echo "       Вариант фильтра " . ($idx + 1) . "...\n";
                $tasksResult = CRest::call($taskMethod, $params);
                if (!isset($tasksResult['error']) && !empty($tasksResult['result']['tasks'] ?? [])) {
                    break;
                }
            }
        } else {
            // Для tasks.task.get нужен конкретный ID задачи
            // Сначала получим список задач
            $listResult = CRest::call('tasks.task.list', [
                'filter' => [
                    'CREATED_BY' => $testEmployeeId,
                    '>=CREATED_DATE' => $periodStart
                ],
                'select' => ['ID'],
                'start' => 0
            ]);
            
            if (isset($listResult['error']) || empty($listResult['result']['tasks'] ?? [])) {
                echo "     ⚠️  Нет задач для тестирования tasks.task.get\n";
                continue;
            }
            
            $firstTaskId = $listResult['result']['tasks'][0]['id'] ?? null;
            if (!$firstTaskId) {
                continue;
            }
            
            $tasksResult = CRest::call($taskMethod, [
                'taskId' => $firstTaskId,
                'select' => ['*', 'UF_*']
            ]);
        }
        
        if (isset($tasksResult['error'])) {
            echo "     ❌ Ошибка: " . $tasksResult['error'] . " - " . ($tasksResult['error_description'] ?? '') . "\n";
            continue;
        }
        
        $tasks = $tasksResult['result']['tasks'] ?? $tasksResult['result'] ?? [];
        if (isset($tasksResult['result']['task'])) {
            $tasks = [$tasksResult['result']['task']];
        }
        
        $count = is_array($tasks) ? count($tasks) : 0;
        echo "     ✅ Найдено задач: $count\n";
        
        if ($count > 0) {
            $firstTask = is_array($tasks) ? (isset($tasks[0]) ? $tasks[0] : reset($tasks)) : null;
            if ($firstTask) {
                echo "     Структура задачи:\n";
                echo "       ID: " . ($firstTask['id'] ?? $firstTask['ID'] ?? 'N/A') . "\n";
                echo "       TITLE: " . ($firstTask['title'] ?? $firstTask['TITLE'] ?? 'N/A') . "\n";
                echo "       ELAPSED_TIME: " . ($firstTask['elapsedTime'] ?? $firstTask['ELAPSED_TIME'] ?? 'N/A') . "\n";
                echo "       CREATED_DATE: " . ($firstTask['createdDate'] ?? $firstTask['CREATED_DATE'] ?? 'N/A') . "\n";
                echo "       CREATED_BY: " . ($firstTask['createdBy'] ?? $firstTask['CREATED_BY'] ?? 'N/A') . "\n";
                
                // Ищем поля связи с тикетами
                echo "     Поля UF_CRM_* (связь с тикетами):\n";
                $foundUfFields = false;
                foreach ($firstTask as $key => $value) {
                    if (strpos($key, 'UF_CRM') === 0 || strpos($key, 'ufCrm') === 0) {
                        $foundUfFields = true;
                        $displayValue = is_array($value) ? json_encode($value) : (strlen((string)$value) > 50 ? substr((string)$value, 0, 50) . '...' : $value);
                        echo "       $key: $displayValue\n";
                    }
                }
                if (!$foundUfFields) {
                    echo "       ⚠️  Поля UF_CRM_* не найдены\n";
                }
                
                // Проверяем, есть ли детальные записи трудозатрат в задаче
                if (isset($firstTask['elapsedItems']) || isset($firstTask['ELAPSED_ITEMS'])) {
                    $elapsedItems = $firstTask['elapsedItems'] ?? $firstTask['ELAPSED_ITEMS'] ?? [];
                    echo "     ELAPSED_ITEMS найдены: " . count($elapsedItems) . " записей\n";
                } else {
                    echo "     ⚠️  ELAPSED_ITEMS не найдены в структуре задачи\n";
                }
            }
        }
    }
}

echo "\n";
echo "=== ДИАГНОСТИКА ЗАВЕРШЕНА ===\n";
echo "\nСледующие шаги:\n";
echo "1. Проверьте логи выше на наличие ошибок\n";
echo "2. Если метод API не найден - проверьте документацию Bitrix24\n";
echo "3. Если нет данных - проверьте, что сотрудники фиксируют время в задачах\n";
echo "4. Отправьте результаты диагностики разработчику\n";

