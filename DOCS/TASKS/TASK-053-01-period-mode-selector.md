# TASK-053-01: Создание переключателя режимов периода

**Дата создания:** 2025-12-17 13:30 (UTC+3, Брест)  
**Статус:** 📋 Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-053: Изменение формата выбора периода и внедрение 3-месячного режима](./TASK-053-period-selection-3-months-mode.md)  
**Этап:** 1.1 (Часть 1: Изменение формата выбора периода)

---

## 📋 Описание

Создать компонент переключателя режимов периода для модуля «График приёма и закрытий сектора 1С». Компонент должен позволять пользователю выбирать между двумя режимами:
1. **4 последние недели** (текущий режим)
2. **3 последних месяца** (новый режим)

Переключатель должен сохранять выбор пользователя в localStorage и интегрироваться в существующий интерфейс модуля.

---

## 🎯 Контекст

### Текущее состояние

**Текущий формат выбора периода:**
- Используется компонент `WeekPicker` с барабаном прокрутки
- Выбор конкретной недели из списка (52 недели назад + 4 недели вперёд)
- Компонент находится в `FiltersPanel.vue` с пропом `weekPickerMode: true`

**Проблема:**
- Глобально не нужен выбор конкретных недель
- Пользователям нужен выбор между двумя режимами: недельный и месячный
- Текущий подход с барабаном прокрутки избыточен

### Требуемое состояние

**Новый формат выбора периода:**
- Переключатель между двумя режимами: "4 последние недели" и "3 последних месяца"
- Сохранение выбора в localStorage
- Интеграция в `GraphAdmissionClosureDashboard.vue`
- Замена `WeekPicker` на новый переключатель

---

## 🔧 Технические требования

### Компонент: PeriodModeSelector.vue

**Расположение:** `vue-app/src/components/graph-admission-closure/PeriodModeSelector.vue`

**Props:**
```typescript
{
  modelValue: 'weeks' | 'months',  // Текущий выбранный режим
}
```

**Emits:**
```typescript
{
  'update:modelValue': (value: 'weeks' | 'months') => void,  // Обновление выбранного режима
  'change': (value: 'weeks' | 'months') => void,  // Событие изменения режима
}
```

**Функциональность:**
- Два варианта выбора: "4 последние недели" и "3 последних месяца"
- Визуально: radio buttons или toggle switch (на выбор разработчика)
- Сохранение выбора в localStorage при изменении
- Ключ localStorage: `graph-admission-closure-period-mode`
- Значение по умолчанию: `'weeks'` (4 последние недели)

**Визуальный дизайн:**
- Соответствие гайдлайнам Bitrix24 UI
- Использование CSS-переменных Bitrix24
- Адаптивность (работа на мобильных устройствах)
- Доступность (ARIA-атрибуты, навигация с клавиатуры)

### Интеграция в GraphAdmissionClosureDashboard.vue

**Изменения:**
1. Убрать проп `weekPickerMode` из `FiltersPanel`
2. Убрать проп `selectedWeek` из `FiltersPanel`
3. Добавить состояние `periodMode: ref<'weeks' | 'months'>('weeks')`
4. Загружать значение из localStorage при монтировании
5. Добавить компонент `PeriodModeSelector` в интерфейс
6. Обновить логику `loadData()` для работы с `periodMode`

**Логика загрузки данных:**
- Если `periodMode === 'weeks'` → использовать текущую логику (4 недели)
- Если `periodMode === 'months'` → пока не реализовано (будет в следующих этапах)

### Обновление FiltersPanel.vue

**Изменения:**
- Убрать или оставить логику `weekPickerMode` для обратной совместимости
- Если `weekPickerMode === false` → показывать `PeriodModeSelector`
- Сохранить обратную совместимость с другими модулями

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание компонента PeriodModeSelector.vue

1. **Создать файл компонента:**
   ```bash
   touch vue-app/src/components/graph-admission-closure/PeriodModeSelector.vue
   ```

