<?php
/**
 * API endpoint для работы со слепками состояния сектора
 * 
 * Поддерживает операции:
 * - POST: создание слепка (action=create)
 * - GET: получение конкретного слепка (action=get&date=...&type=...)
 * - GET: получение списка слепков (action=list&startDate=...&endDate=...)
 * 
 * Расположение: api/snapshots.php
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once(__DIR__ . '/snapshot-helpers.php');

/**
 * Получение пути к директории слепков
 * 
 * @param string $sectorId ID сектора (по умолчанию '1C')
 * @return string Путь к директории
 */
function getSnapshotsDirectory($sectorId = '1C') {
    $baseDir = __DIR__ . '/../snapshots';
    $sectorDir = $baseDir . '/sector-' . strtolower($sectorId);
    
    if (!is_dir($sectorDir)) {
        mkdir($sectorDir, 0755, true);
    }
    
    return $sectorDir;
}

/**
 * Получение пути к файлу слепка
 * 
 * @param string $date Дата в формате YYYY-MM-DD
 * @param string $type Тип слепка (week_start, week_end, manual, current)
 * @param string $sectorId ID сектора
 * @return string Путь к файлу
 */
function getSnapshotFilePath($date, $type, $sectorId = '1C') {
    $year = substr($date, 0, 4);
    $weekNumber = date('W', strtotime($date));
    
    $snapshotsDir = getSnapshotsDirectory($sectorId);
    $yearDir = $snapshotsDir . '/' . $year;
    $weekDir = $yearDir . '/week-' . $weekNumber;
    
    if (!is_dir($weekDir)) {
        mkdir($weekDir, 0755, true);
    }
    
    $filename = $type . '-' . $date . '.json';
    return $weekDir . '/' . $filename;
}

/**
 * Сохранение слепка в файл
 * 
 * @param array $snapshot Данные слепка
 * @param string $date Дата
 * @param string $type Тип слепка
 * @param string $sectorId ID сектора
 * @return array Результат сохранения
 */
function saveSnapshot($snapshot, $date, $type, $sectorId = '1C') {
    $filePath = getSnapshotFilePath($date, $type, $sectorId);
    
    $json = json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        throw new Exception('Ошибка кодирования JSON: ' . json_last_error_msg());
    }
    
    if (file_put_contents($filePath, $json) === false) {
        throw new Exception('Ошибка записи файла: ' . $filePath);
    }
    
    return [
        'path' => str_replace(__DIR__ . '/../', '', $filePath),
        'filePath' => $filePath
    ];
}

/**
 * Загрузка слепка из файла
 * 
 * @param string $date Дата
 * @param string $type Тип слепка
 * @param string $sectorId ID сектора
 * @return array|null Данные слепка или null
 */
function loadSnapshot($date, $type, $sectorId = '1C') {
    $filePath = getSnapshotFilePath($date, $type, $sectorId);
    
    if (!file_exists($filePath)) {
        return null;
    }
    
    $json = file_get_contents($filePath);
    if ($json === false) {
        throw new Exception('Ошибка чтения файла: ' . $filePath);
    }
    
    $snapshot = json_decode($json, true);
    if ($snapshot === null) {
        throw new Exception('Ошибка декодирования JSON: ' . json_last_error_msg());
    }
    
    return $snapshot;
}

/**
 * Получение списка слепков
 * 
 * @param string|null $startDate Дата начала (YYYY-MM-DD)
 * @param string|null $endDate Дата конца (YYYY-MM-DD)
 * @param string|null $type Тип слепка (опционально)
 * @param string $sectorId ID сектора
 * @return array Список путей к файлам слепков
 */
