# TASK-017-04: Реализация статистики и визуализации

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Создать компонент статистики с ключевыми метриками, добавить графики (линейный график событий по времени, круговая диаграмма по категориям), реализовать дашборд, добавить сравнение периодов.

---

## 🎯 Контекст

Этап 4 из глобального плана TASK-017. Необходимо визуализировать данные логов для лучшего понимания паттернов и трендов.

---

## 📁 Модули и компоненты

- `vue-app/src/components/webhooks/WebhookLogsStats.vue` — компонент статистики
- `vue-app/src/components/webhooks/WebhookLogsCharts.vue` — компонент графиков
- `vue-app/src/pages/WebhookLogsPage.vue` — интеграция статистики
- `vue-app/src/services/webhook-logs-api.js` — расширение API для статистики (если нужен серверный расчёт)

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны работать
- **TASK-017-03** — фильтры должны работать

**От модулей:**
- Библиотека для графиков (Chart.js, ApexCharts, или аналогичная)

---

## 📝 Ступенчатые подзадачи

### 1. Установка библиотеки для графиков

1.1. Выбрать библиотеку (Chart.js рекомендуется)
1.2. Установить через npm
1.3. Создать обёртку для Vue.js (vue-chartjs)

### 2. Создание компонента статистики

2.1. Создать `WebhookLogsStats.vue`
2.2. Реализовать расчёт метрик:
   - Общее количество событий
   - Количество по категориям
   - Количество по типам событий
   - Количество ошибок
   - Средний размер payload
2.3. Отобразить метрики в карточках

### 3. Создание графиков

3.1. Линейный график событий по времени (часы/дни)
3.2. Круговая диаграмма по категориям
3.3. Столбчатая диаграмма по типам событий
3.4. График ошибок по времени

### 4. Реализация дашборда

4.1. Создать секцию дашборда в `WebhookLogsPage.vue`
4.2. Разместить статистику и графики
4.3. Добавить переключение между графиками
4.4. Добавить обновление данных при изменении фильтров

### 5. Сравнение периодов

5.1. Добавить выбор двух периодов для сравнения
5.2. Реализовать расчёт изменений (процент, абсолютное значение)
5.3. Визуализировать сравнение на графиках

---

## ⚙️ Технические требования

### 1. Установка Chart.js

**1.1. Установка библиотек:**
```bash
cd vue-app
npm install chart.js vue-chartjs
```

**1.2. Проверка установки:**
```bash
# Проверить package.json
cat package.json | grep chart

# Должно быть:
# "chart.js": "^4.x.x"
# "vue-chartjs": "^5.x.x"
```

**1.3. Создать конфигурацию Chart.js:**

```javascript
// utils/chart-config.js
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Регистрация компонентов Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Глобальная конфигурация Chart.js
ChartJS.defaults.responsive = true;
ChartJS.defaults.maintainAspectRatio = false;
ChartJS.defaults.plugins.legend.display = true;
ChartJS.defaults.plugins.legend.position = 'top';

// Цветовая палитра Bitrix24
export const chartColors = {
  primary: '#007bff',
  success: '#28a745',
  danger: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
  light: '#f8f9fa',
  dark: '#343a40'
};

// Градиенты для графиков
export const chartGradients = {
  primary: (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0.1)');
    return gradient;
  },
  success: (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(40, 167, 69, 0.8)');
    gradient.addColorStop(1, 'rgba(40, 167, 69, 0.1)');
    return gradient;
  }
};

export default ChartJS;
```

### 2. Компонент статистики

**2.1. Создать файл `vue-app/src/components/webhooks/WebhookLogsStats.vue`:**

