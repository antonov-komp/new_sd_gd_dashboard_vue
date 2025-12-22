# TASK-011: Плавный переход от прелоадера к рендеру дашборда

**Дата создания:** 2025-12-06 16:48 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Связанные задачи:** TASK-007, TASK-010

---

## Описание

Реализовать плавный переход от прелоадера к рендеру дашборда после успешной загрузки данных. Прелоадер должен плавно исчезать (fade-out), а дашборд — плавно появляться (fade-in) с синхронизацией анимаций.

**Цель:** Улучшить пользовательский опыт, обеспечив плавный визуальный переход от состояния загрузки к отображению данных.

---

## Контекст

**Текущее состояние:**
- Прелоадер показывается при загрузке данных (`isLoading = true`)
- После успешной загрузки показывается этап "Готово!" на 800мс
- Затем `isLoading` устанавливается в `false`, и прелоадер резко исчезает
- Дашборд появляется сразу без анимации
- Переход выглядит резким и не плавным

**Проблемы:**
- Резкое исчезновение прелоадера создаёт визуальный "скачок"
- Дашборд появляется мгновенно без плавного появления
- Нет синхронизации между исчезновением прелоадера и появлением дашборда

**Требуется:**
- Плавное исчезновение прелоадера (fade-out) с длительностью 300-400мс
- Плавное появление дашборда (fade-in) с длительностью 300-400мс
- Синхронизация анимаций (прелоадер начинает исчезать, дашборд начинает появляться)
- Сохранение логики показа "Готово!" перед переходом

---

## Модули и компоненты

### Файлы для обновления:

1. **`vue-app/src/components/dashboard/DashboardSector1C.vue`**
   - Добавить Vue Transition для прелоадера
   - Добавить Vue Transition для дашборда
   - Синхронизировать анимации через состояние

2. **`vue-app/src/components/dashboard/LoadingPreloader.vue`**
   - Добавить CSS transitions для fade-out анимации
   - Оптимизировать анимацию для плавного исчезновения

3. **`vue-app/src/composables/useDashboardActions.js`**
   - Добавить состояние для управления переходом
   - Синхронизировать тайминги анимаций

### Новые файлы (опционально):

1. **`vue-app/src/styles/dashboard-transitions.css`**
   - Глобальные стили для transitions (если нужны)

---

## Зависимости

### От других задач:
- **TASK-007** — должна быть завершена (прелоадер реализован)
- **TASK-010** — должна быть завершена (рефакторинг прелоадера)

### От модулей:
- `vue` (версия 3.x) — для Transition компонентов
- `@/composables/useDashboardActions.js` — для управления состоянием
- `@/components/dashboard/LoadingPreloader.vue` — компонент прелоадера

---

## Ступенчатые подзадачи

### 1. Добавить состояние для управления переходом

**Файл:** `vue-app/src/composables/useDashboardActions.js`

**Изменения:**
- Добавить состояние `isTransitioning` для отслеживания процесса перехода
- Управлять этим состоянием при завершении загрузки

**Пример:**
```javascript
// В useDashboardActions.js
const isTransitioning = ref(false);

const loadSectorData = async (useCache = true) => {
  // ... существующий код ...
  
  finally {
    if (!state.error.value) {
      // Показываем "Готово!" на 800мс
      loadingProgress.updateStep('complete', { description: 'Дашборд загружен' });
      loadingProgress.updateProgress(100);
      
      setTimeout(() => {
        // Начинаем переход: прелоадер начинает исчезать
        isTransitioning.value = true;
        
        // После начала fade-out прелоадера (через 150мс) начинаем fade-in дашборда
        setTimeout(() => {
          state.isLoading.value = false;
        }, 150);
        
        // После завершения анимации (через 400мс) сбрасываем прогресс
        setTimeout(() => {
          loadingProgress.reset();
          isTransitioning.value = false;
        }, 400);
      }, 800);
    } else {
      state.isLoading.value = false;
    }
  }
};

return {
  // ... существующие возвраты ...
  isTransitioning
};
```

**Критерии:**
- [ ] Добавлено состояние `isTransitioning`
- [ ] Состояние управляется при завершении загрузки
- [ ] Тайминги синхронизированы для плавного перехода

### 2. Добавить Vue Transition для прелоадера

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

**Изменения:**
- Обернуть `LoadingPreloader` в `<Transition>` компонент
- Добавить CSS классы для fade-out анимации

