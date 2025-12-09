<?php
/**
 * Скрипт для мониторинга лог-файлов создания слепков
 * 
 * Использование:
 *   php scripts/monitor-snapshot-logs.php
 *   php scripts/monitor-snapshot-logs.php --lines=50
 *   php scripts/monitor-snapshot-logs.php --level=ERROR
 *   php scripts/monitor-snapshot-logs.php --follow
 *   php scripts/monitor-snapshot-logs.php --type=week-start
 * 
 * Расположение: scripts/monitor-snapshot-logs.php
 */

$baseDir = dirname(__DIR__);
require_once($baseDir . '/settings.php');

// Получение параметров командной строки
$options = [
    'lines' => 20,
    'level' => null,
    'follow' => false,
    'type' => 'all' // 'week-start', 'week-end', 'all'
];

$args = $GLOBALS['argv'] ?? [];
for ($i = 1; $i < count($args); $i++) {
    if (strpos($args[$i], '--lines=') === 0) {
        $options['lines'] = (int)substr($args[$i], 8);
    } elseif ($args[$i] === '--lines' && isset($args[$i + 1])) {
        $options['lines'] = (int)$args[$i + 1];
        $i++;
    } elseif (strpos($args[$i], '--level=') === 0) {
        $options['level'] = substr($args[$i], 8);
    } elseif ($args[$i] === '--level' && isset($args[$i + 1])) {
        $options['level'] = $args[$i + 1];
        $i++;
    } elseif ($args[$i] === '--follow') {
        $options['follow'] = true;
    } elseif (strpos($args[$i], '--type=') === 0) {
        $options['type'] = substr($args[$i], 7);
    } elseif ($args[$i] === '--type' && isset($args[$i + 1])) {
        $options['type'] = $args[$i + 1];
        $i++;
    }
}

// Пути к лог-файлам
$logDir = $baseDir . '/logs/snapshots';
$weekStartLog = "$logDir/week-start-" . date('Y-m') . '.log';
$weekEndLog = "$logDir/week-end-" . date('Y-m') . '.log';

/**
 * Чтение и фильтрация лог-файла
 */
function readAndFilterLog($file, $lines, $level = null) {
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $allLines = explode("\n", trim($content));
    $filteredLines = [];
    
    foreach ($allLines as $line) {
        if (empty(trim($line))) {
            continue;
        }
        
        if ($level && strpos($line, "[$level]") === false) {
            continue;
        }
        $filteredLines[] = $line;
    }
    
    return array_slice($filteredLines, -$lines);
}

/**
 * Вывод лог-файла
 */
function displayLog($file, $title, $lines, $level = null) {
    echo "\n=== $title ===\n";
    $logLines = readAndFilterLog($file, $lines, $level);
    
    if (empty($logLines)) {
        echo "Лог-файл пуст или не найден: $file\n";
        return;
    }
    
    foreach ($logLines as $line) {
        // Цветовое кодирование по уровню (если поддерживается терминал)
        if (function_exists('posix_isatty') && posix_isatty(STDOUT)) {
            if (strpos($line, '[ERROR]') !== false) {
                echo "\033[31m$line\033[0m\n"; // Красный
            } elseif (strpos($line, '[WARNING]') !== false) {
                echo "\033[33m$line\033[0m\n"; // Жёлтый
            } elseif (strpos($line, '[SUCCESS]') !== false) {
                echo "\033[32m$line\033[0m\n"; // Зелёный
            } else {
                echo "$line\n";
            }
        } else {
            echo "$line\n";
        }
    }
}

// Основная логика
if ($options['follow']) {
    // Режим мониторинга в реальном времени
    echo "Мониторинг лог-файлов в реальном времени (Ctrl+C для выхода)...\n";
    
    $lastSizeStart = 0;
    $lastSizeEnd = 0;
    
    while (true) {
        // Очистка экрана (если поддерживается)
        if (function_exists('posix_isatty') && posix_isatty(STDOUT)) {
            system('clear');
        }
        
        echo "=== Мониторинг логов (обновление каждые 2 секунды) ===\n";
        echo "Время: " . date('Y-m-d H:i:s') . "\n";
        
        if ($options['type'] === 'all' || $options['type'] === 'week-start') {
            displayLog($weekStartLog, 'Слепок начала недели', $options['lines'], $options['level']);
        }
        
        if ($options['type'] === 'all' || $options['type'] === 'week-end') {
            displayLog($weekEndLog, 'Слепок конца недели', $options['lines'], $options['level']);
        }
        
        sleep(2); // Обновление каждые 2 секунды
    }
} else {
    // Одноразовый вывод
    echo "=== Мониторинг логов создания слепков ===\n";
    echo "Время: " . date('Y-m-d H:i:s') . "\n";
    
    if ($options['type'] === 'all' || $options['type'] === 'week-start') {
        displayLog($weekStartLog, 'Слепок начала недели', $options['lines'], $options['level']);
    }
    
    if ($options['type'] === 'all' || $options['type'] === 'week-end') {
        displayLog($weekEndLog, 'Слепок конца недели', $options['lines'], $options['level']);
    }
}


