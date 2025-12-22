<?php
/**
 * Сервис для работы с SSE (Server-Sent Events) для реального времени
 * 
 * Расположение: src/WebhookLogs/Service/WebhookRealtimeService.php
 * 
 * Инкапсулирует всю логику работы с SSE:
 * - Проверка новых логов через Repository
 * - Отправка событий клиенту
 * - Управление соединением
 * - Обработка таймаутов и ошибок
 */
namespace WebhookLogs\Service;

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;
use WebhookLogs\Exception\WebhookException;
use WebhookLogs\Service\WebhookRealtimeCache;

class WebhookRealtimeService
{
    /**
     * Репозиторий для работы с файлами логов
     * 
     * @var WebhookLogsRepository
     */
    protected WebhookLogsRepository $repository;
    
    /**
     * Последний известный timestamp
     * 
     * @var string|null
     */
    protected ?string $lastTimestamp = null;
    
    /**
     * Время начала работы сервиса
     * 
     * @var int
     */
    protected int $startTime;
    
    /**
     * Время последнего keep-alive
     * 
     * @var int
     */
    protected int $lastKeepAlive;
    
    /**
     * Фильтры для проверки логов
     * 
     * @var array|null
     */
    protected ?array $filters = null;
    
    /**
     * Метрики производительности
     * 
     * @var array
     */
    protected array $metrics = [];
    
    /**
     * Конструктор
     * 
     * @param WebhookLogsRepository|null $repository Репозиторий (если null, создаётся новый)
     * @param string|null $lastTimestamp Последний известный timestamp
     * @param array|null $filters Фильтры для проверки (category, event)
     */
    public function __construct(?WebhookLogsRepository $repository = null, ?string $lastTimestamp = null, ?array $filters = null)
    {
        $this->repository = $repository ?? new WebhookLogsRepository();
        $this->lastTimestamp = $lastTimestamp;
        $this->filters = $filters;
        $this->startTime = time();
        $this->lastKeepAlive = time();
    }
    
    /**
     * Запуск основного цикла SSE
     * 
     * Выполняет проверку новых логов и отправку событий клиенту
     * 
     * @return void
     * @throws WebhookException При критической ошибке
     */
    public function run(): void
    {
        // Отправка начального события
        $this->sendEvent('connected', [
            'message' => 'Connected to realtime stream',
            'timestamp' => date('c')
        ]);
        
        // Получение интервалов из конфигурации
        $checkInterval = WebhookLogsConfig::getRealtimeCheckInterval();
        $keepAliveInterval = WebhookLogsConfig::getRealtimeKeepAliveInterval();
        $maxConnectionTime = WebhookLogsConfig::getRealtimeTimeout();
        
        try {
            while (true) {
                // Проверка разрыва соединения
                if ($this->isConnectionAborted()) {
                    break;
                }
                
                // Проверка новых логов
                $newLogs = $this->checkForNewLogs($this->filters);
                
                if (!empty($newLogs)) {
                    // Обновление последнего timestamp
                    $lastLog = end($newLogs);
                    if ($lastLog instanceof WebhookLogEntry) {
                        $this->lastTimestamp = $lastLog->getTimestamp()->format('c');
                    } elseif (isset($lastLog['timestamp'])) {
                        $this->lastTimestamp = $lastLog['timestamp'];
                    }
                    
                    // Отправка новых логов
                    $this->sendEvent('new_logs', [
                        'logs' => $this->formatLogsForClient($newLogs),
                        'count' => count($newLogs),
                        'timestamp' => date('c')
                    ]);
                }
                
                // Keep-alive для поддержания соединения
                if (time() - $this->lastKeepAlive >= $keepAliveInterval) {
                    $this->sendComment('keep-alive');
                    $this->lastKeepAlive = time();
                }
                
                // Пауза перед следующей проверкой
                sleep($checkInterval);
                
                // Проверка таймаута соединения
                if (time() - $this->startTime > $maxConnectionTime) {
                    $this->sendEvent('timeout', [
                        'message' => 'Connection timeout, please reconnect',
                        'timestamp' => date('c')
                    ]);
                    break;
                }
            }
        } catch (WebhookException $e) {
            // Критическая ошибка вебхука
            $this->sendEvent('error', [
                'message' => 'Server error: ' . $e->getMessage(),
                'timestamp' => date('c'),
                'error_type' => $e->getType()
            ]);
            throw $e;
        } catch (\Exception $e) {
            // Неожиданная ошибка
            $this->sendEvent('error', [
                'message' => 'Server error: ' . $e->getMessage(),
                'timestamp' => date('c')
            ]);
            
            // Логирование ошибки
            error_log("WebhookRealtimeService error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            throw new WebhookLoggingException(
                "Realtime service error: " . $e->getMessage(),
                'realtime',
                ['exception' => get_class($e)]
            );
        } finally {
            // Закрытие соединения
            $this->sendEvent('closed', [
                'message' => 'Connection closed',
                'timestamp' => date('c')
            ]);
        }
    }
    
