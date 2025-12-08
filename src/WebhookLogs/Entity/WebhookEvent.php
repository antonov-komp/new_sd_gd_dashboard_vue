<?php
/**
 * Сущность события вебхука
 * 
 * Расположение: src/WebhookLogs/Entity/WebhookEvent.php
 * 
 * Представляет входящее событие от Bitrix24
 */
namespace WebhookLogs\Entity;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookValidationException;

class WebhookEvent
{
    /**
     * Тип события (например, ONTASKADD, ONCRMDYNAMICITEMADD)
     * 
     * @var string
     */
    private string $eventType;
    
    /**
     * Данные события
     * 
     * @var array
     */
    private array $eventData;
    
    /**
     * Полный payload вебхука
     * 
     * @var array|null
     */
    private ?array $payload = null;
    
    /**
     * Временная метка события
     * 
     * @var \DateTime
     */
    private \DateTime $timestamp;
    
    /**
     * IP адрес клиента
     * 
     * @var string|null
     */
    private ?string $clientIp = null;
    
    /**
     * Подпись вебхука (HMAC)
     * 
     * @var string|null
     */
    private ?string $signature = null;
    
    /**
     * Конструктор
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @param \DateTime|null $timestamp Временная метка (null = текущее время)
     */
    public function __construct(string $eventType, array $eventData, ?\DateTime $timestamp = null)
    {
        $this->eventType = $eventType;
        $this->eventData = $eventData;
        $this->timestamp = $timestamp ?? WebhookLogsConfig::getDateTime();
    }
    
