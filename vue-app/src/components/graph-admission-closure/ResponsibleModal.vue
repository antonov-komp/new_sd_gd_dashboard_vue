<template>
  <div
    v-if="isVisible"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal">
      <!-- TASK-047: Система вкладок -->
      <div class="modal__tabs" v-if="popupLevel === 0">
        <button
          :class="['modal__tab', { 'modal__tab--active': activeTab === 'categories' }]"
          @click="handleTabChange('categories')"
        >
          По категориям
        </button>
        <button
          :class="['modal__tab', { 'modal__tab--active': activeTab === 'employees' }]"
          @click="handleTabChange('employees')"
        >
          По сотрудникам
        </button>
      </div>
      
      <!-- Transition для плавной анимации между уровнями -->
      <Transition name="level" mode="out-in">
        <!-- Вкладка "По категориям": Уровень 0 -->
        <div v-if="activeTab === 'categories' && popupLevel === 0" key="level-0-categories" class="level-0">
          <header class="modal__header">
            <h3 class="modal__title">
              Закрытые за неделю<span v-if="weekNumber"> · Неделя {{ weekNumber }}</span>
            </h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>
          
          <section class="modal__body">
            <ul class="categories-list">
              <li
                v-for="category in categories"
                :key="category.id"
                class="categories-list__item"
                :class="{ 'categories-list__item--clickable': category.count > 0 }"
                @click="handleCategoryClick(category)"
              >
                <div class="category-item">
                  <div class="category-item__icon">
                    <span v-if="category.id === 'created-this-week'">✓</span>
                    <span v-else>↻</span>
                  </div>
                  <div class="category-item__content">
                    <div class="category-item__label">{{ category.label }}</div>
                    <div class="category-item__count">{{ category.count }} тикетов</div>
                  </div>
                  <span v-if="category.count > 0" class="category-item__arrow">→</span>
                </div>
              </li>
            </ul>
          </section>
          
          <footer class="modal__footer">
            <button class="btn" @click="$emit('close')">Закрыть</button>
          </footer>
        </div>
        
        <!-- Вкладка "По категориям": Уровень 1 -->
        <div v-else-if="activeTab === 'categories' && popupLevel === 1" key="level-1-categories" class="level-1">
          <header class="modal__header">
            <button class="btn-back" @click="goBack" aria-label="Назад">← Назад</button>
            <h3 class="modal__title">Ответственные за неделю</h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>

          <section class="modal__body">
            <!-- Transition для состояний загрузки -->
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingNames" key="loading" class="loading-names">
                <div class="loading-spinner"></div>
                <p>Загрузка имён сотрудников...</p>
              </div>
              
              <p v-else-if="!hasData" key="empty" class="modal__empty">Нет данных по ответственным</p>

              <ul v-else key="list" class="responsible-list">
                <li
                  v-for="person in enrichedResponsible"
                  :key="person.id || person.name"
                  class="responsible-list__item"
                  :class="{ 'responsible-list__item--clickable': person.id && person.count > 0 }"
                  @click="(e) => handleEmployeeClick(person, e)"
                  title="Кликните для просмотра тикетов сотрудника"
                >
                  <span class="responsible-list__name">{{ person.name || 'Не назначен' }}</span>
                  <span class="responsible-list__count">
                    {{ person.count ?? 0 }} тикетов
                  </span>
                  <span v-if="person.id && person.count > 0" class="responsible-list__arrow">→</span>
                </li>
              </ul>
            </Transition>
          </section>

          <footer class="modal__footer">
            <button class="btn" @click="$emit('close')">Закрыть</button>
          </footer>
        </div>
        
        <!-- Вкладка "По категориям": Уровень 2 -->
        <div v-else-if="activeTab === 'categories' && popupLevel === 2" key="level-2-categories" class="level-2">
          <header class="modal__header">
            <button class="btn-back" @click="goBack" aria-label="Назад">← Назад</button>
            <h3 class="modal__title">Тикеты сотрудника: {{ selectedEmployee?.name || 'Неизвестно' }}</h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>
          
          <section class="modal__body">
            <!-- Transition для состояний загрузки, ошибки, пустого состояния и списка -->
            <Transition name="loading" mode="out-in">
              <!-- Индикатор загрузки -->
              <div v-if="isLoadingTickets" key="loading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Загрузка тикетов...</p>
              </div>
              
              <!-- Состояние ошибки -->
              <div v-else-if="error" key="error" class="error-state">
                <div class="error-icon">⚠️</div>
                <p class="error-title">Ошибка загрузки</p>
                <p class="error-message">{{ error }}</p>
                <button class="btn btn-retry" @click="retryLoadTickets">Повторить</button>
              </div>
              
              <!-- Пустое состояние -->
              <div v-else-if="tickets.length === 0" key="empty" class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-message">У сотрудника нет закрытых тикетов за выбранную неделю</p>
              </div>
              
              <!-- Список тикетов с TransitionGroup для stagger-анимации -->
              <div v-else key="tickets" class="tickets-list-container">
                <TransitionGroup name="ticket" tag="div" class="tickets-list">
                  <TicketCard
                    v-for="(ticket, index) in tickets"
                    :key="ticket.id"
                    :ticket="ticket"
                    :draggable="false"
                    :style="{ '--ticket-index': index }"
                    @click="handleTicketClick"
                  />
                </TransitionGroup>
              </div>
            </Transition>
          </section>
        </div>
        
        <!-- Вкладка "По сотрудникам": Уровень 0 -->
        <div v-else-if="activeTab === 'employees' && popupLevel === 0" key="level-0-employees" class="level-0">
          <header class="modal__header">
            <h3 class="modal__title">
              Закрытые за неделю<span v-if="weekNumber"> · Неделя {{ weekNumber }}</span>
            </h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>
          
          <section class="modal__body">
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingNames" key="loading" class="loading-names">
                <div class="loading-spinner"></div>
                <p>Загрузка имён сотрудников...</p>
              </div>
              
              <p v-else-if="!hasEmployeesData" key="empty" class="modal__empty">Нет данных по сотрудникам</p>

              <ul v-else key="list" class="responsible-list">
                <li
                  v-for="person in enrichedEmployeesList"
                  :key="person.id || person.name"
                  class="responsible-list__item"
                  :class="{ 'responsible-list__item--clickable': person.id && person.totalCount > 0 }"
                  @click="(e) => handleEmployeeFromListClick(person, e)"
                  title="Кликните для просмотра градации тикетов сотрудника"
                >
                  <span class="responsible-list__name">{{ person.name || 'Не назначен' }}</span>
                  <span class="responsible-list__count">
                    {{ person.totalCount ?? 0 }} тикетов
                  </span>
                  <span v-if="person.id && person.totalCount > 0" class="responsible-list__arrow">→</span>
                </li>
              </ul>
            </Transition>
          </section>
          
          <footer class="modal__footer">
            <button class="btn" @click="$emit('close')">Закрыть</button>
          </footer>
        </div>
        
        <!-- Вкладка "По сотрудникам": Уровень 1 (Градация) -->
        <div v-else-if="activeTab === 'employees' && popupLevel === 1" key="level-1-employees" class="level-1">
          <header class="modal__header">
            <button class="btn-back" @click="goBack" aria-label="Назад">← Назад</button>
            <h3 class="modal__title">Тикеты сотрудника: {{ selectedEmployee?.name || 'Неизвестно' }}</h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>
          
          <section class="modal__body">
            <ul class="categories-list">
              <li
                v-for="gradation in employeeGradations"
                :key="gradation.id"
                class="categories-list__item"
                :class="{ 'categories-list__item--clickable': gradation.count > 0 }"
                @click="handleGradationClick(gradation)"
              >
                <div class="category-item">
                  <div class="category-item__icon">
                    <span v-if="gradation.id === 'this-week'">✓</span>
                    <span v-else>↻</span>
                  </div>
                  <div class="category-item__content">
                    <div class="category-item__label">{{ gradation.label }}</div>
                    <div class="category-item__count">{{ gradation.count }} тикетов</div>
                  </div>
                  <span v-if="gradation.count > 0" class="category-item__arrow">→</span>
                </div>
              </li>
            </ul>
          </section>
          
          <footer class="modal__footer">
            <button class="btn" @click="$emit('close')">Закрыть</button>
          </footer>
        </div>
        
        <!-- Вкладка "По сотрудникам": Уровень 2 (Тикеты) -->
        <div v-else-if="activeTab === 'employees' && popupLevel === 2" key="level-2-employees" class="level-2">
          <header class="modal__header">
            <button class="btn-back" @click="goBack" aria-label="Назад">← Назад</button>
            <h3 class="modal__title">
              Тикеты сотрудника: {{ selectedEmployee?.name || 'Неизвестно' }} 
              ({{ selectedGradation?.label || '' }})
            </h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>
          
          <section class="modal__body">
            <!-- Transition для состояний загрузки, ошибки, пустого состояния и списка -->
            <Transition name="loading" mode="out-in">
              <!-- Индикатор загрузки -->
              <div v-if="isLoadingTickets" key="loading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Загрузка тикетов...</p>
              </div>
              
              <!-- Состояние ошибки -->
              <div v-else-if="error" key="error" class="error-state">
                <div class="error-icon">⚠️</div>
                <p class="error-title">Ошибка загрузки</p>
                <p class="error-message">{{ error }}</p>
                <button class="btn btn-retry" @click="retryLoadTickets">Повторить</button>
              </div>
              
              <!-- Пустое состояние -->
              <div v-else-if="tickets.length === 0" key="empty" class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-message">
                  {{ activeTab === 'employees' 
                    ? `У сотрудника нет тикетов в категории "${selectedGradation?.label || ''}"` 
                    : 'У сотрудника нет закрытых тикетов за выбранную неделю' }}
                </p>
              </div>
              
              <!-- Список тикетов с TransitionGroup для stagger-анимации -->
              <div v-else key="tickets" class="tickets-list-container">
                <TransitionGroup name="ticket" tag="div" class="tickets-list">
                  <TicketCard
                    v-for="(ticket, index) in tickets"
                    :key="ticket.id"
                    :ticket="ticket"
                    :draggable="false"
                    :style="{ '--ticket-index': index }"
                    @click="handleTicketClick"
                  />
                </TransitionGroup>
              </div>
            </Transition>
          </section>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import TicketCard from '@/components/dashboard/TicketCard.vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  responsible: {
    type: Array,
    default: () => []
  },
  closedTicketsCreatedThisWeek: {
    type: Number,
    default: 0
  },
  closedTicketsCreatedOtherWeek: {
    type: Number,
    default: 0
  },
  responsibleCreatedThisWeek: {
    type: Array,
    default: () => []
  },
  responsibleCreatedOtherWeek: {
    type: Array,
    default: () => []
  },
  weekNumber: {
    type: Number,
    default: null
  },
  weekStartUtc: {
    type: String,
    default: null
  },
  weekEndUtc: {
    type: String,
    default: null
  }
});

