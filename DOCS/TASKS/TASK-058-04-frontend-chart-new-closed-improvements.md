# TASK-058-04: Frontend — улучшение графика "Новые и закрытые тикеты"

**Дата создания:** 2025-12-18 08:31 (UTC+3, Брест)  
**Статус:** 📝 Черновик  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-058: Улучшение модуля "График приема и закрытий сектора 1С" — режим 3 месяца](./TASK-058-enrichment-3-months-mode.md)  
**Этап:** 4 из 5  
**Зависимости:** TASK-058-01 (Backend должен возвращать `previousPeriodData`)

---

## 📋 Описание

Улучшить график "Новые и закрытые тикеты" в компоненте `LineChartMonths.vue`, добавив:
1. Цифры на точках графика (даже при перекрытии — двойной чип)
2. Динамичный заголовок с указанием периода (месяца)
3. Сводный итог под графиком с 6 цифрами (2 показателя × 3 месяца) + словесный анализ

---

## 🎯 Контекст

### Текущее состояние

**Файл:** `vue-app/src/components/graph-admission-closure/LineChartMonths.vue`

**Текущее отображение:**
```vue
<div class="chart-section">
  <h3 class="chart-title">Новые и Закрытые тикеты</h3>  <!-- Статичный заголовок -->
  <div class="chart-container">
    <Line :data="newClosedChartData" :options="chartOptions" />
    <!-- Нет цифр на точках -->
  </div>
  <!-- Нет сводного итога -->
</div>
```

**Проблемы:**
- Статичный заголовок не показывает период
- Нет цифр на точках графика
- Нет сводного итога с анализом

### Требуемое состояние

**Новое отображение:**
```vue
<div class="chart-section">
  <h3 class="chart-title">
    Новые и Закрытые тикеты
    <span class="chart-period">(Октябрь — Декабрь 2025)</span>  <!-- Динамичный период -->
  </h3>
  <div class="chart-container">
    <Line :data="newClosedChartData" :options="chartOptions" />
    <!-- Цифры на точках графика -->
  </div>
  <div class="chart-summary">
    <h4 class="summary-title">Сводный итог</h4>
    <div class="summary-numbers">
      <div class="summary-row">
        <span class="summary-label">Новые:</span>
        <span class="summary-values">50 (окт) → 60 (ноя) → 40 (дек)</span>
      </div>
      <div class="summary-row">
        <span class="summary-label">Закрытые:</span>
        <span class="summary-values">80 (окт) → 90 (ноя) → 70 (дек)</span>
      </div>
    </div>
    <div class="summary-analysis">
      <p>Новые тикеты: рост на 20% в ноябре, снижение на 33.3% в декабре</p>
      <p>Закрытые тикеты: рост на 12.5% в ноябре, снижение на 22.2% в декабре</p>
    </div>
  </div>
</div>
```

---

## 🔍 Детализация требований

### 1. Цифры на точках графика

**Задачи:**
1. Установить/настроить Chart.js плагин для отображения значений на точках
2. Добавить конфигурацию в `chartOptions` для плагина `datalabels`
3. Обработать случай перекрытия точек (двойной чип)

**Установка плагина (если требуется):**
```bash
npm install chartjs-plugin-datalabels
```

**Импорт плагина:**
```javascript
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS } from 'chart.js';

ChartJS.register(ChartDataLabels);
```

**Конфигурация плагина:**
```javascript
const chartOptions = {
  // ... существующие настройки ...
  plugins: {
    // ... существующие плагины ...
    datalabels: {
      anchor: 'end',
      align: 'top',
      formatter: (value, context) => {
        // Форматирование значения
        return value !== null && value !== undefined ? value.toString() : '';
      },
      color: '#333',
      font: {
        size: 12,
        weight: 'bold'
      },
      padding: {
        top: 4,
        bottom: 4
      },
      display: function(context) {
        // Показывать только если значение не null/undefined
        return context.dataset.data[context.dataIndex] !== null &&
               context.dataset.data[context.dataIndex] !== undefined;
      }
    }
  }
};
```

**Обработка перекрытия точек:**
- Если две точки перекрываются, Chart.js автоматически покажет оба значения
- Можно настроить смещение через `offset` в конфигурации `datalabels`

