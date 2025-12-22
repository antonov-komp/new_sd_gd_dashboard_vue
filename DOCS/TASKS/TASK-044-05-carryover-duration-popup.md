# TASK-044-05: Реализация попапа «По срокам» для переходящих тикетов

**Дата создания:** 2025-12-16 11:01 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 5 из TASK-044

## Цель этапа

Реализовать попап `CarryoverDurationModal.vue`, который отображает переходящие тикеты, сгруппированные по срокам (от даты периода), с возможностью перехода на уровень 2 для просмотра тикетов конкретной категории срока.

## Контекст

- **Текущее состояние:** Нет попапа для отображения переходящих тикетов по срокам
- **Требуется:** Создать попап `CarryoverDurationModal.vue` с двумя уровнями:
  - Уровень 1: Градация «По срокам» с количеством тикетов в каждой категории
  - Уровень 2: Список тикетов выбранной категории срока
- **Зависимости:** 
  - TASK-044-01: Реализация логики переходящих тикетов на бэкенде (должна быть выполнена)
  - TASK-044-02: Расширение API для возврата переходящих тикетов (должна быть выполнена)
  - TASK-044-03: Обновление графиков (должна быть выполнена)
  - TASK-044-04: Расширение API для градации по срокам (должна быть выполнена)

## Задачи этапа

### 1) Создание компонента CarryoverDurationModal
- Создать файл `vue-app/src/components/graph-admission-closure/CarryoverDurationModal.vue`
- Реализовать структуру с двумя уровнями (аналогично `StagesModal.vue` из TASK-043)
- Добавить состояния: `popupLevel`, `selectedDurationCategory`, `tickets`, `isLoadingTickets`

### 2) Реализация уровня 1: Градация по срокам
- Отобразить список из 6 категорий сроков с количеством тикетов
- Визуальное оформление аналогично `StagesModal` (список стадий)
- Добавить цветную левую границу для каждой категории (градиент от зелёного к красному)
- Добавить стрелку навигации для кликабельных категорий

### 3) Реализация уровня 2: Список тикетов категории
- При клике на категорию срока переходить на уровень 2
- Загружать тикеты категории из API (ленивая загрузка)
- Отображать тикеты через компонент `TicketCard`
- Добавить кнопку «Назад» для возврата на уровень 1

### 4) Интеграция с API
- Расширить `admissionClosureService.js` для поддержки `includeCarryoverTicketsByDuration`
- Реализовать функцию загрузки категорий сроков с `includeCarryoverTicketsByDuration: true`
- Реализовать функцию загрузки тикетов категории с `includeTickets: true`
- Обработать состояния: загрузка, ошибка, пустое состояние

### 5) Интеграция компонента TicketCard
- Импортировать `TicketCard` из `@/components/dashboard/TicketCard.vue`
- Подготовить тикеты для отображения
- Реализовать обработку клика на тикет (открытие в Bitrix24)

### 6) Интеграция в дашборд
- В `GraphAdmissionClosureDashboard.vue` добавить `CarryoverDurationModal`
- Подключить обработчик `@open-carryover` из TASK-044-03
- Передать необходимые props

## Технические требования

### Структура компонента

**Файл:** `vue-app/src/components/graph-admission-closure/CarryoverDurationModal.vue`

```vue
<template>
  <div v-if="isVisible" class="modal-backdrop">
    <div class="modal">
      <Transition name="level" mode="out-in">
        <!-- Уровень 1: Градация по срокам -->
        <div v-if="popupLevel === 1" key="level-1" class="level-1">
          <header class="modal__header">
            <h3 class="modal__title">Переходящие тикеты по срокам</h3>
            <button class="modal__close" @click="$emit('close')">✕</button>
          </header>
          
          <section class="modal__body">
            <Transition name="loading" mode="out-in">
              <div v-if="isLoadingCategories" key="loading" class="loading-state">
                <div class="loading-spinner"></div>
                <p>Загрузка категорий...</p>
              </div>
              
              <p v-else-if="!hasData" key="empty" class="modal__empty">
                Нет переходящих тикетов за выбранную неделю
              </p>
              
              <ul v-else key="list" class="duration-list">
                <li
                  v-for="category in durationCategories"
                  :key="category.durationCategory"
                  class="duration-list__item"
                  :class="{ 'duration-list__item--clickable': category.count > 0 }"
                  @click="(e) => handleCategoryClick(category, e)"
                  title="Кликните для просмотра тикетов категории"
                >
                  <span 
                    class="duration-list__color" 
                    :style="{ backgroundColor: category.color }"
                  ></span>
                  <span class="duration-list__name">{{ category.durationLabel }}</span>
                  <span class="duration-list__count">
                    {{ category.count }} тикетов
                  </span>
                  <span v-if="category.count > 0" class="duration-list__arrow">→</span>
                </li>
              </ul>
            </Transition>
          </section>
        </div>
        
        <!-- Уровень 2: Список тикетов категории -->
        <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
          <header class="modal__header">
            <button class="btn-back" @click="goBack">← Назад</button>
            <h3 class="modal__title">
              Тикеты: {{ selectedCategory?.durationLabel || 'Неизвестно' }}
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
                  В категории «{{ selectedCategory?.durationLabel }}» нет переходящих тикетов
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
    includeNewTicketsByStages = false,
    includeCarryoverTickets = true,
    includeCarryoverTicketsByDuration = false  // новый параметр
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    useCache,
    forceRefresh,
    includeTickets,
    includeNewTicketsByStages,
    includeCarryoverTickets,
    includeCarryoverTicketsByDuration  // передать в API
  };

  // ... остальной код ...
}
```

