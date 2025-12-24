# TASK-042: Попап второго уровня — список тикетов для модуля «График приёма и закрытий сектора 1С»

**Дата создания:** 2025-12-15 20:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Расширение функциональности TASK-041

## Этапы реализации

Задача разделена на последовательные этапы:

1. **[TASK-042-01](TASK-042-01-load-employee-names.md)** — Загрузка имён сотрудников через Bitrix24 API
2. **[TASK-042-02](TASK-042-02-api-tickets-extension.md)** — Расширение API для получения тикетов сотрудника
3. **[TASK-042-03](TASK-042-03-popup-level2-implementation.md)** — Реализация попапа второго уровня со списком тикетов
4. **[TASK-042-04](TASK-042-04-ux-improvements-lazy-loading-transitions.md)** — Улучшения UX: ленивая загрузка, плавные переходы и исправление отступов

**Порядок выполнения:** 
- Этапы 1-3 должны выполняться последовательно, так как каждый этап зависит от предыдущего.
- Этап 4 является опциональным улучшением UX и может быть выполнен после завершения этапов 1-3.

## Цель
1. **Преобразовать ID сотрудников в Имя Фамилию** в попапе первого уровня модуля «График приёма и закрытий сектора 1С»
2. **Реализовать попап второго уровня** со списком тикетов выбранного сотрудника при клике на него в попапе первого уровня (ResponsibleModal)

## Контекст
- **Текущее состояние:** 
  - В модуле «График приёма и закрытий сектора 1С» реализован попап первого уровня (`ResponsibleModal.vue`), который показывает список сотрудников с количеством закрытых тикетов за неделю.
  - **Проблема:** В попапе отображается только `"ID 1006"` вместо полного имени сотрудника (Имя Фамилия).
  - API возвращает только ID сотрудника, без полного имени.
- **Требуется:** 
  1. Загружать имена сотрудников через Bitrix24 API (`user.get`) и преобразовывать ID в "Имя Фамилия"
  2. Отображать полное имя в попапе первого уровня
  3. При клике на сотрудника открывать попап второго уровня со списком тикетов этого сотрудника
- **Аналогичная реализация:** 
  - В модуле «График состояния сектора 1С» используется многоуровневый попап (`EmployeeDetailsModal.vue`) с уровнями 1, 2, 3, 4.
  - Для загрузки имён используется `DashboardSector1CService.getEmployeesByIds()` или `EmployeeRepository.getEmployeesByIds()`
  - Для нового модуля нужен упрощённый вариант: уровень 1 (список сотрудников с полными именами) → уровень 2 (список тикетов).

## Анализ текущей реализации

### Попап первого уровня (ResponsibleModal.vue)
**Файл:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

**Текущая функциональность:**
- Отображает список сотрудников из `chartData.responsible`
- Показывает имя сотрудника (разделение на Имя и Фамилию) и количество закрытых тикетов
- При клике на сотрудника — **ничего не происходит** (требуется реализация)

**Структура данных (текущая):**
```javascript
responsible: [
  { id: 1006, name: "ID 1006", count: 10 },  // ❌ Только ID, нет полного имени
  { id: 994, name: "ID 994", count: 10 },
  { id: null, name: "Не назначен", count: 0 }
]
```

**Структура данных (требуемая):**
```javascript
responsible: [
  { id: 1006, name: "Иванов Иван", count: 10 },  // ✅ Полное имя
  { id: 994, name: "Петров Пётр", count: 10 },
  { id: null, name: "Не назначен", count: 0 }
]
```

### Аналогичная реализация в модуле «График состояния»

**Файл:** `vue-app/src/components/graph-state/EmployeeDetailsModal.vue`

**Уровень 4 (список тикетов):**
- Использует компонент `TicketCard` для отображения каждого тикета
- Загружает тикеты через `getEmployeeTicketsForStage()` из `popupNavigationUtils.js`
- Требует `snapshot` с данными тикетов
- Подготавливает тикеты через `prepareTicketsForDisplay()` из `ticketListUtils.js`

**Компонент TicketCard:**
- Файл: `vue-app/src/components/dashboard/TicketCard.vue`
- Отображает: ID тикета, название, приоритет, статус, отдел заказчика, дату создания
- Поддерживает клик для открытия детальной информации в Bitrix24

## Общее описание задач

> **Примечание:** Детальное описание каждой задачи находится в соответствующих файлах этапов (TASK-042-01, TASK-042-02, TASK-042-03).

