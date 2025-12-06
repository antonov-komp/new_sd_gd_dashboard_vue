# TASK-015-STEP-04: Оптимизация transitions и управления состоянием (TASK-011)

**Дата создания:** 2025-12-06 21:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Рефактор-менеджер  
**Родительская задача:** TASK-015  
**Связанная задача:** TASK-011

---

## 📋 Описание

Провести оптимизацию transitions и управления состоянием, реализованных в TASK-011, с целью создания единой точки управления transitions, выноса таймингов в конфигурацию и улучшения структуры кода.

**Цель:** Создать переиспользуемую систему управления transitions с конфигурируемыми таймингами и улучшенной структурой.

---

## 🎯 Контекст

**Текущее состояние (TASK-011):**

1. **Vue Transitions:**
   - Файл: `vue-app/src/components/dashboard/DashboardSector1C.vue`
   - Расположение: строки 13-22 (прелоадер), строки 25-38 (дашборд)
   - Реализация:
     ```vue
     <Transition name="preloader-fade">
       <LoadingPreloader v-if="isLoading || error || currentStep" ... />
     </Transition>
     
     <Transition name="dashboard-fade">
       <div v-if="!isLoading && !error && !currentStep" class="dashboard-content">
         ...
       </div>
     </Transition>
     ```
   - Тайминги захардкожены в CSS (строки 272-300)

2. **Управление состоянием:**
   - Файл: `vue-app/src/composables/useDashboardActions.js`
   - Состояние `isTransitioning`: строка 31 (`const isTransitioning = ref(false);`)
   - Логика управления: строки 102-116 (в `loadSectorData()` в блоке `finally`)
   - Текущая реализация:
     ```javascript
     setTimeout(() => {
       isTransitioning.value = true; // Начало fade-out
       setTimeout(() => {
         state.isLoading.value = false; // Начало fade-in (через 150мс)
       }, 150);
       setTimeout(() => {
         loadingProgress.reset();
         isTransitioning.value = false; // Завершение (через 400мс)
       }, 400);
     }, 800); // Показ "Готово!" на 800мс
     ```
   - Проблема: тайминги захардкожены (800мс, 150мс, 400мс)

3. **CSS Transitions:**
   - Файл: `vue-app/src/components/dashboard/DashboardSector1C.vue`
   - Стили: строки 272-300 (встроены в компонент)
   - Тайминги захардкожены:
     - `.preloader-fade-leave-active`: `transition: opacity 0.4s ease-out, transform 0.4s ease-out;` (строка 273)
     - `.dashboard-fade-enter-active`: `transition: opacity 0.4s ease-in, transform 0.4s ease-in;` (строка 288)
     - `.dashboard-fade-enter-active`: `transition-delay: 0.15s;` (строка 289)
   - Transform значения:
     - Прелоадер: `scale(1)` → `scale(0.95)` (строки 278, 283)
     - Дашборд: `translateY(10px)` → `translateY(0)` (строки 294, 299)

**Текущее использование:**

1. **В компоненте DashboardSector1C.vue:**
   - Transition компоненты: строки 13-22 (прелоадер), строки 25-38 (дашборд)
   - CSS transitions: строки 272-300
   - Состояние `isTransitioning`: экспортируется из `actions.isTransitioning` (строка 181)

2. **В композабле useDashboardActions.js:**
   - Состояние `isTransitioning`: строка 31
   - Логика управления: строки 102-116
   - Тайминги захардкожены: 800мс, 150мс, 400мс

3. **Поток данных:**
   - `loadSectorData()` → загрузка данных → показ "Готово!" (800мс) → начало fade-out → fade-in (150мс задержка) → завершение (400мс)
   - `isTransitioning` управляет синхронизацией анимаций

**Выявленные проблемы:**
1. Тайминги захардкожены в коде
   - JavaScript: 800мс, 150мс, 400мс (строки 102, 107, 112 useDashboardActions.js)
   - CSS: 0.4s, 0.15s (строки 273, 288, 289 DashboardSector1C.vue)
   - Нет единой точки управления таймингами
2. Нет единой точки управления transitions
   - Логика разбросана между `useDashboardActions.js` и `DashboardSector1C.vue`
   - Нет переиспользуемого композабла для transitions
3. Логика управления состоянием разбросана
   - `isTransitioning` объявлен в `useDashboardActions.js`
   - Используется в `DashboardSector1C.vue` через `actions.isTransitioning`
   - Логика с `setTimeout` встроена в `loadSectorData()`
