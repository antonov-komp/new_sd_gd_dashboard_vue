# TASK-018-02: Создание структуры модуля и конфигурации

**Дата создания:** 2025-12-07 14:23 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Рефактор-менеджер + Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Создать модульную структуру для модуля логирования вебхуков, реализовать централизованную конфигурацию, создать базовые классы исключений и настроить автозагрузку классов.

**Цель этапа:**
- Создать структуру папок `src/WebhookLogs/` с разделением по ответственности
- Реализовать класс `WebhookLogsConfig` для централизованного управления настройками
- Вынести все хардкод-настройки (пути, форматы, лимиты) в конфигурацию
- Создать базовые классы исключений для единообразной обработки ошибок
- Настроить автозагрузку классов (простой autoloader, так как нет composer.json)

---

## 🎯 Контекст

Это второй этап рефакторинга модуля логирования вебхуков (TASK-018). На основе результатов аудита (TASK-018-01) создаётся новая модульная структура, которая станет основой для всех последующих этапов рефакторинга.

**Текущее состояние:**
- Все функции глобальные в файлах `api/*.php`
- Настройки захардкожены в коде
- Нет структуры модуля
- Нет автозагрузки классов

**Целевое состояние:**
- Модульная структура с разделением по папкам
- Централизованная конфигурация
- Базовые классы исключений
- Автозагрузка классов

**Связи:**
- Зависит от: TASK-018-01 (результаты аудита)
- Зависит от него: TASK-018-03 (Repository будет использовать Config)

---

## 📁 Модули и компоненты

### Структура для создания:

```
src/
└── WebhookLogs/
    ├── Config/
    │   └── WebhookLogsConfig.php        # Конфигурация модуля
    ├── Exception/
    │   ├── WebhookException.php         # Базовый класс исключений
    │   ├── WebhookValidationException.php
    │   └── WebhookLoggingException.php
    └── Autoloader.php                  # Простой autoloader (опционально)
```

### Файлы для изменения:

- `api/webhook-handler.php` — добавить require для autoloader (пока не использовать классы)
- `api/webhook-logs.php` — добавить require для autoloader (пока не использовать классы)
- `api/webhook-realtime.php` — добавить require для autoloader (пока не использовать классы)

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание структуры папок

**1.1. Создать базовую структуру:**

```bash
# Создать корневую папку модуля
mkdir -p src/WebhookLogs/Config
mkdir -p src/WebhookLogs/Exception
mkdir -p src/WebhookLogs/Service
mkdir -p src/WebhookLogs/Repository
mkdir -p src/WebhookLogs/Entity
mkdir -p src/WebhookLogs/Utils

# Проверить создание
tree src/WebhookLogs/ -d
```

**Результат:**
```
src/WebhookLogs/
├── Config/
├── Exception/
├── Service/
├── Repository/
├── Entity/
└── Utils/
```

**1.2. Создать файлы-заглушки:**

```bash
# Создать .gitkeep файлы для пустых папок (которые будут использоваться позже)
touch src/WebhookLogs/Service/.gitkeep
touch src/WebhookLogs/Repository/.gitkeep
touch src/WebhookLogs/Entity/.gitkeep
touch src/WebhookLogs/Utils/.gitkeep
```

**Результат шага 1:**
- Структура папок создана
- Все необходимые директории существуют

---

### Шаг 2: Реализация класса WebhookLogsConfig

**2.1. Создать файл `src/WebhookLogs/Config/WebhookLogsConfig.php`:**

**Анализ текущих настроек для вынесения:**

Из `webhook-handler.php`:
- Путь к логам: `__DIR__ . '/../logs/webhooks/'`
- Формат файла: `date('Y-m-d-H') . '.json'`
- Права на директории: `0755`
- Категории: `tasks`, `smart-processes`, `errors`

Из `webhook-logs.php`:
- Лимит пагинации по умолчанию: `50`
- Максимальный лимит: `1000`
- Минимальный лимит: `1`

Из `webhook-realtime.php`:
- Интервал проверки: `2` секунды
- Интервал keep-alive: `30` секунд
- Таймаут соединения: `300` секунд (5 минут)

**2.2. Реализовать класс конфигурации:**

