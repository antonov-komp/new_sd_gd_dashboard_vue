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
    <StageChips
      v-if="!isLoading && !error && chartData"
      :stages="stages"
      :selected="stageFilters"
      @update:selected="handleStageFiltersUpdate"
      @change="updateChartData"
    />

    <!-- Легенда -->
    <div v-if="!isLoading && !error && comparison && chartType !== 'doughnut'" class="graph-legend">
      <h4 class="legend-title">Легенда:</h4>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color legend-increase"></span>
          <span>Зелёный — рост количества тикетов</span>
        </div>
        <div class="legend-item">
          <span class="legend-color legend-decrease"></span>
          <span>Красный — снижение количества тикетов</span>
        </div>
        <div class="legend-item">
          <span class="legend-color legend-stable"></span>
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
    <div
      v-else-if="filteredChartData"
      :class="['chart-container', `chart-type-${chartType}`]"
    >
      <div class="chart-wrapper">
        <div class="chart-canvas-container">
          <component
            :is="chartComponent"
            :data="filteredChartData"
            :options="chartOptions"
          />
        </div>
        
        <!-- Названия стадий (только для столбчатого графика) -->
        <div v-if="chartType === 'bar'" class="bar-chart-stage-labels">
          <div
            v-for="stage in stages"
            :key="stage.id"
            class="stage-label-item"
          >
            {{ getStageLabelWithCount(stage.id) }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Нет данных -->
    <div v-else class="no-data">
      <p>📊 Нет данных для отображения</p>
      <p class="no-data-hint">Создайте слепки для отображения графика</p>
    </div>

    <!-- Модальное окно с детализацией по сотрудникам -->
    <EmployeeDetailsModal
      :is-visible="showEmployeeModal"
      :stage-name="modalStageName"
      :stage-id="modalStageId"
      :total-count="modalTotalCount"
      :employees="modalEmployees"
      :others="modalOthers"
      :snapshot="currentSnapshot"
      :ticket-details="ticketDetails"
      :stage-switch-context="stageSwitchContext"
      @close="closeEmployeeModal"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Line, Bar, Doughnut } from 'vue-chartjs';
import { Chart as ChartJS } from 'chart.js';
import { chartColors } from '@/utils/chart-config.js';
import SnapshotService from '@/services/graph-state/SnapshotService.js';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import CompareSnapshots from '@/utils/graph-state/compareSnapshots.js';
import { useNotifications } from '@/composables/useNotifications.js';
import LoadingSpinner from '@/components/common/LoadingSpinner.vue';
import StageChips from '@/components/filters/StageChips.vue';
import EmployeeDetailsModal from '@/components/graph-state/EmployeeDetailsModal.vue';
import { loadStageLevel1 } from '@/utils/graph-state/stageLevel1Loader.js';
import {
  prepareLineChartEmployeeData,
  prepareBarChartEmployeeData,
  prepareDoughnutChartEmployeeData,
  formatEmployeeProgressBarData
} from '@/utils/graph-state/employeeChartUtils.js';
import { overlappingPointsPlugin } from './plugins/overlappingPointsPlugin.js';
import { pointJitterPlugin } from './plugins/pointJitterPlugin.js';
import { pointLabelsPlugin } from './plugins/pointLabelsPlugin.js';