4. Нет переиспользуемого композабла для transitions
   - Логика transitions не может быть использована в других компонентах
   - Нет единой точки управления transitions

---

## 🏗️ Модули и компоненты

### Файлы для рефакторинга:

1. **`vue-app/src/composables/useDashboardActions.js`**
   - Вынести логику управления transitions
   - Использовать композабл `useTransition`

2. **`vue-app/src/components/dashboard/DashboardSector1C.vue`**
   - Использовать конфигурацию transitions
   - Упростить логику transitions

3. **`vue-app/src/components/dashboard/LoadingPreloader.vue`**
   - Использовать конфигурацию transitions (если нужно)

### Новые файлы для создания:

1. **`vue-app/src/composables/useTransition.js`**
   - Композабл для управления transitions
   - Методы: `startTransition()`, `endTransition()`, `isTransitioning`

2. **`vue-app/src/services/dashboard-sector-1c/utils/transition-config.js`**
   - Конфигурация transitions
   - Тайминги, easing функции, задержки

---

## 📝 Ступенчатые подзадачи

### 1. Создание конфигурации transitions

**Файл:** `vue-app/src/services/dashboard-sector-1c/utils/transition-config.js`

**Структура:**
```javascript
/**
 * Конфигурация transitions для дашборда сектора 1С
 * 
 * Содержит тайминги, easing функции и задержки для всех transitions
 * 
 * Текущие значения взяты из реального кода:
 * - DashboardSector1C.vue: CSS transitions (строки 272-300)
 * - useDashboardActions.js: JavaScript тайминги (строки 102-116)
 */

/**
 * Конфигурация transition прелоадера
 * 
 * Соответствует текущей реализации в TASK-011:
 * - fade-out прелоадера: 400мс (строка 273 DashboardSector1C.vue)
 * - fade-in дашборда: 400мс (строка 288 DashboardSector1C.vue)
 * - задержка между fade-out и fade-in: 150мс (строка 289 DashboardSector1C.vue, строка 107 useDashboardActions.js)
 * - показ "Готово!": 800мс (строка 102 useDashboardActions.js)
 */
export const PRELOADER_TRANSITION = {
  /** Длительность fade-out прелоадера (мс) - соответствует 0.4s в CSS */
  fadeOutDuration: 400,
  /** Длительность fade-in дашборда (мс) - соответствует 0.4s в CSS */
  fadeInDuration: 400,
  /** Задержка между началом fade-out и fade-in (мс) - соответствует 0.15s в CSS */
  delayBetween: 150,
  /** Время показа "Готово!" перед началом перехода (мс) - соответствует 800мс в JS */
  readyDisplayTime: 800,
  /** Easing функция для fade-out - соответствует ease-out в CSS */
  fadeOutEasing: 'ease-out',
  /** Easing функция для fade-in - соответствует ease-in в CSS */
  fadeInEasing: 'ease-in',
  /** Transform для fade-out - соответствует scale(0.95) в CSS */
  fadeOutTransform: 'scale(0.95)',
  /** Transform для fade-in - соответствует translateY(10px) в CSS */
  fadeInTransform: 'translateY(10px)'
};

/**
 * Конфигурация transition дашборда
 */
export const DASHBOARD_TRANSITION = {
  /** Длительность fade-in (мс) */
  fadeInDuration: 400,
  /** Easing функция */
  fadeInEasing: 'ease-in',
  /** Transform для fade-in */
  fadeInTransform: 'translateY(10px)'
};

/**
 * Получение CSS transition строки
 * 
 * @param {number} duration - Длительность (мс)
 * @param {string} easing - Easing функция
 * @param {string} properties - Свойства для transition (по умолчанию 'opacity, transform')
 * @returns {string} CSS transition строка
 */
export function getTransitionString(duration, easing, properties = 'opacity, transform') {
  return `${properties} ${duration}ms ${easing}`;
}

/**
 * Получение CSS transition для прелоадера fade-out
 */
export function getPreloaderFadeOutTransition() {
  return getTransitionString(
    PRELOADER_TRANSITION.fadeOutDuration,
    PRELOADER_TRANSITION.fadeOutEasing
  );
}

/**
 * Получение CSS transition для дашборда fade-in
 */
export function getDashboardFadeInTransition() {
  return getTransitionString(
    DASHBOARD_TRANSITION.fadeInDuration,
    DASHBOARD_TRANSITION.fadeInEasing
  );
}
```

