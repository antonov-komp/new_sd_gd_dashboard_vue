# TASK-069: Этап 2 — Создание базовой структуры модуля и конфигурации

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Создать базовую структуру папок модуля, класс конфигурации и точку входа `bootstrap.php`.

---

## 🔍 Задачи этапа

### 1. Создание структуры папок

Создать следующую структуру директорий:

```
api/
└── tickets-time-tracking-sector-1c/
    ├── bootstrap.php
    ├── controller/
    ├── service/
    ├── bitrix/
    ├── repository/
    ├── domain/
    ├── config/
    └── util/
```

**Команды для создания:**
```bash
mkdir -p api/tickets-time-tracking-sector-1c/{controller,service,bitrix,repository,domain,config,util}
```

### 2. Создание класса конфигурации

#### 2.1. Файл: `api/tickets-time-tracking-sector-1c/config/TimeTrackingConfig.php`

**Структура класса:**
```php
<?php

namespace TimeTracking\Config;

/**
 * Конфигурация модуля учёта времени
 * 
 * Содержит все константы и параметры конфигурации модуля
 */
class TimeTrackingConfig
{
    // Константы сектора 1С
    public const SECTOR_1C_DEPARTMENT_ID = 366;
    public const ENTITY_TYPE_ID = 140; // Сервис деск 140
    public const SECTOR_1C_TAG = '1C';
    
    // Параметры пагинации
    public const DEFAULT_PAGE_SIZE = 50;
    public const DEFAULT_BATCH_SIZE = 50;
    public const DEFAULT_TASKS_PER_PAGE = 10;
    public const MAX_TASKS_PER_PAGE = 100;
    
    // Параметры недель
    public const WEEKS_COUNT = 4; // Количество недель для анализа
    
    // Параметры времени
    public const TIMEZONE_UTC = 'UTC';
    
    /**
     * Получить ID отдела сектора 1С
     * 
     * @return int
     */
    public static function getSector1CDepartmentId(): int
    {
        return self::SECTOR_1C_DEPARTMENT_ID;
    }
    
    /**
     * Получить ID типа сущности (сервис деск)
     * 
     * @return int
     */
    public static function getEntityTypeId(): int
    {
        return self::ENTITY_TYPE_ID;
    }
    
    /**
     * Получить тег сектора 1С
     * 
     * @return string
     */
    public static function getSector1CTag(): string
    {
        return self::SECTOR_1C_TAG;
    }
    
    /**
     * Получить размер страницы по умолчанию
     * 
     * @return int
     */
    public static function getDefaultPageSize(): int
    {
        return self::DEFAULT_PAGE_SIZE;
    }
    
    /**
     * Получить размер батча по умолчанию
     * 
     * @return int
     */
    public static function getDefaultBatchSize(): int
    {
        return self::DEFAULT_BATCH_SIZE;
    }
    
    /**
     * Получить количество задач на страницу по умолчанию
     * 
     * @return int
     */
    public static function getDefaultTasksPerPage(): int
    {
        return self::DEFAULT_TASKS_PER_PAGE;
    }
    
    /**
     * Получить максимальное количество задач на страницу
     * 
     * @return int
     */
    public static function getMaxTasksPerPage(): int
    {
        return self::MAX_TASKS_PER_PAGE;
    }
    
    /**
     * Получить количество недель для анализа
     * 
     * @return int
     */
    public static function getWeeksCount(): int
    {
        return self::WEEKS_COUNT;
    }
    
    /**
     * Получить часовой пояс (UTC)
     * 
     * @return string
     */
    public static function getTimezone(): string
    {
        return self::TIMEZONE_UTC;
    }
}
```

### 3. Создание точки входа bootstrap.php

#### 3.1. Файл: `api/tickets-time-tracking-sector-1c/bootstrap.php`

