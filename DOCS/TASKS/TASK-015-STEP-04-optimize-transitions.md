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
   - Реализованы в `DashboardSector1C.vue`
   - Тайминги захардкожены в CSS и JavaScript

2. **Управление состоянием:**
   - Состояние `isTransitioning` в `useDashboardActions.js`
   - Логика управления разбросана между композаблом и компонентом

3. **CSS Transitions:**
   - Стили встроены в компонент
   - Тайминги: 400мс для fade-out/fade-in, 150мс задержка

**Выявленные проблемы:**
1. Тайминги захардкожены в коде
2. Нет единой точки управления transitions
3. Логика управления состоянием разбросана
4. Нет переиспользуемого композабла для transitions

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
 */

/**
 * Конфигурация transition прелоадера
 */
export const PRELOADER_TRANSITION = {
  /** Длительность fade-out прелоадера (мс) */
  fadeOutDuration: 400,
  /** Длительность fade-in дашборда (мс) */
  fadeInDuration: 400,
  /** Задержка между началом fade-out и fade-in (мс) */
  delayBetween: 150,
  /** Easing функция для fade-out */
  fadeOutEasing: 'ease-out',
  /** Easing функция для fade-in */
  fadeInEasing: 'ease-in',
  /** Transform для fade-out */
  fadeOutTransform: 'scale(0.95)',
  /** Transform для fade-in */
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

**Критерии:**
- [ ] Создан композабл `useTransition`
- [ ] Реализованы методы управления transitions
- [ ] Используется конфигурация transitions
- [ ] Добавлены JSDoc комментарии

---

### 3. Обновление useDashboardActions

**Файл:** `vue-app/src/composables/useDashboardActions.js`

**Изменения:**
1. Использовать композабл `useTransition`
2. Использовать конфигурацию transitions
3. Упростить логику управления transitions

**Пример обновления:**
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
    
    setTimeout(() => {
      executeTransition(
        () => {
          // Начало fade-out прелоадера
        },
        () => {
          // Начало fade-in дашборда
          state.isLoading.value = false;
        },
        PRELOADER_TRANSITION
      );
      
      setTimeout(() => {
        loadingProgress.reset();
      }, PRELOADER_TRANSITION.fadeOutDuration);
    }, 800);
  }
}
```

**Критерии:**
- [ ] Используется композабл `useTransition`
- [ ] Используется конфигурация transitions
- [ ] Логика упрощена
- [ ] Код соответствует стандартам

---

### 4. Обновление компонента DashboardSector1C

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

**Изменения:**
1. Использовать конфигурацию transitions в CSS
2. Упростить логику transitions

**Пример обновления:**
```vue
<style scoped>
/* Использование конфигурации transitions */
.preloader-fade-leave-active {
  transition: v-bind('preloaderFadeOutTransition');
}

.dashboard-fade-enter-active {
  transition: v-bind('dashboardFadeInTransition');
  transition-delay: v-bind('transitionDelay');
}
</style>

<script>
import { getPreloaderFadeOutTransition, getDashboardFadeInTransition, PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';

// В setup():
const preloaderFadeOutTransition = getPreloaderFadeOutTransition();
const dashboardFadeInTransition = getDashboardFadeInTransition();
const transitionDelay = `${PRELOADER_TRANSITION.delayBetween}ms`;
</script>
```

**Критерии:**
- [ ] Используется конфигурация transitions
- [ ] CSS transitions используют конфигурацию
- [ ] Код упрощён
- [ ] Функциональность не нарушена

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

1. Проверить плавность transitions
2. Проверить синхронизацию анимаций
3. Проверить работу с разными конфигурациями

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