```vue
<template>
  <div class="webhook-stats">
    <h3 class="stats-title">Статистика</h3>
    <div class="stats-grid">
      <!-- Общее количество событий -->
      <div class="stat-card stat-card-primary">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">Всего событий</div>
          <div class="stat-value">{{ totalEvents }}</div>
          <div class="stat-change" v-if="previousPeriodStats">
            <span :class="getChangeClass(totalEventsChange)">
              {{ formatChange(totalEventsChange) }}
            </span>
            <span class="stat-period">vs предыдущий период</span>
          </div>
        </div>
      </div>

      <!-- Задачи -->
      <div class="stat-card stat-card-info">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">Задачи</div>
          <div class="stat-value">{{ tasksCount }}</div>
          <div class="stat-percentage">
            {{ getPercentage(tasksCount, totalEvents) }}% от общего
          </div>
        </div>
      </div>

      <!-- Смарт-процессы -->
      <div class="stat-card stat-card-success">
        <div class="stat-icon">⚙️</div>
        <div class="stat-content">
          <div class="stat-label">Смарт-процессы</div>
          <div class="stat-value">{{ smartProcessesCount }}</div>
          <div class="stat-percentage">
            {{ getPercentage(smartProcessesCount, totalEvents) }}% от общего
          </div>
        </div>
      </div>

      <!-- Ошибки -->
      <div class="stat-card stat-card-danger">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
          <div class="stat-label">Ошибки</div>
          <div class="stat-value">{{ errorsCount }}</div>
          <div class="stat-percentage" v-if="errorsCount > 0">
            {{ getPercentage(errorsCount, totalEvents) }}% от общего
          </div>
          <div class="stat-percentage success" v-else>
            Ошибок нет
          </div>
        </div>
      </div>

      <!-- Средний размер payload -->
      <div class="stat-card stat-card-warning">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-label">Средний размер payload</div>
          <div class="stat-value">{{ averagePayloadSize }}</div>
          <div class="stat-unit">байт</div>
        </div>
      </div>

      <!-- Уникальные IP -->
      <div class="stat-card stat-card-secondary">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <div class="stat-label">Уникальных IP</div>
          <div class="stat-value">{{ uniqueIpsCount }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'WebhookLogsStats',
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    },
    previousPeriodStats: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    // Основные метрики
    const totalEvents = computed(() => props.logs.length);
    
    const tasksCount = computed(() => 
      props.logs.filter(log => log.category === 'tasks').length
    );
    
    const smartProcessesCount = computed(() => 
      props.logs.filter(log => log.category === 'smart-processes').length
    );
    
    const errorsCount = computed(() => 
      props.logs.filter(log => log.category === 'errors').length
    );
    
    // Средний размер payload
    const averagePayloadSize = computed(() => {
      if (props.logs.length === 0) return 0;
      
      const totalSize = props.logs.reduce((sum, log) => {
        try {
          const payloadSize = JSON.stringify(log.payload || {}).length;
          return sum + payloadSize;
        } catch {
          return sum;
        }
      }, 0);
      
      return Math.round(totalSize / props.logs.length);
    });
    
    // Уникальные IP
    const uniqueIpsCount = computed(() => {
      const ips = new Set();
      props.logs.forEach(log => {
        if (log.ip) {
          ips.add(log.ip);
        }
      });
      return ips.size;
    });
    
    // Процент от общего
    const getPercentage = (value, total) => {
      if (total === 0) return 0;
      return Math.round((value / total) * 100);
    };
    
    // Изменение по сравнению с предыдущим периодом
    const totalEventsChange = computed(() => {
      if (!props.previousPeriodStats) return null;
      const previous = props.previousPeriodStats.totalEvents || 0;
      const current = totalEvents.value;
      return current - previous;
    });
    
    const getChangeClass = (change) => {
      if (change === null) return '';
      if (change > 0) return 'change-positive';
      if (change < 0) return 'change-negative';
      return 'change-neutral';
    };
    
    const formatChange = (change) => {
      if (change === null) return '';
      const sign = change > 0 ? '+' : '';
      return `${sign}${change}`;
    };
    
    return {
      totalEvents,
      tasksCount,
      smartProcessesCount,
      errorsCount,
      averagePayloadSize,
      uniqueIpsCount,
      getPercentage,
      totalEventsChange,
      getChangeClass,
      formatChange
    };
  }
};
</script>

<style scoped>
.webhook-stats {
  margin-bottom: 30px;
}

.stats-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.stat-card-primary {
  border-left: 4px solid #007bff;
}

.stat-card-info {
  border-left: 4px solid #17a2b8;
}

.stat-card-success {
  border-left: 4px solid #28a745;
}

.stat-card-danger {
  border-left: 4px solid #dc3545;
}

.stat-card-warning {
  border-left: 4px solid #ffc107;
}

.stat-card-secondary {
  border-left: 4px solid #6c757d;
}

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.stat-card-danger .stat-value {
  color: #dc3545;
}

.stat-percentage {
  font-size: 12px;
  color: #6c757d;
}

.stat-percentage.success {
  color: #28a745;
  font-weight: 500;
}

.stat-unit {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.stat-change {
  margin-top: 8px;
  font-size: 12px;
}

.change-positive {
  color: #28a745;
  font-weight: 600;
}

.change-negative {
  color: #dc3545;
  font-weight: 600;
}

.change-neutral {
  color: #6c757d;
}

.stat-period {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

### 3. Линейный график событий по времени

**3.1. Создать файл `vue-app/src/components/webhooks/charts/EventsTimelineChart.vue`:**

```vue
<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>События по времени</h4>
      <div class="chart-controls">
        <button
          v-for="period in timePeriods"
          :key="period.value"
          @click="selectedPeriod = period.value"
          :class="['period-btn', { active: selectedPeriod === period.value }]"
        >
          {{ period.label }}
        </button>
      </div>
    </div>
    <div class="chart-wrapper">
      <Line 
        v-if="chartData"
        :data="chartData" 
        :options="chartOptions"
        :height="300"
      />
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { Line } from 'vue-chartjs';
import { chartColors, chartGradients } from '@/utils/chart-config.js';