**Базовая структура:**
```php
<?php
/**
 * Bootstrap для модуля учёта времени сектора 1С
 * 
 * Точка входа для нового модульного кода
 * 
 * @package TimeTracking
 */

// Подключение зависимостей
require_once __DIR__ . '/../crest.php';

// Установка заголовков
header('Content-Type: application/json; charset=utf-8');

// TODO: На этапе 2 bootstrap.php будет пустым
// Реализация будет добавлена на этапе 9

// Временная заглушка для проверки структуры
http_response_code(501);
echo json_encode([
    'error' => 'not_implemented',
    'error_description' => 'Module is under refactoring. Use legacy endpoint.',
    'message' => 'This endpoint will be available after stage 9'
], JSON_UNESCAPED_UNICODE);
```

### 4. Настройка автозагрузки классов (опционально)

Если в проекте используется автозагрузка классов (Composer или кастомная), добавить namespace для модуля.

**Пример для Composer:**
```json
{
    "autoload": {
        "psr-4": {
            "TimeTracking\\": "api/tickets-time-tracking-sector-1c/"
        }
    }
}
```

**Или создать простой автозагрузчик:**
```php
<?php
// api/tickets-time-tracking-sector-1c/autoload.php

spl_autoload_register(function ($class) {
    $prefix = 'TimeTracking\\';
    $baseDir = __DIR__ . '/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});
```

### 5. Создание базовых файлов-заглушек

Создать пустые файлы для будущих классов (чтобы структура была видна):

**Файлы-заглушки:**
- `api/tickets-time-tracking-sector-1c/controller/.gitkeep`
- `api/tickets-time-tracking-sector-1c/service/.gitkeep`
- `api/tickets-time-tracking-sector-1c/bitrix/.gitkeep`
- `api/tickets-time-tracking-sector-1c/repository/.gitkeep`
- `api/tickets-time-tracking-sector-1c/domain/.gitkeep`
- `api/tickets-time-tracking-sector-1c/util/.gitkeep`

Или создать README в каждой папке:
```markdown
# Controller Layer

Контроллеры для обработки HTTP-запросов.

Будет реализовано на этапе 8.
```

---

## 📝 Структура файлов после этапа 2

```
api/
└── tickets-time-tracking-sector-1c/
    ├── bootstrap.php                    # Точка входа (заглушка)
    ├── config/
    │   └── TimeTrackingConfig.php       # ✅ Реализовано
    ├── controller/                      # Пусто (этап 8)
    ├── service/                         # Пусто (этап 7)
    ├── bitrix/                          # Пусто (этап 4)
    ├── repository/                      # Пусто (этап 5)
    ├── domain/                          # Пусто (этап 6)
    └── util/                            # Пусто (этап 3)
```

---

## ✅ Критерии приёмки этапа

- [ ] Структура папок создана
- [ ] Класс `TimeTrackingConfig` создан и содержит все константы
- [ ] Все методы `TimeTrackingConfig` реализованы
- [ ] Файл `bootstrap.php` создан (пока как заглушка)
- [ ] Автозагрузка классов настроена (если используется)
- [ ] Структура проверена и соответствует плану
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Проверка структуры

```bash
# Проверка существования папок
ls -la api/tickets-time-tracking-sector-1c/
ls -la api/tickets-time-tracking-sector-1c/config/

# Проверка синтаксиса PHP
php -l api/tickets-time-tracking-sector-1c/config/TimeTrackingConfig.php
php -l api/tickets-time-tracking-sector-1c/bootstrap.php
```

### Проверка конфигурации

Создать простой тестовый скрипт:
```php
<?php
// test-config.php

require_once 'api/tickets-time-tracking-sector-1c/config/TimeTrackingConfig.php';

use TimeTracking\Config\TimeTrackingConfig;

// Проверка констант
assert(TimeTrackingConfig::getSector1CDepartmentId() === 366);
assert(TimeTrackingConfig::getEntityTypeId() === 140);
assert(TimeTrackingConfig::getSector1CTag() === '1C');
assert(TimeTrackingConfig::getDefaultPageSize() === 50);

echo "All config tests passed!\n";
```

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-01-analysis.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-03-utils.md`

---

## ⏱️ Оценка времени

**1-2 часа**

- Создание структуры папок: 5 минут
- Создание класса конфигурации: 30 минут
- Создание bootstrap.php: 15 минут
- Настройка автозагрузки: 15 минут
- Тестирование и проверка: 15 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 2


