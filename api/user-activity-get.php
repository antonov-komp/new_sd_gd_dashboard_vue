<?php
/**
 * API endpoint для получения активности пользователей
 * 
 * Метод: GET
 * Путь: /api/user-activity-get.php
 * 
 * Параметры запроса:
 * - user_id (опционально) - ID пользователя для фильтрации
 * - date_from (опционально) - Дата начала (YYYY-MM-DD), по умолчанию -7 дней
 * - date_to (опционально) - Дата окончания (YYYY-MM-DD), по умолчанию сегодня
 * - type (опционально) - Тип активности (app_entry, page_visit)
 * - limit (опционально) - Лимит записей (по умолчанию 1000, максимум 10000)
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "data": [...],
 *   "count": 123,
 *   "filters": {...}
 * }
 */

// Подключение autoloader модуля WebhookLogs
require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Config\WebhookLogsConfig;

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// Получение параметров запроса
$userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
$dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : null;
$dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : null;
$type = isset($_GET['type']) ? $_GET['type'] : null;
$limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1000;

// Валидация limit
$limit = max(1, min($limit, 10000));

// Валидация типа
if ($type !== null && !in_array($type, ['app_entry', 'page_visit'], true)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid activity type',
        'type' => $type,
        'valid_types' => ['app_entry', 'page_visit']
    ]);
    exit;
}

try {
    $repository = new WebhookLogsRepository();
    $category = 'user-activity';
    
    // Определение диапазона дат
    $endDate = new \DateTime();
    $endDate->setTime(23, 59, 59);
    
    if ($dateTo) {
        $endDate = \DateTime::createFromFormat('Y-m-d', $dateTo);
        if ($endDate === false) {
            throw new \InvalidArgumentException("Invalid date_to format. Expected YYYY-MM-DD");
        }
        $endDate->setTime(23, 59, 59);
    }
    
    if ($dateFrom) {
        $startDate = \DateTime::createFromFormat('Y-m-d', $dateFrom);
        if ($startDate === false) {
            throw new \InvalidArgumentException("Invalid date_from format. Expected YYYY-MM-DD");
        }
        $startDate->setTime(0, 0, 0);
    } else {
        // По умолчанию - последние 7 дней
        $startDate = clone $endDate;
        $startDate->modify('-7 days');
        $startDate->setTime(0, 0, 0);
    }
    
    // Проверка, что startDate <= endDate
    if ($startDate > $endDate) {
        http_response_code(400);
        echo json_encode(['error' => 'date_from must be less than or equal to date_to']);
        exit;
    }
    
    // Сбор всех записей за период
    $activity = [];
    $currentDate = clone $startDate;
    
    while ($currentDate <= $endDate) {
        $dateStr = $currentDate->format('Y-m-d');
        
        // Чтение логов за все часы дня
        for ($hour = 0; $hour < 24; $hour++) {
            try {
                $hourActivity = $repository->read($category, $dateStr, $hour);
                $activity = array_merge($activity, $hourActivity);
            } catch (\Exception $e) {
                // Пропускаем отсутствующие файлы
                continue;
            }
        }
        
        $currentDate->modify('+1 day');
    }
    
    // Фильтрация по пользователю
    if ($userId !== null) {
        $activity = array_filter($activity, function($entry) use ($userId) {
            return isset($entry['user_id']) && (int)$entry['user_id'] === $userId;
        });
    }
    
    // Фильтрация по типу
    if ($type !== null) {
        $activity = array_filter($activity, function($entry) use ($type) {
            return isset($entry['type']) && $entry['type'] === $type;
        });
    }
    
    // Сортировка по времени (новые первыми)
    usort($activity, function($a, $b) {
        $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
        $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
        return $timeB - $timeA;
    });
    
    // Применение лимита
    $activity = array_slice($activity, 0, $limit);
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => array_values($activity),
        'count' => count($activity),
        'filters' => [
            'user_id' => $userId,
            'date_from' => $startDate->format('Y-m-d'),
            'date_to' => $endDate->format('Y-m-d'),
            'type' => $type,
            'limit' => $limit
        ]
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