2. **Реализовать структуру компонента:**
   - Template с двумя radio buttons или toggle switch
   - Script setup с props и emits
   - Стили в соответствии с гайдлайнами Bitrix24

3. **Добавить логику сохранения в localStorage:**
   - При изменении режима сохранять в `localStorage.setItem('graph-admission-closure-period-mode', value)`
   - При монтировании загружать из localStorage

4. **Добавить обработчики событий:**
   - `@change` для обновления `modelValue`
   - `@update:modelValue` для v-model

### Шаг 2: Интеграция в GraphAdmissionClosureDashboard.vue

1. **Импортировать компонент:**
   ```javascript
   import PeriodModeSelector from './PeriodModeSelector.vue';
   ```

2. **Добавить состояние:**
   ```javascript
   const periodMode = ref<'weeks' | 'months'>('weeks');
   
   // Загрузка из localStorage при монтировании
   onMounted(() => {
     const savedMode = localStorage.getItem('graph-admission-closure-period-mode');
     if (savedMode === 'weeks' || savedMode === 'months') {
       periodMode.value = savedMode;
     }
   });
   ```

3. **Добавить компонент в template:**
   - Разместить перед или внутри `FiltersPanel`
   - Передать `v-model="periodMode"`

4. **Обновить логику `loadData()`:**
   - Добавить проверку `periodMode.value`
   - Если `periodMode.value === 'weeks'` → использовать текущую логику
   - Если `periodMode.value === 'months'` → показывать сообщение "Режим в разработке" или не загружать данные

### Шаг 3: Обновление FiltersPanel.vue

1. **Убрать или оставить `weekPickerMode`:**
   - Если используется в других модулях → оставить для обратной совместимости
   - Если нет → убрать

2. **Добавить условный рендеринг:**
   - Если `weekPickerMode === true` → показывать `WeekPicker` (старая логика)
   - Если `weekPickerMode === false` или не передан → показывать `PeriodModeSelector` (новая логика)

---

## 🔍 Детали реализации

### Логика работы с localStorage

**Ключ хранения:** `graph-admission-closure-period-mode`

**Значения:**
- `'weeks'` — режим "4 последние недели" (по умолчанию)
- `'months'` — режим "3 последних месяца"

**Обработка ошибок:**
- Если значение в localStorage некорректно → использовать значение по умолчанию `'weeks'`
- Если localStorage недоступен (например, в приватном режиме) → использовать значение по умолчанию
- Логировать предупреждения в консоль при некорректных значениях

**Синхронизация между вкладками:**
- Использовать событие `storage` для синхронизации выбора между вкладками браузера
- При изменении значения в одной вкладке обновлять в других

### Валидация props

**Проверка значения `modelValue`:**
```javascript
validator: (value) => {
  if (!['weeks', 'months'].includes(value)) {
    console.warn(`[PeriodModeSelector] Invalid modelValue: ${value}. Using default 'weeks'.`);
    return false;
  }
  return true;
}
```

### Обработка событий

**Событие `change`:**
- Эмитится при каждом изменении режима
- Используется для перезагрузки данных в родительском компоненте

**Событие `update:modelValue`:**
- Используется для v-model
- Должно эмититься синхронно с `change`

### Адаптивность

**Breakpoints:**
- Desktop (> 1024px): горизонтальное расположение опций
- Tablet (768px - 1024px): вертикальное расположение опций
- Mobile (< 768px): вертикальное расположение, уменьшенные отступы

**Доступность:**
- Все интерактивные элементы должны быть доступны с клавиатуры
- ARIA-атрибуты для screen readers
- Фокус должен быть видимым

## 💻 Примеры кода

### PeriodModeSelector.vue

