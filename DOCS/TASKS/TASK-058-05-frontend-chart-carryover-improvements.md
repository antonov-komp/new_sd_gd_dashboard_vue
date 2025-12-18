# TASK-058-05: Frontend — улучшение графика "Переходящие тикеты"

**Дата создания:** 2025-12-18 08:31 (UTC+3, Брест)  
**Статус:** 📝 Черновик  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-058: Улучшение модуля "График приема и закрытий сектора 1С" — режим 3 месяца](./TASK-058-enrichment-3-months-mode.md)  
**Этап:** 5 из 5  
**Зависимости:** TASK-058-01 (Backend должен возвращать `previousPeriodData`), TASK-058-04 (для переиспользования логики)

---

## 📋 Описание

Улучшить график "Переходящие тикеты" в компоненте `LineChartMonths.vue`, добавив:
1. Динамичный заголовок с указанием периода (месяца)
2. Цифры на точках графика
3. Словесный отчет под графиком на основе процентных показателей

---

## 🎯 Контекст

### Текущее состояние

**Файл:** `vue-app/src/components/graph-admission-closure/LineChartMonths.vue`

**Текущее отображение:**
```vue
<div class="chart-section">
  <h3 class="chart-title">Переходящие тикеты</h3>  <!-- Статичный заголовок -->
  <div class="chart-container">
    <Line :data="carryoverChartData" :options="chartOptions" />
    <!-- Нет цифр на точках -->
  </div>
  <!-- Нет словесного отчета -->
</div>
```

**Проблемы:**
- Статичный заголовок не показывает период
- Нет цифр на точках графика
- Нет словесного отчета с анализом

### Требуемое состояние

**Новое отображение:**
```vue
<div class="chart-section">
  <h3 class="chart-title">
    Переходящие тикеты
    <span class="chart-period">(Октябрь — Декабрь 2025)</span>  <!-- Динамичный период -->
  </h3>
  <div class="chart-container">
    <Line :data="carryoverChartData" :options="chartOptions" />
    <!-- Цифры на точках графика -->
  </div>
  <div class="chart-analysis">
    <h4 class="analysis-title">Анализ</h4>
    <div class="analysis-content">
      <p>Переходящие тикеты: 30 (окт) → 35 (ноя) → 25 (дек)</p>
      <p>Динамика: рост на 16.7% в ноябре, снижение на 28.6% в декабре</p>
      <p>Тенденция: снижение переходящих тикетов в конце периода</p>
    </div>
  </div>
</div>
```

---

## 🔍 Детализация требований

### 1. Динамичный заголовок

**Задачи:**
1. Создать computed-свойство `carryoverChartPeriod` для формирования периода
2. Обновить заголовок графика для отображения периода

**Computed-свойство:**
```javascript
const carryoverChartPeriod = computed(() => {
  const months = props.data?.carryoverTicketsByMonth || [];
  
  if (months.length === 0) {
    return null;
  }
  
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  
  if (!firstMonth || !lastMonth) {
    return null;
  }
  
  const firstMonthName = firstMonth.monthName || `Месяц ${firstMonth.month}`;
  const lastMonthName = lastMonth.monthName || `Месяц ${lastMonth.month}`;
  const year = firstMonth.year || new Date().getFullYear();
  
  return `${firstMonthName} — ${lastMonthName} ${year}`;
});
```

**Обновление шаблона:**
```vue
<h3 class="chart-title">
  Переходящие тикеты
  <span v-if="carryoverChartPeriod" class="chart-period">({{ carryoverChartPeriod }})</span>
</h3>
```

**Примечание:** Можно переиспользовать логику из TASK-058-04, создав общую функцию `getChartPeriod(months)`.

### 2. Цифры на точках графика

**Задачи:**
1. Использовать ту же конфигурацию `datalabels`, что и в графике "Новые и закрытые тикеты"
2. Убедиться, что цифры отображаются на всех точках графика переходящих тикетов

**Примечание:** Конфигурация `chartOptions` уже должна содержать настройки `datalabels` из TASK-058-04. Если нет — добавить аналогично.

### 3. Словесный отчет под графиком

**Задачи:**
1. Создать computed-свойство `carryoverAnalysis` для расчета анализа
2. Реализовать функцию `generateCarryoverAnalysis()` для словесного анализа
3. Добавить блок "Анализ" под графиком