## Ступенчатые подзадачи

1. **Создание компонента CarryoverDurationModal**
   - Создать файл `CarryoverDurationModal.vue`
   - Скопировать базовую структуру из `StagesModal.vue` (TASK-043-03)
   - Адаптировать под отображение категорий сроков

2. **Реализация уровня 1: Градация по срокам**
   - Добавить состояние `durationCategories` для хранения категорий
   - Реализовать загрузку категорий из API
   - Отобразить список категорий с визуальным оформлением
   - Добавить обработчик клика на категорию

3. **Реализация уровня 2: Список тикетов**
   - Добавить состояние `selectedCategory` для выбранной категории
   - Реализовать функцию `loadCategoryTickets(durationCategory)`
   - Отобразить тикеты через `TicketCard`
   - Добавить кнопку «Назад»

4. **Интеграция с API**
   - Расширить `admissionClosureService.js`
   - Реализовать загрузку категорий с `includeCarryoverTicketsByDuration: true`
   - Реализовать загрузку тикетов категории с `includeTickets: true`

5. **Интеграция компонента TicketCard**
   - Импортировать `TicketCard`
   - Подготовить тикеты для отображения
   - Реализовать обработку клика на тикет

6. **Интеграция в дашборд**
   - В `GraphAdmissionClosureDashboard.vue` добавить `CarryoverDurationModal`
   - Подключить обработчик `@open-carryover`
   - Передать необходимые props

7. **Обработка ошибок и пустых данных**
   - Показать сообщение при отсутствии категорий
   - Показать сообщение при отсутствии тикетов категории
   - Показать сообщение об ошибке с кнопкой «Повторить»

## Пример реализации функций

```javascript
// В CarryoverDurationModal.vue
import { ref, computed, watch } from 'vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import TicketCard from '@/components/dashboard/TicketCard.vue';

const props = defineProps({
  isVisible: Boolean,
  durationCategories: Array,  // carryoverTicketsByDuration из API
  weekStartUtc: String,
  weekEndUtc: String
});

const popupLevel = ref(1);
const selectedCategory = ref(null);
const tickets = ref([]);
const isLoadingTickets = ref(false);
const isLoadingCategories = ref(false);
const error = ref(null);

const hasData = computed(() => (props.durationCategories || []).length > 0);

/**
 * Обработка клика на категорию срока
 * Переход на уровень 2 и загрузка тикетов
 */
async function handleCategoryClick(category, event = null) {
  if (!category || category.count === 0) {
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
  
  selectedCategory.value = category;
  popupLevel.value = 2;
  await loadCategoryTickets(category.durationCategory);
}

/**
 * Загрузка тикетов категории срока из API
 */
async function loadCategoryTickets(durationCategory) {
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
      includeCarryoverTickets: true,
      includeCarryoverTicketsByDuration: true,
      includeTickets: true
    });
    
    const category = response.data.carryoverTicketsByDuration?.find(
      c => c.durationCategory === durationCategory
    );
    const categoryTickets = category?.tickets || [];
    
    // Подготовка тикетов для отображения
    tickets.value = categoryTickets.map(ticket => ({
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
    console.error('[CarryoverDurationModal] Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}

function goBack() {
  popupLevel.value = 1;
  selectedCategory.value = null;
  tickets.value = [];
  error.value = null;
}

function handleTicketClick(ticket) {
  const url = getTicketIframeUrl(ticket.id);
  window.open(url, '_blank');
}

function retryLoadTickets() {
  if (selectedCategory.value) {
    loadCategoryTickets(selectedCategory.value.durationCategory);
  }
}

// Сброс состояния при закрытии попапа
watch(() => props.isVisible, (newValue) => {
  if (!newValue) {
    popupLevel.value = 1;
    selectedCategory.value = null;
    tickets.value = [];
    error.value = null;
  }
});
```