const popupLevel = ref(0); // TASK-047: Начинаем с уровня 0
const activeTab = ref('categories'); // TASK-047: Активная вкладка ('categories' или 'employees')
const selectedCategory = ref(null); // TASK-047: Выбранная категория (для вкладки "По категориям")
const selectedEmployee = ref(null);
const selectedGradation = ref(null); // TASK-047: Выбранная градация (для вкладки "По сотрудникам")
const tickets = ref([]);
const isLoadingTickets = ref(false);
const error = ref(null);
const enrichedResponsible = ref([]); // Для вкладки "По категориям"
const enrichedEmployeesList = ref([]); // TASK-047: Для вкладки "По сотрудникам" (объединённый список)
const isLoadingNames = ref(false);

// TASK-047: Категории закрытых тикетов (для вкладки "По категориям")
const categories = computed(() => [
  {
    id: 'created-this-week',
    label: 'Тикеты закрытые этой неделью и созданные этой неделью',
    count: props.closedTicketsCreatedThisWeek ?? 0,
    responsible: props.responsibleCreatedThisWeek ?? []
  },
  {
    id: 'created-other-week',
    label: 'Тикеты закрытые этой неделью и созданные ранее',
    count: props.closedTicketsCreatedOtherWeek ?? 0,
    responsible: props.responsibleCreatedOtherWeek ?? []
  }
]);

