<template>
  <div class="graph-state-chart">
    <!-- Заголовок и контролы -->
    <div class="chart-header">
      <h3 class="chart-title">График состояния сектора 1С</h3>
      
      <!-- Переключатель типов графиков -->
      <div class="chart-type-selector">
        <button
          v-for="type in chartTypes"
          :key="type.value"
          @click="chartType = type.value"
          :class="['chart-type-btn', { active: chartType === type.value }]"
          :title="type.label"
        >
          <span class="chart-type-icon">{{ type.icon }}</span>
          <span class="chart-type-label">{{ type.label }}</span>
        </button>
      </div>
    </div>

    <!-- Переключатель типа сравнения -->
    <div v-if="!isLoading && !error && comparison && chartType !== 'doughnut'" class="comparison-type-selector">
      <h4 class="comparison-title">Тип сравнения:</h4>
      <div class="radio-group">
        <label>
          <input 
            type="radio" 
            v-model="comparisonType" 
            value="weekStartToWeekEnd"
            @change="updateChartData"
          />
          <span>Начало недели → Конец недели</span>
        </label>
        <label v-if="snapshots.current">
          <input 
            type="radio" 
            v-model="comparisonType" 
            value="weekEndToCurrent"
            @change="updateChartData"
          />
          <span>Конец недели → Текущее состояние</span>
        </label>
        <label v-if="snapshots.current">
          <input 
            type="radio" 
            v-model="comparisonType" 
            value="weekStartToCurrent"
            @change="updateChartData"
          />
          <span>Начало недели → Текущее состояние</span>
        </label>
      </div>
    </div>

    <!-- Фильтры по этапам -->
    <div v-if="!isLoading && !error && chartData" class="chart-filters">
      <label
        v-for="stage in stages"
        :key="stage.id"
        class="filter-checkbox"
      >
        <input
          type="checkbox"
          v-model="stageFilters[stage.id]"
          @change="updateChartData"
        />
        <span
          class="filter-color"
          :style="{ backgroundColor: stage.color }"
        ></span>
        <span class="filter-label">{{ stage.name }}</span>
      </label>
    </div>

    <!-- Легенда -->
    <div v-if="!isLoading && !error && comparison && chartType !== 'doughnut'" class="graph-legend">
      <h4 class="legend-title">Легенда:</h4>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color" style="background-color: #10b981;"></span>
          <span>Зелёный — рост количества тикетов</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #ef4444;"></span>
          <span>Красный — снижение количества тикетов</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #9ca3af;"></span>
          <span>Серый — без изменений</span>
        </div>
      </div>
    </div>

    <!-- Состояние загрузки -->
    <LoadingSpinner v-if="isLoading" message="Загрузка данных графика..." />
    
    <!-- Состояние ошибки -->
    <div v-else-if="error" class="error-container">
      <p class="error-message">❌ {{ error }}</p>
      <button @click="loadData" class="btn-retry">Повторить загрузку</button>
    </div>
    
    <!-- График -->
    <div v-else-if="filteredChartData" class="chart-container">
      <component
        :is="chartComponent"
        :data="filteredChartData"
        :options="chartOptions"
        :height="300"
      />
    </div>
    
    <!-- Нет данных -->
    <div v-else class="no-data">
      <p>📊 Нет данных для отображения</p>
      <p class="no-data-hint">Создайте слепки для отображения графика</p>
    </div>

    <!-- Детализация по сотрудникам (под графиком) -->
    <div v-if="!isLoading && !error && chartData && showEmployeesDetails" class="employees-details">
      <h4 class="employees-details-title">Детализация по сотрудникам</h4>
      <div class="employees-details-content">
        <div
          v-for="stage in stages"
          :key="stage.id"
          class="stage-details"
        >
          <div class="stage-details-header">
            <span
              class="stage-details-color"
              :style="{ backgroundColor: stage.color }"
            ></span>
            <h5 class="stage-details-name">{{ stage.name }}</h5>
            <span class="stage-details-count">
              Всего: {{ getStageTotalCount(stage.id) }} тикетов
            </span>
          </div>
          <div class="stage-details-employees">
            <div
              v-for="employee in getEmployeesForStage(stage.id)"
              :key="`${stage.id}-${employee.id}`"
              :class="['employee-detail-item', { 'employee-detail-keeper': employee.isKeeper }]"
            >
              <span class="employee-detail-name">{{ employee.name }}</span>
              <span class="employee-detail-count">{{ employee.count }} тикетов</span>
            </div>
            <div v-if="getEmployeesForStage(stage.id).length === 0" class="no-employees-in-stage">
              Нет сотрудников на этом этапе
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { chartColors } from '@/utils/chart-config.js';
import SnapshotService from '@/services/graph-state/SnapshotService.js';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import CompareSnapshots from '@/utils/graph-state/compareSnapshots.js';
import { useNotifications } from '@/composables/useNotifications.js';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';

