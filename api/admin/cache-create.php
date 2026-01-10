<?php
/**
 * API endpoint для создания кеша модуля
 * 
 * TASK-076: Ручное создание кешей с уведомлениями
 * 
 * Метод: POST
 * Путь: /api/admin/cache-create.php
 * 
 * Параметры запроса:
 * {
 *   "module_id": "graph-admission-closure-months",
 *   "mode": "months", // опционально, если модуль поддерживает режимы
 *   "params": {
 *     "product": "1C",
 *     "periodMode": "months",
 *     // ... другие параметры для создания кеша
 *   }
 * }
 * 
 * Формат ответа (успех):
 * {
 *   "success": true,
 *   "message": "Кеш успешно создан",
 *   "cache_key": "months_abc123...",
 *   "module_id": "graph-admission-closure-months",
 *   "already_exists": false
 * }
 * 
 * Документация Bitrix24 REST API:
 * - https://context7.com/bitrix24/rest/
 */

require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/cache/CacheStore.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/service/GraphAdmissionClosureService.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/bitrix/BitrixClient.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/domain/Aggregator.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/config/Config.php';
require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/util/DatePeriodHelper.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Обработка OPTIONS запроса (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка прав администратора
$isAdmin = true; // TODO: Реализовать проверку через Bitrix24 API
if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['error' => 'Access denied. Admin rights required.']);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);
    
    // Валидация JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'error' => 'Invalid JSON',
            'json_error' => json_last_error_msg()
        ]);
        exit;
    }
    
    if (!$input || !isset($input['module_id'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing required parameter: module_id']);
        exit;
    }
    
    $moduleId = $input['module_id'];
    $mode = $input['mode'] ?? null;
    $params = $input['params'] ?? [];
    
    // Генерация task_id для отслеживания прогресса
    $taskId = 'cache_' . uniqid() . '_' . time();
    
    // Создание статуса задачи
    $statusDir = __DIR__ . '/../cache/task-status';
    if (!is_dir($statusDir)) {
        @mkdir($statusDir, 0755, true);
    }
    
    $statusFile = $statusDir . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $taskId) . '.json';
    
    // Инициализация статуса
    $initialStatus = [
        'task_id' => $taskId,
        'module_id' => $moduleId,
        'status' => 'in_progress',
        'progress' => 0,
        'message' => 'Начало создания кеша...',
        'cache_key' => null,
        'created_at' => time(),
        'updated_at' => time()
    ];
    
    @file_put_contents($statusFile, json_encode($initialStatus, JSON_UNESCAPED_UNICODE));
    
    // Определение модуля и создание кеша (асинхронно через фоновую задачу или синхронно)
    // Для простоты делаем синхронно, но обновляем статус
    $result = createCacheForModule($moduleId, $mode, $params, $taskId, $statusFile);
    
    if ($result['success']) {
        // Обновление статуса на завершённый
        $finalStatus = [
            'task_id' => $taskId,
            'module_id' => $moduleId,
            'status' => 'completed',
            'progress' => 100,
            'message' => 'Кеш успешно создан',
            'cache_key' => $result['cache_key'] ?? null,
            'created_at' => $initialStatus['created_at'],
            'updated_at' => time()
        ];
        @file_put_contents($statusFile, json_encode($finalStatus, JSON_UNESCAPED_UNICODE));
        
        http_response_code(200);
        echo json_encode(array_merge($result, ['task_id' => $taskId]));
    } else {
        // Обновление статуса на ошибку
        $errorStatus = [
            'task_id' => $taskId,
            'module_id' => $moduleId,
            'status' => 'failed',
            'progress' => 0,
            'message' => 'Ошибка создания кеша',
            'error' => $result['error'] ?? 'Unknown error',
            'cache_key' => null,
            'created_at' => $initialStatus['created_at'],
            'updated_at' => time()
        ];
        @file_put_contents($statusFile, json_encode($errorStatus, JSON_UNESCAPED_UNICODE));
        
        http_response_code(500);
        echo json_encode(array_merge($result, ['task_id' => $taskId]));
    }
} catch (\Exception $e) {
    http_response_code(500);
    error_log("[CacheCreate] Error: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'error' => 'Internal server error',
        'message' => $e->getMessage()
    ]);
}

/**
 * Создание кеша для модуля
 * 
 * @param string $moduleId ID модуля
 * @param string|null $mode Режим кеша (если модуль поддерживает режимы)
 * @param array $params Параметры для создания кеша
 * @param string|null $taskId ID задачи для отслеживания прогресса
 * @param string|null $statusFile Путь к файлу статуса
 * @return array Результат создания кеша
 */
