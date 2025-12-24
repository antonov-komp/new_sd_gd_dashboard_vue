# TASK-028-04: Этап 4 — Реализация компонентов фильтров для графика состояния сектора 1С

**Дата создания:** 2025-12-11 13:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-028

## Цель этапа

Реализовать улучшенные компоненты фильтров (`StageChips`, `EmployeeSelect`, обновлённый `FiltersPanel`) с корректной стилизацией, интеграцией API для сотрудников сектора 1С и обработкой всех состояний (loading/error/empty).

## Контекст

- Этап 28-01: проанализирован текущий UI (кнопки стадий «в воздухе», пустое поле сотрудников).  
- Этап 28-02: спроектирован UX/UI (контейнеры, состояния, поиск).  
- Этап 28-03: определено техническое решение (API компонентов, контракт API сотрудников).  
- На этом этапе выполняется реализация: создание компонентов, интеграция с API, стилизация, тестирование.

---

## Область работ этапа

1) Создать компонент `StageChips.vue` с контейнером, состояниями (active/hover/disabled), поддержкой multiple/single select.  
2) Создать компонент `EmployeeSelect.vue` с поиском, дебаунсом, загрузкой сотрудников сектора 1С, обработкой ошибок.  
3) Создать API-слой для сотрудников (`api/sector1cEmployees.js`) с кэшированием и дебаунсом.  
4) Обновить `GraphStateDashboard.vue`: заменить текущие фильтры на новые компоненты.  
5) Добавить стили по Bitrix24 UI (сетка 8px, контейнеры, доступность).  
6) Протестировать все состояния и сценарии использования.

---

## Детальный план реализации

### Шаг 1. Создание API-слоя для сотрудников сектора 1С

**Файл:** `vue-app/src/api/sector1cEmployees.js`

#### 1.1. Структура модуля

```javascript
/**
 * API для работы с сотрудниками сектора 1С
 * 
 * Используется метод Bitrix24 REST API: user.get
 * Документация: https://context7.com/bitrix24/rest/user.get
 * 
 * @module api/sector1cEmployees
 */

// Конфигурация
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const DEBOUNCE_DELAY = 300; // мс
const DEFAULT_LIMIT = 20;

// In-memory кэш
const cache = new Map();

// Дебаунс-таймеры
const debounceTimers = new Map();

/**
 * Получение сотрудников сектора 1С
 * 
 * @param {Object} params - Параметры запроса
 * @param {string} params.search - Поисковый запрос (имя/должность)
 * @param {number} params.limit - Лимит результатов (по умолчанию 20)
 * @param {string|number} params.sectorId - ID сектора 1С (опционально)
 * @returns {Promise<Array>} Массив сотрудников [{ id, name, position, department }]
 */
export async function fetchEmployees({ search = '', limit = DEFAULT_LIMIT, sectorId = null }) {
  // Реализация с кэшированием и дебаунсом
}

/**
 * Очистка кэша сотрудников
 */
export function clearEmployeesCache() {
  cache.clear();
}
```

#### 1.2. Реализация запроса к Bitrix24

**Вариант 1: Прямой вызов Bitrix24 REST API**

```javascript
import { Bitrix24RestClient } from '@/services/bitrix24-rest-client.js';

export async function fetchEmployees({ search = '', limit = DEFAULT_LIMIT, sectorId = null }) {
  const cacheKey = `employees_${search}_${limit}_${sectorId || 'all'}`;
  
  // Проверка кэша
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const client = new Bitrix24RestClient();
    
    // Фильтр по подразделению сектора 1С
    const filter = {
      'UF_DEPARTMENT': sectorId || 'SECTOR_1C_ID', // Уточнить ID подразделения
      'ACTIVE': 'Y'
    };
    
    // Поиск по имени/фамилии/должности
    if (search) {
      filter['%NAME'] = search;
      filter['%LAST_NAME'] = search;
      filter['%WORK_POSITION'] = search;
    }
    
    const result = await client.call('user.get', {
      filter: filter,
      select: ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME', 'WORK_POSITION', 'UF_DEPARTMENT'],
      order: { 'LAST_NAME': 'ASC', 'NAME': 'ASC' },
      start: 0
    });
    
    const employees = (result.result || []).map(user => ({
      id: parseInt(user.ID),
      name: `${user.LAST_NAME || ''} ${user.NAME || ''} ${user.SECOND_NAME || ''}`.trim() || user.NAME || 'Без имени',
      position: user.WORK_POSITION || '',
      department: user.UF_DEPARTMENT || ''
    }));
    
    // Сохранение в кэш
    cache.set(cacheKey, {
      data: employees,
      timestamp: Date.now()
    });
    
    return employees;
  } catch (error) {
    console.error('[sector1cEmployees] Ошибка загрузки сотрудников:', error);
    throw new Error(`Не удалось загрузить сотрудников: ${error.message}`);
  }
}
```

