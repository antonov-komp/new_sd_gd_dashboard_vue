<?php
/**
 * Сервис обработки вебхуков
 * 
 * Расположение: src/WebhookLogs/Service/WebhookHandlerService.php
 * 
 * Инкапсулирует всю логику обработки входящих вебхуков от Bitrix24
 */
namespace WebhookLogs\Service;

use WebhookLogs\Entity\WebhookEvent;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

class WebhookHandlerService
{
    /**
     * Сервис валидации вебхуков
     * 
     * @var WebhookValidationService
     */
    private WebhookValidationService $validationService;
    
    /**
     * Сервис логирования вебхуков
     * 
     * @var WebhookLoggingService
     */
    private WebhookLoggingService $loggingService;
    
    /**
     * Конструктор
     * 
     * @param WebhookValidationService|null $validationService Сервис валидации (если null - создаётся новый)
     * @param WebhookLoggingService|null $loggingService Сервис логирования (если null - создаётся новый)
     */
    public function __construct(
        ?WebhookValidationService $validationService = null,
        ?WebhookLoggingService $loggingService = null
    ) {
        $this->validationService = $validationService ?? new WebhookValidationService();
        $this->loggingService = $loggingService ?? new WebhookLoggingService();
    }
    
    /**
     * Обработать вебхук
     * 
     * @param string $rawBody Raw body запроса
     * @param array $server $_SERVER массив
     * @param array|null $post $_POST массив (опционально)
     * @param array|null $get $_GET массив (опционально)
     * @return array Результат обработки
     * @throws WebhookValidationException При ошибке валидации
     * @throws WebhookLoggingException При ошибке логирования
     */
    public function handleWebhook(
        string $rawBody,
        array $server,
        ?array $post = null,
        ?array $get = null
    ): array {
        // Парсинг payload
        $payload = $this->parsePayload($rawBody, $server, $post);
        
        if (empty($payload)) {
            throw new WebhookValidationException(
                'Failed to parse request body',
                'parse',
                ['content_type' => $server['CONTENT_TYPE'] ?? null]
            );
        }
        
        // Валидация подписи
        $this->validationService->validateWebhook($rawBody, $server, $payload, $get);
        
        // Валидация обязательных полей
        if (!isset($payload['event'])) {
            throw new WebhookValidationException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'payload_keys' => array_keys($payload)]
            );
        }
        
        if (!isset($payload['data'])) {
            throw new WebhookValidationException(
                'Missing required field: data',
                'required_field',
                ['field' => 'data', 'payload_keys' => array_keys($payload)]
            );
        }
        
        // Получение данных события
        $eventType = $payload['event'];
        $eventData = $payload['data'];
        
        // Получение IP адреса клиента
        $clientIp = $server['REMOTE_ADDR'] ?? 'unknown';
        
        // Логирование события
        $loggingId = null;
        try {
            $loggingId = $this->loggingService->logEvent(
                $eventType,
                $eventData,
                $payload,
                $clientIp
            );
        } catch (WebhookLoggingException $e) {
            // Логируем ошибку логирования, но не прерываем обработку
            error_log('Failed to log webhook event: ' . $e->getMessage());
        }
        
        // Определение категории
        $category = $this->loggingService->categorizeEvent(
            new \WebhookLogs\Entity\WebhookEvent($eventType, $eventData)
        );
        
        // Возврат результата
        return [
            'success' => true,
            'event' => $eventType,
            'category' => $category,
            'logging_id' => $loggingId,
            'timestamp' => date('c')
        ];
    }
    
    /**
     * Парсить payload из запроса
     * 
     * @param string $rawBody Raw body запроса
     * @param array $server $_SERVER массив
     * @param array|null $post $_POST массив (опционально)
     * @return array|null Payload или null
     */
    private function parsePayload(string $rawBody, array $server, ?array $post = null): ?array
    {
        if (empty($rawBody)) {
            return null;
        }
        
        // Определение формата данных
        $contentType = $server['CONTENT_TYPE'] ?? '';
        $payload = null;
        
        // Bitrix24 может отправлять данные в разных форматах
        if (strpos($contentType, 'application/json') !== false) {
            // JSON формат
            $payload = json_decode($rawBody, true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new WebhookValidationException(
                    'Invalid JSON: ' . json_last_error_msg(),
                    'parse',
                    ['json_error' => json_last_error_msg()]
                );
            }
        } elseif (strpos($contentType, 'application/x-www-form-urlencoded') !== false || ($post !== null && !empty($post))) {
            // URL-encoded формат (стандартный для Bitrix24 исходящих вебхуков)
            if ($post !== null && !empty($post)) {
                $payload = $post;
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
        
        return $payload;
    }
    
    /**
     * Обработать ошибку вебхука
     * 
     * @param \Exception $error Исключение
     * @param string|null $rawBody Raw body запроса (если был)
     * @param array|null $payload Payload запроса (если был)
     * @param array|null $server $_SERVER массив (если был)
     * @return string ID созданной записи об ошибке
     */
    public function handleError(
        \Exception $error,
        ?string $rawBody = null,
        ?array $payload = null,
        ?array $server = null
    ): string {
        $clientIp = $server['REMOTE_ADDR'] ?? 'unknown';
        
        try {
            return $this->loggingService->logError($error, $payload, $rawBody, $clientIp);
        } catch (WebhookLoggingException $e) {
            // Если не удалось залогировать ошибку - логируем в error_log
            error_log('Failed to log webhook error: ' . $e->getMessage());
            error_log('Original error: ' . $error->getMessage());
            return '';
        }
    }
}





