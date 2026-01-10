<?php
/**
 * Тест логики категоризации тикетов по длительности
 */

require_once 'api/graph-admission-closure/util/DatePeriodHelper.php';

$helper = new DatePeriodHelper();

// Тестовые даты
$testDates = [
    '2024-10-21 10:00:00', // 21 октября 2024
    '2024-11-29 10:00:00', // 29 ноября 2024
    '2025-06-15 10:00:00', // 15 июня 2025
    '2025-12-01 10:00:00', // 1 декабря 2025
];

$weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC')); // Пример начала недели

echo "=== Тест категоризации тикетов по длительности ===\n";
echo "Текущая дата: " . date('Y-m-d H:i:s T') . "\n";
echo "Начало недели: " . $weekStart->format('Y-m-d H:i:s T') . "\n\n";

foreach ($testDates as $dateStr) {
    $category = $helper->calculateDurationCategory($dateStr, $weekStart);

    // Посчитаем дни вручную для проверки
    $ts = strtotime($dateStr);
    $createdDt = new DateTimeImmutable('@' . $ts);
    $createdDt = $createdDt->setTimezone(new DateTimeZone('UTC'));
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $diff = $now->diff($createdDt);
    $days = (int)$diff->format('%a');

    echo "Дата: {$dateStr}\n";
    echo "  Прошло дней: {$days}\n";
    echo "  Категория: {$category}\n";

    // Определим ожидаемую категорию
    if ($days < 14) {
        $expected = 'up_to_month';
    } elseif ($days < 30) {
        $expected = 'less_than_month';
    } elseif ($days < 60) {
        $expected = 'more_than_month';
    } elseif ($days < 180) {
        $expected = 'more_than_2_months';
    } elseif ($days < 365) {
        $expected = 'more_than_half_year';
    } else {
        $expected = 'more_than_year';
    }

    echo "  Ожидалось: {$expected}\n";
    echo "  " . ($category === $expected ? "✓ Правильно" : "✗ Неправильно") . "\n\n";
}

echo "=== Категории ===\n";
echo "up_to_month: < 14 дней\n";
echo "less_than_month: 14-29 дней\n";
echo "more_than_month: 30-59 дней\n";
echo "more_than_2_months: 60-179 дней\n";
echo "more_than_half_year: 180-364 дней\n";
echo "more_than_year: >= 365 дней\n";
?>