function createCacheForModule(string $moduleId, ?string $mode, array $params, ?string $taskId = null, ?string $statusFile = null): array
{
    // График приёма/закрытий 1С
    if (strpos($moduleId, 'graph-admission-closure') === 0) {
        return createGraphAdmissionClosureCache($moduleId, $mode, $params, $taskId, $statusFile);
    }
    
    // Трудозатраты на Тикеты сектора 1С
    if (strpos($moduleId, 'time-tracking') === 0) {
        return createTimeTrackingCache($moduleId, $mode, $params, $taskId, $statusFile);
    }
    
    return [
        'success' => false,
        'error' => 'Unknown module: ' . $moduleId
    ];
}

/**
 * Обновление статуса задачи
 * 
 * @param string $statusFile Путь к файлу статуса
 * @param int $progress Прогресс (0-100)
 * @param string $message Сообщение о прогрессе
 * @param string|null $cacheKey Ключ кеша
 */
function updateTaskStatus(string $statusFile, int $progress, string $message, ?string $cacheKey = null): void
{
    if (!file_exists($statusFile)) {
        return;
    }
    
    $content = @file_get_contents($statusFile);
    if ($content === false) {
        return;
    }
    
    $status = @json_decode($content, true);
    if ($status === null || !is_array($status)) {
        return;
    }
    
    $status['progress'] = $progress;
    $status['message'] = $message;
    $status['updated_at'] = time();
    
    if ($cacheKey !== null) {
        $status['cache_key'] = $cacheKey;
    }
    
    @file_put_contents($statusFile, json_encode($status, JSON_UNESCAPED_UNICODE));
}

/**
 * Создание кеша для GraphAdmissionClosureCache
 * 
 * @param string $moduleId ID модуля
 * @param string|null $mode Режим кеша
 * @param array $params Параметры для создания кеша
 * @param string|null $taskId ID задачи для отслеживания прогресса
 * @param string|null $statusFile Путь к файлу статуса
 * @return array Результат создания кеша
 */