**Вариант 2: Внутренний API (если есть серверный эндпоинт)**

```javascript
export async function fetchEmployees({ search = '', limit = DEFAULT_LIMIT, sectorId = null }) {
  const cacheKey = `employees_${search}_${limit}_${sectorId || 'all'}`;
  
  // Проверка кэша
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const params = new URLSearchParams({
      search,
      limit: limit.toString(),
      ...(sectorId && { sector_id: sectorId })
    });
    
    const response = await fetch(`/api/sector1c/employees?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const employees = data.result || [];
    
    // Сохранение в кэш
    cache.set(cacheKey, {
      data: employees,
      timestamp: Date.now()
    });
    
    return employees;
  } catch (error) {
    console.error('[sector1cEmployees] Ошибка загрузки сотрудников:', error);
    throw new Error(`Не удалось загрузить сотрудников: ${error.message}`);
  }
}
```

#### 1.3. Дебаунс-обёртка (опционально, если нужен на уровне API)

```javascript
export function fetchEmployeesDebounced(params) {
  return new Promise((resolve, reject) => {
    const key = JSON.stringify(params);
    
    // Очистка предыдущего таймера
    if (debounceTimers.has(key)) {
      clearTimeout(debounceTimers.get(key));
    }
    
    // Установка нового таймера
    const timer = setTimeout(async () => {
      debounceTimers.delete(key);
      try {
        const result = await fetchEmployees(params);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, DEBOUNCE_DELAY);
    
    debounceTimers.set(key, timer);
  });
}
```

---

### Шаг 2. Создание компонента StageChips.vue

**Файл:** `vue-app/src/components/graph-state/filters/StageChips.vue`

#### 2.1. Структура компонента

```vue
<template>
  <div class="stage-chips-container" :class="{ 'has-selection': hasSelection }">
    <div class="stage-chips-header" v-if="title">
      <label class="stage-chips-label">{{ title }}</label>
      <span v-if="hasSelection" class="selection-count">
        Выбрано: {{ selectedCount }}
      </span>
    </div>
    
    <div 
      class="stage-chips-list" 
      role="group"
      :aria-label="title || 'Выбор стадий'"
    >
      <button
        v-for="option in options"
        :key="option.id"
        :class="[
          'stage-chip',
          {
            'is-active': isSelected(option.id),
            'is-disabled': disabled || option.disabled,
            'has-count': typeof option.count === 'number'
          }
        ]"
        :disabled="disabled || option.disabled"
        :aria-pressed="isSelected(option.id)"
        :aria-label="`${option.label}${option.count ? ` (${option.count} тикетов)` : ''}`"
        @click="handleClick(option.id)"
        @mouseenter="handleHover(option.id)"
        @mouseleave="handleHover(null)"
      >
        <span class="chip-label">{{ option.label }}</span>
        <span v-if="typeof option.count === 'number'" class="chip-count">
          {{ option.count }}
        </span>
      </button>
    </div>
    
    <small v-if="hint" class="stage-chips-hint">{{ hint }}</small>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: [String, Number, Array],
    default: () => []
  },
  options: {
    type: Array,
    required: true,
    validator: (value) => {
      return value.every(opt => opt.id && opt.label);
    }
  },
  multiple: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Этапы:'
  },
  hint: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'hover']);

const selectedValues = computed(() => {
  if (Array.isArray(props.modelValue)) {
    return props.modelValue;
  }
  return props.modelValue ? [props.modelValue] : [];
});

const hasSelection = computed(() => selectedValues.value.length > 0);
const selectedCount = computed(() => selectedValues.value.length);

function isSelected(id) {
  return selectedValues.value.includes(id);
}

