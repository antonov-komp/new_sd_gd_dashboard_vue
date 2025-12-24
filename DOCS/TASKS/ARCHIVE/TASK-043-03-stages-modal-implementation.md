# TASK-043-03: Реализация попапа «По стадиям» для новых тикетов

**Дата создания:** 2025-12-16 13:28 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 3 из TASK-043

## Цель этапа
Реализовать попап `StagesModal.vue`, который отображает новые тикеты, сгруппированные по стадиям, с возможностью перехода на уровень 2 для просмотра тикетов конкретной стадии.

## Контекст
- **Текущее состояние:** Нет попапа для отображения новых тикетов по стадиям
- **Требуется:** Создать попап `StagesModal.vue` с двумя уровнями:
  - Уровень 1: Список стадий с количеством тикетов
  - Уровень 2: Список тикетов выбранной стадии
- **Зависимости:** 
  - TASK-043-01: Разделение обработчиков кликов (должна быть выполнена)
  - TASK-043-02: Расширение API для новых тикетов по стадиям (должна быть выполнена)

## Задачи этапа

### 1) Создание компонента StagesModal
- Создать файл `vue-app/src/components/graph-admission-closure/StagesModal.vue`
- Реализовать структуру с двумя уровнями (аналогично `ResponsibleModal.vue`)
- Добавить состояния: `popupLevel`, `selectedStage`, `tickets`, `isLoadingTickets`

### 2) Реализация уровня 1: Список стадий
- Отобразить список из 6 стадий с количеством тикетов
- Визуальное оформление аналогично `ResponsibleModal` (список сотрудников)
- Добавить цветную левую границу для каждой стадии
- Добавить стрелку навигации для кликабельных стадий

### 3) Реализация уровня 2: Список тикетов стадии
- При клике на стадию переходить на уровень 2
- Загружать тикеты стадии из API (ленивая загрузка)
- Отображать тикеты через компонент `TicketCard`
- Добавить кнопку «Назад» для возврата на уровень 1

### 4) Интеграция с API
- Расширить `admissionClosureService.js` для поддержки `includeNewTicketsByStages`
- Реализовать функцию загрузки тикетов стадии
- Обработать состояния: загрузка, ошибка, пустое состояние

### 5) Интеграция компонента TicketCard
- Импортировать `TicketCard` из `@/components/dashboard/TicketCard.vue`
- Подготовить тикеты для отображения
- Реализовать обработку клика на тикет (открытие в Bitrix24)

## Технические требования

### Структура компонента

**Файл:** `vue-app/src/components/graph-admission-closure/StagesModal.vue`

```vue
<template>
  <div v-if="isVisible" class="modal-backdrop">
    <div class="modal">
      <Transition name="level" mode="out-in">
        <!-- Уровень 1: Список стадий -->
        <div v-if="popupLevel === 1" key="level-1" class="level-1">
          <header class="modal__header">
            <h3 class="modal__title">Новые тикеты по стадиям</h3>
            <button class="modal__close" @click="$emit('close')">✕</button>
          </header>
          
          <section class="modal__body">
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingStages" key="loading" class="loading-state">
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
        </div>
        
        <!-- Уровень 2: Список тикетов стадии -->
        <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
          <header class="modal__header">
            <button class="btn-back" @click="goBack">← Назад</button>
            <h3 class="modal__title">
              Тикеты стадии: {{ selectedStage?.stageName || 'Неизвестно' }}
            </h3>
            <button class="modal__close" @click="$emit('close')">✕</button>
          </header>
          
          <section class="modal__body">
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingTickets" key="loading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Загрузка тикетов...</p>
              </div>
              
              <div v-else-if="error" key="error" class="error-state">
                <div class="error-icon">⚠️</div>
                <p class="error-title">Ошибка загрузки</p>
                <p class="error-message">{{ error }}</p>
                <button class="btn btn-retry" @click="retryLoadTickets">Повторить</button>
              </div>
              
              <div v-else-if="tickets.length === 0" key="empty" class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-message">
                  На стадии «{{ selectedStage?.stageName }}» нет новых тикетов за выбранную неделю
                </p>
              </div>
              
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
```

### Расширение сервиса

**Файл:** `vue-app/src/services/graph-admission-closure/admissionClosureService.js`

```javascript
export async function fetchAdmissionClosureStats(params = {}) {
  const {
    endpoint = DEFAULT_ENDPOINT,
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    useCache = true,
    forceRefresh = false,
    includeTickets = false,
    includeNewTicketsByStages = false  // новый параметр
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    useCache,
    forceRefresh,
    includeTickets,
    includeNewTicketsByStages  // передать в API
  };

  // ... остальной код ...
}
```

