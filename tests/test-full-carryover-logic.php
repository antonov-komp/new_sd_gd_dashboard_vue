<?php
/**
 * Полный тест логики carryover тикетов: определение -> категоризация -> результат
 */

require_once '../api/graph-admission-closure/util/DatePeriodHelper.php';

$helper = new DatePeriodHelper();

// Настройки для анализа недели (например, текущая неделя)
$weekStart = new DateTimeImmutable('2026-01-06 00:00:00', new DateTimeZone('UTC'));
$weekEnd = new DateTimeImmutable('2026-01-12 23:59:59', new DateTimeZone('UTC'));

// Целевые стадии (активные)
$targetStages = [
    'DT140_12:UC_0VHWE2',   // formed
    'DT140_12:PREPARATION', // review
    'DT140_12:CLIENT'       // execution
];

// Завершающие стадии
$closingStages = [
    'DT140_12:SUCCESS',
    'DT140_12:FAIL',
    'DT140_12:UC_0GBU8Z'
];

// Тестовые тикеты (имитация данных из Bitrix24)
$testTickets = [
    // Carryover тикеты (активные, созданные до конца недели)
    [
        'id' => 1001,
        'title' => 'Тикет создан 21.10.2024 (446 дней назад)',
        'createdTime' => '2024-10-21 10:00:00',
        'stageId' => 'DT140_12:UC_0VHWE2',
        'movedTime' => null
    ],
    [
        'id' => 1002,
        'title' => 'Тикет создан 29.11.2024 (407 дней назад)',
        'createdTime' => '2024-11-29 10:00:00',
        'stageId' => 'DT140_12:PREPARATION',
        'movedTime' => null
    ],
    [
        'id' => 1003,
        'title' => 'Тикет создан 15.06.2025 (209 дней назад)',
        'createdTime' => '2025-06-15 10:00:00',
        'stageId' => 'DT140_12:CLIENT',
        'movedTime' => null
    ],
    // Не carryover (завершенные стадии)
    [
        'id' => 2001,
        'title' => 'Завершенный тикет',
        'createdTime' => '2024-10-21 10:00:00',
        'stageId' => 'DT140_12:SUCCESS',
        'movedTime' => '2026-01-10 15:00:00'
    ],
    // Не carryover (создан после конца недели)
    [
        'id' => 2002,
        'title' => 'Новый тикет (после недели)',
        'createdTime' => '2026-01-15 10:00:00',
        'stageId' => 'DT140_12:UC_0VHWE2',
        'movedTime' => null
    ]
];

echo "=== Полный тест логики carryover тикетов ===\n";
echo "Анализируемая неделя: {$weekStart->format('d.m.Y')} - {$weekEnd->format('d.m.Y')}\n\n";

// Шаг 1: Определение carryover тикетов
echo "1. Определение carryover тикетов:\n";
$carryoverTickets = [];
$rejectedTickets = [];

foreach ($testTickets as $ticket) {
    $isCarryover = $helper->isCarryoverTicket($ticket, $weekStart, $weekEnd, $targetStages, $closingStages);

    if ($isCarryover) {
        $carryoverTickets[] = $ticket;
        echo "  ✓ Тикет {$ticket['id']}: CARRYOVER\n";
    } else {
        $rejectedTickets[] = $ticket;
        echo "  ✗ Тикет {$ticket['id']}: НЕ carryover\n";
    }
}

echo "\nCarryover тикетов: " . count($carryoverTickets) . "\n";
echo "Отклоненных тикетов: " . count($rejectedTickets) . "\n\n";

// Шаг 2: Категоризация carryover тикетов по длительности
echo "2. Категоризация carryover тикетов по длительности:\n";

$categories = [
    'more_than_year' => ['label' => 'Более года', 'count' => 0, 'tickets' => []],
    'more_than_half_year' => ['label' => 'Более полугода', 'count' => 0, 'tickets' => []],
    'more_than_2_months' => ['label' => 'Более 2 месяцев', 'count' => 0, 'tickets' => []],
    'more_than_month' => ['label' => 'Более 1 месяца', 'count' => 0, 'tickets' => []],
    'less_than_month' => ['label' => 'Менее 1 месяца', 'count' => 0, 'tickets' => []]
];

foreach ($carryoverTickets as $ticket) {
    $category = $helper->calculateDurationCategory($ticket['createdTime'], $weekStart);

    if (isset($categories[$category])) {
        $categories[$category]['count']++;
        $categories[$category]['tickets'][] = [
            'id' => $ticket['id'],
            'title' => $ticket['title'],
            'createdTime' => $ticket['createdTime'],
            'category' => $category
        ];
    } else {
        echo "  ⚠ Тикет {$ticket['id']}: неизвестная категория '{$category}'\n";
    }
}

// Шаг 3: Формирование результата (как в API)
echo "\n3. Результат категоризации (как в API):\n";
$result = [];
foreach ($categories as $catKey => $category) {
    if ($category['count'] > 0) {
        $result[] = [
            'durationCategory' => $catKey,
            'durationLabel' => $category['label'],
            'color' => '#007bff', // заглушка
            'count' => $category['count'],
            'tickets' => $category['tickets']
        ];

        echo "{$category['label']} ({$catKey}): {$category['count']} тикетов\n";
        foreach ($category['tickets'] as $ticket) {
            echo "  - {$ticket['title']}\n";
        }
        echo "\n";
    }
}

echo "=== Ожидаемые результаты ===\n";
echo "Всего carryover тикетов: 3\n";
echo "- Более года: 2 тикета (1001, 1002)\n";
echo "- Более полугода: 1 тикет (1003)\n";
echo "\nОтклоненные: 2 тикета (завершенный и слишком новый)\n";

echo "\n=== Проверка корректности ===\n";
$expectedCounts = [
    'more_than_year' => 2,
    'more_than_half_year' => 1
];

$allCorrect = true;
foreach ($expectedCounts as $cat => $expected) {
    $actual = $categories[$cat]['count'];
    if ($actual === $expected) {
        echo "✓ {$cat}: {$actual} (правильно)\n";
    } else {
        echo "✗ {$cat}: {$actual}, ожидалось {$expected}\n";
        $allCorrect = false;
    }
}

echo "\n" . ($allCorrect ? "✅ Вся логика работает правильно!" : "❌ Есть ошибки в логике");
?>