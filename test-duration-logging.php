<?php
/**
 * Тест логирования calculateDurationCategory
 */

require_once 'api/graph-admission-closure/util/DatePeriodHelper.php';

$helper = new DatePeriodHelper();

// Тестовые даты
$testDates = [
    '2024-10-21 10:00:00', // 446 дней - должен быть more_than_year
    '2024-11-29 10:00:00', // 407 дней - должен быть more_than_year
    '2025-06-15 10:00:00', // 209 дней - должен быть more_than_half_year
    '2025-12-01 10:00:00', // 40 дней - должен быть more_than_month
];

$weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC'));

echo "=== Тест calculateDurationCategory с логированием ===\n";
echo "Текущая дата: " . date('Y-m-d H:i:s T') . "\n\n";

foreach ($testDates as $dateStr) {
    echo "Тестируем дату: {$dateStr}\n";
    $category = $helper->calculateDurationCategory($dateStr, $weekStart);
    echo "Результат: {$category}\n\n";
}

echo "=== Ожидаемые результаты ===\n";
echo "2024-10-21: more_than_year (446 дней > 365)\n";
echo "2024-11-29: more_than_year (407 дней > 365)\n";
echo "2025-06-15: more_than_half_year (209 дней: 180 < 209 < 365)\n";
echo "2025-12-01: more_than_month (40 дней: 30 < 40 < 60)\n";