<?php
/**
 * API endpoint для логирования активности пользователей
 * 
 * Метод: POST
 * Путь: /api/user-activity-log.php
 * 
 * Принимает JSON с записью активности и сохраняет в logs/webhooks/user-activity/YYYY-MM-DD-HH.json
 * 
 * Формат запроса:
 * {
 *   "timestamp": "2025-12-24T10:15:30+03:00",
 *   "type": "app_entry" | "page_visit",
 *   "user_id": 123,
 *   "user_name": "Иван Иванов",
 *   ...
 * }
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "message": "Activity logged"
 * }
 * 
 * Формат ответа (ошибка):
 * {
 *   "error": "Error message"
 * }
 */

// Подключение autoloader модуля WebhookLogs
require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;

// Включение отображения ошибок для отладки (только в режиме разработки)
// В production это должно быть отключено
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Установка заголовков
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка OPTIONS запроса (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Получение данных из запроса
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Валидация JSON
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid JSON',
        'json_error' => json_last_error_msg()
    ]);
    exit;
}

// Проверка наличия данных
if (!$input || !is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request body. Expected JSON object.']);
    exit;
}

// Валидация обязательных полей
$requiredFields = ['timestamp', 'type', 'user_id'];
$missingFields = [];

foreach ($requiredFields as $field) {
    if (!isset($input[$field])) {
        $missingFields[] = $field;
    }
}

if (!empty($missingFields)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required fields',
        'missing_fields' => $missingFields
    ]);
    exit;
}

// Валидация типа активности
$validTypes = ['app_entry', 'page_visit'];
if (!in_array($input['type'], $validTypes, true)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid activity type',
        'type' => $input['type'],
        'valid_types' => $validTypes
    ]);
    exit;
}

// Валидация user_id (должен быть числом)
if (!is_numeric($input['user_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid user_id. Must be numeric.']);
    exit;
}

// Валидация timestamp (должен быть валидной датой ISO 8601)
$timestamp = $input['timestamp'];

// Попытка парсинга различных форматов ISO 8601
$dateTime = false;

// Формат 1: Попытка через конструктор DateTime (самый гибкий, поддерживает большинство форматов)
try {
    $dateTime = new \DateTime($timestamp);
} catch (\Exception $e) {
    // Игнорируем ошибку, попробуем другие форматы
}

// Формат 2: 2025-12-24T12:00:00+03:00 (с часовым поясом)
if ($dateTime === false) {
    $dateTime = \DateTime::createFromFormat('Y-m-d\TH:i:sP', $timestamp);
}

// Формат 3: 2025-12-24T12:00:00.000Z (с миллисекундами и Z)
if ($dateTime === false) {
    $dateTime = \DateTime::createFromFormat('Y-m-d\TH:i:s.u\Z', $timestamp);
}

// Формат 4: 2025-12-24T12:00:00Z (без миллисекунд, с Z)
if ($dateTime === false) {
    $dateTime = \DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $timestamp);
}

// Формат 5: Стандартный ISO8601
if ($dateTime === false) {
    $dateTime = \DateTime::createFromFormat(\DateTime::ISO8601, $timestamp);
}

if ($dateTime === false) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid timestamp format',
        'timestamp' => $timestamp,
        'expected_format' => 'ISO 8601 (e.g., 2025-12-24T10:15:30+03:00 or 2025-12-24T10:15:30.000Z)'
    ]);
    exit;
}

try {
    // Инициализация репозитория
    $repository = new WebhookLogsRepository();
    
    // Категория для активности пользователей
    $category = 'user-activity';
    
    // Проверка валидности категории
    if (!WebhookLogsConfig::isValidCategory($category)) {
        throw new \RuntimeException("Category '{$category}' is not registered in WebhookLogsConfig");
    }
    
    // Подготовка записи для сохранения
    $entry = [
        'timestamp' => $timestamp,
        'type' => $input['type'],
        'user_id' => (int)$input['user_id'],
        'user_name' => $input['user_name'] ?? null,
        'user_email' => $input['user_email'] ?? null,
        'ip' => $input['ip'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
        'session_id' => $input['session_id'] ?? null
    ];
    
    // Дополнительные поля для page_visit
    if ($input['type'] === 'page_visit') {
        $entry['route_path'] = $input['route_path'] ?? null;
        $entry['route_name'] = $input['route_name'] ?? null;
        $entry['route_title'] = $input['route_title'] ?? null;
        $entry['from_path'] = $input['from_path'] ?? null;
        $entry['from_name'] = $input['from_name'] ?? null;
    }
    
    // Создание DateTime объекта для сохранения
    // Используем текущее время, если timestamp не удалось распарсить
    try {
        $logDateTime = WebhookLogsConfig::getDateTime($timestamp);
    } catch (\Exception $e) {
        error_log('[user-activity-log] Error parsing timestamp: ' . $e->getMessage() . ' | Using current time');
        $logDateTime = WebhookLogsConfig::getDateTime();
    }
    
    // Сохранение записи
    try {
        $saved = $repository->save($category, $entry, $logDateTime);
        
        if ($saved) {
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Activity logged successfully',
                'category' => $category,
                'timestamp' => $timestamp
            ]);
        } else {
            http_response_code(500);
            error_log('[user-activity-log] Repository save() returned false');
            echo json_encode([
                'error' => 'Failed to save activity log',
                'details' => 'Repository save() returned false'
            ]);
        }
    } catch (\Exception $saveException) {
        http_response_code(500);
        error_log('[user-activity-log] Exception during save: ' . $saveException->getMessage() . ' | File: ' . $saveException->getFile() . ' | Line: ' . $saveException->getLine());
        echo json_encode([
            'error' => 'Error saving activity log',
            'message' => $saveException->getMessage(),
            'file' => $saveException->getFile(),
            'line' => $saveException->getLine()
        ]);
    }
} catch (WebhookLoggingException $e) {
    http_response_code(500);
    error_log('[user-activity-log] WebhookLoggingException: ' . $e->getMessage() . ' | Code: ' . $e->getCode());
    echo json_encode([
        'error' => 'Logging error',
        'message' => $e->getMessage(),
        'code' => $e->getCode(),
        'file' => $e->getFile(),
        'line' => $e->getLine()
    ]);
} catch (\Exception $e) {
    http_response_code(500);
    error_log('[user-activity-log] Exception: ' . $e->getMessage() . ' | File: ' . $e->getFile() . ' | Line: ' . $e->getLine());
    echo json_encode([
        'error' => 'Internal server error',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}

