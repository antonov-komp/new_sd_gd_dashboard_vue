<?php
// Тестовый скрипт для проверки API cache-status.php

echo "Testing cache-status API...\n\n";

// Имитируем вызов API
require_once 'api/admin/cache-status.php';

// Функция getCacheInfo должна существовать
if (!function_exists('getCacheInfo')) {
    echo "ERROR: Function getCacheInfo not found\n";
    exit(1);
}

// Тестируем одну директорию
$testDir = __DIR__ . '/api/cache/dashboard-sector-1c';
$result = getCacheInfo($testDir, 600);

echo "Test result for dashboard-sector-1c:\n";
echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
echo "\n\n";

echo "Status: " . ($result['status'] ?? 'unknown') . "\n";
echo "File count: " . ($result['file_count'] ?? 0) . "\n";

echo "\nTest completed.\n";
?>