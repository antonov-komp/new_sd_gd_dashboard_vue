<?php
/**
 * Unit тест: логика категоризации тикетов по длительности
 *
 * Тестирует DatePeriodHelper::calculateDurationCategory без внешних зависимостей
 */

// Инициализация тестовой среды
require_once __DIR__ . '/../utils/TestHelper.php';
$config = TestHelper::initializeTestEnvironment('sandbox');

require_once __DIR__ . '/../../api/graph-admission-closure/util/DatePeriodHelper.php';

$helper = new DatePeriodHelper();
$testPassed = true;
$errorMessages = [];

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
    echo "  " . ($category === $expected ? "✓ Правильно" : "✗ Неправильно") . "\n";

    // Проверяем соответствие
    if ($category !== $expected) {
        $testPassed = false;
        $errorMessages[] = "Неправильная категоризация для {$dateStr}: ожидалось {$expected}, получено {$category}";
    }
}

echo "\n=== Категории ===\n";
echo "up_to_month: < 14 дней\n";
echo "less_than_month: 14-29 дней\n";
echo "more_than_month: 30-59 дней\n";
echo "more_than_2_months: 60-179 дней\n";
echo "more_than_half_year: 180-364 дней\n";
echo "more_than_year: >= 365 дней\n";

// Итоговый результат теста
echo "\n=== Результат теста ===\n";
if ($testPassed) {
    echo "✓ Все проверки пройдены успешно\n";
} else {
    echo "✗ Найдены ошибки:\n";
    foreach ($errorMessages as $error) {
        echo "  - {$error}\n";
    }
}

// Измерение производительности
$metrics = TestHelper::getPerformanceMetrics();
echo "\n=== Метрики ===\n";
echo "Время выполнения: {$metrics['duration']} сек\n";
echo "Память: " . round($metrics['memory_used'] / 1024, 2) . " KB\n";

// Логирование результата
$message = $testPassed ? '' : implode('; ', $errorMessages);
TestHelper::logTestResult('test-duration-category', $testPassed ? 'passed' : 'failed', $metrics['duration'], $message);

// Очистка
TestHelper::cleanupTestData();

// Возврат exit code
exit($testPassed ? 0 : 1);