```php
<?php
/**
 * Конфигурация модуля логирования вебхуков
 * 
 * Расположение: src/WebhookLogs/Config/WebhookLogsConfig.php
 * 
 * Централизованное хранение всех настроек модуля
 */
namespace WebhookLogs\Config;

class WebhookLogsConfig
{
    /**
     * Базовый путь к логам вебхуков
     * 
     * @var string
     */
    private static $baseLogsPath = null;
    
    /**
     * Получить базовый путь к логам
     * 
     * @return string Путь к папке logs/webhooks/
     */
    public static function getBaseLogsPath(): string
    {
        if (self::$baseLogsPath === null) {
            // Определяем путь относительно api/ директории
            self::$baseLogsPath = __DIR__ . '/../../logs/webhooks/';
        }
        
        return self::$baseLogsPath;
    }
    
    /**
     * Получить путь к логам категории
     * 
     * @param string $category Категория (tasks, smart-processes, errors)
     * @return string Полный путь к папке категории
     */
    public static function getCategoryPath(string $category): string
    {
        return self::getBaseLogsPath() . $category . '/';
    }
    
    /**
     * Получить формат имени файла лога
     * 
     * @return string Формат (например, 'Y-m-d-H')
     */
    public static function getLogFileDateFormat(): string
    {
        return 'Y-m-d-H';
    }
    
    /**
     * Получить расширение файла лога
     * 
     * @return string Расширение (например, '.json')
     */
    public static function getLogFileExtension(): string
    {
        return '.json';
    }
    
    /**
     * Получить права доступа для директорий
     * 
     * @return int Права доступа (например, 0755)
     */
    public static function getDirectoryPermissions(): int
    {
        return 0755;
    }
    
    /**
     * Получить список поддерживаемых категорий
     * 
     * @return array Массив категорий
     */
    public static function getCategories(): array
    {
        return ['tasks', 'smart-processes', 'errors'];
    }
    
    /**
     * Проверить, является ли категория валидной
     * 
     * @param string $category Категория для проверки
     * @return bool true если валидна
     */
    public static function isValidCategory(string $category): bool
    {
        return in_array($category, self::getCategories(), true);
    }
    
    /**
     * Получить лимит пагинации по умолчанию
     * 
     * @return int Количество записей на странице
     */
    public static function getDefaultPaginationLimit(): int
    {
        return 50;
    }
    
    /**
     * Получить минимальный лимит пагинации
     * 
     * @return int Минимальное количество записей
     */
    public static function getMinPaginationLimit(): int
    {
        return 1;
    }
    
    /**
     * Получить максимальный лимит пагинации
     * 
     * @return int Максимальное количество записей
     */
    public static function getMaxPaginationLimit(): int
    {
        return 1000;
    }
    
    /**
     * Валидировать лимит пагинации
     * 
     * @param int $limit Лимит для валидации
     * @return int Валидный лимит (скорректированный если нужно)
     */
    public static function validatePaginationLimit(int $limit): int
    {
        $min = self::getMinPaginationLimit();
        $max = self::getMaxPaginationLimit();
        
        if ($limit < $min) {
            return $min;
        }
        
        if ($limit > $max) {
            return $max;
        }
        
        return $limit;
    }
    
    /**
     * Получить интервал проверки новых логов (для SSE)
     * 
     * @return int Интервал в секундах
     */
    public static function getRealtimeCheckInterval(): int
    {
        return 2;
    }
    
    /**
     * Получить интервал keep-alive (для SSE)
     * 
     * @return int Интервал в секундах
     */
    public static function getRealtimeKeepAliveInterval(): int
    {
        return 30;
    }
    
    /**
     * Получить таймаут соединения SSE
     * 
     * @return int Таймаут в секундах
     */
    public static function getRealtimeTimeout(): int
    {
        return 300; // 5 минут
    }
    
    /**
     * Получить путь к файлу секрета вебхука
     * 
     * @return string Путь к файлу
     */
    public static function getSecretFilePath(): string
    {
        return __DIR__ . '/../../../webhook-secret.php';
    }
    
    /**
     * Получить имя переменной окружения для секрета
     * 
     * @return string Имя переменной
     */
    public static function getSecretEnvName(): string
    {
        return 'BITRIX24_WEBHOOK_SECRET';
    }
    
    /**
     * Получить путь к файлу settings.json (fallback)
     * 
     * @return string Путь к файлу
     */
    public static function getSettingsFilePath(): string
    {
        return __DIR__ . '/../../../settings.json';
    }
    
    /**
     * Получить JSON опции для кодирования
     * 
     * @return int Битовая маска опций JSON
     */
    public static function getJsonEncodeOptions(): int
    {
        return JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE;
    }
    
    /**
     * Получить JSON опции для декодирования
     * 
     * @return int Битовая маска опций JSON
     */
    public static function getJsonDecodeOptions(): int
    {
        return JSON_OBJECT_AS_ARRAY;
    }
    
    /**
     * Получить часовой пояс для дат
     * 
     * @return string Часовой пояс (например, 'Europe/Minsk')
     */
    public static function getTimezone(): string
    {
        return 'Europe/Minsk';
    }
}
```