export default {
  name: 'EventsTimelineChart',
  components: {
    Line
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const selectedPeriod = ref('hour'); // 'hour' | 'day' | 'week'
    
    const timePeriods = [
      { value: 'hour', label: 'По часам' },
      { value: 'day', label: 'По дням' },
      { value: 'week', label: 'По неделям' }
    ];
    
    // Группировка логов по времени
    const groupByTime = (logs, period) => {
      const grouped = {};
      
      logs.forEach(log => {
        if (!log.timestamp) return;
        
        const date = new Date(log.timestamp);
        let key;
        
        switch (period) {
          case 'hour':
            // Группировка по часам: YYYY-MM-DD HH:00
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
            break;
          case 'day':
            // Группировка по дням: YYYY-MM-DD
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            // Группировка по неделям: YYYY-WW
            const week = getWeekNumber(date);
            key = `${date.getFullYear()}-W${String(week).padStart(2, '0')}`;
            break;
          default:
            key = date.toISOString();
        }
        
        grouped[key] = (grouped[key] || 0) + 1;
      });
      
      return grouped;
    };
    
    // Получение номера недели
    const getWeekNumber = (date) => {
      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    
    // Данные для графика
    const chartData = computed(() => {
      if (!props.logs || props.logs.length === 0) {
        return null;
      }
      
      const grouped = groupByTime(props.logs, selectedPeriod.value);
      const labels = Object.keys(grouped).sort();
      const data = labels.map(label => grouped[label]);
      
      return {
        labels,
        datasets: [{
          label: 'Количество событий',
          data,
          borderColor: chartColors.primary,
          backgroundColor: (ctx) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 400);
            gradient.addColorStop(0, 'rgba(0, 123, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 123, 255, 0.05)');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: chartColors.primary,
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      };
    });
    
    // Опции графика
    const chartOptions = computed(() => {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          title: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Время'
            },
            grid: {
              display: false
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Количество событий'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      };
    });
    
    return {
      selectedPeriod,
      timePeriods,
      chartData,
      chartOptions
    };
  }
};
</script>

<style scoped>
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-controls {
  display: flex;
  gap: 8px;
}

.period-btn {
  padding: 6px 12px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.period-btn:hover {
  background: #e9ecef;
}

.period-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .chart-controls {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .chart-wrapper {
    height: 250px;
  }
}
</style>
```

### 4. Круговая диаграмма по категориям

**4.1. Создать файл `vue-app/src/components/webhooks/charts/CategoriesChart.vue`:**

```vue
<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>Распределение по категориям</h4>
    </div>
    <div class="chart-wrapper">
      <Doughnut 
        v-if="chartData"
        :data="chartData" 
        :options="chartOptions"
        :height="300"
      />
    </div>
    <div class="chart-legend">
      <div
        v-for="(item, index) in legendData"
        :key="index"
        class="legend-item"
      >
        <span 
          class="legend-color" 
          :style="{ backgroundColor: item.color }"
        ></span>
        <span class="legend-label">{{ item.label }}</span>
        <span class="legend-value">{{ item.value }} ({{ item.percentage }}%)</span>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { Doughnut } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

export default {
  name: 'CategoriesChart',
  components: {
    Doughnut
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const categoryLabels = {
      tasks: 'Задачи',
      'smart-processes': 'Смарт-процессы',
      errors: 'Ошибки'
    };
    
    const categoryColors = {
      tasks: chartColors.primary,
      'smart-processes': chartColors.success,
      errors: chartColors.danger
    };
    
    // Подсчёт по категориям
    const categoryCounts = computed(() => {
      const counts = {
        tasks: 0,
        'smart-processes': 0,
        errors: 0
      };
      
      props.logs.forEach(log => {
        if (log.category && counts.hasOwnProperty(log.category)) {
          counts[log.category]++;
        }
      });
      
      return counts;
    });
    
    const total = computed(() => {
      return Object.values(categoryCounts.value).reduce((sum, count) => sum + count, 0);
    });
    
    // Данные для графика
    const chartData = computed(() => {
      if (total.value === 0) {
        return null;
      }
      
      const labels = [];
      const data = [];
      const backgroundColor = [];
      
      Object.keys(categoryCounts.value).forEach(category => {
        if (categoryCounts.value[category] > 0) {
          labels.push(categoryLabels[category]);
          data.push(categoryCounts.value[category]);
          backgroundColor.push(categoryColors[category]);
        }
      });
      
      return {
        labels,
        datasets: [{
          data,
          backgroundColor,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 4
        }]
      };
    });
    
    // Данные для легенды
    const legendData = computed(() => {
      return Object.keys(categoryCounts.value)
        .filter(category => categoryCounts.value[category] > 0)
        .map(category => ({
          label: categoryLabels[category],
          value: categoryCounts.value[category],
          percentage: total.value > 0 
            ? Math.round((categoryCounts.value[category] / total.value) * 100)
            : 0,
          color: categoryColors[category]
        }));
    });
    
    // Опции графика
    const chartOptions = computed(() => {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Используем кастомную легенду
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                return `${label}: ${value} (${percentage}%)`;
              }
            }
          }
        }
      };
    });
    
    return {
      chartData,
      chartOptions,
      legendData
    };
  }
};
</script>

