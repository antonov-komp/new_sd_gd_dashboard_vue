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
 */

require_once(__DIR__ . '/../crest.php');

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

/**
 * Получение секрета вебхука из конфигурации
 * 
 * @return string|null Секрет вебхука или null
 */
function getWebhookSecret() {
    // Вариант 1: Из отдельного файла конфигурации (рекомендуется)
    $secretFile = __DIR__ . '/../webhook-secret.php';
    if (file_exists($secretFile)) {
        $secret = include $secretFile;
        if (is_string($secret) && !empty($secret)) {
            return $secret;
        }
    }
    
    // Вариант 2: Из переменной окружения
    $secret = getenv('BITRIX24_WEBHOOK_SECRET');
    if ($secret) {
        return $secret;
    }
    
    // Вариант 3: Из settings.json (не рекомендуется для продакшена)
    $settingsFile = __DIR__ . '/../settings.json';
    if (file_exists($settingsFile)) {
        $settings = json_decode(file_get_contents($settingsFile), true);
        return $settings['webhook_secret'] ?? null;
    }
    
    return null;
}

/**
 * Валидация подписи вебхука от Bitrix24
 * 
 * @param string $rawBody Raw body запроса
 * @param string $signature Подпись из заголовка
 * @param string $secret Секрет вебхука
 * @return bool Валидность подписи
 */
function validateWebhookSignature($rawBody, $signature, $secret) {
    if (empty($signature) || empty($secret)) {
        return false;
    }
    
    // Вычисление HMAC-SHA256
    $computedSignature = hash_hmac('sha256', $rawBody, $secret);
    
    // Сравнение подписей (защита от timing attacks)
    return hash_equals($signature, $computedSignature);
}

/**
 * Логирование события вебхука в JSON файл
 * 
 * @param string $eventType Тип события
 * @param array $eventData Данные события
 * @param string $category Категория
 * @param array $fullPayload Полный payload
 * @param string $clientIp IP отправителя
 * @return bool Успешность записи
 */
function logWebhookEvent($eventType, $eventData, $category, $fullPayload, $clientIp) {
    try {
        $logDir = __DIR__ . '/../logs/webhooks/' . $category . '/';
        $logFile = $logDir . date('Y-m-d-H') . '.json';
        
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $logEntry = [
            'timestamp' => date('c'),
            'ip' => $clientIp,
            'event' => $eventType,
            'category' => $category,
            'payload' => $fullPayload,
            'details' => extractEventDetails($eventType, $eventData)
        ];
        
        $logs = [];
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?? [];
        }
        
        $logs[] = $logEntry;
        
        file_put_contents(
            $logFile,
            json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
        
        return true;
    } catch (Exception $e) {
        error_log('Failed to log webhook event: ' . $e->getMessage());
        return false;
    }
}

/**
 * Извлечение деталей события
 */
function extractEventDetails($eventType, $eventData) {
    $details = [];
    
    if (strpos($eventType, 'ONTASK') === 0) {
        if (isset($eventData['TASK'])) {
            $task = $eventData['TASK'];
            $details['task_id'] = $task['ID'] ?? null;
            $details['task_title'] = $task['TITLE'] ?? null;
            $details['created_by'] = $task['CREATED_BY'] ?? null;
            $details['responsible_id'] = $task['RESPONSIBLE_ID'] ?? null;
        }
        
        if (strpos($eventType, 'ONTASKCOMMENT') === 0) {
            if (isset($eventData['COMMENT'])) {
                $comment = $eventData['COMMENT'];
                $details['comment_id'] = $comment['ID'] ?? null;
                $details['comment_text'] = $comment['POST_MESSAGE'] ?? null;
                $details['task_id'] = $comment['TASK_ID'] ?? null;
            }
        }
    }
    
    if (strpos($eventType, 'ONCRMDYNAMIC') === 0) {
        if (isset($eventData['FIELDS'])) {
            $fields = $eventData['FIELDS'];
            $details['entity_id'] = $fields['ID'] ?? null;
            $details['title'] = $fields['TITLE'] ?? null;
        }
        
        if (isset($eventData['ENTITY_TYPE_ID'])) {
            $details['entity_type_id'] = $eventData['ENTITY_TYPE_ID'];
        }
        
        if ($eventType === 'ONCRMDYNAMICITEMUPDATE' && isset($eventData['PREVIOUS_FIELDS'])) {
            $details['changed_fields'] = array_keys($eventData['PREVIOUS_FIELDS']);
        }
    }
    
    return $details;
}

/**
 * Логирование ошибки
 */