**2.3. Протестировать класс конфигурации:**

```php
<?php
// test-config.php (временный файл для тестирования)
require_once __DIR__ . '/src/WebhookLogs/Config/WebhookLogsConfig.php';

use WebhookLogs\Config\WebhookLogsConfig;

echo "Base path: " . WebhookLogsConfig::getBaseLogsPath() . "\n";
echo "Categories: " . implode(', ', WebhookLogsConfig::getCategories()) . "\n";
echo "Default limit: " . WebhookLogsConfig::getDefaultPaginationLimit() . "\n";
echo "Realtime interval: " . WebhookLogsConfig::getRealtimeCheckInterval() . "\n";
```

**Результат шага 2:**
- Класс `WebhookLogsConfig` создан
- Все настройки вынесены в конфигурацию
- Класс протестирован

---

### Шаг 3: Создание базовых классов исключений

**3.1. Создать базовый класс исключений:**

**Файл:** `src/WebhookLogs/Exception/WebhookException.php`

```php
<?php
/**
 * Базовый класс исключений модуля логирования вебхуков
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookException.php
 */
namespace WebhookLogs\Exception;

class WebhookException extends \Exception
{
    /**
     * Контекст ошибки (дополнительные данные)
     * 
     * @var array
     */
    protected $context = [];
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     * @param array $context Контекст ошибки
     */
    public function __construct(
        string $message = "",
        int $code = 0,
        ?\Throwable $previous = null,
        array $context = []
    ) {
        parent::__construct($message, $code, $previous);
        $this->context = $context;
    }
    
    /**
     * Получить контекст ошибки
     * 
     * @return array Контекст
     */
    public function getContext(): array
    {
        return $this->context;
    }
    
    /**
     * Получить контекст как JSON строку
     * 
     * @return string JSON строка
     */
    public function getContextAsJson(): string
    {
        return json_encode($this->context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
}
```

**3.2. Создать класс исключения валидации:**

**Файл:** `src/WebhookLogs/Exception/WebhookValidationException.php`

```php
<?php
/**
 * Исключение валидации вебхука
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookValidationException.php
 */
namespace WebhookLogs\Exception;

class WebhookValidationException extends WebhookException
{
    /**
     * Тип ошибки валидации
     * 
     * @var string
     */
    protected $validationType;
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param string $validationType Тип ошибки (signature, payload, required_field)
     * @param array $context Контекст ошибки
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     */
    public function __construct(
        string $message = "",
        string $validationType = 'unknown',
        array $context = [],
        int $code = 400,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous, $context);
        $this->validationType = $validationType;
    }
    
    /**
     * Получить тип ошибки валидации
     * 
     * @return string Тип ошибки
     */
    public function getValidationType(): string
    {
        return $this->validationType;
    }
}
```

**3.3. Создать класс исключения логирования:**

**Файл:** `src/WebhookLogs/Exception/WebhookLoggingException.php`

```php
<?php
/**
 * Исключение логирования вебхука
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookLoggingException.php
 */
namespace WebhookLogs\Exception;

class WebhookLoggingException extends WebhookException
{
    /**
     * Тип ошибки логирования
     * 
     * @var string
     */
    protected $loggingType;
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param string $loggingType Тип ошибки (write, read, parse, directory)
     * @param array $context Контекст ошибки
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     */
    public function __construct(
        string $message = "",
        string $loggingType = 'unknown',
        array $context = [],
        int $code = 500,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous, $context);
        $this->loggingType = $loggingType;
    }
    
    /**
     * Получить тип ошибки логирования
     * 
     * @return string Тип ошибки
     */
    public function getLoggingType(): string
    {
        return $this->loggingType;
    }
}

```

**3.4. Протестировать классы исключений:**

