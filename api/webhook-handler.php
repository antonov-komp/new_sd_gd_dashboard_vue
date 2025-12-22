<?php
/**
 * Handler для приёма исходящих вебхуков от Bitrix24
 * 
 * Расположение: api/webhook-handler.php
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/webhook/
 * - https://apidocs.bitrix24.ru/rest_help/general/webhooks/index.php
 * 
 * Использование:
 * 1. В Bitrix24 настройте исходящий вебхук
 * 2. Укажите URL: https://your-domain.com/api/webhook-handler.php
 * 3. Bitrix24 предоставит токен - сохраните его в webhook-secret.php
 * 
 * Примечание: Этот файл является тонким слоем (точкой входа).
 * Вся логика обработки вынесена в WebhookHandlerService.
 */

require_once(__DIR__ . '/../crest.php');

// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');

use WebhookLogs\Service\WebhookHandlerService;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

// Установка заголовков
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With, X-Bitrix-Signature');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Инициализация переменных
$rawBody = null;
$handlerService = new WebhookHandlerService();

try {
    // Получение raw body
    $rawBody = file_get_contents('php://input');
    
    if (empty($rawBody)) {
        throw new \Exception('Empty request body');
    }
    
    // Обработка вебхука
    $result = $handlerService->handleWebhook(
        $rawBody,
        $_SERVER,
        $_POST,
        $_GET
    );
    
    // Успешный ответ Bitrix24
    http_response_code(200);
    echo json_encode($result);
    
} catch (WebhookValidationException $e) {
    // Обработка ошибок валидации
    $handlerService->handleError($e, $rawBody, null, $_SERVER);
    
    http_response_code(401);
    echo json_encode([
        'error' => 'Webhook validation failed',
        'error_description' => $e->getMessage()
    ]);
    
} catch (WebhookLoggingException $e) {
    // Обработка ошибок логирования
    $handlerService->handleError($e, $rawBody, null, $_SERVER);
    
    http_response_code(500);
    echo json_encode([
        'error' => 'Webhook logging failed',
        'error_description' => $e->getMessage()
    ]);
    
} catch (\Exception $e) {
    // Обработка общих ошибок
    $handlerService->handleError($e, $rawBody, null, $_SERVER);
    
    http_response_code(400);
    echo json_encode([
        'error' => 'Webhook processing failed',
        'error_description' => $e->getMessage()
    ]);
}