### 2. Динамичный заголовок

**Задачи:**
1. Создать computed-свойство `chartPeriod` для формирования периода
2. Обновить заголовок графика для отображения периода

**Computed-свойство:**
```javascript
const chartPeriod = computed(() => {
  const months = props.data?.newTicketsByMonth || [];
  
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
  Новые и Закрытые тикеты
  <span v-if="chartPeriod" class="chart-period">({{ chartPeriod }})</span>
</h3>
```

### 3. Сводный итог под графиком

**Задачи:**
1. Создать computed-свойство `summaryNumbers` для формирования строки с цифрами
2. Создать computed-свойство `summaryAnalysis` для расчета анализа
3. Реализовать функцию `generateTextAnalysis()` для словесного анализа
4. Добавить блок "Сводный итог" под графиком

**Computed-свойство для цифр:**
```javascript
const summaryNumbers = computed(() => {
  const months = props.data?.newTicketsByMonth || [];
  const closedMonths = props.data?.closedTicketsByMonth || [];
  
  if (months.length === 0) {
    return { new: '—', closed: '—' };
  }
  
  const newValues = months.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  const closedValues = closedMonths.map(m => 
    `${formatNumber(m.count || 0)} (${m.monthName || m.month})`
  ).join(' → ');
  
  return {
    new: newValues,
    closed: closedValues
  };
});
```

**Computed-свойство для анализа:**
```javascript
const summaryAnalysis = computed(() => {
  const months = props.data?.newTicketsByMonth || [];
  const closedMonths = props.data?.closedTicketsByMonth || [];
  
  if (months.length < 2) {
    return ['Недостаточно данных для анализа'];
  }
  
  const analysis = [];
  
  // Анализ новых тикетов
  if (months.length >= 2) {
    const month1 = months[0];
    const month2 = months[1];
    const month3 = months[2];
    
    if (month2 && month1 && month1.count > 0) {
      const change1 = ((month2.count - month1.count) / month1.count) * 100;
      analysis.push(
        `Новые тикеты: ${change1 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change1).toFixed(1)}% в ${month2.monthName}`
      );
    }
    
    if (month3 && month2 && month2.count > 0) {
      const change2 = ((month3.count - month2.count) / month2.count) * 100;
      analysis.push(
        `Новые тикеты: ${change2 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change2).toFixed(1)}% в ${month3.monthName}`
      );
    }
  }
  
  // Анализ закрытых тикетов
  if (closedMonths.length >= 2) {
    const month1 = closedMonths[0];
    const month2 = closedMonths[1];
    const month3 = closedMonths[2];
    
    if (month2 && month1 && month1.count > 0) {
      const change1 = ((month2.count - month1.count) / month1.count) * 100;
      analysis.push(
        `Закрытые тикеты: ${change1 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change1).toFixed(1)}% в ${month2.monthName}`
      );
    }
    
    if (month3 && month2 && month2.count > 0) {
      const change2 = ((month3.count - month2.count) / month2.count) * 100;
      analysis.push(
        `Закрытые тикеты: ${change2 >= 0 ? 'рост' : 'снижение'} на ${Math.abs(change2).toFixed(1)}% в ${month3.monthName}`
      );
    }
  }
  
  return analysis.length > 0 ? analysis : ['Недостаточно данных для анализа'];
});
```

**Шаблон сводного итога:**
```vue
<div class="chart-summary">
  <h4 class="summary-title">Сводный итог</h4>
  <div class="summary-numbers">
    <div class="summary-row">
      <span class="summary-label">Новые:</span>
      <span class="summary-values">{{ summaryNumbers.new }}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Закрытые:</span>
      <span class="summary-values">{{ summaryNumbers.closed }}</span>
    </div>
  </div>
  <div class="summary-analysis">
    <p v-for="(analysis, index) in summaryAnalysis" :key="index">
      {{ analysis }}
    </p>
  </div>
</div>
```

---

## 🔧 Технические требования

### Зависимости

**Установка плагина (если требуется):**
```bash
cd vue-app
npm install chartjs-plugin-datalabels
```

**Импорт в компоненте:**
```javascript
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Chart as ChartJS } from 'chart.js';

ChartJS.register(ChartDataLabels);
```

