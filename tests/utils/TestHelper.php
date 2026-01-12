<?php
/**
 * Вспомогательный класс для тестирования
 *
 * Предоставляет общие функции для всех типов тестов:
 * - Инициализация тестовых сред
 * - Валидация API ответов
 * - Управление mock системами
 * - Измерение производительности
 * - Логирование результатов
 *
 * @created 2026-01-12
 * @author Full-Stack инженер
 */

class TestHelper
{
    private static $testEnvironment = null;
    private static $startTime = null;
    private static $memoryStart = null;
    private static $config = null;

    /**
     * Инициализация тестовой среды
     *
     * @param string $env Среда тестирования (sandbox, local, ci)
     * @return array Конфигурация среды
     */
    public static function initializeTestEnvironment(string $env = 'sandbox'): array
    {
        self::$testEnvironment = $env;
        self::$startTime = microtime(true);
        self::$memoryStart = memory_get_usage(true);

        // Загрузка конфигурации
        self::$config = require __DIR__ . '/../config/test-config.php';
        $envConfig = self::$config['environments'][$env] ?? self::$config['environments']['sandbox'];

        // Настройка mock систем
        if ($envConfig['use_mocks']) {
            self::setupMocks($envConfig);
        }

        // Настройка логирования
        self::setupLogging($envConfig['log_level']);

        // Инициализация глобального состояния
        self::initializeGlobalState();

        return $envConfig;
    }

    /**
     * Настройка mock систем
     */
    private static function setupMocks(array $config): void
    {
        if ($config['bitrix24']['use_mock']) {
            // Загружаем Bitrix24ApiMock
            require_once __DIR__ . '/../mocks/Bitrix24ApiMock.php';

            // Здесь можно добавить подмену глобальных функций/классов
            // Например, переопределение CRest::call()
        }

        if ($config['database']['use_mock']) {
            // Настройка mock базы данных
            // Загружаем фикстуры если нужно
            if (isset($config['database']['fixtures_path']) && file_exists($config['database']['fixtures_path'])) {
                // Можно добавить логику загрузки SQL фикстур
            }
        }

        // Загружаем CacheMock для всех сред где отключен реальный кеш
        if (!$config['cache_enabled']) {
            require_once __DIR__ . '/../mocks/CacheMock.php';
        }
    }

    /**
     * Настройка логирования
     */
    private static function setupLogging(string $level): void
    {
        // Настройка уровня логирования для тестов
        error_reporting($level === 'debug' ? E_ALL : E_ERROR);
        ini_set('display_errors', $level === 'debug' ? '1' : '0');
        ini_set('log_errors', '1');
        ini_set('error_log', __DIR__ . '/../logs/test-errors.log');
    }

    /**
     * Инициализация глобального состояния
     */
    private static function initializeGlobalState(): void
    {
        // Очистка возможных глобальных переменных
        if (isset($GLOBALS['test_state'])) {
            unset($GLOBALS['test_state']);
        }

        // Инициализация тестового состояния
        $GLOBALS['test_state'] = [
            'start_time' => self::$startTime,
            'environment' => self::$testEnvironment,
            'mocks_enabled' => self::$config['environments'][self::$testEnvironment]['use_mocks'] ?? false
        ];
    }

    /**
     * Очистка тестовых данных и состояния
     */
    public static function cleanupTestData(): void
    {
        // Очистка кеш-файлов (если они есть)
        $cacheDirs = [
            __DIR__ . '/../../api/cache/dashboard-sector-1c',
            __DIR__ . '/../../api/cache/graph-state',
            __DIR__ . '/../../api/cache/test-temp'
        ];

        foreach ($cacheDirs as $dir) {
            if (is_dir($dir)) {
                $files = glob($dir . '/*');
                foreach ($files as $file) {
                    if (is_file($file) && is_writable($file)) {
                        unlink($file);
                    }
                }
            }
        }

        // Очистка mock данных
        if (class_exists('CacheMock')) {
            CacheMock::clear();
            CacheMock::resetStats();
        }

        if (class_exists('Bitrix24ApiMock')) {
            Bitrix24ApiMock::reset();
        }

        // Очистка глобального состояния
        self::cleanupGlobalState();
    }

    /**
     * Очистка глобального состояния
     */
    private static function cleanupGlobalState(): void
    {
        // Сброс статических переменных классов
        // Очистка глобальных переменных
        if (isset($GLOBALS['test_state'])) {
            unset($GLOBALS['test_state']);
        }
    }

