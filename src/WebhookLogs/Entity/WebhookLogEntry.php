<?php
/**
 * Сущность записи в логе вебхуков
 * 
 * Расположение: src/WebhookLogs/Entity/WebhookLogEntry.php
 * 
 * Представляет запись, сохранённую в файле лога
 */
namespace WebhookLogs\Entity;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;

class WebhookLogEntry
{
    /**
     * Временная метка записи
     * 
     * @var \DateTime
     */
    private \DateTime $timestamp;
    
    /**
     * IP адрес клиента
     * 
     * @var string|null
     */
    private ?string $ip = null;
    
    /**
     * Тип события
     * 
     * @var string
     */
    private string $event;
    
    /**
     * Категория события
     * 
     * @var string
     */
    private string $category;
    
    /**
     * Полный payload вебхука
     * 
     * @var array|null
     */
    private ?array $payload = null;
    
    /**
     * Детали события (извлечённые данные)
     * 
     * @var array|null
     */
    private ?array $details = null;
    
    /**
     * Конструктор
     * 
     * @param string $event Тип события
     * @param string $category Категория
     * @param \DateTime|null $timestamp Временная метка (null = текущее время)
     */
    public function __construct(string $event, string $category, ?\DateTime $timestamp = null)
    {
        $this->event = $event;
        $this->category = $category;
        $this->timestamp = $timestamp ?? WebhookLogsConfig::getDateTime();
    }
    
    /**
     * Создать из WebhookEvent
     * 
     * @param WebhookEvent $event Событие вебхука
     * @param array|null $details Детали события (извлечённые)
     * @return self Экземпляр записи
     */
    public static function fromWebhookEvent(WebhookEvent $event, ?array $details = null): self
    {
        $category = $event->getCategory();
        
        if ($category === null) {
            throw new WebhookLoggingException(
                'Cannot determine category for event: ' . $event->getEventType(),
                'category',
                ['event_type' => $event->getEventType()]
            );
        }
        
        $entry = new self($event->getEventType(), $category, $event->getTimestamp());
        
        if ($event->getClientIp() !== null) {
            $entry->setIp($event->getClientIp());
        }
        
        if ($event->getPayload() !== null) {
            $entry->setPayload($event->getPayload());
        }
        
        if ($details !== null) {
            $entry->setDetails($details);
        }
        
        return $entry;
    }
    
    /**
     * Создать из массива данных
     * 
     * @param array $data Данные записи
     * @return self Экземпляр записи
     * @throws WebhookLoggingException При невалидных данных
     */
    public static function fromArray(array $data): self
    {
        // Валидация обязательных полей
        if (!isset($data['event'])) {
            throw new WebhookLoggingException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'data' => $data]
            );
        }
        
        if (!isset($data['category'])) {
            throw new WebhookLoggingException(
                'Missing required field: category',
                'required_field',
                ['field' => 'category', 'data' => $data]
            );
        }
        
        // Парсинг временной метки
        $timestamp = null;
        if (isset($data['timestamp'])) {
            try {
                $timestamp = WebhookLogsConfig::getDateTime($data['timestamp']);
            } catch (\Exception $e) {
                throw new WebhookLoggingException(
                    'Invalid timestamp format: ' . $data['timestamp'],
                    'parse',
                    ['field' => 'timestamp', 'value' => $data['timestamp']]
                );
            }
        }
        
        // Создание записи
        $entry = new self($data['event'], $data['category'], $timestamp);
        
        // Установка опциональных полей
        if (isset($data['ip'])) {
            $entry->setIp($data['ip']);
        }
        
        if (isset($data['payload'])) {
            $entry->setPayload($data['payload']);
        }
        
        if (isset($data['details'])) {
            $entry->setDetails($data['details']);
        }
        
        // Валидация записи
        $entry->validate();
        
        return $entry;
    }
    
    /**
     * Преобразовать в массив
     * 
     * @return array Массив данных
     */
    public function toArray(): array
    {
        $data = [
            'timestamp' => $this->timestamp->format('c'),
            'event' => $this->event,
            'category' => $this->category
        ];
        
        if ($this->ip !== null) {
            $data['ip'] = $this->ip;
        }
        
        if ($this->payload !== null) {
            $data['payload'] = $this->payload;
        }
        
        if ($this->details !== null) {
            $data['details'] = $this->details;
        }
        
        return $data;
    }
    
    /**
     * Валидация записи
     * 
     * @return bool true если валидна
     * @throws WebhookLoggingException При невалидных данных
     */
    public function validate(): bool
    {
        // Валидация типа события
        if (empty($this->event)) {
            throw new WebhookLoggingException(
                'Event cannot be empty',
                'required_field',
                ['field' => 'event']
            );
        }
        
        // Валидация формата типа события
        if (!preg_match('/^[A-Z][A-Z0-9_]+$/', $this->event)) {
            throw new WebhookLoggingException(
                'Invalid event format: ' . $this->event,
                'invalid_format',
                ['field' => 'event', 'value' => $this->event]
            );
        }
        
        // Валидация категории
        if (!WebhookLogsConfig::isValidCategory($this->category)) {
            throw new WebhookLoggingException(
                'Invalid category: ' . $this->category,
                'category',
                [
                    'category' => $this->category,
                    'valid_categories' => WebhookLogsConfig::getCategories()
                ]
            );
        }
        
        // Валидация IP адреса (если установлен)
        if ($this->ip !== null && !filter_var($this->ip, FILTER_VALIDATE_IP)) {
            throw new WebhookLoggingException(
                'Invalid IP address: ' . $this->ip,
                'invalid_format',
                ['field' => 'ip', 'value' => $this->ip]
            );
        }
        
        return true;
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
     * Установить IP адрес
     * 
     * @param string $ip IP адрес
     * @return self
     */
    public function setIp(string $ip): self
    {
        $this->ip = $ip;
        return $this;
    }
    
    /**
     * Получить IP адрес
     * 
     * @return string|null IP адрес
     */
    public function getIp(): ?string
    {
        return $this->ip;
    }
    
    /**
     * Получить тип события
     * 
     * @return string Тип события
     */
    public function getEvent(): string
    {
        return $this->event;
    }
    
    /**
     * Получить категорию
     * 
     * @return string Категория
     */
    public function getCategory(): string
    {
        return $this->category;
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
     * Установить детали события
     * 
     * @param array $details Детали события
     * @return self
     */
    public function setDetails(array $details): self
    {
        $this->details = $details;
        return $this;
    }
    
    /**
     * Получить детали события
     * 
     * @return array|null Детали события
     */
    public function getDetails(): ?array
    {
        return $this->details;
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
     * @return self Экземпляр записи
     * @throws WebhookLoggingException При ошибке парсинга
     */
    public static function fromJson(string $json): self
    {
        $data = json_decode($json, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookLoggingException(
                'Invalid JSON: ' . json_last_error_msg(),
                'parse',
                ['json_error' => json_last_error_msg()]
            );
        }
        
        return self::fromArray($data);
    }
}