### 1) Загрузка имён сотрудников через Bitrix24 API
**См. [TASK-042-01](TASK-042-01-load-employee-names.md)**

**Проблема:**
- API `graph-1c-admission-closure.php` возвращает только ID сотрудника и формирует `name: "ID 1006"`
- Нужно получать полные имена через Bitrix24 API метод `user.get`

**Решение:**
- В компоненте `ResponsibleModal.vue` или в сервисе `admissionClosureService.js` загружать имена сотрудников
- Использовать существующий метод `DashboardSector1CService.getEmployeesByIds()` или `EmployeeRepository.getEmployeesByIds()`
- Метод Bitrix24: `user.get` с фильтром по ID
- Документация: https://context7.com/bitrix24/rest/user.get

**Реализация:**
```javascript
// В ResponsibleModal.vue или admissionClosureService.js
import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';

async function enrichResponsibleWithNames(responsible) {
  // Извлечь ID сотрудников (исключить null)
  const employeeIds = responsible
    .filter(r => r.id !== null && r.id !== undefined)
    .map(r => r.id);
  
  if (employeeIds.length === 0) {
    return responsible; // Нет сотрудников для загрузки
  }
  
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
}
```

**Оптимизация:**
- Кэшировать загруженные имена сотрудников (использовать существующий кэш из `EmployeeRepository`)
- Загружать имена только один раз при открытии попапа
- Если имя не найдено, оставить `"ID {id}"` как fallback

**Пример использования в ResponsibleModal.vue:**
```vue
<script setup>
import { computed, ref, watch } from 'vue';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';

const props = defineProps({
  isVisible: Boolean,
  responsible: Array
});

const enrichedResponsible = ref([]);
const isLoadingNames = ref(false);

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

async function enrichResponsibleWithNames(responsible) {
  const employeeIds = responsible
    .filter(r => r.id !== null && r.id !== undefined)
    .map(r => r.id);
  
  if (employeeIds.length === 0) {
    return responsible;
  }
  
  const employees = await DashboardSector1CService.getEmployeesByIds(employeeIds);
  const nameMap = new Map();
  employees.forEach(emp => {
    nameMap.set(emp.id, emp.name);
  });
  
  return responsible.map(r => {
    if (r.id && nameMap.has(r.id)) {
      return { ...r, name: nameMap.get(r.id) };
    }
    return r;
  });
}
</script>

<template>
  <!-- В списке использовать enrichedResponsible вместо responsible -->
  <li
    v-for="person in enrichedResponsible"
    :key="person.id || person.name"
  >
    <span>{{ person.name || 'Не назначен' }}</span>
    <span>{{ person.count ?? 0 }}</span>
  </li>
</template>
```

### 2) Расширение API для получения тикетов сотрудника
**См. [TASK-042-02](TASK-042-02-api-tickets-extension.md)**

**Текущее состояние API:**
- Endpoint: `POST /api/graph-1c-admission-closure.php`
- Возвращает только агрегаты: `newTickets`, `closedTickets`, `series`, `stages`, `responsible[]`
- **Не возвращает сами тикеты** для каждого сотрудника

**Требуется:**
- **Вариант А (рекомендуемый):** Расширить API, добавив опциональный параметр `includeTickets: true`, который вернёт тикеты для каждого сотрудника в `responsible[].tickets[]`
- **Вариант Б:** Создать отдельный endpoint `POST /api/graph-1c-admission-closure-tickets.php` для загрузки тикетов сотрудника по запросу

**Рекомендация:** Вариант А (расширение существующего API) для минимизации запросов и упрощения логики фронта.

**Структура ответа API (расширенная):**
```json
{
  "success": true,
  "meta": { ... },
  "data": {
    "newTickets": 14,
    "closedTickets": 34,
    "series": { ... },
    "stages": [ ... ],
    "responsible": [
      {
        "id": 1006,
        "name": "ID 1006",
        "count": 10,
        "tickets": [
          {
            "id": 12345,
            "title": "Название тикета",
            "createdTime": "2025-12-10T10:00:00Z",
            "movedTime": "2025-12-12T15:30:00Z",
            "stageId": "DT140_12:SUCCESS",
            "assignedById": 1006
          }
        ]
      }
    ]
  }
}
```

**Фильтрация тикетов в API:**
- Для каждого сотрудника возвращать только **закрытые тикеты** (с `stageId` в списке закрывающих стадий)
- Фильтровать по `movedTime` в диапазоне `[weekStartUtc, weekEndUtc]`
- Фильтровать по `assignedById` = ID сотрудника