/**
 * Props компонента
 */
const props = defineProps({
  /**
   * Период для загрузки данных
   */
  period: {
    type: Object,
    default: null
  },
  /**
   * Показывать текущее состояние
   */
  showCurrentState: {
    type: Boolean,
    default: true
  }
});

/**
 * Emits компонента
 */
const emit = defineEmits(['data-loaded', 'error']);

/**
 * Состояние компонента
 */
const isLoading = ref(false);
const error = ref(null);
const chartData = ref(null);
const snapshots = ref({
  weekStart: null,
  weekEnd: null,
  current: null
});
const comparison = ref(null);
const comparisonType = ref('weekStartToWeekEnd');

/**
 * Типы графиков
 */
const chartTypes = [
  { value: 'line', label: 'Линейный', icon: '📈' },
  { value: 'bar', label: 'Столбчатый', icon: '📊' },
  { value: 'doughnut', label: 'Круговая', icon: '🍩' }
];

/**
 * Выбранный тип графика
 */
const chartType = ref('line');

/**
 * Показывать детализацию по сотрудникам
 */
const showEmployeesDetails = ref(true);

/**
 * Список доступных сотрудников
 */
const availableEmployeesList = ref([]);

/**
 * Компонент графика в зависимости от типа
 */
const chartComponent = computed(() => {
  switch (chartType.value) {
    case 'line':
      return Line;
    case 'bar':
      return Bar;
    case 'doughnut':
      return Doughnut;
    default:
      return Line;
  }
});

/**
 * Этапы для фильтров
 */
const stages = [
  { id: 'formed', name: 'Сформировано обращение', color: '#007bff' },
  { id: 'review', name: 'Рассмотрение ТЗ', color: '#ffc107' },
  { id: 'execution', name: 'Исполнение', color: '#28a745' }
];

/**
 * Фильтры по этапам
 */
const stageFilters = ref({
  formed: true,
  review: true,
  execution: true
});


/**
 * Получить общее количество тикетов на этапе
 */
function getStageTotalCount(stageId) {
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
  if (!snapshot || !snapshot.statistics || !snapshot.statistics.stages) {
    return 0;
  }
  
  return snapshot.statistics.stages[stageId]?.count || 0;
}

/**
 * Получить список сотрудников для этапа с количеством их тикетов
 * Включает также тикеты из "Неразобранного" (Хранитель объектов, ID: 1051)
 */
function getEmployeesForStage(stageId) {
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
  if (!snapshot || !snapshot.statistics) {
    return [];
  }
  
  const employees = [];
  
  // Обычные сотрудники
  if (snapshot.statistics.employees && Array.isArray(snapshot.statistics.employees)) {
    snapshot.statistics.employees
      .filter(emp => emp.ticketsByStage && emp.ticketsByStage[stageId] > 0)
      .forEach(emp => {
        employees.push({
          id: emp.id,
          name: emp.name,
          count: emp.ticketsByStage[stageId] || 0
        });
      });
  }
  
  // Тикеты из "Неразобранного" (Хранитель объектов, ID: 1051) для этого этапа
  const keeperCount = getKeeperTicketsCountForStage(stageId);
  if (keeperCount > 0) {
    employees.push({
      id: 1051,
      name: 'Хранитель объектов (Неразобранное)',
      count: keeperCount,
      isKeeper: true
    });
  }
  
  return employees.sort((a, b) => b.count - a.count); // Сортировка по убыванию количества
}

