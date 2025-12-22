# TASK-028-03: Техническое решение (Vue компоненты, API)

**Дата создания:** 2025-12-11 15:30 (UTC+3, Брест)  
**Статус:** Завершён  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-028

---

## 📋 Цель этапа

Специфицировать техническое решение для реализации улучшенного UI фильтров и стадий: определить структуру Vue.js компонентов, API-методы, пропсы, события, дебаунс и кеширование.

---

## 🧩 1. Структура компонентов

### 1.1. Компонент FiltersPanel.vue

**Назначение:** Группировка и структурирование фильтров с визуальными секциями.

**Расположение:** `vue-app/src/components/filters/FiltersPanel.vue`

**Пропсы:**
```typescript
interface FiltersPanelProps {
  // Фильтр по этапам
  stages: {
    formed: boolean;
    review: boolean;
    execution: boolean;
  };
  
  // Фильтр по сотрудникам
  employees: Array<number | 'all'>;
  
  // Фильтр по датам
  dateRange: 'last-week' | 'last-2-weeks' | 'last-month' | 'custom';
  customDateRange: {
    startDate: string | null;
    endDate: string | null;
  };
  
  // Состояние
  isLoading?: boolean;
  hasActiveFilters?: boolean;
}
```

**События (Emits):**
```typescript
interface FiltersPanelEmits {
  'update:stages': (stages: FiltersPanelProps['stages']) => void;
  'update:employees': (employees: Array<number | 'all'>) => void;
  'update:dateRange': (dateRange: FiltersPanelProps['dateRange']) => void;
  'update:customDateRange': (range: FiltersPanelProps['customDateRange']) => void;
  'reset': () => void;
  'apply': () => void;
}
```

**Структура:**
```vue
<template>
  <div class="filters-panel">
    <div class="filters-header">
      <h2>Фильтры</h2>
      <button @click="$emit('reset')" :disabled="!hasActiveFilters">
        Сбросить фильтры
      </button>
    </div>
    
    <div class="filters-content">
      <!-- Секция: Этапы -->
      <div class="filter-section">
        <h3 class="section-title">
          <span class="section-icon">📊</span>
          Этапы
        </h3>
        <div class="section-content">
          <StageCheckboxes
            :stages="stages"
            @update:stages="$emit('update:stages', $event)"
          />
        </div>
      </div>
      
      <!-- Секция: Сотрудники -->
      <div class="filter-section">
        <h3 class="section-title">
          <span class="section-icon">👥</span>
          Сотрудники сектора 1С
        </h3>
        <div class="section-content">
          <EmployeeSelect
            :selected="employees"
            @update:selected="$emit('update:employees', $event)"
          />
        </div>
      </div>
      
      <!-- Секция: Период -->
      <div class="filter-section">
        <h3 class="section-title">
          <span class="section-icon">📅</span>
          Период
        </h3>
        <div class="section-content">
          <DateRangeSelect
            :dateRange="dateRange"
            :customDateRange="customDateRange"
            @update:dateRange="$emit('update:dateRange', $event)"
            @update:customDateRange="$emit('update:customDateRange', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
```

---

### 1.2. Компонент StageChips.vue

**Назначение:** Отображение чипов стадий в визуальном контейнере с состояниями hover/active.

**Расположение:** `vue-app/src/components/filters/StageChips.vue`

**Пропсы:**
```typescript
interface StageChipsProps {
  stages: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  selected: {
    [key: string]: boolean;
  };
  disabled?: boolean;
}
```

**События (Emits):**
```typescript
interface StageChipsEmits {
  'update:selected': (selected: { [key: string]: boolean }) => void;
  'change': (stageId: string, isSelected: boolean) => void;
}
```

**Структура:**
```vue
<template>
  <div class="stages-container">
    <h4 class="stages-title">Этапы для отображения:</h4>
    <div class="stages-chips">
      <label
        v-for="stage in stages"
        :key="stage.id"
        :class="[
          'stage-chip',
          {
            'stage-chip--active': selected[stage.id],
            'stage-chip--disabled': disabled
          }
        ]"
      >
        <input
          type="checkbox"
          :checked="selected[stage.id]"
          :disabled="disabled"
          @change="handleChange(stage.id, $event.target.checked)"
        />
        <span
          class="stage-chip-color"
          :style="{ backgroundColor: stage.color }"
        ></span>
        <span class="stage-chip-label">{{ stage.name }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
const props = defineProps<StageChipsProps>();
const emit = defineEmits<StageChipsEmits>();

function handleChange(stageId: string, isSelected: boolean) {
  const newSelected = { ...props.selected };
  newSelected[stageId] = isSelected;
  emit('update:selected', newSelected);
  emit('change', stageId, isSelected);
}
</script>
```

