<?php
/**
 * Integration тест: простой тест интеграции
 *
 * Проверяет базовую работу системы в integration режиме
 */

// Инициализация тестовой среды
require_once '../utils/TestHelper.php';
$config = TestHelper::initializeTestEnvironment('sandbox');

$testPassed = true;
$errorMessages = [];

echo "=== Простой integration тест ===\n\n";

// Тест 1: Проверка конфигурации
echo "Тест 1: Проверка конфигурации\n";
if ($config['use_mocks']) {
    echo "✓ Mock режим включен\n";
} else {
    echo "✓ Реальный режим\n";
}

// Тест 2: Проверка mock систем
echo "\nТест 2: Проверка mock систем\n";
if ($config['use_mocks']) {
    require_once '../mocks/CacheMock.php';
    $result = CacheMock::set('test_key', 'test_value', 60);
    if ($result) {
        $value = CacheMock::get('test_key');
        if ($value === 'test_value') {
            echo "✓ Cache mock работает корректно\n";
        } else {
            echo "✗ Cache mock возвращает неправильное значение\n";
            $testPassed = false;
            $errorMessages[] = "Неправильное значение из cache";
        }
    } else {
        echo "✗ Не удалось сохранить в cache\n";
        $testPassed = false;
        $errorMessages[] = "Ошибка сохранения в cache";
    }
} else {
    echo "✓ Пропуск теста cache (реальный режим)\n";
}

// Тест 3: Проверка зависимостей
echo "\nТест 3: Проверка зависимостей\n";
$dependencies = TestHelper::checkDependencies();
$phpAvailable = isset($dependencies['php']) && $dependencies['php']['available'];
if ($phpAvailable) {
    echo "✓ PHP доступен\n";
} else {
    echo "✗ PHP недоступен\n";
    $testPassed = false;
    $errorMessages[] = "PHP недоступен";
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
TestHelper::logTestResult('test-simple-integration', $testPassed ? 'passed' : 'failed', $metrics['duration'], $message);

// Очистка
TestHelper::cleanupTestData();

// Возврат exit code
exit($testPassed ? 0 : 1);