/**
 * Получить количество тикетов хранителя объектов (ID: 1051) для этапа
 */
function getKeeperTicketsCountForStage(stageId) {
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
  if (!snapshot || !snapshot.statistics) {
    return 0;
  }
  
  // Используем новое поле zeroPointByStage из статистики (если доступно)
  if (snapshot.statistics.zeroPointByStage && snapshot.statistics.zeroPointByStage[stageId]) {
    return snapshot.statistics.zeroPointByStage[stageId].keeper || 0;
  }
  
  // Fallback: если zeroPointByStage нет, используем общую статистику
  // (это для обратной совместимости со старыми слепками)
  if (snapshot.statistics.zeroPoint) {
    const totalKeeper = snapshot.statistics.zeroPoint.keeper || 0;
    // Приблизительное распределение поровну по этапам (не идеально, но лучше чем ничего)
    return Math.floor(totalKeeper / 3);
  }
  
  return 0;
}

/**
 * Композаблы
 */
const notifications = useNotifications();

/**
 * Извлечь список доступных сотрудников из слепков
 */
function extractAvailableEmployees() {
  const employeesMap = new Map();

  // Собираем сотрудников из всех слепков
  [snapshots.value.weekStart, snapshots.value.weekEnd, snapshots.value.current].forEach(snapshot => {
    if (!snapshot || !snapshot.statistics || !snapshot.statistics.employees) {
      return;
    }

    snapshot.statistics.employees.forEach(employee => {
      if (!employeesMap.has(employee.id)) {
        employeesMap.set(employee.id, {
          id: employee.id,
          name: employee.name
        });
      }
    });
  });

  availableEmployeesList.value = Array.from(employeesMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Получить цвет на основе тренда
 * 
 * @param {string} trend - Тренд: "increase" | "decrease" | "stable"
 * @param {string} type - Тип цвета: "background" | "border" | "point"
 * @returns {string} Цвет в формате hex
 */
function getTrendColor(trend, type = 'background') {
  const colors = {
    increase: {
      background: '#10b981',
      border: '#059669',
      point: '#10b981'
    },
    decrease: {
      background: '#ef4444',
      border: '#dc2626',
      point: '#ef4444'
    },
    stable: {
      background: '#9ca3af',
      border: '#6b7280',
      point: '#9ca3af'
    }
  };

  return colors[trend]?.[type] || '#6c757d';
}

/**
 * Выполнить сравнение слепков
 */
function performComparison() {
  if (!snapshots.value.weekStart || !snapshots.value.weekEnd) {
    return;
  }

  try {
    // Сравнение начало недели → конец недели
    const weekStartToWeekEnd = CompareSnapshots.compareTwoSnapshots(
      snapshots.value.weekStart,
      snapshots.value.weekEnd,
      { includeTickets: false, includeEmployees: true }
    );

    // Сравнение конец недели → текущее состояние (если есть)
    let weekEndToCurrent = null;
    let weekStartToCurrent = null;

    if (snapshots.value.current) {
      weekEndToCurrent = CompareSnapshots.compareTwoSnapshots(
        snapshots.value.weekEnd,
        snapshots.value.current,
        { includeTickets: false, includeEmployees: true }
      );

      weekStartToCurrent = CompareSnapshots.compareTwoSnapshots(
        snapshots.value.weekStart,
        snapshots.value.current,
        { includeTickets: false, includeEmployees: true }
      );
    }

    comparison.value = {
      weekStartToWeekEnd,
      weekEndToCurrent,
      weekStartToCurrent
    };
  } catch (err) {
    console.error('Ошибка сравнения слепков:', err);
    notifications.warning('Не удалось выполнить сравнение слепков: ' + err.message);
  }
}

/**
 * Получить ключ этапа из названия
 * 
 * @param {string} label - Название этапа
 * @returns {string} Ключ этапа
 */
function getStageKeyFromLabel(label) {
  const mapping = {
    'Сформировано обращение': 'formed',
    'Рассмотрение ТЗ': 'review',
    'Исполнение': 'execution'
  };
  return mapping[label] || 'formed';
}

/**
 * Отфильтрованные данные для графика
 */
const filteredChartData = computed(() => {
  if (!chartData.value) return null;

  // Для круговой диаграммы не применяем фильтры (показываем все этапы)
  if (chartType.value === 'doughnut') {
    return chartData.value;
  }

  const filteredDatasets = chartData.value.datasets.filter(dataset => {
    // Определить ID этапа по label
    const stage = stages.find(s => s.name === dataset.label);
    if (!stage) return true;
    return stageFilters.value[stage.id];
  });

  return {
    ...chartData.value,
    datasets: filteredDatasets
  };
});

/**
 * Конфигурация графика (зависит от типа)
 */
const chartOptions = computed(() => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: chartType.value === 'doughnut' ? 'right' : 'top',
        onClick: (e, legendItem, legend) => {
          // Переключение видимости этапа при клике на легенду
          const index = legendItem.datasetIndex;
          if (index !== undefined) {
            const meta = legend.chart.getDatasetMeta(index);
            meta.hidden = !meta.hidden;
            legend.chart.update();
          }
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: {
          title: (tooltipItems) => {
            return tooltipItems[0].label || '';
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed || 0;
            const index = context.dataIndex;
            
            if (chartType.value === 'doughnut') {
              // Для круговой диаграммы показываем процент
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            } else {
              // Для линейного и столбчатого графика показываем информацию о сравнении
              if (!comparison.value || index === 0 || chartType.value === 'doughnut') {
                return `${label}: ${value}`;
              }

              // Получение данных сравнения на основе типа сравнения и индекса
              let comparisonData = null;
              const stageKey = getStageKeyFromLabel(label);

              if (comparisonType.value === 'weekStartToWeekEnd' && index === 1) {
                comparisonData = comparison.value.weekStartToWeekEnd?.stages?.[stageKey];
              } else if (comparisonType.value === 'weekEndToCurrent' && index === 2 && snapshots.current) {
                comparisonData = comparison.value.weekEndToCurrent?.stages?.[stageKey];
              } else if (comparisonType.value === 'weekStartToCurrent' && index === 2 && snapshots.current) {
                comparisonData = comparison.value.weekStartToCurrent?.stages?.[stageKey];
              }

              if (!comparisonData) {
                return `${label}: ${value}`;
              }

              const delta = comparisonData.delta;
              const deltaPercent = comparisonData.deltaPercent;
              const trend = comparisonData.trend;

              let result = `${label}: ${value}`;

              if (delta !== 0) {
                const sign = delta > 0 ? '+' : '';
                const trendIcon = trend === 'increase' ? '↑' : trend === 'decrease' ? '↓' : '→';
                result += ` (${sign}${delta}, ${sign}${deltaPercent.toFixed(1)}%) ${trendIcon}`;
              } else {
                result += ' (без изменений)';
              }

              return result;
            }
          },
          afterBody: (tooltipItems) => {
            // Дополнительная информация после основного содержимого
            if (chartType.value === 'doughnut' || !comparison.value) {
              return [];
            }

            const index = tooltipItems[0].dataIndex;
            if (index === 0) {
              return [];
            }

            let comparisonData = null;
            const stageKey = getStageKeyFromLabel(tooltipItems[0].dataset.label || '');

            if (comparisonType.value === 'weekStartToWeekEnd' && index === 1) {
              comparisonData = comparison.value.weekStartToWeekEnd;
            } else if (comparisonType.value === 'weekEndToCurrent' && index === 2) {
              comparisonData = comparison.value.weekEndToCurrent;
            } else if (comparisonType.value === 'weekStartToCurrent' && index === 2) {
              comparisonData = comparison.value.weekStartToCurrent;
            }

            if (!comparisonData || !comparisonData.metadata) {
              return [];
            }

            const timeDiff = comparisonData.metadata.timeDiff;
            return [
              `Период: ${timeDiff.days} дн. ${timeDiff.hours} ч. ${timeDiff.minutes} мин.`
            ];
          }
        }
      },
      title: {
        display: false
      }
    }
  };

  // Специфичные настройки для каждого типа
  if (chartType.value === 'line' || chartType.value === 'bar') {
    return {
      ...baseOptions,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    };
  } else if (chartType.value === 'doughnut') {
    return {
      ...baseOptions,
      cutout: '60%' // Размер отверстия в центре
    };
  }

  return baseOptions;
});