```php
<?php
// test-exceptions.php (временный файл)
require_once __DIR__ . '/src/WebhookLogs/Exception/WebhookException.php';
require_once __DIR__ . '/src/WebhookLogs/Exception/WebhookValidationException.php';
require_once __DIR__ . '/src/WebhookLogs/Exception/WebhookLoggingException.php';

use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

try {
    throw new WebhookValidationException(
        'Invalid signature',
        'signature',
        ['signature' => 'abc123', 'expected' => 'xyz789']
    );
} catch (WebhookValidationException $e) {
    echo "Validation error: " . $e->getMessage() . "\n";
    echo "Type: " . $e->getValidationType() . "\n";
    echo "Context: " . $e->getContextAsJson() . "\n";
}

try {
    throw new WebhookLoggingException(
        'Failed to write log file',
        'write',
        ['file' => '/path/to/file.json', 'error' => 'Permission denied']
    );
} catch (WebhookLoggingException $e) {
    echo "Logging error: " . $e->getMessage() . "\n";
    echo "Type: " . $e->getLoggingType() . "\n";
}
```

**Результат шага 3:**
- Базовый класс исключений создан
- Классы исключений для валидации и логирования созданы
- Классы протестированы

---

### Шаг 4: Настройка автозагрузки классов

**4.1. Создать простой autoloader:**

**Файл:** `src/WebhookLogs/Autoloader.php`

```php
<?php
/**
 * Простой autoloader для модуля WebhookLogs
 * 
 * Расположение: src/WebhookLogs/Autoloader.php
 * 
 * Использование:
 * require_once __DIR__ . '/src/WebhookLogs/Autoloader.php';
 * WebhookLogs\Autoloader::register();
 */
namespace WebhookLogs;

class Autoloader
{
    /**
     * Базовый путь к модулю
     * 
     * @var string
     */
    private static $basePath = null;
    
    /**
     * Зарегистрировать autoloader
     * 
     * @param string|null $basePath Базовый путь к модулю (если null, определяется автоматически)
     */
    public static function register(?string $basePath = null): void
    {
        if ($basePath === null) {
            $basePath = __DIR__;
        }
        
        self::$basePath = $basePath;
        
        spl_autoload_register([self::class, 'loadClass']);
    }
    
    /**
     * Загрузить класс
     * 
     * @param string $className Полное имя класса с namespace
     * @return bool true если класс загружен
     */
    public static function loadClass(string $className): bool
    {
        // Проверяем, что класс принадлежит нашему namespace
        if (strpos($className, 'WebhookLogs\\') !== 0) {
            return false;
        }
        
        // Убираем namespace префикс
        $relativePath = substr($className, strlen('WebhookLogs\\'));
        
        // Заменяем обратные слеши на прямые
        $relativePath = str_replace('\\', '/', $relativePath);
        
        // Формируем путь к файлу
        $filePath = self::$basePath . '/' . $relativePath . '.php';
        
        // Проверяем существование файла
        if (file_exists($filePath)) {
            require_once $filePath;
            return true;
        }
        
        return false;
    }
    
    /**
     * Отменить регистрацию autoloader
     */
    public static function unregister(): void
    {
        spl_autoload_unregister([self::class, 'loadClass']);
    }
}
```

**4.2. Создать файл инициализации модуля:**

**Файл:** `src/WebhookLogs/bootstrap.php`

```php
<?php
/**
 * Инициализация модуля WebhookLogs
 * 
 * Расположение: src/WebhookLogs/bootstrap.php
 * 
 * Использование:
 * require_once __DIR__ . '/src/WebhookLogs/bootstrap.php';
 */
require_once __DIR__ . '/Autoloader.php';

use WebhookLogs\Autoloader;

// Регистрируем autoloader
Autoloader::register(__DIR__);
```

**4.3. Обновить точки входа для подключения autoloader:**

**В `api/webhook-handler.php` (в начале файла, после require crest.php):**

```php
// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');
```

**В `api/webhook-logs.php` (в начале файла, после require crest.php):**

```php
// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');
```

**В `api/webhook-realtime.php` (в начале файла):**

```php
// Подключение autoloader модуля WebhookLogs
require_once(__DIR__ . '/../src/WebhookLogs/bootstrap.php');
```

**4.4. Протестировать автозагрузку:**

