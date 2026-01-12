<?php
/**
 * Unit тест: формирование carryover категорий и тикетов
 *
 * Тестирует логику категоризации тикетов по длительности без внешних зависимостей
 */

// Инициализация тестовой среды
require_once __DIR__ . '/../utils/TestHelper.php';
$config = TestHelper::initializeTestEnvironment('sandbox');

require_once __DIR__ . '/../../api/graph-admission-closure/util/DatePeriodHelper.php';

$helper = new DatePeriodHelper();
$testPassed = true;
$errorMessages = [];

// Имитируем данные тикетов для тестирования
$mockTickets = [
    [
        'id' => 1001,
        'title' => 'Тикет 446 дней (2024-10-21)',
        'createdTime' => '2024-10-21 10:00:00',
        'stageId' => 'DT140_12:UC_0VHWE2',
        'assignedById' => 123
    ],
    [
        'id' => 1002,
        'title' => 'Тикет 407 дней (2024-11-29)',
        'createdTime' => '2024-11-29 10:00:00',
        'stageId' => 'DT140_12:PREPARATION',
        'assignedById' => 456
    ],
    [
        'id' => 1003,
        'title' => 'Тикет 209 дней (2025-06-15)',
        'createdTime' => '2025-06-15 10:00:00',
        'stageId' => 'DT140_12:UC_0VHWE2',
        'assignedById' => 789
    ]
];

require_once '../../api/graph-admission-closure/util/DatePeriodHelper.php'; // Исправлен путь

$helper = new DatePeriodHelper();
$weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC'));

echo "=== Тест категоризации carryover тикетов ===\n\n";

$categories = [
    'more_than_half_year' => ['label' => 'Более полугода', 'count' => 0, 'tickets' => []],
    'more_than_year' => ['label' => 'Более года', 'count' => 0, 'tickets' => []]
];

foreach ($mockTickets as $ticket) {
    $category = $helper->calculateDurationCategory($ticket['createdTime'], $weekStart);

    if (isset($categories[$category])) {
        $categories[$category]['count']++;
        $categories[$category]['tickets'][] = [
            'id' => $ticket['id'],
            'title' => $ticket['title'],
            'createdTime' => $ticket['createdTime']
        ];
    }

    echo "Тикет {$ticket['id']}: {$ticket['createdTime']} -> {$category}\n";
}

echo "\n=== Результаты категоризации ===\n";
foreach ($categories as $catKey => $category) {
    echo "{$category['label']} ({$catKey}): {$category['count']} тикетов\n";
    foreach ($category['tickets'] as $ticket) {
        echo "  - {$ticket['title']}\n";
    }
    echo "\n";
}

echo "=== Ожидаемые результаты ===\n";
echo "Более полугода: 1 тикет (209 дней)\n";
echo "Более года: 2 тикета (446 и 407 дней)\n";

// Проверки результатов
$expectedResults = [
    'more_than_half_year' => 1,
    'more_than_year' => 2
];

echo "\n=== Проверки ===\n";
foreach ($expectedResults as $categoryKey => $expectedCount) {
    $actualCount = $categories[$categoryKey]['count'];
    $status = $actualCount === $expectedCount ? '✓' : '✗';
    echo "{$status} {$categories[$categoryKey]['label']}: ожидалось {$expectedCount}, получено {$actualCount}\n";

    if ($actualCount !== $expectedCount) {
        $testPassed = false;
        $errorMessages[] = "Неправильное количество в категории '{$categories[$categoryKey]['label']}': ожидалось {$expectedCount}, получено {$actualCount}";
    }
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
TestHelper::logTestResult('test-carryover-categories', $testPassed ? 'passed' : 'failed', $metrics['duration'], $message);

// Очистка
TestHelper::cleanupTestData();

// Возврат exit code
exit($testPassed ? 0 : 1);