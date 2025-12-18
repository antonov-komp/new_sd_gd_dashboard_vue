# TASK-058-02: Frontend — процентные составляющие в чипах

**Дата создания:** 2025-12-18 08:31 (UTC+3, Брест)  
**Статус:** 📝 Черновик  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-058: Улучшение модуля "График приема и закрытий сектора 1С" — режим 3 месяца](./TASK-058-enrichment-3-months-mode.md)  
**Этап:** 2 из 5  
**Зависимости:** TASK-058-01 (Backend должен возвращать `previousPeriodData`)

---

## 📋 Описание

Добавить процентные показатели в карточки чипов (Новые за период, Закрытые всего, Переходящие всего) в компоненте `SummaryCardsMonths.vue`. Проценты рассчитываются относительно предыдущего периода (4-й месяц) и отображаются рядом с абсолютными значениями.

---

## 🎯 Контекст

### Текущее состояние

**Файл:** `vue-app/src/components/graph-admission-closure/SummaryCardsMonths.vue`

**Текущее отображение:**
```vue
<div class="summary-card summary-card--new">
  <h3 class="card-title">Новые за период</h3>
  <div class="card-content">
    <div class="card-main-value">
      {{ formattedTotalNewTickets }}  <!-- Только абсолютное значение -->
    </div>
    <!-- ... разбивка по месяцам ... -->
  </div>
</div>
```

**Проблема:** Нет процентных показателей для визуальной оценки динамики.

### Требуемое состояние

**Новое отображение:**
```vue
<div class="summary-card summary-card--new">
  <h3 class="card-title">Новые за период</h3>
  <div class="card-content">
    <div class="card-main-value">
      {{ formattedTotalNewTickets }}
      <span 
        v-if="newTicketsPercentage !== null"
        :class="['percentage-badge', newTicketsPercentage >= 0 ? 'positive' : 'negative']"
      >
        {{ formatPercentage(newTicketsPercentage) }}
      </span>
    </div>
    <!-- ... разбивка по месяцам ... -->
  </div>
</div>
```

**Визуальный результат:**
```
Новые за период
150 (+12.5%)  <!-- Зеленый цвет для положительного процента -->
Октябрь: 50
Ноябрь: 60
Декабрь: 40
```

---

## 🔍 Детализация требований

### 1. Добавление computed-свойств для расчета процентов

**Файл:** `vue-app/src/components/graph-admission-closure/SummaryCardsMonths.vue`

**Задачи:**
1. Создать computed-свойство `newTicketsPercentage` для расчета процента изменения новых тикетов
2. Создать computed-свойство `closedTicketsPercentage` для расчета процента изменения закрытых тикетов
3. Создать computed-свойство `carryoverTicketsPercentage` для расчета процента изменения переходящих тикетов

**Формула расчета:**
```javascript
percentage = ((current - previous) / previous) * 100
```

**Обработка граничных случаев:**
- Если `previous === null` или `previous === undefined` → вернуть `null`
- Если `previous === 0` → вернуть `null` (деление на ноль)
- Если `current === 0` и `previous > 0` → вернуть `-100` (полное снижение)
- Если `current > 0` и `previous === 0` → вернуть `null` (нельзя рассчитать процент от нуля)
- Если `current === previous` → вернуть `0` (нет изменения)
- Если `current` или `previous` не являются числами → вернуть `null`

**Пример реализации:**
```javascript
const newTicketsPercentage = computed(() => {
  const current = props.data?.newTickets || 0;
  const previous = props.data?.previousPeriodData?.newTickets;
  
  // Обработка отсутствия данных предыдущего периода
  if (previous === null || previous === undefined) {
    return null;
  }
  
  // Обработка деления на ноль
  if (previous === 0) {
    return null;
  }
  
  // Расчет процента
  return ((current - previous) / previous) * 100;
});
```

### 2. Функция форматирования процентов

**Задачи:**
1. Создать функцию `formatPercentage(value)` для форматирования процента
2. Формат: `+12.5%` для положительных, `-5.2%` для отрицательных
3. Округление до 1 знака после запятой

