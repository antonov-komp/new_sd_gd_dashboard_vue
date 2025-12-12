<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="employee-details-modal"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-content">
        <!-- Transition для плавной анимации -->
        <Transition name="level" mode="out-in">
          <!-- Уровень 1: Список сотрудников -->
          <div v-if="popupLevel === 1" key="level-1" class="level-1">
            <div class="modal-header">
              <h3>{{ level1Data?.stageName || stageName }}</h3>
              <span class="modal-total">Всего: {{ level1Data?.totalCount || totalCount }} тикетов</span>
              <button class="modal-close" @click="close" aria-label="Закрыть">×</button>
            </div>
            
            <!-- Переключатели вида отображения -->
            <div class="view-switcher">
              <button
                :class="['view-switch-btn', { active: viewMode === 'employees' }]"
                @click="viewMode = 'employees'"
                title="Отображение по сотрудникам"
              >
                👥 По сотрудникам
              </button>
              <button
                :class="['view-switch-btn', { active: viewMode === 'time' }]"
                @click="viewMode = 'time'"
                title="Отображение по временным градациям"
              >
                📅 По времени
              </button>
              <button
                :class="['view-switch-btn', { active: viewMode === 'departments' }]"
                @click="viewMode = 'departments'"
                title="Отображение по заказчикам"
              >
                🏢 По заказчикам
              </button>
            </div>
            
            <div class="modal-body">
              <!-- Вид: По сотрудникам -->
              <div v-if="viewMode === 'employees'">
                <div v-if="(level1Data?.employees || employees).length === 0 && (!(level1Data?.others || others) || (level1Data?.others || others).count === 0)" class="no-employees">
                  Нет данных о сотрудниках
                </div>
                <div v-else class="employees-list">
                <div
                  v-for="employee in (level1Data?.employees || employees)"
                  :key="employee.id"
                  :class="['employee-item', { 'employee-keeper': employee.isKeeper }]"
                  @click.stop="(e) => handleEmployeeClick(employee, e)"
                  title="Кликните для детализации по временным градациям"
                >
                  <span class="employee-name">{{ employee.name }}</span>
                  <div class="employee-progress">
                    <div
                      class="progress-bar"
                      :style="{
                        width: employee.progressBarWidth + '%',
                        backgroundColor: employee.progressBarColor
                      }"
                    ></div>
                  </div>
                  <span class="employee-count">
                    {{ employee.count }} тикетов ({{ employee.percentage }}%)
                  </span>
                  <span class="employee-arrow">→</span>
                </div>
                <div v-if="(level1Data?.others || others) && (level1Data?.others || others).count > 0" class="employee-item employee-others">
                  <span class="employee-name">Другие ({{ (level1Data?.others || others).employeeCount }})</span>
                  <div class="employee-progress">
                    <div
                      class="progress-bar"
                      :style="{
                        width: (level1Data?.others || others).progressBarWidth + '%',
                        backgroundColor: (level1Data?.others || others).progressBarColor
                      }"
                    ></div>
                  </div>
                  <span class="employee-count">
                    {{ (level1Data?.others || others).count }} тикетов ({{ (level1Data?.others || others).percentage }}%)
                  </span>
                </div>
                </div>
              </div>
              
              <!-- Вид: По временным градациям -->
              <div v-else-if="viewMode === 'time'" class="view-time">
                <div v-if="level1TimeCategories.length === 0" class="no-data">
                  Загрузка данных...
                </div>
                <div v-else class="date-categories-list">
                  <div
                    v-for="category in level1TimeCategories"
                    :key="category.category"
                    class="category-item"
                    @click.stop="handleTimeCategoryClick(category)"
                  >
                    <span class="category-label">{{ category.label }}</span>
                    <div class="category-progress">
                      <div
                        class="progress-bar"
                        :style="{
                          width: category.progressBarWidth + '%',
                          backgroundColor: category.progressBarColor
                        }"
                      ></div>
                    </div>
                    <span class="category-count">
                      {{ category.count }} тикетов ({{ category.percentage }}%)
                    </span>
                    <span class="category-arrow">→</span>
                  </div>
                </div>
              </div>
              
              <!-- Вид: По заказчикам -->
              <div v-else-if="viewMode === 'departments'" class="view-departments">
                <div v-if="level1Departments.length === 0" class="no-data">
                  Загрузка данных...
                </div>
                <div v-else class="departments-table-container">
                  <table class="departments-table">
                    <thead>
                      <tr>
                        <th class="col-department">Заказчик</th>
                        <th class="col-count">Количество тикетов</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(department, index) in level1Departments"
                        :key="index"
                        class="department-row"
                      >
                        <td class="col-department">
                          <span class="department-name">{{ department.departmentName }}</span>
                        </td>
                        <td class="col-count">
                          <span class="count-value">{{ department.count }}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Уровень 2: Временные градации -->
          <div v-else-if="popupLevel === 2 && level2Data" key="level-2" class="level-2">
            <div class="modal-header">
              <button class="btn-back" @click="goBack" aria-label="Назад">
                ←
              </button>
              <h3>{{ level2Data.employeeName }}</h3>
              <span class="modal-total">Всего: {{ level2Data.totalCount }} тикетов</span>
              <button class="modal-close" @click="close" aria-label="Закрыть">×</button>
            </div>
            <div class="modal-body">
              <div class="stage-info">
                <span class="stage-badge">{{ level2Data.stageName }}</span>
              </div>
              
              <div v-if="level2Data.dateCategories.length === 0" class="no-data">
                Нет данных о тикетах
              </div>
              
              <div v-else class="date-categories-list">
                <div
                  v-for="category in level2Data.dateCategories"
                  :key="category.category"
                  class="category-item"
                  @click.stop="handleCategoryClick(category)"
                >
                  <span class="category-label">{{ category.label }}</span>
                  <div class="category-progress">
                    <div
                      class="progress-bar"
                      :style="{
                        width: category.progressBarWidth + '%',
                        backgroundColor: category.progressBarColor
                      }"
                    ></div>
                  </div>
                  <span class="category-count">
                    {{ category.count }} тикетов ({{ category.percentage }}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Уровень 3: Детализация по заказчикам -->
          <div v-else-if="popupLevel === 3 && level3Data" key="level-3" class="level-3">
            <div class="modal-header">
              <button class="btn-back" @click="goBack" aria-label="Назад">
                ←
              </button>
              <div class="header-info">
                <h3>{{ level3Data.employeeName }}</h3>
                <div class="header-badges">
                  <span class="date-badge">{{ level3Data.dateCategoryLabel }}</span>
                  <span class="stage-badge">{{ level3Data.stageName }}</span>
                </div>
              </div>
              <span class="modal-total">Всего: {{ level3Data.totalCount }} тикетов</span>
              <button class="modal-close" @click="close" aria-label="Закрыть">×</button>
            </div>
            
            <div class="modal-body">
              <div v-if="level3Data.departments.length === 0" class="no-data">
                Нет данных о заказчиках
              </div>
              
              <div v-else class="departments-table-container">
                <table class="departments-table">
                  <thead>
                    <tr>
                      <th class="col-department">Заказчик</th>
                      <th class="col-count">Количество тикетов</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(department, index) in level3Data.departments"
                      :key="index"
                      class="department-row"
                    >
                      <td class="col-department">
                        <span class="department-name">{{ department.departmentName }}</span>
                      </td>
                      <td class="col-count">
                        <span class="count-value">{{ department.count }}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
/**
 * Компонент модального окна с детализацией по сотрудникам
 * 
 * Используется для отображения детализации по сотрудникам при клике на точку графика
 * Поддерживает три уровня интерактивности:
 * - Уровень 1: Список сотрудников стадии
 * - Уровень 2: Временные градации тикетов сотрудника
 * - Уровень 3: Детализация по заказчикам (отделам)
 * 
 * Дата создания: 2025-12-11 (UTC+3, Брест)
 * Задача: TASK-031-03, TASK-033
 */

import { ref, computed, watch, onMounted } from 'vue';
import { 
  getEmployeeTicketsForStage,
  groupTicketsByDateCategory,
  groupTicketsByDepartment
} from '@/utils/graph-state/popupNavigationUtils.js';
import { useNotifications } from '@/composables/useNotifications.js';
import TicketDetailsService from '@/services/graph-state/TicketDetailsService.js';
import { mapStageId } from '@/services/dashboard-sector-1c/mappers/stage-mapper.js';

const props = defineProps({
  /**
   * Видимость модального окна
   */
  isVisible: {
    type: Boolean,
    default: false
  },
  /**
   * Название этапа
   */
  stageName: {
    type: String,
    required: true
  },
  /**
   * ID стадии ('formed', 'review', 'execution')
   */
  stageId: {
    type: String,
    default: ''
  },
  /**
   * Общее количество тикетов этапа
   */
  totalCount: {
    type: Number,
    required: true
  },
  /**
   * Массив сотрудников с данными
   */
  employees: {
    type: Array,
    default: () => []
  },
  /**
   * Данные о группе "Другие" (если сотрудников > 10)
   */
  others: {
    type: Object,
    default: null
  },
  /**
   * Слепок с данными (для получения тикетов)
   */
  snapshot: {
    type: Object,
    default: null
  },
  /**
   * Детали тикетов (если уже загружены через API)
   */
  ticketDetails: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

const notifications = useNotifications();

/**
 * Текущий уровень попапа (1, 2, или 3)
 */
const popupLevel = ref(1);

/**
 * Режим отображения уровня 1: 'employees' | 'time' | 'departments'
 */
const viewMode = ref('employees');

/**
 * Данные уровня 1 (сохраняются при переходе на уровень 2)
 */
const level1Data = ref(null);

/**
 * Данные для вида "По времени" (уровень 1)
 */
const level1TimeCategories = ref([]);

/**
 * Данные для вида "По заказчикам" (уровень 1)
 */
const level1Departments = ref([]);

/**
 * Данные уровня 2 (временные градации сотрудника)
 */
const level2Data = ref(null);

/**
 * Данные уровня 3 (заказчики градации)
 */
const level3Data = ref(null);

/**
 * Computed-свойства для удобного доступа
 */
const canGoBack = computed(() => {
  return popupLevel.value > 1;
});

const popupTitle = computed(() => {
  switch (popupLevel.value) {
    case 1:
      return level1Data.value?.stageName || props.stageName;
    case 2:
      return level2Data.value?.employeeName || '';
    case 3:
      return `${level2Data.value?.employeeName || ''} — ${level3Data.value?.dateCategoryLabel || ''}`;
    default:
      return '';
  }
});

/**
 * Инициализация данных уровня 1
 */
function initializeLevel1() {
  console.log('[EmployeeDetailsModal] Initializing level 1 with props:', {
    stageName: props.stageName,
    stageId: props.stageId,
    totalCount: props.totalCount,
    employeesCount: props.employees?.length || 0,
    hasSnapshot: !!props.snapshot,
    snapshotTicketIds: props.snapshot?.ticketIds?.length || 0,
    hasTicketDetails: !!props.ticketDetails,
    snapshotKeys: props.snapshot ? Object.keys(props.snapshot) : []
  });
  
  // Инициализация уровня 1 данными из props
  level1Data.value = {
    stageName: props.stageName,
    stageId: props.stageId,
    totalCount: props.totalCount,
    employees: props.employees || [],
    others: props.others || null,
    snapshot: props.snapshot || null,
    ticketDetails: props.ticketDetails || null
  };
  
  console.log('[EmployeeDetailsModal] Level 1 data initialized:', {
    stageId: level1Data.value.stageId,
    hasSnapshot: !!level1Data.value.snapshot,
    employeesCount: level1Data.value.employees.length,
    snapshotType: level1Data.value.snapshot ? typeof level1Data.value.snapshot : 'null'
  });
  
  // Сброс уровней 2 и 3
  level2Data.value = null;
  level3Data.value = null;
  popupLevel.value = 1;
  viewMode.value = 'employees';
  
  // Загрузить данные для других видов отображения
  loadLevel1ViewData();
  
  console.log('[EmployeeDetailsModal] Popup level set to 1, ready for clicks');
}

/**
 * Загрузка данных для видов "По времени" и "По заказчикам" (уровень 1)
 */
async function loadLevel1ViewData() {
  if (!level1Data.value || !level1Data.value.snapshot || !level1Data.value.stageId) {
    console.warn('[EmployeeDetailsModal] Cannot load level 1 view data - missing required data');
    return;
  }

  try {
    // Получить все тикеты из snapshot
    const allSnapshotTickets = level1Data.value.snapshot.tickets || [];
    const currentStageId = level1Data.value.stageId;
    
    console.log('[EmployeeDetailsModal] Loading level 1 view data:', {
      totalSnapshotTickets: allSnapshotTickets.length,
      currentStageId: currentStageId,
      sampleTicket: allSnapshotTickets[0] ? {
        id: allSnapshotTickets[0].id,
        stageId: allSnapshotTickets[0].stageId,
        hasDepartmentHead: !!allSnapshotTickets[0].departmentHead,
        departmentHead: allSnapshotTickets[0].departmentHead,
        hasDepartmentHeadFull: !!allSnapshotTickets[0].departmentHeadFull,
        departmentHeadFull: allSnapshotTickets[0].departmentHeadFull,
        allKeys: Object.keys(allSnapshotTickets[0])
      } : null
    });
    
    // ВАЖНО: Фильтровать тикеты только по текущей стадии
    // snapshot содержит тикеты всех стадий, нужно оставить только текущую
    // Используем mapStageId для преобразования Bitrix24 stageId во внутренний формат
    let allTickets = allSnapshotTickets.filter(ticket => {
      // Если у тикета есть stageId, проверяем его
      if (ticket.stageId) {
        const internalStageId = mapStageId(ticket.stageId);
        return internalStageId === currentStageId;
      }
      // Если stageId нет в тикете, но он есть в snapshot для этой стадии
      // Проверяем, есть ли тикет в списке ticketIds для этой стадии (если есть)
      // Если нет - оставляем, так как snapshot уже отфильтрован по стадии при создании
      // Но лучше загрузить детали через API для проверки stageId
      return true; // Временно оставляем все, но загрузим детали через API для проверки
    });
    
    console.log('[EmployeeDetailsModal] Filtered tickets by stage:', {
      beforeFilter: allSnapshotTickets.length,
      afterFilter: allTickets.length,
      stageId: currentStageId,
      ticketsWithStageId: allTickets.filter(t => t.stageId).length,
      ticketsWithoutStageId: allTickets.filter(t => !t.stageId).length
    });
    
    // Определить, какие тикеты нужно загрузить через API
    // Загружаем детали для тикетов, у которых нет departmentHead или departmentHeadFull
    const ticketsNeedingDetails = allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull);
    
    if (ticketsNeedingDetails.length > 0) {
      console.log('[EmployeeDetailsModal] DepartmentHead missing for some tickets, loading via API...', {
        ticketsNeedingDetails: ticketsNeedingDetails.length,
        totalTickets: allTickets.length,
        ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length
      });
      
      // Загрузить детали только для тикетов, которым это нужно
      const ticketIds = ticketsNeedingDetails.map(t => t.id).filter(id => id);
      
      try {
        console.log('[EmployeeDetailsModal] Loading details for tickets:', {
          ticketIdsCount: ticketIds.length,
          ticketIdsSample: ticketIds.slice(0, 10)
        });
        
        const ticketDetails = await TicketDetailsService.getTicketsDetails(ticketIds);
        
        // Создать Map для быстрого доступа
        const detailsMap = new Map();
        ticketDetails.forEach(detail => {
          if (detail && detail.id) {
            detailsMap.set(detail.id, detail);
          }
        });
        
        console.log('[EmployeeDetailsModal] Details loaded from API:', {
          detailsCount: ticketDetails.length,
          detailsMapSize: detailsMap.size,
          sampleDetail: ticketDetails[0] ? {
            id: ticketDetails[0].id,
            departmentHead: ticketDetails[0].departmentHead,
            departmentHeadFull: ticketDetails[0].departmentHeadFull
          } : null
        });
        
        // Объединить данные из snapshot и загруженных деталей
        allTickets = allTickets.map(ticket => {
          const details = detailsMap.get(ticket.id);
          if (details) {
            // Использовать данные из API, если они есть
            return {
              ...ticket,
              stageId: details.stageId || ticket.stageId || null, // Добавляем stageId из деталей
              departmentHead: details.departmentHead || ticket.departmentHead || null,
              departmentHeadFull: details.departmentHeadFull || details.departmentHead || ticket.departmentHead || null
            };
          }
          // Если детали не загружены, использовать данные из snapshot
          return ticket;
        });
        
        // ВАЖНО: После загрузки деталей через API снова фильтруем по стадии
        // Теперь у тикетов может быть stageId из API, нужно проверить его
        allTickets = allTickets.filter(ticket => {
          if (ticket.stageId) {
            const internalStageId = mapStageId(ticket.stageId);
            return internalStageId === currentStageId;
          }
          // Если stageId всё ещё нет, оставляем тикет (он уже был отфильтрован ранее)
          return true;
        });
        
        console.log('[EmployeeDetailsModal] Ticket details merged (before stage filter):', {
          totalTickets: allTickets.length,
          ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length,
          ticketsWithoutDepartment: allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull).length,
          ticketsWithStageId: allTickets.filter(t => t.stageId).length,
          ticketsWithoutStageId: allTickets.filter(t => !t.stageId).length
        });
        
        // ВАЖНО: После загрузки деталей через API снова фильтруем по стадии
        // Теперь у тикетов может быть stageId из API, нужно проверить его
        const beforeStageFilter = allTickets.length;
        
        // Сохраняем данные о departmentHead перед фильтрацией для отладки
        const sampleBeforeFilter = allTickets.slice(0, 3).map(t => ({
          id: t.id,
          departmentHead: t.departmentHead,
          departmentHeadFull: t.departmentHeadFull,
          stageId: t.stageId
        }));
        
        allTickets = allTickets.filter(ticket => {
          if (ticket.stageId) {
            const internalStageId = mapStageId(ticket.stageId);
            return internalStageId === currentStageId;
          }
          // Если stageId всё ещё нет, оставляем тикет (он уже был отфильтрован ранее)
          return true;
        });
        
        // Сохраняем данные о departmentHead после фильтрации для отладки
        const sampleAfterFilter = allTickets.slice(0, 3).map(t => ({
          id: t.id,
          departmentHead: t.departmentHead,
          departmentHeadFull: t.departmentHeadFull,
          stageId: t.stageId
        }));
        
        console.log('[EmployeeDetailsModal] Ticket details merged (after stage filter):', {
          beforeStageFilter: beforeStageFilter,
          afterStageFilter: allTickets.length,
          filteredOut: beforeStageFilter - allTickets.length,
          currentStageId: currentStageId,
          ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length,
          ticketsWithoutDepartment: allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull).length,
          sampleBeforeFilter: sampleBeforeFilter,
          sampleAfterFilter: sampleAfterFilter,
          sampleWithDepartment: allTickets.find(t => t.departmentHead || t.departmentHeadFull) ? {
            id: allTickets.find(t => t.departmentHead || t.departmentHeadFull).id,
            departmentHead: allTickets.find(t => t.departmentHead || t.departmentHeadFull).departmentHead,
            departmentHeadFull: allTickets.find(t => t.departmentHead || t.departmentHeadFull).departmentHeadFull,
            allKeys: Object.keys(allTickets.find(t => t.departmentHead || t.departmentHeadFull)).filter(k => k.toLowerCase().includes('department'))
          } : null
        });
      } catch (error) {
        console.warn('[EmployeeDetailsModal] Failed to load ticket details via API, using snapshot data:', error);
        console.error('[EmployeeDetailsModal] Error details:', {
          message: error.message,
          stack: error.stack
        });
        // Продолжаем с данными из snapshot
      }
    } else {
      console.log('[EmployeeDetailsModal] All tickets have departmentHead, skipping API load');
    }
    
    // ВАЖНО: Все три вида (По сотрудникам, По времени, По заказчикам) 
    // должны использовать только тикеты текущей стадии
    console.log('[EmployeeDetailsModal] Final tickets for grouping (only current stage):', {
      totalTickets: allTickets.length,
      currentStageId: currentStageId,
      ticketsWithStageId: allTickets.filter(t => t.stageId).length,
      ticketsWithoutStageId: allTickets.filter(t => !t.stageId).length,
      ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length,
      ticketsWithoutDepartment: allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull).length
    });
    
    // Группировать по временным градациям (только тикеты текущей стадии)
    const timeCategories = groupTicketsByDateCategory(allTickets);
    level1TimeCategories.value = timeCategories;
    
    // Группировать по заказчикам (только тикеты текущей стадии)
    // Логирование перед группировкой для отладки
    console.log('[EmployeeDetailsModal] Before groupTicketsByDepartment:', {
      ticketsCount: allTickets.length,
      sampleTickets: allTickets.slice(0, 5).map(t => ({
        id: t.id,
        departmentHead: t.departmentHead,
        departmentHeadFull: t.departmentHeadFull,
        hasDepartmentHead: !!t.departmentHead,
        hasDepartmentHeadFull: !!t.departmentHeadFull,
        allKeys: Object.keys(t).filter(k => k.toLowerCase().includes('department'))
      })),
      ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length,
      ticketsWithoutDepartment: allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull).length
    });
    
    const departments = groupTicketsByDepartment(allTickets);
    level1Departments.value = departments;
    
    // Подсчитать общее количество тикетов для проверки
    const totalTicketsInTimeCategories = timeCategories.reduce((sum, cat) => sum + cat.count, 0);
    const totalTicketsInDepartments = departments.reduce((sum, dept) => sum + dept.count, 0);
    
    console.log('[EmployeeDetailsModal] Level 1 view data loaded (only current stage):', {
      currentStageId: currentStageId,
      totalTicketsForGrouping: allTickets.length,
      timeCategoriesCount: timeCategories.length,
      totalTicketsInTimeCategories: totalTicketsInTimeCategories,
      departmentsCount: departments.length,
      totalTicketsInDepartments: totalTicketsInDepartments,
      departmentsSample: departments.slice(0, 5),
      ticketsWithDepartment: allTickets.filter(t => t.departmentHead || t.departmentHeadFull).length,
      ticketsWithoutDepartment: allTickets.filter(t => !t.departmentHead && !t.departmentHeadFull).length,
      // Проверка: все три вида должны показывать одинаковое количество тикетов
      consistencyCheck: {
        totalTickets: allTickets.length,
        timeCategoriesTotal: totalTicketsInTimeCategories,
        departmentsTotal: totalTicketsInDepartments,
        isConsistent: allTickets.length === totalTicketsInTimeCategories && allTickets.length === totalTicketsInDepartments
      }
    });
  } catch (error) {
    console.error('[EmployeeDetailsModal] Error loading level 1 view data:', error);
    console.error('[EmployeeDetailsModal] Error stack:', error.stack);
  }
}

