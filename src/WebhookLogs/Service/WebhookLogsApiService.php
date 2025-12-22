<?php
/**
 * Сервис для работы с API логов вебхуков
 * 
 * Расположение: src/WebhookLogs/Service/WebhookLogsApiService.php
 * 
 * Инкапсулирует всю логику работы с API:
 * - Чтение логов через Repository
 * - Фильтрация по различным параметрам
 * - Сортировка записей
 * - Пагинация результатов
 * - Формирование структурированного ответа
 */
namespace WebhookLogs\Service;

use WebhookLogs\Repository\WebhookLogsRepository;
use WebhookLogs\Entity\WebhookLogEntry;
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;
use WebhookLogs\Exception\WebhookValidationException;

class WebhookLogsApiService
{
    /**
     * Репозиторий для работы с файлами логов
     * 
     * @var WebhookLogsRepository
     */
    protected WebhookLogsRepository $repository;
    
    /**
     * Метрики последнего запроса
     * 
     * @var array
     */
    protected array $metrics = [];
    
    /**
     * Конструктор
     * 
     * @param WebhookLogsRepository|null $repository Репозиторий (если null, создаётся новый)
     */
    public function __construct(?WebhookLogsRepository $repository = null)
    {
        $this->repository = $repository ?? new WebhookLogsRepository();
    }
    
