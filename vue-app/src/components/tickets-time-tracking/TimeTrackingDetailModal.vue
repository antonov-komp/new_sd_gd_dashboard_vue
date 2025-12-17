<template>
  <Teleport to="body">
    <div
      v-if="cellData"
      class="modal-backdrop"
      role="dialog"
      aria-modal="true"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ modalTitle }}</h2>
          <button class="close-button" @click="close" aria-label="Закрыть">×</button>
        </div>
        
        <div class="modal-body">
          <!-- Transition для плавной анимации между уровнями -->
          <Transition name="level" mode="out-in">
            <!-- Уровень 1: Детализация по ячейке -->
            <div 
              v-if="popupLevel === 1 && (cellData.type === 'cell' || (!cellData.type && cellData.employee && cellData.week))" 
              key="level-1"
              class="detail-cell"
            >
            <div class="detail-info">
              <p><strong>Сотрудник:</strong> {{ cellData.employee?.name || 'Неизвестно' }}</p>
              <p><strong>Неделя:</strong> {{ cellData.week?.weekNumber || '?' }}</p>
              <p><strong>Трудозатраты:</strong> {{ formatElapsedTime(cellData.elapsedTime || 0) }}</p>
            </div>
            
            <div v-if="cellData.week?.employees" class="tasks-list">
              <h3>Задачи и связанные тикеты:</h3>
              <div 
                v-for="employee in cellData.week.employees.filter(e => e.id === cellData.employee?.id)" 
                :key="employee.id"
                class="employee-tasks"
              >
                <div class="task-item" v-for="(task, index) in employee.tasks" :key="index">
                  <div class="task-header">
                    <span class="task-label">Задача #{{ task.id || index + 1 }}</span>
                    <span class="task-time">{{ formatElapsedTime(task.elapsedTime || 0) }}</span>
                  </div>
                  <div v-if="task.ticket" class="ticket-info">
                    <span class="ticket-label">Тикет #{{ task.ticket.id }}</span>
                    <span 
                      v-if="task.ticket.createdWeek && task.ticket.createdWeek !== cellData.week.weekNumber"
                      class="ticket-week-badge"
                      :title="`Тикет создан в неделе ${task.ticket.createdWeek}, трудозатрата записана в неделе ${cellData.week.weekNumber}`"
                    >
                      (создан в неделе {{ task.ticket.createdWeek }})
                    </span>
                    <div v-if="task.ticket.title" class="ticket-title">{{ task.ticket.title }}</div>
                  </div>
                  <div v-else class="ticket-info ticket-info--no-ticket">
                    <span class="no-ticket-label">Тикет не связан</span>
                  </div>
                </div>
              </div>
              
              <div class="detail-total">
                <p>
                  <strong>Итого:</strong> 
                  {{ formatElapsedTime(cellData.elapsedTime || 0) }} 
                  ({{ tasksCount }} задач, {{ ticketsCount }} тикетов)
                </p>
              </div>
              
              <!-- Кнопка "Список задач" -->
              <div class="detail-actions" v-if="tasksCount > 0">
                <button class="btn btn-primary btn-tasks-list" @click="goToTasksList">
                  📋 Список задач
                </button>
              </div>
            </div>
          </div>
          
          <!-- Уровень 2: Список задач -->
          <div v-else-if="popupLevel === 2" key="level-2" class="tasks-list-level">
            <div class="tasks-list-header">
              <button class="btn-back" @click="goBack" aria-label="Назад">
                ← Назад
              </button>
              <h3 class="tasks-list-title">
                Список задач: {{ cellData.employee?.name || 'Сотрудник' }}, Неделя {{ cellData.week?.weekNumber || '?' }}
              </h3>
            </div>
            
            <div class="tasks-list-content">
              <!-- Состояние загрузки -->
              <Transition name="loading" mode="out-in">
                <div v-if="isLoadingTasks" key="loading" class="loading-state">
                  <div class="loading-spinner"></div>
                  <p>Загрузка задач...</p>
                </div>
                
                <!-- Состояние ошибки -->
                <div v-else-if="tasksError" key="error" class="error-state">
                  <div class="error-icon">⚠️</div>
                  <p class="error-title">Ошибка загрузки</p>
                  <p class="error-message">{{ tasksError }}</p>
                  <button class="btn btn-retry" @click="retryLoadTasks">Повторить</button>
                </div>
                
                <!-- Пустое состояние -->
                <div v-else-if="enrichedTasks.length === 0" key="empty" class="empty-state">
                  <div class="empty-state-icon">📋</div>
                  <p class="empty-state-message">Нет задач для отображения</p>
                </div>
                
                <!-- Список задач (карточки) -->
                <div v-else key="tasks" class="tasks-cards-container">
                  <TransitionGroup name="task-card" tag="div" class="tasks-cards-list">
                    <div
                      v-for="task in paginatedTasks.filter(validateTask)"
                      :key="task.id"
                      class="task-card"
                      :class="getTaskCardClass(task)"
                      @click="handleTaskClick(task)"
                    >
                      <div class="task-card__header">
                        <span class="task-card__number">Задача #{{ task.id }}</span>
                        <span v-if="task.elapsedTime" class="task-card__time">
                          {{ formatElapsedTime(task.elapsedTime) }}
                        </span>
                      </div>
                      
                      <div class="task-card__title">
                        {{ task.title || 'Без названия' }}
                      </div>
                      
                      <div class="task-card__dates">
                        <div class="task-card__date-item">
                          <span class="date-icon">📅</span>
                          <span class="date-label">Начало:</span>
                          <span class="date-value">{{ formatDate(task.startDate) }}</span>
                        </div>
                        
                        <div class="task-card__date-item">
                          <span class="date-icon">⏰</span>
                          <span class="date-label">Дедлайн:</span>
                          <span 
                            class="date-value"
                            :class="{ 'date-value--overdue': isOverdue(task.deadline, task.closedDate) }"
                          >
                            {{ formatDate(task.deadline) || '-' }}
                          </span>
                        </div>
                        
                        <div class="task-card__date-item">
                          <span class="date-icon">✓</span>
                          <span class="date-label">Завершено:</span>
                          <span class="date-value">{{ formatDate(task.closedDate) || '-' }}</span>
                        </div>
                      </div>
                      
                      <!-- Информация о тикете -->
                      <div v-if="task.ticket" class="task-card__ticket">
                        <div class="ticket-header">
                          <div class="ticket-header__left">
                            <span class="ticket-id">Тикет #{{ task.ticket.id }}</span>
                            <span 
                              v-if="task.ticket.createdWeek && task.ticket.createdWeek !== cellData.week?.weekNumber"
                              class="ticket-week-badge"
                              :title="`Тикет создан в неделе ${task.ticket.createdWeek}, трудозатрата записана в неделе ${cellData.week?.weekNumber}`"
                            >
                              Создан в нед. {{ task.ticket.createdWeek }}
                            </span>
                          </div>
                        </div>
                        
                        <div class="ticket-title">
                          {{ task.ticket.title || task.ticket.ufSubject || 'Без названия' }}
                        </div>
                        
                        <div class="ticket-meta">
                          <div class="ticket-meta__row">
                            <div class="ticket-meta__item">
                              <span class="meta-label">Сектор:</span>
                              <span class="meta-value">{{ task.ticket.ufSlaBlockStr || 'Не указан' }}</span>
                            </div>
                            
                            <div class="ticket-meta__item">
                              <span class="meta-label">Сервис:</span>
                              <span class="meta-value">{{ task.ticket.ufSlaServiceStr || 'Не указан' }}</span>
                            </div>
                          </div>
                          
                          <div class="ticket-meta__row">
                            <div class="ticket-meta__item">
                              <span class="meta-label">Действие:</span>
                              <span class="meta-value">{{ task.ticket.ufActionStr || 'Не указано' }}</span>
                            </div>
                            
                            <div class="ticket-meta__item">
                              <span class="meta-label">Приоритет:</span>
                              <span class="meta-value">{{ task.ticket.ufCrm7UfPriority || 'Не указан' }}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div class="ticket-dates">
                          <div class="ticket-date-item">
                            <span class="date-icon">📅</span>
                            <span class="date-label">Создан:</span>
                            <span class="date-value">{{ formatDate(task.ticket.createdTime) }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div v-else class="task-card__no-ticket">
                        <span class="no-ticket-label">Тикет не связан</span>
                      </div>
                      
                      <!-- Статус будет добавлен позже -->
                      <div class="task-card__status-placeholder">
                        <!-- Статус задачи будет отображаться здесь в следующих этапах -->
                      </div>
                    </div>
                  </TransitionGroup>
                  
                  <!-- Пагинация (если задач больше 10) -->
                  <div v-if="totalPages > 1" class="tasks-pagination">
                    <button 
                      class="pagination-btn"
                      :disabled="paginationMeta.currentPage === 1"
                      @click="goToPage(paginationMeta.currentPage - 1)"
                    >
                      ← Предыдущая
                    </button>
                    
                    <div class="pagination-pages">
                      <button
                        v-for="page in visiblePages"
                        :key="page"
                        class="pagination-page"
                        :class="{ 'pagination-page--active': page === paginationMeta.currentPage }"
                        @click="goToPage(page)"
                      >
                        {{ page }}
                      </button>
                    </div>
                    
                    <button 
                      class="pagination-btn"
                      :disabled="paginationMeta.currentPage === totalPages"
                      @click="goToPage(paginationMeta.currentPage + 1)"
                    >
                      Следующая →
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
          
          <!-- Попап по сотруднику -->
          <div v-else-if="popupLevel === 1 && cellData.type === 'employee'" key="employee" class="detail-employee">
            <div class="detail-info">
              <p><strong>Сотрудник:</strong> {{ cellData.employee?.name || 'Неизвестно' }}</p>
              <p><strong>Период:</strong> {{ formatPeriod(cellData.weeks) }}</p>
            </div>
            
            <div class="weeks-list">
              <h3>Трудозатраты по неделям:</h3>
              <div 
                v-for="weekData in cellData.weeks" 
                :key="weekData.week.weekNumber"
                class="week-item"
              >
                <div class="week-header">
                  <span class="week-label">Неделя {{ weekData.week.weekNumber }}</span>
                  <span class="week-time">{{ formatElapsedTime(weekData.elapsedTime || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Попап по неделе -->
          <div v-else-if="popupLevel === 1 && cellData.type === 'week'" key="week" class="detail-week">
            <div class="detail-info">
              <p><strong>Неделя:</strong> {{ cellData.week?.weekNumber || '?' }}</p>
              <p><strong>Период:</strong> {{ formatWeekPeriod(cellData.week) }}</p>
              <p><strong>Общие трудозатраты:</strong> {{ formatElapsedTime(cellData.week?.totalElapsedTime || 0) }}</p>
            </div>
            
            <div class="employees-list">
              <h3>Трудозатраты по сотрудникам:</h3>
              <div 
                v-for="employeeData in cellData.employees" 
                :key="employeeData.employee.id"
                class="employee-item"
              >
                <div class="employee-header">
                  <span class="employee-label">{{ employeeData.employee.name }}</span>
                  <span class="employee-time">{{ formatElapsedTime(employeeData.elapsedTime || 0) }}</span>
                </div>
              </div>
            </div>
          </div>
          </Transition>
        </div>
        
        <div class="modal-footer">
          <button class="close-btn" @click="close">Закрыть</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatElapsedTime, getWeekLabel } from '@/services/tickets-time-tracking/timeTrackingUtils.js';
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';

const props = defineProps({
  cellData: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);

// Состояния навигации
const popupLevel = ref(1); // 1 или 2
const enrichedTasks = ref([]); // Массив задач с детальной информацией
const isLoadingTasks = ref(false); // Состояние загрузки
const tasksError = ref(null); // Ошибка загрузки
const currentPage = ref(1); // Текущая страница пагинации
const perPage = ref(10); // Количество задач на страницу

const modalTitle = computed(() => {
  if (!props.cellData) return 'Детализация трудозатрат';
  
  if (popupLevel.value === 2) {
    return `Список задач: ${props.cellData.employee?.name || 'Сотрудник'}, Неделя ${props.cellData.week?.weekNumber || '?'}`;
  }
  
  if (props.cellData.type === 'employee') {
    return `Детализация: ${props.cellData.employee?.name || 'Сотрудник'}`;
  }
  
  if (props.cellData.type === 'week') {
    return `Детализация: Неделя ${props.cellData.week?.weekNumber || '?'}`;
  }
  
  // По умолчанию - попап по ячейке
  const employee = props.cellData.employee?.name || 'Сотрудник';
  const week = props.cellData.week?.weekNumber || '?';
  const time = formatElapsedTime(props.cellData.elapsedTime || 0);
  return `Детализация: ${employee}, Неделя ${week} (${time})`;
});

const tasksCount = computed(() => {
  if (!props.cellData?.week?.employees) return 0;
  const employee = props.cellData.week.employees.find(e => e.id === props.cellData.employee?.id);
  return employee?.tasksCount || 0;
});

const ticketsCount = computed(() => {
  if (!props.cellData?.week?.employees) return 0;
  const employee = props.cellData.week.employees.find(e => e.id === props.cellData.employee?.id);
  return employee?.ticketsCount || 0;
});

const currentWeek = computed(() => {
  return props.cellData?.week?.weekNumber || null;
});

// Метаданные пагинации с бэкенда
const paginationMeta = ref({
  totalTasks: 0,
  currentPage: 1,
  perPage: 10,
  totalPages: 0
});

// Computed свойства для пагинации
const totalPages = computed(() => paginationMeta.value.totalPages);

const paginatedTasks = computed(() => enrichedTasks.value);

const visiblePages = computed(() => {
  const pages = [];
  const maxVisible = 5; // Максимум видимых страниц
  let start = Math.max(1, paginationMeta.value.currentPage - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages.value, start + maxVisible - 1);
  
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1);
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  return pages;
});

const formatPeriod = (weeks) => {
  if (!weeks || weeks.length === 0) return 'Период не указан';
  if (weeks.length === 1) {
    return getWeekLabel(weeks[0].week.weekNumber, weeks[0].week.weekStartUtc);
  }
  const firstWeek = weeks[0].week;
  const lastWeek = weeks[weeks.length - 1].week;
  return `${getWeekLabel(firstWeek.weekNumber, firstWeek.weekStartUtc)} - ${getWeekLabel(lastWeek.weekNumber, lastWeek.weekStartUtc)}`;
};

const formatWeekPeriod = (week) => {
  if (!week) return 'Период не указан';
  return getWeekLabel(week.weekNumber, week.weekStartUtc);
};

/**
 * Форматирование даты с обработкой отсутствующих значений
 */
const formatDate = (dateString) => {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    
    // Проверка на валидную дату
    if (isNaN(date.getTime())) {
      return '-';
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    console.warn('[TimeTrackingDetailModal] Error formatting date:', dateString, e);
    return '-';
  }
};

/**
 * Проверка просроченности с обработкой отсутствующих значений
 */
const isOverdue = (deadline, closedDate) => {
  // Если задача уже завершена, не считаем просроченной
  if (closedDate) {
    try {
      const closed = new Date(closedDate);
      if (!isNaN(closed.getTime())) {
        return false;
      }
    } catch (e) {
      // Игнорируем ошибку парсинга
    }
  }
  
  if (!deadline) return false;
  
  try {
    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return false;
    }
    
    const now = new Date();
    return now > deadlineDate;
  } catch (e) {
    console.warn('[TimeTrackingDetailModal] Error checking overdue:', deadline, e);
    return false;
  }
};

/**
 * Получение класса карточки задачи для стилизации
 */
const getTaskCardClass = (task) => {
  const closedDate = task.closedDate ? new Date(task.closedDate) : null;
  const isOverdueTask = isOverdue(task.deadline, task.closedDate);
  
  return {
    'task-card--completed': !!closedDate,
    'task-card--overdue': isOverdueTask,
    'task-card--in-progress': !closedDate && !isOverdueTask
  };
};

/**
 * Переход на уровень 2 (список задач)
 */
const goToTasksList = async () => {
  popupLevel.value = 2;
  await loadTasksDetails();
};

/**
 * Возврат на уровень 1
 */
const goBack = () => {
  popupLevel.value = 1;
  enrichedTasks.value = [];
  tasksError.value = null;
  currentPage.value = 1; // Сброс пагинации
  paginationMeta.value = {
    totalTasks: 0,
    currentPage: 1,
    perPage: 10,
    totalPages: 0
  };
};

/**
 * Валидация данных задачи перед отображением
 */
const validateTask = (task) => {
  if (!task || typeof task !== 'object') {
    return false;
  }
  
  // Минимальные требования: должен быть ID
  if (!task.id || typeof task.id !== 'number') {
    console.warn('[TimeTrackingDetailModal] Invalid task (no ID):', task);
    return false;
  }
  
  return true;
};

/**
 * Загрузка детальной информации о задачах
 */
const loadTasksDetails = async () => {
  if (!props.cellData?.week?.employees || !props.cellData.employee) {
    tasksError.value = 'Недостаточно данных для загрузки задач';
    return;
  }
  
  isLoadingTasks.value = true;
  tasksError.value = null;
  
  try {
    const employee = props.cellData.week.employees.find(e => e.id === props.cellData.employee?.id);
    
    if (!employee) {
      enrichedTasks.value = [];
      return;
    }
    
    // Получить ID всех задач
    // Задачи теперь всегда массив объектов: [{id: 123, elapsedTime: 5.0, ticket: {...}}]
    let taskIds = [];
    
    if (Array.isArray(employee.tasks) && employee.tasks.length > 0) {
      taskIds = employee.tasks.map(task => {
        // Если задача - это объект с полем id
        if (typeof task === 'object' && task !== null && task.id) {
          return task.id;
        }
        // Если задача - это просто ID (число) - fallback для совместимости
        if (typeof task === 'number') {
          return task;
        }
        return null;
      }).filter(id => id !== null && id > 0);
    }
    
    if (taskIds.length === 0) {
      enrichedTasks.value = [];
      return;
    }
    
    // Загрузить детальную информацию о задачах через расширенный API endpoint
    const response = await timeTrackingService.getTasksDetails({
      taskIds: taskIds,
      employeeId: props.cellData.employee.id,
      weekNumber: props.cellData.week.weekNumber,
      page: currentPage.value,
      perPage: perPage.value
    });
    
    // Валидация ответа
    if (!response || !Array.isArray(response.tasks)) {
      console.error('[TimeTrackingDetailModal] Invalid response format:', response);
      tasksError.value = 'Некорректный формат данных от сервера';
      enrichedTasks.value = [];
      return;
    }
    
    // Фильтрация некорректных задач
    enrichedTasks.value = response.tasks.filter(validateTask);
    paginationMeta.value = response.pagination || {
      totalTasks: 0,
      currentPage: 1,
      perPage: perPage.value,
      totalPages: 0
    };
    
    // Синхронизируем currentPage с метаданными с бэкенда
    currentPage.value = paginationMeta.value.currentPage;
    
  } catch (err) {
    console.error('[TimeTrackingDetailModal] Error loading tasks details:', {
      error: err,
      taskIds: props.cellData?.week?.employees?.find(e => e.id === props.cellData.employee?.id)?.tasks?.map(t => t.id) || [],
      employeeId: props.cellData.employee?.id,
      weekNumber: props.cellData.week?.weekNumber,
      timestamp: new Date().toISOString()
    });
    
    // Определить тип ошибки
    const errorMessage = err.message || '';
    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
      tasksError.value = 'Ошибка сети. Проверьте подключение к интернету.';
    } else if (errorMessage.includes('timeout')) {
      tasksError.value = 'Превышено время ожидания. Попробуйте позже.';
    } else if (errorMessage.includes('403') || errorMessage.includes('401')) {
      tasksError.value = 'Ошибка доступа. Проверьте права доступа.';
    } else if (errorMessage.includes('404')) {
      tasksError.value = 'Данные не найдены.';
    } else if (errorMessage.includes('500')) {
      tasksError.value = 'Ошибка сервера. Попробуйте позже.';
    } else {
      tasksError.value = errorMessage || 'Ошибка загрузки задач';
    }
    
    enrichedTasks.value = [];
  } finally {
    isLoadingTasks.value = false;
  }
};

/**
 * Повторная загрузка задач
 */
const retryLoadTasks = () => {
  currentPage.value = 1; // Сброс на первую страницу
  loadTasksDetails();
};

// Перезагрузка при смене страницы
watch(currentPage, () => {
  if (popupLevel.value === 2) {
    loadTasksDetails();
  }
});

/**
 * Переход на страницу пагинации
 */
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value && page !== currentPage.value) {
    currentPage.value = page;
    // Прокрутка вверх списка задач
    const container = document.querySelector('.tasks-cards-container');
    if (container) {
      container.scrollTop = 0;
    }
    // Загрузка данных произойдёт автоматически через watch(currentPage)
  }
};

