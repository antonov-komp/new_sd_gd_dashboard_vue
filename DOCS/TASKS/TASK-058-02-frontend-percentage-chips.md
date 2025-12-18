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
 */
function calculatePercentage(current, previous) {
  if (previous === null || previous === undefined || previous === 0) {
    return null;
  }
  
  return ((current - previous) / previous) * 100;
}

// Computed-свойства для процентов
const newTicketsPercentage = computed(() => {
  const current = props.data?.newTickets || 0;
  const previous = props.data?.previousPeriodData?.newTickets;
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