**Пример реализации:**
```javascript
/**
 * Форматирует процент для отображения
 * 
 * @param {number|null} value - Процент изменения
 * @returns {string} Отформатированный процент или пустая строка
 */
function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}
```

### 3. Обновление шаблона для отображения процентов

**Задачи:**
1. Обновить карточку "Новые за период" для отображения процента
2. Обновить карточку "Закрытые всего" для отображения процента
3. Обновить карточку "Переходящие всего" для отображения процента
4. Добавить условное отображение (только если процент не `null`)

**Пример для карточки "Новые за период":**
```vue
<div class="summary-card summary-card--new">
  <h3 class="card-title">Новые за период</h3>
  <div class="card-content">
    <div class="card-main-value">
      {{ formattedTotalNewTickets }}
      <span 
        v-if="newTicketsPercentage !== null"
        :class="['percentage-badge', newTicketsPercentage >= 0 ? 'positive' : 'negative']"
        :title="`Изменение относительно предыдущего периода: ${formatPercentage(newTicketsPercentage)}`"
      >
        {{ formatPercentage(newTicketsPercentage) }}
      </span>
    </div>
    <!-- ... остальной код ... -->
  </div>
</div>
```

### 4. Стилизация процентных бейджей

**Задачи:**
1. Добавить стили для класса `.percentage-badge`
2. Положительные проценты — зеленый цвет (`var(--b24-success, #28a745)`)
3. Отрицательные проценты — красный цвет (`var(--b24-danger, #dc3545)`)
4. Адаптивность для мобильных устройств

**Пример стилей:**
```css
.percentage-badge {
  font-size: 16px;
  font-weight: 600;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
}

.percentage-badge.positive {
  color: var(--b24-success, #28a745);
}

.percentage-badge.negative {
  color: var(--b24-danger, #dc3545);
}

/* Адаптивность */
@media (max-width: 768px) {
  .percentage-badge {
    font-size: 14px;
    margin-left: 4px;
  }
  
  .card-main-value {
    flex-wrap: wrap;
  }
}
```

---

## 🔧 Технические требования

### Структура данных props

**Ожидаемая структура `props.data`:**
```javascript
{
  newTickets: 150,
  newTicketsByMonth: [...],
  closedTickets: 240,
  closedTicketsByMonth: [...],
  carryoverTickets: 90,
  carryoverTicketsByMonth: [...],
  previousPeriodData: {  // TASK-058-01: Новое поле
    newTickets: 133,
    closedTickets: 200,
    carryoverTickets: 75
  }
}
```

### Обработка отсутствия данных

- Если `previousPeriodData` отсутствует → проценты не отображаются
- Если значение `previousPeriodData.*` равно `null` или `undefined` → проценты не отображаются
- Если значение `previousPeriodData.*` равно `0` → проценты не отображаются (избегаем деления на ноль)

### Производительность

- Computed-свойства должны быть эффективными (не пересчитываться без необходимости)
- Использовать кеширование вычислений через `computed()`
- Избегать сложных вычислений внутри computed-свойств

### Валидация данных

**Проверка структуры props:**
```javascript
// В начале компонента добавить проверку
if (!props.data) {
  console.warn('SummaryCardsMonths: data prop is missing');
  return;
}

if (!props.data.previousPeriodData) {
  console.debug('SummaryCardsMonths: previousPeriodData is missing, percentages will not be displayed');
}
```

**Проверка типов данных:**
- `newTickets`, `closedTickets`, `carryoverTickets` должны быть числами
- `previousPeriodData.*` должны быть числами или null/undefined
- Обрабатывать случаи, когда данные приходят как строки (конвертировать в числа)

---

## ✅ Критерии приёмки

- [ ] Computed-свойства для расчета процентов созданы и работают корректно
- [ ] Функция `formatPercentage()` форматирует проценты правильно
- [ ] Проценты отображаются во всех трех карточках:
  - [ ] "Новые за период"
  - [ ] "Закрытые всего"
  - [ ] "Переходящие всего"