function createGraphAdmissionClosureCache(string $moduleId, ?string $mode, array $params, ?string $taskId = null, ?string $statusFile = null): array
{
    // Определение режима из module_id
    if ($mode === null) {
        $mode = strpos($moduleId, 'weeks') !== false ? 'weeks' : 'months';
    }

    // TASK-076: Второй вариант - универсальный кеш для weeks режима
    if ($mode === 'weeks') {
        // Для weeks режима используем универсальные параметры, совместимые с интерфейсом
        // Получаем границы текущей недели
        $tz = new DateTimeZone('UTC');
        $now = new DateTimeImmutable('now', $tz);
        $isoYear = (int)$now->format('o');
        $isoWeek = (int)$now->format('W');

        $weekStart = (new DateTimeImmutable('now', $tz))
            ->setISODate($isoYear, $isoWeek, 1)
            ->setTime(0, 0, 0);
        $weekEnd = $weekStart
            ->modify('+6 days')
            ->setTime(23, 59, 59);

        $defaultParams = [
            'product' => '1C',
            'periodMode' => 'weeks',
            'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
            'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
            'includeTickets' => true,                    // Как в интерфейсе
            'includeNewTicketsByStages' => true,         // Как в интерфейсе
            'includeCarryoverTickets' => true,           // TASK-080: Исправлено с false на true для соответствия интерфейсу
            'includeCarryoverTicketsByDuration' => true  // Как в интерфейсе
        ];
    } else {
        // Для months режима используем стандартные параметры
        // TASK-076: Исправление для совместимости с реальным использованием модуля
        // Для months режима модуль использует includeTickets: true
        $defaultParams = [
            'product' => '1C',
            'periodMode' => 'months',
            'includeTickets' => true, // Для months модуль использует true
            'includeNewTicketsByStages' => false,
            'includeCarryoverTickets' => true, // Для months по умолчанию true
            'includeCarryoverTicketsByDuration' => false
        ];
    }
    
    $finalParams = array_merge($defaultParams, $params);
    
    // TASK-076: Для weeks режима используем универсальный ключ
    if ($mode === 'weeks') {
        $cacheKey = GraphAdmissionClosureCache::generateUniversalKey(
            $finalParams['weekStartUtc'],
            $finalParams['weekEndUtc']
        );
        // TASK-080: Логирование типа кеша для универсального
        error_log("[CacheCreate] Using UNIVERSAL cache for weeks mode");
    } else {
        $cacheKey = GraphAdmissionClosureCache::generateKey($finalParams);
        error_log("[CacheCreate] Using EXACT cache for {$mode} mode");
    }

    // TASK-076: Логирование параметров для отладки
    error_log("[CacheCreate] Module: {$moduleId}, Mode: {$mode}");
    error_log("[CacheCreate] Final params: " . json_encode($finalParams, JSON_UNESCAPED_UNICODE));
    error_log("[CacheCreate] Generated cache key: {$cacheKey}");
    
    // Обновление статуса: проверка существования кеша
    if ($statusFile) {
        updateTaskStatus($statusFile, 10, 'Проверка существования кеша...', $cacheKey);
    }
    
    // Проверка существования кеша
    $existingCache = GraphAdmissionClosureCache::get($cacheKey);
    if ($existingCache !== null) {
        if ($statusFile) {
            updateTaskStatus($statusFile, 100, 'Кеш уже существует', $cacheKey);
        }
        return [
            'success' => true,
            'message' => 'Кеш уже существует',
            'cache_key' => $cacheKey,
            'module_id' => $moduleId,
            'already_exists' => true
        ];
    }
    
    // Обновление статуса: инициализация сервиса
    if ($statusFile) {
        updateTaskStatus($statusFile, 20, 'Инициализация сервиса...', $cacheKey);
    }
    
    // Инициализация зависимостей для GraphAdmissionClosureService
    $config = new Config();
    $dateHelper = new DatePeriodHelper();
    $bitrixClient = new BitrixClient($config->getEntityTypeId(), $config->getPageSize());
    $aggregator = new Aggregator($dateHelper);
    $cacheStore = new CacheStore();
    $service = new GraphAdmissionClosureService($bitrixClient, $aggregator, $cacheStore, $config, $dateHelper);
    
    // Получение данных и сохранение в кеш
    // Используем forceRefresh=false, чтобы не перезаписывать существующий кеш
    $finalParams['forceRefresh'] = false;
    
    error_log("[CacheCreate] Creating cache for module: {$moduleId}, mode: {$mode}, key: {$cacheKey}");
    
    // Обновление статуса: загрузка данных
    if ($statusFile) {
        updateTaskStatus($statusFile, 30, 'Загрузка данных из Bitrix24...', $cacheKey);
    }
    
    $data = $service->handle($finalParams);
    
    // Обновление статуса: сохранение кеша
    if ($statusFile) {
        updateTaskStatus($statusFile, 90, 'Сохранение кеша...', $cacheKey);
    }
    
    // Проверка успешности создания
    if (isset($data['success']) && $data['success'] === true) {
        // Кеш уже сохранён через service->handle(), просто возвращаем результат
        error_log("[CacheCreate] Cache created successfully for key: {$cacheKey}");
        
        return [
            'success' => true,
            'message' => 'Кеш успешно создан',
            'cache_key' => $cacheKey,
            'module_id' => $moduleId,
            'already_exists' => false
        ];
    } else {
        error_log("[CacheCreate] Failed to create cache: service returned unsuccessful result");
        return [
            'success' => false,
            'error' => 'Failed to create cache: service returned unsuccessful result'
        ];
    }
}

/**
 * Создание кеша для TimeTrackingCache
 * 
 * @param string $moduleId ID модуля
 * @param string|null $mode Режим кеша
 * @param array $params Параметры для создания кеша
 * @param string|null $taskId ID задачи для отслеживания прогресса
 * @param string|null $statusFile Путь к файлу статуса
 * @return array Результат создания кеша
 */
function createTimeTrackingCache(string $moduleId, ?string $mode, array $params, ?string $taskId = null, ?string $statusFile = null): array
{
    // Определение режима из module_id
    if ($mode === null) {
        if (strpos($moduleId, 'detailed') !== false) {
            $mode = 'detailed';
        } elseif (strpos($moduleId, 'summary') !== false) {
            $mode = 'summary';
        } else {
            $mode = 'default';
        }
    }
    
    // TODO: Реализовать создание кеша через TimeTrackingService
    // Пока возвращаем ошибку, так как TimeTrackingCache может не существовать
    return [
        'success' => false,
        'error' => 'TimeTrackingCache creation not implemented yet. Module: ' . $moduleId
    ];
}