function handleClick(id) {
  if (props.disabled) return;
  
  let newValue;
  
  if (props.multiple) {
    if (isSelected(id)) {
      newValue = selectedValues.value.filter(v => v !== id);
    } else {
      newValue = [...selectedValues.value, id];
    }
  } else {
    newValue = isSelected(id) ? [] : [id];
  }
  
  const finalValue = props.multiple ? newValue : (newValue.length > 0 ? newValue[0] : null);
  
  emit('update:modelValue', finalValue);
  emit('change', finalValue);
}

function handleHover(id) {
  emit('hover', id);
}
</script>

<style scoped>
.stage-chips-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  background-color: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.stage-chips-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stage-chips-label {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  margin: 0;
}

.selection-count {
  font-size: 12px;
  color: #6b7280;
}

.stage-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0;
}

.stage-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.stage-chip:hover:not(.is-disabled) {
  border-color: #9ca3af;
  background-color: #f9fafb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stage-chip:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

.stage-chip.is-active {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.stage-chip.is-active:hover:not(.is-disabled) {
  background-color: #2563eb;
  border-color: #2563eb;
}

.stage-chip.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: #f3f4f6;
}

.chip-label {
  flex: 1;
}

.chip-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.stage-chip.is-active .chip-count {
  background-color: rgba(255, 255, 255, 0.3);
}

.stage-chips-hint {
  display: block;
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
}
</style>
```

---

### Шаг 3. Создание компонента EmployeeSelect.vue

**Файл:** `vue-app/src/components/graph-state/filters/EmployeeSelect.vue`

#### 3.1. Структура компонента

```vue
<template>
  <div class="employee-select-container">
    <label v-if="label" class="employee-select-label">
      {{ label }}
      <span v-if="required" class="required-mark">*</span>
    </label>
    
    <div class="employee-select-wrapper" :class="{ 'is-loading': isLoading, 'has-error': hasError }">
      <input
        ref="searchInput"
        type="text"
        :value="searchTerm"
        :placeholder="placeholder"
        :disabled="disabled || isLoading"
        class="employee-select-input"
        :aria-label="label || 'Поиск сотрудника сектора 1С'"
        :aria-expanded="isDropdownOpen"
        :aria-haspopup="true"
        :aria-controls="dropdownId"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
        @keydown="handleKeydown"
      />
      
      <div v-if="isLoading" class="employee-select-loader" aria-hidden="true">
        <span class="loader-spinner"></span>
      </div>
      
      <button
        v-if="selectedEmployee && !isLoading"
        type="button"
        class="employee-select-clear"
        :aria-label="'Очистить выбор'"
        @click="handleClear"
      >
        ×
      </button>
    </div>
    
    <!-- Выпадающий список -->
    <Transition name="dropdown-fade">
      <div
        v-if="isDropdownOpen && !isLoading"
        :id="dropdownId"
        class="employee-select-dropdown"
        role="listbox"
        :aria-label="'Список сотрудников сектора 1С'"
      >
        <div v-if="hasError" class="employee-select-error">
          <p class="error-message">{{ errorMessage }}</p>
          <button
            type="button"
            class="error-retry-btn"
            @click="handleRetry"
          >
            Повторить
          </button>
        </div>
        
        <div v-else-if="filteredEmployees.length === 0" class="employee-select-empty">
          <p>{{ emptyMessage }}</p>
        </div>
        
        <ul v-else class="employee-select-list" role="listbox">
          <li
            v-for="employee in filteredEmployees"
            :key="employee.id"
            class="employee-select-option"
            :class="{ 'is-selected': isSelected(employee.id) }"
            role="option"
            :aria-selected="isSelected(employee.id)"
            @click="handleSelect(employee)"
            @mouseenter="handleOptionHover(employee.id)"
          >
            <span class="option-name">{{ employee.name }}</span>
            <span v-if="employee.position" class="option-position">{{ employee.position }}</span>
          </li>
        </ul>
      </div>
    </Transition>
    
    <small v-if="hint && !hasError" class="employee-select-hint">{{ hint }}</small>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { fetchEmployees } from '@/api/sector1cEmployees.js';

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  label: {
    type: String,
    default: 'Сотрудник:'
  },
  placeholder: {
    type: String,
    default: 'Выберите сотрудника сектора 1С'
  },
  hint: {
    type: String,
    default: ''
  },
  required: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  sectorId: {
    type: [String, Number, null],
    default: null
  }
});

const emit = defineEmits(['update:modelValue', 'change', 'search', 'retry', 'focus', 'blur']);