/**
 * Получить дату начала недели (понедельник)
 */
function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
  return new Date(d.setDate(diff));
}

/**
 * Получить дату конца недели (воскресенье)
 */
function getEndOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? 0 : 7); // Воскресенье
  return new Date(d.setDate(diff));
}

/**
 * Форматирование даты в YYYY-MM-DD
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Подготовка данных для круговой диаграммы
 */
function prepareDoughnutData(snapshotsData) {
  const { current, weekEnd } = snapshotsData;
  
  // Используем текущее состояние или последний слепок
  const source = current || weekEnd;
  if (!source || !source.statistics || !source.statistics.stages) {
    return null;
  }

  const labels = [];
  const data = [];
  const backgroundColor = [];
  const borderColor = [];

  stages.forEach(stage => {
    const count = source.statistics.stages[stage.id]?.count || 0;
    if (count > 0) {
      labels.push(stage.name);
      data.push(count);
      backgroundColor.push(stage.color + '80'); // С прозрачностью
      borderColor.push(stage.color);
    }
  });

  if (data.length === 0) {
    return null;
  }

  return {
    labels,
    datasets: [{
      label: 'Распределение по этапам',
      data,
      backgroundColor,
      borderColor,
      borderWidth: 2
    }]
  };
}


/**
 * Подготовка данных для графика
 */