// TASK-047: Объединённый список всех сотрудников (для вкладки "По сотрудникам")
const employeesList = computed(() => {
  const map = new Map();
  
  // Добавляем сотрудников из категории "созданные этой неделей"
  (props.responsibleCreatedThisWeek || []).forEach(emp => {
    const key = emp.id ?? 'unassigned';
    if (!map.has(key)) {
      map.set(key, {
        id: emp.id,
        name: emp.name,
        thisWeekCount: 0,
        otherWeekCount: 0,
        totalCount: 0,
        thisWeekTickets: [],
        otherWeekTickets: []
      });
    }
    const existing = map.get(key);
    existing.thisWeekCount = emp.count ?? 0;
    // Сохраняем тикеты, если они есть в ответе API
    existing.thisWeekTickets = emp.tickets || [];
    existing.totalCount += existing.thisWeekCount;
  });
  
  // Добавляем сотрудников из категории "созданные ранее"
  (props.responsibleCreatedOtherWeek || []).forEach(emp => {
    const key = emp.id ?? 'unassigned';
    if (!map.has(key)) {
      map.set(key, {
        id: emp.id,
        name: emp.name,
        thisWeekCount: 0,
        otherWeekCount: 0,
        totalCount: 0,
        thisWeekTickets: [],
        otherWeekTickets: []
      });
    }
    const existing = map.get(key);
    existing.otherWeekCount = emp.count ?? 0;
    // Сохраняем тикеты, если они есть в ответе API
    existing.otherWeekTickets = emp.tickets || [];
    existing.totalCount += existing.otherWeekCount;
  });
  
  return Array.from(map.values());
});

