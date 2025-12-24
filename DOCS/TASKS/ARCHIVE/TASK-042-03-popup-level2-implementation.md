# TASK-042-03: Реализация попапа второго уровня со списком тикетов

**Дата создания:** 2025-12-15 21:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 3 из TASK-042

## Цель этапа
Реализовать попап второго уровня в `ResponsibleModal.vue`, который отображает список тикетов выбранного сотрудника при клике на него в попапе первого уровня.

## Контекст
- **Текущее состояние:** Попап первого уровня показывает список сотрудников с количеством тикетов, но при клике ничего не происходит
- **Требуется:** При клике на сотрудника открывать попап второго уровня со списком его тикетов
- **Зависимости:** 
  - TASK-042-01: Загрузка имён сотрудников (должна быть выполнена)
  - TASK-042-02: Расширение API для тикетов (должна быть выполнена)

## Задачи этапа

### 1) Модификация ResponsibleModal для поддержки двух уровней
- Добавить состояние `popupLevel` (1 или 2)
- Добавить состояние `selectedEmployee` для хранения выбранного сотрудника
- Добавить состояние `tickets` для хранения тикетов сотрудника
- Добавить состояние `isLoadingTickets` для индикации загрузки

### 2) Реализация обработчика клика на сотрудника
- Добавить `@click` на `.responsible-list__item`
- Реализовать функцию `handleEmployeeClick(employee)`
- При клике переходить на уровень 2 и загружать тикеты

### 3) Загрузка тикетов сотрудника
- Расширить `admissionClosureService.js` для поддержки `includeTickets`
- Реализовать функцию загрузки тикетов из API
- Обработать состояния загрузки и ошибок

### 4) Отображение попапа второго уровня
- Добавить условный рендеринг для уровня 2
- Добавить кнопку "Назад" для возврата на уровень 1
- Обновить заголовок: "Тикеты сотрудника: [Имя]"
- Отобразить список тикетов через компонент `TicketCard`

### 5) Интеграция компонента TicketCard
- Импортировать `TicketCard` из `@/components/dashboard/TicketCard.vue`
- Подготовить тикеты для отображения (если требуется)
- Реализовать обработку клика на тикет (открытие в Bitrix24)

## Технические требования

### Структура компонента

**Файл:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

```vue
<template>
  <div v-if="isVisible" class="modal-backdrop">
    <div class="modal">
      <!-- Уровень 1: Список сотрудников -->
      <div v-if="popupLevel === 1">
        <header class="modal__header">
          <h3 class="modal__title">Ответственные за неделю</h3>
          <button class="modal__close" @click="$emit('close')">✕</button>
        </header>
        
        <section class="modal__body">
          <ul class="responsible-list">
            <li
              v-for="person in enrichedResponsible"
              :key="person.id || person.name"
              class="responsible-list__item"
              @click="handleEmployeeClick(person)"
            >
              <div class="responsible-list__name">
                <span class="responsible-list__avatar">
                  {{ getInitials(person.name) }}
                </span>
                <span>{{ person.name || 'Не назначен' }}</span>
              </div>
              <div class="responsible-list__count">
                {{ person.count ?? 0 }}
              </div>
            </li>
          </ul>
        </section>
      </div>
      
      <!-- Уровень 2: Список тикетов -->
      <div v-else-if="popupLevel === 2">
        <header class="modal__header">
          <button class="btn-back" @click="goBack">← Назад</button>
          <h3 class="modal__title">Тикеты сотрудника: {{ selectedEmployee?.name || 'Неизвестно' }}</h3>
          <button class="modal__close" @click="$emit('close')">✕</button>
        </header>
        
        <section class="modal__body">
          <div v-if="isLoadingTickets" class="loading-state">
            Загрузка тикетов...
          </div>
          
          <div v-else-if="error" class="error-state">
            <p>{{ error }}</p>
            <button @click="retryLoadTickets">Повторить</button>
          </div>
          
          <div v-else-if="tickets.length === 0" class="empty-state">
            <p>У сотрудника нет закрытых тикетов за выбранную неделю</p>
          </div>
          
          <div v-else class="tickets-list">
            <TicketCard
              v-for="ticket in tickets"
              :key="ticket.id"
              :ticket="ticket"
              :draggable="false"
              @click="handleTicketClick(ticket)"
            />
          </div>
        </section>
      </div>
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
    includeTickets = false  // новый параметр
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    useCache,
    forceRefresh,
    includeTickets  // передать в API
  };

  // ... остальной код ...
}
```

## Ступенчатые подзадачи

1. **Добавление состояний в компонент**
   - Добавить `popupLevel = ref(1)`
   - Добавить `selectedEmployee = ref(null)`
   - Добавить `tickets = ref([])`
   - Добавить `isLoadingTickets = ref(false)`
   - Добавить `error = ref(null)`