```php
<?php
// test-autoload.php (временный файл)
require_once __DIR__ . '/src/WebhookLogs/bootstrap.php';

// Тестируем загрузку классов
use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookException;
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

echo "Testing autoloader...\n";

// Проверяем, что классы загружаются
$config = WebhookLogsConfig::getBaseLogsPath();
echo "Config loaded: " . ($config ? "OK" : "FAIL") . "\n";

try {
    throw new WebhookValidationException('Test');
    echo "Exception classes loaded: FAIL\n";
} catch (WebhookValidationException $e) {
    echo "Exception classes loaded: OK\n";
}

echo "Autoloader test completed!\n";
```

**Результат шага 4:**
- Autoloader создан и зарегистрирован
- Точки входа обновлены
- Автозагрузка протестирована

---

### Шаг 5: Создание документации структуры

**5.1. Создать файл `src/WebhookLogs/README.md`:**

```markdown
# Модуль WebhookLogs

Модуль для логирования и обработки вебхуков от Bitrix24.

## Структура модуля

```
WebhookLogs/
├── Config/              # Конфигурация модуля
├── Exception/           # Классы исключений
├── Service/             # Сервисы бизнес-логики
├── Repository/          # Работа с данными (файлы)
├── Entity/              # Сущности данных
└── Utils/               # Вспомогательные утилиты
```

## Использование

### Инициализация

```php
require_once __DIR__ . '/src/WebhookLogs/bootstrap.php';
```

### Конфигурация

```php
use WebhookLogs\Config\WebhookLogsConfig;

$path = WebhookLogsConfig::getBaseLogsPath();
$limit = WebhookLogsConfig::getDefaultPaginationLimit();
```

### Исключения

```php
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

try {
    // ...
} catch (WebhookValidationException $e) {
    // Обработка ошибки валидации
}
```

## Документация

См. TASK-018 для полной документации рефакторинга.
```

**Результат шага 5:**
- Документация структуры создана
- Примеры использования добавлены

---

## 📊 Критерии приёмки

- [ ] Структура папок `src/WebhookLogs/` создана
- [ ] Класс `WebhookLogsConfig` реализован со всеми настройками
- [ ] Все хардкод-настройки вынесены в конфигурацию
- [ ] Базовый класс `WebhookException` создан
- [ ] Класс `WebhookValidationException` создан
- [ ] Класс `WebhookLoggingException` создан
- [ ] Autoloader создан и зарегистрирован
- [ ] Точки входа обновлены для подключения autoloader
- [ ] Все классы протестированы
- [ ] Документация структуры создана
- [ ] Код соответствует стандартам PSR-12

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить структуру папок
tree src/WebhookLogs/ -I '.gitkeep'

# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Config/WebhookLogsConfig.php
php -l src/WebhookLogs/Exception/WebhookException.php
php -l src/WebhookLogs/Autoloader.php

# Запустить тесты (если созданы)
php test-config.php
php test-exceptions.php
php test-autoload.php
```

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-01:** Использует результаты аудита для понимания текущих настроек

**Зависит от него:**
- **TASK-018-03:** Repository будет использовать `WebhookLogsConfig`
- **TASK-018-04:** Сущности будут использовать исключения
- **TASK-018-05-09:** Все сервисы будут использовать Config и Exception

---

## 📝 История правок

- **2025-12-07 14:23 (UTC+3, Брест):** Создана задача создания структуры модуля и конфигурации

---

## 💡 Дополнительные рекомендации

1. **Версионирование конфигурации:**
   - В будущем можно добавить версионирование конфигурации
   - Миграции конфигурации при обновлении

2. **Кеширование конфигурации:**
   - Для производительности можно кешировать часто используемые значения
   - Использовать статические переменные (уже реализовано)

3. **Валидация конфигурации:**
   - Добавить метод `validate()` для проверки корректности настроек
   - Проверка существования директорий при инициализации

4. **Расширяемость:**
   - Конфигурация спроектирована для легкого расширения
   - Новые настройки добавляются как статические методы

---

## 🔍 Дополнительные детали реализации

### Шаг 6: Улучшение класса WebhookLogsConfig

**6.1. Добавить валидацию и проверки:**

**Дополнить класс `WebhookLogsConfig`:**

```php
// Добавить в класс WebhookLogsConfig

/**
 * Валидация всей конфигурации
 * 
 * @return array Массив ошибок (пустой если всё ОК)
 */
