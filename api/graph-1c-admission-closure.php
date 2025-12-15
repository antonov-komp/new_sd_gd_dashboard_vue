<?php
/**
 * API endpoint: График приёма и закрытий сектора 1С
 *
 * Черновая заглушка для фронта (TASK-041): возвращает недельные агрегаты в нужном контракте.
 * Все даты в UTC. Неделя по ISO-8601 (пн–вс).
 */

header('Content-Type: application/json');

// Безопасное чтение тела запроса
$input = file_get_contents('php://input');
$payload = json_decode($input, true);

// Определяем ISO-неделю в UTC
$nowUtc = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$isoYear = (int)$nowUtc->format('o');
$isoWeek = (int)$nowUtc->format('W');

$weekStart = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
    ->setISODate($isoYear, $isoWeek, 1)
    ->setTime(0, 0, 0);
$weekEnd = $weekStart
    ->modify('+6 days')
    ->setTime(23, 59, 59);

// Заглушка данных — нули/пустые массивы, чтобы фронт не падал 404
$response = [
    'success' => true,
    'meta' => [
        'weekNumber' => $isoWeek,
        'weekStartUtc' => $weekStart->format('Y-m-d\TH:i:s\Z'),
        'weekEndUtc' => $weekEnd->format('Y-m-d\TH:i:s\Z')
    ],
    'data' => [
        'newTickets' => 0,
        'closedTickets' => 0,
        'series' => [
            'new' => [0],
            'closed' => [0]
        ],
        'stages' => [],
        'responsible' => []
    ]
];

echo json_encode($response, JSON_UNESCAPED_UNICODE);
exit;