// TASK-047: Градация тикетов выбранного сотрудника
const employeeGradations = computed(() => {
  if (!selectedEmployee.value) {
    return [];
  }
  
  // Получаем тикеты из выбранного сотрудника
  const thisWeekTickets = selectedEmployee.value.thisWeekTickets || [];
  const otherWeekTickets = selectedEmployee.value.otherWeekTickets || [];
  
  console.log('[ResponsibleModal] Computing gradations for employee:', {
    id: selectedEmployee.value.id,
    name: selectedEmployee.value.name,
    thisWeekCount: selectedEmployee.value.thisWeekCount,
    otherWeekCount: selectedEmployee.value.otherWeekCount,
    thisWeekTickets: thisWeekTickets.length,
    otherWeekTickets: otherWeekTickets.length,
    employee: selectedEmployee.value
  });
  
  return [
    {
      id: 'this-week',
      label: 'На этой неделе',
      count: selectedEmployee.value.thisWeekCount ?? 0,
      tickets: thisWeekTickets,
      employeeId: selectedEmployee.value.id
    },
    {
      id: 'other-week',
      label: 'На другой неделе',
      count: selectedEmployee.value.otherWeekCount ?? 0,
      tickets: otherWeekTickets,
      employeeId: selectedEmployee.value.id
    }
  ];
});

const hasEmployeesData = computed(() => (enrichedEmployeesList.value || []).length > 0);

/**
 * Обогащение данных сотрудников полными именами через Bitrix24 API
 * 
 * Метод Bitrix24: user.get
 * Документация: https://context7.com/bitrix24/rest/user.get
 * 
 * @param {Array} responsible - Массив сотрудников с ID и count
 * @returns {Promise<Array>} Обогащённый массив с полными именами
 */
async function enrichResponsibleWithNames(responsible) {
  // Извлечь ID сотрудников (исключить null)
  const employeeIds = responsible
    .filter(r => r.id !== null && r.id !== undefined)
    .map(r => r.id);
  
  if (employeeIds.length === 0) {
    return responsible; // Нет сотрудников для загрузки
  }
  
  try {
    // Загрузить имена через Bitrix24 API
    const employees = await DashboardSector1CService.getEmployeesByIds(employeeIds);
    
    // Создать маппинг ID -> имя
    const nameMap = new Map();
    employees.forEach(emp => {
      nameMap.set(emp.id, emp.name); // Формат: "Имя Фамилия"
    });
    
    // Обогатить данные именами
    // TASK-047: Сохраняем все свойства, включая тикеты (thisWeekTickets, otherWeekTickets)
    return responsible.map(r => {
      if (r.id && nameMap.has(r.id)) {
        return {
          ...r, // Сохраняем все свойства, включая тикеты
          name: nameMap.get(r.id) // Заменить "ID 1006" на "Иванов Иван"
        };
      }
      return r; // Оставить как есть (например, "Не назначен")
    });
  } catch (error) {
    console.error('[ResponsibleModal] Error enriching names:', error);
    // При ошибке возвращаем исходные данные
    return responsible;
  }
}

// Загрузить имена при изменении responsible (только для обратной совместимости)
// TASK-047: Этот watch больше не используется, так как попап открывается на уровне 0
// Оставлен для обратной совместимости, но не будет срабатывать при нормальной работе
// TASK-047: Загрузить объединённый список сотрудников для вкладки "По сотрудникам"
watch([() => activeTab.value, () => employeesList.value], async ([newTab, newList]) => {
  if (newTab !== 'employees' || popupLevel.value !== 0) {
    return;
  }
  
  if (!newList || newList.length === 0) {
    enrichedEmployeesList.value = [];
    return;
  }
  
  isLoadingNames.value = true;
  try {
    enrichedEmployeesList.value = await enrichResponsibleWithNames(newList);
  } catch (error) {
    console.error('[ResponsibleModal] Error loading employee names:', error);
    // Fallback: использовать исходные данные
    enrichedEmployeesList.value = newList;
  } finally {
    isLoadingNames.value = false;
  }
}, { immediate: true });

// Загрузить имена при изменении responsible (для вкладки "По категориям")
watch(() => props.responsible, async (newResponsible) => {
  // Не обновлять, если выбрана категория (уровень 1 или 2) или активна вкладка "По сотрудникам"
  if (popupLevel.value !== 0 || selectedCategory.value || activeTab.value !== 'categories') {
    return;
  }
  
  if (!newResponsible || newResponsible.length === 0) {
    enrichedResponsible.value = [];
    return;
  }
  
  isLoadingNames.value = true;
  try {
    enrichedResponsible.value = await enrichResponsibleWithNames(newResponsible);
  } catch (error) {
    console.error('[ResponsibleModal] Error loading employee names:', error);
    // Fallback: использовать исходные данные
    enrichedResponsible.value = newResponsible;
  } finally {
    isLoadingNames.value = false;
  }
}, { immediate: false }); // TASK-047: immediate: false, так как попап открывается на уровне 0