/**
 * Обработка клика на временную градацию в виде "По времени" (уровень 1)
 */
function handleTimeCategoryClick(category) {
  if (!category || category.count === 0) {
    notifications.info(`В категории "${category?.label || 'неизвестная'}" нет тикетов`);
    return;
  }

  // Перейти на уровень 2 с данными категории
  // Здесь можно открыть детализацию по сотрудникам для этой категории
  notifications.info(`Детализация по категории "${category.label}" будет доступна в следующей версии`);
}

/**
 * Инициализация данных уровня 1 при открытии попапа
 */
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeLevel1();
  } else {
    // При закрытии сбрасываем все данные
    resetPopup();
  }
});

/**
 * Инициализация при монтировании компонента (если попап уже открыт)
 */
onMounted(() => {
  if (props.isVisible) {
    initializeLevel1();
  }
});

/**
 * Обработка клика на сотрудника (переход на уровень 2)
 * 
 * @param {Object} employee - Объект сотрудника из уровня 1
 */
async function handleEmployeeClick(employee, event = null) {
  console.log('[EmployeeDetailsModal] ====== handleEmployeeClick START ======');
  console.log('[EmployeeDetailsModal] Employee clicked:', employee);
  console.log('[EmployeeDetailsModal] Current popup level:', popupLevel.value);
  
  // Визуальная обратная связь
  if (event && event.currentTarget) {
    event.currentTarget.style.transform = 'scale(0.98)';
    setTimeout(() => {
      if (event.currentTarget) {
        event.currentTarget.style.transform = '';
      }
    }, 150);
  }
  
  if (!employee || !employee.id) {
    console.warn('[EmployeeDetailsModal] Invalid employee data:', employee);
    return;
  }

  // Сохранить данные уровня 1 (если еще не сохранены)
  if (!level1Data.value) {
    console.log('[EmployeeDetailsModal] Level 1 data not found, initializing from props');
    level1Data.value = {
      stageName: props.stageName,
      stageId: props.stageId,
      totalCount: props.totalCount,
      employees: props.employees || [],
      others: props.others || null,
      snapshot: props.snapshot || null,
      ticketDetails: props.ticketDetails || null
    };
  }

  console.log('[EmployeeDetailsModal] Level 1 data:', {
    stageId: level1Data.value.stageId,
    stageName: level1Data.value.stageName,
    hasSnapshot: !!level1Data.value.snapshot,
    snapshotType: level1Data.value.snapshot ? typeof level1Data.value.snapshot : 'null',
    snapshotKeys: level1Data.value.snapshot ? Object.keys(level1Data.value.snapshot) : []
  });

  if (!level1Data.value.stageId) {
    console.error('[EmployeeDetailsModal] ERROR: ID стадии не указан');
    notifications.warning('ID стадии не указан');
    return;
  }

  if (!level1Data.value.snapshot) {
    console.error('[EmployeeDetailsModal] ERROR: Слепок с данными не передан');
    console.error('[EmployeeDetailsModal] Props snapshot:', props.snapshot);
    notifications.warning('Слепок с данными не передан');
    return;
  }

  try {
    console.log('[EmployeeDetailsModal] Loading tickets for employee:', employee.id, 'stage:', level1Data.value.stageId);
    
    // Получить тикеты сотрудника на стадии
    const tickets = await getEmployeeTicketsForStage(
      employee.id,
      level1Data.value.stageId,
      level1Data.value.snapshot,
      level1Data.value.ticketDetails
    );

    console.log('[EmployeeDetailsModal] Loaded tickets:', tickets?.length || 0, tickets);

    if (!tickets || tickets.length === 0) {
      console.warn('[EmployeeDetailsModal] No tickets found for employee');
      notifications.info(`У сотрудника "${employee.name}" нет тикетов на стадии "${level1Data.value.stageName}"`);
      return;
    }

    // Группировать по временным градациям
    const dateCategories = groupTicketsByDateCategory(tickets);
    console.log('[EmployeeDetailsModal] Date categories:', dateCategories?.length || 0, dateCategories);

    // Сохранить данные уровня 2
    level2Data.value = {
      employeeId: employee.id,
      employeeName: employee.name,
      stageId: level1Data.value.stageId,
      stageName: level1Data.value.stageName,
      totalCount: tickets.length,
      dateCategories: dateCategories,
      snapshot: level1Data.value.snapshot,
      ticketDetails: level1Data.value.ticketDetails
    };

    console.log('[EmployeeDetailsModal] Level 2 data set:', {
      employeeName: level2Data.value.employeeName,
      totalCount: level2Data.value.totalCount,
      dateCategoriesCount: level2Data.value.dateCategories.length
    });

    // Перейти на уровень 2
    console.log('[EmployeeDetailsModal] Transitioning to level 2');
    console.log('[EmployeeDetailsModal] Level 2 data before set:', level2Data.value);
    popupLevel.value = 2;
    console.log('[EmployeeDetailsModal] Popup level set to:', popupLevel.value);
    console.log('[EmployeeDetailsModal] Level 2 data after set:', level2Data.value);
    console.log('[EmployeeDetailsModal] Level 2 data check:', {
      hasLevel2Data: !!level2Data.value,
      employeeName: level2Data.value?.employeeName,
      dateCategoriesCount: level2Data.value?.dateCategories?.length || 0
    });
    
    // КРИТИЧЕСКИЙ ТЕСТ - проверка что уровень изменился
    setTimeout(() => {
      console.log('[EmployeeDetailsModal] After timeout - popupLevel:', popupLevel.value);
      console.log('[EmployeeDetailsModal] After timeout - level2Data:', level2Data.value);
    }, 100);
    
    console.log('[EmployeeDetailsModal] ====== handleEmployeeClick END ======');
  } catch (error) {
    console.error('[EmployeeDetailsModal] ERROR loading employee tickets:', error);
    console.error('[EmployeeDetailsModal] Error stack:', error.stack);
    notifications.error('Ошибка загрузки данных о тикетах: ' + error.message);
  }
}