    /**
     * Получить логи с фильтрацией, сортировкой и пагинацией
     * 
     * @param array $filters Фильтры:
     *   - category: string|null (tasks, smart-processes, errors)
     *   - event: string|null (тип события)
     *   - date: string|null (дата в формате YYYY-MM-DD)
     *   - hour: int|null (час 0-23)
     *   - dateFrom: string|null (начальная дата в формате YYYY-MM-DD)
     *   - dateTo: string|null (конечная дата в формате YYYY-MM-DD)
     *   - ip: string|null (IP адрес)
     *   - status: string|null (статус)
     * @param int $page Номер страницы (начиная с 1)
     * @param int $limit Количество записей на странице
     * @param bool $useCache Использовать кеш (по умолчанию true)
     * @return array Структурированный ответ:
     *   - success: bool
     *   - logs: array (массив WebhookLogEntry в виде массивов)
     *   - pagination: array (page, limit, total, pages)
     * @throws WebhookValidationException При невалидных параметрах
     * @throws WebhookLoggingException При ошибке чтения логов
     */
    public function getLogs(array $filters = [], int $page = 1, int $limit = 50, bool $useCache = true): array
    {
        $startTime = microtime(true);
        
        // Нормализация фильтров
        $filters = $this->normalizeFilters($filters);
        
        // Генерация ключа кеша
        $cacheKey = \WebhookLogs\Service\WebhookLogsApiCache::generateCacheKey($filters, $page, $limit);
        
        // Попытка получить из кеша
        if ($useCache) {
            $cached = \WebhookLogs\Service\WebhookLogsApiCache::get($cacheKey);
            if ($cached !== null) {
                $this->metrics['cache_hit'] = true;
                $this->metrics['execution_time'] = microtime(true) - $startTime;
                $this->metrics['cache_key'] = $cacheKey;
                
                if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                    error_log(sprintf(
                        '[WebhookLogsApiService] Cache hit: %s (time: %.2fms)',
                        substr($cacheKey, 0, 20) . '...',
                        $this->metrics['execution_time'] * 1000
                    ));
                }
                
                return $cached;
            }
            
            if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                error_log(sprintf(
                    '[WebhookLogsApiService] Cache miss: %s',
                    substr($cacheKey, 0, 20) . '...'
                ));
            }
        }
        
        $this->metrics['cache_hit'] = false;
        $this->metrics['cache_key'] = $cacheKey;
        
        // Валидация параметров
        $this->validateFilters($filters);
        $this->validatePagination($page, $limit);
        
        // Нормализация параметров
        $category = $filters['category'] ?? null;
        $event = $filters['event'] ?? null;
        $date = $filters['date'] ?? date('Y-m-d');
        $hour = isset($filters['hour']) && $filters['hour'] !== '' ? (int)$filters['hour'] : null;
        
        // Чтение логов через Repository
        $allLogs = $this->readLogs($category, $date, $hour);
        
        // Применение расширенных фильтров
        $allLogs = $this->applyExtendedFilters($allLogs, $filters);
        
        // Фильтрация по типу события
        if ($event !== null) {
            $allLogs = $this->filterByEvent($allLogs, $event);
        }
        
        // Сортировка
        $allLogs = $this->sortLogs($allLogs);
        
        // Пагинация
        $total = count($allLogs);
        $paginatedLogs = $this->paginateLogs($allLogs, $page, $limit);
        
        // Преобразование сущностей в массивы для JSON
        $logsArray = array_map(function($entry) {
            if ($entry instanceof WebhookLogEntry) {
                return $entry->toArray();
            }
            return $entry; // Если уже массив (для обратной совместимости)
        }, $paginatedLogs);
        
        // Формирование ответа
        $result = [
            'success' => true,
            'logs' => $logsArray,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil($total / $limit)
            ]
        ];
        
        // Сохранение в кеш
        if ($useCache) {
            $responseSize = strlen(json_encode($result));
            $maxSize = WebhookLogsConfig::getApiCacheMaxResponseSize();
            
            if ($maxSize > 0 && $responseSize > $maxSize) {
                if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                    error_log(sprintf(
                        '[WebhookLogsApiService] Response too large for cache: %d bytes (max: %d)',
                        $responseSize,
                        $maxSize
                    ));
                }
            } else {
                \WebhookLogs\Service\WebhookLogsApiCache::set($cacheKey, $result);
                
                if (WebhookLogsConfig::isApiCacheLoggingEnabled()) {
                    error_log(sprintf(
                        '[WebhookLogsApiService] Cached response: %s (size: %d bytes)',
                        substr($cacheKey, 0, 20) . '...',
                        $responseSize
                    ));
                }
            }
        }
        
        $this->metrics['execution_time'] = microtime(true) - $startTime;
        $this->metrics['logs_count'] = count($logsArray);
        $this->metrics['total_logs'] = $total;
        $this->metrics['response_size'] = $responseSize ?? strlen(json_encode($result));
        
        return $result;
    }
    
    /**
     * Чтение логов через Repository
     * 
     * @param string|null $category Категория или null для всех
     * @param string $date Дата в формате YYYY-MM-DD
     * @param int|null $hour Час (0-23) или null для всех
     * @return array Массив WebhookLogEntry
     * @throws WebhookLoggingException При ошибке чтения
     */
    protected function readLogs(?string $category, string $date, ?int $hour = null): array
    {
        $allLogs = [];
        
        if ($category !== null) {
            // Чтение конкретной категории
            if (!WebhookLogsConfig::isValidCategory($category)) {
                throw new WebhookValidationException(
                    "Invalid category: {$category}",
                    'category',
                    ['category' => $category, 'valid_categories' => WebhookLogsConfig::getCategories()]
                );
            }
            
            $entries = $this->repository->read($category, $date, $hour);
            
            // Преобразование массивов в WebhookLogEntry
            foreach ($entries as $entryData) {
                try {
                    $entry = WebhookLogEntry::fromArray($entryData);
                    $allLogs[] = $entry;
                } catch (\Exception $e) {
                    // Логируем ошибку, но продолжаем обработку
                    error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                }
            }
        } else {
            // Чтение всех категорий
            $categories = WebhookLogsConfig::getCategories();
            foreach ($categories as $cat) {
                try {
                    $entries = $this->repository->read($cat, $date, $hour);
                    
                    foreach ($entries as $entryData) {
                        try {
                            // Убеждаемся, что категория установлена
                            if (!isset($entryData['category'])) {
                                $entryData['category'] = $cat;
                            }
                            
                            $entry = WebhookLogEntry::fromArray($entryData);
                            $allLogs[] = $entry;
                        } catch (\Exception $e) {
                            error_log("Failed to create WebhookLogEntry: " . $e->getMessage());
                        }
                    }
                } catch (WebhookLoggingException $e) {
                    // Логируем ошибку чтения категории, но продолжаем
                    error_log("Failed to read category {$cat}: " . $e->getMessage());
                }
            }
        }
        
        return $allLogs;
    }
    
    /**
     * Фильтрация логов по типу события
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param string $event Тип события
     * @return array Отфильтрованный массив
     */
    protected function filterByEvent(array $logs, string $event): array
    {
        return array_values(array_filter($logs, function($log) use ($event) {
            if ($log instanceof WebhookLogEntry) {
                return $log->getEvent() === $event;
            }
            
            // Для обратной совместимости с массивами
            return isset($log['event']) && $log['event'] === $event;
        }));
    }
    
    /**
     * Сортировка логов по дате (новые сначала)
     * 
     * @param array $logs Массив WebhookLogEntry
     * @return array Отсортированный массив
     */
    protected function sortLogs(array $logs): array
    {
        usort($logs, function($a, $b) {
            $timestampA = $this->getLogTimestamp($a);
            $timestampB = $this->getLogTimestamp($b);
            
            // Сортировка по убыванию (новые сначала)
            return $timestampB <=> $timestampA;
        });
        
        return array_values($logs); // Переиндексация
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
     * Пагинация логов
     * 
     * @param array $logs Массив всех логов
     * @param int $page Номер страницы
     * @param int $limit Количество записей на странице
     * @return array Массив логов для текущей страницы
     */
    protected function paginateLogs(array $logs, int $page, int $limit): array
    {
        $offset = ($page - 1) * $limit;
        return array_slice($logs, $offset, $limit);
    }
    
    /**
     * Нормализация параметров фильтров
     * 
     * Приводит параметры к единому формату, удаляет пустые значения
     * 
     * @param array $filters Исходные фильтры
     * @return array Нормализованные фильтры
     */
    protected function normalizeFilters(array $filters): array
    {
        $normalized = [];
        
        // Категория
        if (isset($filters['category']) && $filters['category'] !== null && $filters['category'] !== '') {
            $normalized['category'] = trim($filters['category']);
        }
        
        // Событие
        if (isset($filters['event']) && $filters['event'] !== null && $filters['event'] !== '') {
            $normalized['event'] = trim($filters['event']);
        }
        
        // Дата
        if (isset($filters['date']) && $filters['date'] !== null && $filters['date'] !== '') {
            $normalized['date'] = trim($filters['date']);
        }
        
        // Час
        if (isset($filters['hour']) && $filters['hour'] !== null && $filters['hour'] !== '') {
            $normalized['hour'] = (int)$filters['hour'];
        }
        
        // Расширенные фильтры
        if (isset($filters['dateFrom']) && $filters['dateFrom'] !== null && $filters['dateFrom'] !== '') {
            $normalized['dateFrom'] = trim($filters['dateFrom']);
        }
        
        if (isset($filters['dateTo']) && $filters['dateTo'] !== null && $filters['dateTo'] !== '') {
            $normalized['dateTo'] = trim($filters['dateTo']);
        }
        
        if (isset($filters['ip']) && $filters['ip'] !== null && $filters['ip'] !== '') {
            $normalized['ip'] = trim($filters['ip']);
        }
        
        if (isset($filters['status']) && $filters['status'] !== null && $filters['status'] !== '') {
            $normalized['status'] = trim($filters['status']);
        }
        
        return $normalized;
    }
    
    /**
     * Валидация фильтров
     * 
     * @param array $filters Фильтры для валидации
     * @throws WebhookValidationException При невалидных фильтрах
     */
    protected function validateFilters(array $filters): void
    {
        // Валидация категории
        if (isset($filters['category']) && $filters['category'] !== null) {
            if (!WebhookLogsConfig::isValidCategory($filters['category'])) {
                throw new WebhookValidationException(
                    "Invalid category: {$filters['category']}",
                    'category',
                    ['category' => $filters['category'], 'valid_categories' => WebhookLogsConfig::getCategories()]
                );
            }
        }
        
        // Валидация даты
        if (isset($filters['date']) && $filters['date'] !== null) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['date'])) {
                throw new WebhookValidationException(
                    "Invalid date format: {$filters['date']}",
                    'date',
                    ['date' => $filters['date'], 'expected_format' => 'YYYY-MM-DD']
                );
            }
        }
        
        // Валидация часа
        if (isset($filters['hour']) && $filters['hour'] !== null && $filters['hour'] !== '') {
            $hour = (int)$filters['hour'];
            if ($hour < 0 || $hour > 23) {
                throw new WebhookValidationException(
                    "Invalid hour: {$hour}",
                    'hour',
                    ['hour' => $hour, 'valid_range' => '0-23']
                );
            }
        }
        
        // Валидация dateFrom
        if (isset($filters['dateFrom']) && $filters['dateFrom'] !== null) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['dateFrom'])) {
                throw new WebhookValidationException(
                    "Invalid dateFrom format: {$filters['dateFrom']}",
                    'date',
                    ['date' => $filters['dateFrom'], 'expected_format' => 'YYYY-MM-DD']
                );
            }
        }
        
        // Валидация dateTo
        if (isset($filters['dateTo']) && $filters['dateTo'] !== null) {
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $filters['dateTo'])) {
                throw new WebhookValidationException(
                    "Invalid dateTo format: {$filters['dateTo']}",
                    'date',
                    ['date' => $filters['dateTo'], 'expected_format' => 'YYYY-MM-DD']
                );
            }
        }
        
        // Валидация диапазона дат
        if (isset($filters['dateFrom']) && isset($filters['dateTo'])) {
            $fromTimestamp = strtotime($filters['dateFrom']);
            $toTimestamp = strtotime($filters['dateTo']);
            
            if ($fromTimestamp === false || $toTimestamp === false) {
                throw new WebhookValidationException(
                    "Invalid date range",
                    'date',
                    ['dateFrom' => $filters['dateFrom'], 'dateTo' => $filters['dateTo']]
                );
            }
            
            if ($fromTimestamp > $toTimestamp) {
                throw new WebhookValidationException(
                    "dateFrom must be less than or equal to dateTo",
                    'date',
                    ['dateFrom' => $filters['dateFrom'], 'dateTo' => $filters['dateTo']]
                );
            }
        }
        
        // Валидация IP адреса
        if (isset($filters['ip']) && $filters['ip'] !== null) {
            if (!filter_var($filters['ip'], FILTER_VALIDATE_IP)) {
                throw new WebhookValidationException(
                    "Invalid IP address: {$filters['ip']}",
                    'ip',
                    ['ip' => $filters['ip']]
                );
            }
        }
    }
    
    /**
     * Валидация параметров пагинации
     * 
     * @param int $page Номер страницы
     * @param int $limit Количество записей на странице
     * @throws WebhookValidationException При невалидных параметрах
     */
    protected function validatePagination(int $page, int $limit): void
    {
        if ($page < 1) {
            throw new WebhookValidationException(
                "Invalid page number: {$page}",
                'pagination',
                ['page' => $page, 'min_page' => 1]
            );
        }
        
        $minLimit = WebhookLogsConfig::getMinPaginationLimit();
        $maxLimit = WebhookLogsConfig::getMaxPaginationLimit();
        
        if ($limit < $minLimit || $limit > $maxLimit) {
            throw new WebhookValidationException(
                "Invalid limit: {$limit}",
                'pagination',
                ['limit' => $limit, 'min_limit' => $minLimit, 'max_limit' => $maxLimit]
            );
        }
    }
    
    /**
     * Применить расширенные фильтры
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param array $filters Фильтры
     * @return array Отфильтрованный массив
     */
    protected function applyExtendedFilters(array $logs, array $filters): array
    {
        // Фильтр по диапазону дат (dateFrom, dateTo)
        if (isset($filters['dateFrom']) || isset($filters['dateTo'])) {
            $logs = $this->filterByDateRange($logs, $filters['dateFrom'] ?? null, $filters['dateTo'] ?? null);
        }
        
        // Фильтр по IP адресу
        if (isset($filters['ip']) && $filters['ip'] !== null && $filters['ip'] !== '') {
            $logs = $this->filterByIp($logs, $filters['ip']);
        }
        
        // Фильтр по статусу (если есть в details)
        if (isset($filters['status']) && $filters['status'] !== null && $filters['status'] !== '') {
            $logs = $this->filterByStatus($logs, $filters['status']);
        }
        
        return array_values($logs); // Переиндексация
    }
    
    /**
     * Фильтрация по диапазону дат
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param string|null $dateFrom Начальная дата (YYYY-MM-DD)
     * @param string|null $dateTo Конечная дата (YYYY-MM-DD)
     * @return array Отфильтрованный массив
     */
    protected function filterByDateRange(array $logs, ?string $dateFrom, ?string $dateTo): array
    {
        $fromTimestamp = $dateFrom ? strtotime($dateFrom . ' 00:00:00') : null;
        $toTimestamp = $dateTo ? strtotime($dateTo . ' 23:59:59') : null;
        
        return array_filter($logs, function($log) use ($fromTimestamp, $toTimestamp) {
            $logTimestamp = $this->getLogTimestamp($log);
            
            if ($fromTimestamp !== null && $logTimestamp < $fromTimestamp) {
                return false;
            }
            
            if ($toTimestamp !== null && $logTimestamp > $toTimestamp) {
                return false;
            }
            
            return true;
        });
    }
    
    /**
     * Фильтрация по IP адресу
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param string $ip IP адрес для фильтрации
     * @return array Отфильтрованный массив
     */
    protected function filterByIp(array $logs, string $ip): array
    {
        return array_filter($logs, function($log) use ($ip) {
            if ($log instanceof WebhookLogEntry) {
                $logIp = $log->getIp();
                return $logIp !== null && $logIp === $ip;
            }
            
            // Для обратной совместимости с массивами
            return isset($log['ip']) && $log['ip'] === $ip;
        });
    }
    
    /**
     * Фильтрация по статусу
     * 
     * @param array $logs Массив WebhookLogEntry
     * @param string $status Статус для фильтрации
     * @return array Отфильтрованный массив
     */
    protected function filterByStatus(array $logs, string $status): array
    {
        return array_filter($logs, function($log) use ($status) {
            if ($log instanceof WebhookLogEntry) {
                $details = $log->getDetails();
                if ($details && isset($details['status_id'])) {
                    return (string)$details['status_id'] === (string)$status;
                }
            }
            
            // Для обратной совместимости с массивами
            if (isset($log['details']['status_id'])) {
                return (string)$log['details']['status_id'] === (string)$status;
            }
            
            return false;
        });
    }
    
    /**
     * Получить метрики последнего запроса
     * 
     * @return array Метрики
     */
    public function getMetrics(): array
    {
        return $this->metrics;
    }
    
    /**
     * Очистить метрики
     */
    public function clearMetrics(): void
    {
        $this->metrics = [];
    }
}