## Критерии приёмки этапа

- [x] При клике на «Переходящие» открывается `CarryoverDurationModal`
- [x] В попапе отображается градация «По срокам» с 6 категориями:
  - [x] До 1 месяца (0-13 дней)
  - [x] Менее 1 месяца (14-29 дней)
  - [x] Более 1 месяца (30-59 дней)
  - [x] Более 2 месяцев (60-179 дней)
  - [x] Более полугода (180-364 дня)
  - [x] Более года (≥365 дней)
- [x] Каждая категория отображается с количеством тикетов
- [x] При клике на категорию открывается уровень 2 со списком тикетов
- [x] Тикеты отображаются через компонент `TicketCard`
- [x] Кнопка «Назад» возвращает на уровень 1
- [x] Заголовок попапа обновляется: «Тикеты: [Название категории]»
- [x] При отсутствии тикетов показывается сообщение
- [x] При ошибке загрузки показывается сообщение об ошибке с кнопкой «Повторить»
- [x] При клике на тикет открывается детальная информация в Bitrix24
- [x] Плавные переходы и ленивая загрузка работают (как в TASK-042-04)
- [x] Визуальное оформление соответствует `StagesModal` и `ResponsibleModal`
- [x] Цвета категорий соответствуют градиенту (от зелёного к красному)

## Дополнительные уточнения

### Визуальное оформление категорий сроков

- Цветная левая граница (`border-left: 3px solid`) с цветом категории
- Фон: `var(--b24-bg-light, #f3f4f6)`
- При hover: `transform: translateX(2px)`, `box-shadow`
- Стрелка навигации для категорий с `count > 0`
- Градиент цветов: зелёный → жёлтый → оранжевый → красный → тёмно-красный

### Подготовка тикетов для TicketCard

- Если требуется дополнительная подготовка, использовать аналогичную логику из `StagesModal`
- Убедиться, что формат тикета соответствует ожиданиям `TicketCard`

### Стилизация

- Использовать существующие стили из `StagesModal.vue` и `ResponsibleModal.vue`
- Адаптировать под отображение категорий сроков
- Добавить стили для цветной границы категорий

### Категории сроков

**Все 6 категорий должны отображаться, даже если count = 0:**
- До 1 месяца (0-13 дней) — зелёный `#28a745`
- Менее 1 месяца (14-29 дней) — светло-зелёный `#6cbd45`
- Более 1 месяца (30-59 дней) — жёлтый `#ffc107`
- Более 2 месяцев (60-179 дней) — оранжевый `#ff9800`
- Более полугода (180-364 дня) — красный `#dc3545`
- Более года (≥365 дней) — тёмно-красный `#c82333`

## История правок

- 2025-12-16 11:01 (UTC+3, Брест): Создан этап 5 задачи TASK-044
- 2025-12-16 18:30 (UTC+3, Брест): Реализован попап «По срокам» для переходящих тикетов
  - Создан компонент `CarryoverDurationModal.vue` на основе `StagesModal.vue`
  - Реализован уровень 1: градация по срокам с 6 категориями и количеством тикетов
  - Реализован уровень 2: список тикетов выбранной категории через `TicketCard`
  - Добавлена навигация между уровнями (кнопка «Назад»)
  - Интегрирован с API для загрузки категорий и тикетов
  - Добавлены стили и анимации (stagger для карточек тикетов)
  - Обновлён сервис для поддержки `includeCarryoverTicketsByDuration`
  - Интегрирован в дашборд `GraphAdmissionClosureDashboard.vue`
  - Используется `prepareTicketsForDisplay()` для обогащения данных тикетов
- 2025-12-16 18:50 (UTC+3, Брест): Добавлена 6-я категория «До 1 месяца»
  - Разделена первая категория на две: «До 1 месяца» (0-13 дней) и «Менее 1 месяца» (14-29 дней)
  - Обновлён компонент для отображения всех 6 категорий