const cssVar = (name, fallback) => {
  if (typeof window === 'undefined') {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
};

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
 * Состояние модального окна с детализацией по сотрудникам
 */
const showEmployeeModal = ref(false);
const modalStageName = ref('');
const modalStageId = ref('');
const modalTotalCount = ref(0);
const modalEmployees = ref([]);
const modalOthers = ref(null);
const currentSnapshot = ref(null);
const ticketDetails = ref(null);
const stageSwitchContext = ref(null);

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
const stageColors = {
  formed: cssVar('--b24-primary', '#007bff'),
  review: cssVar('--b24-warning', '#ffc107'),
  execution: cssVar('--b24-success', '#28a745')
};

const stages = [
  { id: 'formed', name: 'Сформировано обращение', color: stageColors.formed },
  { id: 'review', name: 'Рассмотрение ТЗ', color: stageColors.review },
  { id: 'execution', name: 'Исполнение', color: stageColors.execution }
];

const stageNameMap = computed(() => stages.reduce((acc, stage) => {
  acc[stage.id] = stage.name;
  return acc;
}, {}));

/**
 * Массив стилей точек для линейного графика
 * Используется для визуального различия точек разных этапов при перекрытии
 * Порядок: круг, треугольник, квадрат, ромб, звезда, крест, повёрнутый крест
 * @type {Array<string>}
 */
const POINT_STYLES = ['circle', 'triangle', 'rect', 'rectRot', 'star', 'cross', 'crossRot'];

/**
 * Фильтры по этапам
 */
const stageFilters = ref({
  formed: true,
  review: true,
  execution: true
});



/**
 * Композаблы
 */
const notifications = useNotifications();

/**
 * Плагин для отрисовки имён сотрудников под столбцами
 */
const employeeLabelsPlugin = {
  id: 'employeeLabelsPlugin',
  afterDatasetsDraw: (chart) => {
    // Работает только для столбчатых графиков
    if (chart.config.type !== 'bar') return;
    
    try {
      const ctx = chart.ctx;
      if (!chart.data || !chart.data.datasets) return;
      
      const datasets = chart.data.datasets;
      const yScale = chart.scales.y;
      
      // Для каждого dataset (сотрудника)
      datasets.forEach((dataset, datasetIndex) => {
        const datasetMeta = chart.getDatasetMeta(datasetIndex);
        if (!datasetMeta || datasetMeta.hidden) return;
        
        const employeeName = dataset.label || '';
        if (!employeeName || employeeName.includes('Другие')) return; // Пропускаем "Другие"
        
        // Форматируем имя (Имя\nФамилия)
        const nameParts = employeeName.trim().split(/\s+/);
        let formattedName = '';
        if (nameParts.length === 1) {
          formattedName = nameParts[0];
        } else {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          formattedName = `${firstName}\n${lastName}`;
        }
        const namePartsArray = formattedName.split('\n');
        
        // Для каждого столбца (стадии)
        dataset.data.forEach((value, dataIndex) => {
          if (value === 0 || !value) return;
          
          const bar = datasetMeta.data[dataIndex];
          if (!bar || typeof bar.x !== 'number' || typeof bar.y !== 'number') return;
          
          const x = bar.x;
          // Позиция под столбцом - используем координату Y столбца + его высота
          // Учитываем padding из layout
          const y = bar.y + bar.height + 25; // Увеличенный отступ под столбцом для лучшей видимости
          
          // Сохраняем состояние контекста
          ctx.save();
          
          // Настройка стиля текста
          ctx.font = 'bold 9px Arial, sans-serif';
          ctx.fillStyle = '#6b7280';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          
          // Поворот текста
          ctx.translate(x, y);
          ctx.rotate(-12 * Math.PI / 180); // -12 градусов
          
          // Отрисовка текста (две строки)
          namePartsArray.forEach((part, index) => {
            const trimmedPart = part.trim();
            if (trimmedPart) {
              ctx.fillText(trimmedPart, 0, index * 11);
            }
          });
          
          // Восстанавливаем состояние
          ctx.restore();
        });
      });
    } catch (error) {
      console.error('Error in employeeLabelsPlugin:', error);
    }
  }
};

/**
 * Плагин для вывода текста в центре donut
 */
const doughnutCenterTextPlugin = {
  id: 'doughnutCenterTextPlugin',
  afterDraw: (chart) => {
    if (chart.config.type !== 'doughnut') return;

    const { ctx, chartArea, width, height } = chart;
    if (!chart.data || !chart.data.datasets || chart.data.datasets.length === 0) return;

    const meta = chart.data.datasets[0].meta;
    const totalTickets = meta?.totals?.overall ?? null;
    if (totalTickets === null || typeof totalTickets === 'undefined') return;

    const titleLines = [
      'Всего в секторе 1С',
      'тикетов в работе:',
      `${totalTickets}`
    ];

    ctx.save();
    ctx.font = '600 16px "Roboto", sans-serif';
    ctx.fillStyle = cssVar('--b24-text-primary', '#1f2937');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const centerX = (chartArea.left + chartArea.right) / 2;
    const centerY = (chartArea.top + chartArea.bottom) / 2;
    const lineHeight = 18;
    const totalHeight = lineHeight * titleLines.length;
    const startY = centerY - totalHeight / 2 + 4; // небольшая поправка вниз

    titleLines.forEach((line, index) => {
      // Уменьшаем шрифт для цифр при длинных числах
      if (index === titleLines.length - 1 && `${line}`.length > 4) {
        ctx.font = '700 18px "Roboto", sans-serif';
      } else {
        ctx.font = '600 16px "Roboto", sans-serif';
      }
      ctx.fillText(line, centerX, startY + index * lineHeight);
    });

    ctx.restore();
  }
};

// Регистрация плагина глобально
ChartJS.register(employeeLabelsPlugin);
ChartJS.register(doughnutCenterTextPlugin);

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
      background: cssVar('--b24-success', '#28a745'),
      border: cssVar('--b24-success-hover', '#218838'),
      point: cssVar('--b24-success', '#28a745')
    },
    decrease: {
      background: cssVar('--b24-danger', '#dc3545'),
      border: cssVar('--b24-danger-hover', '#c82333'),
      point: cssVar('--b24-danger', '#dc3545')
    },
    stable: {
      background: cssVar('--b24-text-muted', '#9ca3af'),
      border: cssVar('--b24-text-secondary', '#6b7280'),
      point: cssVar('--b24-text-muted', '#9ca3af')
    }
  };

  return colors[trend]?.[type] || cssVar('--b24-text-secondary', '#6c757d');
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
function normalizeStageLabel(label) {
  if (!label) return '';
  return label.replace(/\s*\(\d+\)\s*$/, '').trim();
}