    /**
     * Проверка новых логов (оптимизированная версия)
     * 
     * Использует кеширование для оптимизации проверки
     * 
     * @param array|null $filters Фильтры для проверки (category, event)
     * @return array Массив WebhookLogEntry
     * @throws WebhookLoggingException При ошибке чтения логов
     */
    protected function checkForNewLogs(?array $filters = null): array
    {
        $checkStartTime = microtime(true);
        $newLogs = [];
        $maxLogsPerCheck = WebhookLogsConfig::getRealtimeMaxLogsPerCheck();
        
        // Получение текущей даты и часа
        $now = new \DateTime('now', new \DateTimeZone(WebhookLogsConfig::getTimezone()));
        $date = $now->format('Y-m-d');
        $hour = (int)$now->format('H');
        
        // Категории для проверки
        $categories = $filters['category'] ?? WebhookLogsConfig::getCategories();
        if (!is_array($categories)) {
            $categories = $categories !== null ? [$categories] : WebhookLogsConfig::getCategories();
        }
        
        foreach ($categories as $category) {
            // Проверка кеша для оптимизации
            $cachedTimestamp = WebhookRealtimeCache::getLastTimestamp($category);
            $checkFromTimestamp = $cachedTimestamp ?? $this->lastTimestamp;
            
            try {
                // Чтение логов через Repository
                $entries = $this->repository->read($category, $date, $hour);
                
                // Преобразование массивов в WebhookLogEntry
                $categoryLogs = [];
                foreach ($entries as $entryData) {
                    try {
                        // Убеждаемся, что категория установлена
                        if (!isset($entryData['category'])) {
                            $entryData['category'] = $category;
                        }
                        
                        $entry = WebhookLogEntry::fromArray($entryData);
                        $entryTimestamp = $entry->getTimestamp()->format('c');
                        
                        // Проверка, что лог новее последнего известного
                        if ($checkFromTimestamp === null || $entryTimestamp > $checkFromTimestamp) {
                            // Применение фильтров
                            if ($this->shouldIncludeLog($entry, $filters)) {
                                $categoryLogs[] = $entry;
                                
                                // Ограничение количества логов
                                if ($maxLogsPerCheck > 0 && count($newLogs) + count($categoryLogs) >= $maxLogsPerCheck) {
                                    break 2; // Выход из обоих циклов
                                }
                            }
                        }
                    } catch (\Exception $e) {
                        // Логируем ошибку, но продолжаем обработку
                        error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                    }
                }
                
                // Обновление кеша для категории
                if (!empty($categoryLogs)) {
                    $lastLog = end($categoryLogs);
                    $lastTimestamp = $lastLog->getTimestamp()->format('c');
                    WebhookRealtimeCache::setLastTimestamp($category, $lastTimestamp);
                }
                
                $newLogs = array_merge($newLogs, $categoryLogs);
            } catch (WebhookLoggingException $e) {
                // Логируем ошибку чтения категории, но продолжаем
                error_log("Failed to read category {$category}: " . $e->getMessage());
            }
        }
        
        // Сортировка по timestamp
        usort($newLogs, function($a, $b) {
            $timestampA = $this->getLogTimestamp($a);
            $timestampB = $this->getLogTimestamp($b);
            
            // Сортировка по возрастанию (старые сначала)
            return $timestampA <=> $timestampB;
        });
        
        // Обновление метрик
        $this->metrics['last_check_time'] = microtime(true) - $checkStartTime;
        $this->metrics['last_check_logs_count'] = count($newLogs);
        
        return $newLogs;
    }
    
