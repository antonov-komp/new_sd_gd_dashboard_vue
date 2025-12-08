<?php
/**
 * Сервис валидации вебхуков
 * 
 * Расположение: src/WebhookLogs/Service/WebhookValidationService.php
 * 
 * Инкапсулирует логику валидации подписи вебхуков от Bitrix24
 */
namespace WebhookLogs\Service;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookValidationException;

class WebhookValidationService
{
    /**
     * Получить секрет вебхука из конфигурации
     * 
     * @return string|null Секрет вебхука или null
     */
    public function getWebhookSecret(): ?string
    {
        // Вариант 1: Из отдельного файла конфигурации (рекомендуется)
        $secretFile = WebhookLogsConfig::getSecretFilePath();
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
        $settingsFile = __DIR__ . '/../../settings.json';
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
    public function validateSignature(string $rawBody, string $signature, string $secret): bool
    {
        if (empty($signature) || empty($secret)) {
            return false;
        }
        
        // Вычисление HMAC-SHA256
        $computedSignature = hash_hmac('sha256', $rawBody, $secret);
        
        // Сравнение подписей (защита от timing attacks)
        return hash_equals($signature, $computedSignature);
    }
    
    /**
     * Получить подпись из запроса
     * 
     * @param array $server $_SERVER массив
     * @param array|null $payload Payload запроса (опционально)
     * @param array|null $get $_GET массив (опционально)
     * @return string|null Подпись или null
     */
    public function getSignatureFromRequest(
        array $server,
        ?array $payload = null,
        ?array $get = null
    ): ?string {
        // Вариант 1: Подпись в заголовке X-Bitrix-Signature (стандартный способ)
        $signature = $server['HTTP_X_BITRIX_SIGNATURE'] ?? null;
        
        // Вариант 2: Подпись в payload (если Bitrix24 отправляет её там)
        if (!$signature && $payload !== null && isset($payload['signature'])) {
            $signature = $payload['signature'];
        }
        
        // Вариант 3: Токен в URL как параметр (если Bitrix24 включает его в URL)
        if (!$signature && $get !== null && isset($get['token'])) {
            $secret = $this->getWebhookSecret();
            // Если токен в URL совпадает с секретом, считаем запрос валидным
            if ($secret && $get['token'] === $secret) {
                return 'valid'; // Помечаем как валидный
            }
        }
        
        return $signature;
    }
    
    /**
     * Валидировать вебхук
     * 
     * @param string $rawBody Raw body запроса
     * @param array $server $_SERVER массив
     * @param array|null $payload Payload запроса (опционально)
     * @param array|null $get $_GET массив (опционально)
     * @return bool true если валиден
     * @throws WebhookValidationException При невалидной подписи
     */
    public function validateWebhook(
        string $rawBody,
        array $server,
        ?array $payload = null,
        ?array $get = null
    ): bool {
        $secret = $this->getWebhookSecret();
        
        if (!$secret) {
            // Если секрет не настроен, логируем предупреждение, но не блокируем запрос
            error_log('Warning: Webhook secret not configured. Webhook validation is disabled.');
            return true;
        }
        
        $signature = $this->getSignatureFromRequest($server, $payload, $get);
        
        if ($signature === null) {
            // Если секрет настроен, но подпись не найдена - предупреждение
            error_log('Warning: Webhook secret configured but signature not found in request');
            return true; // Разрешаем запрос, но логируем предупреждение
        }
        
        if ($signature === 'valid') {
            // Токен в URL совпадает с секретом
            return true;
        }
        
        // Валидация подписи
        if (!$this->validateSignature($rawBody, $signature, $secret)) {
            throw new WebhookValidationException(
                'Invalid webhook signature',
                'signature',
                [
                    'signature_received' => substr($signature, 0, 20) . '...',
                    'raw_body_length' => strlen($rawBody)
                ]
            );
        }
        
        return true;
    }
}