**Критерии:**
- [ ] Создана конфигурация transitions
- [ ] Тайминги вынесены в конфигурацию
- [ ] Добавлены утилиты для получения CSS transitions
- [ ] Добавлены JSDoc комментарии

---

### 2. Создание композабла для transitions

**Файл:** `vue-app/src/composables/useTransition.js`

**Структура:**
```javascript
import { ref, computed } from 'vue';
import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';

/**
 * Композабл для управления transitions
 * 
 * Предоставляет методы для управления состоянием transitions:
 * - startTransition() - начать transition
 * - endTransition() - завершить transition
 * - isTransitioning - реактивное состояние
 * 
 * @returns {object} Объект с методами и состоянием transitions
 */
export function useTransition() {
  const isTransitioning = ref(false);
  const transitionStartTime = ref(null);
  
  /**
   * Начать transition
   * 
   * @param {Function} callback - Колбэк, вызываемый после начала transition
   */
  const startTransition = (callback) => {
    isTransitioning.value = true;
    transitionStartTime.value = Date.now();
    
    if (callback) {
      callback();
    }
  };
  
  /**
   * Завершить transition
   * 
   * @param {Function} callback - Колбэк, вызываемый после завершения transition
   */
  const endTransition = (callback) => {
    isTransitioning.value = false;
    transitionStartTime.value = null;
    
    if (callback) {
      callback();
    }
  };
  
  /**
   * Выполнить transition с таймингами из конфигурации
   * 
   * @param {Function} startCallback - Колбэк при начале transition
   * @param {Function} endCallback - Колбэк при завершении transition
   * @param {object} config - Конфигурация transition (по умолчанию PRELOADER_TRANSITION)
   */
  const executeTransition = (startCallback, endCallback, config = PRELOADER_TRANSITION) => {
    startTransition(() => {
      if (startCallback) {
        startCallback();
      }
      
      // Задержка между началом fade-out и fade-in
      setTimeout(() => {
        if (endCallback) {
          endCallback();
        }
      }, config.delayBetween);
      
      // Завершение transition после fade-out
      setTimeout(() => {
        endTransition();
      }, config.fadeOutDuration);
    });
  };
  
  /**
   * Длительность transition (мс)
   */
  const transitionDuration = computed(() => {
    if (!transitionStartTime.value) {
      return 0;
    }
    return Date.now() - transitionStartTime.value;
  });
  
  return {
    isTransitioning: computed(() => isTransitioning.value),
    startTransition,
    endTransition,
    executeTransition,
    transitionDuration
  };
}
```

**Детали реализации:**

1. **Состояние `isTransitioning`:**
   - Реактивное состояние для отслеживания процесса перехода
   - Используется для синхронизации анимаций
   - Экспортируется как computed для правильной реактивности

2. **Метод `executeTransition()`:**
   - Упрощает логику управления transitions
   - Использует конфигурацию для таймингов
   - Вызывает колбэки в правильной последовательности

3. **Интеграция с конфигурацией:**
   - Использует `PRELOADER_TRANSITION` по умолчанию
   - Поддерживает кастомные конфигурации
   - Все тайминги берутся из конфигурации

4. **Совместимость:**
   - Должен работать с текущей реализацией в `useDashboardActions.js`
   - Состояние `isTransitioning` должно экспортироваться для использования в компоненте
   - Логика синхронизации должна работать идентично

**Пример использования:**
```javascript
// В useDashboardActions.js
const { isTransitioning, executeTransition } = useTransition();

// В loadSectorData()
executeTransition(
  () => {
    // Начало fade-out (isTransitioning устанавливается автоматически)
  },
  () => {
    // Начало fade-in
    state.isLoading.value = false;
  },
  PRELOADER_TRANSITION
);

// Экспорт для компонента
return {
  isTransitioning, // Для использования в DashboardSector1C.vue
  // ...
};
```

**Критерии:**
- [ ] Создан композабл `useTransition`
- [ ] Реализованы методы управления transitions (`startTransition()`, `endTransition()`, `executeTransition()`)
- [ ] Используется конфигурация transitions (`PRELOADER_TRANSITION`)
- [ ] Состояние `isTransitioning` экспортируется как computed
- [ ] Добавлены JSDoc комментарии для всех методов
- [ ] Композабл совместим с текущей реализацией
- [ ] Логика синхронизации работает идентично текущей реализации

---

### 3. Обновление useDashboardActions

