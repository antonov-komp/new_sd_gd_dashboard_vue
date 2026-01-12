# Папка Tests - Тестовые и отладочные файлы

Эта папка содержит все тестовые, отладочные и вспомогательные файлы проекта. Эти файлы используются для разработки, тестирования и отладки различных компонентов системы.

## Структура файлов

### PHP файлы

#### `check-webhook-logs.php`
- **Назначение**: Скрипт для проверки и анализа логов вебхуков
- **Функциональность**:
  - Проверяет наличие файлов логов в категориях (tasks, smart-processes, errors)
  - Отображает статистику по записям в логах
  - Показывает последние записи из каждой категории
  - Проверяет конфигурацию токена вебхука
- **Использование**: `php tests/check-webhook-logs.php`
- **Связанные TASK**: Общие задачи по вебхукам

#### `debug-cache-084.php`
- **Назначение**: Отладочный скрипт для TASK-084 - проверка категоризации кеша
- **Функциональность**:
  - Получает данные из API cache-status.php
  - Категоризирует модули кеша (основные/побочные)
  - Группирует побочные модули по типам
  - Отображает результаты категоризации в JSON формате
- **Использование**: `php tests/debug-cache-084.php`
- **API методы**: Использует `/api/admin/cache-status.php`

#### `debug-cache-creation.php`
- **Назначение**: Отладочный скрипт для проверки создания кеша (TASK-082)
- **Функциональность**:
  - Тестирует создание кеша для DashboardSector1C
  - Тестирует создание кеша для GraphState
  - Проверяет работу сервисов напрямую
  - Имитирует вызовы cache-create.php
- **Использование**: `php tests/debug-cache-creation.php`
- **Тестируемые компоненты**:
  - `DashboardSector1CService::getSectorDataCached()`
  - `GraphStateService::getSnapshotDataCached()`
  - Классы кеширования

#### `test-api-duration.php`
- **Назначение**: Тест API категоризации carryover тикетов
- **Функциональность**:
  - Тестирует GraphAdmissionClosureService с тестовыми данными
  - Проверяет логику категоризации тикетов по длительности
  - Имитирует недельный анализ с carryover тикетами
  - Проверяет наличие тикетов в категориях "более полугода" и "более года"
- **Использование**: `php tests/test-api-duration.php`
- **API**: GraphAdmissionClosureService::handle()

#### `test-cache-082.php`
- **Назначение**: Тестовый скрипт для проверки TASK-082 (Backend кеширование)
- **Функциональность**:
  - Тестирует DashboardSector1CCache (сохранение/чтение данных сектора)
  - Тестирует GraphStateCache (кеширование слепков состояния)
  - Имитирует API endpoints для статуса кеша
  - Проверяет функции очистки кеша
- **Использование**: `php tests/test-cache-082.php`
- **Тестируемые компоненты**:
  - `DashboardSector1CCache`
  - `GraphStateCache`
  - API эмуляция cache-status.php

#### `test-cache-084.php`
- **Назначение**: Тестовый скрипт для проверки TASK-084 (Иерархическая сортировка кеша)
- **Функциональность**:
  - Получает данные модулей кеша из API cache-status.php
  - Категоризирует модули на основные и побочные
  - Сортирует основные модули по приоритету (1-7)
  - Группирует побочные модули (users, activity, webhooks, other)
  - Отображает статистику и результаты в HTML формате
- **Использование**: `php tests/test-cache-084.php` или открыть в браузере
- **API**: `/api/admin/cache-status.php`

#### `test-carryover-categories.php`
- **Назначение**: Тест формирования carryover категорий и тикетов
- **Функциональность**:
  - Тестирует логику категоризации тикетов по длительности
  - Проверяет работу DatePeriodHelper::calculateDurationCategory()
  - Имитирует mock данные тикетов с разными сроками
  - Проверяет правильность распределения по категориям
- **Использование**: `php tests/test-carryover-categories.php`
- **Тестируемые компоненты**: `DatePeriodHelper`

#### `test-duration-category.php`
- **Назначение**: Тест логики категоризации тикетов по длительности
- **Функциональность**:
  - Тестирует функцию calculateDurationCategory с различными датами
  - Проверяет соответствие ожидаемым категориям длительности
  - Отображает промежуточные расчеты дней
  - Валидирует логику категоризации (до месяца, месяцы, полгода, год+)
- **Использование**: `php tests/test-duration-category.php`
- **Тестируемые компоненты**: `DatePeriodHelper::calculateDurationCategory()`

#### `test-duration-logging.php`
- **Назначение**: Тест логирования calculateDurationCategory
- **Функциональность**:
  - Тестирует функцию calculateDurationCategory с подробным логированием
  - Проверяет работу с датами более 365 дней (carryover тикеты)
  - Отображает результаты категоризации для каждого тестового случая
  - Проверяет корректность определения "более года" и "более полугода"
