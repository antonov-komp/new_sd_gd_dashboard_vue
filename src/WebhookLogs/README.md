# Модуль WebhookLogs

Модуль для логирования и обработки вебхуков от Bitrix24.

## Структура модуля

```
WebhookLogs/
├── Config/              # Конфигурация модуля
│   └── WebhookLogsConfig.php
├── Exception/           # Классы исключений
│   ├── WebhookException.php
│   ├── WebhookValidationException.php
│   └── WebhookLoggingException.php
├── Service/             # Сервисы бизнес-логики
├── Repository/          # Работа с данными (файлы)
├── Entity/               # Сущности данных
├── Utils/               # Вспомогательные утилиты
├── Autoloader.php       # Автозагрузка классов
└── bootstrap.php        # Инициализация модуля
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
$categories = WebhookLogsConfig::getCategories();

// Валидация конфигурации
$errors = WebhookLogsConfig::validate();

// Инициализация (создание директорий)
WebhookLogsConfig::initialize();
```

### Исключения

```php
use WebhookLogs\Exception\WebhookValidationException;
use WebhookLogs\Exception\WebhookLoggingException;

try {
    // ...
} catch (WebhookValidationException $e) {
    // Обработка ошибки валидации
    echo $e->getMessage();
    echo $e->getValidationType();
    $e->log(); // Логирование
} catch (WebhookLoggingException $e) {
    // Обработка ошибки логирования
    echo $e->getMessage();
    echo $e->getLoggingType();
}
```

## Документация

См. TASK-018 для полной документации рефакторинга.