**Файл:** `vue-app/src/composables/useDashboardActions.js`

**Изменения:**
1. Использовать композабл `useTransition`
2. Использовать конфигурацию transitions
3. Упростить логику управления transitions

**Текущий код (useDashboardActions.js, строки 95-120):**
```javascript
finally {
  if (!state.error.value) {
    // Показываем "Готово!" на 800мс перед началом перехода
    loadingProgress.updateStep('complete', { description: 'Дашборд загружен' });
    loadingProgress.updateProgress(100);
    
    setTimeout(() => {
      // Начинаем переход: прелоадер начинает исчезать (fade-out)
      isTransitioning.value = true;
      
      // После начала fade-out прелоадера (через 150мс) начинаем fade-in дашборда
      setTimeout(() => {
        state.isLoading.value = false;
      }, 150);
      
      // После завершения анимации (через 400мс) сбрасываем прогресс и состояние перехода
      setTimeout(() => {
        loadingProgress.reset();
        isTransitioning.value = false;
      }, 400);
    }, 800);
  } else {
    state.isLoading.value = false;
  }
}
```

**Новый код (после рефакторинга):**
```javascript
import { useTransition } from './useTransition.js';
import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';

// В setup():
const { isTransitioning, executeTransition } = useTransition();

// В loadSectorData():
finally {
  if (!state.error.value) {
    loadingProgress.updateStep('complete', { description: 'Дашборд загружен' });
    loadingProgress.updateProgress(100);
    
    // Используем конфигурацию для тайминга показа "Готово!"
    const readyDisplayTime = PRELOADER_TRANSITION.readyDisplayTime || 800;
    
    setTimeout(() => {
      executeTransition(
        () => {
          // Начало fade-out прелоадера (isTransitioning устанавливается в executeTransition)
        },
        () => {
          // Начало fade-in дашборда
          state.isLoading.value = false;
        },
        PRELOADER_TRANSITION
      );
      
      // Сброс прогресса после завершения fade-out
      setTimeout(() => {
        loadingProgress.reset();
      }, PRELOADER_TRANSITION.fadeOutDuration);
    }, readyDisplayTime);
  } else {
    state.isLoading.value = false;
  }
}

// В return добавить:
return {
  // ... существующие возвраты ...
  isTransitioning // Теперь из useTransition
};
```

**Изменения:**
- Удалить: `const isTransitioning = ref(false);` (строка 31)
- Добавить: `import { useTransition } from './useTransition.js';`
- Добавить: `import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';`
- Заменить: логику с `setTimeout` на `executeTransition()`
- Обновить: `return` объект для экспорта `isTransitioning` из `useTransition`

**Детали миграции:**

1. **Обновление импортов:**
   - Добавить: `import { useTransition } from './useTransition.js';`
   - Добавить: `import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';`

2. **Замена состояния:**
   - Удалить: `const isTransitioning = ref(false);` (строка 31)
   - Добавить: `const { isTransitioning, executeTransition } = useTransition();`

3. **Замена логики transitions:**
   - Удалить: множественные `setTimeout` (строки 102-116)
   - Заменить на: `executeTransition()` с колбэками
   - Сохранить: логику показа "Готово!" перед переходом (800мс)

4. **Обновление экспорта:**
   - `isTransitioning` теперь из `useTransition`, а не локальный `ref`
   - Экспортировать `isTransitioning` из `return` объекта

**Проверка совместимости:**
- Компонент `DashboardSector1C.vue` использует `actions.isTransitioning` (строка 181)
- После рефакторинга это должно продолжать работать
- Состояние должно быть реактивным (computed)

**Критерии:**
- [ ] Используется композабл `useTransition` (вместо локального `ref`)
- [ ] Используется конфигурация transitions (`PRELOADER_TRANSITION`)
- [ ] Логика упрощена (меньше `setTimeout`, используется `executeTransition()`)
- [ ] Код соответствует стандартам проекта
- [ ] Состояние `isTransitioning` работает идентично (реактивность сохранена)
- [ ] Компонент `DashboardSector1C.vue` продолжает работать без изменений

---

### 4. Обновление компонента DashboardSector1C

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

**Изменения:**
1. Использовать конфигурацию transitions в CSS
2. Упростить логику transitions

