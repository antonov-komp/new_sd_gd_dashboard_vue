# Диагностика проблемы "нет данных о трудозатратах"

**Дата создания:** 2025-12-17 15:00 (UTC+3, Брест)  
**Связанная задача:** TASK-050  
**Проблема:** Модуль отображает сообщение "нет данных о трудозатратах за выбранный период"

---

## Шаги диагностики

### 1. Проверка логов сервера

**Расположение логов:**
- Обычно: `/var/log/apache2/error.log` или `/var/log/nginx/error.log`
- Или: `/var/www/back/logs/` (если настроено логирование в проект)

**Что искать:**
```bash
# Поиск логов модуля
grep -i "TimeTracking" /var/log/apache2/error.log | tail -50

# Или через journalctl (если используется systemd)
journalctl -u apache2 -f | grep TimeTracking
```

**Ожидаемые логи:**
```
[TimeTracking] Getting sector 1C employees
[TimeTracking] Found X employees in sector 1C
[TimeTracking] Requesting elapsed time records: employees=123,456, period=2025-12-01 to 2025-12-17
[TimeTracking] Trying method: tasks.elapseditem.getlist
[TimeTracking] API response structure: {...}
[TimeTracking] Received X items
```

### 2. Проверка метода API Bitrix24

**Проблема:** Метод `tasks.elapseditem.getlist` может не существовать или иметь другое название.

**Добавлено в код:**
- Автоматическая попытка разных вариантов методов:
  - `tasks.elapseditem.getlist`
  - `tasks.elapseditem.list`
  - `tasks.task.elapseditem.getlist`
  - `tasks.task.elapseditem.list`

**Проверка через лог:**
- Если видите `METHOD_NOT_FOUND` - метод API неправильный
- Если видите другую ошибку - проблема в параметрах запроса

### 3. Проверка наличия данных в Bitrix24

**Возможные причины отсутствия данных:**
1. **Нет записей трудозатрат за период:**
   - Сотрудники не фиксировали время в задачах
   - Период выбран неправильно (слишком старый или будущий)

2. **Неправильный фильтр по сотрудникам:**
   - Сотрудники не в отделе 366 (Сектор 1С)
   - Сотрудники неактивны (`ACTIVE != 'Y'`)

3. **Неправильный формат дат:**
   - API может требовать другой формат дат
   - Проблема с часовым поясом (UTC vs локальное время)

### 4. Ручная проверка API

**Создать тестовый скрипт:** `api/test-time-tracking-api.php`

```php
<?php
require_once __DIR__ . '/../crest.php';

// Тест 1: Получение сотрудников
$employees = CRest::call('user.get', [
    'filter' => [
        'ACTIVE' => 'Y',
        'UF_DEPARTMENT' => 366
    ],
    'select' => ['ID', 'NAME', 'LAST_NAME']
]);

echo "=== Сотрудники сектора 1С ===\n";
print_r($employees);

// Тест 2: Получение трудозатрат (пробуем разные методы)
$methods = [
    'tasks.elapseditem.getlist',
    'tasks.elapseditem.list',
    'tasks.task.elapseditem.getlist'
];

foreach ($methods as $method) {
    echo "\n=== Тест метода: $method ===\n";
    $result = CRest::call($method, [
        'filter' => [
            '>=CREATED_DATE' => '2025-12-01',
            '<=CREATED_DATE' => '2025-12-17'
        ],
        'select' => ['*'],
        'start' => 0
    ]);
    
    if (isset($result['error'])) {
        echo "Ошибка: " . $result['error'] . " - " . ($result['error_description'] ?? '') . "\n";
    } else {
        echo "Успех! Получено записей: " . count($result['result'] ?? []) . "\n";
        if (!empty($result['result'])) {
            echo "Пример записи:\n";
            print_r($result['result'][0]);
        }
    }
}
```

**Запуск:**
```bash
php api/test-time-tracking-api.php
```

### 5. Проверка через Postman/curl

**Прямой запрос к Bitrix24 API:**

```bash
curl -X POST "https://your-portal.bitrix24.ru/rest/tasks.elapseditem.getlist" \
  -H "Content-Type: application/json" \
  -d '{
    "filter": {
      ">=CREATED_DATE": "2025-12-01",
      "<=CREATED_DATE": "2025-12-17"
    },
    "select": ["*"],
    "start": 0
  }'
```

**Замена `your-portal.bitrix24.ru` на ваш портал и добавление токена доступа.**

### 6. Альтернативный способ получения данных

**Если метод `tasks.elapseditem.*` не работает, можно получить данные через задачи:**

```php
// Получить задачи с трудозатратами
$tasks = CRest::call('tasks.task.list', [
    'filter' => [
        'CREATED_BY' => $employeeIds,
        '>=CREATED_DATE' => $periodStart->format('Y-m-d'),
        '<=CREATED_DATE' => $periodEnd->format('Y-m-d')
    ],
    'select' => ['ID', 'TITLE', 'ELAPSED_TIME', 'CREATED_DATE', 'CREATED_BY']
]);
```

**Проблема:** Поле `ELAPSED_TIME` может быть агрегированным, а не по записям.

---

## Решения

### Решение 1: Исправление метода API

**Если метод неправильный:**
1. Определить правильный метод через документацию Bitrix24
2. Обновить код в `api/tickets-time-tracking-sector-1c.php`
3. Обновить документацию в `DOCS/ANALYSIS/time-tracking-api-analysis.md`

### Решение 2: Исправление формата фильтра

**Если проблема в формате запроса:**
1. Проверить документацию API для точного формата фильтров
2. Обновить параметры запроса в функции `getElapsedTimeRecords()`

### Решение 3: Использование альтернативного метода

**Если метод `tasks.elapseditem.*` не существует:**
1. Использовать `tasks.task.list` с полем `ELAPSED_TIME`
2. Или использовать другой метод из документации Bitrix24

### Решение 4: Проверка данных в Bitrix24

**Если данных действительно нет:**
1. Проверить, что сотрудники фиксируют время в задачах
2. Проверить период (расширить диапазон дат)
3. Проверить фильтр по отделу (убедиться, что сотрудники в отделе 366)

---

## Следующие шаги

1. **Проверить логи сервера** - найти точную ошибку API
2. **Создать тестовый скрипт** - проверить работу API напрямую
3. **Проверить документацию Bitrix24** - найти правильный метод API
4. **Обновить код** - исправить метод или формат запроса
5. **Проверить данные** - убедиться, что данные есть в Bitrix24

---

## История правок

- **2025-12-17 15:00 (UTC+3, Брест):** Создан документ с инструкциями по диагностике проблемы отсутствия данных

