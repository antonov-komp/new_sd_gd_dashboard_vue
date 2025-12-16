<template>
  <div
    v-if="isVisible"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal">
      <!-- Transition для плавной анимации между уровнями -->
      <Transition name="level" mode="out-in">
        <!-- Уровень 1: Список сотрудников -->
        <div v-if="popupLevel === 1" key="level-1" class="level-1">
          <header class="modal__header">
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
        
        <!-- Уровень 2: Список тикетов -->
        <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
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
  weekStartUtc: {
    type: String,
    default: null
  },
  weekEndUtc: {
    type: String,
    default: null
  }
});

const popupLevel = ref(1);
const selectedEmployee = ref(null);
const tickets = ref([]);
const isLoadingTickets = ref(false);
const error = ref(null);
const enrichedResponsible = ref([]);
const isLoadingNames = ref(false);

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
    return responsible.map(r => {
      if (r.id && nameMap.has(r.id)) {
        return {
          ...r,
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

// Загрузить имена при изменении responsible
watch(() => props.responsible, async (newResponsible) => {
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
}, { immediate: true });

const hasData = computed(() => (enrichedResponsible.value || []).length > 0);

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
 * Загрузка тикетов сотрудника из API
 * 
 * @param {number} employeeId - ID сотрудника
 */
async function loadEmployeeTickets(employeeId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    if (!props.weekStartUtc || !props.weekEndUtc) {
      throw new Error('Не указаны границы недели');
    }
    
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeTickets: true
    });
    
    const employee = response.data.responsible.find(r => r.id === employeeId);
    const employeeTickets = employee?.tickets || [];
    
    // Подготовка тикетов для отображения в TicketCard
    tickets.value = employeeTickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title || 'Без названия',
      ufSubject: ticket.title || 'Без названия',
      createdTime: ticket.createdTime,
      createdAt: ticket.createdTime,
      updatedTime: ticket.movedTime,
      modifiedAt: ticket.movedTime,
      stageId: ticket.stageId,
      assignedById: ticket.assignedById,
      priorityId: 'medium',
      priorityLabel: 'Средний',
      priorityColors: {
        color: '#ffc107',
        backgroundColor: '#fff3cd',
        textColor: '#856404'
      },
      priority: 'medium'
    }));
    
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
 * Возврат на уровень 1
 */
function goBack() {
  popupLevel.value = 1;
  selectedEmployee.value = null;
  tickets.value = [];
  error.value = null;
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
 */
function retryLoadTickets() {
  if (selectedEmployee.value) {
    loadEmployeeTickets(selectedEmployee.value.id);
  }
}

// Сброс состояния при закрытии попапа
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    popupLevel.value = 1;
    selectedEmployee.value = null;
    tickets.value = [];
    error.value = null;
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
</style>