const hasData = computed(() => (enrichedResponsible.value || []).length > 0);

/**
 * TASK-047: Обработка переключения вкладок
 * Сброс состояния при переключении
 * 
 * @param {string} tab - Название вкладки ('categories' или 'employees')
 */
function handleTabChange(tab) {
  if (activeTab.value === tab) {
    return; // Уже на этой вкладке
  }
  
  activeTab.value = tab;
  popupLevel.value = 0;
  selectedCategory.value = null;
  selectedEmployee.value = null;
  selectedGradation.value = null;
  tickets.value = [];
  error.value = null;
  enrichedResponsible.value = [];
  enrichedEmployeesList.value = [];
}

/**
 * TASK-047: Обработка клика на категорию (вкладка "По категориям")
 * Переход на уровень 1 и загрузка сотрудников выбранной категории
 * 
 * @param {Object} category - Объект категории
 */
async function handleCategoryClick(category) {
  if (!category || category.count === 0) {
    return;
  }
  
  selectedCategory.value = category;
  popupLevel.value = 1;
  
  // Обогатить именами сотрудников выбранной категории
  isLoadingNames.value = true;
  try {
    enrichedResponsible.value = await enrichResponsibleWithNames(category.responsible);
  } catch (error) {
    console.error('[ResponsibleModal] Error loading employee names:', error);
    // Fallback: использовать исходные данные
    enrichedResponsible.value = category.responsible;
  } finally {
    isLoadingNames.value = false;
  }
}

/**
 * TASK-047: Обработка клика на сотрудника из объединённого списка (вкладка "По сотрудникам")
 * Переход на уровень 1 с градацией тикетов сотрудника
 * 
 * @param {Object} employee - Объект сотрудника
 * @param {Event} event - Событие клика
 */
async function handleEmployeeFromListClick(employee, event = null) {
  if (!employee || !employee.id || employee.totalCount === 0) {
    return;
  }
  
  // Визуальная обратная связь при клике
  if (event && event.currentTarget) {
    event.currentTarget.style.transform = 'scale(0.98)';
    setTimeout(() => {
      if (event.currentTarget) {
        event.currentTarget.style.transform = '';
      }
    }, 150);
  }
  
  console.log('[ResponsibleModal] Employee selected from list:', {
    id: employee.id,
    name: employee.name,
    thisWeekCount: employee.thisWeekCount,
    otherWeekCount: employee.otherWeekCount,
    thisWeekTickets: employee.thisWeekTickets?.length || 0,
    otherWeekTickets: employee.otherWeekTickets?.length || 0,
    employee: employee
  });
  
  // Сохраняем сотрудника со всеми данными, включая тикеты
  selectedEmployee.value = {
    ...employee,
    // Убеждаемся, что тикеты сохранены
    thisWeekTickets: employee.thisWeekTickets || [],
    otherWeekTickets: employee.otherWeekTickets || []
  };
  
  popupLevel.value = 1;
}

/**
 * TASK-047: Обработка клика на градацию (вкладка "По сотрудникам")
 * Переход на уровень 2 и загрузка тикетов выбранной градации
 * 
 * @param {Object} gradation - Объект градации
 */
async function handleGradationClick(gradation) {
  if (!gradation || gradation.count === 0) {
    return;
  }
  
  selectedGradation.value = gradation;
  popupLevel.value = 2;
  
  // Загрузка тикетов из выбранной градации
  // Если тикеты уже есть в градации, используем их, иначе загружаем через API
  const gradationTickets = gradation.tickets || [];
  
  console.log('[ResponsibleModal] Gradation clicked:', {
    id: gradation.id,
    label: gradation.label,
    count: gradation.count,
    ticketsInGradation: gradationTickets.length,
    selectedEmployee: selectedEmployee.value?.id
  });
  
  if (gradationTickets.length > 0) {
    // Тикеты есть в градации, используем их
    console.log('[ResponsibleModal] Loading tickets from gradation:', gradationTickets.length);
    await loadGradationTickets(gradationTickets);
  } else {
    // Тикеты не были включены в ответ API, загружаем их через API
    console.log('[ResponsibleModal] Tickets not in gradation, loading from API');
    await loadGradationTicketsFromAPI(gradation);
  }
}

/**
 * TASK-047: Загрузка тикетов из градации
 * 
 * @param {Array} gradationTickets - Массив тикетов из градации
 */