**Текущий код (DashboardSector1C.vue, строки 272-300):**
```css
/* Анимация исчезновения прелоадера (fade-out) */
.preloader-fade-leave-active {
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.preloader-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.preloader-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Анимация появления дашборда (fade-in) */
.dashboard-fade-enter-active {
  transition: opacity 0.4s ease-in, transform 0.4s ease-in;
  transition-delay: 0.15s; /* Начинаем после начала fade-out прелоадера */
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dashboard-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}
```

**Новый код (после рефакторинга):**
```vue
<style scoped>
/* Использование конфигурации transitions через CSS переменные */
.preloader-fade-leave-active {
  transition: opacity v-bind('preloaderFadeOutDuration') v-bind('preloaderFadeOutEasing'),
              transform v-bind('preloaderFadeOutDuration') v-bind('preloaderFadeOutEasing');
}

.preloader-fade-leave-from {
  opacity: 1;
  transform: scale(1);
}

.preloader-fade-leave-to {
  opacity: 0;
  transform: v-bind('preloaderFadeOutTransform');
}

.dashboard-fade-enter-active {
  transition: opacity v-bind('dashboardFadeInDuration') v-bind('dashboardFadeInEasing'),
              transform v-bind('dashboardFadeInDuration') v-bind('dashboardFadeInEasing');
  transition-delay: v-bind('transitionDelay');
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: v-bind('dashboardFadeInTransform');
}

.dashboard-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>

<script>
import { PRELOADER_TRANSITION, DASHBOARD_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';

// В setup():
const preloaderFadeOutDuration = `${PRELOADER_TRANSITION.fadeOutDuration}ms`;
const preloaderFadeOutEasing = PRELOADER_TRANSITION.fadeOutEasing;
const preloaderFadeOutTransform = PRELOADER_TRANSITION.fadeOutTransform;

const dashboardFadeInDuration = `${DASHBOARD_TRANSITION.fadeInDuration}ms`;
const dashboardFadeInEasing = DASHBOARD_TRANSITION.fadeInEasing;
const dashboardFadeInTransform = DASHBOARD_TRANSITION.fadeInTransform;
const transitionDelay = `${PRELOADER_TRANSITION.delayBetween}ms`;
</script>
```

**Альтернативный вариант (более простой):**
```vue
<style scoped>
/* Использование конфигурации через функции */
.preloader-fade-leave-active {
  transition: v-bind('preloaderFadeOutTransition');
}

.dashboard-fade-enter-active {
  transition: v-bind('dashboardFadeInTransition');
  transition-delay: v-bind('transitionDelay');
}
</style>

<script>
import { 
  getPreloaderFadeOutTransition, 
  getDashboardFadeInTransition, 
  PRELOADER_TRANSITION 
} from '@/services/dashboard-sector-1c/utils/transition-config.js';

// В setup():
const preloaderFadeOutTransition = getPreloaderFadeOutTransition();
const dashboardFadeInTransition = getDashboardFadeInTransition();
const transitionDelay = `${PRELOADER_TRANSITION.delayBetween}ms`;
</script>
```

**Детали миграции:**

1. **Обновление CSS transitions:**
   - Заменить захардкоженные значения (0.4s, 0.15s) на значения из конфигурации
   - Использовать `v-bind()` для динамических значений из конфигурации
   - Сохранить все transform значения (scale, translateY)

2. **Обновление JavaScript логики:**
   - Заменить захардкоженные тайминги (800мс, 150мс, 400мс) на значения из конфигурации
   - Использовать `executeTransition()` вместо множественных `setTimeout`
   - Сохранить логику показа "Готово!" перед переходом

3. **Проверка функциональности:**
   - Прелоадер должен плавно исчезать (fade-out) за 400мс
   - Дашборд должен плавно появляться (fade-in) за 400мс с задержкой 150мс
   - "Готово!" должно показываться 800мс перед началом перехода
   - Анимации должны быть синхронизированы

**⚠️ Важно: Сохранение контекста функционала:**
- Тайминги должны остаться такими же (400мс, 150мс, 800мс)
- Transform значения должны остаться такими же (scale(0.95), translateY(10px))
- Easing функции должны остаться такими же (ease-out, ease-in)
- Синхронизация анимаций должна работать идентично
- Показ "Готово!" перед переходом должен сохраниться

**Критерии:**
- [ ] Используется конфигурация transitions (все тайминги вынесены)
- [ ] CSS transitions используют конфигурацию (через `v-bind()`)
- [ ] JavaScript логика использует конфигурацию (через `executeTransition()`)
- [ ] Код упрощён (меньше захардкоженных значений)
- [ ] Функциональность не нарушена (анимации работают идентично)
- [ ] Тайминги соответствуют текущей реализации (400мс, 150мс, 800мс)