### Структура данных

**Ожидаемая структура `props.data`:**
```javascript
{
  newTicketsByMonth: [
    { month: 10, monthName: 'Октябрь', count: 50, year: 2025 },
    { month: 11, monthName: 'Ноябрь', count: 60, year: 2025 },
    { month: 12, monthName: 'Декабрь', count: 40, year: 2025 }
  ],
  closedTicketsByMonth: [
    { month: 10, monthName: 'Октябрь', count: 80, year: 2025 },
    { month: 11, monthName: 'Ноябрь', count: 90, year: 2025 },
    { month: 12, monthName: 'Декабрь', count: 70, year: 2025 }
  ],
  previousPeriodData: {
    newTickets: 133,
    closedTickets: 200
  }
}
```

---

## ✅ Критерии приёмки

- [ ] Плагин `chartjs-plugin-datalabels` установлен и зарегистрирован
- [ ] Цифры отображаются на всех точках графика
- [ ] При перекрытии точек показываются оба значения (двойной чип)
- [ ] Динамичный заголовок показывает период (месяца и год)
- [ ] Сводный итог отображает 6 цифр (2 показателя × 3 месяца)
- [ ] Словесный анализ основан на процентных показателях
- [ ] Анализ использует данные предыдущих месяцев для расчета процентов
- [ ] Стили адаптивны для мобильных устройств
- [ ] Код протестирован с реальными данными

---

## 📚 Примеры реализации

### Пример 1: Полная конфигурация chartOptions с datalabels

```javascript
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'top',
      labels: {
        font: {
          size: 14,
          weight: '500'
        },
        padding: 16,
        boxWidth: 20,
        boxHeight: 12
      }
    },
    tooltip: {
      enabled: true,
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      padding: 12
    },
    datalabels: {
      anchor: 'end',
      align: 'top',
      formatter: (value, context) => {
        if (value === null || value === undefined || isNaN(value)) {
          return '';
        }
        return value.toString();
      },
      color: '#333',
      font: {
        size: 12,
        weight: 'bold'
      },
      padding: {
        top: 4,
        bottom: 4
      },
      display: function(context) {
        const value = context.dataset.data[context.dataIndex];
        return value !== null && value !== undefined && !isNaN(value);
      },
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderColor: '#333',
      borderWidth: 1,
      borderRadius: 4,
      padding: 4
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
        font: {
          size: 14
        },
        padding: 10
      },
      grid: {
        lineWidth: 1.5
      }
    },
    x: {
      ticks: {
        maxRotation: 0,
        minRotation: 0,
        font: {
          size: 14
        },
        padding: 10
      },
      grid: {
        lineWidth: 1.5
      }
    }
  }
};
```

### Пример 2: Полные стили для сводного итога

```css
.chart-summary {
  margin-top: 24px;
  padding: 20px;
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: 8px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.summary-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.summary-numbers {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.summary-label {
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  min-width: 100px;
}

.summary-values {
  color: var(--b24-text-secondary, #6b7280);
  font-family: 'Courier New', monospace;
}

.summary-analysis {
  padding-top: 16px;
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
}

.summary-analysis p {
  margin: 8px 0;
  font-size: 14px;
  color: var(--b24-text-primary, #111827);
  line-height: 1.5;
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-summary {
    padding: 16px;
  }
  
  .summary-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .summary-label {
    min-width: auto;
  }
}
```

---

## 🔗 Зависимости

- **TASK-058-01:** Backend должен возвращать `previousPeriodData`
- **TASK-053-05:** Линейные графики для 3-месячного режима (базовая реализация)

---

## 📝 История правок

- **2025-12-18 08:31 (UTC+3, Брест):** Создан детализированный документ для этапа 4
  - Описаны требования к цифрам на точках
  - Описаны требования к динамичному заголовку
  - Описаны требования к сводному итогу
  - Добавлены примеры реализации
  - Добавлены критерии приёмки

---

## ⚠️ Примечания

- **Важно:** Плагин `chartjs-plugin-datalabels` должен быть установлен и зарегистрирован
- **Производительность:** Анализ должен рассчитываться эффективно (computed-свойства)
- **Адаптивность:** Сводный итог должен корректно отображаться на мобильных устройствах