- [ ] Положительные проценты отображаются зеленым цветом
- [ ] Отрицательные проценты отображаются красным цветом
- [ ] Проценты не отображаются, если данные предыдущего периода отсутствуют
- [ ] Обрабатывается случай деления на ноль (`previous === 0`)
- [ ] Стили адаптивны для мобильных устройств
- [ ] Код протестирован с реальными данными

---

## 📚 Примеры реализации

### Пример 1: Полная реализация computed-свойств

```vue
<script setup>
import { computed } from 'vue';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      newTickets: 0,
      newTicketsByMonth: [],
      closedTickets: 0,
      closedTicketsByMonth: [],
      carryoverTickets: 0,
      carryoverTicketsByMonth: [],
      previousPeriodData: null
    })
  }
});

/**
 * Форматирование числа с разделителями
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  
  if (num >= 1000) {
    return num.toLocaleString('ru-RU');
  }
  
  return num.toString();
}

/**
 * Форматирует процент для отображения
 */
function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Вычисляет процент изменения
 * 
 * @param {number} current - Текущее значение
 * @param {number|null|undefined} previous - Предыдущее значение
 * @returns {number|null} Процент изменения или null, если нельзя рассчитать
 */
function calculatePercentage(current, previous) {
  // Валидация входных данных
  if (typeof current !== 'number' || isNaN(current)) {
    return null;
  }
  
  if (previous === null || previous === undefined) {
    return null;
  }
  
  if (typeof previous !== 'number' || isNaN(previous)) {
    return null;
  }
  
  // Деление на ноль
  if (previous === 0) {
    return null;
  }
  
  // Нет изменения
  if (current === previous) {
    return 0;
  }
  
  // Расчет процента
  const percentage = ((current - previous) / previous) * 100;
  
  // Проверка на бесконечность или NaN
  if (!isFinite(percentage) || isNaN(percentage)) {
    return null;
  }
  
  return percentage;
}

// Computed-свойства для процентов
const newTicketsPercentage = computed(() => {
  // Безопасное получение текущего значения
  const current = typeof props.data?.newTickets === 'number' 
    ? props.data.newTickets 
    : (parseInt(props.data?.newTickets) || 0);
  
  // Безопасное получение предыдущего значения
  const previous = props.data?.previousPeriodData?.newTickets;
  
  return calculatePercentage(current, previous);
});

const closedTicketsPercentage = computed(() => {
  const current = typeof props.data?.closedTickets === 'number' 
    ? props.data.closedTickets 
    : (parseInt(props.data?.closedTickets) || 0);
  
  const previous = props.data?.previousPeriodData?.closedTickets;
  
  return calculatePercentage(current, previous);
});

const carryoverTicketsPercentage = computed(() => {
  const current = typeof props.data?.carryoverTickets === 'number' 
    ? props.data.carryoverTickets 
    : (parseInt(props.data?.carryoverTickets) || 0);
  
  const previous = props.data?.previousPeriodData?.carryoverTickets;
  
  return calculatePercentage(current, previous);
});

const closedTicketsPercentage = computed(() => {
  const current = props.data?.closedTickets || 0;
  const previous = props.data?.previousPeriodData?.closedTickets;
  return calculatePercentage(current, previous);
});

const carryoverTicketsPercentage = computed(() => {
  const current = props.data?.carryoverTickets || 0;
  const previous = props.data?.previousPeriodData?.carryoverTickets;
  return calculatePercentage(current, previous);
});

// Существующие computed-свойства
const totalNewTickets = computed(() => {
  return props.data?.newTickets || 0;
});

const formattedTotalNewTickets = computed(() => {
  return formatNumber(totalNewTickets.value);
});
</script>
```

### Пример 2: Обновленный шаблон для всех трех карточек