function getStageKeyFromLabel(label) {
  const normalized = normalizeStageLabel(label);
  const mapping = {
    'Сформировано обращение': 'formed',
    'Рассмотрение ТЗ': 'review',
    'Исполнение': 'execution'
  };
  return mapping[normalized] || 'formed';
}

/**
 * Получить ID этапа из названия (алиас для getStageKeyFromLabel)
 * 
 * @param {string} label - Название этапа
 * @returns {string} ID этапа
 */
function getStageIdFromLabel(label) {
  return getStageKeyFromLabel(label);
}

/**
 * Определение временной точки по индексу данных
 * 
 * @param {number} index - Индекс точки графика (0, 1, 2)
 * @returns {string} Временная точка ('weekStart' | 'weekEnd' | 'current')
 */
function getTimePointFromIndex(index) {
  if (index === 0) return 'weekStart';
  if (index === 1) return 'weekEnd';
  if (index === 2) return 'current';
  return 'weekEnd'; // По умолчанию
}

/**
 * Получить слепок по временной точке
 * 
 * @param {string} timePoint - Временная точка ('weekStart' | 'weekEnd' | 'current')
 * @returns {Object|null} Слепок с данными
 */
function getSnapshotByTimePoint(timePoint) {
  return snapshots.value[timePoint] || null;
}

/**
 * Общая функция открытия модального окна с детализацией по сотрудникам
 * 
 * @param {string} stageName - Название этапа
 * @param {number} totalCount - Общее количество тикетов
 * @param {Array} employees - Массив сотрудников
 * @param {Object} others - Данные о группе "Другие" (опционально)
 */
function openEmployeeDetailsModal(stageName, stageId, totalCount, employees, others = null, snapshot = null, ticketDetailsData = null, switchContext = null) {
  console.log('[GraphStateChart] openEmployeeDetailsModal called:', {
    stageName,
    stageId,
    totalCount,
    employeesCount: employees?.length || 0,
    hasSnapshot: !!snapshot,
    snapshotTicketIds: snapshot?.ticketIds?.length || 0
  });
  
  modalStageName.value = stageName;
  modalStageId.value = stageId || '';
  modalTotalCount.value = totalCount;
  modalEmployees.value = employees || [];
  modalOthers.value = others && others.count > 0 ? others : null;
  currentSnapshot.value = snapshot;
  ticketDetails.value = ticketDetailsData;
  stageSwitchContext.value = switchContext;
  showEmployeeModal.value = true;
  
  console.log('[GraphStateChart] Modal state set:', {
    modalStageId: modalStageId.value,
    hasCurrentSnapshot: !!currentSnapshot.value
  });
}

