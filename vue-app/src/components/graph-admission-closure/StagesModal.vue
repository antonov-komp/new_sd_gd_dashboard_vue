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
        <!-- Уровень 1: Список стадий -->
        <div v-if="popupLevel === 1" key="level-1" class="level-1">
          <header class="modal__header">
            <h3 class="modal__title">Новые тикеты по стадиям</h3>
            <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
              ✕
            </button>
          </header>

          <section class="modal__body">
            <!-- Transition для состояний загрузки -->
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingStages" key="loading" class="loading-names">
                <div class="loading-spinner"></div>
                <p>Загрузка стадий...</p>
              </div>
              
              <p v-else-if="!hasData" key="empty" class="modal__empty">
                Нет новых тикетов за выбранную неделю
              </p>

              <ul v-else key="list" class="stages-list">
                <li
                  v-for="stage in stages"
                  :key="stage.stageId"
                  class="stages-list__item"
                  :class="{ 'stages-list__item--clickable': stage.count > 0 }"
                  :style="{ '--stage-color': stage.color }"
                  @click="(e) => handleStageClick(stage, e)"
                  title="Кликните для просмотра тикетов стадии"
                >
                  <span class="stages-list__color" :style="{ backgroundColor: stage.color }"></span>
                  <span class="stages-list__name">{{ stage.stageName }}</span>
                  <span class="stages-list__count">
                    {{ stage.count }} тикетов
                  </span>
                  <span v-if="stage.count > 0" class="stages-list__arrow">→</span>
                </li>
              </ul>
            </Transition>
          </section>

          <footer class="modal__footer">
            <button class="btn" @click="$emit('close')">Закрыть</button>
          </footer>
        </div>
        
        <!-- Уровень 2: Список тикетов стадии -->
        <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
          <header class="modal__header">
            <button class="btn-back" @click="goBack" aria-label="Назад">← Назад</button>
            <h3 class="modal__title">
              Тикеты стадии: {{ selectedStage?.stageName || 'Неизвестно' }}
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
                  На стадии «{{ selectedStage?.stageName }}» нет новых тикетов за выбранную неделю
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
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import TicketCard from '@/components/dashboard/TicketCard.vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
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

const emit = defineEmits(['close']);

const popupLevel = ref(1);
const selectedStage = ref(null);
const tickets = ref([]);
const isLoadingTickets = ref(false);
const isLoadingStages = ref(false);
const error = ref(null);
const stages = ref([]);

/**
 * Проверка наличия данных
 */
const hasData = computed(() => {
  return stages.value.length > 0 && stages.value.some(s => s.count > 0);
});

/**
 * Загрузка стадий из API
 */
async function loadStages() {
  if (!props.weekStartUtc || !props.weekEndUtc) {
    stages.value = [];
    return;
  }

  isLoadingStages.value = true;
  error.value = null;

  try {
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeNewTicketsByStages: true
    });

    stages.value = response.data.newTicketsByStages || [];
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки стадий';
    console.error('[StagesModal] Error loading stages:', err);
    stages.value = [];
  } finally {
    isLoadingStages.value = false;
  }
}

/**
 * Обработка клика на стадию
 * Переход на уровень 2 и загрузка тикетов
 */
async function handleStageClick(stage, event = null) {
  if (!stage || stage.count === 0) {
    return;
  }
  
  // Визуальная обратная связь
  if (event && event.currentTarget) {
    event.currentTarget.style.transform = 'scale(0.98)';
    setTimeout(() => {
      if (event.currentTarget) {
        event.currentTarget.style.transform = '';
      }
    }, 150);
  }
  
  selectedStage.value = stage;
  popupLevel.value = 2;
  await loadStageTickets(stage.stageId);
}

/**
 * Загрузка тикетов стадии из API
 */
async function loadStageTickets(stageId) {
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
      includeNewTicketsByStages: true,
      includeTickets: true
    });
    
    const stage = response.data.newTicketsByStages?.find(s => s.stageId === stageId);
    const stageTickets = stage?.tickets || [];
    
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
        stageTickets,
        null, // snapshot (недоступен в модуле «График приёма и закрытий»)
        null  // ticketDetails (будет загружен автоматически через API)
      );
    } catch (prepareError) {
      console.error('[StagesModal] Error preparing tickets:', prepareError);
      // Fallback: использовать исходные тикеты без дополнительной подготовки
      // Это гарантирует, что попап не сломается при ошибке обогащения данных
      tickets.value = stageTickets;
    }
    
    if (tickets.value.length === 0) {
      error.value = null; // Не ошибка, просто нет тикетов
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[StagesModal] Error loading tickets:', err);
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
  selectedStage.value = null;
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
  if (selectedStage.value) {
    loadStageTickets(selectedStage.value.stageId);
  }
}

// Загрузка стадий при открытии попапа
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadStages();
  } else {
    // Сброс состояния при закрытии попапа
    popupLevel.value = 1;
    selectedStage.value = null;
    tickets.value = [];
    error.value = null;
    stages.value = [];
  }
});

// Загрузка стадий при изменении недели
watch([() => props.weekStartUtc, () => props.weekEndUtc], () => {
  if (props.isVisible) {
    loadStages();
  }
});
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
  gap: 12px;
}

.modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--b24-text-primary, #1f2937);
  flex: 1;
}

.modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
  padding: 4px;
  line-height: 1;
}

.modal__close:hover {
  color: var(--b24-text-primary, #1f2937);
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
  transition: background 0.2s ease;
}

.btn:hover {
  background: var(--b24-primary-hover, #0056b3);
}

.stages-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stages-list__item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-md, 6px);
  border-left: 3px solid var(--stage-color, #007bff);
  transition: all 0.2s ease;
  position: relative;
}

.stages-list__color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.stages-list__name {
  min-width: 150px;
  font-size: 14px;
  font-weight: 500;
  color: var(--b24-text-primary, #1f2937);
  flex: 1;
}

.stages-list__count {
  min-width: 120px;
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-text-secondary, #6b7280);
  text-align: right;
}

.stages-list__arrow {
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
  text-align: center;
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

.stages-list__item--clickable {
  cursor: pointer;
}

.stages-list__item--clickable:hover {
  background-color: var(--b24-bg, #f9fafb);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stages-list__item--clickable:hover .stages-list__arrow {
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
  transition: color 0.2s ease;
}

.btn-back:hover {
  color: var(--b24-primary-hover, #0056b3);
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
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tickets-list-container {
  width: 100%;
  max-height: 60vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
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
  .stages-list__item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .stages-list__name {
    min-width: auto;
    width: 100%;
  }

  .stages-list__count {
    min-width: auto;
    text-align: left;
    width: 100%;
  }

  .stages-list__arrow {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
  }

  .stages-list__item--clickable:hover .stages-list__arrow {
    transform: translateY(-50%) translateX(4px);
  }
}
</style>

