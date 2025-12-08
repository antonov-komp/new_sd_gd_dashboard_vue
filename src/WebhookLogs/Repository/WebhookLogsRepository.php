<?php
/**
 * Репозиторий для работы с файлами логов вебхуков
 * 
 * Расположение: src/WebhookLogs/Repository/WebhookLogsRepository.php
 * 
 * Инкапсулирует всю логику работы с файлами логов:
 * - Чтение и запись JSON файлов
 * - Управление структурой директорий
 * - Кеширование метаданных
 * - Оптимизация работы с большими файлами
 */
namespace WebhookLogs\Repository;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;
use WebhookLogs\Utils\LogFileManager;

class WebhookLogsRepository
{
    /**
     * Кеш метаданных файлов
     * 
     * @var array
     */
    private static $metadataCache = [];
    
    /**
     * Кеш содержимого файлов (для часто используемых)
     * 
     * @var array
     */
    private static $contentCache = [];
    
    /**
     * TTL кеша в секундах
     * 
     * @var int
     */
    private static $cacheTtl = 60;
    
    /**
     * Сохранить запись в файл лога
     * 
     * @param string $category Категория (tasks, smart-processes, errors)
     * @param array $entry Запись для сохранения
     * @param \DateTime|null $dateTime Дата и время (null = текущее)
     * @return bool true если успешно
     * @throws WebhookLoggingException При ошибке записи
     */
    public function save(string $category, array $entry, ?\DateTime $dateTime = null): bool
    {
        // Валидация категории
        if (!WebhookLogsConfig::isValidCategory($category)) {
            throw new WebhookLoggingException(
                "Invalid category: {$category}",
                'category',
                ['category' => $category, 'valid_categories' => WebhookLogsConfig::getCategories()]
            );
        }
        
        // Получение даты и времени
        if ($dateTime === null) {
            $dateTime = WebhookLogsConfig::getDateTime();
        }
        
        // Формирование пути к файлу
        $filePath = $this->getLogFilePath($category, $dateTime);
        
        // Обеспечение существования директории
        $logFileManager = new LogFileManager();
        $logFileManager->ensureDirectory(dirname($filePath));
        
        // Чтение существующих записей
        $entries = $this->readFile($filePath);
        
        // Добавление новой записи
        $entries[] = $entry;
        
        // Запись в файл
        return $this->writeFile($filePath, $entries);
    }
    
    /**
     * Прочитать записи из файла лога
     * 
     * @param string $category Категория
     * @param string $date Дата в формате YYYY-MM-DD
     * @param int|null $hour Час (0-23) или null для всех часов
     * @return array Массив записей
     * @throws WebhookLoggingException При ошибке чтения
     */
    public function read(string $category, string $date, ?int $hour = null): array
    {
        // Валидация категории
        if (!WebhookLogsConfig::isValidCategory($category)) {
            throw new WebhookLoggingException(
                "Invalid category: {$category}",
                'category',
                ['category' => $category]
            );
        }
        
        // Валидация даты
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            throw new WebhookLoggingException(
                "Invalid date format: {$date}",
                'date',
                ['date' => $date, 'expected_format' => 'YYYY-MM-DD']
            );
        }
        
        // Валидация часа
        if ($hour !== null && ($hour < 0 || $hour > 23)) {
            throw new WebhookLoggingException(
                "Invalid hour: {$hour}",
                'hour',
                ['hour' => $hour, 'valid_range' => '0-23']
            );
        }
        
        // Если указан час - читаем один файл
        if ($hour !== null) {
            $dateTime = WebhookLogsConfig::getDateTime($date . ' ' . str_pad((string)$hour, 2, '0', STR_PAD_LEFT) . ':00:00');
            $filePath = $this->getLogFilePath($category, $dateTime);
            
            if (!$this->exists($filePath)) {
                return [];
            }
            
            return $this->readFile($filePath);
        }
        
