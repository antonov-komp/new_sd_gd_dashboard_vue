<?php
/**
 * Скрипт для проверки выполнения cron-задач создания слепков
 * 
 * Использование:
 *   php scripts/check-snapshot-cron.php
 * 
 * Расположение: scripts/check-snapshot-cron.php
 */

$baseDir = dirname(__DIR__);
require_once($baseDir . '/settings.php');

// Пути к лог-файлам
$logDir = $baseDir . '/logs/snapshots';
$weekStartLog = "$logDir/week-start-" . date('Y-m') . '.log';
$weekEndLog = "$logDir/week-end-" . date('Y-m') . '.log';

// Путь к директории со слепками (если используется)
$snapshotsDir = $baseDir . '/storage/app/snapshots/sector-1c';

/**
 * Чтение последних строк из лог-файла
 */
function readLastLines($file, $lines = 10) {
    if (!file_exists($file)) {
        return [];
    }
    
    $content = file_get_contents($file);
    $allLines = explode("\n", trim($content));
    return array_slice($allLines, -$lines);
}

/**
 * Парсинг лог-записи
 */
function parseLogEntry($line) {
    if (preg_match('/\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \[(\w+)\] (.+)/', $line, $matches)) {
        return [
            'timestamp' => $matches[1],
            'level' => $matches[2],
            'message' => $matches[3]
        ];
    }
    return null;
}

/**
 * Проверка наличия слепка
 */
function checkSnapshotExists($date, $type) {
    global $snapshotsDir;
    
    if (!is_dir($snapshotsDir)) {
        return false;
    }
    
    // Определение пути к слепку согласно архитектуре хранения
    $year = date('Y', strtotime($date));
    $week = date('W', strtotime($date));
    $weekPadded = str_pad($week, 2, '0', STR_PAD_LEFT);
    $filename = "$type-$date.json";
    $path = "$snapshotsDir/$year/week-$weekPadded/$filename";
    
    return file_exists($path);
}

/**
 * Получение последнего запуска из лога
 */
function getLastRun($logFile) {
    $lines = readLastLines($logFile, 50);
    $lastRun = null;
    $lastStatus = null;
    $lastMessage = null;
    
    foreach (array_reverse($lines) as $line) {
        $entry = parseLogEntry($line);
        if (!$entry) {
            continue;
        }
        
        if (strpos($entry['message'], 'Начало создания слепка') !== false) {
            $lastRun = $entry['timestamp'];
        }
        
        if (strpos($entry['message'], 'Слепок успешно создан') !== false) {
            $lastStatus = 'SUCCESS';
            $lastMessage = $entry['message'];
            break;
        }
        
        if ($entry['level'] === 'ERROR') {
            $lastStatus = 'ERROR';
            $lastMessage = $entry['message'];
            break;
        }
    }
    
    return [
        'timestamp' => $lastRun,
        'status' => $lastStatus,
        'message' => $lastMessage
    ];
}

// Основная логика
echo "=== Проверка выполнения cron-задач создания слепков ===\n\n";

// Проверка слепка начала недели
echo "Слепок начала недели:\n";
$weekStartInfo = getLastRun($weekStartLog);
if ($weekStartInfo['timestamp']) {
    echo "  ✅ Последний запуск: {$weekStartInfo['timestamp']}\n";
    
    if ($weekStartInfo['status'] === 'SUCCESS') {
        echo "  ✅ Статус: Успешно\n";
        if ($weekStartInfo['message']) {
            echo "  ✅ {$weekStartInfo['message']}\n";
        }
    } elseif ($weekStartInfo['status'] === 'ERROR') {
        echo "  ❌ Статус: Ошибка\n";
        if ($weekStartInfo['message']) {
            echo "  ❌ {$weekStartInfo['message']}\n";
        }
    } else {
        echo "  ⚠️  Статус: Неизвестно\n";
    }
    
    // Проверка наличия слепка
    $lastMonday = strtotime('last monday');
    if ($lastMonday > time()) {
        $lastMonday = strtotime('last monday', strtotime('-1 week'));
    }
    $date = date('Y-m-d', $lastMonday);
    
    if (checkSnapshotExists($date, 'week-start')) {
        echo "  ✅ Создан слепок: week-start-$date.json\n";
    } else {
        echo "  ⚠️  Слепок не найден для даты: $date\n";
    }
} else {
    echo "  ⚠️  Записи в логе не найдены\n";
    if (!file_exists($weekStartLog)) {
        echo "  ⚠️  Лог-файл не существует: $weekStartLog\n";
    }
}

echo "\n";

// Проверка слепка конца недели
echo "Слепок конца недели:\n";
$weekEndInfo = getLastRun($weekEndLog);
if ($weekEndInfo['timestamp']) {
    echo "  ✅ Последний запуск: {$weekEndInfo['timestamp']}\n";
    
    if ($weekEndInfo['status'] === 'SUCCESS') {
        echo "  ✅ Статус: Успешно\n";
        if ($weekEndInfo['message']) {
            echo "  ✅ {$weekEndInfo['message']}\n";
        }
    } elseif ($weekEndInfo['status'] === 'ERROR') {
        echo "  ❌ Статус: Ошибка\n";
        if ($weekEndInfo['message']) {
            echo "  ❌ {$weekEndInfo['message']}\n";
        }
    } else {
        echo "  ⚠️  Статус: Неизвестно\n";
    }
    
    // Проверка наличия слепка
    $lastSunday = strtotime('last sunday');
    if ($lastSunday > time()) {
        $lastSunday = strtotime('last sunday', strtotime('-1 week'));
    }
    $date = date('Y-m-d', $lastSunday);
    
    if (checkSnapshotExists($date, 'week-end')) {
        echo "  ✅ Создан слепок: week-end-$date.json\n";
    } else {
        echo "  ⚠️  Слепок не найден для даты: $date\n";
    }
} else {
    echo "  ⚠️  Записи в логе не найдены\n";
    if (!file_exists($weekEndLog)) {
        echo "  ⚠️  Лог-файл не существует: $weekEndLog\n";
    }
}

echo "\n";

// Предупреждения
echo "Предупреждения:\n";
$warnings = [];

// Проверка, что слепки создаются регулярно
$lastMonday = strtotime('last monday');
if ($lastMonday > time()) {
    $lastMonday = strtotime('last monday', strtotime('-1 week'));
}
$daysSinceLastMonday = (time() - $lastMonday) / 86400;

if ($daysSinceLastMonday > 7 && !checkSnapshotExists(date('Y-m-d', $lastMonday), 'week-start')) {
    $warnings[] = "⚠️  Слепок начала недели не создан за последние 7 дней";
}

$lastSunday = strtotime('last sunday');
if ($lastSunday > time()) {
    $lastSunday = strtotime('last sunday', strtotime('-1 week'));
}
$daysSinceLastSunday = (time() - $lastSunday) / 86400;

if ($daysSinceLastSunday > 7 && !checkSnapshotExists(date('Y-m-d', $lastSunday), 'week-end')) {
    $warnings[] = "⚠️  Слепок конца недели не создан за последние 7 дней";
}

// Проверка наличия лог-файлов
if (!file_exists($weekStartLog) && !file_exists($weekEndLog)) {
    $warnings[] = "⚠️  Лог-файлы не найдены. Проверьте, что cron настроен и скрипты запускаются.";
}

if (empty($warnings)) {
    echo "  ✅ Проблем не обнаружено\n";
} else {
    foreach ($warnings as $warning) {
        echo "  $warning\n";
    }
}

echo "\n";

