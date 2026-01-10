<?php
/**
 * Тест API графика приема и закрытия - проверка категоризации carryover тикетов
 */

echo "=== Тест API категоризации carryover тикетов ===\n\n";

// Имитируем вызов API без кэша
require_once 'api/graph-admission-closure/service/GraphAdmissionClosureService.php';
require_once 'api/graph-admission-closure/bitrix/BitrixClient.php';
require_once 'api/graph-admission-closure/domain/Aggregator.php';
require_once 'api/graph-admission-closure/cache/CacheStore.php';
require_once 'api/graph-admission-closure/config/Config.php';
require_once 'api/graph-admission-closure/util/DatePeriodHelper.php';

// Создаем экземпляры
$config = new Config();
$bitrixClient = new BitrixClient($config->getEntityTypeId(), $config->getPageSize());
$aggregator = new Aggregator(new DatePeriodHelper());
$cacheStore = new CacheStore();
$service = new GraphAdmissionClosureService($bitrixClient, $aggregator, $cacheStore, $config, new DatePeriodHelper());

// Параметры запроса для недели (например, текущая неделя)
$weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC'));
$weekEnd = new DateTimeImmutable('2026-01-12 23:59:59', new DateTimeZone('UTC'));

$payload = [
    'product' => '1C',
    'periodMode' => 'weeks',
    'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
    'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z'),
    'includeCarryoverTickets' => true,
    'includeCarryoverTicketsByDuration' => true,
    'includeTickets' => false, // Не загружать сами тикеты для теста
    'forceRefresh' => true
];

echo "Параметры запроса:\n";
echo "- Неделя: {$weekStart->format('Y-m-d')} - {$weekEnd->format('Y-m-d')}\n";
echo "- forceRefresh: true\n\n";

try {
    $result = $service->handle($payload);

    if (isset($result['carryoverTicketsByDuration'])) {
        echo "Результаты категоризации carryover тикетов:\n";
        foreach ($result['carryoverTicketsByDuration'] as $category) {
            echo "- {$category['durationLabel']}: {$category['count']} тикетов\n";
        }
        echo "\n";

        // Проверим, есть ли тикеты в категориях more_than_half_year и more_than_year
        $halfYear = array_filter($result['carryoverTicketsByDuration'], fn($c) => $c['durationCategory'] === 'more_than_half_year');
        $year = array_filter($result['carryoverTicketsByDuration'], fn($c) => $c['durationCategory'] === 'more_than_year');

        if (!empty($halfYear)) {
            echo "⚠️  Есть тикеты в категории 'more_than_half_year' (180-364 дней)\n";
        }
        if (!empty($year)) {
            echo "✓ Есть тикеты в категории 'more_than_year' (>= 365 дней)\n";
        }

        if (empty($halfYear) && empty($year)) {
            echo "ℹ️  Нет тикетов в категориях более полугода\n";
        }

    } else {
        echo "❌ Нет данных carryoverTicketsByDuration в ответе\n";
    }

} catch (Exception $e) {
    echo "❌ Ошибка: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "\n=== Тест завершен ===\n";