const searchInput = ref(null);
const searchTerm = ref('');
const employees = ref([]);
const isLoading = ref(false);
const hasError = ref(false);
const errorMessage = ref('');
const isDropdownOpen = ref(false);
const selectedEmployee = ref(null);
const hoveredOptionId = ref(null);

const dropdownId = computed(() => `employee-select-dropdown-${Math.random().toString(36).substr(2, 9)}`);

const filteredEmployees = computed(() => {
  if (!searchTerm.value) {
    return employees.value;
  }
  
  const term = searchTerm.value.toLowerCase();
  return employees.value.filter(emp => 
    emp.name.toLowerCase().includes(term) ||
    (emp.position && emp.position.toLowerCase().includes(term))
  );
});

const emptyMessage = computed(() => {
  if (searchTerm.value) {
    return `Не найдено сотрудников по запросу "${searchTerm.value}"`;
  }
  return 'Нет сотрудников сектора 1С';
});

let debounceTimer = null;
const DEBOUNCE_DELAY = 300;

async function loadEmployees(search = '') {
  if (isLoading.value) return;
  
  isLoading.value = true;
  hasError.value = false;
  errorMessage.value = '';
  
  try {
    const result = await fetchEmployees({
      search,
      limit: 20,
      sectorId: props.sectorId
    });
    
    employees.value = result;
    
    // Если есть выбранный сотрудник, найти его в списке
    if (props.modelValue && !selectedEmployee.value) {
      selectedEmployee.value = result.find(emp => emp.id === props.modelValue) || null;
      if (selectedEmployee.value) {
        searchTerm.value = selectedEmployee.value.name;
      }
    }
  } catch (error) {
    hasError.value = true;
    errorMessage.value = error.message || 'Ошибка загрузки сотрудников';
    console.error('[EmployeeSelect] Ошибка загрузки:', error);
  } finally {
    isLoading.value = false;
  }
}

function handleInput(event) {
  const value = event.target.value;
  searchTerm.value = value;
  
  // Дебаунс поиска
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    if (value.length >= 2 || value.length === 0) {
      loadEmployees(value);
      emit('search', value);
    }
  }, DEBOUNCE_DELAY);
  
  // Очистка выбора при изменении поиска
  if (selectedEmployee.value && value !== selectedEmployee.value.name) {
    selectedEmployee.value = null;
    emit('update:modelValue', null);
  }
  
  isDropdownOpen.value = true;
}

function handleFocus() {
  isDropdownOpen.value = true;
  if (employees.value.length === 0 && !isLoading.value) {
    loadEmployees();
  }
  emit('focus');
}

function handleBlur(event) {
  // Задержка для обработки клика по опции
  setTimeout(() => {
    if (!event.relatedTarget || !event.relatedTarget.closest('.employee-select-dropdown')) {
      isDropdownOpen.value = false;
      emit('blur');
    }
  }, 200);
}

function handleKeydown(event) {
  if (event.key === 'Escape') {
    isDropdownOpen.value = false;
    searchInput.value?.blur();
  } else if (event.key === 'Enter' && hoveredOptionId.value) {
    const employee = filteredEmployees.value.find(emp => emp.id === hoveredOptionId.value);
    if (employee) {
      handleSelect(employee);
    }
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    // Навигация по списку (опционально)
  }
}

function handleSelect(employee) {
  selectedEmployee.value = employee;
  searchTerm.value = employee.name;
  isDropdownOpen.value = false;
  searchInput.value?.blur();
  
  emit('update:modelValue', employee.id);
  emit('change', employee);
}

function handleClear() {
  selectedEmployee.value = null;
  searchTerm.value = '';
  emit('update:modelValue', null);
  emit('change', null);
  searchInput.value?.focus();
}

function handleRetry() {
  loadEmployees(searchTerm.value);
  emit('retry');
}

function handleOptionHover(id) {
  hoveredOptionId.value = id;
}

function isSelected(id) {
  return props.modelValue === id;
}

// Загрузка при монтировании, если есть значение
watch(() => props.modelValue, async (newValue) => {
  if (newValue && !selectedEmployee.value) {
    await loadEmployees();
    selectedEmployee.value = employees.value.find(emp => emp.id === newValue) || null;
    if (selectedEmployee.value) {
      searchTerm.value = selectedEmployee.value.name;
    }
  }
}, { immediate: true });

