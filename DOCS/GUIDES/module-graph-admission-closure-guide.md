# Гайдлайн: Модуль «График приёма и закрытий сектора 1С»

**Дата создания:** 2025-12-16 10:00 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Актуальный  
**Связанная задача:** TASK-041

---

## Оглавление

1. [Обзор модуля](#обзор-модуля)
2. [Архитектура](#архитектура)
3. [Структура компонентов](#структура-компонентов)
4. [API контракт](#api-контракт)
5. [Логика работы с данными](#логика-работы-с-данными)
6. [Работа с неделями](#работа-с-неделями)
7. [Фильтрация](#фильтрация)
8. [Графики](#графики)
9. [Модальные окна](#модальные-окна)
10. [Навигация и доступы](#навигация-и-доступы)
11. [Стилизация](#стилизация)
12. [Обработка ошибок](#обработка-ошибок)

---

## Обзор модуля

### Назначение

Модуль «График приёма и закрытий сектора 1С» — третий модуль в дашборде сектора 1С, предназначенный для визуализации динамики поступления и закрытия тикетов сектора 1С по неделям.

### Ключевые особенности

- **Недельная агрегация:** данные агрегируются по неделям ISO-8601 (понедельник–воскресенье, UTC)
- **Фильтрация по продукту:** первичный фильтр по `UF_CRM_7_TYPE_PRODUCT = "1C"`
- **Три типа графиков:** линейный, столбчатый, круговая диаграмма
- **Выбор недели:** компонент `WeekPicker` с барабаном прокрутки
- **Модальные окна:** детализация по ответственным, стадиям, переходящим тикетам
- **Без селектора этапов:** все стадии отображаются сразу (в отличие от модуля «График состояния»)

### Связанные модули

- **Модуль 1:** Дашборд сектора 1С (`DashboardSector1C.vue`)
- **Модуль 2:** График состояния сектора 1С (`GraphStateDashboard.vue`)
- **Модуль 3:** График приёма и закрытий сектора 1С (текущий модуль)
- **Модуль 4:** Трудозатраты на тикеты сектора 1С (`TASK-050`)

---

## Архитектура

### Структура файлов

```
vue-app/src/
├── components/
│   └── graph-admission-closure/
│       ├── GraphAdmissionClosureDashboard.vue    # Главный компонент дашборда
│       ├── GraphAdmissionClosureChart.vue        # Компонент графиков
│       ├── ResponsibleModal.vue                   # Модальное окно ответственных
│       ├── StagesModal.vue                        # Модальное окно стадий
│       └── CarryoverDurationModal.vue             # Модальное окно переходящих тикетов
├── services/
│   └── graph-admission-closure/
│       └── admissionClosureService.js            # Сервис для работы с API
└── components/
    └── filters/
        ├── FiltersPanel.vue                       # Панель фильтров (общий компонент)
        └── WeekPicker.vue                         # Компонент выбора недели

api/
└── graph-1c-admission-closure.php                 # Backend API endpoint
```

### Поток данных

```
1. GraphAdmissionClosureDashboard (инициализация)
   ↓
2. FiltersPanel (выбор недели/фильтров)
   ↓
3. admissionClosureService.fetchAdmissionClosureStats() (запрос к API)
   ↓
4. api/graph-1c-admission-closure.php (обработка на бэкенде)
   ↓
5. Bitrix24 REST API (получение тикетов)
   ↓
6. Нормализация и агрегация данных
   ↓
7. GraphAdmissionClosureChart (отображение графиков)
   ↓
8. Модальные окна (детализация при клике)
```

---

## Структура компонентов

### 1. GraphAdmissionClosureDashboard.vue

**Назначение:** Главный компонент модуля, координирует работу всех подкомпонентов.

**Основные функции:**
- Инициализация и загрузка данных
- Управление состоянием (loading, error, data)
- Обработка фильтров и выбора недели
- Навигация (breadcrumbs, кнопка "Назад")
- Управление модальными окнами

**Props:** Нет (использует router и composables)

**Emits:** Нет (использует router для навигации)

**Состояние:**
```javascript
const isLoading = ref(true);
const error = ref(null);
const chartMeta = ref(null);
const chartData = ref({...});
const showResponsibleModal = ref(false);
const showStagesModal = ref(false);
const showCarryoverModal = ref(false);
const selectedWeek = ref(null);
```

**Методы:**
- `loadData()` — загрузка данных через API
- `updateSelectedWeek(week)` — обновление выбранной недели
- `applyFilters()` — применение фильтров
- `handleBack()` — навигация назад

**Жизненный цикл:**
- `onMounted()` — загрузка данных при монтировании

### 2. GraphAdmissionClosureChart.vue

**Назначение:** Компонент для отображения графиков (линейный, столбчатый, круговая диаграмма).

**Props:**
```javascript
{
  meta: {
    weekNumber: Number,
    weekStartUtc: String,
    weekEndUtc: String,
    weeks: Array  // TASK-048: массив из 4 недель
  },
  data: {
    newTickets: Number,
    closedTickets: Number,
    closedTicketsCreatedThisWeek: Number,  // TASK-047
    closedTicketsCreatedOtherWeek: Number, // TASK-047
    carryoverTickets: Number,
    carryoverTicketsCreatedThisWeek: Number,  // TASK-047
    carryoverTicketsCreatedOtherWeek: Number, // TASK-047
    series: {
      new: Array,
      closed: Array,
      closedCreatedThisWeek: Array,  // TASK-048
      closedCreatedOtherWeek: Array, // TASK-048
      carryover: Array,
      carryoverCreatedThisWeek: Array,  // TASK-048
      carryoverCreatedOtherWeek: Array  // TASK-048
    },
    stages: Array,
    responsible: Array,
    weeksData: Array,  // TASK-048: данные для каждой недели
    currentWeek: Object  // TASK-048: данные текущей недели
  }
}
```

**Emits:**
- `open-responsible` — открытие модального окна ответственных
- `open-stages` — открытие модального окна стадий
- `open-carryover` — открытие модального окна переходящих тикетов

**Состояние:**
```javascript
const chartType = ref('line'); // 'line' | 'bar' | 'doughnut'
```

**Computed:**
- `lineBarData` — данные для линейного/столбчатого графика
- `doughnutData` — данные для круговой диаграммы
- `chartComponent` — компонент графика (Line/Bar/Doughnut)
- `currentWeekData` — данные текущей недели для summary-карточек

**Методы:**
- `handleSummaryClick(type)` — обработка клика на summary-карточки

### 3. ResponsibleModal.vue

**Назначение:** Модальное окно с детализацией по ответственным сотрудникам.

**Props:**
```javascript
{
  isVisible: Boolean,
  responsible: Array,
  closedTicketsCreatedThisWeek: Number,
  closedTicketsCreatedOtherWeek: Number,
  responsibleCreatedThisWeek: Array,  // TASK-047
  responsibleCreatedOtherWeek: Array, // TASK-047
  weekNumber: Number,
  weekStartUtc: String,
  weekEndUtc: String
}
```

**Emits:**
- `close` — закрытие модального окна

**Особенности:**
- Разбивка по категориям: "созданные этой неделей" и "созданные ранее" (TASK-047)
- Отображение списка тикетов для каждого сотрудника (если `includeTickets=true`)

### 4. StagesModal.vue

**Назначение:** Модальное окно с детализацией по стадиям закрытия.

**Props:**
```javascript
{
  isVisible: Boolean,
  weekNumber: Number,
  weekStartUtc: String,
  weekEndUtc: String
}
```

**Emits:**
- `close` — закрытие модального окна

**Особенности:**
- Загружает данные через отдельный API-запрос
- Отображает распределение закрытых тикетов по стадиям

### 5. CarryoverDurationModal.vue

**Назначение:** Модальное окно с детализацией переходящих тикетов по срокам.

**Props:**
```javascript
{
  isVisible: Boolean,
  weekNumber: Number,
  weekStartUtc: String,
  weekEndUtc: String
}
```

**Emits:**
- `close` — закрытие модального окна

**Особенности:**
- Группировка переходящих тикетов по категориям сроков (TASK-044-04)
- Категории: до 1 месяца, менее 1 месяца, более 1 месяца, более 2 месяцев, более полугода, более года

---

## API контракт

### Endpoint

**URL:** `/api/graph-1c-admission-closure.php`  
**Method:** `POST`  
**Content-Type:** `application/json`

### Запрос

```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-15T00:00:00Z",
  "weekEndUtc": "2025-12-21T23:59:59Z",
  "useCache": true,
  "forceRefresh": false,
  "includeTickets": false,
  "includeNewTicketsByStages": false,
  "includeCarryoverTickets": true,
  "includeCarryoverTicketsByDuration": false,
  "debug": false
}
```

**Параметры:**
- `product` (string, обязательный) — фильтр по продукту ("1C")
- `weekStartUtc` (string, опциональный) — начало недели в UTC (ISO-8601)
- `weekEndUtc` (string, опциональный) — конец недели в UTC (ISO-8601)
- `useCache` (boolean, default: true) — использовать кеш
- `forceRefresh` (boolean, default: false) — принудительная перезагрузка
- `includeTickets` (boolean, default: false) — включить тикеты в ответ
- `includeNewTicketsByStages` (boolean, default: false) — включить новые тикеты по стадиям
- `includeCarryoverTickets` (boolean, default: true) — включить переходящие тикеты
- `includeCarryoverTicketsByDuration` (boolean, default: false) — включить переходящие тикеты по срокам
- `debug` (boolean, default: false) — режим отладки

**Примечание:** Если `weekStartUtc` и `weekEndUtc` не указаны, бэкенд вычисляет текущую неделю автоматически.

### Ответ

```json
{
  "success": true,
  "meta": {
    "weekNumber": 51,
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z",
    "currentWeek": {
      "weekNumber": 51,
      "weekStartUtc": "2025-12-15T00:00:00Z",
      "weekEndUtc": "2025-12-21T23:59:59Z"
    },
    "weeks": [
      {
        "weekNumber": 48,
        "weekStartUtc": "2025-11-24T00:00:00Z",
        "weekEndUtc": "2025-11-30T23:59:59Z"
      },
      {
        "weekNumber": 49,
        "weekStartUtc": "2025-12-01T00:00:00Z",
        "weekEndUtc": "2025-12-07T23:59:59Z"
      },
      {
        "weekNumber": 50,
        "weekStartUtc": "2025-12-08T00:00:00Z",
        "weekEndUtc": "2025-12-14T23:59:59Z"
      },
      {
        "weekNumber": 51,
        "weekStartUtc": "2025-12-15T00:00:00Z",
        "weekEndUtc": "2025-12-21T23:59:59Z"
      }
    ]
  },
  "data": {
    "newTickets": 12,
    "closedTickets": 8,
    "closedTicketsCreatedThisWeek": 5,
    "closedTicketsCreatedOtherWeek": 3,
    "carryoverTickets": 15,
    "carryoverTicketsCreatedThisWeek": 7,
    "carryoverTicketsCreatedOtherWeek": 8,
    "series": {
      "new": [10, 11, 12, 12],
      "closed": [6, 7, 8, 8],
      "closedCreatedThisWeek": [4, 5, 5, 5],
      "closedCreatedOtherWeek": [2, 2, 3, 3],
      "carryover": [12, 13, 14, 15],
      "carryoverCreatedThisWeek": [5, 6, 6, 7],
      "carryoverCreatedOtherWeek": [7, 7, 8, 8]
    },
    "weeksData": [
      {
        "weekNumber": 48,
        "newTickets": 10,
        "closedTickets": 6,
        "closedTicketsCreatedThisWeek": 4,
        "closedTicketsCreatedOtherWeek": 2,
        "carryoverTickets": 12,
        "carryoverTicketsCreatedThisWeek": 5,
        "carryoverTicketsCreatedOtherWeek": 7
      },
      {
        "weekNumber": 49,
        "newTickets": 11,
        "closedTickets": 7,
        "closedTicketsCreatedThisWeek": 5,
        "closedTicketsCreatedOtherWeek": 2,
        "carryoverTickets": 13,
        "carryoverTicketsCreatedThisWeek": 6,
        "carryoverTicketsCreatedOtherWeek": 7
      },
      {
        "weekNumber": 50,
        "newTickets": 12,
        "closedTickets": 8,
        "closedTicketsCreatedThisWeek": 5,
        "closedTicketsCreatedOtherWeek": 3,
        "carryoverTickets": 14,
        "carryoverTicketsCreatedThisWeek": 6,
        "carryoverTicketsCreatedOtherWeek": 8
      },
      {
        "weekNumber": 51,
        "newTickets": 12,
        "closedTickets": 8,
        "closedTicketsCreatedThisWeek": 5,
        "closedTicketsCreatedOtherWeek": 3,
        "carryoverTickets": 15,
        "carryoverTicketsCreatedThisWeek": 7,
        "carryoverTicketsCreatedOtherWeek": 8
      }
    ],
    "currentWeek": {
      "weekNumber": 51,
      "newTickets": 12,
      "closedTickets": 8,
      "closedTicketsCreatedThisWeek": 5,
      "closedTicketsCreatedOtherWeek": 3,
      "carryoverTickets": 15,
      "carryoverTicketsCreatedThisWeek": 7,
      "carryoverTicketsCreatedOtherWeek": 8
    },
    "stages": [
      {
        "stageId": "DT140_12:SUCCESS",
        "stageName": "Успешное закрытие",
        "count": 5
      },
      {
        "stageId": "DT140_12:FAIL",
        "stageName": "Отклонено",
        "count": 2
      },
      {
        "stageId": "DT140_12:UC_0GBU8Z",
        "stageName": "Закрыли без задачи",
        "count": 1
      }
    ],
    "responsible": [
      {
        "id": 123,
        "name": "Иванов Иван",
        "count": 4,
        "tickets": []  // если includeTickets=true
      },
      {
        "id": 456,
        "name": "Петров Пётр",
        "count": 3,
        "tickets": []
      }
    ],
    "responsibleCreatedThisWeek": [
      {
        "id": 123,
        "name": "Иванов Иван",
        "count": 3,
        "tickets": []
      }
    ],
    "responsibleCreatedOtherWeek": [
      {
        "id": 456,
        "name": "Петров Пётр",
        "count": 2,
        "tickets": []
      }
    ],
    "carryoverTicketsByDuration": [
      {
        "durationCategory": "up_to_month",
        "durationLabel": "До 1 месяца",
        "color": "#28a745",
        "count": 5,
        "tickets": []
      },
      {
        "durationCategory": "more_than_month",
        "durationLabel": "Более 1 месяца",
        "color": "#ffc107",
        "count": 3,
        "tickets": []
      }
    ]
  }
}
```

**Структура ответа:**
- `meta` — метаданные о неделях
- `data` — агрегированные данные
- `series` — массивы для графиков (4 недели: текущая + 3 предыдущие)
- `weeksData` — детальные данные для каждой недели
- `currentWeek` — данные текущей недели (для summary-карточек)

---

## Логика работы с данными

### Нормализация ответа API

**Файл:** `vue-app/src/services/graph-admission-closure/admissionClosureService.js`

**Функция:** `normalizeResponse(raw)`

**Назначение:** Гарантирует наличие всех полей в ответе, даже если бэкенд вернул неполные данные.

**Особенности:**
- Обработка разных форматов ответа (`raw.data`, `raw.result`, `raw`)
- Установка значений по умолчанию для всех полей
- Поддержка обратной совместимости (старые форматы ответа)

### Определение текущей недели

**Приоритет данных для `currentWeekData`:**
1. `series[последний]` — если есть данные в series
2. `currentWeek` — если есть в data
3. `weeksData[последний]` — последний элемент из weeksData
4. `data` — прямые данные из ответа

**Логика:** Используется для summary-карточек, чтобы гарантировать соответствие данных графику.

### Фильтрация по продукту

**Принцип:** Фильтр по `UF_CRM_7_TYPE_PRODUCT = "1C"` применяется **первым шагом** на бэкенде, до любых расчётов.

**Нормализация:**
- Поле может быть массивом, строкой (через запятую) или объектом
- Нормализация: приведение к верхнему регистру, замена "С" на "C"
- Проверка наличия "1C" в нормализованном массиве

---

## Работа с неделями

### Формат недели ISO-8601

**Определение:**
- Неделя начинается в **понедельник** (день 1)
- Неделя заканчивается в **воскресенье** (день 7)
- Все расчёты в **UTC**

**Расчёт на бэкенде:**
```php
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
$isoYear = (int)$now->format('o');
$isoWeek = (int)$now->format('W');

$weekStart = (new DateTimeImmutable('now', new DateTimeZone('UTC')))
    ->setISODate($isoYear, $isoWeek, 1)
    ->setTime(0, 0, 0);
$weekEnd = $weekStart
    ->modify('+6 days')
    ->setTime(23, 59, 59);
```

**Расчёт на фронтенде (для WeekPicker):**
```javascript
function getWeekBounds(date) {
  const d = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Понедельник
  
  const weekStart = new Date(Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    diff, 0, 0, 0
  ));
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  weekEnd.setUTCHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}
```

### Компонент WeekPicker

**Назначение:** Выбор недели через выпадающий список с барабаном прокрутки.

**Особенности:**
- Генерация списка недель (52 недели назад + 4 недели вперёд)
- Автоматическая прокрутка к выбранной неделе
- Применение выбора только при нажатии "Применить"
- Закрытие при клике вне компонента

**Props:**
```javascript
{
  selectedWeek: {
    weekNumber: Number,
    startUtc: String,
    endUtc: String
  },
  weeksCount: Number  // default: 52
}
```

**Emits:**
- `update:selectedWeek` — обновление выбранной недели
- `change` — изменение выбранной недели

---

## Фильтрация

### Компонент FiltersPanel

**Режим работы для модуля:**
- `hideStages: true` — скрыть селектор этапов
- `weekPickerMode: true` — включить режим выбора недели
- `selectedWeek` — выбранная неделя
- `weeksCount: 52` — количество недель для отображения

**Фильтры:**
- **Сотрудники:** выбор сотрудников (или "Все")
- **Период:** выбор недели через WeekPicker (вместо обычного выбора периода)

**Применение фильтров:**
- При изменении недели или фильтров вызывается `applyFilters()`
- `applyFilters()` вызывает `loadData()` с новыми параметрами

---

## Графики

### Типы графиков

1. **Линейный график** (`chartType: 'line'`)
   - Отображает динамику по неделям (4 недели)
   - Серии: новые, закрытые (все), закрытые (созданные этой неделей), закрытые (созданные другой неделей), переходящие (все), переходящие (созданные этой неделей), переходящие (созданные другой неделей)
   - Пунктирные линии для разбивок (TASK-047, TASK-048)

2. **Столбчатый график** (`chartType: 'bar'`)
   - Сравнение значений по неделям
   - Те же серии, что и в линейном графике

3. **Круговая диаграмма** (`chartType: 'doughnut'`)
   - Сравнение "Новые" vs "Закрытые" vs "Переходящие" за текущую неделю
   - Использует данные из `currentWeekData`

### Библиотека графиков

**Используется:** `vue-chartjs` (обёртка для Chart.js)

**Компоненты:**
- `Line` — линейный график
- `Bar` — столбчатый график
- `Doughnut` — круговая диаграмма

### Настройки графиков

**Опции:**
```javascript
{
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      enabled: true,
      callbacks: {
        title: (items) => {
          // Показ информации о неделе в tooltip
        }
      }
    },
    legend: { position: 'top' }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 }
    },
    x: {
      ticks: {
        maxRotation: 45,
        minRotation: 45
      }
    }
  }
}
```

### Цветовая схема

**Файл:** `vue-app/src/utils/chart-config.js`

**Цвета:**
- `primary` — новые тикеты (#007bff)
- `success` — закрытые тикеты (#28a745)
- `successLight` — закрытые (созданные этой неделей) (#6cbd45)
- `warning` — закрытые (созданные другой неделей) (#ffc107)
- `carryover` — переходящие тикеты (#ff9800)
- `carryoverLight` — переходящие (созданные этой неделей) (#ffb74d)
- `carryoverDark` — переходящие (созданные другой неделей) (#f57c00)

---

## Модальные окна

### ResponsibleModal

**Открытие:** Клик на summary-карточку "Закрытые" или кнопку "Ответственные"

**Содержимое:**
- Список ответственных сотрудников с количеством закрытых тикетов
- Разбивка по категориям: "созданные этой неделей" и "созданные ранее" (TASK-047)
- Список тикетов для каждого сотрудника (если `includeTickets=true`)

**Особенности:**
- Отображает неделю в заголовке
- Обработка пустых данных (сообщение "Нет данных")

### StagesModal

**Открытие:** Клик на summary-карточку "Новые" или кнопку "Стадии"

**Содержимое:**
- Распределение новых тикетов по стадиям
- Загружает данные через отдельный API-запрос с `includeNewTicketsByStages=true`

**Особенности:**
- Отображает неделю в заголовке
- Цветовое кодирование стадий

### CarryoverDurationModal

**Открытие:** Клик на summary-карточку "Переходящие" или кнопку "Переходящие"

**Содержимое:**
- Распределение переходящих тикетов по категориям сроков
- Категории: до 1 месяца, менее 1 месяца, более 1 месяца, более 2 месяцев, более полугода, более года
- Загружает данные через отдельный API-запрос с `includeCarryoverTicketsByDuration=true`

**Особенности:**
- Отображает неделю в заголовке
- Цветовое кодирование категорий сроков

---

## Навигация и доступы

### Маршрут

**Путь:** `/dashboard/graph-admission-closure`  
**Имя:** `dashboard-graph-admission-closure`  
**Компонент:** `GraphAdmissionClosureDashboard`

### Breadcrumbs

```
Дашборд сектора 1С / График состояния / График приёма и закрытий
```

**Компоненты:**
- Кнопка "Назад" (←) — возврат к предыдущей странице
- Breadcrumbs — кликабельные ссылки на предыдущие модули

### Доступы

**Файл:** `vue-app/src/config/access-config.js`

**Разрешенные отделы:**
- `369` — Битрикс24 отдел
- `366` — Сектор 1С
- `7` — Голова ИТ отдела

**Проверка доступа:**
- Выполняется в роутере перед переходом на маршрут
- Используется функция `isDepartmentAllowed(departmentId)`

---

## Стилизация

### CSS переменные

**Используются переменные Bitrix24 UI:**
- `--b24-primary` — основной цвет (#007bff)
- `--b24-success` — цвет успеха (#28a745)
- `--b24-warning` — цвет предупреждения (#ffc107)
- `--b24-danger` — цвет ошибки (#dc3545)
- `--b24-text-primary` — основной текст (#111827)
- `--b24-text-secondary` — вторичный текст (#6b7280)
- `--b24-bg-white` — белый фон (#ffffff)
- `--b24-bg-light` — светлый фон (#f9fafb)
- `--b24-border-light` — светлая граница (#e5e7eb)
- `--spacing-*` — отступы (xs, sm, md, lg, xl)
- `--radius-*` — радиусы скругления (sm, md, lg)
- `--shadow-*` — тени (sm, md, lg)

### Адаптивность

**Breakpoints:**
- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

**Особенности:**
- Графики адаптируются под ширину экрана
- Таблицы становятся горизонтально прокручиваемыми на мобильных
- Модальные окна занимают всю ширину на мобильных

---

## Обработка ошибок

### Состояния загрузки

**Loading:**
```vue
<LoadingSpinner v-if="isLoading" message="Загрузка данных..." />
```

**Error:**
```vue
<StatusMessage
  v-if="error"
  type="error"
  title="Ошибка загрузки"
  :message="error.message"
/>
```

**Пустые данные:**
- Графики показывают нулевые значения
- Summary-карточки показывают 0
- Модальные окна показывают сообщение "Нет данных"

### Обработка ошибок API

**В сервисе:**
```javascript
try {
  const response = await fetch(endpoint, {...});
  if (!response.ok) {
    throw new Error(`Ошибка запроса (${response.status})`);
  }
  const json = await response.json();
  if (json?.success === false) {
    throw new Error(json.message || 'Бэкенд вернул ошибку');
  }
  return normalizeResponse(json);
} catch (err) {
  console.error('[admissionClosureService] error:', err);
  throw err;
}
```

**В компоненте:**
```javascript
try {
  const { meta, data } = await fetchAdmissionClosureStats({...});
  chartMeta.value = meta;
  chartData.value = data;
} catch (err) {
  error.value = err instanceof Error ? err : new Error('Неизвестная ошибка загрузки');
  console.error('[GraphAdmissionClosureDashboard] loadData error:', err);
} finally {
  isLoading.value = false;
}
```

---

## Ключевые принципы работы модуля

1. **Фильтрация по продукту — первый шаг:** Все расчёты выполняются только для тикетов с `UF_CRM_7_TYPE_PRODUCT = "1C"`

2. **Неделя ISO-8601 (UTC):** Все расчёты дат выполняются в UTC, неделя начинается в понедельник

3. **Агрегация по неделям:** Данные агрегируются по неделям (4 недели: текущая + 3 предыдущие)

4. **Разбивка по критерию создания:** Закрытые и переходящие тикеты разбиваются на "созданные этой неделей" и "созданные ранее" (TASK-047)

5. **Нормализация данных:** Все данные нормализуются в сервисе для гарантии наличия всех полей

6. **Обработка пустых данных:** Все компоненты корректно обрабатывают отсутствие данных

7. **Модульность:** Каждый компонент изолирован и переиспользуем

---

## История изменений

- **2025-12-15 12:23 (UTC+3, Брест):** Создан модуль (TASK-041)
- **2025-12-15 18:00 (UTC+3, Брест):** Модуль завершён
- **2025-12-16 10:00 (UTC+3, Брест):** Создан гайдлайн модуля

---

## Связанные документы

- [TASK-041: График приёма и закрытий сектора 1С](../TASKS/TASK-041-graph-1c-admission-closure.md)
- [TASK-047: Разбивка закрытых и переходящих тикетов по критерию создания](../TASKS/TASK-047-closed-carryover-breakdown.md)
- [TASK-048: Линейный график за 4 недели](../TASKS/TASK-048-line-chart-4-weeks-no-popups.md)
- [TASK-044: Переходящие тикеты](../TASKS/TASK-044-carryover-tickets.md)

