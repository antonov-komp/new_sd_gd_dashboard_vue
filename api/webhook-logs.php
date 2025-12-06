<?php
/**
 * API endpoint для получения логов вебхуков
 * 
 * Расположение: api/webhook-logs.php
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 */

require_once(__DIR__ . '/../crest.php');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // TODO: Проверка доступа (на основе отдела пользователя)
    // Пока проверка доступа отключена для разработки
    // if (!hasAccessToWebhookLogs()) {
    //     http_response_code(403);
    //     echo json_encode(['error' => 'Access denied']);
    //     exit;
    // }
    
    // Получение параметров фильтрации
    $category = !empty($_GET['category']) ? $_GET['category'] : null; // tasks, smart-processes, errors
    $event = !empty($_GET['event']) ? $_GET['event'] : null;
    $date = !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d');
    $hour = isset($_GET['hour']) && $_GET['hour'] !== '' ? (int)$_GET['hour'] : null;
    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 50);
    
    // Валидация параметров
    if ($page < 1) $page = 1;
    if ($limit < 1 || $limit > 1000) $limit = 50;
    
    // Определение папки логов
    $logDir = __DIR__ . '/../logs/webhooks/';
    if ($category === 'errors') {
        $logDir .= 'errors/';
    } elseif ($category === 'tasks') {
        $logDir .= 'tasks/';
    } elseif ($category === 'smart-processes') {
        $logDir .= 'smart-processes/';
    } else {
        // Все категории
        $logDir = null;
    }
    
    // Чтение логов
    $allLogs = [];
    
    if ($logDir && is_dir($logDir)) {
        // Чтение конкретного файла
        $logFile = $logDir . $date . ($hour !== null ? '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) : '') . '.json';
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?? [];
            $allLogs = array_merge($allLogs, $logs);
        }
    } else {
        // Чтение всех категорий
        $categories = ['tasks', 'smart-processes', 'errors'];
        foreach ($categories as $cat) {
            $catDir = __DIR__ . '/../logs/webhooks/' . $cat . '/';
            if (is_dir($catDir)) {
                $logFile = $catDir . $date . ($hour !== null ? '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) : '') . '.json';
                if (file_exists($logFile)) {
                    $logs = json_decode(file_get_contents($logFile), true) ?? [];
                    foreach ($logs as $log) {
                        $log['category'] = $cat;
                        $allLogs[] = $log;
                    }
                }
            }
        }
    }
    
    // Фильтрация по типу события
    if ($event) {
        $allLogs = array_filter($allLogs, function($log) use ($event) {
            return isset($log['event']) && $log['event'] === $event;
        });
        $allLogs = array_values($allLogs); // Переиндексация массива
    }
    
    // Сортировка по дате (новые сначала)
    usort($allLogs, function($a, $b) {
        $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
        $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
        return $timeB - $timeA;
    });
    
    // Пагинация
    $total = count($allLogs);
    $offset = ($page - 1) * $limit;
    $paginatedLogs = array_slice($allLogs, $offset, $limit);
    
    // Успешный ответ
    echo json_encode([
        'success' => true,
        'logs' => $paginatedLogs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to get logs',
        'error_description' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}