function prepareChartData(snapshotsData) {
  // Для круговой диаграммы используем специальную подготовку
  if (chartType.value === 'doughnut') {
    return prepareDoughnutData(snapshotsData);
  }

  // Для линейного и столбчатого графика используем стандартную логику с учётом сравнения
  const { weekStart, weekEnd, current } = snapshotsData;

  // Метки для точек графика
  const labels = [];
  const datasets = [];

  // Данные для каждого этапа
  stages.forEach(stage => {
    const data = [];

    // Начало недели
    if (weekStart && weekStart.statistics && weekStart.statistics.stages) {
      const stageData = weekStart.statistics.stages[stage.id];
      if (labels.length === 0) {
        const date = weekStart.metadata?.createdAt 
          ? new Date(weekStart.metadata.createdAt)
          : null;
        labels.push(date ? formatDate(date) : 'Начало недели');
      }
      data.push(stageData?.count || 0);
    } else {
      if (labels.length === 0) {
        labels.push('Начало недели');
      }
      data.push(0);
    }

    // Конец недели
    if (weekEnd && weekEnd.statistics && weekEnd.statistics.stages) {
      const stageData = weekEnd.statistics.stages[stage.id];
      if (labels.length === 1) {
        const date = weekEnd.metadata?.createdAt 
          ? new Date(weekEnd.metadata.createdAt)
          : null;
        labels.push(date ? formatDate(date) : 'Конец недели');
      }
      data.push(stageData?.count || 0);
    } else {
      if (labels.length === 1) {
        labels.push('Конец недели');
      }
      data.push(0);
    }

    // Текущее состояние
    if (current && props.showCurrentState && current.statistics && current.statistics.stages) {
      const stageData = current.statistics.stages[stage.id];
      if (labels.length === 2) {
        labels.push('Текущее состояние');
      }
      data.push(stageData?.count || 0);
    }

    // Получение трендов на основе выбранного типа сравнения
    const trends = ['stable']; // Начало недели (базовая точка)
    
    if (comparison.value) {
      if (comparisonType.value === 'weekStartToWeekEnd') {
        trends.push(comparison.value.weekStartToWeekEnd?.stages?.[stage.id]?.trend || 'stable');
        if (current) {
          trends.push(comparison.value.weekStartToCurrent?.stages?.[stage.id]?.trend || 'stable');
        }
      } else if (comparisonType.value === 'weekEndToCurrent' && current) {
        trends.push('stable'); // Конец недели (базовая точка для этого сравнения)
        trends.push(comparison.value.weekEndToCurrent?.stages?.[stage.id]?.trend || 'stable');
      } else if (comparisonType.value === 'weekStartToCurrent' && current) {
        trends.push(comparison.value.weekStartToWeekEnd?.stages?.[stage.id]?.trend || 'stable');
        trends.push(comparison.value.weekStartToCurrent?.stages?.[stage.id]?.trend || 'stable');
      } else {
        // Если нет сравнения или неподдерживаемый тип, используем базовые цвета
        trends.push('stable');
        if (current) {
          trends.push('stable');
        }
      }
    } else {
      // Если нет сравнения, используем базовые цвета
      trends.push('stable');
      if (current) {
        trends.push('stable');
      }
    }

    // Цвета на основе трендов (если есть сравнение) или базовые цвета
    let backgroundColor, borderColor, pointBackgroundColor;
    
    if (comparison.value && chartType.value !== 'doughnut') {
      backgroundColor = trends.map(trend => getTrendColor(trend, 'background') + '40');
      borderColor = trends.map(trend => getTrendColor(trend, 'border'));
      pointBackgroundColor = trends.map(trend => getTrendColor(trend, 'point'));
    } else {
      // Базовые цвета
      backgroundColor = stage.color + '40';
      borderColor = stage.color;
      pointBackgroundColor = stage.color;
    }

    datasets.push({
      label: stage.name,
      data: data,
      backgroundColor: Array.isArray(backgroundColor) ? backgroundColor : backgroundColor,
      borderColor: Array.isArray(borderColor) ? borderColor : borderColor,
      borderWidth: 2,
      pointBackgroundColor: Array.isArray(pointBackgroundColor) ? pointBackgroundColor : pointBackgroundColor,
      pointBorderColor: Array.isArray(borderColor) ? borderColor : borderColor,
      pointRadius: 6,
      pointHoverRadius: 8,
      fill: chartType.value === 'line' ? false : true,
      tension: chartType.value === 'line' ? 0.4 : 0
    });
  });

  // Если labels пустые, установить значения по умолчанию
  if (labels.length === 0) {
    labels.push('Начало недели', 'Конец недели');
    if (props.showCurrentState) {
      labels.push('Текущее состояние');
    }
  }

  return {
    labels: labels,
    datasets: datasets
  };
}

