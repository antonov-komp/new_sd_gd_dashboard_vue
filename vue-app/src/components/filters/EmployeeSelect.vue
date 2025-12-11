<template>
  <div class="employee-select" ref="selectContainer">
    <!-- Поле для открытия выпадающего списка -->
    <div
      class="employee-select-field"
      @click="toggleDropdown"
      :class="{
        'employee-select-field--open': isDropdownOpen,
        'employee-select-field--disabled': isLoading
      }"
    >
      <span class="employee-select-field-text">
        {{ displayText }}
      </span>
      <span class="employee-select-field-icon" :class="{ 'open': isDropdownOpen }">▼</span>
    </div>
    
    <!-- Выпадающий список -->
    <Transition name="dropdown-fade">
      <div
        v-if="isDropdownOpen"
        class="employee-select-dropdown"
      >
        <!-- Поле поиска внутри выпадающего списка -->
        <div class="employee-select-dropdown-search">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="🔍 Поиск сотрудника..."
            class="employee-select-search-input"
            @input="handleSearch"
            @click.stop
            ref="searchInput"
          />
        </div>
        
        <!-- Состояние загрузки -->
        <div v-if="isLoading" class="employee-select-state">
          <span class="spinner">⏳</span>
          <span>Загрузка сотрудников сектора 1С...</span>
        </div>
        
        <!-- Состояние ошибки -->
        <div v-else-if="error" class="employee-select-state employee-select-state--error">
          <span>❌ {{ error.message || 'Ошибка загрузки сотрудников' }}</span>
          <button @click="retry" class="btn-retry" @click.stop>Повторить</button>
        </div>
        
        <!-- Состояние пустого результата -->
        <div v-else-if="!isLoading && filteredEmployees.length === 0 && !error" class="employee-select-state">
          <span>📭 {{ emptyMessage }}</span>
        </div>
        
        <!-- Список сотрудников -->
        <div v-else class="employee-select-list" :style="{ maxHeight: `${maxHeight}px` }">
          <!-- Опция "Все сотрудники" -->
          <label
            :class="[
              'employee-select-item',
              {
                'employee-select-item--selected': isSelected('all')
              }
            ]"
            @click.stop
          >
            <input
              type="checkbox"
              :checked="isSelected('all')"
              @change="handleToggle('all')"
            />
            <div class="employee-select-item-content">
              <span class="employee-select-item-name">Все сотрудники</span>
            </div>
          </label>
          
          <!-- Список сотрудников -->
          <label
            v-for="employee in filteredEmployees"
            :key="employee.id"
            :class="[
              'employee-select-item',
              {
                'employee-select-item--selected': isSelected(employee.id)
              }
            ]"
            @click.stop
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
      </div>
    </Transition>
  </div>
</template>

<script setup>
/**
 * Компонент выбора сотрудников сектора 1С
 * 
 * Поиск и множественный выбор сотрудников с состояниями loading/empty/error
 */

import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { fetchEmployees } from '@/api/sector1cEmployees.js';
import { debounce } from '@/utils/debounce.js';

const props = defineProps({
  /**
   * Выбранные сотрудники (массив ID или 'all')
   */
  selected: {
    type: Array,
    default: () => ['all']
  },
  /**
   * Множественный выбор
   */
  multiple: {
    type: Boolean,
    default: true
  },
  /**
   * Placeholder для поля
   */
  placeholder: {
    type: String,
    default: 'Выберите сотрудников сектора 1С'
  },
  /**
   * Максимальная высота списка (в пикселях)
   */
  maxHeight: {
    type: Number,
    default: 300
  }
});

const emit = defineEmits(['update:selected', 'search', 'error']);

const selectContainer = ref(null);
const searchInput = ref(null);
const searchQuery = ref('');
const employees = ref([]);
const isLoading = ref(false);
const error = ref(null);
const isDropdownOpen = ref(false);

// Дебаунс поиска (300ms)
const debouncedSearch = debounce(async (query) => {
  await loadEmployees(query);
}, 300);

/**
 * Отфильтрованные сотрудники (поиск на клиенте)
 */
