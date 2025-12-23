# TASK-063: Разбивка переходящих тикетов на три категории (этой недели, предыдущей недели, остальные)

**Дата создания:** 2025-12-23 10:57 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связанные задачи:** TASK-044, TASK-047, TASK-062

---

## 📋 Описание

Расширить разбивку переходящих тикетов в блоке «ПЕРЕХОДЯЩИЕ» модуля «График приёма и закрытий сектора 1С». Вместо двух категорий (этой недели и предыдущих) добавить три категории: **этой недели**, **предыдущей недели** и **остальные** (более ранние недели).

---

## 🎯 Цель

В текущей реализации блок «ПЕРЕХОДЯЩИЕ» показывает:
1. **Основная цифра** — общее количество переходящих тикетов
2. **Этой недели** — переходящие тикеты, созданные в текущую неделю
3. **Предыдущих** — переходящие тикеты, созданные до начала текущей недели (все предыдущие недели вместе)

**Проблема:** Категория «Предыдущих» объединяет тикеты предыдущей недели и более ранние недели, что не позволяет видеть отдельно тикеты именно предыдущей недели.

**Требуется:** Разбить категорию «Предыдущих» на две:
- **Предыдущей недели** — переходящие тикеты, созданные в предыдущую неделю (неделя N-1)
- **Остальные** — переходящие тикеты, созданные в более ранние недели (неделя N-2 и старше)

---

## 📊 Текущая структура блока «ПЕРЕХОДЯЩИЕ»

### Визуальное представление (текущее)

```
┌─────────────────────────────────────┐
│ Переходящие                         │
│                                     │
│         [150]  ← Основная цифра     │
│         ↑↓ +5%                      │
│                                     │
│  ✓ 45  этой недели                 │
│  ↻ 105 предыдущих                  │
└─────────────────────────────────────┘
```

### Текущие поля данных

- `carryoverTickets` — общее количество (150)
- `carryoverTicketsCreatedThisWeek` — этой недели (45)
- `carryoverTicketsCreatedOtherWeek` — предыдущих (105)

---

## 🎨 Новая структура блока «ПЕРЕХОДЯЩИЕ»

### Визуальное представление (новая)

```
┌─────────────────────────────────────┐
│ Переходящие                         │
│                                     │
│         [150]  ← Основная цифра     │
│         ↑↓ +5%                      │
│                                     │
│  ✓ 45  этой недели                 │
│  ↻ 35  предыдущей недели            │
│  ↻ 70  остальные                    │
└─────────────────────────────────────┘
```

### Новые поля данных

- `carryoverTickets` — общее количество (150)
- `carryoverTicketsCreatedThisWeek` — этой недели (45)
- `carryoverTicketsCreatedPreviousWeek` — предыдущей недели (35) — **НОВОЕ**
- `carryoverTicketsCreatedOlder` — остальные (70) — **НОВОЕ** (переименовать из `carryoverTicketsCreatedOtherWeek`)

### Математическая формула

```
carryoverTickets = carryoverTicketsCreatedThisWeek + 
                   carryoverTicketsCreatedPreviousWeek + 
                   carryoverTicketsCreatedOlder
```

**Пример:**
```
150 = 45 + 35 + 70
```

---

## 🔧 Технические требования

### Backend изменения

#### Файл: `api/graph-1c-admission-closure.php`

**1. Функция `calculateWeekMetrics()` (строки 313-461)**

**Текущая логика:**
```php
// Разбивка по критерию создания
$createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
if ($createdInThisWeek) {
    $carryoverTicketsCreatedThisWeek++;
} else {
    $carryoverTicketsCreatedOtherWeek++;
}
```

**Новая логика:**
```php
// Разбивка по критерию создания на три категории
$createdInThisWeek = isInRange($createdTime, $weekStart, $weekEnd);
if ($createdInThisWeek) {
    $carryoverTicketsCreatedThisWeek++;
} else {
    // Определяем, создан ли тикет в предыдущую неделю
    $previousWeekStart = (clone $weekStart)->modify('-7 days');
    $previousWeekEnd = (clone $weekStart)->modify('-1 second');
    
    $createdInPreviousWeek = isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
    if ($createdInPreviousWeek) {
        $carryoverTicketsCreatedPreviousWeek++;
    } else {
        $carryoverTicketsCreatedOlder++;
    }
}
```

