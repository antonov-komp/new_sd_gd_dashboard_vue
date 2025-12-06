<?php
/**
 * Скрипт для проверки логов вебхуков
 * 
 * Использование: php check-webhook-logs.php
 */

$logDir = __DIR__ . '/logs/webhooks/';
$categories = ['tasks', 'smart-processes', 'errors'];

echo "=== Проверка логов вебхуков ===\n\n";

// Текущая дата и час
$currentDate = date('Y-m-d');
$currentHour = date('H');
$currentFile = $currentDate . '-' . $currentHour;

foreach ($categories as $category) {
    $categoryDir = $logDir . $category . '/';
    
    echo "Категория: $category\n";
    echo "Папка: $categoryDir\n";
    
    if (!is_dir($categoryDir)) {
        echo "  ❌ Папка не существует\n\n";
        continue;
    }
    
    // Проверка текущего файла
    $currentLogFile = $categoryDir . $currentFile . '.json';
    echo "  Текущий файл: " . basename($currentLogFile) . "\n";
    
    if (file_exists($currentLogFile)) {
        $logs = json_decode(file_get_contents($currentLogFile), true) ?? [];
        $count = count($logs);
        echo "  ✅ Файл существует, записей: $count\n";
        
        if ($count > 0) {
            echo "  Последние 3 записи:\n";
            $recent = array_slice($logs, -3);
            foreach ($recent as $i => $log) {
                $num = $count - count($recent) + $i + 1;
                echo "    [$num] " . ($log['event'] ?? 'N/A') . " - " . ($log['timestamp'] ?? 'N/A') . "\n";
            }
        }
    } else {
        echo "  ⚠️  Файл не существует (события ещё не пришли)\n";
    }
    
    // Поиск всех файлов в категории
    $files = glob($categoryDir . '*.json');
    if ($files) {
        echo "  Всего файлов: " . count($files) . "\n";
        echo "  Последние файлы:\n";
        usort($files, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        foreach (array_slice($files, 0, 5) as $file) {
            $size = filesize($file);
            $time = date('Y-m-d H:i:s', filemtime($file));
            echo "    - " . basename($file) . " ($size bytes, $time)\n";
        }
    }
    
    echo "\n";
}

// Проверка ошибок
$errorDir = $logDir . 'errors/';
if (is_dir($errorDir)) {
    $errorFiles = glob($errorDir . '*.json');
    if ($errorFiles) {
        echo "=== ОШИБКИ ===\n";
        usort($errorFiles, function($a, $b) {
            return filemtime($b) - filemtime($a);
        });
        
        $latestErrorFile = $errorFiles[0];
        $errors = json_decode(file_get_contents($latestErrorFile), true) ?? [];
        
        echo "Последние ошибки (из " . basename($latestErrorFile) . "):\n";
        foreach (array_slice($errors, -5) as $error) {
            echo "  - " . ($error['error'] ?? 'Unknown error') . "\n";
            echo "    Время: " . ($error['timestamp'] ?? 'N/A') . "\n";
        }
    } else {
        echo "✅ Ошибок не найдено\n";
    }
}

echo "\n=== Проверка конфигурации ===\n";
$secretFile = __DIR__ . '/webhook-secret.php';
if (file_exists($secretFile)) {
    $secret = include $secretFile;
    if ($secret && $secret !== 'YOUR_WEBHOOK_SECRET_HERE') {
        echo "✅ Токен настроен: " . substr($secret, 0, 10) . "...\n";
    } else {
        echo "⚠️  Токен не настроен (используется значение по умолчанию)\n";
    }
} else {
    echo "❌ Файл webhook-secret.php не найден\n";
}

echo "\n=== Рекомендации ===\n";
echo "1. Проверьте URL вебхука в Bitrix24: https://your-domain.com/api/webhook-handler.php\n";
echo "2. Убедитесь, что веб-сервер правильно настроен для обработки PHP файлов\n";
echo "3. Проверьте права доступа на папку logs/webhooks/\n";
echo "4. Создайте тестовое событие в Bitrix24 (задачу или элемент смарт-процесса)\n";

