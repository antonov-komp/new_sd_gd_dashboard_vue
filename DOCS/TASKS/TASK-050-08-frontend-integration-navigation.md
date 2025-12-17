# TASK-050-08: Frontend интеграция с дашбордом и навигация

**Дата создания:** 2025-12-17 09:30 (UTC+3, Брест)  
**Дата завершения:** 2025-12-17 13:15 (UTC+3, Брест)  
**Статус:** ✅ Завершён  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 8 из TASK-050  
**Зависимости:** TASK-050-03 (завершён), TASK-050-04 (завершён), TASK-050-05 (завершён)

---

## Цель этапа

Интегрировать модуль «Трудозатраты на Тикеты сектора 1С» в дашборд сектора 1С как 4-й модуль. Добавить навигацию (breadcrumbs) и кнопки перехода между модулями.

---

## Контекст

- Модуль «Трудозатраты на Тикеты сектора 1С» (TASK-050) — 4-й модуль в дашборде сектора 1С
- Необходимо интегрировать с существующими модулями:
  1. Дашборд сектора 1С
  2. График состояния сектора 1С
  3. График приёма и закрытий сектора 1С
  4. **Трудозатраты на Тикеты сектора 1С** (текущий модуль)
- Использовать ту же структуру навигации, что и в других модулях

---

## Задачи этапа

### 1. Добавление роутинга

**Файл:** `vue-app/src/router/index.js` (или аналогичный)

**Добавить маршрут:**
```javascript
{
  path: '/dashboard/tickets-time-tracking',
  name: 'dashboard-tickets-time-tracking',
  component: () => import('@/components/tickets-time-tracking/TicketsTimeTrackingDashboard.vue'),
  meta: {
    title: 'Трудозатраты на Тикеты сектора 1С',
    requiresAuth: true
  }
}
```

### 2. Добавление навигации (Breadcrumbs)

**Структура breadcrumbs:**
```
[←] Дашборд сектора 1С / График состояния / График приёма и закрытий / Трудозатраты
```

**Реализация:**
- Кнопка "Назад" (←) — возврат к предыдущему модулю
- Breadcrumbs — полный путь навигации (кликабельные ссылки)
- Текущий модуль выделен (не кликабелен)

**Код:**
```vue
<nav class="breadcrumbs" aria-label="Навигация">
  <button
    class="btn-back-link"
    @click="handleBack"
    title="Назад"
  >
    ←
  </button>
  <router-link 
    :to="{ name: 'dashboard-sector-1c' }"
    class="breadcrumb-link"
  >
    Дашборд сектора 1С
  </router-link>
  <span class="breadcrumb-separator">/</span>
  <router-link 
    :to="{ name: 'dashboard-graph-state' }"
    class="breadcrumb-link"
  >
    График состояния
  </router-link>
  <span class="breadcrumb-separator">/</span>
  <router-link 
    :to="{ name: 'dashboard-graph-admission-closure' }"
    class="breadcrumb-link"
  >
    График приёма и закрытий
  </router-link>
  <span class="breadcrumb-separator">/</span>
  <span class="breadcrumb-current">Трудозатраты</span>
</nav>
```

### 3. Добавление кнопки перехода в другие модули

**В модуле "График приёма и закрытий сектора 1С":**
- Добавить кнопку перехода к модулю "Трудозатраты"

**В модуле "Трудозатраты":**
- Добавить кнопки перехода к другим модулям (если нужно)

### 4. Интеграция с дашбордом сектора 1С

**В главном дашборде (`DashboardSector1C.vue`):**
- Добавить карточку/кнопку для перехода к модулю "Трудозатраты"
- Использовать ту же структуру, что и для других модулей

**Структура:**
```vue
<div class="dashboard-modules">
  <!-- Существующие модули -->
  <router-link to="/dashboard/graph-state">График состояния</router-link>
  <router-link to="/dashboard/graph-admission-closure">График приёма и закрытий</router-link>
  <router-link to="/dashboard/tickets-time-tracking">Трудозатраты на Тикеты</router-link>
</div>
```

### 5. Проверка доступа

**Логика:**
- Использовать те же правила доступа, что и в других модулях
- Проверка через `access-config.js` (отдел 366 — Сектор 1С)

---

## Технические требования

### Роутинг

- Использовать Vue Router
- Соответствие структуре роутинга других модулей

### Навигация

- Использовать те же компоненты breadcrumbs, что и в других модулях
- Соответствие стилям навигации

### Доступы

- Использовать те же правила доступа, что и в других модулях сектора 1С

---

## Критерии приёмки этапа