async function loadGradationTickets(gradationTickets) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    // Использовать prepareTicketsForDisplay() для полного обогащения данных
    try {
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(
        gradationTickets,
        null, // snapshot (недоступен в модуле «График приёма и закрытий»)
        null  // ticketDetails (будет загружен автоматически через API)
      );
    } catch (prepareError) {
      console.error('[ResponsibleModal] Error preparing tickets:', prepareError);
      // Fallback: использовать исходные тикеты без дополнительной подготовки
      tickets.value = gradationTickets;
    }
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[ResponsibleModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}

/**
 * TASK-047: Загрузка тикетов градации через API
 * Используется, если тикеты не были включены в первоначальный ответ
 * 
 * @param {Object} gradation - Объект градации с информацией о типе (this-week/other-week)
 */
async function loadGradationTicketsFromAPI(gradation) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    if (!props.weekStartUtc || !props.weekEndUtc || !selectedEmployee.value) {
      throw new Error('Не указаны границы недели или выбранный сотрудник');
    }
    
    // Загружаем данные с включёнными тикетами
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeTickets: true
    });
    
    // Определяем, из какой категории брать тикеты
    const categoryData = gradation.id === 'this-week'
      ? response.data.responsibleCreatedThisWeek
      : response.data.responsibleCreatedOtherWeek;
    
    // Находим сотрудника в нужной категории
    const employee = categoryData?.find(r => r.id === selectedEmployee.value.id);
    const employeeTickets = employee?.tickets || [];
    
    // Использовать prepareTicketsForDisplay() для полного обогащения данных
    try {
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(
        employeeTickets,
        null, // snapshot (недоступен в модуле «График приёма и закрытий»)
        null  // ticketDetails (будет загружен автоматически через API)
      );
    } catch (prepareError) {
      console.error('[ResponsibleModal] Error preparing tickets:', prepareError);
      // Fallback: использовать исходные тикеты без дополнительной подготовки
      tickets.value = employeeTickets;
    }
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[ResponsibleModal] Error loading tickets from API:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}

/**
 * Обработка клика на сотрудника
 * Переход на уровень 2 и загрузка тикетов
 * 
 * @param {Object} employee - Объект сотрудника
 * @param {Event} event - Событие клика (для визуальной обратной связи)
 */
async function handleEmployeeClick(employee, event = null) {
  if (!employee || !employee.id || employee.count === 0) {
    return;
  }
  
  // Визуальная обратная связь при клике
  if (event && event.currentTarget) {
    event.currentTarget.style.transform = 'scale(0.98)';
    setTimeout(() => {
      if (event.currentTarget) {
        event.currentTarget.style.transform = '';
      }
    }, 150);
  }
  
  selectedEmployee.value = employee;
  // Переход на уровень 2 происходит сразу для плавной анимации
  popupLevel.value = 2;
  // Загрузка тикетов происходит после перехода (ленивая загрузка)
  await loadEmployeeTickets(employee.id);
}

/**
 * Загрузка тикетов сотрудника из выбранной категории
 * TASK-047: Используем данные из selectedCategory вместо общего списка
 * 
 * @param {number} employeeId - ID сотрудника
 */
