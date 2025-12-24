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
    
    // Определение модуля и создание кеша
    $result = createCacheForModule($moduleId, $mode, $params);
    
    if ($result['success']) {
        http_response_code(200);
        echo json_encode($result);
    } else {
        http_response_code(500);
        echo json_encode($result);
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
 * @return array Результат создания кеша
 */
function createCacheForModule(string $moduleId, ?string $mode, array $params): array
{
    // График приёма/закрытий 1С
    if (strpos($moduleId, 'graph-admission-closure') === 0) {
        return createGraphAdmissionClosureCache($moduleId, $mode, $params);
    }
    
    // Трудозатраты на Тикеты сектора 1С
    if (strpos($moduleId, 'time-tracking') === 0) {
        return createTimeTrackingCache($moduleId, $mode, $params);
    }
    
    return [
        'success' => false,
        'error' => 'Unknown module: ' . $moduleId
    ];
}

/**
 * Создание кеша для GraphAdmissionClosureCache
 * 
 * @param string $moduleId ID модуля
 * @param string|null $mode Режим кеша
 * @param array $params Параметры для создания кеша
 * @return array Результат создания кеша
 */
function createGraphAdmissionClosureCache(string $moduleId, ?string $mode, array $params): array
{
    // Определение режима из module_id
    if ($mode === null) {
        $mode = strpos($moduleId, 'weeks') !== false ? 'weeks' : 'months';
    }
    
    // Параметры по умолчанию
    $defaultParams = [
        'product' => '1C',
        'periodMode' => $mode,
        'includeTickets' => false,
        'includeNewTicketsByStages' => false,
        'includeCarryoverTickets' => $mode === 'months',
        'includeCarryoverTicketsByDuration' => false
    ];
    
    $finalParams = array_merge($defaultParams, $params);
    
    // Генерация ключа кеша
    $cacheKey = GraphAdmissionClosureCache::generateKey($finalParams);
    
    // Проверка существования кеша
    $existingCache = GraphAdmissionClosureCache::get($cacheKey);
    if ($existingCache !== null) {
        return [
            'success' => true,
            'message' => 'Кеш уже существует',
            'cache_key' => $cacheKey,
            'module_id' => $moduleId,
            'already_exists' => true
        ];
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
    
    $data = $service->handle($finalParams);
    
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
 * @return array Результат создания кеша
 */
function createTimeTrackingCache(string $moduleId, ?string $mode, array $params): array
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