**Пример:**
```vue
<template>
  <div class="dashboard-sector-1c" :class="{ 'is-dragging': draggedTicket }">
    <!-- Заголовок -->
    <div class="dashboard-header">
      <h1>Дашборд - Сектор 1С</h1>
    </div>

    <!-- Прелоадер с плавным исчезновением -->
    <Transition name="preloader-fade" mode="out-in">
      <LoadingPreloader
        v-if="isLoading || error || currentStep"
        :current-step="currentStep"
        :progress="progress"
        :step-details="stepDetails"
        :error="error || null"
        @retry="handleRetry"
      />
    </Transition>

    <!-- Контент дашборда с плавным появлением -->
    <Transition name="dashboard-fade" mode="out-in">
      <div v-if="!isLoading && !error && !currentStep" class="dashboard-content">
        <div class="stages-container">
          <DashboardStage
            v-for="stage in stages"
            :key="stage.id"
            :stage="stage"
            :zero-point-tickets="zeroPointTickets[stage.id] || []"
            @ticket-moved="handleTicketDrop"
            @ticket-assigned="assignTicketToEmployee"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>
```

**Критерии:**
- [ ] Прелоадер обёрнут в `<Transition>` компонент
- [ ] Используется `mode="out-in"` для правильной последовательности
- [ ] Добавлены CSS классы для анимации

### 3. Добавить CSS transitions для прелоадера

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue` (в секции `<style>`)

**Изменения:**
- Добавить CSS классы для fade-out анимации прелоадера
- Настроить длительность и easing для плавного перехода

**Пример:**
```vue
<style scoped>
/* ... существующие стили ... */

/* Анимация исчезновения прелоадера */
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

/* Анимация появления дашборда */
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
</style>
```

**Критерии:**
- [ ] Добавлены CSS классы для fade-out прелоадера
- [ ] Добавлены CSS классы для fade-in дашборда
- [ ] Длительность анимаций синхронизирована (400мс)
- [ ] Используется плавный easing (ease-in, ease-out)

### 4. Оптимизировать анимацию прелоадера

**Файл:** `vue-app/src/components/dashboard/LoadingPreloader.vue`

**Изменения:**
- Добавить CSS transitions для плавного исчезновения элементов внутри прелоадера
- Оптимизировать анимацию спиннера при исчезновении

**Пример:**
```vue
<style scoped>
/* ... существующие стили ... */

/* Плавное исчезновение элементов прелоадера */
.loading-preloader {
  transition: opacity 0.3s ease-out;
}

.loading-preloader.preloader-fade-leave-active {
  transition: opacity 0.4s ease-out;
}

.loading-preloader.preloader-fade-leave-to {
  opacity: 0;
}

