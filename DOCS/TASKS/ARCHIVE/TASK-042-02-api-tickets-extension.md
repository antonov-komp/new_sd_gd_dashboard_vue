# TASK-042-02: Расширение API для получения тикетов сотрудника

**Дата создания:** 2025-12-15 21:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 2 из TASK-042

## Цель этапа
Расширить API endpoint `graph-1c-admission-closure.php` для возврата тикетов каждого сотрудника при запросе с параметром `includeTickets: true`.

## Контекст
- **Текущее состояние:** API возвращает только агрегаты: `newTickets`, `closedTickets`, `series`, `stages`, `responsible[]` (без тикетов)
- **Требуется:** При запросе с `includeTickets: true` возвращать массив `tickets[]` для каждого сотрудника в `responsible[]`
- **Использование:** Тикеты будут отображаться в попапе второго уровня при клике на сотрудника

## Задачи этапа

### 1) Анализ текущей реализации API
- Изучить файл `api/graph-1c-admission-closure.php`
- Понять, как формируется массив `responsible[]`
- Определить, где сохраняются данные тикетов для агрегации

### 2) Добавление параметра `includeTickets`
- Добавить обработку параметра `includeTickets` в запросе
- По умолчанию `includeTickets: false` (для обратной совместимости)
- Если `includeTickets: true`, сохранять полные данные тикетов

### 3) Модификация логики агрегации
- При агрегации по ответственным сохранять полные данные тикетов (не только счёт)
- Фильтровать тикеты по сотруднику (`assignedById`) и закрывающим стадиям
- Фильтровать по `movedTime` в диапазоне `[weekStartUtc, weekEndUtc]`

### 4) Формирование ответа с тикетами
- Для каждого сотрудника в `responsible[]` добавить массив `tickets[]`
- Включить только закрытые тикеты сотрудника
- Включить необходимые поля: `id`, `title`, `createdTime`, `movedTime`, `stageId`, `assignedById`

## Технические требования

### Входные параметры API

**Текущий формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "useCache": true,
  "forceRefresh": false,
  "debug": false
}
```

**Расширенный формат:**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeTickets": true,  // новый параметр
  "useCache": true,
  "forceRefresh": false,
  "debug": false
}
```

### Формат ответа API

**Текущий формат:**
```json
{
  "success": true,
  "meta": { ... },
  "data": {
    "responsible": [
      {
        "id": 1006,
        "name": "ID 1006",
        "count": 10
      }
    ]
  }
}
```

**Расширенный формат (при `includeTickets: true`):**
```json
{
  "success": true,
  "meta": { ... },
  "data": {
    "responsible": [
      {
        "id": 1006,
        "name": "ID 1006",
        "count": 10,
        "tickets": [
          {
            "id": 12345,
            "title": "Название тикета",
            "createdTime": "2025-12-10T10:00:00Z",
            "movedTime": "2025-12-12T15:30:00Z",
            "stageId": "DT140_12:SUCCESS",
            "assignedById": 1006
          }
        ]
      }
    ]
  }
}
```

### Логика фильтрации тикетов

**Для каждого сотрудника:**
1. Фильтр по `assignedById` = ID сотрудника
2. Фильтр по `stageId` в списке закрывающих стадий: `DT140_12:SUCCESS`, `DT140_12:FAIL`, `DT140_12:UC_0GBU8Z`
3. Фильтр по `movedTime` в диапазоне `[weekStartUtc, weekEndUtc]`

**Оптимизация:**
- Загружать тикеты только для сотрудников, у которых `count > 0`
- Использовать те же два запроса к Bitrix24 (созданные + закрытые), но сохранять полные данные тикетов

## Ступенчатые подзадачи

1. **Анализ текущего кода**
   - Изучить `api/graph-1c-admission-closure.php`
   - Найти место, где формируется `responsibleAgg`
   - Понять, где сохраняются данные тикетов

2. **Добавление параметра `includeTickets`**
   - Добавить чтение параметра из запроса: `$includeTickets = isset($body['includeTickets']) ? (bool)$body['includeTickets'] : false;`
   - Убедиться, что по умолчанию `false` (обратная совместимость)

3. **Модификация логики агрегации**
   - При агрегации по ответственным сохранять массив тикетов для каждого сотрудника
   - Фильтровать тикеты по условиям (сотрудник, стадия, дата)
   - Сохранять только необходимые поля тикета