/**
 * Обработка клика на задачу
 * 
 * Примечание: Открытие задачи в Bitrix24 будет реализовано в следующих этапах.
 * Пока клик не обрабатывается или обрабатывается минимально.
 */
const handleTaskClick = (task) => {
  // TODO: Реализовать открытие задачи в Bitrix24 в следующих этапах
  // const taskUrl = `https://${window.location.hostname}/company/personal/user/${task.responsibleId}/tasks/task/view/${task.id}/`;
  // window.open(taskUrl, '_blank');
  
  console.log('[TimeTrackingDetailModal] Task clicked:', task.id);
};

const close = () => {
  emit('close');
};

// Сброс состояния при закрытии попапа
watch(() => props.cellData, (newValue) => {
  if (!newValue) {
    popupLevel.value = 1;
    enrichedTasks.value = [];
    tasksError.value = null;
    currentPage.value = 1;
    paginationMeta.value = {
      totalTasks: 0,
      currentPage: 1,
      perPage: 10,
      totalPages: 0
    };
  }
});
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 8px;
  padding: 0;
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #dee2e6;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: bold;
}

.close-button {
  background: none;
  border: none;
  font-size: 28px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.detail-info {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-info p {
  margin: 8px 0;
  font-size: 14px;
}

.tasks-list h3,
.weeks-list h3,
.employees-list h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: bold;
}

.task-item {
  margin-bottom: 15px;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #007bff;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-label {
  font-weight: bold;
  color: #333;
}

.task-time {
  font-weight: bold;
  color: #007bff;
}

.ticket-info {
  margin-top: 8px;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
}

.ticket-label {
  font-weight: 500;
  color: #28a745;
}

.ticket-week-badge {
  margin-left: 8px;
  padding: 2px 6px;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 3px;
  font-size: 11px;
}

.ticket-title {
  margin-top: 4px;
  font-style: italic;
  color: #555;
}

.ticket-info--no-ticket {
  color: #999;
}

.no-ticket-label {
  font-style: italic;
}

.detail-total {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 2px solid #dee2e6;
  font-size: 14px;
}

.week-item,
.employee-item {
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 4px;
}

.week-header,
.employee-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.week-label,
.employee-label {
  font-weight: 500;
  color: #333;
}

.week-time,
.employee-time {
  font-weight: bold;
  color: #007bff;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #dee2e6;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  padding: 8px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.close-btn:hover {
  background-color: #0056b3;
}

/* Кнопка "Список задач" */
.detail-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.btn-tasks-list {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tasks-list:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-tasks-list:active {
  transform: translateY(0);
}

/* Уровень 2: Список задач */
.tasks-list-level {
  width: 100%;
}

.tasks-list-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.btn-back {
  padding: 8px 16px;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.tasks-list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.tasks-list-content {
  width: 100%;
}

/* Карточки задач */
.tasks-cards-container {
  width: 100%;
}

.tasks-cards-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #d1d5db;
}

.task-card--overdue {
  border-left: 4px solid #dc2626;
  background-color: #fef2f2;
}

.task-card--completed {
  border-left: 4px solid #10b981;
  background-color: #f0fdf4;
}

.task-card--in-progress {
  border-left: 4px solid #f59e0b;
  background-color: #fffbeb;
}

.task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.task-card__number {
  font-weight: 600;
  font-size: 16px;
  color: #007bff;
}

.task-card__time {
  font-weight: 600;
  font-size: 14px;
  color: #059669;
  background-color: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
}

.task-card__title {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 16px;
  line-height: 1.5;
}

.task-card__dates {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-card__date-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.date-icon {
  font-size: 16px;
}

.date-label {
  color: #6b7280;
  min-width: 80px;
}

.date-value {
  color: #374151;
  font-weight: 500;
}

.date-value--overdue {
  color: #dc2626;
  font-weight: 600;
}

.task-card__status-placeholder {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
  min-height: 20px;
}

/* Блок тикета */
.task-card__ticket {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.ticket-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ticket-id {
  font-weight: bold;
  color: #3b82f6;
  font-size: 14px;
}

.ticket-week-badge {
  padding: 2px 8px;
  background-color: #fef3c7;
  color: #92400e;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

.ticket-title {
  font-size: 14px;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.4;
}

.ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.ticket-meta__row {
  display: flex;
  gap: 16px;
}

.ticket-meta__item {
  display: flex;
  gap: 4px;
  font-size: 12px;
}

.meta-label {
  color: #6b7280;
}

.meta-value {
  color: #1f2937;
  font-weight: 500;
}

.ticket-dates {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ticket-date-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.task-card__no-ticket {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
  color: #9ca3af;
  font-style: italic;
  font-size: 12px;
}

/* Пагинация */
.tasks-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 8px 16px;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background-color: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-page:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.pagination-page--active {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
}

.pagination-page--active:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}

/* Состояния загрузки, ошибки, пустое */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title,
.empty-state-message {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-retry {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background-color: #0056b3;
}

/* Transition анимации */
.level-enter-active,
.level-leave-active {
  transition: all 0.3s ease;
}

.level-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.level-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.loading-enter-active,
.loading-leave-active {
  transition: all 0.2s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}

.task-card-enter-active,
.task-card-leave-active {
  transition: all 0.3s ease;
}

.task-card-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.task-card-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .modal-header {
    padding: 15px;
  }
  
  .modal-header h2 {
    font-size: 18px;
  }
  
  .modal-body {
    padding: 15px;
  }
  
  .task-item {
    padding: 10px;
  }
  
  .task-card {
    padding: 12px;
  }
  
  .task-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .task-card__title {
    font-size: 14px;
  }
  
  .task-card__dates {
    gap: 6px;
  }
  
  .task-card__date-item {
    font-size: 13px;
  }
  
  .date-label {
    min-width: 70px;
    font-size: 12px;
  }
  
  .tasks-pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .pagination-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .pagination-page {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    font-size: 12px;
  }
}
</style>