```vue
<template>
  <div class="period-mode-selector">
    <h3 class="selector-title">
      <span class="selector-icon">📅</span>
      Режим отображения
    </h3>
    <div class="selector-options">
      <label 
        class="option-label"
        :class="{ 'option-selected': modelValue === 'weeks' }"
      >
        <input
          type="radio"
          :value="'weeks'"
          :checked="modelValue === 'weeks'"
          @change="handleChange('weeks')"
          class="option-input"
          aria-label="4 последние недели"
        />
        <span class="option-text">
          <span class="option-icon">📅</span>
          4 последние недели
        </span>
      </label>
      
      <label 
        class="option-label"
        :class="{ 'option-selected': modelValue === 'months' }"
      >
        <input
          type="radio"
          :value="'months'"
          :checked="modelValue === 'months'"
          @change="handleChange('months')"
          class="option-input"
          aria-label="3 последних месяца"
        />
        <span class="option-text">
          <span class="option-icon">📊</span>
          3 последних месяца
        </span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    required: true,
    validator: (value) => ['weeks', 'months'].includes(value)
  }
});

const emit = defineEmits(['update:modelValue', 'change']);

const STORAGE_KEY = 'graph-admission-closure-period-mode';

/**
 * Обработка изменения режима
 */
/**
 * Обработка изменения режима
 * 
 * @param {string} value - Новое значение режима ('weeks' | 'months')
 */
function handleChange(value) {
  // Валидация значения
  if (!['weeks', 'months'].includes(value)) {
    console.warn(`[PeriodModeSelector] Invalid value: ${value}. Ignoring change.`);
    return;
  }
  
  try {
    // Сохранение в localStorage
    localStorage.setItem(STORAGE_KEY, value);
    
    // Эмит событий
    emit('update:modelValue', value);
    emit('change', value);
  } catch (error) {
    // Обработка ошибок localStorage (например, в приватном режиме)
    console.warn('[PeriodModeSelector] Failed to save to localStorage:', error);
    // Всё равно эмитим события, но без сохранения
    emit('update:modelValue', value);
    emit('change', value);
  }
}

// Загрузка из localStorage при монтировании
onMounted(() => {
  try {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (savedMode === 'weeks' || savedMode === 'months') {
      if (savedMode !== props.modelValue) {
        emit('update:modelValue', savedMode);
      }
    }
  } catch (error) {
    console.warn('[PeriodModeSelector] Failed to read from localStorage:', error);
  }
  
  // Синхронизация между вкладками
  window.addEventListener('storage', handleStorageChange);
});

// Очистка при размонтировании
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange);
});

/**
 * Обработка изменения localStorage в других вкладках
 */
function handleStorageChange(event) {
  if (event.key === STORAGE_KEY && event.newValue) {
    if (event.newValue === 'weeks' || event.newValue === 'months') {
      if (event.newValue !== props.modelValue) {
        emit('update:modelValue', event.newValue);
      }
    }
  }
}
</script>

<style scoped>
.period-mode-selector {
  padding: var(--spacing-md, 16px);
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.selector-title {
  margin: 0 0 var(--spacing-md, 16px) 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.selector-icon {
  font-size: 20px;
}

.selector-options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.option-label {
  display: flex;
  align-items: center;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
  border: 2px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  background-color: var(--b24-bg-white, #ffffff);
}

.option-label:hover {
  border-color: var(--b24-primary, #007bff);
  background-color: var(--b24-bg-light, #f5f7fb);
}

.option-label.option-selected {
  border-color: var(--b24-primary, #007bff);
  background-color: var(--b24-primary-light, #e7f3ff);
}

.option-input {
  margin-right: var(--spacing-sm, 8px);
  cursor: pointer;
}

.option-text {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-primary, #111827);
  flex: 1;
}

.option-icon {
  font-size: 18px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .selector-options {
    gap: var(--spacing-xs, 4px);
  }
  
  .option-label {
    padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
  }
}
</style>
```

### Интеграция в GraphAdmissionClosureDashboard.vue