/**
 * Открытие модального окна для линейного графика
 * 
 * @param {string} stageId - ID этапа
 * @param {string} timePoint - Временная точка ('weekStart' | 'weekEnd' | 'current')
 * @param {Array} employeeData - Данные сотрудников
 */
async function openEmployeeDetailsModalForLine(stageId, timePoint, datasetMeta) {
  console.log('[GraphStateChart] openEmployeeDetailsModalForLine:', { stageId, timePoint, hasMeta: !!datasetMeta });
  
  const stage = stages.find(s => s.id === stageId);
  if (!stage) {
    console.warn('[GraphStateChart] Stage not found:', stageId);
    return;
  }

  const switchContext = {
    graphType: 'line',
    stageId,
    stageName: stage.name,
    timePoint,
    snapshots: snapshots.value,
    meta: {
      line: datasetMeta || null,
      doughnut: chartData.value?.datasets?.[0]?.meta || null
    },
    stageColorMap: stageColors,
    stageNameMap: stageNameMap.value
  };

  try {
    const level1 = await loadStageLevel1({
      stageId,
      graphType: 'line',
      timePoint,
      snapshots: snapshots.value,
      meta: { line: datasetMeta || null, doughnut: chartData.value?.datasets?.[0]?.meta || null },
      stageColorMap: stageColors,
      stageNameMap: stageNameMap.value,
      maxVisible: 10
    });

    console.log('[GraphStateChart] Opening modal with level1:', {
      stageName: level1.stageName,
      stageId,
      totalCount: level1.totalCount,
      employeesCount: level1.employees?.length || 0,
      hasSnapshot: !!level1.snapshot
    });

    openEmployeeDetailsModal(
      level1.stageName,
      stageId,
      level1.totalCount,
      level1.employees,
      level1.others,
      level1.snapshot,
      null,
      switchContext
    );
  } catch (error) {
    console.error('[GraphStateChart] Failed to open modal for line point:', error);
    notifications.error('Не удалось открыть попап для выбранной точки графика');
  }
}

/**
 * Открытие модального окна для круговой диаграммы
 * 
 * @param {string} stageId - ID этапа
 * @param {Object} employeeData - Данные сотрудников из метаданных
 */
function openEmployeeDetailsModalForDoughnut(stageId, employeeData) {
  if (!employeeData || !employeeData.employees || employeeData.employees.length === 0) {
    // Нет данных о сотрудниках
    notifications.warning('Нет данных о сотрудниках для этого этапа');
    return;
  }

  // Получить слепок (используем текущий или последний доступный)
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;

  const switchContext = {
    graphType: 'doughnut',
    stageId,
    stageName: employeeData.stageName,
    snapshots: snapshots.value,
    meta: {
      doughnut: chartData.value?.datasets?.[0]?.meta || null
    },
    stageColorMap: stageColors,
    stageNameMap: stageNameMap.value
  };

  openEmployeeDetailsModal(
    employeeData.stageName,
    stageId,
    employeeData.totalCount,
    employeeData.employees,
    employeeData.others,
    snapshot,
    null,
    switchContext
  );
}

/**
 * Закрытие модального окна с детализацией по сотрудникам
 */
function closeEmployeeModal() {
  showEmployeeModal.value = false;
  modalStageName.value = '';
  modalStageId.value = '';
  modalTotalCount.value = 0;
  modalEmployees.value = [];
  modalOthers.value = null;
  currentSnapshot.value = null;
  ticketDetails.value = null;
}

/**
 * Обработчик клика на точку линейного графика
 * 
 * @param {Event} event - Событие клика
 * @param {Array} elements - Массив элементов графика под курсором
 * @param {Object} chart - Экземпляр Chart.js
 */
async function handleLineChartClick(event, elements, chart) {
  if (chartType.value !== 'line' || elements.length === 0) {
    return;
  }

  const element = elements[0];
  const datasetIndex = element.datasetIndex;
  const dataIndex = element.index;

  // Получить данные этапа
  const dataset = chart.data.datasets[datasetIndex];
  if (!dataset) {
    return;
  }

  const stageId = getStageIdFromLabel(dataset.label);

  // Определить временную точку по индексу
  const timePoint = getTimePointFromIndex(dataIndex);

  // Открыть модальное окно с детализацией через единый загрузчик
  await openEmployeeDetailsModalForLine(stageId, timePoint, dataset.meta || null);
}