const filteredEmployees = computed(() => {
  if (!searchQuery.value) {
    return employees.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return employees.value.filter(emp => 
    emp.name.toLowerCase().includes(query) ||
    (emp.position && emp.position.toLowerCase().includes(query))
  );
});

/**
 * Текст для отображения в поле
 */
const displayText = computed(() => {
  // Если выбрано "Все сотрудники" или ничего не выбрано - показываем placeholder
  if (props.selected.includes('all') || props.selected.length === 0) {
    return props.placeholder;
  }
  
  // Если выбран один сотрудник - показываем его имя
  if (props.selected.length === 1) {
    const employee = employees.value.find(emp => emp.id === props.selected[0]);
    return employee ? employee.name : props.placeholder;
  }
  
  // Если выбрано несколько - показываем количество
  return `Выбрано: ${props.selected.length} ${pluralize(props.selected.length, 'сотрудника', 'сотрудников', 'сотрудников')}`;
});

/**
 * Загрузка сотрудников
 */
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

/**
 * Обработка поиска
 */
function handleSearch() {
  emit('search', searchQuery.value);
  // Поиск на клиенте из уже загруженных сотрудников
  // Если нужно, можно добавить серверный поиск через debouncedSearch
}

/**
 * Переключение выпадающего списка
 */
function toggleDropdown() {
  if (isLoading.value) return;
  
  isDropdownOpen.value = !isDropdownOpen.value;
  
  if (isDropdownOpen.value) {
    // Загружаем сотрудников при первом открытии
    if (employees.value.length === 0) {
      loadEmployees();
    }
    
    // Фокус на поле поиска после открытия
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  } else {
    // Очищаем поиск при закрытии
    searchQuery.value = '';
  }
}

/**
 * Закрытие выпадающего списка при клике вне компонента
 */
function handleClickOutside(event) {
  if (selectContainer.value && !selectContainer.value.contains(event.target)) {
    isDropdownOpen.value = false;
    searchQuery.value = '';
  }
}

/**
 * Обработка переключения выбора сотрудника
 */
function handleToggle(employeeId) {
  const newSelected = [...props.selected];
  const index = newSelected.indexOf(employeeId);
  
  if (employeeId === 'all') {
    // Если выбрано "Все сотрудники", очищаем остальные
    if (index > -1) {
      // Убираем "all"
      newSelected.splice(index, 1);
    } else {
      // Выбираем только "all"
      return emit('update:selected', ['all']);
    }
  } else {
    // Если выбран конкретный сотрудник
    if (index > -1) {
      // Убираем сотрудника
      newSelected.splice(index, 1);
    } else {
      // Добавляем сотрудника и убираем "all"
      const allIndex = newSelected.indexOf('all');
      if (allIndex > -1) {
        newSelected.splice(allIndex, 1);
      }
      newSelected.push(employeeId);
    }
  }
  
  emit('update:selected', newSelected);
}

/**
 * Проверка, выбран ли сотрудник
 */
function isSelected(employeeId) {
  if (employeeId === 'all') {
    return props.selected.includes('all');
  }
  return props.selected.includes(employeeId) || props.selected.includes('all');
}

/**
 * Сообщение для пустого состояния
 */
const emptyMessage = computed(() => {
  return searchQuery.value
    ? `Нет сотрудников по запросу "${searchQuery.value}"`
    : 'Нет сотрудников сектора 1С';
});

/**
 * Склонение слова "сотрудник"
 */
function pluralize(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}

/**
 * Повторная попытка загрузки
 */
function retry() {
  loadEmployees(searchQuery.value);
}

// Инициализация: если selected пустой, устанавливаем 'all'
watch(() => props.selected, (newValue) => {
  if (!newValue || newValue.length === 0) {
    emit('update:selected', ['all']);
  }
}, { immediate: true });

// Обработка кликов вне компонента
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
  
  // Если selected пустой при монтировании, устанавливаем 'all'
  if (!props.selected || props.selected.length === 0) {
    emit('update:selected', ['all']);
  }
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.employee-select {
  position: relative;
  width: 100%;
}

.employee-select-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
  cursor: pointer;
  transition: all var(--transition-base);
  min-height: 40px;
}

.employee-select-field:hover:not(.employee-select-field--disabled) {
  border-color: var(--b24-primary);
}

.employee-select-field--open {
  border-color: var(--b24-primary);
  border-width: 2px;
}

.employee-select-field--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.employee-select-field-text {
  flex: 1;
  color: var(--b24-text-primary);
  text-align: left;
}

.employee-select-field-icon {
  font-size: 12px;
  color: var(--b24-text-secondary);
  transition: transform var(--transition-base);
  margin-left: var(--spacing-xs);
}

.employee-select-field-icon.open {
  transform: rotate(180deg);
}

.employee-select-dropdown {
  position: absolute;
  top: calc(100% + var(--spacing-xs));
  left: 0;
  right: 0;
  background-color: var(--b24-bg-white);
  border: 1px solid var(--b24-border-light);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  overflow: hidden;
}

.employee-select-dropdown-search {
  padding: var(--spacing-sm);
  border-bottom: 1px solid var(--b24-border-light);
}

.employee-select-search-input {
  width: 100%;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
  transition: border-color var(--transition-base);
}

.employee-select-search-input:focus {
  outline: none;
  border-color: var(--b24-primary);
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
  border-bottom: 1px solid var(--b24-border-light);
}

.employee-select-item:last-child {
  border-bottom: none;
}

.employee-select-item:hover {
  background-color: var(--b24-bg-light);
}

.employee-select-item--selected {
  background-color: var(--b24-primary-lighter);
  border-left: 3px solid var(--b24-primary);
}

.employee-select-item input[type="checkbox"] {
  cursor: pointer;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
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
  text-align: center;
}

.employee-select-state--error {
  color: var(--b24-danger);
  flex-direction: column;
  gap: var(--spacing-xs);
}

.spinner {
  font-size: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.btn-retry {
  padding: var(--spacing-xs) var(--spacing-sm);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.btn-retry:hover {
  background-color: var(--b24-primary-hover);
}

/* Анимация выпадающего списка */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--transition-base), transform var(--transition-base);
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Адаптивность */
@media (max-width: 768px) {
  .employee-select-dropdown {
    max-width: 100vw;
  }
  
  .employee-select-list {
    max-height: 200px;
  }
}
</style>

