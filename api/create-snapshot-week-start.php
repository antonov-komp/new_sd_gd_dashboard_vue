<?php
/**
 * Скрипт для автоматического создания слепка начала недели
 * 
 * Запускается через cron каждый понедельник в 00:00
 * 
 * Использование:
 *   php api/create-snapshot-week-start.php
 *   php api/create-snapshot-week-start.php --date=2025-12-08
 *   php api/create-snapshot-week-start.php --force
 *   php api/create-snapshot-week-start.php --no-cache
 * 
 * Расположение: api/create-snapshot-week-start.php
 */

require_once(__DIR__ . '/snapshot-helpers.php');

// Настройка обработки ошибок
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Путь к лог-файлу
$logFile = __DIR__ . '/../logs/snapshots/week-start-' . date('Y-m') . '.log';

/**
 * Логирование сообщений
 */
function logMessage($message, $level = 'INFO') {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logDir = dirname($logFile);
    
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }
    
    $logEntry = "[$timestamp] [$level] $message" . PHP_EOL;
    file_put_contents($logFile, $logEntry, FILE_APPEND);
    echo $logEntry; // Вывод в консоль при ручном запуске
}

/**
 * Получение параметров командной строки
 */
function getCliOptions() {
    $options = [
        'date' => null,
        'force' => false,
        'no-cache' => false
    ];
    
    $args = $GLOBALS['argv'] ?? [];
    for ($i = 1; $i < count($args); $i++) {
        if (strpos($args[$i], '--date=') === 0) {
            $options['date'] = substr($args[$i], 7);
        } elseif ($args[$i] === '--date' && isset($args[$i + 1])) {
            $options['date'] = $args[$i + 1];
            $i++;
        } elseif ($args[$i] === '--force') {
            $options['force'] = true;
        } elseif ($args[$i] === '--no-cache') {
            $options['no-cache'] = true;
        }
    }
    
    return $options;
}

/**
 * Проверка, что дата является понедельником
 */
function isMonday($date) {
    $dayOfWeek = date('N', strtotime($date));
    return $dayOfWeek === '1'; // 1 = понедельник
}

// Основная логика
try {
    logMessage('Начало создания слепка начала недели');
    
    // Получение параметров
    $options = getCliOptions();
    
    // Определение даты
    $date = $options['date'] ?: date('Y-m-d');
    
    // Проверка формата даты
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception("Неверный формат даты: $date. Используйте формат YYYY-MM-DD");
    }
    
    // Проверка, что это понедельник (если не указан --force)
    if (!$options['force'] && !isMonday($date)) {
        $dayOfWeek = date('l', strtotime($date));
        logMessage("Пропуск: дата $date не является понедельником ($dayOfWeek). Используйте --force для принудительного создания.", 'WARNING');
        exit(0);
    }
    
    logMessage("Создание слепка для даты: $date");
    
    // Получение данных сектора
    logMessage('Загрузка данных сектора...');
    $sectorData = getSectorDataFromApi(!$options['no-cache']);
    logMessage('Данные сектора загружены успешно');
    
    // Нормализация данных
    logMessage('Нормализация данных сектора...');
    $normalizedData = normalizeSectorDataForSnapshot($sectorData);
    logMessage('Данные нормализованы успешно');
    
    // Создание слепка
    logMessage('Создание слепка...');
    $result = createSnapshotViaApi($normalizedData, 'week_start', $date);
    logMessage("Слепок успешно создан: " . ($result['path'] ?? 'unknown'), 'SUCCESS');
    
    exit(0);
    
} catch (Exception $e) {
    logMessage("Ошибка: {$e->getMessage()}", 'ERROR');
    logMessage("Stack trace: {$e->getTraceAsString()}", 'ERROR');
    exit(1);
}