/**
 * Загрузка данных
 */
const loadData = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    // Определение дат
    const today = props.period?.endDate ? new Date(props.period.endDate) : new Date();
    const startOfWeek = props.period?.startDate 
      ? new Date(props.period.startDate)
      : SnapshotService.getWeekStartDate(today);
    const endOfWeek = props.period?.endDate
      ? new Date(props.period.endDate)
      : SnapshotService.getWeekEndDate(today);

    const startDateStr = SnapshotService.formatDate(startOfWeek);
    const endDateStr = SnapshotService.formatDate(endOfWeek);

    // Загрузка слепков (параллельно)
    const [weekStartSnapshot, weekEndSnapshot] = await Promise.all([
      SnapshotService.getSnapshot(startDateStr, 'week_start'),
      SnapshotService.getSnapshot(endDateStr, 'week_end')
    ]);

    // Загрузка текущего состояния (если нужно)
    // Используем useCache: false, чтобы всегда получать актуальные данные с полной пагинацией
    let currentState = null;
    if (props.showCurrentState) {
      currentState = await SectorDataAdapter.getSectorDataForSnapshot({
        useCache: false, // Отключаем кеш для получения актуальных данных
        normalize: true
      });
    }

    // Сохранение слепков
    snapshots.value = {
      weekStart: weekStartSnapshot,
      weekEnd: weekEndSnapshot,
      current: currentState
    };

    // Извлечение списка доступных сотрудников
    extractAvailableEmployees();

    // Выполнение сравнения слепков
    performComparison();

    // Подготовка данных для графика (будет пересчитано при изменении типа)
    updateChartData();

    // Эмит события успешной загрузки
    emit('data-loaded', {
      weekStart: weekStartSnapshot,
      weekEnd: weekEndSnapshot,
      current: currentState
    });

  } catch (err) {
    console.error('Error loading chart data:', err);
    error.value = err.message || 'Ошибка загрузки данных графика';
    notifications.error('Ошибка загрузки данных графика: ' + error.value);
    
    // Эмит события ошибки
    emit('error', error.value);
  } finally {
    isLoading.value = false;
  }
};