- [x] Добавлен маршрут для модуля в роутер
- [x] Реализованы breadcrumbs с полным путём навигации
- [x] Реализована кнопка "Назад"
- [x] Добавлена кнопка перехода к модулю в дашборде сектора 1С
- [x] Добавлен отчёт в reports-config.js
- [x] Проверка доступа работает корректно (через navigation guard)
- [x] Навигация работает интуитивно
- [x] Стили соответствуют другим модулям

---

## Дополнительные уточнения

- При реализации использовать примеры навигации из других модулей (TASK-046)
- Обратить внимание на обработку истории браузера (кнопка "Назад")
- Учесть возможность отсутствия прав доступа

## Примеры кода

### Добавление роутинга

**Файл:** `vue-app/src/router/index.js` (или аналогичный)

**Пример добавления маршрута:**

```javascript
import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  // ... существующие маршруты
  
  {
    path: '/dashboard/tickets-time-tracking',
    name: 'dashboard-tickets-time-tracking',
    component: () => import('@/components/tickets-time-tracking/TicketsTimeTrackingDashboard.vue'),
    meta: {
      title: 'Трудозатраты на Тикеты сектора 1С',
      requiresAuth: true,
      requiresDepartment: [366, 369, 7] // Отделы с доступом
    }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

### Проверка доступа

**Пример из существующих модулей:**

```javascript
// В компоненте или router guard
import { accessConfig } from '@/config/access-config.js';

// Проверка доступа
const hasAccess = computed(() => {
  const userDepartmentId = getUserDepartmentId(); // Получить ID отдела пользователя
  return accessConfig.allowedDepartmentIds.includes(userDepartmentId);
});
```

### Добавление кнопки в дашборд

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

**Пример добавления кнопки:**

```vue
<template>
  <div class="dashboard-sector-1c">
    <!-- ... существующий код ... -->
    
    <div class="dashboard-modules">
      <router-link 
        :to="{ name: 'dashboard-graph-state' }"
        class="module-card"
      >
        <h3>График состояния</h3>
        <p>Состояние тикетов сектора 1С</p>
      </router-link>
      
      <router-link 
        :to="{ name: 'dashboard-graph-admission-closure' }"
        class="module-card"
      >
        <h3>График приёма и закрытий</h3>
        <p>Динамика новых и закрытых тикетов</p>
      </router-link>
      
      <router-link 
        :to="{ name: 'dashboard-tickets-time-tracking' }"
        class="module-card"
      >
        <h3>Трудозатраты на Тикеты</h3>
        <p>Трудозатраты сотрудников сектора 1С</p>
      </router-link>
    </div>
  </div>
</template>
```

### Навигация (Breadcrumbs)

**Пример из `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue`:**

```vue
<nav class="breadcrumbs" aria-label="Навигация">
  <router-link 
    :to="{ name: 'dashboard-sector-1c' }"
    class="breadcrumb-link"
  >
    Дашборд сектора 1С
  </router-link>
  <span class="breadcrumb-separator" aria-hidden="true">/</span>
  <router-link 
    :to="{ name: 'dashboard-graph-state' }"
    class="breadcrumb-link"
  >
    График состояния
  </router-link>
  <span class="breadcrumb-separator" aria-hidden="true">/</span>
  <router-link 
    :to="{ name: 'dashboard-graph-admission-closure' }"
    class="breadcrumb-link"
  >
    График приёма и закрытий
  </router-link>
  <span class="breadcrumb-separator" aria-hidden="true">/</span>
  <span class="breadcrumb-current">Трудозатраты</span>
</nav>
```

### Кнопка "Назад"

**Пример обработки кнопки "Назад":**

```javascript
import { useRouter } from 'vue-router';
import { computed, ref } from 'vue';

const router = useRouter();

const hasHistory = computed(() => window.history.length > 1);
const isNavigatingBack = ref(false);

const handleBack = () => {
  if (hasHistory.value) {
    isNavigatingBack.value = true;
    router.back();
  } else {
    // Fallback: переход на главный дашборд
    router.push({ name: 'dashboard-sector-1c' });
  }
};
```

## Ссылки на существующие модули

**Изучить:**
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue` — пример навигации
- `vue-app/src/components/dashboard/DashboardSector1C.vue` — пример дашборда с модулями
- `vue-app/src/router/index.js` — структура роутинга

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend интеграции с дашбордом и навигации
- **2025-12-17 10:40 (UTC+3, Брест):** Добавлены детали:
  - Пример добавления роутинга
  - Пример проверки доступа
  - Пример добавления кнопки в дашборд
  - Пример навигации (breadcrumbs)
  - Пример обработки кнопки "Назад"
  - Ссылки на существующие модули

---

## Следующий этап

После завершения этого этапа переходить к **TASK-050-09: Тестирование и финализация**

---

## История правок

- **2025-12-17 09:30 (UTC+3, Брест):** Создан этап frontend интеграции с дашбордом и навигации

