<?php
/**
 * API endpoint для получения логов вебхуков
 * 
 * Расположение: api/webhook-logs.php
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 * 
 * Примечание: Этот файл является тонким слоем (точкой входа).
 * Вся логика работы с логами вынесена в WebhookLogsApiService.
 */

require_once(__DIR__ . '/../crest.php');

// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');

use WebhookLogs\Service\WebhookLogsApiService;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

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
    
    // Получение параметров из запроса
    $filters = [
        'category' => !empty($_GET['category']) ? $_GET['category'] : null,
        'event' => !empty($_GET['event']) ? $_GET['event'] : null,
        'date' => !empty($_GET['date']) ? $_GET['date'] : date('Y-m-d'),
        'hour' => isset($_GET['hour']) && $_GET['hour'] !== '' ? (int)$_GET['hour'] : null
    ];
    
    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 50);
    
    // Создание сервиса
    $apiService = new WebhookLogsApiService();
    
    // Получение логов
    $result = $apiService->getLogs($filters, $page, $limit);
    
    // Успешный ответ
    echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (WebhookValidationException $e) {
    // Обработка ошибок валидации
    http_response_code(400);
    echo json_encode([
        'error' => 'Validation failed',
        'error_description' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (WebhookLoggingException $e) {
    // Обработка ошибок чтения логов
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to get logs',
        'error_description' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (\Exception $e) {
    // Обработка общих ошибок
    http_response_code(500);
    echo json_encode([
        'error' => 'Internal server error',
        'error_description' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
