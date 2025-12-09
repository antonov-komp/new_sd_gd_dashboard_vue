<?php
/**
 * Простой autoloader для модуля WebhookLogs
 * 
 * Расположение: src/WebhookLogs/Autoloader.php
 * 
 * Использование:
 * require_once __DIR__ . '/src/WebhookLogs/Autoloader.php';
 * WebhookLogs\Autoloader::register();
 */
namespace WebhookLogs;

class Autoloader
{
    /**
     * Базовый путь к модулю
     * 
     * @var string|null
     */
    private static $basePath = null;
    
    /**
     * Кеш загруженных классов
     * 
     * @var array
     */
    private static $loadedClasses = [];
    
    /**
     * Зарегистрировать autoloader
     * 
     * @param string|null $basePath Базовый путь к модулю (если null, определяется автоматически)
     */
    public static function register(?string $basePath = null): void
    {
        if ($basePath === null) {
            $basePath = __DIR__;
        }
        
        // Проверка существования базового пути
        if (!is_dir($basePath)) {
            throw new \RuntimeException("WebhookLogs Autoloader: Base path does not exist: {$basePath}");
        }
        
        self::$basePath = realpath($basePath);
        
        // Проверка, что autoloader ещё не зарегистрирован
        if (in_array([self::class, 'loadClass'], spl_autoload_functions(), true)) {
            return; // Уже зарегистрирован
        }
        
        spl_autoload_register([self::class, 'loadClass'], true, true);
    }
    
    /**
     * Загрузить класс
     * 
     * @param string $className Полное имя класса с namespace
     * @return bool true если класс загружен
     */
    public static function loadClass(string $className): bool
    {
        // Проверка кеша
        if (isset(self::$loadedClasses[$className])) {
            return true;
        }
        
        // Проверяем, что класс принадлежит нашему namespace
        if (strpos($className, 'WebhookLogs\\') !== 0) {
            return false;
        }
        
        // Убираем namespace префикс
        $relativePath = substr($className, strlen('WebhookLogs\\'));
        
        // Заменяем обратные слеши на прямые
        $relativePath = str_replace('\\', '/', $relativePath);
        
        // Формируем путь к файлу
        $filePath = self::$basePath . '/' . $relativePath . '.php';
        
        // Проверяем существование файла
        if (!file_exists($filePath)) {
            // Логируем предупреждение (только в режиме разработки)
            if (defined('WP_DEBUG') && WP_DEBUG) {
                error_log("WebhookLogs Autoloader: Class file not found: {$filePath}");
            }
            return false;
        }
        
        try {
            require_once $filePath;
            
            // Проверяем, что класс действительно существует
            if (!class_exists($className) && !interface_exists($className) && !trait_exists($className)) {
                error_log("WebhookLogs Autoloader: Class {$className} not found in file {$filePath}");
                return false;
            }
            
            // Кешируем успешную загрузку
            self::$loadedClasses[$className] = true;
            
            return true;
        } catch (\Throwable $e) {
            error_log("WebhookLogs Autoloader: Error loading class {$className}: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Отменить регистрацию autoloader
     */
    public static function unregister(): void
    {
        spl_autoload_unregister([self::class, 'loadClass']);
    }
    
    /**
     * Очистить кеш загруженных классов
     */
    public static function clearCache(): void
    {
        self::$loadedClasses = [];
    }
    
    /**
     * Получить список загруженных классов
     * 
     * @return array Массив имён классов
     */
    public static function getLoadedClasses(): array
    {
        return array_keys(self::$loadedClasses);
    }
}