- **Использование**: `php tests/test-duration-logging.php`
- **Связанные TASK**: TASK по carryover тикетам

#### `test-final.php`
- **Назначение**: Финальный тест исправлений TASK-082
- **Функциональность**:
  - Проверяет доступность CRest (Bitrix24 API)
  - Тестирует загрузку сервисов (DashboardSector1CService, GraphStateService)
  - Проверяет существование функций создания кеша
  - Валидирует структуры возвращаемых данных
  - Выводит отчет об исправлениях
- **Использование**: `php tests/test-final.php`
- **API**: Тестирует интеграцию с Bitrix24

#### `test-full-carryover-logic.php`
- **Назначение**: Полный тест логики carryover тикетов
- **Функциональность**:
  - Определяет carryover тикеты (активные, созданные до конца недели)
  - Категоризирует их по длительности пребывания
  - Формирует результат в формате API
  - Проверяет логику определения завершающих стадий
  - Тестирует полную цепочку: определение → категоризация → результат
- **Использование**: `php tests/test-full-carryover-logic.php`
- **Связанные TASK**: TASK по carryover логике

#### `test-graph-state-dependencies.php`
- **Назначение**: Тест зависимостей GraphStateService от DashboardSector1CService
- **Функциональность**:
  - Проверяет правильную передачу forceRefresh в зависимые сервисы
  - Тестирует автоматическое создание зависимых кэшей
  - Проверяет использование существующих кэшей при повторных вызовах
  - Имитирует логику cache-create.php для GraphState
- **Использование**: `php tests/test-graph-state-dependencies.php`
- **Тестируемые компоненты**:
  - `GraphStateService::getSnapshotDataCached()`
  - Зависимости от `DashboardSector1CService`

### Shell скрипты

#### `monitor-webhooks.sh`
- **Назначение**: Скрипт для мониторинга логов вебхуков в реальном времени
- **Функциональность**:
  - Отображает логи по категориям (tasks, smart-processes, errors)
  - Показывает последние записи из лог-файлов
  - Автоматически обновляется каждые 2 секунды
  - Использует `jq` для парсинга JSON логов
- **Использование**: `./tests/monitor-webhooks.sh` (требует jq)
- **Зависимости**: jq (JSON processor)

#### `test-realtime-endpoint.sh`
- **Назначение**: Тест endpoint для realtime соединений (SSE)
- **Функциональность**:
  - Проверяет доступность endpoint `/api/webhook-realtime.php`
  - Тестирует правильность заголовков SSE (Server-Sent Events)
  - Проверяет получение начального события 'connected'
  - Работает с таймаутом 5 секунд для тестирования соединения
- **Использование**: `./tests/test-realtime-endpoint.sh [domain]`
- **Параметры**: `domain` - домен для тестирования (по умолчанию: back.antonov-mark.ru)
- **Зависимости**: curl

#### `test-webhook-endpoint.sh`
- **Назначение**: Тест endpoint для обработки вебхуков
- **Функциональность**:
  - Отправляет тестовый POST запрос на `/api/webhook-handler.php`
  - Использует mock данные события ONTASKADD
  - Проверяет HTTP код ответа (200, 401, 404)
  - Отображает ответ сервера в читаемом формате (JSON)
- **Использование**: `./tests/test-webhook-endpoint.sh [domain]`
- **Параметры**: `domain` - домен для тестирования (по умолчанию: localhost)
- **Зависимости**: curl, jq (опционально для форматирования JSON)

### JavaScript файлы

#### `test-cache-logic.js`
- **Назначение**: Тест логики категоризации кеша
- **Функциональность**:
  - Тестирует алгоритм разделения модулей на основные и побочные
  - Проверяет приоритизацию основных модулей
  - Группирует побочные модули по типам (users, activity, webhooks, other)
  - Отображает результаты категоризации в консоли
- **Использование**: `node tests/test-cache-logic.js`
- **Тестируемая логика**: Логика из CacheManagementService

### HTML файлы

#### `test-time-filters.html`
- **Назначение**: Тест интерфейса фильтрации по времени (TASK-083)
- **Функциональность**:
  - Тестирует фильтры: 1 месяц, 2 месяца, 6+ месяцев, 1+ год
  - Проверяет производительность с большим количеством данных
  - Отображает распределение тикетов по фильтрам
  - Интерактивный интерфейс с кнопками тестирования
- **Использование**: Открыть в браузере `tests/test-time-filters.html`
- **Зависимости**:
  - `vue-app/src/test-data.js`
  - `vue-app/src/utils/time-filters.js`