```vue
<template>
  <div class="summary-cards-months">
    <!-- Карточка "Новые за период" -->
    <div class="summary-card summary-card--new">
      <h3 class="card-title">Новые за период</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formattedTotalNewTickets }}
          <span 
            v-if="newTicketsPercentage !== null"
            :class="['percentage-badge', newTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(newTicketsPercentage)}`"
          >
            {{ formatPercentage(newTicketsPercentage) }}
          </span>
        </div>
        <!-- ... остальной код ... -->
      </div>
    </div>

    <!-- Карточка "Закрытые всего" -->
    <div class="summary-card summary-card--closed">
      <h3 class="card-title">Закрытые всего</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formatNumber(data.closedTickets || 0) }}
          <span 
            v-if="closedTicketsPercentage !== null"
            :class="['percentage-badge', closedTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(closedTicketsPercentage)}`"
          >
            {{ formatPercentage(closedTicketsPercentage) }}
          </span>
        </div>
        <!-- ... остальной код ... -->
      </div>
    </div>

    <!-- Карточка "Переходящие всего" -->
    <div class="summary-card summary-card--carryover">
      <h3 class="card-title">Переходящие всего</h3>
      <div class="card-content">
        <div class="card-main-value">
          {{ formatNumber(data.carryoverTickets || 0) }}
          <span 
            v-if="carryoverTicketsPercentage !== null"
            :class="['percentage-badge', carryoverTicketsPercentage >= 0 ? 'positive' : 'negative']"
            :title="`Изменение относительно предыдущего периода: ${formatPercentage(carryoverTicketsPercentage)}`"
          >
            {{ formatPercentage(carryoverTicketsPercentage) }}
          </span>
        </div>
        <!-- ... остальной код ... -->
      </div>
    </div>
  </div>
</template>
```

### Пример 3: Полные стили для процентных бейджей

```css
<style scoped>
/* ... существующие стили ... */