async function loadEmployeeTickets(employeeId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    // TASK-047: Используем данные из выбранной категории, если они доступны
    let employeeTickets = [];
    
    if (selectedCategory.value && selectedCategory.value.responsible) {
      // Ищем сотрудника в выбранной категории
      const employee = selectedCategory.value.responsible.find(r => r.id === employeeId);
      employeeTickets = employee?.tickets || [];
    }
    
    // Если тикеты не найдены в категории, загружаем через API (fallback)
    if (employeeTickets.length === 0 && props.weekStartUtc && props.weekEndUtc) {
      const response = await fetchAdmissionClosureStats({
        product: '1C',
        weekStartUtc: props.weekStartUtc,
        weekEndUtc: props.weekEndUtc,
        includeTickets: true
      });
      
      // Ищем в соответствующей категории из ответа API
      const categoryData = selectedCategory.value?.id === 'created-this-week'
        ? response.data.responsibleCreatedThisWeek
        : response.data.responsibleCreatedOtherWeek;
      
      const employee = categoryData?.find(r => r.id === employeeId);
      employeeTickets = employee?.tickets || [];
    }
    
    // Использовать prepareTicketsForDisplay() для полного обогащения данных
    // Функция автоматически загружает недостающие данные через API:
    // - departmentHead (отдел заказчика)
    // - ufSubject (полное название)
    // - actionStr (действие)
    // - description (описание)
    // - правильные приоритеты и сервисы с цветами
    // Документация: см. vue-app/src/utils/graph-state/ticketListUtils.js
    try {
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(
        employeeTickets,
        null, // snapshot (недоступен в модуле «График приёма и закрытий»)
        null  // ticketDetails (будет загружен автоматически через API)
      );
    } catch (prepareError) {
      console.error('[ResponsibleModal] Error preparing tickets:', prepareError);
      // Fallback: использовать исходные тикеты без дополнительной подготовки
      // Это гарантирует, что попап не сломается при ошибке обогащения данных
      tickets.value = employeeTickets;
    }
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[ResponsibleModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}

/**
 * Возврат на предыдущий уровень
 * TASK-047: Поддержка возврата для обеих вкладок
 */
function goBack() {
  if (popupLevel.value === 2) {
    // Возврат с уровня 2 на уровень 1
    popupLevel.value = 1;
    if (activeTab.value === 'categories') {
      selectedEmployee.value = null;
    } else {
      selectedGradation.value = null;
    }
    tickets.value = [];
    error.value = null;
  } else if (popupLevel.value === 1) {
    // Возврат с уровня 1 на уровень 0
    popupLevel.value = 0;
    if (activeTab.value === 'categories') {
      selectedCategory.value = null;
      enrichedResponsible.value = [];
    } else {
      selectedEmployee.value = null;
    }
  }
}

/**
 * Обработка клика на тикет
 * Открытие детальной информации в Bitrix24
 */
function handleTicketClick(ticket) {
  const url = getTicketIframeUrl(ticket.id);
  window.open(url, '_blank');
}

/**
 * Повторная загрузка тикетов при ошибке
 * TASK-047: Поддержка обеих вкладок
 */
function retryLoadTickets() {
  if (activeTab.value === 'employees' && selectedGradation.value) {
    // Для вкладки "По сотрудникам" загружаем тикеты из градации
    loadGradationTickets(selectedGradation.value.tickets);
  } else if (activeTab.value === 'categories' && selectedEmployee.value) {
    // Для вкладки "По категориям" загружаем тикеты сотрудника
    loadEmployeeTickets(selectedEmployee.value.id);
  }
}

// Сброс состояния при закрытии попапа
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    popupLevel.value = 0; // TASK-047: Сбрасываем на уровень 0
    activeTab.value = 'categories'; // Сбрасываем на вкладку "По категориям"
    selectedCategory.value = null;
    selectedEmployee.value = null;
    selectedGradation.value = null;
    tickets.value = [];
    error.value = null;
    enrichedResponsible.value = [];
    enrichedEmployeesList.value = [];
  }
});