/**
 * Обработчик клика на сектор круговой диаграммы
 * 
 * @param {Event} event - Событие клика
 * @param {Array} elements - Массив элементов графика под курсором
 * @param {Object} chart - Экземпляр Chart.js
 */
function handleDoughnutChartClick(event, elements, chart) {
  if (chartType.value !== 'doughnut' || elements.length === 0) {
    return;
  }

  const element = elements[0];
  const index = element.index;

  // Получить данные графика
  const chartData = chart.data;
  const label = chartData.labels[index];

  // Определить ID этапа по названию
  const stageId = getStageIdFromLabel(label);

  // Получить данные сотрудников из метаданных
  const employeesMeta = chartData.datasets[0]?.meta?.employees;
  const employeeData = employeesMeta?.[stageId];

  if (!employeeData) {
    console.warn('Данные о сотрудниках не найдены для этапа:', stageId);
    return;
  }

  // Открыть модальное окно с детализацией
  openEmployeeDetailsModalForDoughnut(stageId, employeeData);
}

/**
 * Получить общее количество тикетов этапа для столбчатого графика
 * 
 * @param {number} stageIndex - Индекс этапа в массиве stages
 * @returns {number} Общее количество тикетов
 */
function getStageTotalForBarChart(stageIndex) {
  const stage = stages[stageIndex];
  if (!stage) {
    return 0;
  }

  // Используем текущий слепок или последний доступный
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
  if (!snapshot || !snapshot.statistics || !snapshot.statistics.stages) {
    return 0;
  }

  return snapshot.statistics.stages[stage.id]?.count || 0;
}

/**
 * Форматирование имени сотрудника для легенды (Имя Фамилия в две строки)
 * 
 * @param {string} fullName - Полное имя сотрудника
 * @returns {string} Отформатированное имя (Имя\nФамилия)
 */
function formatEmployeeNameForLegend(fullName) {
  if (!fullName) {
    return '';
  }
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0];
  }
  
  // Первая часть - имя, остальное - фамилия
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  
  return `${firstName}\n${lastName}`;
}

/**
 * Получить название стадии с количеством тикетов
 * 
 * @param {string} stageId - ID стадии
 * @returns {string} Название стадии с количеством
 */