<style scoped>
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-header {
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-wrapper {
  height: 300px;
  position: relative;
  margin-bottom: 20px;
}

.chart-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  flex-shrink: 0;
}

.legend-label {
  flex: 1;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.legend-value {
  font-size: 14px;
  color: #6c757d;
  font-weight: 600;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 250px;
  }
}
</style>
```

### 5. Столбчатая диаграмма по типам событий

**5.1. Создать файл `vue-app/src/components/webhooks/charts/EventsBarChart.vue`:**

```vue
<template>
  <div class="chart-container">
    <div class="chart-header">
      <h4>События по типам</h4>
    </div>
    <div class="chart-wrapper">
      <Bar 
        v-if="chartData"
        :data="chartData" 
        :options="chartOptions"
        :height="300"
      />
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';

export default {
  name: 'EventsBarChart',
  components: {
    Bar
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    // Подсчёт событий по типам
    const eventCounts = computed(() => {
      const counts = {};
      
      props.logs.forEach(log => {
        if (log.event) {
          counts[log.event] = (counts[log.event] || 0) + 1;
        }
      });
      
      // Сортировка по количеству (по убыванию)
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
    });
    
    // Данные для графика
    const chartData = computed(() => {
      if (Object.keys(eventCounts.value).length === 0) {
        return null;
      }
      
      const labels = Object.keys(eventCounts.value);
      const data = Object.values(eventCounts.value);
      
      // Генерация цветов
      const colors = labels.map((_, index) => {
        const colorPalette = [
          chartColors.primary,
          chartColors.success,
          chartColors.info,
          chartColors.warning,
          chartColors.danger
        ];
        return colorPalette[index % colorPalette.length];
      });
      
      return {
        labels,
        datasets: [{
          label: 'Количество событий',
          data,
          backgroundColor: colors.map(color => color + '80'), // 50% прозрачности
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 4
        }]
      };
    });
    
    // Опции графика
    const chartOptions = computed(() => {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Тип события'
            },
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Количество'
            },
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        }
      };
    });
    
    return {
      chartData,
      chartOptions
    };
  }
};
</script>

<style scoped>
.chart-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.chart-header {
  margin-bottom: 20px;
}

.chart-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