**Computed-свойство для анализа:**
```javascript
const carryoverAnalysis = computed(() => {
  const months = props.data?.carryoverTicketsByMonth || [];
  
  if (months.length === 0) {
    return ['Нет данных для анализа'];
  }
  
  const analysis = [];
  
  // Формирование строки с цифрами
  const values = months.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  analysis.push(`Переходящие тикеты: ${values}`);
  
  // Анализ динамики
  if (months.length >= 2) {
    const month1 = months[0];
    const month2 = months[1];
    const month3 = months[2];
    
    if (month2 && month1 && month1.count > 0) {
      const change1 = ((month2.count - month1.count) / month1.count) * 100;
      analysis.push(
        `Динамика: ${change1 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change1).toFixed(1)}% в ${month2.monthName}`
      );
    }
    
    if (month3 && month2 && month2.count > 0) {
      const change2 = ((month3.count - month2.count) / month2.count) * 100;
      analysis.push(
        `${change2 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change2).toFixed(1)}% в ${month3.monthName}`
      );
    }
  }
  
  // Общая тенденция
  if (months.length >= 3) {
    const first = months[0].count || 0;
    const last = months[months.length - 1].count || 0;
    
    if (first > 0) {
      const totalChange = ((last - first) / first) * 100;
      if (totalChange > 0) {
        analysis.push(`Тенденция: рост переходящих тикетов за период на ${totalChange.toFixed(1)}%`);
      } else if (totalChange < 0) {
        analysis.push(`Тенденция: снижение переходящих тикетов за период на ${Math.abs(totalChange).toFixed(1)}%`);
      } else {
        analysis.push(`Тенденция: стабильное количество переходящих тикетов`);
      }
    }
  }
  
  return analysis.length > 0 ? analysis : ['Недостаточно данных для анализа'];
});
```

**Шаблон словесного отчета:**
```vue
<div class="chart-analysis">
  <h4 class="analysis-title">Анализ</h4>
  <div class="analysis-content">
    <p v-for="(analysis, index) in carryoverAnalysis" :key="index">
      {{ analysis }}
    </p>
  </div>
</div>
```

---

## 🔧 Технические требования

### Переиспользование логики

**Из TASK-058-04 можно переиспользовать:**
- Конфигурацию `chartOptions` с `datalabels`
- Функцию `formatNumber()`
- Стили для `.chart-period`

**Новые элементы:**
- Computed-свойство `carryoverChartPeriod`
- Computed-свойство `carryoverAnalysis`
- Блок `.chart-analysis` в шаблоне

### Структура данных

**Ожидаемая структура `props.data`:**
```javascript
{
  carryoverTicketsByMonth: [
    { month: 10, monthName: 'Октябрь', count: 30, year: 2025 },
    { month: 11, monthName: 'Ноябрь', count: 35, year: 2025 },
    { month: 12, monthName: 'Декабрь', count: 25, year: 2025 }
  ],
  previousPeriodData: {
    carryoverTickets: 28
  }
}
```

---

## ✅ Критерии приёмки

- [ ] Динамичный заголовок показывает период (месяца и год)
- [ ] Цифры отображаются на всех точках графика
- [ ] Словесный отчет под графиком отображает анализ
- [ ] Анализ основан на процентных показателях
- [ ] Анализ включает:
  - [ ] Строку с цифрами по месяцам
  - [ ] Динамику изменений между месяцами
  - [ ] Общую тенденцию за период
- [ ] Стили адаптивны для мобильных устройств
- [ ] Код протестирован с реальными данными

---

## 📚 Примеры реализации

### Пример 1: Полная реализация computed-свойств