    /**
     * Создать из массива данных
     * 
     * @param array $data Данные события
     * @return self Экземпляр сущности
     * @throws WebhookValidationException При невалидных данных
     */
    public static function fromArray(array $data): self
    {
        // Валидация обязательных полей
        if (!isset($data['event'])) {
            throw new WebhookValidationException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'data' => $data]
            );
        }
        
        if (!isset($data['data'])) {
            throw new WebhookValidationException(
                'Missing required field: data',
                'required_field',
                ['field' => 'data', 'data' => $data]
            );
        }
        
        // Создание сущности
        $event = new self($data['event'], $data['data']);
        
        // Установка опциональных полей
        if (isset($data['payload'])) {
            $event->setPayload($data['payload']);
        }
        
        if (isset($data['timestamp'])) {
            try {
                $timestamp = WebhookLogsConfig::getDateTime($data['timestamp']);
                $event->setTimestamp($timestamp);
            } catch (\Exception $e) {
                throw new WebhookValidationException(
                    'Invalid timestamp format: ' . $data['timestamp'],
                    'invalid_format',
                    ['field' => 'timestamp', 'value' => $data['timestamp']]
                );
            }
        }
        
        if (isset($data['client_ip'])) {
            $event->setClientIp($data['client_ip']);
        }
        
        if (isset($data['signature'])) {
            $event->setSignature($data['signature']);
        }
        
        // Валидация сущности
        $event->validate();
        
        return $event;
    }
    
    /**
     * Преобразовать в массив
     * 
     * @return array Массив данных
     */
    public function toArray(): array
    {
        $data = [
            'event' => $this->eventType,
            'data' => $this->eventData,
            'timestamp' => $this->timestamp->format('c')
        ];
        
        if ($this->payload !== null) {
            $data['payload'] = $this->payload;
        }
        
        if ($this->clientIp !== null) {
            $data['client_ip'] = $this->clientIp;
        }
        
        if ($this->signature !== null) {
            $data['signature'] = $this->signature;
        }
        
        return $data;
    }
    
    /**
     * Валидация сущности
     * 
     * @return bool true если валидна
     * @throws WebhookValidationException При невалидных данных
     */
    public function validate(): bool
    {
        // Валидация типа события
        if (empty($this->eventType)) {
            throw new WebhookValidationException(
                'Event type cannot be empty',
                'required_field',
                ['field' => 'eventType']
            );
        }
        
        // Валидация формата типа события
        if (!preg_match('/^[A-Z][A-Z0-9_]+$/', $this->eventType)) {
            throw new WebhookValidationException(
                'Invalid event type format: ' . $this->eventType,
                'invalid_format',
                ['field' => 'eventType', 'value' => $this->eventType]
            );
        }
        
        // Валидация данных события
        if (!is_array($this->eventData)) {
            throw new WebhookValidationException(
                'Event data must be an array',
                'invalid_type',
                ['field' => 'eventData', 'type' => gettype($this->eventData)]
            );
        }
        
        // Валидация IP адреса (если установлен)
        if ($this->clientIp !== null && !filter_var($this->clientIp, FILTER_VALIDATE_IP)) {
            throw new WebhookValidationException(
                'Invalid IP address: ' . $this->clientIp,
                'invalid_format',
                ['field' => 'clientIp', 'value' => $this->clientIp]
            );
        }
        
        return true;
    }
    
    /**
     * Получить категорию события
     * 
     * @return string|null Категория (tasks, smart-processes) или null
     */
    public function getCategory(): ?string
    {
        if (strpos($this->eventType, 'ONCRMDYNAMIC') === 0) {
            return 'smart-processes';
        }
        
        if (strpos($this->eventType, 'ONTASK') === 0) {
            return 'tasks';
        }
        
        return null;
    }
    
    /**
     * Получить тип события
     * 
     * @return string Тип события
     */
    public function getEventType(): string
    {
        return $this->eventType;
    }
    
    /**
     * Получить данные события
     * 
     * @return array Данные события
     */
    public function getEventData(): array
    {
        return $this->eventData;
    }
    
    /**
     * Установить payload
     * 
     * @param array $payload Payload вебхука
     * @return self
     */
    public function setPayload(array $payload): self
    {
        $this->payload = $payload;
        return $this;
    }
    
    /**
     * Получить payload
     * 
     * @return array|null Payload вебхука
     */
    public function getPayload(): ?array
    {
        return $this->payload;
    }
    
    /**
     * Установить временную метку
     * 
     * @param \DateTime $timestamp Временная метка
     * @return self
     */
    public function setTimestamp(\DateTime $timestamp): self
    {
        $this->timestamp = $timestamp;
        return $this;
    }
    
    /**
     * Получить временную метку
     * 
     * @return \DateTime Временная метка
     */
    public function getTimestamp(): \DateTime
    {
        return $this->timestamp;
    }
    
    /**
     * Установить IP адрес клиента
     * 
     * @param string $clientIp IP адрес
     * @return self
     */
    public function setClientIp(string $clientIp): self
    {
        $this->clientIp = $clientIp;
        return $this;
    }
    
    /**
     * Получить IP адрес клиента
     * 
     * @return string|null IP адрес
     */
    public function getClientIp(): ?string
    {
        return $this->clientIp;
    }
    
    /**
     * Установить подпись вебхука
     * 
     * @param string $signature Подпись (HMAC)
     * @return self
     */
    public function setSignature(string $signature): self
    {
        $this->signature = $signature;
        return $this;
    }
    
    /**
     * Получить подпись вебхука
     * 
     * @return string|null Подпись
     */
    public function getSignature(): ?string
    {
        return $this->signature;
    }
    
    /**
     * Сериализация в JSON
     * 
     * @return string JSON строка
     */
    public function toJson(): string
    {
        return json_encode($this->toArray(), WebhookLogsConfig::getJsonEncodeOptions());
    }
    
    /**
     * Десериализация из JSON
     * 
     * @param string $json JSON строка
     * @return self Экземпляр сущности
     * @throws WebhookValidationException При ошибке парсинга
     */
    public static function fromJson(string $json): self
    {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookValidationException(
                'Invalid JSON: ' . json_last_error_msg(),
                'parse',
                ['json_error' => json_last_error_msg()]
            );
        }
        
        return self::fromArray($data);
    }
}