// Обработка клика вне компонента
function handleClickOutside(event) {
  if (!event.target.closest('.employee-select-container')) {
    isDropdownOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  if (props.modelValue) {
    loadEmployees();
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
});
</script>

<style scoped>
.employee-select-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.employee-select-label {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
  margin: 0;
}

.required-mark {
  color: #dc2626;
}

.employee-select-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.employee-select-input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  color: #374151;
  background-color: #ffffff;
  transition: border-color 0.2s ease;
  outline: none;
}

.employee-select-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.employee-select-input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.employee-select-wrapper.has-error .employee-select-input {
  border-color: #dc2626;
}

.employee-select-loader {
  position: absolute;
  right: 32px;
  display: flex;
  align-items: center;
}

.loader-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.employee-select-clear {
  position: absolute;
  right: 8px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  border-radius: 4px;
  transition: color 0.2s ease;
}

.employee-select-clear:hover {
  color: #374151;
}

.employee-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  max-height: 240px;
  overflow-y: auto;
  background-color: #ffffff;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.employee-select-list {
  list-style: none;
  margin: 0;
  padding: 4px;
}

.employee-select-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background-color 0.15s ease;
}

.employee-select-option:hover,
.employee-select-option:focus {
  background-color: #f3f4f6;
}

.employee-select-option.is-selected {
  background-color: #dbeafe;
}

.option-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.option-position {
  font-size: 12px;
  color: #6b7280;
}

.employee-select-error,
.employee-select-empty {
  padding: 16px;
  text-align: center;
}

.error-message {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #dc2626;
}

.error-retry-btn {
  padding: 6px 12px;
  background-color: #3b82f6;
  color: #ffffff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.error-retry-btn:hover {
  background-color: #2563eb;
}