- **Vue.js**: Использует модули ES6

#### `test-vue-cache.html`
- **Назначение**: Тест Vue.js компонента управления кешем
- **Функциональность**:
  - Тестирует API cache-status.php через Vue.js
  - Проверяет категоризацию модулей кеша
  - Отображает основные и побочные модули
  - Показывает статистику по модулям кеша
- **Использование**: Открыть в браузере `tests/test-vue-cache.html`
- **Зависимости**: Vue.js 3.x (загружается из CDN)
- **API**: Вызывает `/api/admin/cache-status.php`

## Важные замечания

### Пути в коде
- Все пути в PHP файлах исправлены для работы из папки `tests/`
- Относительные пути заменены на `../` для доступа к основным файлам проекта
- HTML файлы с импортами ES6 модулей также имеют исправленные пути

### Зависимости
- Для запуска PHP скриптов требуется PHP 8.0+
- Для `monitor-webhooks.sh` требуется установленный `jq`
- HTML файлы работают в любом современном браузере

### Безопасность
- Эти файлы предназначены только для разработки и тестирования
- Не должны использоваться в production окружении
- Могут содержать отладочную информацию

### Организация
Файлы организованы по типам задач:
- **Cache**: Тестирование системы кеширования (TASK-082, TASK-084)
- **Webhooks**: Мониторинг и отладка вебхуков (логи, endpoints, realtime)
- **Time Filters**: Тестирование фильтрации по времени (TASK-083)
- **Carryover Logic**: Тестирование логики carryover тикетов
- **Vue Components**: Тестирование Vue.js компонентов
- **API Testing**: Тестирование REST API endpoints

## Запуск тестов

### PHP тесты
```bash
# Проверка логов вебхуков
php tests/check-webhook-logs.php

# Отладка создания кеша (TASK-082)
php tests/debug-cache-creation.php

# Категоризация кеша (TASK-084)
php tests/test-cache-084.php

# Тесты API длительности carryover
php tests/test-api-duration.php

# Тесты логики категоризации
php tests/test-carryover-categories.php
php tests/test-duration-category.php
php tests/test-duration-logging.php
php tests/test-full-carryover-logic.php

# Тесты зависимостей сервисов
php tests/test-graph-state-dependencies.php

# Финальный тест исправлений
php tests/test-final.php
```

### Shell скрипты
```bash
# Мониторинг вебхуков в реальном времени
./tests/monitor-webhooks.sh

# Тест webhook endpoint
./tests/test-webhook-endpoint.sh [domain]

# Тест realtime endpoint (SSE)
./tests/test-realtime-endpoint.sh [domain]
```

### JavaScript и HTML тесты
```bash
# Тест логики кеша (JavaScript)
node tests/test-cache-logic.js

# Тесты Vue.js компонентов (в браузере)
# Открыть соответствующие .html файлы:
# - tests/test-time-filters.html
# - tests/test-vue-cache.html
```

## История перемещения

Файлы были перемещены из корневой директории проекта в папку `tests/` для лучшей организации структуры проекта. Всего перемещено **17 файлов**:

### Перемещенные файлы:
1. `check-webhook-logs.php` - проверка логов вебхуков
2. `debug-cache-084.php` - отладка категоризации кеша (TASK-084)
3. `debug-cache-creation.php` - отладка создания кеша (TASK-082)
4. `monitor-webhooks.sh` - мониторинг вебхуков в реальном времени
5. `test-api-duration.php` - тест API категоризации carryover
6. `test-cache-082.php` - тест backend кеширования (TASK-082)
7. `test-cache-084.php` - тест иерархической сортировки кеша (TASK-084)
8. `test-cache-logic.js` - тест логики категоризации кеша
9. `test-carryover-categories.php` - тест формирования carryover категорий
10. `test-duration-category.php` - тест категоризации по длительности
11. `test-duration-logging.php` - тест логирования длительности
12. `test-final.php` - финальный тест исправлений (TASK-082)
13. `test-full-carryover-logic.php` - полный тест carryover логики
14. `test-graph-state-dependencies.php` - тест зависимостей GraphStateService
15. `test-realtime-endpoint.sh` - тест realtime endpoint (SSE)
16. `test-time-filters.html` - тест фильтрации по времени (TASK-083)
17. `test-vue-cache.html` - тест Vue.js компонента кеша
18. `test-webhook-endpoint.sh` - тест webhook endpoint

### Технические изменения:
- Исправлены пути `require_once` в PHP файлах (добавлен префикс `../`)
- Исправлены пути в HTML файлах с ES6 импортами
- Исправлены пути в shell скриптах
- Создан подробный README.md с описанием всех файлов
- Сохранена работоспособность всех скриптов после перемещения