.card-main-value {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.percentage-badge {
  font-size: 16px;
  font-weight: 600;
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  cursor: help;
}

.percentage-badge:hover {
  background-color: rgba(0, 0, 0, 0.1);
  transform: scale(1.05);
}

.percentage-badge.positive {
  color: var(--b24-success, #28a745);
}

.percentage-badge.negative {
  color: var(--b24-danger, #dc3545);
}

/* Адаптивность */
@media (max-width: 768px) {
  .percentage-badge {
    font-size: 14px;
    margin-left: 4px;
    padding: 1px 4px;
  }
  
  .card-main-value {
    font-size: 28px;
  }
}
</style>
```

---

## 🔗 Зависимости

- **TASK-058-01:** Backend должен возвращать `previousPeriodData` в ответе API
- **TASK-053-04:** Summary-карточки для 3-месячного режима (базовая реализация)

---

## 📝 История правок

- **2025-12-18 08:31 (UTC+3, Брест):** Создан детализированный документ для этапа 2
  - Описаны computed-свойства для расчета процентов
  - Описана функция форматирования процентов
  - Добавлены примеры реализации
  - Добавлены критерии приёмки

---

## ⚠️ Примечания

- **Важно:** Проценты должны рассчитываться только если данные предыдущего периода доступны
- **UX:** Добавлен `title` атрибут для tooltip с подробной информацией
- **Адаптивность:** Проценты должны корректно отображаться на мобильных устройствах

## 📋 Пошаговая инструкция реализации

### Шаг 1: Добавление функции calculatePercentage()

1. Открыть файл `vue-app/src/components/graph-admission-closure/SummaryCardsMonths.vue`
2. В секции `<script setup>` добавить функцию `calculatePercentage()`
3. Реализовать валидацию входных данных
4. Реализовать обработку граничных случаев
5. Протестировать функцию с различными входными данными

### Шаг 2: Добавление функции formatPercentage()

1. В том же файле добавить функцию `formatPercentage()`
2. Реализовать форматирование с знаком и округлением
3. Протестировать с положительными, отрицательными и нулевыми значениями

### Шаг 3: Создание computed-свойств

1. Добавить computed-свойство `newTicketsPercentage`
2. Добавить computed-свойство `closedTicketsPercentage`
3. Добавить computed-свойство `carryoverTicketsPercentage`
4. Использовать функцию `calculatePercentage()` в каждом свойстве
5. Протестировать, что свойства возвращают корректные значения

### Шаг 4: Обновление шаблона

1. Найти карточку "Новые за период" в шаблоне
2. Добавить `<span>` с процентом рядом с `card-main-value`
3. Добавить условное отображение (`v-if`)
4. Добавить динамические классы для положительных/отрицательных процентов
5. Повторить для карточек "Закрытые всего" и "Переходящие всего"

### Шаг 5: Добавление стилей

1. Добавить стили для `.percentage-badge`
2. Добавить стили для `.positive` и `.negative`
3. Добавить адаптивные стили для мобильных устройств
4. Протестировать отображение на разных размерах экрана

### Шаг 6: Тестирование

1. Проверить отображение процентов с реальными данными
2. Проверить случаи отсутствия данных предыдущего периода
3. Проверить случаи деления на ноль
4. Проверить адаптивность на мобильных устройствах

## 🔍 Дополнительные проверки

### Проверка 1: Валидация данных props

```javascript
// Добавить в начале компонента
import { watch } from 'vue';

// Отслеживание изменений данных для отладки
watch(() => props.data?.previousPeriodData, (newVal, oldVal) => {
  if (newVal) {
    console.log('Previous period data received:', newVal);
  } else {
    console.warn('Previous period data is missing');
  }
}, { immediate: true });
```

### Проверка 2: Проверка корректности расчетов

```javascript
// Добавить проверку после расчета процентов
watch([newTicketsPercentage, closedTicketsPercentage, carryoverTicketsPercentage], 
  ([newPct, closedPct, carryoverPct]) => {
    // Проверка на валидные значения
    if (newPct !== null && (!isFinite(newPct) || isNaN(newPct))) {
      console.error('Invalid newTicketsPercentage:', newPct);
    }
    // Аналогично для других процентов
  }
);
```

### Проверка 3: Визуальная проверка

- Проверить, что положительные проценты зеленые
- Проверить, что отрицательные проценты красные
- Проверить, что проценты не отображаются при отсутствии данных
- Проверить tooltip при наведении на процент
- **Валидация:** Всегда проверять типы данных перед расчетом процентов
- **Производительность:** Computed-свойства кешируются автоматически, не нужно добавлять дополнительное кеширование

## 🧪 Тестирование

### Тестовые сценарии

1. **Нормальный случай:**
   - `current = 150`, `previous = 133` → должно быть `+12.8%`

2. **Отрицательный процент:**
   - `current = 100`, `previous = 133` → должно быть `-24.8%`

3. **Нет изменения:**
   - `current = 100`, `previous = 100` → должно быть `0%`

4. **Деление на ноль:**
   - `current = 100`, `previous = 0` → должно быть `null` (не отображается)

5. **Отсутствие данных:**
   - `current = 100`, `previous = null` → должно быть `null` (не отображается)

6. **Нулевое текущее значение:**
   - `current = 0`, `previous = 100` → должно быть `-100%`

7. **Очень большие числа:**
   - `current = 1000000`, `previous = 500000` → должно быть `+100.0%`

### Примеры тестовых данных

```javascript
// Тест 1: Положительный процент
const testData1 = {
  newTickets: 150,
  previousPeriodData: { newTickets: 133 }
};
// Ожидаемый результат: +12.8%

// Тест 2: Отрицательный процент
const testData2 = {
  newTickets: 100,
  previousPeriodData: { newTickets: 133 }
};
// Ожидаемый результат: -24.8%

// Тест 3: Отсутствие данных
const testData3 = {
  newTickets: 150,
  previousPeriodData: null
};
// Ожидаемый результат: null (не отображается)

// Тест 4: Деление на ноль
const testData4 = {
  newTickets: 150,
  previousPeriodData: { newTickets: 0 }
};
// Ожидаемый результат: null (не отображается)
```