### 3) Реализация попапа второго уровня со списком тикетов
**См. [TASK-042-03](TASK-042-03-popup-level2-implementation.md)**

**Текущий компонент:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

**Требуется:**
- Добавить состояние `popupLevel` (1 или 2)
- При клике на сотрудника (`@click` на `.responsible-list__item`) вызывать функцию `handleEmployeeClick(employee)`
- При `popupLevel === 2` отображать попап второго уровня со списком тикетов
- Добавить кнопку "Назад" для возврата на уровень 1
- Обновить заголовок попапа: "Ответственные за неделю" → "Тикеты сотрудника: [Имя]"

**Структура компонента:**
```vue
<template>
  <div v-if="isVisible" class="modal-backdrop">
    <div class="modal">
      <!-- Уровень 1: Список сотрудников -->
      <div v-if="popupLevel === 1">
        <header>...</header>
        <section>
          <ul class="responsible-list">
            <li @click="handleEmployeeClick(person)">...</li>
          </ul>
        </section>
      </div>
      
      <!-- Уровень 2: Список тикетов -->
      <div v-else-if="popupLevel === 2">
        <header>
          <button @click="goBack">← Назад</button>
          <h3>Тикеты сотрудника: {{ selectedEmployee.name }}</h3>
        </header>
        <section>
          <div v-if="isLoading">Загрузка...</div>
          <div v-else-if="tickets.length === 0">Нет тикетов</div>
          <div v-else>
            <TicketCard
              v-for="ticket in tickets"
              :key="ticket.id"
              :ticket="ticket"
              @click="handleTicketClick(ticket)"
            />
          </div>
        </section>
      </div>
    </div>
  </div>
</template>
```

### 4) Загрузка и подготовка тикетов

**Требуется:**
- При клике на сотрудника загружать тикеты из API (если `includeTickets: true`) или отдельным запросом
- Подготовить тикеты для отображения через `prepareTicketsForDisplay()` (аналогично модулю «График состояния»)
- Обработать состояния: загрузка, ошибка, пустой список

**Функция загрузки тикетов:**
```javascript
async function loadEmployeeTickets(employeeId, weekStartUtc, weekEndUtc) {
  // Вариант А: тикеты уже в ответе API (если includeTickets: true)
  // Вариант Б: отдельный запрос к API
  const response = await fetchAdmissionClosureStats({
    product: '1C',
    weekStartUtc,
    weekEndUtc,
    includeTickets: true // или отдельный endpoint
  });
  
  const employee = response.data.responsible.find(r => r.id === employeeId);
  return employee?.tickets || [];
}
```

### 5) Интеграция компонента TicketCard

**Требуется:**
- Импортировать компонент `TicketCard` из `@/components/dashboard/TicketCard.vue`
- Передать тикет в формате, ожидаемом `TicketCard`:
  - `id` — ID тикета
  - `title` или `ufSubject` — название тикета
  - `createdAt` или `createdTime` — дата создания
  - `updatedAt` или `updatedTime` — дата обновления
  - `assignedTo` — объект с `id` и `name` сотрудника
  - `stageId` — ID стадии (опционально)
  - `departmentHead` — отдел заказчика (опционально)
  - `priorityId`, `priorityLabel` — приоритет (опционально)

**Обработка клика на тикет:**
- При клике на `TicketCard` открывать детальную информацию о тикете в Bitrix24 (через iframe или ссылку)
- Использовать функцию `getTicketIframeUrl(ticketId)` из `@/services/dashboard-sector-1c/utils/constants.js`

### 6) Обработка пустых данных и ошибок

**Требуется:**
- Если у сотрудника нет тикетов — показать сообщение "У сотрудника нет закрытых тикетов за выбранную неделю"
- Если произошла ошибка загрузки — показать сообщение об ошибке с кнопкой "Повторить"
- Если сотрудник не найден — вернуться на уровень 1

## Технические требования

### API (бэкенд)

**Расширение endpoint:** `POST /api/graph-1c-admission-closure.php`

**Новый параметр (опциональный):**
```json
{
  "product": "1C",
  "weekStartUtc": "2025-12-08T00:00:00Z",
  "weekEndUtc": "2025-12-15T23:59:59Z",
  "includeTickets": true  // новый параметр
}
```

**Логика в API:**
- Если `includeTickets === true`, для каждого сотрудника в `responsible[]` добавить массив `tickets[]`
- В `tickets[]` включить только закрытые тикеты сотрудника (фильтр по `assignedById` и закрывающим стадиям)
- Включить поля: `id`, `title`, `createdTime`, `movedTime`, `stageId`, `assignedById`

