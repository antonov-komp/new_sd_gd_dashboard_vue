<?php
/**
 * Endpoint для Server-Sent Events (SSE)
 * Отправляет новые логи вебхуков в реальном времени
 */

// Настройка времени выполнения (для долгих соединений)
set_time_limit(0);
ignore_user_abort(false);

// Заголовки для SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Отключение буферизации в Nginx

// Отключение буферизации вывода
if (ob_get_level()) {
  ob_end_clean();
}

// Отключение сжатия для SSE
if (function_exists('apache_setenv')) {
  apache_setenv('no-gzip', 1);
}
ini_set('zlib.output_compression', 0);

// Функция для отправки события
function sendEvent($event, $data) {
  $json = json_encode($data, JSON_UNESCAPED_UNICODE);
  echo "event: {$event}\n";
  echo "data: {$json}\n\n";
  ob_flush();
  flush();
}

// Функция для отправки комментария (keep-alive)
function sendComment($comment) {
  echo ": {$comment}\n\n";
  ob_flush();
  flush();
}

// Функция для проверки новых логов
function checkForNewLogs($lastTimestamp = null) {
  $logsDir = __DIR__ . '/../logs/webhooks';
  $newLogs = [];
  
  // Получение текущей даты и часа
  $now = new DateTime('now', new DateTimeZone('Europe/Minsk'));
  $date = $now->format('Y-m-d');
  $hour = $now->format('H');
  
  // Категории для проверки
  $categories = ['tasks', 'smart-processes', 'errors'];
  
  foreach ($categories as $category) {
    $logFile = "{$logsDir}/{$category}/{$date}-{$hour}.json";
    
    if (!file_exists($logFile)) {
      continue;
    }
    
    $content = file_get_contents($logFile);
    $logs = json_decode($content, true);
    
    if (!is_array($logs)) {
      continue;
    }
    
    foreach ($logs as $log) {
      // Проверка, что лог новее последнего известного
      if ($lastTimestamp === null || (isset($log['timestamp']) && $log['timestamp'] > $lastTimestamp)) {
        $newLogs[] = $log;
      }
    }
  }
  
  // Сортировка по timestamp
  usort($newLogs, function($a, $b) {
    $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
    $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
    return $timeA - $timeB;
  });
  
  return $newLogs;
}

// Получение последнего timestamp из запроса
$lastTimestamp = isset($_GET['last_timestamp']) 
  ? $_GET['last_timestamp'] 
  : null;

// Отправка начального события
sendEvent('connected', [
  'message' => 'Connected to realtime stream',
  'timestamp' => date('c')
]);

// Основной цикл
$checkInterval = 2; // Проверка каждые 2 секунды
$keepAliveInterval = 30; // Keep-alive каждые 30 секунд
$lastKeepAlive = time();
$startTime = time();

try {
  while (true) {
    // Проверка разрыва соединения
    if (connection_aborted()) {
      break;
    }
    
    // Проверка новых логов
    $newLogs = checkForNewLogs($lastTimestamp);
    
    if (!empty($newLogs)) {
      // Обновление последнего timestamp
      $lastLog = end($newLogs);
      if (isset($lastLog['timestamp'])) {
        $lastTimestamp = $lastLog['timestamp'];
      }
      
      // Отправка новых логов
      sendEvent('new_logs', [
        'logs' => $newLogs,
        'count' => count($newLogs),
        'timestamp' => date('c')
      ]);
    }
    
    // Keep-alive для поддержания соединения
    if (time() - $lastKeepAlive >= $keepAliveInterval) {
      sendComment('keep-alive');
      $lastKeepAlive = time();
    }
    
    // Пауза перед следующей проверкой
    sleep($checkInterval);
    
    // Проверка таймаута (максимум 5 минут)
    if (time() - $startTime > 300) {
      sendEvent('timeout', [
        'message' => 'Connection timeout, please reconnect'
      ]);
      break;
    }
  }
} catch (Exception $e) {
  sendEvent('error', [
    'message' => 'Server error: ' . $e->getMessage(),
    'timestamp' => date('c')
  ]);
}

// Закрытие соединения
sendEvent('closed', [
  'message' => 'Connection closed',
  'timestamp' => date('c')
]);