**Изменения в возвращаемом массиве:**
```php
return [
    'newTickets' => $newCount,
    'closedTickets' => $closedCount,
    'closedTicketsCreatedThisWeek' => $closedTicketsCreatedThisWeek,
    'closedTicketsCreatedOtherWeek' => $closedTicketsCreatedOtherWeek,
    'carryoverTickets' => $carryoverCount,
    'carryoverTicketsCreatedThisWeek' => $carryoverTicketsCreatedThisWeek,
    'carryoverTicketsCreatedPreviousWeek' => $carryoverTicketsCreatedPreviousWeek, // НОВОЕ
    'carryoverTicketsCreatedOlder' => $carryoverTicketsCreatedOlder, // НОВОЕ (переименовать из carryoverTicketsCreatedOtherWeek)
    // Оставляем старое поле для обратной совместимости (deprecated)
    'carryoverTicketsCreatedOtherWeek' => $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder
];
```

**2. Обновление всех мест, где используется `carryoverTicketsCreatedOtherWeek`**

**Места для изменения:**
- Строка 328: инициализация переменной
- Строка 447: инкремент переменной
- Строка 459: возврат в массиве
- Строка 2290: добавление в series
- Строка 2301: добавление в weeksData
- Строка 2321: добавление в currentWeekData
- Строка 2338: добавление в currentWeekData (дубликат)
- Строка 2348: получение из currentWeekData
- Строка 2433: добавление в responseData

**3. Добавление новых полей в API ответ**

**Файл:** `api/graph-1c-admission-closure.php`  
**Строки:** 2428-2438

**Текущий код:**
```php
if ($includeCarryoverTickets) {
    $responseData['carryoverTickets'] = $carryoverCount;
    $responseData['carryoverTicketsCreatedThisWeek'] = $carryoverTicketsCreatedThisWeek;
    $responseData['carryoverTicketsCreatedOtherWeek'] = $carryoverTicketsCreatedOtherWeek;
    // ...
}
```

**Новый код:**
```php
if ($includeCarryoverTickets) {
    $responseData['carryoverTickets'] = $carryoverCount;
    $responseData['carryoverTicketsCreatedThisWeek'] = $carryoverTicketsCreatedThisWeek;
    $responseData['carryoverTicketsCreatedPreviousWeek'] = $carryoverTicketsCreatedPreviousWeek; // НОВОЕ
    $responseData['carryoverTicketsCreatedOlder'] = $carryoverTicketsCreatedOlder; // НОВОЕ
    // Оставляем старое поле для обратной совместимости (deprecated)
    $responseData['carryoverTicketsCreatedOtherWeek'] = $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;
    // ...
}
```

**4. Обновление series для графика**

**Файл:** `api/graph-1c-admission-closure.php`  
**Строки:** 2288-2290

**Текущий код:**
```php
$series['carryover'][] = $weekMetrics['carryoverTickets'];
$series['carryoverCreatedThisWeek'][] = $weekMetrics['carryoverTicketsCreatedThisWeek'];
$series['carryoverCreatedOtherWeek'][] = $weekMetrics['carryoverTicketsCreatedOtherWeek'];
```

**Новый код:**
```php
$series['carryover'][] = $weekMetrics['carryoverTickets'];
$series['carryoverCreatedThisWeek'][] = $weekMetrics['carryoverTicketsCreatedThisWeek'];
$series['carryoverCreatedPreviousWeek'][] = $weekMetrics['carryoverTicketsCreatedPreviousWeek']; // НОВОЕ
$series['carryoverCreatedOlder'][] = $weekMetrics['carryoverTicketsCreatedOlder']; // НОВОЕ
// Оставляем старое поле для обратной совместимости (deprecated)
$series['carryoverCreatedOtherWeek'][] = $weekMetrics['carryoverTicketsCreatedPreviousWeek'] + $weekMetrics['carryoverTicketsCreatedOlder'];
```