## Ступенчатые подзадачи

1. **Создание компонента StagesModal**
   - Создать файл `StagesModal.vue`
   - Скопировать базовую структуру из `ResponsibleModal.vue`
   - Адаптировать под отображение стадий

2. **Реализация уровня 1: Список стадий**
   - Добавить состояние `stages` для хранения стадий
   - Реализовать загрузку стадий из API
   - Отобразить список стадий с визуальным оформлением
   - Добавить обработчик клика на стадию

3. **Реализация уровня 2: Список тикетов**
   - Добавить состояние `selectedStage` для выбранной стадии
   - Реализовать функцию `loadStageTickets(stageId)`
   - Отобразить тикеты через `TicketCard`
   - Добавить кнопку «Назад»

4. **Интеграция с API**
   - Расширить `admissionClosureService.js`
   - Реализовать загрузку стадий с `includeNewTicketsByStages: true`
   - Реализовать загрузку тикетов стадии с `includeTickets: true`

5. **Интеграция компонента TicketCard**
   - Импортировать `TicketCard`
   - Подготовить тикеты для отображения
   - Реализовать обработку клика на тикет

6. **Интеграция в дашборд**
   - В `GraphAdmissionClosureDashboard.vue` добавить `StagesModal`
   - Подключить обработчик `@open-stages`
   - Передать необходимые props

7. **Обработка ошибок и пустых данных**
   - Показать сообщение при отсутствии стадий
   - Показать сообщение при отсутствии тикетов стадии
   - Показать сообщение об ошибке с кнопкой «Повторить»

## Пример реализации функций

```javascript
// В StagesModal.vue
import { ref, computed, watch } from 'vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import TicketCard from '@/components/dashboard/TicketCard.vue';

const props = defineProps({
  isVisible: Boolean,
  stages: Array,  // newTicketsByStages из API
  weekStartUtc: String,
  weekEndUtc: String
});

const popupLevel = ref(1);
const selectedStage = ref(null);
const tickets = ref([]);
const isLoadingTickets = ref(false);
const isLoadingStages = ref(false);
const error = ref(null);

const hasData = computed(() => (props.stages || []).length > 0);

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
    
    // Подготовка тикетов для отображения
    tickets.value = stageTickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title || 'Без названия',
      ufSubject: ticket.title || 'Без названия',
      createdTime: ticket.createdTime,
      createdAt: ticket.createdTime,
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
    console.error('[StagesModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}

function goBack() {
  popupLevel.value = 1;
  selectedStage.value = null;
  tickets.value = [];
  error.value = null;
}

function handleTicketClick(ticket) {
  const url = getTicketIframeUrl(ticket.id);
  window.open(url, '_blank');
}

function retryLoadTickets() {
  if (selectedStage.value) {
    loadStageTickets(selectedStage.value.stageId);
  }
}

// Сброс состояния при закрытии попапа
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    popupLevel.value = 1;
    selectedStage.value = null;
    tickets.value = [];
    error.value = null;
  }
});
```

## Критерии приёмки этапа

- [ ] При клике на «Новые» открывается `StagesModal`
- [ ] В попапе отображаются все 6 стадий с количеством тикетов
- [ ] При клике на стадию открывается уровень 2 со списком тикетов
- [ ] Тикеты отображаются через компонент `TicketCard`
- [ ] Кнопка «Назад» возвращает на уровень 1
- [ ] Заголовок попапа обновляется: «Тикеты стадии: [Название]»
- [ ] При отсутствии тикетов показывается сообщение
- [ ] При ошибке загрузки показывается сообщение об ошибке с кнопкой «Повторить»
- [ ] При клике на тикет открывается детальная информация в Bitrix24
- [ ] Плавные переходы и ленивая загрузка работают (как в TASK-042-04)
- [ ] Визуальное оформление соответствует `ResponsibleModal`

## Дополнительные уточнения

### Визуальное оформление стадий
- Цветная левая граница (`border-left: 3px solid`) с цветом стадии
- Фон: `var(--b24-bg-light, #f3f4f6)`
- При hover: `transform: translateX(2px)`, `box-shadow`
- Стрелка навигации для стадий с `count > 0`

### Подготовка тикетов для TicketCard
- Если требуется дополнительная подготовка, использовать аналогичную логику из `ResponsibleModal`
- Убедиться, что формат тикета соответствует ожиданиям `TicketCard`

### Стилизация
- Использовать существующие стили из `ResponsibleModal.vue`
- Адаптировать под отображение стадий
- Добавить стили для цветной границы стадий

## История правок

- 2025-12-16 13:28 (UTC+3, Брест): Создан этап 3 задачи TASK-043