---

## 🔧 Технические требования

### Принципы оптимизации:

1. **Конфигурируемость**
   - Все тайминги в конфигурации
   - Легко изменять параметры transitions

2. **Переиспользуемость**
   - Композабл можно использовать в других компонентах
   - Конфигурация доступна для других модулей

3. **Производительность**
   - Оптимизация transitions
   - Использование GPU-ускорения

4. **Читаемость**
   - Понятная структура
   - Хорошая документация

### ⚠️ Важно: Сохранение контекста функционала

**Критически важно сохранить следующую функциональность:**

1. **Тайминги анимаций:**
   - Fade-out прелоадера: 400мс (0.4s) — должно остаться таким же
   - Fade-in дашборда: 400мс (0.4s) — должно остаться таким же
   - Задержка между fade-out и fade-in: 150мс (0.15s) — должно остаться таким же
   - Показ "Готово!": 800мс — должно остаться таким же

2. **Transform значения:**
   - Прелоадер: `scale(1)` → `scale(0.95)` — должно остаться таким же
   - Дашборд: `translateY(10px)` → `translateY(0)` — должно остаться таким же

3. **Easing функции:**
   - Fade-out прелоадера: `ease-out` — должно остаться таким же
   - Fade-in дашборда: `ease-in` — должно остаться таким же

4. **Синхронизация анимаций:**
   - Прелоадер начинает исчезать после показа "Готово!" (800мс)
   - Дашборд начинает появляться через 150мс после начала fade-out прелоадера
   - Оба перехода завершаются одновременно (400мс)
   - Логика синхронизации должна работать идентично

5. **Состояние перехода:**
   - `isTransitioning` должно управляться корректно
   - Состояние должно сбрасываться после завершения анимации
   - Прелоадер должен скрываться только после завершения fade-out

**Что НЕЛЬЗЯ изменять:**
- ❌ Тайминги анимаций (400мс, 150мс, 800мс)
- ❌ Transform значения (scale, translateY)
- ❌ Easing функции (ease-out, ease-in)
- ❌ Логику синхронизации анимаций
- ❌ Показ "Готово!" перед переходом (800мс)

---

## ✅ Критерии приёмки

- [ ] Создана конфигурация transitions
- [ ] Создан композабл `useTransition`
- [ ] Обновлён `useDashboardActions` для использования нового композабла
- [ ] Обновлён компонент `DashboardSector1C` для использования конфигурации
- [ ] Тайминги вынесены в конфигурацию
- [ ] Функциональность не нарушена
- [ ] Производительность не ухудшилась
- [ ] Код соответствует стандартам проекта

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Проверить плавность transitions:**
   - Открыть дашборд и дождаться загрузки
   - Проверить, что прелоадер плавно исчезает (fade-out) за 400мс
   - Проверить, что дашборд плавно появляется (fade-in) за 400мс
   - Проверить, что нет визуальных "скачков" или подёргиваний

2. **Проверить синхронизацию анимаций:**
   - Проверить, что "Готово!" показывается 800мс перед началом перехода
   - Проверить, что fade-out прелоадера начинается после показа "Готово!"
   - Проверить, что fade-in дашборда начинается через 150мс после начала fade-out
   - Проверить, что оба перехода завершаются одновременно (400мс)

3. **Проверить работу с разными конфигурациями:**
   - Изменить тайминги в конфигурации
   - Проверить, что анимации используют новые тайминги
   - Проверить, что синхронизация работает корректно

4. **Проверить состояние `isTransitioning`:**
   - Проверить, что `isTransitioning` устанавливается в `true` при начале перехода
   - Проверить, что `isTransitioning` сбрасывается в `false` после завершения
   - Проверить, что состояние используется корректно в компоненте

### Производительность:

1. Проверить производительность transitions
2. Проверить использование GPU
3. Проверить отсутствие лагов

---

## 📚 Связанные документы

- **Родительская задача:** `DOCS/TASKS/TASK-015-refactor-tasks-008-009-011-012-013-014.md`
- **Связанная задача:** `DOCS/TASKS/TASK-011-smooth-preloader-to-dashboard-transition.md`

---

## 📝 История правок

- **2025-12-06 21:30 (UTC+3, Брест):** Создана подзадача STEP-04 для оптимизации transitions

---

**Автор:** Рефактор-менеджер  
**Статус:** Новая