### Frontend изменения

#### Файл: `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`

**1. Обновление props (строки 324-346)**

**Текущий код:**
```javascript
data: {
  type: Object,
  default: () => ({
    // ...
    carryoverTickets: 0,
    carryoverTicketsCreatedThisWeek: 0,
    carryoverTicketsCreatedOtherWeek: 0, // TASK-047
    series: {
      // ...
      carryoverCreatedOtherWeek: [0]
    }
  })
}
```

**Новый код:**
```javascript
data: {
  type: Object,
  default: () => ({
    // ...
    carryoverTickets: 0,
    carryoverTicketsCreatedThisWeek: 0,
    carryoverTicketsCreatedPreviousWeek: 0, // TASK-063: НОВОЕ
    carryoverTicketsCreatedOlder: 0, // TASK-063: НОВОЕ
    carryoverTicketsCreatedOtherWeek: 0, // TASK-063: DEPRECATED (для обратной совместимости)
    series: {
      // ...
      carryoverCreatedPreviousWeek: [0], // TASK-063: НОВОЕ
      carryoverCreatedOlder: [0], // TASK-063: НОВОЕ
      carryoverCreatedOtherWeek: [0] // TASK-063: DEPRECATED
    }
  })
}
```

**2. Обновление UI блока «ПЕРЕХОДЯЩИЕ» (строки 86-114)**

**Текущий код:**
```vue
<div class="summary-card__breakdown">
  <div class="breakdown-item breakdown-item--this-week">
    <span class="breakdown-item__icon">✓</span>
    <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
    <span class="breakdown-item__label">этой недели</span>
  </div>
  <div class="breakdown-item breakdown-item--other-week">
    <span class="breakdown-item__icon">↻</span>
    <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedOtherWeek ?? 0 }}</span>
    <span class="breakdown-item__label">предыдущих</span>
  </div>
</div>
```

**Новый код:**
```vue
<div class="summary-card__breakdown">
  <div class="breakdown-item breakdown-item--this-week">
    <span class="breakdown-item__icon">✓</span>
    <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
    <span class="breakdown-item__label">этой недели</span>
  </div>
  <div class="breakdown-item breakdown-item--previous-week">
    <span class="breakdown-item__icon">↻</span>
    <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedPreviousWeek ?? 0 }}</span>
    <span class="breakdown-item__label">предыдущей недели</span>
  </div>
  <div class="breakdown-item breakdown-item--older">
    <span class="breakdown-item__icon">↻</span>
    <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedOlder ?? 0 }}</span>
    <span class="breakdown-item__label">остальные</span>
  </div>
</div>
```

**3. Обновление computed-свойства `currentWeekData` (строки 1053-1069)**

**Текущий код:**
```javascript
carryoverTickets: (Array.isArray(series.carryover) && series.carryover[lastIndex] !== undefined) ? series.carryover[lastIndex] : 0,
carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[lastIndex] !== undefined) ? series.carryoverCreatedThisWeek[lastIndex] : 0,
carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0
```

**Новый код:**
```javascript
carryoverTickets: (Array.isArray(series.carryover) && series.carryover[lastIndex] !== undefined) ? series.carryover[lastIndex] : 0,
carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[lastIndex] !== undefined) ? series.carryoverCreatedThisWeek[lastIndex] : 0,
carryoverTicketsCreatedPreviousWeek: (Array.isArray(series.carryoverCreatedPreviousWeek) && series.carryoverCreatedPreviousWeek[lastIndex] !== undefined) ? series.carryoverCreatedPreviousWeek[lastIndex] : 0, // TASK-063: НОВОЕ
carryoverTicketsCreatedOlder: (Array.isArray(series.carryoverCreatedOlder) && series.carryoverCreatedOlder[lastIndex] !== undefined) ? series.carryoverCreatedOlder[lastIndex] : 0, // TASK-063: НОВОЕ
// Обратная совместимость
carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[lastIndex] !== undefined) ? series.carryoverCreatedOtherWeek[lastIndex] : 0
```

**4. Обновление computed-свойства `previousWeekData` (строки 1145-1215)**

