<?php
/**
 * Утилита для управления файлами логов
 * 
 * Расположение: src/WebhookLogs/Utils/LogFileManager.php
 * 
 * Вспомогательные функции для работы с файлами и директориями
 */
namespace WebhookLogs\Utils;

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookLoggingException;

class LogFileManager
{
    /**
     * Обеспечить существование директории
     * 
     * @param string $directoryPath Путь к директории
     * @return bool true если директория существует или создана
     * @throws WebhookLoggingException При ошибке создания
     */
    public function ensureDirectory(string $directoryPath): bool
    {
        if (is_dir($directoryPath)) {
            return true;
        }
        
        $permissions = WebhookLogsConfig::getDirectoryPermissions();
        
        if (!mkdir($directoryPath, $permissions, true)) {
            throw new WebhookLoggingException(
                "Failed to create directory: {$directoryPath}",
                'directory',
                ['path' => $directoryPath, 'permissions' => $permissions]
            );
        }
        
        return true;
    }
    
    /**
     * Получить размер файла
     * 
     * @param string $filePath Путь к файлу
     * @return int Размер в байтах (0 если файл не существует)
     */
    public function getFileSize(string $filePath): int
    {
        if (!file_exists($filePath)) {
            return 0;
        }
        
        return filesize($filePath);
    }
    
    /**
     * Получить время модификации файла
     * 
     * @param string $filePath Путь к файлу
     * @return int|null Unix timestamp или null если файл не существует
     */
    public function getFileModificationTime(string $filePath): ?int
    {
        if (!file_exists($filePath)) {
            return null;
        }
        
        return filemtime($filePath);
    }
    
    /**
     * Очистить старые файлы логов
     * 
     * @param string $category Категория
     * @param int $daysToKeep Количество дней для хранения (по умолчанию 30)
     * @return int Количество удалённых файлов
     * @throws WebhookLoggingException При ошибке удаления
     */
    public function cleanupOldFiles(string $category, int $daysToKeep = 30): int
    {
        if (!WebhookLogsConfig::isValidCategory($category)) {
            throw new WebhookLoggingException(
                "Invalid category: {$category}",
                'category',
                ['category' => $category]
            );
        }
        
        $categoryPath = WebhookLogsConfig::getCategoryPath($category);
        
        if (!is_dir($categoryPath)) {
            return 0;
        }
        
        $cutoffDate = WebhookLogsConfig::getDateTime();
        $cutoffDate->modify("-{$daysToKeep} days");
        
        $files = glob($categoryPath . '*.json');
        $deletedCount = 0;
        
        foreach ($files as $file) {
            $fileDate = filemtime($file);
            $fileDateTime = WebhookLogsConfig::getDateTime('@' . $fileDate);
            
            if ($fileDateTime < $cutoffDate) {
                if (unlink($file)) {
                    $deletedCount++;
                }
            }
        }
        
        return $deletedCount;
    }
    
    /**
     * Получить общий размер всех файлов в категории
     * 
     * @param string $category Категория
     * @return int Размер в байтах
     */
    public function getCategorySize(string $category): int
    {
        if (!WebhookLogsConfig::isValidCategory($category)) {
            return 0;
        }
        
        $categoryPath = WebhookLogsConfig::getCategoryPath($category);
        
        if (!is_dir($categoryPath)) {
            return 0;
        }
        
        $files = glob($categoryPath . '*.json');
        $totalSize = 0;
        
        foreach ($files as $file) {
            $totalSize += $this->getFileSize($file);
        }
        
        return $totalSize;
    }
}