---

### 1.3. Компонент EmployeeSelect.vue

**Назначение:** Поиск и множественный выбор сотрудников сектора 1С с состояниями loading/empty/error.

**Расположение:** `vue-app/src/components/filters/EmployeeSelect.vue`

**Пропсы:**
```typescript
interface EmployeeSelectProps {
  selected: Array<number | 'all'>;
  multiple?: boolean;
  placeholder?: string;
  maxHeight?: number;
}
```

**События (Emits):**
```typescript
interface EmployeeSelectEmits {
  'update:selected': (selected: Array<number | 'all'>) => void;
  'search': (query: string) => void;
  'error': (error: Error) => void;
}
```

**Структура:**
```vue
<template>
  <div class="employee-select">
    <!-- Поле поиска -->
    <input
      v-model="searchQuery"
      type="text"
      :placeholder="placeholder || '🔍 Поиск сотрудника сектора 1С...'"
      class="employee-select-search"
      @input="handleSearch"
    />
    
    <!-- Состояние загрузки -->
    <div v-if="isLoading" class="employee-select-state">
      <span class="spinner"></span>
      <span>Загрузка сотрудников сектора 1С...</span>
    </div>
    
    <!-- Состояние ошибки -->
    <div v-else-if="error" class="employee-select-state employee-select-state--error">
      <span>❌ {{ error.message }}</span>
      <button @click="retry" class="btn-retry">Повторить</button>
    </div>
    
    <!-- Состояние пустого результата -->
    <div v-else-if="!isLoading && employees.length === 0" class="employee-select-state">
      <span>📭 {{ emptyMessage }}</span>
    </div>
    
    <!-- Список сотрудников -->
    <div v-else class="employee-select-list">
      <label
        v-for="employee in employees"
        :key="employee.id"
        :class="[
          'employee-select-item',
          {
            'employee-select-item--selected': isSelected(employee.id)
          }
        ]"
      >
        <input
          type="checkbox"
          :checked="isSelected(employee.id)"
          @change="handleToggle(employee.id)"
        />
        <div class="employee-select-item-content">
          <span class="employee-select-item-name">{{ employee.name }}</span>
          <span v-if="employee.position" class="employee-select-item-position">
            {{ employee.position }}
          </span>
        </div>
      </label>
    </div>
    
    <!-- Счётчик выбранных -->
    <div v-if="selectedCount > 0" class="employee-select-counter">
      💡 Выбрано: {{ selectedCount }} {{ pluralize(selectedCount, 'сотрудника', 'сотрудников', 'сотрудников') }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchEmployees } from '@/api/sector1cEmployees.js';
import { debounce } from '@/utils/debounce.js';

const props = defineProps<EmployeeSelectProps>();
const emit = defineEmits<EmployeeSelectEmits>();

const searchQuery = ref('');
const employees = ref([]);
const isLoading = ref(false);
const error = ref(null);

// Дебаунс поиска (300ms)
const debouncedSearch = debounce(async (query) => {
  await loadEmployees(query);
}, 300);

async function loadEmployees(query = '') {
  isLoading.value = true;
  error.value = null;
  
  try {
    employees.value = await fetchEmployees({ search: query });
  } catch (err) {
    error.value = err;
    emit('error', err);
  } finally {
    isLoading.value = false;
  }
}

function handleSearch() {
  emit('search', searchQuery.value);
  debouncedSearch(searchQuery.value);
}

function handleToggle(employeeId) {
  const newSelected = [...props.selected];
  const index = newSelected.indexOf(employeeId);
  
  if (index > -1) {
    newSelected.splice(index, 1);
  } else {
    // Если выбран конкретный сотрудник, убираем "all"
    const allIndex = newSelected.indexOf('all');
    if (allIndex > -1) {
      newSelected.splice(allIndex, 1);
    }
    newSelected.push(employeeId);
  }
  
  emit('update:selected', newSelected);
}

function isSelected(employeeId) {
  return props.selected.includes(employeeId) || props.selected.includes('all');
}

const selectedCount = computed(() => {
  return props.selected.filter(id => id !== 'all').length;
});

const emptyMessage = computed(() => {
  return searchQuery.value
    ? `Нет сотрудников по запросу "${searchQuery.value}"`
    : 'Нет сотрудников сектора 1С';
});

function pluralize(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

function retry() {
  loadEmployees(searchQuery.value);
}

onMounted(() => {
  loadEmployees();
});
</script>
```

