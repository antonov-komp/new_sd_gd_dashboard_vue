# API: Учёт времени сектора 1С

**Endpoint:** `POST /api/tickets-time-tracking-sector-1c.php`  
**Версия:** 2.0 (после рефакторинга)  
**Дата обновления:** 2025-12-23 18:30 (UTC+3, Брест)

---

## 📋 Описание

API для получения данных учёта времени сотрудников сектора 1С за период (4 недели по ISO-8601). API возвращает агрегированные данные по неделям и сотрудникам, а также детальную информацию о задачах (опционально).

---

## 🔌 Endpoint

```
POST /api/tickets-time-tracking-sector-1c.php
```

**Content-Type:** `application/json`

---

## 📥 Параметры запроса

### Обязательные параметры

| Параметр | Тип | Описание |
|----------|-----|----------|
| `product` | string | Должен быть `'1C'` (фильтр по сектору 1С) |

### Опциональные параметры

| Параметр | Тип | Описание | По умолчанию |
|----------|-----|----------|--------------|
| `weekStartUtc` | string | Начало недели в формате ISO-8601 (UTC) | Текущая неделя |
| `weekEndUtc` | string | Конец недели в формате ISO-8601 (UTC) | Текущая неделя |
| `includeTaskDetails` | boolean | Включить детальную информацию о задачах | `false` |
| `taskIds` | array\<int\> | Фильтр по ID задач (только при `includeTaskDetails=true`) | Все задачи |
| `page` | int | Номер страницы (только при `includeTaskDetails=true`) | `1` |
| `perPage` | int | Количество задач на страницу (только при `includeTaskDetails=true`) | `10` |

---

## 📤 Структура ответа

### Успешный ответ

```json
{
  "success": true,
  "meta": {
    "weekNumber": 51,
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z",
    "totalWeeks": 4,
    "sector1CEmployeesCount": 15
  },
  "data": {
    "totalElapsedTime": 120.5,
    "totalElapsedTimeUnit": "hours",
    "totalRecordsCount": 450,
    "weeks": [
      {
        "weekNumber": 48,
        "weekStartUtc": "2025-11-24T00:00:00Z",
        "weekEndUtc": "2025-11-30T23:59:59Z",
        "totalElapsedTime": 30.2,
        "recordsCount": 110,
        "employees": [
          {
            "id": 123,
            "name": "Иванов Иван Иванович",
            "elapsedTime": 15.5,
            "recordsCount": 50,
            "tasksCount": 10,
            "ticketsCount": 8,
            "tasks": [
              {
                "id": 456,
                "elapsedTime": 5.2,
                "ticket": {
                  "id": 789,
                  "title": "Тикет #789",
                  "createdWeek": 48
                }
              }
            ]
          }
        ]
      }
    ],
    "employeesSummary": [
      {
        "id": 123,
        "name": "Иванов Иван Иванович",
        "totalElapsedTime": 60.5,
        "totalRecordsCount": 200,
        "totalTasksCount": 40,
        "totalTicketsCount": 30
      }
    ],
    "tasks": [],  // Только если includeTaskDetails=true
    "pagination": {}  // Только если includeTaskDetails=true
  }
}
```

### Ответ с детальными данными о задачах

Если `includeTaskDetails=true`, в ответе добавляются:

```json
{
  "data": {
    "tasks": [
      {
        "id": 456,
        "title": "Задача #456",
        "startDate": "2025-12-15T10:00:00Z",
        "deadline": "2025-12-20T18:00:00Z",
        "closedDate": null,
        "status": 5,
        "stageId": 3,
        "responsibleId": 123,
        "createdBy": 456,
        "elapsedTime": 5.2,
        "ticket": {
          "id": 789,
          "title": "Тикет #789",
          "createdTime": "2025-12-10T12:00:00Z",
          "createdWeek": 50,
          "stageId": "NEW",
          "ufSubject": "Тема тикета",
          "ufCrm7TypeProduct": "1C",
          "ufSlaBlockStr": "SLA блок",
          "ufSlaServiceStr": "SLA сервис",
          "ufActionStr": "Действие",
          "ufCrm7UfPriority": "HIGH"
        }
      }
    ],
    "pagination": {
      "totalTasks": 100,
      "currentPage": 1,
      "perPage": 10,
      "totalPages": 10
    }
  }
}
```

### Ошибки

#### Ошибка валидации (400)

```json
{
  "error": "invalid_request",
  "error_description": "Only product=1C is supported"
}
```

#### Внутренняя ошибка (500)

```json
{
  "error": "internal_error",
  "error_description": "An internal error occurred"
}
```

---

## 📝 Примеры запросов

### Базовый запрос

```bash
curl -X POST https://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{"product": "1C"}'
```

### Запрос с указанием периода

```bash
curl -X POST https://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "weekStartUtc": "2025-12-15T00:00:00Z",
    "weekEndUtc": "2025-12-21T23:59:59Z"
  }'
```

### Запрос с детальными данными о задачах

```bash
curl -X POST https://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "page": 1,
    "perPage": 20
  }'
```

### Запрос с фильтрацией задач

```bash
curl -X POST https://example.com/api/tickets-time-tracking-sector-1c.php \
  -H "Content-Type: application/json" \
  -d '{
    "product": "1C",
    "includeTaskDetails": true,
    "taskIds": [123, 456, 789]
  }'
```

---

## ⚠️ Обработка ошибок

### Коды ошибок

| Код | Описание |
|-----|----------|
| `invalid_request` | Невалидные параметры запроса |
| `internal_error` | Внутренняя ошибка сервера |
| `service_unavailable` | Сервис недоступен |

### Примеры ошибок

#### Невалидный product

```json
{
  "error": "invalid_request",
  "error_description": "Only product=1C is supported"
}
```

#### Невалидная дата

```json
{
  "error": "invalid_request",
  "error_description": "weekStartUtc must be a valid date string"
}
```

---

## 🔍 Особенности реализации

### Недели ISO-8601

- Неделя начинается с понедельника
- Все расчёты выполняются в UTC
- По умолчанию анализируются 4 недели (текущая + 3 предыдущие)

### Матчинг задач с тикетами

- Используется поле `ufCrmTask` из задачи
- Формат: `["T8c_3093"]`, где `8c` = 140 (hex), `3093` = ID тикета
- Альтернативные варианты: `ufCrmTicketId`, `UF_CRM_TICKET_ID`, `UF_CRM_140_ID`

### Агрегация данных

- Трудозатраты агрегируются по неделям и сотрудникам
- Подсчитываются уникальные задачи и тикеты
- Все значения округляются до 2 знаков после запятой

---

## 🔗 Связанные документы

- **Архитектура модуля:** `DOCS/ARCHITECTURE/tickets-time-tracking-architecture.md`
- **Руководство разработчика:** `DOCS/DEVELOPER-GUIDE/tickets-time-tracking-development.md`
- **План рефакторинга:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`

---

**История правок:**
- 2025-12-23 18:30 (UTC+3, Брест): Создана API-документация после рефакторинга