.employee-select-hint {
  font-size: 12px;
  color: #6b7280;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
```

---

### Шаг 4. Обновление GraphStateDashboard.vue

**Файл:** `vue-app/src/components/graph-state/GraphStateDashboard.vue`

#### 4.1. Замена текущих фильтров

**Было (строки 106-135):**
```vue
<div class="filter-group">
  <label class="filter-label">Этапы:</label>
  <div class="checkbox-group">
    <label class="checkbox-item">
      <input type="checkbox" v-model="filters.stages.formed" @change="applyFilters" />
      <span>Сформировано обращение</span>
    </label>
    <!-- ... -->
  </div>
</div>
```

**Стало:**
```vue
<StageChips
  v-model="filters.stages"
  :options="stageOptions"
  :multiple="true"
  :title="'Этапы:'"
  :hint="'Выберите одну или несколько стадий для фильтрации'"
  @change="handleStagesChange"
/>
```

**Было (строки 137-159):**
```vue
<div class="filter-group">
  <label class="filter-label">Сотрудники:</label>
  <select v-model="filters.employees" multiple @change="applyFilters" class="employees-select" size="5">
    <option value="all">Все сотрудники</option>
    <option v-for="employee in availableEmployees" :key="employee.id" :value="employee.id">
      {{ employee.name }}
    </option>
  </select>
  <!-- ... -->
</div>
```

**Стало:**
```vue
<EmployeeSelect
  v-model="filters.employee"
  :label="'Сотрудник:'"
  :placeholder="'Выберите сотрудника сектора 1С'"
  :hint="'Начните вводить имя для поиска'"
  @change="handleEmployeeChange"
/>
```

#### 4.2. Импорты и setup

```vue
<script setup>
// ... существующие импорты
import StageChips from './filters/StageChips.vue';
import EmployeeSelect from './filters/EmployeeSelect.vue';

// ... существующий код

// Опции стадий
const stageOptions = computed(() => [
  { id: 'formed', label: 'Сформировано обращение', count: null },
  { id: 'review', label: 'Рассмотрение ТЗ', count: null },
  { id: 'execution', label: 'Исполнение', count: null }
]);

// Обработчики
function handleStagesChange(value) {
  filters.value.stages = value;
  applyFilters();
}

function handleEmployeeChange(employee) {
  filters.value.employee = employee ? employee.id : null;
  applyFilters();
}
</script>
```

---

### Шаг 5. Стилизация и доступность

#### 5.1. Глобальные стили (если нужны)

**Файл:** `vue-app/src/components/graph-state/filters/filters-common.css`

```css
/* Общие стили для фильтров */
.filters-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 24px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.filters-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

/* Сетка 8px для отступов */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Доступность: фокус для всех интерактивных элементов */
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .filters-panel {
    padding: 12px;
  }
  
  .stage-chips-list {
    flex-direction: column;
  }
}
```

#### 5.2. ARIA-атрибуты

- `role="group"` для контейнера стадий
- `aria-pressed` для кнопок стадий
- `role="listbox"` для выпадающего списка сотрудников
- `aria-selected` для опций
- `aria-expanded`, `aria-haspopup`, `aria-controls` для инпута поиска

---

### Шаг 6. Тестирование

#### 6.1. Чек-лист функциональности

- [ ] **StageChips:**
  - [ ] Отображение всех стадий с корректными названиями
  - [ ] Выбор одной стадии (single mode)
  - [ ] Выбор нескольких стадий (multiple mode)
  - [ ] Состояния: active, hover, disabled
  - [ ] Отображение счётчика тикетов (если передан)
  - [ ] Сброс выбора
  - [ ] Фокус и навигация с клавиатуры

- [ ] **EmployeeSelect:**
  - [ ] Загрузка сотрудников при фокусе
  - [ ] Поиск с дебаунсом (300 мс)
  - [ ] Отображение списка сотрудников
  - [ ] Выбор сотрудника
  - [ ] Очистка выбора
  - [ ] Состояния: loading, error, empty
  - [ ] Кнопка "Повторить" при ошибке
  - [ ] Кэширование результатов
  - [ ] Навигация с клавиатуры (Enter, Escape, Arrow keys)

- [ ] **Интеграция:**
  - [ ] Обновление графика при изменении фильтров
  - [ ] Сохранение состояния фильтров (опционально)
  - [ ] Сброс всех фильтров
  - [ ] Мобильная версия (адаптивность)

#### 6.2. Тестирование состояний

- [ ] Пустой список сотрудников (нет данных)
- [ ] Ошибка загрузки сотрудников (недоступен API)
- [ ] Долгая загрузка (показ лоадера)
- [ ] Поиск без результатов
- [ ] Выбор всех стадий / сброс всех стадий

#### 6.3. Тестирование доступности

- [ ] Навигация с клавиатуры (Tab, Enter, Escape)
- [ ] Чтение через screen reader (ARIA-атрибуты)
- [ ] Контрастность цветов (WCAG AA)
- [ ] Фокус-индикаторы видны

---

## Артефакты этапа

- Компонент `StageChips.vue` с контейнером и состояниями
- Компонент `EmployeeSelect.vue` с поиском и обработкой ошибок
- API-модуль `api/sector1cEmployees.js` с кэшированием
- Обновлённый `GraphStateDashboard.vue` с новыми компонентами
- Стили по Bitrix24 UI (сетка 8px, контейнеры)
- Обновлённая документация компонентов

---

## Критерии приёмки

- [ ] Компонент `StageChips` отображает стадии в контейнере с фоном и бордером (не «в воздухе»)
- [ ] Компонент `EmployeeSelect` загружает сотрудников сектора 1С через API
- [ ] Поиск сотрудников работает с дебаунсом 300 мс
- [ ] Все состояния (loading/error/empty) обрабатываются корректно
- [ ] Стили соответствуют Bitrix24 UI (сетка 8px, контейнеры, цвета)
- [ ] Доступность: ARIA-атрибуты, навигация с клавиатуры, фокус-индикаторы
- [ ] Фильтры интегрированы в `GraphStateDashboard.vue` и обновляют график
- [ ] Код протестирован на всех сценариях использования
- [ ] Нет ошибок в консоли браузера
- [ ] Компоненты работают на мобильных устройствах (адаптивность)

---

## Вопросы для уточнения

1. **Источник данных сотрудников:** Bitrix24 `user.get` или внутренний API `/api/sector1c/employees`?  
2. **ID подразделения сектора 1С:** какой конкретный ID использовать в фильтре `UF_DEPARTMENT`?  
3. **Счётчики тикетов:** нужно ли отображать количество тикетов на каждой стадии в `StageChips`?  
4. **Сохранение фильтров:** нужно ли сохранять выбранные фильтры в localStorage/sessionStorage?  
5. **Множественный выбор сотрудников:** нужен ли multiple select для сотрудников или достаточно одного?

---

## История правок

- 2025-12-11 13:15 (UTC+3, Брест): Создан документ этапа 4 — реализация компонентов фильтров