public static function validate(): array
{
    $errors = [];
    
    // Проверка базового пути
    $basePath = self::getBaseLogsPath();
    if (!is_dir($basePath)) {
        $errors[] = "Base logs path does not exist: {$basePath}";
    } elseif (!is_writable($basePath)) {
        $errors[] = "Base logs path is not writable: {$basePath}";
    }
    
    // Проверка категорий
    foreach (self::getCategories() as $category) {
        $categoryPath = self::getCategoryPath($category);
        if (!is_dir($categoryPath) && !mkdir($categoryPath, self::getDirectoryPermissions(), true)) {
            $errors[] = "Cannot create category directory: {$categoryPath}";
        }
    }
    
    // Проверка файла секрета (опционально)
    $secretFile = self::getSecretFilePath();
    if (!file_exists($secretFile)) {
        $errors[] = "Secret file does not exist: {$secretFile} (warning, not critical)";
    }
    
    // Проверка часового пояса
    try {
        new \DateTimeZone(self::getTimezone());
    } catch (\Exception $e) {
        $errors[] = "Invalid timezone: " . self::getTimezone();
    }
    
    return $errors;
}

/**
 * Инициализация конфигурации (создание необходимых директорий)
 * 
 * @return bool true если инициализация успешна
 * @throws \RuntimeException При ошибке инициализации
 */
public static function initialize(): bool
{
    $basePath = self::getBaseLogsPath();
    
    // Создание базовой директории
    if (!is_dir($basePath)) {
        if (!mkdir($basePath, self::getDirectoryPermissions(), true)) {
            throw new \RuntimeException("Cannot create base logs directory: {$basePath}");
        }
    }
    
    // Создание директорий для категорий
    foreach (self::getCategories() as $category) {
        $categoryPath = self::getCategoryPath($category);
        if (!is_dir($categoryPath)) {
            if (!mkdir($categoryPath, self::getDirectoryPermissions(), true)) {
                throw new \RuntimeException("Cannot create category directory: {$categoryPath}");
            }
        }
    }
    
    return true;
}

/**
 * Получить полный путь к файлу лога
 * 
 * @param string $category Категория
 * @param string $date Дата в формате YYYY-MM-DD
 * @param int|null $hour Час (0-23) или null для всех часов
 * @return string|array Путь к файлу или массив путей
 */
public static function getLogFilePath(string $category, string $date, ?int $hour = null): string|array
{
    if (!self::isValidCategory($category)) {
        throw new \InvalidArgumentException("Invalid category: {$category}");
    }
    
    $categoryPath = self::getCategoryPath($category);
    $extension = self::getLogFileExtension();
    
    if ($hour !== null) {
        $hourStr = str_pad((string)$hour, 2, '0', STR_PAD_LEFT);
        return $categoryPath . $date . '-' . $hourStr . $extension;
    } else {
        // Возвращаем паттерн для поиска всех файлов за дату
        $pattern = $categoryPath . $date . '-*' . $extension;
        $files = glob($pattern);
        return $files ?: [];
    }
}

/**
 * Получить максимальный размер файла лога (в байтах)
 * 
 * @return int Максимальный размер в байтах (0 = без ограничений)
 */
public static function getMaxLogFileSize(): int
{
    return 10 * 1024 * 1024; // 10 МБ
}

/**
 * Получить максимальное количество записей в файле
 * 
 * @return int Максимальное количество (0 = без ограничений)
 */
public static function getMaxLogEntriesPerFile(): int
{
    return 10000;
}
```

**6.2. Добавить методы для работы с датами:**

```php
// Добавить в класс WebhookLogsConfig

/**
 * Получить объект DateTime с правильным часовым поясом
 * 
 * @param string|null $time Время (null = текущее)
 * @return \DateTime Объект DateTime
 */
public static function getDateTime(?string $time = null): \DateTime
{
    $timezone = new \DateTimeZone(self::getTimezone());
    
    if ($time === null) {
        return new \DateTime('now', $timezone);
    }
    
    return new \DateTime($time, $timezone);
}

/**
 * Форматировать дату для имени файла
 * 
 * @param \DateTime|null $date Дата (null = текущая)
 * @return string Отформатированная дата
 */
public static function formatDateForFile(?\DateTime $date = null): string
{
    if ($date === null) {
        $date = self::getDateTime();
    }
    
    return $date->format(self::getLogFileDateFormat());
}
```

**Результат шага 6:**
- Класс конфигурации расширен
- Добавлена валидация
- Добавлены методы инициализации
- Улучшена работа с датами

---

### Шаг 7: Улучшение обработки ошибок в исключениях

**7.1. Расширить базовый класс исключений:**

**Дополнить `WebhookException.php`:**

```php
// Добавить в класс WebhookException