Аналогично обновить для `previousWeekData` и `prePreviousWeekData`.

**5. Обновление данных для графика**

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`  
**Строки:** 512-584 (carryoverChartData)

**Текущий код:**
```javascript
const carryoverCreatedOtherWeekSeries = Array.isArray(props.data.series?.carryoverCreatedOtherWeek) && props.data.series.carryoverCreatedOtherWeek.length > 0
  ? props.data.series.carryoverCreatedOtherWeek
  : [props.data.carryoverTicketsCreatedOtherWeek ?? 0];
```

**Новый код:**
```javascript
const carryoverCreatedPreviousWeekSeries = Array.isArray(props.data.series?.carryoverCreatedPreviousWeek) && props.data.series.carryoverCreatedPreviousWeek.length > 0
  ? props.data.series.carryoverCreatedPreviousWeek
  : [props.data.carryoverTicketsCreatedPreviousWeek ?? 0];

const carryoverCreatedOlderSeries = Array.isArray(props.data.series?.carryoverCreatedOlder) && props.data.series.carryoverCreatedOlder.length > 0
  ? props.data.series.carryoverCreatedOlder
  : [props.data.carryoverTicketsCreatedOlder ?? 0];
```

**6. Обновление datasets графика**

Добавить две новые линии на график:
- `Переходящие (созданы предыдущей неделей)` — пунктирная линия
- `Переходящие (созданы остальными неделями)` — пунктирная линия

---

## 📐 Логика определения предыдущей недели

### Алгоритм

Для каждой недели с границами `[weekStart, weekEnd]`:

1. **Предыдущая неделя:**
   - `previousWeekStart = weekStart - 7 days`
   - `previousWeekEnd = weekStart - 1 second`

2. **Проверка создания тикета:**
   ```php
   $createdInPreviousWeek = isInRange($createdTime, $previousWeekStart, $previousWeekEnd);
   ```

3. **Категоризация:**
   - Если `createdInThisWeek` → `carryoverTicketsCreatedThisWeek`
   - Если `createdInPreviousWeek` → `carryoverTicketsCreatedPreviousWeek`
   - Иначе → `carryoverTicketsCreatedOlder`

### Пример

**Текущая неделя 51:**
- weekStart: `2025-12-15 00:00:00 UTC` (понедельник)
- weekEnd: `2025-12-21 23:59:59 UTC` (воскресенье)

**Предыдущая неделя 50:**
- previousWeekStart: `2025-12-08 00:00:00 UTC` (понедельник)
- previousWeekEnd: `2025-12-14 23:59:59 UTC` (воскресенье)

**Тикет с `createdTime = 2025-12-10 14:30:00 UTC`:**
- ✅ Создан в предыдущую неделю (неделя 50)
- → `carryoverTicketsCreatedPreviousWeek++`

**Тикет с `createdTime = 2025-12-01 10:00:00 UTC`:**
- ❌ Создан не в предыдущую неделю
- → `carryoverTicketsCreatedOlder++`

---

## 🎨 UX/UI Требования

### Визуальное представление

**Блок «ПЕРЕХОДЯЩИЕ» должен отображать три разбивки:**

```
┌─────────────────────────────────────┐
│ Переходящие                         │
│                                     │
│         [150]                       │
│         ↑↓ +5%                      │
│                                     │
│  ✓ 45  этой недели                 │
│  ↻ 35  предыдущей недели            │
│  ↻ 70  остальные                    │
└─────────────────────────────────────┘
```

### Стилизация

**Классы для разбивок:**
- `.breakdown-item--this-week` — для тикетов этой недели (зелёный/синий)
- `.breakdown-item--previous-week` — для тикетов предыдущей недели (жёлтый/оранжевый)
- `.breakdown-item--older` — для остальных тикетов (серый)

**Иконки:**
- `✓` — для тикетов этой недели
- `↻` — для тикетов предыдущей недели
- `↻` — для остальных тикетов (можно использовать другую иконку, например `⏳`)

---

## 📋 Ступенчатые подзадачи

### Этап 1: Backend — логика расчёта

1. ✅ Обновить функцию `calculateWeekMetrics()` для разбивки на три категории
2. ✅ Добавить вычисление границ предыдущей недели
3. ✅ Обновить возвращаемый массив с новыми полями
4. ✅ Обновить все места использования `carryoverTicketsCreatedOtherWeek`
5. ✅ Добавить новые поля в API ответ
6. ✅ Обновить series для графика
7. ✅ Добавить обратную совместимость (deprecated поле)

### Этап 2: Frontend — обновление компонентов

1. ✅ Обновить props в `GraphAdmissionClosureChart.vue`
2. ✅ Обновить UI блока «ПЕРЕХОДЯЩИЕ» (добавить третью разбивку)
3. ✅ Обновить computed-свойства (`currentWeekData`, `previousWeekData`, `prePreviousWeekData`)
4. ✅ Обновить данные для графика (`carryoverChartData`)
5. ✅ Добавить новые линии на график
6. ✅ Обновить стили для новых разбивок

### Этап 3: Тестирование

1. ✅ Проверить расчёт трёх категорий на разных неделях
2. ✅ Проверить отображение в UI
3. ✅ Проверить график (новые линии)
4. ✅ Проверить обратную совместимость
5. ✅ Проверить математическую формулу (сумма трёх = общее)

---

## ✅ Критерии приёмки

- [ ] Backend возвращает три новые категории переходящих тикетов
- [ ] Функция `calculateWeekMetrics()` корректно разбивает тикеты на три категории
- [ ] API ответ содержит поля `carryoverTicketsCreatedPreviousWeek` и `carryoverTicketsCreatedOlder`
- [ ] Старое поле `carryoverTicketsCreatedOtherWeek` остаётся для обратной совместимости
- [ ] Frontend отображает три разбивки в блоке «ПЕРЕХОДЯЩИЕ»
- [ ] График показывает три линии для переходящих тикетов
- [ ] Математическая формула выполняется: `carryoverTickets = carryoverTicketsCreatedThisWeek + carryoverTicketsCreatedPreviousWeek + carryoverTicketsCreatedOlder`
- [ ] Стилизация соответствует дизайну
- [ ] Обратная совместимость работает (старое поле заполняется суммой двух новых)

---

## 🔗 Связанные задачи

- **TASK-044:** Добавление категории «Переходящие тикеты»
- **TASK-047:** Разбивка переходящих тикетов по критерию создания (две категории)
- **TASK-062:** Добавление блока summary-карточек для предыдущей недели

---

## 📝 Примечания

### Обратная совместимость

Старое поле `carryoverTicketsCreatedOtherWeek` должно оставаться в API ответе для обратной совместимости. Оно должно содержать сумму двух новых полей:
```php
$carryoverTicketsCreatedOtherWeek = $carryoverTicketsCreatedPreviousWeek + $carryoverTicketsCreatedOlder;
```

### Миграция данных

При обновлении фронтенда нужно учесть, что старые данные могут не содержать новых полей. Использовать значения по умолчанию:
```javascript
carryoverTicketsCreatedPreviousWeek: data.carryoverTicketsCreatedPreviousWeek ?? 0,
carryoverTicketsCreatedOlder: data.carryoverTicketsCreatedOlder ?? 0
```

---

## 📅 История правок

- **2025-12-23 10:57 (UTC+3, Брест):** Создан черновик задачи TASK-063
- **2025-12-23 (UTC+3, Брест):** Задача выполнена:
  - ✅ Обновлена функция `calculateWeekMetrics()` для разбивки на три категории
  - ✅ Добавлены новые поля в API ответ (`carryoverTicketsCreatedPreviousWeek`, `carryoverTicketsCreatedOlder`)
  - ✅ Обновлены series для графика
  - ✅ Обновлены props и UI блока «ПЕРЕХОДЯЩИЕ» в Vue компоненте
  - ✅ Обновлены computed-свойства (`currentWeekData`, `previousWeekData`, `prePreviousWeekData`)
  - ✅ Добавлены две новые линии на график (предыдущей недели и остальные)
  - ✅ Сохранена обратная совместимость (deprecated поле `carryoverTicketsCreatedOtherWeek`)