```vue
<template>
  <div class="ac-dashboard">
    <!-- ... существующий код ... -->
    
    <div class="dashboard-layout">
      <div class="filters-container">
        <!-- Новый переключатель режимов -->
        <PeriodModeSelector
          v-model="periodMode"
          @change="handlePeriodModeChange"
        />
        
        <FiltersPanel
          :stages="filters.stages"
          :employees="filters.employees"
          :dateRange="filters.dateRange"
          :customDateRange="filters.customDateRange"
          :hasActiveFilters="hasActiveFilters"
          :hideStages="true"
          :weekPickerMode="false"
          @update:stages="updateStages"
          @update:employees="updateEmployees"
          @update:dateRange="updateDateRange"
          @update:customDateRange="updateCustomDateRange"
          @reset="resetFilters"
          @apply="applyFilters"
        />
      </div>
      
      <!-- ... остальной код ... -->
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import PeriodModeSelector from './PeriodModeSelector.vue';
// ... остальные импорты ...

const periodMode = ref<'weeks' | 'months'>('weeks');

/**
 * Загрузка режима из localStorage
 */
onMounted(() => {
  const savedMode = localStorage.getItem('graph-admission-closure-period-mode');
  if (savedMode === 'weeks' || savedMode === 'months') {
    periodMode.value = savedMode;
  }
});

/**
 * Обработка изменения режима периода
 */
function handlePeriodModeChange(mode) {
  periodMode.value = mode;
  // Перезагрузка данных при изменении режима
  loadData();
}

/**
 * Обновлённая функция загрузки данных
 */
async function loadData() {
  isLoading.value = true;
  error.value = null;
  
  try {
    if (periodMode.value === 'weeks') {
      // Текущая логика для 4 недель
      // ... существующий код ...
    } else if (periodMode.value === 'months') {
      // Логика для 3 месяцев (будет реализована в следующих этапах)
      console.warn('Режим "3 месяца" пока не реализован');
      // TODO: Реализовать загрузку данных за 3 месяца
    }
  } catch (err) {
    error.value = err instanceof Error ? err : new Error('Неизвестная ошибка загрузки');
    console.error('[GraphAdmissionClosureDashboard] loadData error:', err);
  } finally {
    isLoading.value = false;
  }
}
</script>
```

---

## ✅ Критерии приёмки

- [ ] Компонент `PeriodModeSelector.vue` создан и работает корректно
- [ ] Переключатель отображает два варианта: "4 последние недели" и "3 последних месяца"
- [ ] Выбор режима сохраняется в localStorage при изменении
- [ ] Значение загружается из localStorage при монтировании компонента
- [ ] Компонент интегрирован в `GraphAdmissionClosureDashboard.vue`
- [ ] Убран `WeekPicker` из интерфейса (или скрыт условно)
- [ ] При переключении режима вызывается `loadData()`
- [ ] Режим "4 недели" работает как раньше (обратная совместимость)
- [ ] Компонент соответствует гайдлайнам Bitrix24 UI
- [ ] Компонент адаптивен (работает на мобильных устройствах)
- [ ] Добавлены ARIA-атрибуты для доступности
- [ ] Навигация с клавиатуры работает корректно

---

## 🔗 Зависимости

**Зависит от:**
- Нет (это первый этап)

**Зависит от этого этапа:**
- [TASK-053-02: Создание информационного попапа](./TASK-053-02-period-mode-info-modal.md) — может использовать сохранённый режим
- [TASK-053-03: Backend API для 3-месячного режима](./TASK-053-03-backend-api-3-months.md) — будет использовать `periodMode` для запросов

---

## 📝 История правок

- **2025-12-17 13:30 (UTC+3, Брест):** Создана подзадача TASK-053-01
  - Определены требования для создания переключателя режимов
  - Зафиксированы технические требования и примеры кода
  - Добавлены критерии приёмки

---

## 💡 Примечания

- **Визуальный дизайн:** Можно использовать как radio buttons, так и toggle switch — на выбор разработчика, главное соответствие гайдлайнам Bitrix24
- **Обратная совместимость:** Важно сохранить работу режима "4 недели" без изменений
- **LocalStorage:** Ключ должен быть уникальным для модуля, чтобы не конфликтовать с другими модулями
- **Тестирование:** Протестировать переключение режимов, сохранение в localStorage, загрузку из localStorage

