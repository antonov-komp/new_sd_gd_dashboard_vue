<?php
/**
 * TASK-065: Входная точка нового модуля графика приёма/закрытий.
 *
 * Пока не подключено к роутингу; служит каркасом для последующего переноса
 * логики из legacy `api/graph-1c-admission-closure.php` без изменения контракта.
 */

require_once __DIR__ . '/controller/GraphAdmissionClosureController.php';
require_once __DIR__ . '/service/GraphAdmissionClosureService.php';
require_once __DIR__ . '/bitrix/BitrixClient.php';
require_once __DIR__ . '/domain/Aggregator.php';
require_once __DIR__ . '/cache/CacheStore.php';
require_once __DIR__ . '/config/Config.php';
require_once __DIR__ . '/util/DatePeriodHelper.php';

/**
 * Тонкая обертка: чтение тела, вызов контроллера, JSON-ответ.
 * Логика перенесена из legacy без изменений контракта (TASK-065)
 */
if (php_sapi_name() !== 'cli') {
    header('Content-Type: application/json; charset=utf-8');
}

if (!function_exists('jsonResponse')) {
    function jsonResponse($data)
    {
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }
}

if (!function_exists('parseJsonBody')) {
    function parseJsonBody(): array
    {
        $input = file_get_contents('php://input');
        if (!$input) {
            return [];
        }
        $decoded = json_decode($input, true);
        return is_array($decoded) ? $decoded : [];
    }
}

try {
    // Инициализация зависимостей
    $config = new Config();
    $dateHelper = new DatePeriodHelper();
    $bitrixClient = new BitrixClient($config->getEntityTypeId(), $config->getPageSize());
    $aggregator = new Aggregator($dateHelper);
    $cacheStore = new CacheStore();
    $service = new GraphAdmissionClosureService($bitrixClient, $aggregator, $cacheStore, $config, $dateHelper);
    $controller = new GraphAdmissionClosureController($service);

    // Парсинг тела запроса
    $payload = parseJsonBody();

    // Обработка через контроллер
    $response = $controller->handle($payload);

    // Отправка ответа
    jsonResponse($response);
} catch (Exception $e) {
    http_response_code(500);
    jsonResponse([
        'success' => false,
        'message' => 'Ошибка получения данных: ' . $e->getMessage()
    ]);
}