        // Если час не указан - читаем все файлы за дату
        return $this->readByDate($category, $date);
    }
    
    /**
     * Прочитать все записи за дату
     * 
     * @param string $category Категория
     * @param string $date Дата в формате YYYY-MM-DD
     * @return array Массив записей (объединённые из всех файлов)
     * @throws WebhookLoggingException При ошибке чтения
     */
    public function readByDate(string $category, string $date): array
    {
        // Получение всех файлов за дату
        $files = $this->getLogFilesForDate($category, $date);
        
        if (empty($files)) {
            return [];
        }
        
        // Чтение и объединение записей
        $allEntries = [];
        foreach ($files as $filePath) {
            $entries = $this->readFile($filePath);
            $allEntries = array_merge($allEntries, $entries);
        }
        
        return $allEntries;
    }
    
    /**
     * Прочитать записи за конкретный час
     * 
     * @param string $category Категория
     * @param string $date Дата в формате YYYY-MM-DD
     * @param int $hour Час (0-23)
     * @return array Массив записей
     * @throws WebhookLoggingException При ошибке чтения
     */
    public function readByHour(string $category, string $date, int $hour): array
    {
        return $this->read($category, $date, $hour);
    }
    
    /**
     * Проверить существование файла лога
     * 
     * @param string $filePath Полный путь к файлу
     * @return bool true если файл существует
     */
    public function exists(string $filePath): bool
    {
        return file_exists($filePath) && is_file($filePath);
    }
    
    /**
     * Получить метаданные файла (размер, время модификации)
     * 
     * @param string $filePath Полный путь к файлу
     * @return array|null Метаданные или null если файл не существует
     */
    public function getFileMetadata(string $filePath): ?array
    {
        // Проверка кеша
        $cacheKey = md5($filePath);
        if (isset(self::$metadataCache[$cacheKey])) {
            $cached = self::$metadataCache[$cacheKey];
            if (time() - $cached['timestamp'] < self::$cacheTtl) {
                return $cached['data'];
            }
        }
        
        // Проверка существования файла
        if (!$this->exists($filePath)) {
            return null;
        }
        
        // Получение метаданных
        $metadata = [
            'path' => $filePath,
            'size' => filesize($filePath),
            'modified' => filemtime($filePath),
            'modified_formatted' => date('Y-m-d H:i:s', filemtime($filePath))
        ];
        
        // Кеширование
        self::$metadataCache[$cacheKey] = [
            'data' => $metadata,
            'timestamp' => time()
        ];
        
        return $metadata;
    }
    
    /**
     * Удалить файл лога
     * 
     * @param string $filePath Полный путь к файлу
     * @return bool true если успешно
     * @throws WebhookLoggingException При ошибке удаления
     */
    public function delete(string $filePath): bool
    {
        if (!$this->exists($filePath)) {
            return true; // Файл уже не существует
        }
        
        if (!unlink($filePath)) {
            throw new WebhookLoggingException(
                "Failed to delete log file: {$filePath}",
                'delete',
                ['file' => $filePath]
            );
        }
        
        // Очистка кеша
        $this->clearCache($filePath);
        
        return true;
    }
    
    /**
     * Очистить кеш для файла
     * 
     * @param string|null $filePath Путь к файлу (null = очистить весь кеш)
     */
    public function clearCache(?string $filePath = null): void
    {
        if ($filePath === null) {
            self::$metadataCache = [];
            self::$contentCache = [];
            return;
        }
        
        $cacheKey = md5($filePath);
        unset(self::$metadataCache[$cacheKey]);
        unset(self::$contentCache[$cacheKey]);
    }
    
    /**
     * Получить путь к файлу лога
     * 
     * @param string $category Категория
     * @param \DateTime $dateTime Дата и время
     * @return string Полный путь к файлу
     */
    private function getLogFilePath(string $category, \DateTime $dateTime): string
    {
        $categoryPath = WebhookLogsConfig::getCategoryPath($category);
        $fileName = WebhookLogsConfig::formatDateForFile($dateTime) . WebhookLogsConfig::getLogFileExtension();
        
        return $categoryPath . $fileName;
    }
    
    /**
     * Получить все файлы логов за дату
     * 
     * @param string $category Категория
     * @param string $date Дата в формате YYYY-MM-DD
     * @return array Массив путей к файлам
     */
    private function getLogFilesForDate(string $category, string $date): array
    {
        $categoryPath = WebhookLogsConfig::getCategoryPath($category);
        $pattern = $categoryPath . $date . '-*' . WebhookLogsConfig::getLogFileExtension();
        
        $files = glob($pattern);
        
        if ($files === false) {
            return [];
        }
        
        // Сортировка по имени файла (хронологическая)
        sort($files);
        
        return $files;
    }
    
    /**
     * Прочитать файл и декодировать JSON
     * 
     * @param string $filePath Путь к файлу
     * @return array Массив записей
     * @throws WebhookLoggingException При ошибке чтения
     */
    private function readFile(string $filePath): array
    {
        // Проверка кеша содержимого
        $cacheKey = md5($filePath);
        if (isset(self::$contentCache[$cacheKey])) {
            $cached = self::$contentCache[$cacheKey];
            $metadata = $this->getFileMetadata($filePath);
            
            // Проверка, не изменился ли файл
            if ($metadata && $cached['modified'] === $metadata['modified']) {
                return $cached['data'];
            }
        }
        
        // Проверка существования файла
        if (!$this->exists($filePath)) {
            return [];
        }
        
        // Чтение файла
        $content = @file_get_contents($filePath);
        
        if ($content === false) {
            throw new WebhookLoggingException(
                "Failed to read log file: {$filePath}",
                'read',
                ['file' => $filePath, 'error' => error_get_last()]
            );
        }
        
        // Декодирование JSON
        $decodeOptions = WebhookLogsConfig::getJsonDecodeOptions();
        $assoc = ($decodeOptions === JSON_OBJECT_AS_ARRAY);
        $data = json_decode($content, $assoc);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new WebhookLoggingException(
                "Failed to decode JSON from log file: {$filePath}",
                'parse',
                [
                    'file' => $filePath,
                    'json_error' => json_last_error_msg(),
                    'content_preview' => substr($content, 0, 200)
                ]
            );
        }
        
        // Валидация структуры (должен быть массив)
        if (!is_array($data)) {
            throw new WebhookLoggingException(
                "Invalid log file structure: {$filePath} (expected array)",
                'parse',
                ['file' => $filePath, 'type' => gettype($data)]
            );
        }
        
        // Кеширование содержимого
        $metadata = $this->getFileMetadata($filePath);
        if ($metadata) {
            self::$contentCache[$cacheKey] = [
                'data' => $data,
                'modified' => $metadata['modified'],
                'timestamp' => time()
            ];
        }
        
        return $data;
    }
    
    /**
     * Записать данные в файл
     * 
     * @param string $filePath Путь к файлу
     * @param array $data Данные для записи
     * @return bool true если успешно
     * @throws WebhookLoggingException При ошибке записи
     */
    private function writeFile(string $filePath, array $data): bool
    {
        // Кодирование в JSON
        $json = json_encode($data, WebhookLogsConfig::getJsonEncodeOptions());
        
        if ($json === false) {
            throw new WebhookLoggingException(
                "Failed to encode data to JSON",
                'write',
                ['file' => $filePath, 'json_error' => json_last_error_msg()]
            );
        }
        
        // Запись в файл
        $result = @file_put_contents($filePath, $json, LOCK_EX);
        
        if ($result === false) {
            throw new WebhookLoggingException(
                "Failed to write log file: {$filePath}",
                'write',
                ['file' => $filePath, 'error' => error_get_last()]
            );
        }
        
        // Очистка кеша для этого файла
        $this->clearCache($filePath);
        
        return true;
    }
}