/**
 * Получить детальную информацию об ошибке для логирования
 * 
 * @return array Массив с детальной информацией
 */
public function getErrorDetails(): array
{
    return [
        'message' => $this->getMessage(),
        'code' => $this->getCode(),
        'file' => $this->getFile(),
        'line' => $this->getLine(),
        'context' => $this->context,
        'trace' => $this->getTraceAsString()
    ];
}

/**
 * Получить HTTP статус код для ответа
 * 
 * @return int HTTP статус код
 */
public function getHttpStatusCode(): int
{
    $code = $this->getCode();
    
    // Если код в диапазоне HTTP статусов (100-599)
    if ($code >= 100 && $code < 600) {
        return $code;
    }
    
    // По умолчанию 500
    return 500;
}
```

**7.2. Добавить логирование в исключения:**

```php
// Добавить в класс WebhookException

/**
 * Логировать исключение
 * 
 * @param string|null $logFile Путь к файлу лога (null = error_log)
 */
public function log(?string $logFile = null): void
{
    $details = $this->getErrorDetails();
    $message = json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if ($logFile !== null) {
        error_log($message, 3, $logFile);
    } else {
        error_log($message);
    }
}
```

**Результат шага 7:**
- Исключения расширены
- Добавлено логирование
- Улучшена обработка ошибок

---

### Шаг 8: Улучшение autoloader

**8.1. Добавить обработку ошибок и кеширование:**

**Дополнить `Autoloader.php`:**

```php
// Добавить в класс Autoloader

/**
 * Кеш загруженных классов
 * 
 * @var array
 */
private static $loadedClasses = [];

/**
 * Загрузить класс
 * 
 * @param string $className Полное имя класса с namespace
 * @return bool true если класс загружен
 */
public static function loadClass(string $className): bool
{
    // Проверка кеша
    if (isset(self::$loadedClasses[$className])) {
        return true;
    }
    
    // Проверяем, что класс принадлежит нашему namespace
    if (strpos($className, 'WebhookLogs\\') !== 0) {
        return false;
    }
    
    // Убираем namespace префикс
    $relativePath = substr($className, strlen('WebhookLogs\\'));
    
    // Заменяем обратные слеши на прямые
    $relativePath = str_replace('\\', '/', $relativePath);
    
    // Формируем путь к файлу
    $filePath = self::$basePath . '/' . $relativePath . '.php';
    
    // Проверяем существование файла
    if (!file_exists($filePath)) {
        // Логируем предупреждение (только в режиме разработки)
        if (defined('WP_DEBUG') && WP_DEBUG) {
            error_log("WebhookLogs Autoloader: Class file not found: {$filePath}");
        }
        return false;
    }
    
    try {
        require_once $filePath;
        
        // Проверяем, что класс действительно существует
        if (!class_exists($className) && !interface_exists($className) && !trait_exists($className)) {
            error_log("WebhookLogs Autoloader: Class {$className} not found in file {$filePath}");
            return false;
        }
        
        // Кешируем успешную загрузку
        self::$loadedClasses[$className] = true;
        
        return true;
    } catch (\Throwable $e) {
        error_log("WebhookLogs Autoloader: Error loading class {$className}: " . $e->getMessage());
        return false;
    }
}

/**
 * Очистить кеш загруженных классов
 */
public static function clearCache(): void
{
    self::$loadedClasses = [];
}

/**
 * Получить список загруженных классов
 * 
 * @return array Массив имён классов
 */
public static function getLoadedClasses(): array
{
    return array_keys(self::$loadedClasses);
}
```

**8.2. Добавить проверку при регистрации:**

```php
// Модифицировать метод register()