    /**
     * Проверить, должен ли лог быть включён в результат
     * 
     * @param WebhookLogEntry $entry Запись лога
     * @param array|null $filters Фильтры
     * @return bool true если должен быть включён
     */
    protected function shouldIncludeLog(WebhookLogEntry $entry, ?array $filters): bool
    {
        if ($filters === null || empty($filters)) {
            return true;
        }
        
        // Фильтр по типу события
        if (isset($filters['event']) && $filters['event'] !== null && $filters['event'] !== '') {
            if ($entry->getEvent() !== $filters['event']) {
                return false;
            }
        }
        
        // Фильтр по категории уже применён на уровне категорий
        
        return true;
    }
    
    /**
     * Получить timestamp из записи лога
     * 
     * @param WebhookLogEntry|array $log Запись лога
     * @return int Unix timestamp
     */
    protected function getLogTimestamp($log): int
    {
        if ($log instanceof WebhookLogEntry) {
            return $log->getTimestamp()->getTimestamp();
        }
        
        // Для обратной совместимости с массивами
        if (isset($log['timestamp'])) {
            $timestamp = strtotime($log['timestamp']);
            return $timestamp !== false ? $timestamp : 0;
        }
        
        return 0;
    }
    
    /**
     * Форматирование логов для отправки клиенту
     * 
     * Преобразует WebhookLogEntry в массивы для JSON
     * 
     * @param array $logs Массив WebhookLogEntry
     * @return array Массив массивов (для JSON)
     */
    protected function formatLogsForClient(array $logs): array
    {
        return array_map(function($log) {
            if ($log instanceof WebhookLogEntry) {
                return $log->toArray();
            }
            return $log; // Если уже массив (для обратной совместимости)
        }, $logs);
    }
    
    /**
     * Отправка события SSE
     * 
     * @param string $event Тип события
     * @param array $data Данные события
     * @return void
     */
    public function sendEvent(string $event, array $data): void
    {
        $json = json_encode($data, WebhookLogsConfig::getJsonEncodeOptions());
        echo "event: {$event}\n";
        echo "data: {$json}\n\n";
        $this->flushOutput();
    }
    
    /**
     * Отправка комментария SSE (keep-alive)
     * 
     * @param string $comment Комментарий
     * @return void
     */
    public function sendComment(string $comment): void
    {
        echo ": {$comment}\n\n";
        $this->flushOutput();
    }
    
    /**
     * Сброс буфера вывода
     * 
     * @return void
     */
    protected function flushOutput(): void
    {
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
    
    /**
     * Проверка разрыва соединения
     * 
     * @return bool true если соединение разорвано
     */
    protected function isConnectionAborted(): bool
    {
        return connection_aborted();
    }
    
    /**
     * Получить последний известный timestamp
     * 
     * @return string|null
     */
    public function getLastTimestamp(): ?string
    {
        return $this->lastTimestamp;
    }
    
    /**
     * Установить последний известный timestamp
     * 
     * @param string|null $timestamp
     * @return void
     */
    public function setLastTimestamp(?string $timestamp): void
    {
        $this->lastTimestamp = $timestamp;
    }
    
    /**
     * Получить фильтры
     * 
     * @return array|null
     */
    public function getFilters(): ?array
    {
        return $this->filters;
    }
    
    /**
     * Установить фильтры
     * 
     * @param array|null $filters
     * @return void
     */
    public function setFilters(?array $filters): void
    {
        $this->filters = $filters;
    }
    
    /**
     * Получить метрики производительности
     * 
     * @return array Метрики
     */
    public function getMetrics(): array
    {
        return array_merge($this->metrics, [
            'connection_time' => time() - $this->startTime,
            'last_keep_alive' => time() - $this->lastKeepAlive,
            'last_timestamp' => $this->lastTimestamp
        ]);
    }
    
    /**
     * Очистить метрики
     * 
     * @return void
     */
    public function clearMetrics(): void
    {
        $this->metrics = [];
    }
}