function logWebhookError($error, $payload = null, $rawBody = null) {
    try {
        $errorDir = __DIR__ . '/../logs/webhooks/errors/';
        $errorFile = $errorDir . date('Y-m-d-H') . '.json';
        
        if (!is_dir($errorDir)) {
            mkdir($errorDir, 0755, true);
        }
        
        $errorEntry = [
            'timestamp' => date('c'),
            'error' => $error->getMessage(),
            'file' => $error->getFile(),
            'line' => $error->getLine(),
            'payload' => $payload,
            'raw_body_preview' => $rawBody ? substr($rawBody, 0, 500) : null,
            'content_type' => $_SERVER['CONTENT_TYPE'] ?? null,
            'request_method' => $_SERVER['REQUEST_METHOD'] ?? null,
            'headers' => [
                'X-Bitrix-Signature' => $_SERVER['HTTP_X_BITRIX_SIGNATURE'] ?? null,
                'Content-Type' => $_SERVER['CONTENT_TYPE'] ?? null
            ]
        ];
        
        $errors = [];
        if (file_exists($errorFile)) {
            $errors = json_decode(file_get_contents($errorFile), true) ?? [];
        }
        
        $errors[] = $errorEntry;
        
        file_put_contents(
            $errorFile,
            json_encode($errors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
    } catch (Exception $e) {
        error_log('Failed to log webhook error: ' . $e->getMessage());
    }
}

try {
    // Получение raw body
    $rawBody = file_get_contents('php://input');
    
    if (empty($rawBody)) {
        throw new Exception('Empty request body');
    }
    
    // Определение формата данных
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    $payload = null;
    
    // Bitrix24 может отправлять данные в разных форматах
    if (strpos($contentType, 'application/json') !== false) {
        // JSON формат
        $payload = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('Invalid JSON: ' . json_last_error_msg());
        }
    } elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false || !empty($_POST)) {
        // URL-encoded формат (стандартный для Bitrix24 исходящих вебхуков)
        // PHP автоматически парсит данные в $_POST с правильной структурой
        // data[FIELDS][ID]=123 становится $_POST['data']['FIELDS']['ID'] = '123'
        if (!empty($_POST)) {
            $payload = $_POST;
        } else {
            // Если $_POST пуст, парсим вручную из raw body
            parse_str($rawBody, $payload);
        }
    } else {
        // Пробуем JSON по умолчанию
        $payload = json_decode($rawBody, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Если не JSON, пробуем URL-encoded
            parse_str($rawBody, $payload);
        }
    }
    
    if (empty($payload)) {
        throw new Exception('Failed to parse request body');
    }
    
    // Валидация подписи (если секрет настроен)
    $secret = getWebhookSecret();
    if ($secret) {
        // Вариант 1: Подпись в заголовке X-Bitrix-Signature (стандартный способ)
        $signature = $_SERVER['HTTP_X_BITRIX_SIGNATURE'] ?? null;
        
        // Вариант 2: Подпись в payload (если Bitrix24 отправляет её там)
        if (!$signature && isset($payload['signature'])) {
            $signature = $payload['signature'];
        }
        
        // Вариант 3: Токен в URL как параметр (если Bitrix24 включает его в URL)
        // Например: /api/webhook-handler.php?token=xxx
        if (!$signature && isset($_GET['token'])) {
            // Если токен в URL совпадает с секретом, считаем запрос валидным
            // (альтернативный способ валидации)
            if ($_GET['token'] === $secret) {
                $signature = 'valid'; // Помечаем как валидный
            }
        }
        
        // Валидация подписи (если подпись найдена)
        if ($signature && $signature !== 'valid') {
            if (!validateWebhookSignature($rawBody, $signature, $secret)) {
                http_response_code(401);
                echo json_encode([
                    'error' => 'Invalid signature',
                    'error_description' => 'Webhook signature validation failed'
                ]);
                logWebhookError(new Exception('Invalid webhook signature'), ['raw_body' => substr($rawBody, 0, 500)], $rawBody);
                exit;
            }
        } elseif ($signature !== 'valid') {
            // Если секрет настроен, но подпись не найдена - предупреждение
            error_log('Warning: Webhook secret configured but signature not found in request');
        }
    } else {
        // Если секрет не настроен, логируем предупреждение
        error_log('Warning: Webhook secret not configured. Webhook validation is disabled.');
    }
    
    // Валидация обязательных полей
    if (!isset($payload['event'])) {
        throw new Exception('Missing required field: event');
    }
    
    if (!isset($payload['data'])) {
        throw new Exception('Missing required field: data');
    }
    
    // Определение типа события и категории
    $eventType = $payload['event'];
    $eventData = $payload['data'];
    
    $category = null;
    if (strpos($eventType, 'ONCRMDYNAMIC') === 0) {
        $category = 'smart-processes';
    } elseif (strpos($eventType, 'ONTASK') === 0) {
        $category = 'tasks';
    }
    
    // Логирование события
    $clientIp = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if ($category) {
        logWebhookEvent($eventType, $eventData, $category, $payload, $clientIp);
    }
    
    // Успешный ответ Bitrix24
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'event' => $eventType,
        'category' => $category,
        'timestamp' => date('c')
    ]);
    
} catch (Exception $e) {
    // Обработка ошибок
    http_response_code(400);
    echo json_encode([
        'error' => 'Webhook processing failed',
        'error_description' => $e->getMessage()
    ]);
    
    logWebhookError($e, $payload ?? null, $rawBody ?? null);
}

