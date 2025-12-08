<?php
/**
 * Сервис логирования вебхуков
 * 
 * Расположение: src/WebhookLogs/Service/WebhookLoggingService.php
 * 
 * Инкапсулирует всю логику логирования событий вебхуков
 */
namespace WebhookLogs\Service;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Entity\WebhookEvent;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Utils\EventDetailsExtractor;
use WebhookLogs\Exception\WebhookLoggingException;

class WebhookLoggingService
{
    /**
     * Репозиторий для работы с файлами логов
     * 
     * @var WebhookLogsRepository
     */
    private WebhookLogsRepository $repository;
    
    /**
     * Извлекатель деталей событий
     * 
     * @var EventDetailsExtractor
     */
    private EventDetailsExtractor $detailsExtractor;
    
    /**
     * Конструктор
     * 
     * @param WebhookLogsRepository|null $repository Репозиторий (если null - создаётся новый)
     * @param EventDetailsExtractor|null $detailsExtractor Извлекатель деталей (если null - создаётся новый)
     */
    public function __construct(
        ?WebhookLogsRepository $repository = null,
        ?EventDetailsExtractor $detailsExtractor = null
    ) {
        $this->repository = $repository ?? new WebhookLogsRepository();
        $this->detailsExtractor = $detailsExtractor ?? new EventDetailsExtractor();
    }
    
    /**
     * Логировать событие вебхука
     * 
     * @param string $eventType Тип события (например, ONTASKADD)
     * @param array $eventData Данные события
     * @param array|null $fullPayload Полный payload вебхука (опционально)
     * @param string|null $clientIp IP адрес клиента (опционально)
     * @param \DateTime|null $timestamp Временная метка (null = текущее время)
     * @return string ID созданной записи (timestamp в формате ISO 8601)
     * @throws WebhookLoggingException При ошибке логирования
     */
    public function logEvent(
        string $eventType,
        array $eventData,
        ?array $fullPayload = null,
        ?string $clientIp = null,
        ?\DateTime $timestamp = null
    ): string {
        try {
            // Создание сущности события
            $event = new WebhookEvent($eventType, $eventData, $timestamp);
            
            // Установка опциональных полей
            if ($clientIp !== null) {
                $event->setClientIp($clientIp);
            }
            
            if ($fullPayload !== null) {
                $event->setPayload($fullPayload);
            }
            
            // Валидация события
            $event->validate();
            
            // Определение категории
            $category = $this->categorizeEvent($event);
            
            if ($category === null) {
                throw new WebhookLoggingException(
                    "Cannot determine category for event: {$eventType}",
                    'category',
                    ['event_type' => $eventType]
                );
            }
            
            // Извлечение деталей события
            $details = $this->detailsExtractor->extract($event);
            
            // Создание записи лога
            $logEntry = WebhookLogEntry::fromWebhookEvent($event, $details);
            
            // Сохранение в репозиторий
            $entryArray = $logEntry->toArray();
            $this->repository->save($category, $entryArray, $event->getTimestamp());
            
            // Возврат ID записи (используем timestamp как ID)
            return $event->getTimestamp()->format('c');
            
        } catch (WebhookLoggingException $e) {
            // Пробрасываем исключения логирования дальше
            throw $e;
        } catch (\Exception $e) {
            // Оборачиваем другие исключения в WebhookLoggingException
            throw new WebhookLoggingException(
                "Failed to log webhook event: {$e->getMessage()}",
                'log',
                [
                    'event_type' => $eventType,
                    'error' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine()
                ]
            );
        }
    }
    
    /**
     * Логировать ошибку
     * 
     * @param \Exception $error Исключение
     * @param array|null $payload Payload вебхука (если был)
     * @param string|null $rawBody Сырое тело запроса (если было)
     * @param string|null $clientIp IP адрес клиента (опционально)
     * @return string ID созданной записи
     * @throws WebhookLoggingException При ошибке логирования
     */
    public function logError(
        \Exception $error,
        ?array $payload = null,
        ?string $rawBody = null,
        ?string $clientIp = null
    ): string {
        try {
            $timestamp = WebhookLogsConfig::getDateTime();
            
            // Создание записи об ошибке
            $errorEntry = [
                'timestamp' => $timestamp->format('c'),
                'error' => $error->getMessage(),
                'file' => $error->getFile(),
                'line' => $error->getLine(),
                'trace' => $error->getTraceAsString(),
                'category' => 'errors'
            ];
            
            // Добавление опциональных полей
            if ($clientIp !== null) {
                $errorEntry['ip'] = $clientIp;
            }
            
            if ($payload !== null) {
                $errorEntry['payload'] = $payload;
            }
            
            if ($rawBody !== null) {
                $errorEntry['raw_body'] = $rawBody;
            }
            
            // Сохранение в репозиторий
            $this->repository->save('errors', $errorEntry, $timestamp);
            
            // Возврат ID записи
            return $timestamp->format('c');
            
        } catch (\Exception $e) {
            // Если не удалось залогировать ошибку - пробрасываем исходное исключение
            throw new WebhookLoggingException(
                "Failed to log webhook error: {$e->getMessage()}",
                'log_error',
                [
                    'original_error' => $error->getMessage(),
                    'logging_error' => $e->getMessage()
                ]
            );
        }
    }
    
    /**
     * Определить категорию события
     * 
     * @param WebhookEvent $event Событие вебхука
     * @return string|null Категория (tasks, smart-processes) или null
     */
    public function categorizeEvent(WebhookEvent $event): ?string
    {
        return $event->getCategory();
    }
    
    /**
     * Логировать событие из массива данных (для обратной совместимости)
     * 
     * @param array $data Данные события
     * @return string ID созданной записи
     * @throws WebhookLoggingException При ошибке логирования
     */
    public function logEventFromArray(array $data): string
    {
        // Валидация обязательных полей
        if (!isset($data['event'])) {
            throw new WebhookLoggingException(
                'Missing required field: event',
                'required_field',
                ['field' => 'event', 'data' => $data]
            );
        }
        
        if (!isset($data['data'])) {
            throw new WebhookLoggingException(
                'Missing required field: data',
                'required_field',
                ['field' => 'data', 'data' => $data]
            );
        }
        
        return $this->logEvent(
            $data['event'],
            $data['data'],
            $data['payload'] ?? null,
            $data['client_ip'] ?? null,
            isset($data['timestamp']) ? WebhookLogsConfig::getDateTime($data['timestamp']) : null
        );
    }
}