---

## 🔌 2. API-метод для сотрудников

### 2.1. Сервис sector1cEmployees.js

**Назначение:** Получение списка сотрудников сектора 1С через Bitrix24 REST API.

**Расположение:** `vue-app/src/api/sector1cEmployees.js`

**Метод Bitrix24:** `user.get`

**Документация:** https://context7.com/bitrix24/rest/user.get

**Структура:**
```javascript
/**
 * Сервис для работы с сотрудниками сектора 1С
 * 
 * Использует Bitrix24 REST API: user.get
 * Документация: https://context7.com/bitrix24/rest/user.get
 */

import { Bitrix24ApiService } from '@/services/bitrix24-api.js';

// Константы
const DEFAULT_LIMIT = 20;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const DEBOUNCE_DELAY = 300; // 300ms

// Кеш в памяти (sessionStorage)
const cache = new Map();

/**
 * Получение списка сотрудников сектора 1С
 * 
 * @param {Object} options - Параметры запроса
 * @param {string} options.search - Поисковый запрос (по ФИО/должности)
 * @param {number} options.limit - Лимит результатов (по умолчанию 20)
 * @param {number} options.sectorDepartmentId - ID подразделения сектора 1С (опционально)
 * @returns {Promise<Array>} Массив сотрудников
 */
export async function fetchEmployees({
  search = '',
  limit = DEFAULT_LIMIT,
  sectorDepartmentId = null
} = {}) {
  // Проверка кеша
  const cacheKey = `sector1c_employees_${search}_${limit}_${sectorDepartmentId || 'all'}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return data;
    }
  }
  
  try {
    // Фильтр для Bitrix24 API
    const filter = {
      'ACTIVE': 'Y'
    };
    
    // Фильтр по подразделению сектора 1С (если указан)
    // TODO: Уточнить ID подразделения сектора 1С
    if (sectorDepartmentId) {
      filter['UF_DEPARTMENT'] = sectorDepartmentId;
    }
    
    // Поиск по ФИО/должности
    if (search && search.length >= 2) {
      filter['%NAME'] = search;
      filter['%LAST_NAME'] = search;
      filter['%WORK_POSITION'] = search;
    }
    
    // Вызов Bitrix24 API
    const result = await Bitrix24ApiService.call('user.get', {
      filter: filter,
      select: [
        'ID',
        'NAME',
        'LAST_NAME',
        'SECOND_NAME',
        'WORK_POSITION',
        'UF_DEPARTMENT'
      ],
      order: {
        'LAST_NAME': 'ASC',
        'NAME': 'ASC'
      },
      start: 0
    });
    
    // Обработка результата
    const users = result.result || [];
    
    // Маппинг в формат приложения
    const employees = users
      .slice(0, limit)
      .map(user => ({
        id: parseInt(user.ID),
        name: formatFullName(user),
        position: user.WORK_POSITION || '',
        department: user.UF_DEPARTMENT || null
      }));
    
    // Сохранение в кеш
    sessionStorage.setItem(cacheKey, JSON.stringify({
      data: employees,
      timestamp: Date.now()
    }));
    
    return employees;
  } catch (error) {
    console.error('[sector1cEmployees] Ошибка загрузки сотрудников:', error);
    throw new Error(`Не удалось загрузить сотрудников: ${error.message}`);
  }
}

/**
 * Форматирование полного имени сотрудника
 * 
 * @param {Object} user - Объект пользователя из Bitrix24
 * @returns {string} Полное имя
 */
function formatFullName(user) {
  const parts = [
    user.LAST_NAME,
    user.NAME,
    user.SECOND_NAME
  ].filter(Boolean);
  
  return parts.length > 0
    ? parts.join(' ')
    : user.NAME || 'Без имени';
}

/**
 * Очистка кеша сотрудников
 */
export function clearEmployeesCache() {
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('sector1c_employees_')) {
      sessionStorage.removeItem(key);
    }
  });
}

/**
 * Дебаунс-обёртка для поиска
 * 
 * @param {Function} callback - Функция для вызова
 * @param {number} delay - Задержка в миллисекундах
 * @returns {Function} Дебаунсированная функция
 */