4. **Формирование ответа**
   - Добавить `tickets[]` в каждый элемент `responsible[]` (если `includeTickets: true`)
   - Если `includeTickets: false`, не включать `tickets[]` (или включать пустой массив)

5. **Тестирование**
   - Проверить работу API с `includeTickets: false` (обратная совместимость)
   - Проверить работу API с `includeTickets: true` (новый функционал)
   - Проверить фильтрацию тикетов по сотруднику и стадиям
   - Проверить фильтрацию по дате закрытия

## Пример реализации

**Файл:** `api/graph-1c-admission-closure.php`

```php
// Чтение параметра
$includeTickets = isset($body['includeTickets']) ? (bool)$body['includeTickets'] : false;

// В цикле агрегации по ответственным
foreach ($tickets as $ticket) {
    // ... существующая логика ...
    
    // Закрытые за неделю
    if ($stageId && in_array($stageId, $closingStages, true) && isInRange($movedTime, $weekStart, $weekEnd)) {
        $closedCount++;
        
        // ... существующая логика агрегации по стадиям ...
        
        // Агрегация по ответственным
        $responsibleId = $assignedRaw;
        if (is_array($responsibleId)) {
            $responsibleId = $responsibleId['id'] ?? $responsibleId['ID'] ?? $responsibleId['value'] ?? null;
        }
        $responsibleId = $responsibleId ? (int)$responsibleId : null;
        $responsibleKey = ($responsibleId === null || $responsibleId === $keeperId) ? 'unassigned' : (string)$responsibleId;

        if (!isset($responsibleAgg[$responsibleKey])) {
            $responsibleAgg[$responsibleKey] = [
                'id' => $responsibleId,
                'name' => ($responsibleId === null || $responsibleId === $keeperId) ? 'Не назначен' : ('ID ' . $responsibleId),
                'count' => 0,
                'tickets' => [] // Добавить массив для тикетов
            ];
        }
        $responsibleAgg[$responsibleKey]['count']++;
        
        // Если нужно включить тикеты, сохранить данные тикета
        if ($includeTickets) {
            $responsibleAgg[$responsibleKey]['tickets'][] = [
                'id' => (int)$ticket['id'],
                'title' => $ticket['title'] ?? 'Без названия',
                'createdTime' => $ticket['createdTime'] ?? null,
                'movedTime' => $movedTime,
                'stageId' => $stageId,
                'assignedById' => $responsibleId
            ];
        }
    }
}

// В формировании ответа
'responsible' => array_map(function ($item) use ($includeTickets) {
    $result = [
        'id' => $item['id'],
        'name' => $item['name'],
        'count' => $item['count']
    ];
    
    // Включить тикеты только если запрошено
    if ($includeTickets && isset($item['tickets'])) {
        $result['tickets'] = $item['tickets'];
    }
    
    return $result;
}, array_values($responsibleAgg))
```

## Критерии приёмки этапа

- [ ] API принимает параметр `includeTickets` (опциональный, по умолчанию `false`)
- [ ] При `includeTickets: false` API работает как раньше (обратная совместимость)
- [ ] При `includeTickets: true` API возвращает `tickets[]` для каждого сотрудника в `responsible[]`
- [ ] Тикеты фильтруются по сотруднику (`assignedById`)
- [ ] Тикеты фильтруются по закрывающим стадиям (`DT140_12:SUCCESS`, `DT140_12:FAIL`, `DT140_12:UC_0GBU8Z`)
- [ ] Тикеты фильтруются по `movedTime` в диапазоне `[weekStartUtc, weekEndUtc]`
- [ ] В ответе включены необходимые поля тикета: `id`, `title`, `createdTime`, `movedTime`, `stageId`, `assignedById`
- [ ] Тикеты загружаются только для сотрудников с `count > 0` (оптимизация)

## Дополнительные уточнения

### Производительность
- При `includeTickets: false` не сохранять данные тикетов (экономия памяти)
- Использовать те же два запроса к Bitrix24 (созданные + закрытые)
- Не делать дополнительных запросов к API

### Обратная совместимость
- По умолчанию `includeTickets: false`
- Если параметр не передан, API работает как раньше
- Не ломать существующий функционал

## История правок

- 2025-12-15 21:15 (UTC+3, Брест): Создан этап 2 задачи TASK-042