/* Плавное исчезновение спиннера */
.spinner-container {
  transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

.preloader-fade-leave-active .spinner-container {
  opacity: 0;
  transform: scale(0.9);
}

/* Плавное исчезновение контента */
.preloader-content {
  transition: opacity 0.3s ease-out;
}

.preloader-fade-leave-active .preloader-content {
  opacity: 0;
}
</style>
```

**Критерии:**
- [ ] Добавлены transitions для элементов прелоадера
- [ ] Спиннер плавно исчезает
- [ ] Контент прелоадера плавно исчезает
- [ ] Анимации оптимизированы для производительности

### 5. Протестировать плавность перехода

**Тестирование:**
- Проверить плавность перехода на разных устройствах
- Проверить производительность анимаций
- Проверить синхронизацию анимаций

**Критерии:**
- [ ] Переход выглядит плавным на десктопе
- [ ] Переход выглядит плавным на мобильных устройствах
- [ ] Нет лагов или подёргиваний
- [ ] Анимации синхронизированы правильно

---

## Технические требования

### Принципы реализации:

1. **Плавность анимаций**
   - Длительность fade-out прелоадера: 400мс
   - Длительность fade-in дашборда: 400мс
   - Задержка между началом fade-out и fade-in: 150мс
   - Использование `ease-in` и `ease-out` для плавности

2. **Синхронизация**
   - Прелоадер начинает исчезать после показа "Готово!" (800мс)
   - Дашборд начинает появляться через 150мс после начала исчезновения прелоадера
   - Оба перехода завершаются одновременно

3. **Производительность**
   - Использование CSS transitions вместо JavaScript анимаций
   - Использование `transform` и `opacity` для GPU-ускорения
   - Избежание `layout` и `paint` операций в анимациях

4. **Совместимость**
   - Работает на всех современных браузерах
   - Graceful degradation для старых браузеров (без анимации, но функциональность сохранена)

### Стандарты кода:

- **Vue.js:** Composition API, Vue 3.x
- **CSS:** Современные transitions с GPU-ускорением
- **Комментарии:** JSDoc для всех изменений

---

## Критерии приёмки

- [ ] Прелоадер плавно исчезает (fade-out) после успешной загрузки
- [ ] Дашборд плавно появляется (fade-in) после исчезновения прелоадера
- [ ] Анимации синхронизированы (нет визуальных "скачков")
- [ ] Этап "Готово!" показывается перед началом перехода (800мс)
- [ ] Переход работает плавно на десктопе и мобильных устройствах
- [ ] Нет лагов или подёргиваний при анимациях
- [ ] Логика загрузки не нарушена (все этапы работают корректно)
- [ ] Обработка ошибок работает корректно (прелоадер скрывается при ошибке)
- [ ] Код соответствует стандартам Vue.js и PSR-12 (для комментариев)

---

## Тестирование

### Функциональное тестирование:

1. **Проверка плавности перехода:**
   - Открыть дашборд сектора 1С
   - Дождаться успешной загрузки данных
   - Проверить, что прелоадер плавно исчезает
   - Проверить, что дашборд плавно появляется
   - Проверить синхронизацию анимаций

2. **Проверка таймингов:**
   - Проверить, что "Готово!" показывается 800мс
   - Проверить, что fade-out начинается после этого
   - Проверить, что fade-in начинается через 150мс после fade-out
   - Проверить, что оба перехода завершаются за 400мс

3. **Проверка обработки ошибок:**
   - Симулировать ошибку загрузки
   - Проверить, что прелоадер скрывается корректно
   - Проверить, что анимации не мешают обработке ошибок

### Производительность:

1. **Проверка производительности анимаций:**
   - Открыть DevTools → Performance
   - Записать профиль при переходе
   - Проверить, что нет лагов (60 FPS)
   - Проверить использование GPU (transform, opacity)

2. **Проверка на разных устройствах:**
   - Проверить на десктопе (Chrome, Firefox, Safari)
   - Проверить на планшете
   - Проверить на мобильном устройстве

### Адаптивность:

1. Проверить на разных размерах экрана
2. Проверить на разных ориентациях (портрет/ландшафт)

---

## Примеры реализации

### Пример 1: Vue Transition для прелоадера и дашборда

```vue
<template>
  <div class="dashboard-sector-1c">
    <!-- Прелоадер с плавным исчезновением -->
    <Transition name="preloader-fade">
      <LoadingPreloader
        v-if="isLoading || error || currentStep"
        :current-step="currentStep"
        :progress="progress"
        :step-details="stepDetails"
        :error="error || null"
        @retry="handleRetry"
      />
    </Transition>

    <!-- Дашборд с плавным появлением -->
    <Transition name="dashboard-fade">
      <div v-if="!isLoading && !error && !currentStep" class="dashboard-content">
        <!-- ... контент дашборда ... -->
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Fade-out прелоадера */
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

/* Fade-in дашборда */
.dashboard-fade-enter-active {
  transition: opacity 0.4s ease-in, transform 0.4s ease-in;
  transition-delay: 0.15s;
}

.dashboard-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.dashboard-fade-enter-to {
  opacity: 1;
  transform: translateY(0);
}
</style>
```

### Пример 2: Управление состоянием перехода

```javascript
// useDashboardActions.js
const isTransitioning = ref(false);

const loadSectorData = async (useCache = true) => {
  // ... существующий код загрузки ...
  
  finally {
    if (!state.error.value) {
      // Показываем "Готово!" на 800мс
      loadingProgress.updateStep('complete', { description: 'Дашборд загружен' });
      loadingProgress.updateProgress(100);
      
      setTimeout(() => {
        // Начинаем переход
        isTransitioning.value = true;
        
        // Через 150мс начинаем показывать дашборд
        setTimeout(() => {
          state.isLoading.value = false;
        }, 150);
        
        // После завершения анимации (400мс) сбрасываем состояние
        setTimeout(() => {
          loadingProgress.reset();
          isTransitioning.value = false;
        }, 400);
      }, 800);
    } else {
      state.isLoading.value = false;
    }
  }
};

return {
  // ... существующие возвраты ...
  isTransitioning
};
```

---

## История правок

- **2025-12-06 16:48 (UTC+3, Брест):** Создана задача TASK-011 для реализации плавного перехода от прелоадера к дашборду
- **2025-12-06 (UTC+3, Брест):** Задача выполнена:
  - Добавлено состояние `isTransitioning` в `useDashboardActions.js` для управления переходом
  - Добавлены Vue Transition компоненты для прелоадера и дашборда в `DashboardSector1C.vue`
  - Реализованы CSS transitions для fade-out прелоадера (400мс) и fade-in дашборда (400мс с задержкой 150мс)
  - Оптимизирована анимация прелоадера в `LoadingPreloader.vue` для плавного исчезновения элементов
  - Синхронизированы тайминги анимаций: прелоадер начинает исчезать после показа "Готово!" (800мс), дашборд начинает появляться через 150мс после начала fade-out

---

**Автор:** Технический писатель  
**Статус:** Завершена

