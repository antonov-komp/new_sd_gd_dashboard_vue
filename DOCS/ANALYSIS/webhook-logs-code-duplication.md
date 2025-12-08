# Детальный список дублирования кода в модуле логирования вебхуков

**Дата создания:** 2025-12-07

---

## 🔍 Дублирующиеся паттерны

### 1. Чтение JSON файлов

**Паттерн:**
```php
$logs = json_decode(file_get_contents($logFile), true) ?? [];
```

**Найдено в:**

#### `webhook-handler.php:118`
```php
if (file_exists($logFile)) {
    $logs = json_decode(file_get_contents($logFile), true) ?? [];
}
```

#### `webhook-handler.php:209`
```php
if (file_exists($errorFile)) {
    $errors = json_decode(file_get_contents($errorFile), true) ?? [];
}
```

#### `webhook-logs.php:77`
```php
$fileLogs = json_decode(file_get_contents($logFile), true) ?? [];
$logs = array_merge($logs, $fileLogs);
```

#### `webhook-logs.php:86`
```php
foreach ($files as $logFile) {
    $fileLogs = json_decode(file_get_contents($logFile), true) ?? [];
    $logs = array_merge($logs, $fileLogs);
}
```

#### `webhook-realtime.php:65`
```php
$content = file_get_contents($logFile);
$logs = json_decode($content, true);
```

**Критичность:** Высокая  
**Количество дублирований:** 5  
**Рекомендация:** Вынести в `WebhookLogsRepository::readLogFile($filePath)`

---

### 2. Определение пути к логам

**Паттерн:**
```php
$logDir = __DIR__ . '/../logs/webhooks/' . $category . '/';
```

**Найдено в:**

#### `webhook-handler.php:100`
```php
$logDir = __DIR__ . '/../logs/webhooks/' . $category . '/';
```

#### `webhook-handler.php:185`
```php
$errorDir = __DIR__ . '/../logs/webhooks/errors/';
```

#### `webhook-logs.php:54`
```php
$logDir = __DIR__ . '/../logs/webhooks/';
```

#### `webhook-logs.php:103`
```php
$catDir = __DIR__ . '/../logs/webhooks/' . $cat . '/';
```

#### `webhook-realtime.php:46`
```php
$logsDir = __DIR__ . '/../logs/webhooks';
```

**Критичность:** Высокая  
**Количество дублирований:** 5  
**Рекомендация:** Вынести в `WebhookLogsConfig::getLogsPath($category = null)`

---

### 3. Формирование имени файла

**Паттерн 1:**
```php
$logFile = $logDir . date('Y-m-d-H') . '.json';
```

**Паттерн 2:**
```php
$logFile = $dir . $date . '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) . '.json';
```

**Паттерн 3:**
```php
$logFile = "{$logsDir}/{$category}/{$date}-{$hour}.json";
```

**Найдено в:**

#### `webhook-handler.php:101`
```php
$logFile = $logDir . date('Y-m-d-H') . '.json';
```

#### `webhook-handler.php:186`
```php
$errorFile = $errorDir . date('Y-m-d-H') . '.json';
```

#### `webhook-logs.php:75`
```php
$logFile = $dir . $date . '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) . '.json';
```

#### `webhook-realtime.php:58`
```php
$logFile = "{$logsDir}/{$category}/{$date}-{$hour}.json";
```

**Критичность:** Средняя  
**Количество дублирований:** 4  
**Рекомендация:** Вынести в `WebhookLogsRepository::getLogFileName($date, $hour)`

---

### 4. Создание директорий

**Паттерн:**
```php
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
```

**Найдено в:**

#### `webhook-handler.php:103-105`
```php
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}
```

#### `webhook-handler.php:188-190`
```php
if (!is_dir($errorDir)) {
    mkdir($errorDir, 0755, true);
}
```

**Критичность:** Средняя  
**Количество дублирований:** 2  
**Рекомендация:** Вынести в `WebhookLogsRepository::ensureDirectoryExists($path)`

---

### 5. Запись JSON файлов

**Паттерн:**
```php
file_put_contents(
    $logFile,
    json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
    LOCK_EX
);
```

**Найдено в:**

#### `webhook-handler.php:123-127`
```php
file_put_contents(
    $logFile,
    json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
    LOCK_EX
);
```

#### `webhook-handler.php:214-218`
```php
file_put_contents(
    $errorFile,
    json_encode($errors, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
    LOCK_EX
);
```

**Критичность:** Высокая  
**Количество дублирований:** 2  
**Рекомендация:** Вынести в `WebhookLogsRepository::writeLogFile($filePath, $data)`

---

### 6. Сортировка логов по timestamp

**Паттерн:**
```php
usort($logs, function($a, $b) {
    $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
    $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
    return $timeB - $timeA; // или $timeA - $timeB
});
```

**Найдено в:**

#### `webhook-logs.php:123-127`
```php
usort($allLogs, function($a, $b) {
    $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
    $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
    return $timeB - $timeA; // новые сначала
});
```

#### `webhook-realtime.php:80-84`
```php
usort($newLogs, function($a, $b) {
    $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
    $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
    return $timeA - $timeB; // старые сначала
});
```

**Критичность:** Низкая  
**Количество дублирований:** 2  
**Рекомендация:** Вынести в `WebhookLogsRepository::sortLogsByTimestamp($logs, $order = 'desc')`

---

## 📊 Статистика дублирования

| Паттерн | Количество | Критичность | Приоритет устранения |
|---------|-----------|-------------|---------------------|
| Чтение JSON файлов | 5 | Высокая | Критично |
| Определение пути к логам | 5 | Высокая | Критично |
| Формирование имени файла | 4 | Средняя | Важно |
| Запись JSON файлов | 2 | Высокая | Критично |
| Создание директорий | 2 | Средняя | Важно |
| Сортировка по timestamp | 2 | Низкая | Желательно |

**Итого:** 20 дублирований паттернов

---

## 💡 Рекомендации по устранению

1. **Создать `WebhookLogsRepository`** (TASK-018-03)
   - Метод `readLogFile($filePath)`
   - Метод `writeLogFile($filePath, $data)`
   - Метод `getLogFileName($date, $hour)`
   - Метод `ensureDirectoryExists($path)`

2. **Создать `WebhookLogsConfig`** (TASK-018-02)
   - Метод `getLogsPath($category = null)`
   - Метод `getLogsBasePath()`

3. **Создать утилиты** (TASK-018-03)
   - Функция `sortLogsByTimestamp($logs, $order = 'desc')`

---

## 📝 История правок

- **2025-12-07:** Создан детальный список дублирования кода



