# Архитектура модуля учёта времени сектора 1С

**Дата создания:** 2025-12-23 18:30 (UTC+3, Брест)  
**Версия:** 2.0 (после рефакторинга)  
**Статус:** Актуальная

---

## 📋 Обзор

Модуль учёта времени сектора 1С реализован с использованием модульной архитектуры с чётким разделением слоёв и ответственности. Модуль заменяет монолитный файл `tickets-time-tracking-sector-1c.php` (1222 строки) на структурированную систему классов.

---

## 🏗️ Структура модуля

```
api/
└── tickets-time-tracking-sector-1c/
    ├── bootstrap.php                    # Точка входа
    ├── config/
    │   └── TimeTrackingConfig.php       # Конфигурация (константы, параметры)
    ├── util/
    │   ├── WeekHelper.php               # Утилиты для работы с неделями ISO-8601
    │   ├── DateHelper.php               # Утилиты для работы с датами
    │   └── ResponseHelper.php           # Утилиты для HTTP-ответов
    ├── bitrix/
    │   └── Bitrix24Client.php          # Клиент Bitrix24 REST API
    ├── repository/
    │   ├── EmployeeRepository.php       # Репозиторий сотрудников
    │   ├── TaskRepository.php          # Репозиторий задач
    │   ├── ElapsedTimeRepository.php    # Репозиторий трудозатрат
    │   └── TicketRepository.php        # Репозиторий тикетов
    ├── domain/
    │   ├── TaskTicketMatcher.php        # Матчинг задач с тикетами
    │   ├── TimeAggregator.php          # Агрегация по неделям и сотрудникам
    │   └── EmployeeSummaryBuilder.php   # Построение summary по сотрудникам
    ├── service/
    │   └── TimeTrackingService.php      # Основной сервис бизнес-логики
    └── controller/
        └── TimeTrackingController.php   # Контроллер HTTP-запросов
```

---

## 📐 Слои архитектуры

### 1. Controller Layer (Контроллер)

**Ответственность:**
- Парсинг HTTP-запросов
- Валидация входных данных
- Формирование HTTP-ответов
- Обработка исключений

**Компоненты:**
- `TimeTrackingController` — обработка запросов к API

### 2. Service Layer (Сервис)

**Ответственность:**
- Оркестрация бизнес-логики
- Управление потоком данных
- Координация работы репозиториев и доменных сервисов

**Компоненты:**
- `TimeTrackingService` — основной сервис

### 3. Domain Layer (Доменная логика)

**Ответственность:**
- Бизнес-правила и логика
- Матчинг данных
- Агрегация и вычисления

**Компоненты:**
- `TaskTicketMatcher` — матчинг задач с тикетами
- `TimeAggregator` — агрегация трудозатрат
- `EmployeeSummaryBuilder` — построение summary

### 4. Repository Layer (Репозиторий)

**Ответственность:**
- Работа с данными из Bitrix24
- Абстракция источников данных
- Пагинация и фильтрация

**Компоненты:**
- `EmployeeRepository` — работа с сотрудниками
- `TaskRepository` — работа с задачами
- `ElapsedTimeRepository` — работа с трудозатратами
- `TicketRepository` — работа с тикетами

### 5. Bitrix Layer (Bitrix24)

**Ответственность:**
- Обёртка над Bitrix24 REST API
- Обработка ошибок API
- Логирование запросов

**Компоненты:**
- `Bitrix24Client` — клиент Bitrix24 REST API

### 6. Util Layer (Утилиты)

**Ответственность:**
- Вспомогательные функции
- Работа с датами и неделями
- Формирование ответов

**Компоненты:**
- `WeekHelper` — работа с неделями ISO-8601
- `DateHelper` — работа с датами
- `ResponseHelper` — формирование HTTP-ответов

### 7. Config Layer (Конфигурация)

**Ответственность:**
- Хранение констант и параметров
- Конфигурация модуля

**Компоненты:**
- `TimeTrackingConfig` — конфигурация модуля

---

## 🔄 Потоки данных

### Основной поток обработки запроса