// Загрузка данных при монтировании
onMounted(() => {
  loadData();
});

/**
 * Обновление данных графика
 */
const updateChartData = () => {
  chartData.value = prepareChartData({
    weekStart: snapshots.value.weekStart,
    weekEnd: snapshots.value.weekEnd,
    current: snapshots.value.current
  });
};

// Перезагрузка данных при изменении props
watch(() => [props.period, props.showCurrentState], () => {
  loadData();
}, { deep: true });

// Обновление данных при изменении типа графика
watch(chartType, () => {
  if (snapshots.value.weekStart || snapshots.value.weekEnd || snapshots.value.current) {
    updateChartData();
  }
});

// Обновление данных при изменении типа сравнения
watch(comparisonType, () => {
  if (snapshots.value.weekStart || snapshots.value.weekEnd || snapshots.value.current) {
    updateChartData();
  }
});
</script>

<style scoped>
.graph-state-chart {
  width: 100%;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.chart-type-selector {
  display: flex;
  gap: 8px;
}

.chart-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-type-btn:hover {
  background: #f5f5f5;
  border-color: #007bff;
}

.chart-type-btn.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.chart-type-icon {
  font-size: 16px;
}

.chart-type-label {
  font-weight: 500;
}

.chart-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  flex-wrap: wrap;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.filter-checkbox input[type="checkbox"] {
  cursor: pointer;
}

.filter-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.filter-label {
  color: #333;
}

.chart-container {
  position: relative;
  height: 300px;
  width: 100%;
}

.error-container {
  padding: 40px;
  text-align: center;
}

.error-message {
  color: #dc3545;
  font-size: 16px;
  margin-bottom: 20px;
}

.btn-retry {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-retry:hover {
  background-color: #0056b3;
}

.no-data {
  padding: 40px;
  text-align: center;
  color: #666;
}

.no-data p {
  margin: 8px 0;
}

.no-data-hint {
  font-size: 14px;
  color: #999;
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .chart-type-selector {
    width: 100%;
    justify-content: space-between;
  }

  .chart-type-btn {
    flex: 1;
    justify-content: center;
  }

  .chart-type-label {
    display: none; /* Скрыть текст на мобильных, оставить только иконку */
  }

  .chart-filters {
    flex-direction: column;
    gap: 8px;
  }
}

.comparison-type-selector {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.comparison-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.radio-group {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.radio-group input[type="radio"] {
  cursor: pointer;
}

.graph-legend {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.legend-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* Детализация по сотрудникам */
.employees-details {
  margin-top: 30px;
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.employees-details-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 20px 0;
}

.employees-details-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stage-details {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e5e7eb;
}

.stage-details-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e7eb;
}

.stage-details-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stage-details-name {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.stage-details-count {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 4px 12px;
  border-radius: 12px;
}

.stage-details-employees {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.employee-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
  transition: background-color 0.2s;
}

.employee-detail-item:hover {
  background-color: #f3f4f6;
}

.employee-detail-item.employee-detail-keeper {
  border-left-color: #f59e0b;
  background-color: #fffbeb;
}

.employee-detail-item.employee-detail-keeper:hover {
  background-color: #fef3c7;
}

.employee-detail-name {
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.employee-detail-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
  background-color: white;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.no-employees-in-stage {
  text-align: center;
  padding: 15px;
  color: #9ca3af;
  font-size: 14px;
  font-style: italic;
}

@media (max-width: 768px) {
  .radio-group {
    flex-direction: column;
    gap: 12px;
  }

  .stage-details-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .stage-details-count {
    align-self: flex-start;
  }

  .employee-detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .employee-detail-count {
    align-self: flex-end;
  }
}
</style>

