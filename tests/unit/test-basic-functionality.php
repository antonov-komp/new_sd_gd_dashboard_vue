<?php
/**
 * Unit тест: базовая функциональность
 *
 * Простой тест для проверки работы системы тестирования
 */

// Инициализация тестовой среды
require_once __DIR__ . '/../utils/TestHelper.php';
$config = TestHelper::initializeTestEnvironment('sandbox');

$testPassed = true;
$errorMessages = [];

echo "=== Тест базовой функциональности ===\n";

// Тест 1: Проверка работы с массивами
echo "\nТест 1: Работа с массивами\n";
$array = [1, 2, 3, 4, 5];
$sum = array_sum($array);
$expectedSum = 15;

if ($sum === $expectedSum) {
    echo "✓ Сумма массива корректна: {$sum}\n";
} else {
    echo "✗ Сумма массива некорректна: ожидалось {$expectedSum}, получено {$sum}\n";
    $testPassed = false;
    $errorMessages[] = "Ошибка в сумме массива";
}

// Тест 2: Проверка работы со строками
echo "\nТест 2: Работа со строками\n";
$string = "Hello World";
$upper = strtoupper($string);
$expectedUpper = "HELLO WORLD";

if ($upper === $expectedUpper) {
    echo "✓ Преобразование строки корректно: {$upper}\n";
} else {
    echo "✗ Преобразование строки некорректно: ожидалось {$expectedUpper}, получено {$upper}\n";
    $testPassed = false;
    $errorMessages[] = "Ошибка в преобразовании строки";
}

// Тест 3: Проверка работы с JSON
echo "\nТест 3: Работа с JSON\n";
$data = ['name' => 'Test', 'value' => 42];
$json = json_encode($data);
$decoded = json_decode($json, true);

if ($decoded === $data) {
    echo "✓ JSON кодирование/декодирование корректно\n";
} else {
    echo "✗ JSON кодирование/декодирование некорректно\n";
    $testPassed = false;
    $errorMessages[] = "Ошибка в JSON обработке";
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
echo "Память: " . round($metrics['memory_used'] / 1024, 2) . " KB\n";

// Логирование результата
$message = $testPassed ? '' : implode('; ', $errorMessages);
TestHelper::logTestResult('test-basic-functionality', $testPassed ? 'passed' : 'failed', $metrics['duration'], $message);

// Очистка
TestHelper::cleanupTestData();

// Возврат exit code
exit($testPassed ? 0 : 1);