/**
 * Обработка клика на временную градацию (переход на уровень 3)
 * 
 * @param {Object} category - Объект категории давности
 */
function handleCategoryClick(category) {
  if (!category || category.count === 0) {
    notifications.info(`В категории "${category?.label || 'неизвестная'}" нет тикетов`);
    return;
  }

  if (!category.tickets || category.tickets.length === 0) {
    notifications.info(`В категории "${category.label}" нет тикетов`);
    return;
  }

  // Проверить наличие данных уровня 2
  if (!level2Data.value) {
    console.error('Level 2 data not found');
    return;
  }

  // Группировать тикеты по заказчикам
  const departments = groupTicketsByDepartment(category.tickets);

  // Сохранить данные уровня 3
  level3Data.value = {
    employeeId: level2Data.value.employeeId,
    employeeName: level2Data.value.employeeName,
    stageId: level2Data.value.stageId,
    stageName: level2Data.value.stageName,
    dateCategory: category.category,
    dateCategoryLabel: category.label,
    totalCount: category.count,
    departments: departments,
    snapshot: level2Data.value.snapshot,
    ticketDetails: level2Data.value.ticketDetails
  };

  // Перейти на уровень 3
  popupLevel.value = 3;
}

/**
 * Возврат на предыдущий уровень
 */