public static function register(?string $basePath = null): void
{
    if ($basePath === null) {
        $basePath = __DIR__;
    }
    
    // Проверка существования базового пути
    if (!is_dir($basePath)) {
        throw new \RuntimeException("WebhookLogs Autoloader: Base path does not exist: {$basePath}");
    }
    
    self::$basePath = realpath($basePath);
    
    // Проверка, что autoloader ещё не зарегистрирован
    if (in_array([self::class, 'loadClass'], spl_autoload_functions(), true)) {
        return; // Уже зарегистрирован
    }
    
    spl_autoload_register([self::class, 'loadClass'], true, true);
}
```

**Результат шага 8:**
- Autoloader улучшен
- Добавлено кеширование
- Улучшена обработка ошибок
- Добавлены проверки

---

### Шаг 9: Создание скрипта инициализации

**9.1. Создать скрипт для проверки и инициализации:**

**Файл:** `scripts/init-webhook-logs-module.php`

```php
<?php
/**
 * Скрипт инициализации модуля WebhookLogs
 * 
 * Использование: php scripts/init-webhook-logs-module.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Config\WebhookLogsConfig;
use WebhookLogs\Exception\WebhookException;

echo "=== Инициализация модуля WebhookLogs ===\n\n";

try {
    // Инициализация конфигурации
    echo "Инициализация конфигурации...\n";
    WebhookLogsConfig::initialize();
    echo "✅ Конфигурация инициализирована\n\n";
    
    // Валидация конфигурации
    echo "Валидация конфигурации...\n";
    $errors = WebhookLogsConfig::validate();
    
    if (empty($errors)) {
        echo "✅ Конфигурация валидна\n\n";
    } else {
        echo "⚠️  Найдены проблемы:\n";
        foreach ($errors as $error) {
            echo "  - {$error}\n";
        }
        echo "\n";
    }
    
    // Проверка автозагрузки
    echo "Проверка автозагрузки...\n";
    $testClasses = [
        'WebhookLogs\\Config\\WebhookLogsConfig',
        'WebhookLogs\\Exception\\WebhookException',
        'WebhookLogs\\Exception\\WebhookValidationException',
        'WebhookLogs\\Exception\\WebhookLoggingException'
    ];
    
    $allLoaded = true;
    foreach ($testClasses as $className) {
        if (class_exists($className)) {
            echo "  ✅ {$className}\n";
        } else {
            echo "  ❌ {$className}\n";
            $allLoaded = false;
        }
    }
    
    if ($allLoaded) {
        echo "\n✅ Автозагрузка работает корректно\n\n";
    } else {
        echo "\n❌ Проблемы с автозагрузкой\n\n";
    }
    
    // Вывод информации о конфигурации
    echo "=== Информация о конфигурации ===\n";
    echo "Базовый путь: " . WebhookLogsConfig::getBaseLogsPath() . "\n";
    echo "Категории: " . implode(', ', WebhookLogsConfig::getCategories()) . "\n";
    echo "Лимит по умолчанию: " . WebhookLogsConfig::getDefaultPaginationLimit() . "\n";
    echo "Часовой пояс: " . WebhookLogsConfig::getTimezone() . "\n";
    
    echo "\n=== Инициализация завершена ===\n";
    
} catch (\Exception $e) {
    echo "❌ Ошибка инициализации: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**Результат шага 9:**
- Скрипт инициализации создан
- Автоматическая проверка конфигурации
- Валидация при развёртывании

---

### Шаг 10: Дополнительные проверки безопасности

**10.1. Добавить проверки безопасности в Config:**

```php
// Добавить в класс WebhookLogsConfig

/**
 * Проверить безопасность пути (защита от directory traversal)
 * 
 * @param string $path Путь для проверки
 * @return bool true если путь безопасен
 */
public static function isPathSafe(string $path): bool
{
    // Проверка на directory traversal
    if (strpos($path, '..') !== false) {
        return false;
    }
    
    // Проверка на абсолютные пути (должны быть относительными)
    if (strpos($path, '/') === 0 || preg_match('/^[A-Z]:\\\\/i', $path)) {
        return false;
    }
    
    return true;
}

/**
 * Санитизация имени категории
 * 
 * @param string $category Категория
 * @return string Санитизированная категория
 * @throws \InvalidArgumentException При невалидной категории
 */
public static function sanitizeCategory(string $category): string
{
    // Удаляем опасные символы
    $sanitized = preg_replace('/[^a-z0-9_-]/', '', strtolower($category));
    
    if (empty($sanitized)) {
        throw new \InvalidArgumentException("Invalid category name: {$category}");
    }
    
    if (!self::isValidCategory($sanitized)) {
        throw new \InvalidArgumentException("Category not supported: {$sanitized}");
    }
    
    return $sanitized;
}
```

**Результат шага 10:**
- Добавлены проверки безопасности
- Защита от directory traversal
- Санитизация входных данных