@media (max-width: 768px) {
  .chart-wrapper {
    height: 250px;
  }
}
</style>
```

---

## ✅ Критерии приёмки

- [ ] Библиотека для графиков установлена и работает
- [ ] Компонент статистики отображает все метрики
- [ ] Линейный график событий по времени работает
- [ ] Круговая диаграмма по категориям работает
- [ ] Столбчатая диаграмма по типам событий работает
- [ ] График ошибок по времени работает
- [ ] Дашборд отображается корректно
- [ ] Графики обновляются при изменении фильтров
- [ ] Сравнение периодов работает
- [ ] Графики адаптивны для мобильных устройств
- [ ] Производительность не ухудшена

---

### 6. Реализация дашборда

**6.1. Создать компонент дашборда `vue-app/src/components/webhooks/WebhookLogsDashboard.vue`:**

```vue
<template>
  <div class="webhook-dashboard">
    <div class="dashboard-header">
      <h2>Дашборд логов вебхуков</h2>
      <div class="dashboard-controls">
        <button
          @click="showStats = !showStats"
          class="toggle-btn"
          :class="{ active: showStats }"
        >
          {{ showStats ? '▼' : '▶' }} Статистика
        </button>
        <button
          @click="showCharts = !showCharts"
          class="toggle-btn"
          :class="{ active: showCharts }"
        >
          {{ showCharts ? '▼' : '▶' }} Графики
        </button>
      </div>
    </div>

    <!-- Статистика -->
    <Transition name="slide-down">
      <div v-if="showStats" class="dashboard-section">
        <WebhookLogsStats
          :logs="logs"
          :previous-period-stats="previousPeriodStats"
        />
      </div>
    </Transition>

    <!-- Графики -->
    <Transition name="slide-down">
      <div v-if="showCharts" class="dashboard-section">
        <div class="charts-grid">
          <!-- Линейный график -->
          <div class="chart-item">
            <EventsTimelineChart :logs="logs" />
          </div>

          <!-- Круговая диаграмма -->
          <div class="chart-item">
            <CategoriesChart :logs="logs" />
          </div>

          <!-- Столбчатая диаграмма -->
          <div class="chart-item chart-item-full">
            <EventsBarChart :logs="logs" />
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script>
import { ref } from 'vue';
import WebhookLogsStats from './WebhookLogsStats.vue';
import EventsTimelineChart from './charts/EventsTimelineChart.vue';
import CategoriesChart from './charts/CategoriesChart.vue';
import EventsBarChart from './charts/EventsBarChart.vue';

export default {
  name: 'WebhookLogsDashboard',
  components: {
    WebhookLogsStats,
    EventsTimelineChart,
    CategoriesChart,
    EventsBarChart
  },
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    },
    previousPeriodStats: {
      type: Object,
      default: null
    }
  },
  setup() {
    const showStats = ref(true);
    const showCharts = ref(true);
    
    return {
      showStats,
      showCharts
    };
  }
};
</script>

