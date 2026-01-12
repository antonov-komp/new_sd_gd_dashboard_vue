<?php
/**
 * Unit тест: проверка DatePeriodHelper
 */

// Инициализация тестовой среды
require_once '../utils/TestHelper.php';
$config = TestHelper::initializeTestEnvironment('sandbox');

$testPassed = true;
$errorMessages = [];

echo "=== Тест DatePeriodHelper ===\n";

// Попытка загрузить DatePeriodHelper
echo "Загрузка DatePeriodHelper... ";
try {
    require_once '../api/graph-admission-closure/util/DatePeriodHelper.php';
    echo "✓ Успешно\n";

    // Попытка создать экземпляр
    echo "Создание экземпляра... ";
    $helper = new DatePeriodHelper();
    echo "✓ Успешно\n";

    // Простой тест метода
    echo "Тест метода calculateDurationCategory... ";
    $weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC'));
    $result = $helper->calculateDurationCategory('2026-01-01 10:00:00', $weekStart);
    echo "✓ Результат: {$result}\n";

} catch (Exception $e) {
    echo "✗ Ошибка: {$e->getMessage()}\n";
    $testPassed = false;
    $errorMessages[] = "Ошибка DatePeriodHelper: {$e->getMessage()}";
}

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

// Логирование результата
$message = $testPassed ? '' : implode('; ', $errorMessages);
TestHelper::logTestResult('test-date-helper', $testPassed ? 'passed' : 'failed', $metrics['duration'], $message);

// Очистка
TestHelper::cleanupTestData();

// Возврат exit code
exit($testPassed ? 0 : 1);