2. **Реализация обработчика клика**
   - Реализовать `handleEmployeeClick(employee)`
   - Сохранить выбранного сотрудника в `selectedEmployee`
   - Перейти на уровень 2: `popupLevel.value = 2`
   - Вызвать функцию загрузки тикетов

3. **Реализация загрузки тикетов**
   - Расширить `admissionClosureService.js` для поддержки `includeTickets`
   - Реализовать `loadEmployeeTickets(employeeId, weekStartUtc, weekEndUtc)`
   - Обработать состояния загрузки и ошибок

4. **Отображение попапа второго уровня**
   - Добавить условный рендеринг `v-if="popupLevel === 2"`
   - Добавить кнопку "Назад" с функцией `goBack()`
   - Обновить заголовок с именем сотрудника
   - Отобразить список тикетов

5. **Интеграция TicketCard**
   - Импортировать `TicketCard` из `@/components/dashboard/TicketCard.vue`
   - Подготовить тикеты для отображения (если требуется)
   - Реализовать `handleTicketClick(ticket)` для открытия в Bitrix24

6. **Обработка ошибок и пустых данных**
   - Показать сообщение при отсутствии тикетов
   - Показать сообщение об ошибке с кнопкой "Повторить"
   - Реализовать функцию `retryLoadTickets()`

7. **Интеграция с дашбордом**
   - Обновить `GraphAdmissionClosureDashboard.vue` для передачи `weekStartUtc` и `weekEndUtc` в `ResponsibleModal`
   - Убедиться, что данные недели доступны в попапе

## Пример реализации функций

```javascript
// В ResponsibleModal.vue
import { ref } from 'vue';
import TicketCard from '@/components/dashboard/TicketCard.vue';
import { fetchAdmissionClosureStats } from '@/services/graph-admission-closure/admissionClosureService.js';
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';

const popupLevel = ref(1);
const selectedEmployee = ref(null);
const tickets = ref([]);
const isLoadingTickets = ref(false);
const error = ref(null);

// Получить weekStartUtc и weekEndUtc из props или из дашборда
const props = defineProps({
  isVisible: Boolean,
  responsible: Array,
  weekStartUtc: String,  // новый prop
  weekEndUtc: String     // новый prop
});

async function handleEmployeeClick(employee) {
  if (!employee || !employee.id) {
    return;
  }
  
  selectedEmployee.value = employee;
  popupLevel.value = 2;
  await loadEmployeeTickets(employee.id);
}

async function loadEmployeeTickets(employeeId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeTickets: true
    });
    
    const employee = response.data.responsible.find(r => r.id === employeeId);
    tickets.value = employee?.tickets || [];
    
    if (tickets.value.length === 0) {
      error.value = 'У сотрудника нет закрытых тикетов за выбранную неделю';
    }
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[ResponsibleModal] Error loading tickets:', err);
  } finally {
    isLoadingTickets.value = false;
  }
}

function goBack() {
  popupLevel.value = 1;
  selectedEmployee.value = null;
  tickets.value = [];
  error.value = null;
}

function handleTicketClick(ticket) {
  const url = getTicketIframeUrl(ticket.id);
  // Открыть тикет в Bitrix24 (iframe или новая вкладка)
  window.open(url, '_blank');
}

function retryLoadTickets() {
  if (selectedEmployee.value) {
    loadEmployeeTickets(selectedEmployee.value.id);
  }
}
```

## Критерии приёмки этапа

- [ ] При клике на сотрудника в попапе первого уровня открывается попап второго уровня
- [ ] В попапе второго уровня отображается список тикетов сотрудника
- [ ] Тикеты отображаются через компонент `TicketCard` (как в модуле «График состояния»)
- [ ] Кнопка "Назад" возвращает на уровень 1
- [ ] Заголовок попапа обновляется: "Тикеты сотрудника: [Имя]"
- [ ] При отсутствии тикетов показывается сообщение "У сотрудника нет закрытых тикетов за выбранную неделю"
- [ ] При ошибке загрузки показывается сообщение об ошибке с кнопкой "Повторить"
- [ ] При клике на тикет открывается детальная информация в Bitrix24
- [ ] Тикеты загружаются из API с параметром `includeTickets: true`
- [ ] Состояния загрузки обрабатываются корректно (индикатор, ошибки, пустые данные)

## Дополнительные уточнения

### Подготовка тикетов для TicketCard
- Если требуется дополнительная подготовка, использовать `prepareTicketsForDisplay()` из `ticketListUtils.js`
- Убедиться, что формат тикета соответствует ожиданиям `TicketCard`

### Стилизация
- Использовать существующие стили из `ResponsibleModal.vue`
- Добавить стили для кнопки "Назад"
- Добавить стили для списка тикетов

### Производительность
- Загружать тикеты только при переходе на уровень 2
- Кэшировать загруженные тикеты (опционально)

## История правок

- 2025-12-15 21:15 (UTC+3, Брест): Создан этап 3 задачи TASK-042