    /**
     * Умные проверки API ответов
     *
     * @param array $response API ответ
     * @param array $expected Ожидаемая структура
     * @return array Результат валидации
     */
    public static function assertApiResponse(array $response, array $expected): array
    {
        $errors = [];
        $warnings = [];

        // Проверка обязательных полей
        if (isset($expected['required_fields'])) {
            foreach ($expected['required_fields'] as $field) {
                if (!isset($response[$field])) {
                    $errors[] = "Missing required field: $field";
                }
            }
        }

        // Проверка типов данных
        if (isset($expected['field_types'])) {
            foreach ($expected['field_types'] as $field => $type) {
                if (isset($response[$field])) {
                    $actualType = gettype($response[$field]);
                    if ($actualType !== $type) {
                        $errors[] = "Field '$field' has wrong type. Expected: $type, Actual: $actualType";
                    }
                }
            }
        }

        // Проверка значений
        if (isset($expected['exact_values'])) {
            foreach ($expected['exact_values'] as $field => $expectedValue) {
                if (isset($response[$field]) && $response[$field] !== $expectedValue) {
                    $errors[] = "Field '$field' has wrong value. Expected: " . json_encode($expectedValue) . ", Actual: " . json_encode($response[$field]);
                }
            }
        }

        // Проверка структуры массивов
        if (isset($expected['array_structure'])) {
            $arrayErrors = self::validateArrayStructure($response, $expected['array_structure']);
            $errors = array_merge($errors, $arrayErrors);
        }

        // Проверка диапазонов значений
        if (isset($expected['value_ranges'])) {
            foreach ($expected['value_ranges'] as $field => $range) {
                if (isset($response[$field]) && is_numeric($response[$field])) {
                    $value = (float)$response[$field];
                    if (isset($range['min']) && $value < $range['min']) {
                        $errors[] = "Field '$field' value $value is below minimum {$range['min']}";
                    }
                    if (isset($range['max']) && $value > $range['max']) {
                        $errors[] = "Field '$field' value $value is above maximum {$range['max']}";
                    }
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'response_summary' => self::summarizeResponse($response)
        ];
    }

    /**
     * Валидация структуры массива
     */
    private static function validateArrayStructure(array $array, array $structure): array
    {
        $errors = [];

        if (isset($structure['min_items']) && count($array) < $structure['min_items']) {
            $errors[] = "Array has too few items. Minimum: {$structure['min_items']}, Actual: " . count($array);
        }

        if (isset($structure['max_items']) && count($array) > $structure['max_items']) {
            $errors[] = "Array has too many items. Maximum: {$structure['max_items']}, Actual: " . count($array);
        }

        if (isset($structure['item_structure']) && !empty($array)) {
            foreach ($array as $index => $item) {
                if (is_array($item)) {
                    $itemErrors = self::validateArrayStructure($item, $structure['item_structure']);
                    foreach ($itemErrors as $error) {
                        $errors[] = "Item $index: $error";
                    }
                }
            }
        }

        return $errors;
    }

    /**
     * Создание сводки по ответу API
     */
    private static function summarizeResponse(array $response): array
    {
        return [
            'field_count' => count($response),
            'has_result' => isset($response['result']),
            'has_error' => isset($response['error']),
            'result_type' => isset($response['result']) ? gettype($response['result']) : null,
            'result_count' => isset($response['result']) && is_array($response['result']) ? count($response['result']) : null
        ];
    }

    /**
     * Измерение производительности теста
     */
    public static function getPerformanceMetrics(): array
    {
        $endTime = microtime(true);
        $endMemory = memory_get_usage(true);

        return [
            'duration' => round($endTime - self::$startTime, 4),
            'memory_used' => $endMemory - self::$memoryStart,
            'memory_peak' => memory_get_peak_usage(true),
            'environment' => self::$testEnvironment,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Логирование результатов теста
     */
    public static function logTestResult(string $testName, string $status, float $duration, string $message = ''): void
    {
        $logFile = __DIR__ . '/../logs/test-results.log';
        $timestamp = date('Y-m-d H:i:s');
        $env = self::$testEnvironment ?: 'unknown';

        $logEntry = sprintf(
            "[%s] [%s] %s: %s (%.4fs) %s\n",
            $timestamp,
            $env,
            strtoupper($status),
            $testName,
            $duration,
            $message ? "- $message" : ''
        );

        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }

    /**
     * Генерация тестовых данных
     */
    public static function generateTestData(string $type, int $count = 1): array
    {
        switch ($type) {
            case 'tasks':
                return self::generateTestTasks($count);
            case 'deals':
                return self::generateTestDeals($count);
            case 'users':
                return self::generateTestUsers($count);
            case 'webhooks':
                return self::generateTestWebhooks($count);
            default:
                throw new InvalidArgumentException("Unknown data type: $type");
        }
    }

    /**
     * Генерация тестовых задач
     */
    private static function generateTestTasks(int $count): array
    {
        $tasks = [];
        $stages = ['DT140_12:UC_0VHWE2', 'DT140_12:PREPARATION', 'DT140_12:CLIENT'];
        $titles = ['Задача', 'Тикет', 'Обращение', 'Запрос'];

        for ($i = 0; $i < $count; $i++) {
            $daysAgo = rand(1, 365);
            $tasks[] = [
                'ID' => (string)rand(1000, 9999),
                'TITLE' => $titles[array_rand($titles)] . ' ' . ($i + 1),
                'CREATED_DATE' => date('Y-m-d\TH:i:s\Z', strtotime("-{$daysAgo} days")),
                'STAGE_ID' => $stages[array_rand($stages)],
                'ASSIGNED_BY_ID' => (string)rand(1, 10),
                'RESPONSIBLE_ID' => (string)rand(1, 10),
                'STATUS' => (string)rand(1, 5)
            ];
        }

        return $tasks;
    }

    /**
     * Генерация тестовых сделок
     */
    private static function generateTestDeals(int $count): array
    {
        $deals = [];
        $stages = ['NEW', 'PREPARATION', 'IN_PROGRESS', 'WON'];
        $titles = ['Сделка', 'Контракт', 'Проект'];

        for ($i = 0; $i < $count; $i++) {
            $deals[] = [
                'ID' => (string)rand(1000, 9999),
                'TITLE' => $titles[array_rand($titles)] . ' ' . ($i + 1),
                'STAGE_ID' => $stages[array_rand($stages)],
                'ASSIGNED_BY_ID' => (string)rand(1, 10),
                'OPPORTUNITY' => (string)rand(50000, 500000),
                'CURRENCY_ID' => 'RUB'
            ];
        }

        return $deals;
    }

    /**
     * Генерация тестовых пользователей
     */
    private static function generateTestUsers(int $count): array
    {
        $users = [];
        $departments = ['IT', 'Sales', 'HR', 'Finance'];
        $firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
        $lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson'];

        for ($i = 0; $i < $count; $i++) {
            $users[] = [
                'ID' => (string)($i + 1),
                'NAME' => $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)],
                'DEPARTMENT' => $departments[array_rand($departments)],
                'ACTIVE' => true
            ];
        }

        return $users;
    }

    /**
     * Генерация тестовых вебхуков
     */
    private static function generateTestWebhooks(int $count): array
    {
        $webhooks = [];
        $events = ['ONTASKADD', 'ONTASKUPDATE', 'ONCRMDEALADD'];

        for ($i = 0; $i < $count; $i++) {
            $webhooks[] = [
                'event' => $events[array_rand($events)],
                'data' => [
                    'FIELDS' => [
                        'ID' => (string)rand(1000, 9999),
                        'TITLE' => 'Test Entity ' . ($i + 1)
                    ]
                ],
                'auth' => [
                    'application_token' => 'test_token_' . rand(100, 999)
                ]
            ];
        }

        return $webhooks;
    }

    /**
     * Имитация задержки (для тестирования timeout'ов)
     */
    public static function simulateDelay(int $milliseconds): void
    {
        usleep($milliseconds * 1000);
    }

    /**
     * Проверка доступности внешних зависимостей
     */
    public static function checkDependencies(): array
    {
        $results = [];

        // Проверка PHP
        $results['php'] = [
            'available' => true,
            'version' => PHP_VERSION,
            'extensions' => ['curl', 'json', 'mbstring']
        ];

        // Проверка Node.js
        exec('node --version 2>/dev/null', $output, $code);
        $results['node'] = [
            'available' => $code === 0,
            'version' => $code === 0 ? trim($output[0] ?? '') : null
        ];

        // Проверка curl
        exec('curl --version 2>/dev/null | head -1', $output, $code);
        $results['curl'] = [
            'available' => $code === 0,
            'version' => $code === 0 ? trim($output[0] ?? '') : null
        ];

        return $results;
    }
}