// Функция getInitials больше не используется, так как убрали аватар
// Оставлена для возможного использования в будущем
function getInitials(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal {
  background: var(--b24-bg-white, #fff);
  border-radius: var(--radius-lg, 12px);
  width: min(520px, 90vw);
  box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
}

/* TASK-047: Стили для вкладок */
.modal__tabs {
  display: flex;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
  padding: 0 20px;
  gap: 0;
}

.modal__tab {
  padding: 12px 20px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  transition: all 0.2s ease;
  position: relative;
  bottom: -1px;
}

.modal__tab:hover {
  color: var(--b24-text-primary, #111827);
  background: var(--b24-bg, #f9fafb);
}

.modal__tab--active {
  color: var(--b24-primary, #007bff);
  border-bottom-color: var(--b24-primary, #007bff);
  font-weight: 600;
}

.modal__tab--active:hover {
  color: var(--b24-primary, #007bff);
  background: transparent;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
}

.modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--b24-text-primary, #1f2937);
}

.modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
}

.modal__body {
  padding: 16px 20px;
}

.modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 16px;
  border-radius: var(--radius-md, 8px);
  background: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #fff);
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.responsible-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.responsible-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid var(--b24-primary, #007bff);
  transition: all 0.2s ease;
  position: relative;
}

.responsible-list__name {
  min-width: 150px;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-primary, #1f2937);
}

.responsible-list__count {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
  text-align: right;
  margin-left: auto;
}

.responsible-list__arrow {
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
  opacity: 0.6;
  transition: all 0.2s ease;
  margin-left: auto;
}

.modal__empty {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--b24-bg-light, #f5f7fb);
  color: var(--b24-text-secondary, #6b7280);
}

.loading-names {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--b24-text-secondary, #6b7280);
  font-size: 14px;
}

.loading-names .loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--b24-border-light, #e5e7eb);
  border-top-color: var(--b24-primary, #007bff);
  border-right-color: var(--b24-primary, #007bff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

.loading-names p {
  margin: 0;
  font-weight: 500;
}

.responsible-list__item--clickable {
  cursor: pointer;
}

.responsible-list__item--clickable:hover {
  background-color: var(--b24-bg, #f9fafb);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.responsible-list__item--clickable:hover .responsible-list__arrow {
  opacity: 1;
  color: var(--b24-primary, #007bff);
  transform: translateX(4px);
}

.btn-back {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--b24-primary, #007bff);
  padding: 4px 8px;
  margin-right: 12px;
  font-weight: 600;
}

.btn-back:hover {
  color: var(--b24-primary-hover, #0056b3);
}

.modal__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  min-height: 200px;
  text-align: center;
}

.loading-state .loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--b24-border-light, #e5e7eb);
  border-top-color: var(--b24-primary, #007bff);
  border-right-color: var(--b24-primary, #007bff);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 16px;
}

.loading-state p {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  min-height: 200px;
  text-align: center;
}

.error-state .error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state .error-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--b24-danger, #dc3545);
}

.error-state .error-message {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--b24-text-secondary, #6b7280);
  max-width: 400px;
}

.btn-retry {
  margin-top: 12px;
  background: var(--b24-primary, #007bff);
}

.btn-retry:hover {
  background: var(--b24-primary-hover, #0056b3);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  min-height: 200px;
  text-align: center;
}

.empty-state .empty-state-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state .empty-state-message {
  margin: 0;
  font-size: 14px;
  color: var(--b24-text-secondary, #6b7280);
  max-width: 400px;
  line-height: 1.5;
}

/* Стили для уровня 2 (список тикетов) */
.level-2 .modal__body {
  padding: 0; /* Убираем padding, так как он будет в .tickets-list */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Предотвращаем прокрутку всего modal-body */
}

.tickets-list-container {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0; /* Убираем padding, так как он будет в .tickets-list */
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: var(--b24-border-medium, #d1d5db) var(--b24-bg-light, #f3f4f6);
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  will-change: scroll-position;
  transform: translateZ(0);
}

.tickets-list-container::-webkit-scrollbar {
  width: 8px;
}

.tickets-list-container::-webkit-scrollbar-track {
  background: var(--b24-bg-light, #f3f4f6);
  border-radius: 4px;
}

.tickets-list-container::-webkit-scrollbar-thumb {
  background: var(--b24-border-medium, #d1d5db);
  border-radius: 4px;
  transition: background 0.2s ease;
}

.tickets-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--b24-text-secondary, #6b7280);
}

.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
}

.tickets-list .ticket-card {
  transition: transform 0.1s ease, opacity 0.1s ease, box-shadow 0.2s ease;
}

.tickets-list .ticket-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.tickets-list .ticket-card:active {
  transform: scale(0.98);
  opacity: 0.8;
}

/* Анимация вращения для спиннера */
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
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

/* Анимации для состояний загрузки, пустого состояния и списка */
.loading-enter-active,
.loading-leave-active {
  transition: opacity 0.3s ease;
}

.loading-enter-from,
.loading-leave-to {
  opacity: 0;
}

.loading-enter-to,
.loading-leave-from {
  opacity: 1;
}

/* Анимация появления карточек тикетов с stagger-эффектом */
.ticket-enter-active {
  transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transition-delay: calc(var(--ticket-index, 0) * 50ms);
  will-change: opacity, transform;
}

.ticket-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.ticket-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
  will-change: auto;
}

.ticket-leave-active {
  transition: all 0.3s ease-in;
}

.ticket-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.ticket-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.ticket-move {
  transition: transform 0.3s ease;
}

/* Адаптивность для мобильных устройств */
@media (max-width: 768px) {
  .responsible-list__item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .responsible-list__name {
    min-width: auto;
    width: 100%;
  }

  .responsible-list__count {
    min-width: auto;
    text-align: left;
    width: 100%;
    margin-left: 0;
  }

  .responsible-list__arrow {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
  }

  .responsible-list__item--clickable:hover .responsible-list__arrow {
    transform: translateY(-50%) translateX(4px);
  }
}

/* TASK-047: Стили для уровня 0 (категории) */
.categories-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.categories-list__item {
  display: flex;
  align-items: center;
  transition: all 0.2s ease;
}

.categories-list__item--clickable {
  cursor: pointer;
}

.categories-list__item--clickable:hover {
  transform: translateX(2px);
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 8px);
  border-left: 3px solid var(--b24-primary, #007bff);
  width: 100%;
  transition: all 0.2s ease;
}

.categories-list__item--clickable:hover .category-item {
  background-color: var(--b24-bg, #f9fafb);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left-color: var(--b24-primary-hover, #0056b3);
}

.category-item__icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.categories-list__item:first-child .category-item__icon {
  color: var(--b24-success, #28a745);
}

.categories-list__item:last-child .category-item__icon {
  color: var(--b24-warning, #ffc107);
}

.category-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item__label {
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-primary, #1f2937);
  line-height: 1.4;
}

.category-item__count {
  font-size: 13px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
}

.category-item__arrow {
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
  opacity: 0.6;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.categories-list__item--clickable:hover .category-item__arrow {
  opacity: 1;
  color: var(--b24-primary, #007bff);
  transform: translateX(4px);
}
</style>