```vue
<script setup>
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

const props = defineProps({
  data: {
    type: Object,
    required: true,
    default: () => ({
      carryoverTicketsByMonth: []
    })
  },
  meta: {
    type: Object,
    default: () => ({
      months: []
    })
  }
});

/**
 * Форматирование числа
 */
function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  
  if (num >= 1000) {
    return num.toLocaleString('ru-RU');
  }
  
  return num.toString();
}

/**
 * Получить период для заголовка графика
 */
function getChartPeriod(months) {
  if (!months || months.length === 0) {
    return null;
  }
  
  const firstMonth = months[0];
  const lastMonth = months[months.length - 1];
  
  if (!firstMonth || !lastMonth) {
    return null;
  }
  
  const firstMonthName = firstMonth.monthName || `Месяц ${firstMonth.month}`;
  const lastMonthName = lastMonth.monthName || `Месяц ${lastMonth.month}`;
  const year = firstMonth.year || new Date().getFullYear();
  
  return `${firstMonthName} — ${lastMonthName} ${year}`;
}

// Динамичный период для графика переходящих тикетов
const carryoverChartPeriod = computed(() => {
  return getChartPeriod(props.data?.carryoverTicketsByMonth || []);
});

// Анализ переходящих тикетов
const carryoverAnalysis = computed(() => {
  const months = props.data?.carryoverTicketsByMonth || [];
  
  if (months.length === 0) {
    return ['Нет данных для анализа'];
  }
  
  const analysis = [];
  
  // Формирование строки с цифрами
  const values = months.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  analysis.push(`Переходящие тикеты: ${values}`);
  
  // Анализ динамики
  if (months.length >= 2) {
    const month1 = months[0];
    const month2 = months[1];
    const month3 = months[2];
    
    if (month2 && month1 && month1.count > 0) {
      const change1 = ((month2.count - month1.count) / month1.count) * 100;
      analysis.push(
        `Динамика: ${change1 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change1).toFixed(1)}% в ${month2.monthName}`
      );
    }
    
    if (month3 && month2 && month2.count > 0) {
      const change2 = ((month3.count - month2.count) / month2.count) * 100;
      analysis.push(
        `${change2 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change2).toFixed(1)}% в ${month3.monthName}`
      );
    }
  }
  
  // Общая тенденция
  if (months.length >= 3) {
    const first = months[0].count || 0;
    const last = months[months.length - 1].count || 0;
    
    if (first > 0) {
      const totalChange = ((last - first) / first) * 100;
      if (totalChange > 5) {
        analysis.push(`Тенденция: рост переходящих тикетов за период на ${totalChange.toFixed(1)}%`);
      } else if (totalChange < -5) {
        analysis.push(`Тенденция: снижение переходящих тикетов за период на ${Math.abs(totalChange).toFixed(1)}%`);
      } else {
        analysis.push(`Тенденция: стабильное количество переходящих тикетов`);
      }
    }
  }
  
  return analysis.length > 0 ? analysis : ['Недостаточно данных для анализа'];
});
</script>
```

### Пример 2: Полный шаблон с анализом

```vue
<template>
  <div class="line-chart-months">
    <!-- График "Новые и Закрытые тикеты" -->
    <div class="chart-section">
      <!-- ... существующий код ... -->
    </div>
    
    <!-- График "Переходящие тикеты" -->
    <div class="chart-section">
      <h3 class="chart-title">
        Переходящие тикеты
        <span v-if="carryoverChartPeriod" class="chart-period">({{ carryoverChartPeriod }})</span>
      </h3>
      <div class="chart-container">
        <Line :data="carryoverChartData" :options="chartOptions" />
      </div>
      
      <!-- Словесный отчет -->
      <div class="chart-analysis">
        <h4 class="analysis-title">Анализ</h4>
        <div class="analysis-content">
          <p v-for="(analysis, index) in carryoverAnalysis" :key="index">
            {{ analysis }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
```

### Пример 3: Стили для блока анализа

```css
.chart-analysis {
  margin-top: 24px;
  padding: 20px;
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.analysis-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.analysis-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-content p {
  margin: 0;
  font-size: 14px;
  color: var(--b24-text-primary, #111827);
  line-height: 1.5;
}

.analysis-content p:first-child {
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-analysis {
    padding: 16px;
  }
  
  .analysis-content p {
    font-size: 13px;
  }
}
```

---

## 🔗 Зависимости

- **TASK-058-01:** Backend должен возвращать `previousPeriodData`
- **TASK-058-04:** Для переиспользования логики цифр на точках и динамичного заголовка

---

## 📝 История правок

- **2025-12-18 08:31 (UTC+3, Брест):** Создан детализированный документ для этапа 5
  - Описаны требования к динамичному заголовку
  - Описаны требования к цифрам на точках
  - Описаны требования к словесному отчету
  - Добавлены примеры реализации
  - Добавлены критерии приёмки

---

## ⚠️ Примечания

- **Переиспользование:** Можно переиспользовать логику из TASK-058-04 для динамичного заголовка и цифр на точках
- **Анализ:** Словесный отчет должен быть информативным, но не перегруженным
- **Адаптивность:** Блок анализа должен корректно отображаться на мобильных устройствах