function listSnapshots($startDate = null, $endDate = null, $type = null, $sectorId = '1C') {
    $snapshotsDir = getSnapshotsDirectory($sectorId);
    $snapshots = [];
    
    if (!is_dir($snapshotsDir)) {
        return [];
    }
    
    // Рекурсивный поиск всех JSON файлов
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($snapshotsDir, RecursiveDirectoryIterator::SKIP_DOTS)
    );
    
    foreach ($iterator as $file) {
        if ($file->isFile() && $file->getExtension() === 'json') {
            $filePath = $file->getPathname();
            $filename = $file->getFilename();
            
            // Парсинг имени файла: type-YYYY-MM-DD.json
            if (preg_match('/^(.+)-(\d{4}-\d{2}-\d{2})\.json$/', $filename, $matches)) {
                $fileType = $matches[1];
                $fileDate = $matches[2];
                
                // Фильтрация по типу
                if ($type !== null && $fileType !== $type) {
                    continue;
                }
                
                // Фильтрация по дате
                if ($startDate !== null && $fileDate < $startDate) {
                    continue;
                }
                if ($endDate !== null && $fileDate > $endDate) {
                    continue;
                }
                
                $snapshots[] = [
                    'date' => $fileDate,
                    'type' => $fileType,
                    'path' => str_replace(__DIR__ . '/../', '', $filePath),
                    'filePath' => $filePath
                ];
            }
        }
    }
    
    // Сортировка по дате
    usort($snapshots, function($a, $b) {
        return strcmp($a['date'], $b['date']);
    });
    
    return $snapshots;
}

// Основная логика обработки запросов
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $action = $_GET['action'] ?? null;
    
    // Для POST запросов получаем action из тела запроса
    if ($method === 'POST') {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if ($data === null) {
            throw new Exception('Ошибка декодирования JSON запроса');
        }
        
        $action = $data['action'] ?? null;
    }
    
    // Обработка действий
    switch ($action) {
        case 'create':
            if ($method !== 'POST') {
                throw new Exception('Метод POST требуется для создания слепка');
            }
            
            $snapshot = $data['snapshot'] ?? null;
            $type = $data['type'] ?? null;
            $date = $data['date'] ?? date('Y-m-d');
            $sectorId = $snapshot['metadata']['sectorId'] ?? '1C';
            
            if (!$snapshot) {
                throw new Exception('Данные слепка не указаны');
            }
            if (!$type) {
                throw new Exception('Тип слепка не указан');
            }
            
            // Валидация даты
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Неверный формат даты. Используйте YYYY-MM-DD');
            }
            
            // Сохранение слепка
            $result = saveSnapshot($snapshot, $date, $type, $sectorId);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'snapshot' => $snapshot,
                    'path' => $result['path']
                ]
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        case 'get':
            if ($method !== 'GET') {
                throw new Exception('Метод GET требуется для получения слепка');
            }
            
            $date = $_GET['date'] ?? null;
            $type = $_GET['type'] ?? null;
            $sectorId = $_GET['sectorId'] ?? '1C';
            
            if (!$date || !$type) {
                throw new Exception('Параметры date и type обязательны');
            }
            
            // Валидация даты
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
                throw new Exception('Неверный формат даты. Используйте YYYY-MM-DD');
            }
            
            // Загрузка слепка
            $snapshot = loadSnapshot($date, $type, $sectorId);
            
            if ($snapshot === null) {
                echo json_encode([
                    'success' => false,
                    'message' => 'Слепок не найден'
                ], JSON_UNESCAPED_UNICODE);
            } else {
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'snapshot' => $snapshot
                    ]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;
            
        case 'list':
            if ($method !== 'GET') {
                throw new Exception('Метод GET требуется для получения списка слепков');
            }
            
            $startDate = $_GET['startDate'] ?? null;
            $endDate = $_GET['endDate'] ?? null;
            $type = $_GET['type'] ?? null;
            $sectorId = $_GET['sectorId'] ?? '1C';
            
            // Валидация дат
            if ($startDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
                throw new Exception('Неверный формат startDate. Используйте YYYY-MM-DD');
            }
            if ($endDate && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
                throw new Exception('Неверный формат endDate. Используйте YYYY-MM-DD');
            }
            
            // Получение списка
            $snapshots = listSnapshots($startDate, $endDate, $type, $sectorId);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'snapshots' => $snapshots
                ]
            ], JSON_UNESCAPED_UNICODE);
            break;
            
        default:
            throw new Exception('Неизвестное действие. Используйте: create, get или list');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

