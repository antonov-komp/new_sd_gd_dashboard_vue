<?php
/**
 * Endpoint для Server-Sent Events (SSE)
 * Отправляет новые логи вебхуков в реальном времени
 * 
 * Расположение: api/webhook-realtime.php
 * 
 * Примечание: Этот файл является тонким слоем (точкой входа).
 * Вся логика работы с SSE вынесена в WebhookRealtimeService.
 */

// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');

use WebhookLogs\Service\WebhookRealtimeService;
use WebhookLogs\Exception\WebhookException;

// Настройка времени выполнения (для долгих соединений)
set_time_limit(0);
ignore_user_abort(false);

// Заголовки для SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Отключение буферизации в Nginx

// Отключение буферизации вывода
if (ob_get_level()) {
    ob_end_clean();
}

// Отключение сжатия для SSE
if (function_exists('apache_setenv')) {
    apache_setenv('no-gzip', 1);
}
ini_set('zlib.output_compression', 0);

try {
    // Получение параметров из запроса
    $lastTimestamp = isset($_GET['last_timestamp']) ? $_GET['last_timestamp'] : null;
    
    // Получение фильтров из запроса
    $filters = [];
    if (isset($_GET['category']) && $_GET['category'] !== '') {
        $filters['category'] = $_GET['category'];
    }
    if (isset($_GET['event']) && $_GET['event'] !== '') {
        $filters['event'] = $_GET['event'];
    }
    
    // Создание сервиса
    $realtimeService = new WebhookRealtimeService(null, $lastTimestamp, !empty($filters) ? $filters : null);
    
    // Запуск основного цикла SSE
    $realtimeService->run();
    
} catch (WebhookException $e) {
    // Обработка ошибок вебхука
    error_log("WebhookRealtimeService error: " . $e->getMessage());
    
    // Отправка события об ошибке (если соединение ещё активно)
    if (!connection_aborted()) {
        echo "event: error\n";
        echo "data: " . json_encode([
            'message' => 'Server error: ' . $e->getMessage(),
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE) . "\n\n";
        flush();
    }
    
} catch (\Exception $e) {
    // Обработка общих ошибок
    error_log("WebhookRealtimeService critical error: " . $e->getMessage());
    
    // Отправка события об ошибке (если соединение ещё активно)
    if (!connection_aborted()) {
        echo "event: error\n";
        echo "data: " . json_encode([
            'message' => 'Server error: ' . $e->getMessage(),
            'timestamp' => date('c')
        ], JSON_UNESCAPED_UNICODE) . "\n\n";
        flush();
    }
}