**Оптимизация:**
- Загружать тикеты только для сотрудников, у которых `count > 0`
- Использовать те же два запроса к Bitrix24 (созданные + закрытые), но сохранять полные данные тикетов

### Фронтенд (Vue.js)

**Компоненты:**
- `ResponsibleModal.vue` — модификация для поддержки двух уровней
- `TicketCard.vue` — переиспользование из `@/components/dashboard/TicketCard.vue`

**Сервисы:**
- `admissionClosureService.js` — расширение для поддержки `includeTickets`
- `ticketListUtils.js` — переиспользование функции `prepareTicketsForDisplay()`

**Утилиты:**
- `popupNavigationUtils.js` — возможно, переиспользование логики подготовки тикетов (адаптировать для модуля приёма и закрытий)

## Порядок выполнения этапов

Этапы должны выполняться последовательно:

1. **TASK-042-01** — Загрузка имён сотрудников (фронтенд)
   - Реализация функции обогащения данных именами
   - Интеграция в `ResponsibleModal.vue`
   - Обработка состояний загрузки и ошибок

2. **TASK-042-02** — Расширение API (бэкенд)
   - Добавление параметра `includeTickets`
   - Модификация логики агрегации для сохранения тикетов
   - Формирование ответа с тикетами

3. **TASK-042-03** — Попап второго уровня (фронтенд)
   - Модификация `ResponsibleModal` для поддержки двух уровней
   - Загрузка и отображение тикетов
   - Интеграция компонента `TicketCard`

## Критерии приёмки

- [ ] В попапе первого уровня отображаются полные имена сотрудников ("Иванов Иван") вместо "ID 1006"
- [ ] Имена загружаются через Bitrix24 API метод `user.get`
- [ ] При ошибке загрузки имени показывается fallback "ID {id}"
- [ ] При клике на сотрудника в попапе первого уровня открывается попап второго уровня
- [ ] В попапе второго уровня отображается список тикетов сотрудника
- [ ] Тикеты отображаются через компонент `TicketCard` (как в модуле «График состояния»)
- [ ] Кнопка "Назад" возвращает на уровень 1
- [ ] Заголовок попапа обновляется: "Тикеты сотрудника: [Имя]"
- [ ] При отсутствии тикетов показывается сообщение "У сотрудника нет закрытых тикетов за выбранную неделю"
- [ ] При ошибке загрузки показывается сообщение об ошибке с кнопкой "Повторить"
- [ ] При клике на тикет открывается детальная информация в Bitrix24
- [ ] API возвращает тикеты для каждого сотрудника (если `includeTickets: true`)
- [ ] Тикеты фильтруются по закрывающим стадиям и дате закрытия (`movedTime`)

## Дополнительные уточнения

### Разделение имени и фамилии
**Текущее состояние:** В `ResponsibleModal` имя отображается как `person.name` (например, "ID 1006")

**Требуется:**
- Загружать полное имя через Bitrix24 API (формат: "Имя Фамилия")
- Отображать полное имя в попапе первого уровня
- В попапе второго уровня показывать полное имя в заголовке: "Тикеты сотрудника: Иванов Иван"
- Если имя не загружено (ошибка API), показывать fallback "ID {id}"

### Оптимизация производительности
- Если `includeTickets: false` (по умолчанию), API не загружает тикеты (экономия ресурсов)
- Тикеты загружаются только при открытии попапа второго уровня
- Возможно кэширование тикетов на фронте для повторного открытия

### Совместимость с существующим кодом
- Не ломать текущую функциональность попапа первого уровня
- Переиспользовать компоненты и утилиты из модуля «График состояния» где возможно
- Следовать существующим паттернам и стилям

## История правок

- 2025-12-15 20:30 (UTC+3, Брест): Создана задача
- 2025-12-15 21:00 (UTC+3, Брест): Добавлена задача загрузки имён сотрудников через Bitrix24 API, обновлены критерии приёмки
- 2025-12-15 21:15 (UTC+3, Брест): Задача разделена на последовательные этапы:
  - TASK-042-01: Загрузка имён сотрудников через Bitrix24 API
  - TASK-042-02: Расширение API для получения тикетов сотрудника
  - TASK-042-03: Реализация попапа второго уровня со списком тикетов
- 2025-12-16 13:13 (UTC+3, Брест): Добавлен этап 4 — улучшения UX (ленивая загрузка, плавные переходы, исправление отступов)