function goBack() {
  if (popupLevel.value === 3) {
    // Возврат с уровня 3 на уровень 2
    popupLevel.value = 2;
    level3Data.value = null;
  } else if (popupLevel.value === 2) {
    // Возврат с уровня 2 на уровень 1
    popupLevel.value = 1;
    level2Data.value = null;
    level3Data.value = null;
  }
}

/**
 * Полный сброс состояния попапа
 */
function resetPopup() {
  popupLevel.value = 1;
  level1Data.value = null;
  level2Data.value = null;
  level3Data.value = null;
}

/**
 * Закрытие модального окна
 */
function close() {
  resetPopup();
  emit('close');
}
</script>

<style scoped>
.employee-details-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal-content {
  background: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-lg, 8px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
  gap: 12px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
  flex: 1;
}

.modal-total {
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  background-color: var(--b24-bg-light, #f3f4f6);
  padding: 4px 12px;
  border-radius: var(--radius-xl, 9999px);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
  color: var(--b24-text-primary, #1f2937);
}

.modal-body {
  padding: 20px;
}

.no-employees {
  text-align: center;
  padding: 40px 20px;
  color: var(--b24-text-muted, #9ca3af);
  font-size: 14px;
  font-style: italic;
}

.employees-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.employee-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid var(--b24-primary, #007bff);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.employee-item:hover {
  background-color: var(--b24-bg, #f9fafb);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.employee-arrow {
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
  opacity: 0.6;
  transition: all 0.2s ease;
  margin-left: auto;
}

.employee-item:hover .employee-arrow {
  opacity: 1;
  color: var(--b24-primary, #007bff);
  transform: translateX(4px);
}

.employee-item.employee-keeper {
  border-left-color: var(--b24-warning, #ffc107);
  background-color: var(--b24-warning-lighter, #fff8e1);
}

.employee-item.employee-keeper:hover {
  background-color: var(--b24-warning-light, #fff59d);
}

.employee-item.employee-others {
  border-left-color: var(--b24-text-muted, #9ca3af);
  background-color: var(--b24-bg, #f9fafb);
}

.employee-name {
  min-width: 150px;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-primary, #1f2937);
}

.employee-progress {
  flex: 1;
  height: 20px;
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
  margin: 0 12px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.progress-bar {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: var(--radius-sm, 4px);
}

.employee-count {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
  text-align: right;
}

/* Анимации */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Переключатели вида отображения */
.view-switcher {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
  background-color: var(--b24-bg-light, #f3f4f6);
}

.view-switch-btn {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-md, 6px);
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.view-switch-btn:hover {
  background-color: var(--b24-bg, #f9fafb);
  border-color: var(--b24-primary, #007bff);
  color: var(--b24-primary, #007bff);
}

.view-switch-btn.active {
  background-color: var(--b24-primary, #007bff);
  border-color: var(--b24-primary, #007bff);
  color: var(--b24-bg-white, #ffffff);
}

.view-switch-btn.active:hover {
  background-color: var(--b24-primary-dark, #0056b3);
}

/* Уровень 2: Временные градации */
.level-2 {
  /* Наследуем базовые стили модального окна */
}

.btn-back {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 20px;
  line-height: 1;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  border-radius: var(--radius-sm, 4px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 8px;
}

.btn-back:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
  color: var(--b24-text-primary, #1f2937);
}

.stage-info {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
}

.stage-badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--b24-primary, #007bff);
  color: white;
  border-radius: var(--radius-xl, 9999px);
  font-size: 12px;
  font-weight: 600;
}

.date-categories-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.category-item:hover {
  background-color: var(--b24-bg, #f9fafb);
  border-left-color: var(--b24-primary, #007bff);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.category-arrow {
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
  opacity: 0.6;
  transition: all 0.2s ease;
  margin-left: auto;
}

.category-item:hover .category-arrow {
  opacity: 1;
  color: var(--b24-primary, #007bff);
  transform: translateX(4px);
}

.category-label {
  min-width: 150px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
}

.category-progress {
  flex: 1;
  height: 20px;
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
  margin: 0 12px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.category-count {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
  text-align: right;
}

.no-data {
  text-align: center;
  padding: 40px 20px;
  color: var(--b24-text-muted, #9ca3af);
  font-size: 14px;
  font-style: italic;
}

/* Уровень 3: Детализация по заказчикам */
.level-3 {
  /* Наследуем базовые стили модального окна */
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.header-info h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
}

.header-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.date-badge {
  display: inline-block;
  padding: 4px 12px;
  background-color: var(--b24-info, #17a2b8);
  color: white;
  border-radius: var(--radius-xl, 9999px);
  font-size: 12px;
  font-weight: 600;
}

.departments-table-container {
  width: 100%;
  overflow-x: auto;
}

.departments-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--b24-bg-white, #ffffff);
}

.departments-table thead {
  background-color: var(--b24-bg-light, #f3f4f6);
  border-bottom: 2px solid var(--b24-border-medium, #d1d5db);
}

.departments-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.departments-table .col-department {
  width: 70%;
}

.departments-table .col-count {
  width: 30%;
  text-align: right;
}

.departments-table tbody tr {
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
  transition: background-color 0.2s ease;
}

.departments-table tbody tr:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
}

.departments-table tbody tr:last-child {
  border-bottom: none;
}

.department-row {
  cursor: default; /* Таблица не интерактивна, только для просмотра */
}

.department-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-primary, #1f2937);
  word-break: break-word; /* Перенос длинных названий */
}

.count-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
}

/* Чередование цветов строк */
.departments-table tbody tr:nth-child(even) {
  background-color: var(--b24-bg, #f9fafb);
}

.departments-table tbody tr:nth-child(even):hover {
  background-color: var(--b24-bg-light, #f3f4f6);
}

/* Выделение первой строки (топ заказчик) */
.departments-table tbody tr:first-child {
  background-color: var(--b24-primary-lighter, #e7f3ff);
}

.departments-table tbody tr:first-child:hover {
  background-color: var(--b24-primary-light, #cfe2ff);
}

/* Анимации переходов между уровнями */
.level-enter-active {
  transition: all 0.3s ease-out;
}

.level-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.level-enter-to {
  opacity: 1;
  transform: translateX(0);
}

.level-leave-active {
  transition: all 0.3s ease-in;
}

.level-leave-from {
  opacity: 1;
  transform: translateX(0);
}

.level-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }

  .modal-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .modal-total {
    align-self: flex-start;
  }

  .employee-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .employee-name {
    min-width: auto;
    width: 100%;
  }

  .employee-progress {
    width: 100%;
    margin: 0;
  }

  .employee-count {
    min-width: auto;
    text-align: left;
    width: 100%;
  }

  .category-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .category-label {
    min-width: auto;
    width: 100%;
  }

  .category-progress {
    width: 100%;
    margin: 0;
  }

  .category-count {
    min-width: auto;
    text-align: left;
    width: 100%;
  }

  .header-info {
    width: 100%;
  }

  .header-badges {
    width: 100%;
  }

  .departments-table-container {
    overflow-x: scroll;
    -webkit-overflow-scrolling: touch;
  }

  .departments-table {
    min-width: 400px; /* Минимальная ширина для читаемости */
  }

  .departments-table th,
  .departments-table td {
    padding: 10px 12px;
    font-size: 13px;
  }

  .department-name {
    font-size: 13px;
  }

  .count-value {
    font-size: 13px;
  }
}
</style>