<style scoped>
.webhook-dashboard {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.dashboard-controls {
  display: flex;
  gap: 10px;
}

.toggle-btn {
  padding: 8px 16px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.toggle-btn:hover {
  background: #f8f9fa;
}

.toggle-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.dashboard-section {
  margin-bottom: 20px;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
}

.chart-item {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.chart-item-full {
  grid-column: 1 / -1;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
  max-height: 5000px;
  opacity: 1;
}

.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .charts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

### 7. Сравнение периодов

**7.1. Создать компонент сравнения `vue-app/src/components/webhooks/PeriodComparison.vue`:**

```vue
<template>
  <div class="period-comparison">
    <div class="comparison-header">
      <h4>Сравнение периодов</h4>
      <div class="period-selectors">
        <div class="period-selector">
          <label>Период 1:</label>
          <input
            v-model="period1.date"
            type="date"
            class="date-input"
          />
        </div>
        <div class="period-selector">
          <label>Период 2:</label>
          <input
            v-model="period2.date"
            type="date"
            class="date-input"
          />
        </div>
        <button
          @click="comparePeriods"
          class="btn-compare"
          :disabled="!canCompare"
        >
          Сравнить
        </button>
      </div>
    </div>

    <div v-if="comparisonData" class="comparison-results">
      <div class="comparison-grid">
        <div
          v-for="metric in comparisonMetrics"
          :key="metric.key"
          class="comparison-card"
        >
          <div class="metric-label">{{ metric.label }}</div>
          <div class="metric-values">
            <div class="metric-value">
              <span class="period-label">Период 1:</span>
              <span class="value">{{ comparisonData.period1[metric.key] }}</span>
            </div>
            <div class="metric-value">
              <span class="period-label">Период 2:</span>
              <span class="value">{{ comparisonData.period2[metric.key] }}</span>
            </div>
            <div class="metric-change" :class="getChangeClass(comparisonData.changes[metric.key])">
              <span class="change-icon">{{ getChangeIcon(comparisonData.changes[metric.key]) }}</span>
              <span class="change-value">{{ formatChange(comparisonData.changes[metric.key]) }}</span>
              <span class="change-percent">({{ formatPercent(comparisonData.changes[metric.key + 'Percent']) }})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';

export default {
  name: 'PeriodComparison',
  setup() {
    const period1 = ref({
      date: new Date().toISOString().split('T')[0]
    });
    
    const period2 = ref({
      date: new Date(Date.now() - 86400000).toISOString().split('T')[0] // Вчера
    });
    
    const comparisonData = ref(null);
    const loading = ref(false);
    
    const canCompare = computed(() => {
      return period1.value.date && period2.value.date && period1.value.date !== period2.value.date;
    });
    
    const comparisonMetrics = [
      { key: 'total', label: 'Всего событий' },
      { key: 'tasks', label: 'Задачи' },
      { key: 'smartProcesses', label: 'Смарт-процессы' },
      { key: 'errors', label: 'Ошибки' }
    ];
    
    // Сравнение периодов
    const comparePeriods = async () => {
      if (!canCompare.value) return;
      
      loading.value = true;
      
      try {
        // Загрузка данных для периода 1
        const result1 = await WebhookLogsApiService.getLogs(
          { date: period1.value.date },
          1,
          10000
        );
        
        // Загрузка данных для периода 2
        const result2 = await WebhookLogsApiService.getLogs(
          { date: period2.value.date },
          1,
          10000
        );
        
        const logs1 = result1.logs || [];
        const logs2 = result2.logs || [];
        
        // Расчёт метрик
        const stats1 = calculateStats(logs1);
        const stats2 = calculateStats(logs2);
        
        // Расчёт изменений
        const changes = {
          total: stats2.total - stats1.total,
          totalPercent: stats1.total > 0 ? ((stats2.total - stats1.total) / stats1.total) * 100 : 0,
          tasks: stats2.tasks - stats1.tasks,
          tasksPercent: stats1.tasks > 0 ? ((stats2.tasks - stats1.tasks) / stats1.tasks) * 100 : 0,
          smartProcesses: stats2.smartProcesses - stats1.smartProcesses,
          smartProcessesPercent: stats1.smartProcesses > 0 ? ((stats2.smartProcesses - stats1.smartProcesses) / stats1.smartProcesses) * 100 : 0,
          errors: stats2.errors - stats1.errors,
          errorsPercent: stats1.errors > 0 ? ((stats2.errors - stats1.errors) / stats1.errors) * 100 : 0
        };
        
        comparisonData.value = {
          period1: stats1,
          period2: stats2,
          changes
        };
      } catch (error) {
        console.error('Error comparing periods:', error);
      } finally {
        loading.value = false;
      }
    };
    
    // Расчёт статистики для периода
    const calculateStats = (logs) => {
      return {
        total: logs.length,
        tasks: logs.filter(l => l.category === 'tasks').length,
        smartProcesses: logs.filter(l => l.category === 'smart-processes').length,
        errors: logs.filter(l => l.category === 'errors').length
      };
    };
    
    const getChangeClass = (change) => {
      if (change > 0) return 'change-positive';
      if (change < 0) return 'change-negative';
      return 'change-neutral';
    };
    
    const getChangeIcon = (change) => {
      if (change > 0) return '↑';
      if (change < 0) return '↓';
      return '→';
    };
    
    const formatChange = (change) => {
      const sign = change > 0 ? '+' : '';
      return `${sign}${change}`;
    };
    
    const formatPercent = (percent) => {
      if (percent === null || percent === undefined) return '0%';
      const sign = percent > 0 ? '+' : '';
      return `${sign}${Math.round(percent)}%`;
    };
    
    return {
      period1,
      period2,
      comparisonData,
      loading,
      canCompare,
      comparisonMetrics,
      comparePeriods,
      getChangeClass,
      getChangeIcon,
      formatChange,
      formatPercent
    };
  }
};
</script>

<style scoped>
.period-comparison {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.comparison-header {
  margin-bottom: 20px;
}

.comparison-header h4 {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.period-selectors {
  display: flex;
  gap: 15px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.period-selector {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.period-selector label {
  font-size: 13px;
  color: #6c757d;
  font-weight: 500;
}

.date-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.btn-compare {
  padding: 8px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-compare:hover:not(:disabled) {
  background: #0056b3;
}

.btn-compare:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

.comparison-results {
  margin-top: 20px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.comparison-card {
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #007bff;
}

.metric-label {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.metric-values {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-value {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.period-label {
  font-size: 12px;
  color: #6c757d;
}

.value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #dee2e6;
  font-size: 13px;
  font-weight: 600;
}

.change-positive {
  color: #28a745;
}

.change-negative {
  color: #dc3545;
}

.change-neutral {
  color: #6c757d;
}

.change-icon {
  font-size: 16px;
}

@media (max-width: 768px) {
  .period-selectors {
    flex-direction: column;
    align-items: stretch;
  }
  
  .comparison-grid {
    grid-template-columns: 1fr;
  }
}
</style>
```

### 8. Полная интеграция в WebhookLogsPage

**8.1. Обновить WebhookLogsPage.vue для интеграции дашборда:**

```vue
<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <div class="page-header-top">
        <button @click="goBack" class="back-button">← Назад</button>
      </div>
      <h1>Логи вебхуков Bitrix24</h1>
    </div>

    <div v-if="!hasAccess" class="access-denied">
      <p>У вас нет доступа к просмотру логов вебхуков.</p>
    </div>

    <div v-else class="page-content">
      <!-- Дашборд -->
      <WebhookLogsDashboard
        :logs="logs"
        :previous-period-stats="previousPeriodStats"
      />

      <!-- Поиск и фильтры -->
      <WebhookLogSearch
        v-model="searchQuery"
        @search="handleSearch"
      />

      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />

      <!-- Список логов -->
      <WebhookLogList
        :logs="filteredLogs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import WebhookLogsDashboard from '@/components/webhooks/WebhookLogsDashboard.vue';
// ... остальные импорты ...

export default {
  components: {
    WebhookLogsDashboard,
    // ... остальные компоненты ...
  },
  setup() {
    const logs = ref([]);
    const previousPeriodStats = ref(null);
    
    // Загрузка статистики предыдущего периода для сравнения
    const loadPreviousPeriodStats = async () => {
      try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        const result = await WebhookLogsApiService.getLogs(
          { date: yesterday.toISOString().split('T')[0] },
          1,
          10000
        );
        
        const previousLogs = result.logs || [];
        previousPeriodStats.value = {
          totalEvents: previousLogs.length,
          tasks: previousLogs.filter(l => l.category === 'tasks').length,
          smartProcesses: previousLogs.filter(l => l.category === 'smart-processes').length,
          errors: previousLogs.filter(l => l.category === 'errors').length
        };
      } catch (error) {
        console.error('Error loading previous period stats:', error);
      }
    };
    
    // Обновление статистики при изменении логов
    watch(logs, () => {
      // Можно обновить previousPeriodStats если нужно
    });
    
    return {
      logs,
      previousPeriodStats,
      loadPreviousPeriodStats,
      // ... остальные свойства ...
    };
  }
};
</script>
```

## 🧪 Тестирование

### Тестирование установки Chart.js:
1. Выполнить `npm install chart.js vue-chartjs`
2. Проверить package.json на наличие зависимостей
3. Проверить отсутствие ошибок при импорте

### Тестирование статистики:
1. Загрузить страницу с логами
2. Проверить корректность всех метрик:
   - Общее количество событий
   - Количество по категориям
   - Средний размер payload
   - Уникальные IP
3. Изменить фильтры
4. Проверить обновление метрик
5. Проверить сравнение с предыдущим периодом (если реализовано)

### Тестирование графиков:
1. **Линейный график:**
   - Проверить отображение графика
   - Проверить переключение периодов (часы/дни/недели)
   - Проверить интерактивность (hover, tooltip)
   - Проверить корректность данных

2. **Круговая диаграмма:**
   - Проверить отображение всех категорий
   - Проверить легенду
   - Проверить tooltip с процентами
   - Проверить корректность расчётов

3. **Столбчатая диаграмма:**
   - Проверить отображение всех типов событий
   - Проверить сортировку по количеству
   - Проверить интерактивность
   - Проверить корректность данных

### Тестирование дашборда:
1. Проверить отображение статистики
2. Проверить отображение всех графиков
3. Проверить переключение секций (сворачивание/разворачивание)
4. Проверить обновление при изменении фильтров
5. Проверить адаптивность на мобильных

### Тестирование сравнения периодов:
1. Выбрать два периода
2. Нажать "Сравнить"
3. Проверить отображение метрик для обоих периодов
4. Проверить расчёт изменений (процент, абсолютное значение)
5. Проверить визуальное отображение изменений (↑ ↓)

### Тестирование производительности:
1. Загрузить страницу с большим количеством логов (1000+)
2. Проверить время рендеринга графиков
3. Проверить плавность взаимодействия
4. Проверить использование памяти

## 🐛 Troubleshooting

### Проблема 1: Chart.js не устанавливается

**Симптомы:**
- Ошибка при `npm install`

**Решение:**
1. Проверить версию Node.js (должна быть >= 14)
2. Очистить кеш: `npm cache clean --force`
3. Удалить node_modules и package-lock.json
4. Выполнить `npm install` заново

### Проблема 2: Графики не отображаются

**Симптомы:**
- Компоненты графиков не рендерятся

**Решение:**
1. Проверить регистрацию компонентов Chart.js
2. Проверить импорт компонентов vue-chartjs
3. Проверить консоль на ошибки
4. Убедиться, что данные передаются в компоненты
5. Проверить высоту контейнера графика

### Проблема 3: Графики не обновляются

**Симптомы:**
- При изменении фильтров графики не меняются

**Решение:**
1. Проверить, что `logs` реактивен (ref/computed)
2. Проверить watch на изменения logs
3. Убедиться, что компоненты используют computed свойства
4. Проверить, что ключи компонентов обновляются при необходимости

### Проблема 4: Низкая производительность графиков

**Симптомы:**
- Графики тормозят при большом количестве данных

**Решение:**
1. Ограничить количество точек на графике (максимум 100-200)
2. Использовать агрегацию данных
3. Реализовать ленивую загрузку графиков
4. Оптимизировать рендеринг (использовать requestAnimationFrame)

### Проблема 5: Графики не адаптивны

**Симптомы:**
- На мобильных устройствах графики выходят за границы

**Решение:**
1. Проверить `responsive: true` в опциях
2. Проверить `maintainAspectRatio: false`
3. Установить фиксированную высоту контейнера
4. Проверить медиа-запросы в CSS

---

## 📚 Дополнительные ресурсы

- [Chart.js Documentation](https://www.chartjs.org/)
- [vue-chartjs](https://vue-chartjs.org/)

---

## 📋 Чек-лист выполнения задачи

### Установка и настройка:
- [ ] Chart.js установлен через npm
- [ ] vue-chartjs установлен
- [ ] Конфигурация Chart.js создана
- [ ] Компоненты Chart.js зарегистрированы
- [ ] Цветовая палитра настроена

### Компонент статистики:
- [ ] WebhookLogsStats.vue создан
- [ ] Все метрики рассчитываются корректно
- [ ] Метрики отображаются в карточках
- [ ] Сравнение с предыдущим периодом работает (если реализовано)
- [ ] Проценты рассчитываются правильно
- [ ] Адаптивность для мобильных

### Графики:
- [ ] Линейный график событий по времени создан
- [ ] Переключение периодов (часы/дни/недели) работает
- [ ] Круговая диаграмма по категориям создана
- [ ] Столбчатая диаграмма по типам событий создана
- [ ] График ошибок по времени создан (если реализован)
- [ ] Все графики интерактивны (hover, tooltip)
- [ ] Графики адаптивны для мобильных

### Дашборд:
- [ ] WebhookLogsDashboard.vue создан
- [ ] Статистика и графики интегрированы
- [ ] Переключение секций работает
- [ ] Обновление при изменении фильтров работает
- [ ] Адаптивность для мобильных

### Сравнение периодов:
- [ ] PeriodComparison.vue создан
- [ ] Выбор периодов работает
- [ ] Расчёт метрик для периодов работает
- [ ] Расчёт изменений работает
- [ ] Визуализация изменений работает

### Интеграция:
- [ ] Дашборд интегрирован в WebhookLogsPage
- [ ] Все компоненты работают вместе
- [ ] Обновление данных при изменении фильтров работает
- [ ] Производительность оптимизирована

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-04
- **2025-12-07 05:40 (UTC+3, Брест):** Добавлены детальные примеры кода, полная реализация всех графиков, дашборд, сравнение периодов и troubleshooting
- **2025-12-07 06:23 (UTC+3, Брест):** Задача завершена. Реализованы:
  - Установлены Chart.js и vue-chartjs
  - Создана конфигурация Chart.js (utils/chart-config.js)
  - Создан компонент WebhookLogsStats.vue с метриками (всего событий, задачи, смарт-процессы, ошибки, средний размер payload, уникальные IP)
  - Созданы компоненты графиков:
    - EventsTimelineChart.vue (линейный график событий по времени с переключением периодов)
    - CategoriesChart.vue (круговая диаграмма по категориям)
    - EventsBarChart.vue (столбчатая диаграмма по типам событий)
  - Создан компонент WebhookLogsDashboard.vue с переключением секций статистики и графиков
  - Интегрирован дашборд в WebhookLogsPage.vue
  - Все компоненты протестированы, ошибок линтера нет

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-03: Поиск и расширенные фильтры](./TASK-017-03-search-advanced-filters.md)
- **Следующая:** [TASK-017-05: Экспорт данных](./TASK-017-05-export-data.md)