function getStageLabelWithCount(stageId) {
  const stage = stages.find(s => s.id === stageId);
  if (!stage) {
    return '';
  }
  
  // Используем текущий слепок или последний доступный
  const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
  if (!snapshot || !snapshot.statistics || !snapshot.statistics.stages) {
    return stage.name;
  }
  
  const totalCount = snapshot.statistics.stages[stageId]?.count || 0;
  return `${stage.name} (${totalCount})`;
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

  // Для столбчатого графика не применяем фильтры (показываем все этапы)
  // так как фильтрация происходит на уровне labels
  if (chartType.value === 'bar') {
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
 * Метаданные для кастомной легенды столбчатого графика
 */
const barChartLegendData = computed(() => {
  if (chartType.value !== 'bar' || !chartData.value || !chartData.value.meta) {
    return null;
  }
  
  return chartData.value.meta.employeesByStage || null;
});

/**
 * Конфигурация графика (зависит от типа)
 */
const chartOptions = computed(() => {
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 0,
    layout: {
      padding: chartType.value === 'bar' ? {
        bottom: 80 // Отступ снизу для подписей сотрудников
      } : {}
    },
    onClick: (event, elements, chart) => {
      if (chartType.value === 'line') {
        handleLineChartClick(event, elements, chart);
      } else if (chartType.value === 'doughnut') {
        handleDoughnutChartClick(event, elements, chart);
      }
    },
    onHover: (event, elements, chart) => {
      // Изменение курсора при наведении на сектор круговой диаграммы
      if (chartType.value === 'doughnut') {
        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
      }
    },
    plugins: {
      legend: {
        display: chartType.value !== 'bar', // Скрываем стандартную легенду для столбчатого графика
        position: chartType.value === 'doughnut' ? 'right' : 'top',
      labels: {
        font: {
          size: chartType.value === 'doughnut' ? 14 : 12,
          weight: chartType.value === 'doughnut' ? '600' : '500'
        },
        boxWidth: chartType.value === 'doughnut' ? 18 : 12,
        boxHeight: chartType.value === 'doughnut' ? 18 : 12,
        padding: chartType.value === 'doughnut' ? 14 : 10
      },
        onClick: (e, legendItem, legend) => {
          // Для столбчатого графика - переключение видимости столбца сотрудника
          if (chartType.value === 'bar') {
            const index = legendItem.datasetIndex;
            if (index !== undefined) {
              const meta = legend.chart.getDatasetMeta(index);
              meta.hidden = !meta.hidden;
              legend.chart.update();
            }
            return;
          }
          
          // Для линейного графика - переключение видимости этапа при клике на легенду
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
            // Для столбчатого графика показываем название стадии
            if (chartType.value === 'bar') {
              const stageIndex = tooltipItems[0].dataIndex;
              const stage = stages[stageIndex];
              return stage ? stage.name : '';
            }
            return tooltipItems[0].label || '';
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed || 0;
            const index = context.dataIndex;
            
            // Для столбчатого графика показываем информацию о сотруднике
            if (chartType.value === 'bar') {
              const dataset = context.dataset;
              const stageIndex = context.dataIndex;
              const stage = stages[stageIndex];
              const stageName = stage ? stage.name : '';
              return `${dataset.label}: ${value} тикетов на этапе "${stageName}"`;
            }
            
            if (chartType.value === 'doughnut') {
              // Для круговой диаграммы показываем процент
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} тикетов (${percentage}%)`;
            } else {
              // Для линейного графика показываем информацию о сравнении
              if (!comparison.value || index === 0) {
                return `${label}: ${value} тикетов`;
              }

              // Получение данных сравнения на основе типа сравнения и индекса
              let comparisonData = null;
              const stageKey = getStageKeyFromLabel(label);

              if (comparisonType.value === 'weekStartToWeekEnd' && index === 1) {
                comparisonData = comparison.value.weekStartToWeekEnd?.stages?.[stageKey];
              } else if (comparisonType.value === 'weekEndToCurrent' && index === 2 && snapshots.value.current) {
                comparisonData = comparison.value.weekEndToCurrent?.stages?.[stageKey];
              } else if (comparisonType.value === 'weekStartToCurrent' && index === 2 && snapshots.value.current) {
                comparisonData = comparison.value.weekStartToCurrent?.stages?.[stageKey];
              }

              if (!comparisonData) {
                return `${label}: ${value} тикетов`;
              }

              const delta = comparisonData.delta;
              const deltaPercent = comparisonData.deltaPercent;
              const trend = comparisonData.trend;

              let result = `${label}: ${value} тикетов`;

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
            // Для столбчатого графика показываем процент от общего количества этапа
            if (chartType.value === 'bar' && tooltipItems.length > 0) {
              const context = tooltipItems[0];
              const dataset = context.dataset;
              const value = context.parsed.y || 0;
              const stageIndex = context.dataIndex;
              
              // Получить общее количество тикетов этапа
              const totalCount = getStageTotalForBarChart(stageIndex);
              const percentage = totalCount > 0 ? ((value / totalCount) * 100).toFixed(1) : 0;
              
              return [`${percentage}% от общего количества этапа`];
            }
            
            // Для круговой диаграммы - подсказка о клике
            if (chartType.value === 'doughnut' && tooltipItems.length > 0) {
              return ['Кликните для детализации по сотрудникам'];
            }
            
            // Для линейного графика добавляем подсказку о клике для детализации
            if (chartType.value === 'line') {
              const result = [];
              
              // Добавить информацию о периоде сравнения (если есть)
              if (comparison.value) {
                const index = tooltipItems[0].dataIndex;
                if (index !== 0) {
                  let comparisonData = null;
                  const stageKey = getStageKeyFromLabel(tooltipItems[0].dataset.label || '');

                  if (comparisonType.value === 'weekStartToWeekEnd' && index === 1) {
                    comparisonData = comparison.value.weekStartToWeekEnd;
                  } else if (comparisonType.value === 'weekEndToCurrent' && index === 2) {
                    comparisonData = comparison.value.weekEndToCurrent;
                  } else if (comparisonType.value === 'weekStartToCurrent' && index === 2) {
                    comparisonData = comparison.value.weekStartToCurrent;
                  }

                  if (comparisonData && comparisonData.metadata) {
                    const timeDiff = comparisonData.metadata.timeDiff;
                    result.push(`Период: ${timeDiff.days} дн. ${timeDiff.hours} ч. ${timeDiff.minutes} мин.`);
                  }
                }
              }
              
              // Добавить подсказку о клике для детализации
              result.push('Кликните для детализации по сотрудникам');
              
              return result;
            }
            
            // Для других типов графиков - существующая логика
            if (!comparison.value) {
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
  const employeesMeta = {}; // Метаданные о сотрудниках
  const stageCounts = {};

  stages.forEach(stage => {
    const count = source.statistics.stages[stage.id]?.count || 0;
    if (count > 0) {
      labels.push(`${stage.name} (${count})`);
      data.push(count);
      backgroundColor.push(stage.color + '80'); // С прозрачностью
      borderColor.push(stage.color);
      stageCounts[stage.id] = count;
      
      // Подготовка данных сотрудников для этапа
      const employeeData = prepareDoughnutChartEmployeeData(stage.id, source, stages);
      if (employeeData && employeeData.employees) {
        employeesMeta[stage.id] = employeeData;
      }
    }
  });

  if (data.length === 0) {
    return null;
  }

  const totalCount = data.reduce((sum, value) => sum + value, 0);

  return {
    labels,
    datasets: [{
      label: 'Распределение по этапам',
      data,
      backgroundColor,
      borderColor,
      borderWidth: 2,
      meta: {
        employees: employeesMeta,
        totals: {
          overall: totalCount,
          stages: stageCounts
        }
      }
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

  // Для столбчатого графика используем группированные столбцы (по одному на сотрудника)
  if (chartType.value === 'bar') {
    const snapshotType = props.showCurrentState && snapshotsData.current
      ? 'current'
      : snapshotsData.weekEnd
      ? 'weekEnd'
      : 'weekStart';
    
    return prepareBarChartEmployeeData(snapshotsData, snapshotType, stages);
  }

  // Для линейного графика используем стандартную логику с учётом сравнения и метаданными о сотрудниках
  const { weekStart, weekEnd, current } = snapshotsData;

  // Метки для точек графика
  const labels = [];
  const datasets = [];

  // Данные для каждого этапа
  stages.forEach((stage, index) => {
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

    // Подготовка метаданных о сотрудниках для линейного графика
    let meta = null;
    if (chartType.value === 'line') {
      const employeeData = prepareLineChartEmployeeData(stage.id, snapshotsData);
      meta = {
        employees: employeeData
      };
    }

    datasets.push({
      label: stage.name,
      data: data,
      backgroundColor: Array.isArray(backgroundColor) ? backgroundColor : backgroundColor,
      borderColor: Array.isArray(borderColor) ? borderColor : borderColor,
      borderWidth: 2,
      // Применение стиля точки только для линейных графиков
      // Используется циклический выбор стиля для случаев, когда этапов больше, чем стилей
      ...(chartType.value === 'line' && {
        pointStyle: POINT_STYLES[index % POINT_STYLES.length]
      }),
      pointBackgroundColor: Array.isArray(pointBackgroundColor) ? pointBackgroundColor : pointBackgroundColor,
      pointBorderColor: Array.isArray(borderColor) ? borderColor : borderColor,
      pointRadius: 7, // Увеличен размер точек для лучшей видимости (было 6)
      pointHoverRadius: 10, // Увеличен размер при наведении (было 8)
      fill: chartType.value === 'line' ? false : true,
      tension: chartType.value === 'line' ? 0.4 : 0,
      meta: meta // Метаданные о сотрудниках для линейного графика
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
  // Регистрация плагинов для улучшения визуализации линейного графика
  // Плагины будут применяться ко всем графикам, созданным после регистрации
  ChartJS.register(overlappingPointsPlugin);
  ChartJS.register(pointJitterPlugin);
  ChartJS.register(pointLabelsPlugin);
  
  loadData();
});

/**
 * Обработка обновления фильтров стадий
 */
function handleStageFiltersUpdate(newFilters) {
  stageFilters.value = newFilters;
}

/**
 * Обновление данных графика
 */
const updateChartData = () => {
  const newData = prepareChartData({
    weekStart: snapshots.value.weekStart,
    weekEnd: snapshots.value.weekEnd,
    current: snapshots.value.current
  });
  
  // Обновляем только если данные действительно изменились
  // Используем простую проверку по наличию данных, чтобы избежать бесконечных обновлений
  if (!chartData.value || !chartData.value.labels || chartData.value.labels.length !== newData?.labels?.length) {
    chartData.value = newData;
  } else if (newData) {
    // Обновляем только если структура данных изменилась
    const oldStr = JSON.stringify(chartData.value);
    const newStr = JSON.stringify(newData);
    if (oldStr !== newStr) {
      chartData.value = newData;
    }
  }
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
  padding: var(--spacing-lg);
  background: var(--b24-bg-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
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
  color: var(--b24-text-primary);
}

.chart-type-selector {
  display: flex;
  gap: 8px;
}

.chart-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--b24-bg-white);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.chart-type-btn:hover {
  background: var(--b24-bg);
  border-color: var(--b24-primary);
}

.chart-type-btn.active {
  background: var(--b24-primary);
  color: var(--b24-text-inverse);
  border-color: var(--b24-primary);
}

.chart-type-icon {
  font-size: 16px;
}

.chart-type-label {
  font-weight: 500;
}

/* Стили фильтров стадий перенесены в компонент StageChips.vue */

.chart-container {
  position: relative;
  width: 100%;
  min-height: 520px;
  padding: var(--spacing-md);
  box-sizing: border-box;
}

.chart-container.chart-type-doughnut {
  min-height: 420px;
}

.chart-container.chart-type-bar,
.chart-container.chart-type-line {
  min-height: 540px;
}

.error-container {
  padding: 40px;
  text-align: center;
}

.error-message {
  color: var(--b24-danger);
  font-size: 16px;
  margin-bottom: 20px;
}

.btn-retry {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.btn-retry:hover {
  background-color: var(--b24-primary-hover);
}

.no-data {
  padding: 40px;
  text-align: center;
  color: var(--b24-text-secondary);
}

.no-data p {
  margin: 8px 0;
}

.no-data-hint {
  font-size: 14px;
  color: var(--b24-text-muted);
}

/* Адаптивность */
@media (max-width: 768px) {
  .chart-container {
    min-height: 420px;
    padding: var(--spacing-sm);
  }

  .chart-container.chart-type-bar,
  .chart-container.chart-type-line {
    min-height: 480px;
  }

  .chart-container.chart-type-doughnut {
    min-height: 380px;
  }

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
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
}

.comparison-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary);
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
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
}

.legend-title {
  margin: 0 0 10px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--b24-text-primary);
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
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
.legend-increase { background-color: var(--b24-success); }
.legend-decrease { background-color: var(--b24-danger); }
.legend-stable { background-color: var(--b24-text-muted); }

@media (max-width: 768px) {
  .radio-group {
    flex-direction: column;
    gap: 12px;
  }
}

/* Обёртка для графика с подписями */
.chart-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100%;
}

/* Контейнер для canvas графика */
.chart-canvas-container {
  position: relative;
  width: 100%;
  min-height: 420px;
  height: 100%;
  max-height: none;
  overflow: visible; /* Разрешаем отображение подписей за пределами контейнера */
  padding-bottom: 12px;
  margin-bottom: 0;
}

.chart-container.chart-type-doughnut .chart-canvas-container {
  min-height: 360px;
}

.chart-container.chart-type-bar .chart-canvas-container,
.chart-container.chart-type-line .chart-canvas-container {
  min-height: 460px;
}

/* Имена сотрудников теперь рисуются на canvas через плагин Chart.js */

/* Названия стадий внизу */
.bar-chart-stage-labels {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 12px;
  padding: 12px 20px 4px;
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
}

.stage-label-item {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
  padding: 4px 8px;
}

@media (max-width: 768px) {
  .bar-chart-stage-labels {
    padding: 8px 10px 2px;
  }

  .stage-label-item {
    font-size: 11px;
    padding: 3px 4px;
  }
}
</style>