```
HTTP Request
    ↓
TimeTrackingController::handleRequest()
    ↓
TimeTrackingController::validateRequest()
    ↓
TimeTrackingService::getTimeTrackingData()
    ↓
    ├── EmployeeRepository::getSector1CEmployees()
    │   └── Bitrix24Client::getAllUsers()
    │
    ├── TaskRepository::getTasksWithElapsedTime()
    │   └── Bitrix24Client::getTasks()
    │
    ├── ElapsedTimeRepository::getElapsedTimeRecords()
    │   └── Bitrix24Client::getElapsedItems()
    │
    ├── TaskTicketMatcher::matchTasksWithTickets()
    │   ├── TicketRepository::getTicketsByIds()
    │   └── Bitrix24Client::getTicketsBatch()
    │
    ├── EmployeeRepository::getEmployeesData()
    │   └── Bitrix24Client::getAllUsers()
    │
    ├── TimeAggregator::aggregateByWeeksAndEmployees()
    │   └── WeekHelper::getWeekNumberByDate()
    │
    └── EmployeeSummaryBuilder::createEmployeesSummary()
    ↓
ResponseHelper::jsonResponse()
    ↓
HTTP Response
```

---

## 🔌 Зависимости между компонентами

### Иерархия зависимостей

```
Controller
    ↓
Service
    ↓
    ├── Repository Layer
    │   └── Bitrix24Client
    │
    └── Domain Layer
        └── Util Layer
```

### Правила зависимостей

1. **Controller** зависит только от **Service**
2. **Service** зависит от **Repository** и **Domain**
3. **Repository** зависит только от **Bitrix24Client**
4. **Domain** может зависеть от **Util**, но не от **Repository**
5. **Util** не зависит ни от чего (чистые функции)

---

## 📦 Namespace структура

```
TimeTracking\
├── Config\
│   └── TimeTrackingConfig
├── Util\
│   ├── WeekHelper
│   ├── DateHelper
│   └── ResponseHelper
├── Bitrix\
│   └── Bitrix24Client
├── Repository\
│   ├── EmployeeRepository
│   ├── TaskRepository
│   ├── ElapsedTimeRepository
│   └── TicketRepository
├── Domain\
│   ├── TaskTicketMatcher
│   ├── TimeAggregator
│   └── EmployeeSummaryBuilder
├── Service\
│   └── TimeTrackingService
└── Controller\
    └── TimeTrackingController
```

---

## 🔧 Конфигурация

Все константы и параметры вынесены в `TimeTrackingConfig`:

- `SECTOR_1C_DEPARTMENT_ID` — ID отдела сектора 1С (366)
- `ENTITY_TYPE_ID` — ID типа сущности (140)
- `SECTOR_1C_TAG` — Тег сектора 1С ('1C')
- `DEFAULT_PAGE_SIZE` — Размер страницы по умолчанию (50)
- `DEFAULT_BATCH_SIZE` — Размер батча по умолчанию (50)
- `DEFAULT_TASKS_PER_PAGE` — Количество задач на страницу (10)
- `MAX_TASKS_PER_PAGE` — Максимальное количество задач (100)
- `WEEKS_COUNT` — Количество недель для анализа (4)

---

## 🎯 Принципы проектирования

1. **Single Responsibility Principle** — каждый класс имеет одну ответственность
2. **Dependency Injection** — все зависимости инжектируются через конструктор
3. **Separation of Concerns** — чёткое разделение слоёв
4. **DRY (Don't Repeat Yourself)** — отсутствие дублирования кода
5. **Open/Closed Principle** — открыт для расширения, закрыт для модификации

---

## 📝 Примеры использования

### Инициализация модуля

```php
// bootstrap.php
$bitrixClient = new Bitrix24Client();

$employeeRepository = new EmployeeRepository($bitrixClient);
$taskRepository = new TaskRepository($bitrixClient);
$elapsedTimeRepository = new ElapsedTimeRepository($bitrixClient);
$ticketRepository = new TicketRepository($bitrixClient);

$taskTicketMatcher = new TaskTicketMatcher($ticketRepository);
$timeAggregator = new TimeAggregator();
$employeeSummaryBuilder = new EmployeeSummaryBuilder();

$service = new TimeTrackingService(
    $employeeRepository,
    $taskRepository,
    $elapsedTimeRepository,
    $ticketRepository,
    $taskTicketMatcher,
    $timeAggregator,
    $employeeSummaryBuilder
);

$controller = new TimeTrackingController($service);
$controller->handleRequest();
```

---

## 🔗 Связанные документы

- **API-документация:** `DOCS/API-REFERENCES/tickets-time-tracking-api.md`
- **Руководство разработчика:** `DOCS/DEVELOPER-GUIDE/tickets-time-tracking-development.md`
- **План рефакторинга:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`

---

**История правок:**
- 2025-12-23 18:30 (UTC+3, Брест): Создана документация архитектуры после рефакторинга