export function debounceSearch(callback, delay = DEBOUNCE_DELAY) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(this, args), delay);
  };
}
```

---

### 2.2. Утилита debounce.js

**Назначение:** Универсальная функция дебаунса для поиска.

**Расположение:** `vue-app/src/utils/debounce.js`

**Структура:**
```javascript
/**
 * Утилита дебаунса
 * 
 * Откладывает выполнение функции до истечения указанного времени
 * после последнего вызова.
 * 
 * @param {Function} func - Функция для дебаунса
 * @param {number} wait - Задержка в миллисекундах
 * @returns {Function} Дебаунсированная функция
 */
export function debounce(func, wait = 300) {
  let timeoutId;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeoutId);
      func(...args);
    };
    
    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, wait);
  };
}
```

---

## 🎨 3. Стили компонентов

### 3.1. Стили для FiltersPanel.vue

**Расположение:** Внутри компонента (scoped styles)

```css
.filters-panel {
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
  border: 1px solid var(--b24-border-light);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}

.filters-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--spacing-md);
}

.filter-section {
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.section-title {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--b24-text-primary);
}

.section-icon {
  font-size: 16px;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}
```

### 3.2. Стили для StageChips.vue

**Расположение:** Внутри компонента (scoped styles)

```css
.stages-container {
  background-color: var(--b24-bg-light);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-md);
}

.stages-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--b24-text-primary);
}

.stages-chips {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.stage-chip {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm) var(--spacing-md);
  min-height: 40px;
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  font-size: var(--font-size-sm);
}

.stage-chip:hover:not(.stage-chip--disabled) {
  background-color: var(--b24-bg-light);
  border-color: var(--b24-primary);
  box-shadow: var(--shadow-sm);
}

.stage-chip--active {
  background-color: var(--b24-primary-lighter);
  border: 2px solid var(--b24-primary);
  color: var(--b24-primary);
  font-weight: 600;
}

.stage-chip--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.stage-chip-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.stage-chip-label {
  color: inherit;
}
```

### 3.3. Стили для EmployeeSelect.vue

**Расположение:** Внутри компонента (scoped styles)

```css
.employee-select {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
}

.employee-select-search {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}

.employee-select-search:focus {
  outline: none;
  border: 2px solid var(--b24-primary);
}

.employee-select-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-sm);
  background-color: var(--b24-bg-white);
}

.employee-select-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-sm);
  min-height: 40px;
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.employee-select-item:hover {
  background-color: var(--b24-bg-light);
}

.employee-select-item--selected {
  background-color: var(--b24-primary-lighter);
  border-left: 3px solid var(--b24-primary);
}

.employee-select-item-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.employee-select-item-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--b24-text-primary);
}

.employee-select-item-position {
  font-size: var(--font-size-xs);
  color: var(--b24-text-secondary);
}

.employee-select-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  color: var(--b24-text-secondary);
  font-size: var(--font-size-sm);
}

.employee-select-state--error {
  color: var(--b24-danger);
  flex-direction: column;
}

.employee-select-counter {
  font-size: var(--font-size-xs);
  color: var(--b24-text-secondary);
  padding-top: var(--spacing-xs);
}
```

---

## 🔄 4. Интеграция с существующим кодом

### 4.1. Обновление GraphStateDashboard.vue

**Изменения:**
- Заменить текущую панель фильтров на компонент `FiltersPanel.vue`
- Обновить обработку событий фильтров
- Добавить загрузку сотрудников при монтировании

### 4.2. Обновление GraphStateChart.vue

**Изменения:**
- Заменить текущий блок стадий на компонент `StageChips.vue`
- Обновить обработку изменения стадий

---

## ✅ 5. Критерии приёмки технического решения

- [x] Специфицированы пропсы и события для всех компонентов
- [x] Определён API-метод для получения сотрудников сектора 1С
- [x] Добавлен дебаунс для поиска (300ms)
- [x] Реализовано кеширование на сессию (sessionStorage, TTL 5 минут)
- [x] Определены стили для всех компонентов с использованием Bitrix24 UI Kit
- [x] Спроектирована интеграция с существующими компонентами

---

## 📝 6. Следующие шаги

**Этап 4: Реализация**
- Создать компоненты FiltersPanel, StageChips, EmployeeSelect
- Реализовать API-сервис sector1cEmployees
- Обновить GraphStateDashboard и GraphStateChart
- Добавить стили

---

**Дата завершения технического решения:** 2025-12-11 15:30 (UTC+3, Брест)  
**Следующий этап:** TASK-028-04 — Реализация
