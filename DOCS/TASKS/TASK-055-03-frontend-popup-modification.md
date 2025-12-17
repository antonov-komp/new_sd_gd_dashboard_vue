# TASK-055-03: Модификация компонента попапа для отображения списка задач

**Дата создания:** 2025-12-17 17:04 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 3 из TASK-055  
**Зависимости:** TASK-055-01, TASK-055-02

---

## Цель этапа

Добавить кнопку "Список задач" в попап детализации трудозатрат и реализовать уровень 2 со списком задач в виде карточек с поддержкой пагинации.

---

## Контекст

- **Текущее состояние:**
  - Попап `TimeTrackingDetailModal.vue` отображает только краткую информацию о задачах
  - Нет возможности просмотреть все задачи в отдельном списке
  - Нет детальной информации о задачах (даты, статусы)

- **Требуется:**
  1. Добавить кнопку "Список задач" в попап уровня 1
  2. Реализовать переход на уровень 2
  3. Отобразить список задач в виде карточек
  4. Реализовать пагинацию (если задач > 10)

---

## Задачи этапа

### 1) Добавление состояния навигации

**Файл:** `vue-app/src/components/tickets-time-tracking/TimeTrackingDetailModal.vue`

**Задачи:**

1. **Добавить состояния:**
   ```javascript
   const popupLevel = ref(1); // 1 или 2
   const enrichedTasks = ref([]); // Массив задач с детальной информацией
   const isLoadingTasks = ref(false); // Состояние загрузки
   const tasksError = ref(null); // Ошибка загрузки
   const currentPage = ref(1); // Текущая страница пагинации
   const perPage = ref(10); // Количество задач на страницу
   ```

2. **Добавить computed свойства для пагинации:**
   ```javascript
   const totalPages = computed(() => {
     if (enrichedTasks.value.length <= perPage.value) {
       return 1;
     }
     return Math.ceil(enrichedTasks.value.length / perPage.value);
   });
   
   const paginatedTasks = computed(() => {
     const start = (currentPage.value - 1) * perPage.value;
     const end = start + perPage.value;
     return enrichedTasks.value.slice(start, end);
   });
   
   const visiblePages = computed(() => {
     const pages = [];
     const maxVisible = 5;
     let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2));
     let end = Math.min(totalPages.value, start + maxVisible - 1);
     
     if (end - start < maxVisible - 1) {
       start = Math.max(1, end - maxVisible + 1);
     }
     
     for (let i = start; i <= end; i++) {
       pages.push(i);
     }
     
     return pages;
   });
   ```

---

### 2) Добавление кнопки "Список задач"

**Место:** В попапе уровня 1, после блока "Итого"

**Код:**

```vue
<div class="detail-actions" v-if="tasksCount > 0">
  <button class="btn btn-primary btn-tasks-list" @click="goToTasksList">
    📋 Список задач
  </button>
</div>
```

**Условие отображения:** Только если `tasksCount > 0`

---

### 3) Реализация уровня 2 (список задач)

**Структура:**

```vue
<Transition name="level" mode="out-in">
  <!-- Уровень 1: Детализация по ячейке -->
  <div v-if="popupLevel === 1 && ..." key="level-1">
    <!-- Существующий контент уровня 1 -->
  </div>
  
  <!-- Уровень 2: Список задач -->
  <div v-else-if="popupLevel === 2" key="level-2" class="tasks-list-level">
    <div class="tasks-list-header">
      <button class="btn-back" @click="goBack" aria-label="Назад">
        ← Назад
      </button>
      <h3 class="tasks-list-title">
        Список задач: {{ cellData.employee?.name || 'Сотрудник' }}, 
        Неделя {{ cellData.week?.weekNumber || '?' }}
      </h3>
    </div>
    
    <div class="tasks-list-content">
      <!-- Контент списка задач (см. раздел 4) -->
    </div>
  </div>
</Transition>
```

**Функции навигации:**

```javascript
const goToTasksList = async () => {
  popupLevel.value = 2;
  await loadTasksDetails();
};

const goBack = () => {
  popupLevel.value = 1;
  enrichedTasks.value = [];
  tasksError.value = null;
  currentPage.value = 1;
};
```

---

### 4) Реализация отображения карточек задач

**Структура карточек:**

```vue
<div class="tasks-cards-container">
  <TransitionGroup name="task-card" tag="div" class="tasks-cards-list">
    <div
      v-for="task in paginatedTasks"
      :key="task.id"
      class="task-card"
      :class="getTaskCardClass(task)"
      @click="handleTaskClick(task)"
    >
      <div class="task-card__header">
        <span class="task-card__number">Задача #{{ task.id }}</span>
        <span v-if="task.elapsedTime" class="task-card__time">
          {{ formatElapsedTime(task.elapsedTime) }}
        </span>
      </div>
      
      <div class="task-card__title">
        {{ task.title || 'Без названия' }}
      </div>
      
      <div class="task-card__dates">
        <div class="task-card__date-item">
          <span class="date-icon">📅</span>
          <span class="date-label">Начало:</span>
          <span class="date-value">{{ formatDate(task.startDate) }}</span>
        </div>
        
        <div class="task-card__date-item">
          <span class="date-icon">⏰</span>
          <span class="date-label">Дедлайн:</span>
          <span 
            class="date-value"
            :class="{ 'date-value--overdue': isOverdue(task.deadline, task.closedDate) }"
          >
            {{ formatDate(task.deadline) || '-' }}
          </span>
        </div>
        
        <div class="task-card__date-item">
          <span class="date-icon">✓</span>
          <span class="date-label">Завершено:</span>
          <span class="date-value">{{ formatDate(task.closedDate) || '-' }}</span>
        </div>
      </div>
      
      <!-- Статус будет добавлен позже -->
      <div class="task-card__status-placeholder">
        <!-- Статус задачи будет отображаться здесь в следующих этапах -->
      </div>
    </div>
  </TransitionGroup>
  
  <!-- Пагинация (см. раздел 5) -->
</div>
```

**Вспомогательные функции:**

```javascript
const formatDate = (dateString) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '-';
  }
};

const isOverdue = (deadline, closedDate) => {
  if (closedDate) return false; // Если задача завершена, не считаем просроченной
  if (!deadline) return false;
  try {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    return now > deadlineDate;
  } catch (e) {
    return false;
  }
};

const getTaskCardClass = (task) => {
  const closedDate = task.closedDate ? new Date(task.closedDate) : null;
  const isOverdueTask = isOverdue(task.deadline, task.closedDate);
  
  return {
    'task-card--completed': !!closedDate,
    'task-card--overdue': isOverdueTask,
    'task-card--in-progress': !closedDate && !isOverdueTask
  };
};

const handleTaskClick = (task) => {
  // TODO: Реализовать открытие задачи в Bitrix24 в следующих этапах
  console.log('[TimeTrackingDetailModal] Task clicked:', task.id);
};
```

---

### 5) Реализация пагинации

**Структура пагинации:**

```vue
<div v-if="totalPages > 1" class="tasks-pagination">
  <button 
    class="pagination-btn"
    :disabled="currentPage === 1"
    @click="goToPage(currentPage - 1)"
  >
    ← Предыдущая
  </button>
  
  <div class="pagination-pages">
    <button
      v-for="page in visiblePages"
      :key="page"
      class="pagination-page"
      :class="{ 'pagination-page--active': page === currentPage }"
      @click="goToPage(page)"
    >
      {{ page }}
    </button>
  </div>
  
  <button 
    class="pagination-btn"
    :disabled="currentPage === totalPages"
    @click="goToPage(currentPage + 1)"
  >
    Следующая →
  </button>
</div>
```

**Функция перехода на страницу:**

```javascript
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    // Прокрутка вверх списка задач
    const container = document.querySelector('.tasks-cards-container');
    if (container) {
      container.scrollTop = 0;
    }
  }
};
```

---

### 6) Загрузка детальной информации о задачах

**Функция загрузки:**

```javascript
const loadTasksDetails = async () => {
  if (!props.cellData?.week?.employees || !props.cellData.employee) {
    tasksError.value = 'Недостаточно данных для загрузки задач';
    return;
  }
  
  isLoadingTasks.value = true;
  tasksError.value = null;
  
  try {
    const employee = props.cellData.week.employees.find(
      e => e.id === props.cellData.employee?.id
    );
    
    if (!employee || !employee.tasks || employee.tasks.length === 0) {
      enrichedTasks.value = [];
      return;
    }
    
    // Получить ID всех задач
    const taskIds = employee.tasks.map(task => task.id).filter(id => id);
    
    if (taskIds.length === 0) {
      enrichedTasks.value = [];
      return;
    }
    
    // Загрузить детальную информацию о задачах
    const response = await timeTrackingService.getTasksDetails({
      taskIds: taskIds,
      employeeId: props.cellData.employee.id,
      weekNumber: props.cellData.week.weekNumber,
      page: currentPage.value,
      perPage: perPage.value
    });
    
    enrichedTasks.value = response.tasks || [];
    
  } catch (err) {
    console.error('[TimeTrackingDetailModal] Error loading tasks details:', err);
    tasksError.value = err.message || 'Ошибка загрузки задач';
    enrichedTasks.value = [];
  } finally {
    isLoadingTasks.value = false;
  }
};
```

**Перезагрузка при смене страницы:**

```javascript
watch(currentPage, () => {
  if (popupLevel.value === 2) {
    loadTasksDetails();
  }
});
```

---

## Состояния компонента

### Состояние загрузки

```vue
<div v-if="isLoadingTasks" class="loading-state">
  <div class="loading-spinner"></div>
  <p>Загрузка задач...</p>
</div>
```

### Состояние ошибки

```vue
<div v-else-if="tasksError" class="error-state">
  <div class="error-icon">⚠️</div>
  <p class="error-title">Ошибка загрузки</p>
  <p class="error-message">{{ tasksError }}</p>
  <button class="btn btn-retry" @click="retryLoadTasks">Повторить</button>
</div>
```

### Пустое состояние

```vue
<div v-else-if="enrichedTasks.length === 0" class="empty-state">
  <div class="empty-state-icon">📋</div>
  <p class="empty-state-message">Нет задач для отображения</p>
</div>
```

---

## Критерии приёмки

- [ ] Состояния навигации добавлены и работают корректно
- [ ] Кнопка "Список задач" отображается только при наличии задач
- [ ] При клике на кнопку происходит переход на уровень 2
- [ ] Кнопка "Назад" возвращает на уровень 1
- [ ] Карточки задач отображаются с правильными данными
- [ ] Пагинация работает (если задач > 10)
- [ ] Состояния загрузки, ошибки и пустое состояние обрабатываются
- [ ] Плавные переходы между уровнями работают
- [ ] Визуальное выделение просроченных задач работает

---

## Тестирование

### 1. Функциональное тестирование

- [ ] Кнопка "Список задач" отображается и работает
- [ ] Переходы между уровнями работают корректно
- [ ] Карточки задач отображаются с правильными данными
- [ ] Пагинация работает (если задач > 10)

### 2. Тестирование данных

- [ ] Корректное отображение всех полей
- [ ] Форматирование дат работает правильно
- [ ] Визуальное выделение просроченных задач

### 3. Тестирование состояний

- [ ] Состояние загрузки отображается корректно
- [ ] Состояние ошибки обрабатывается с кнопкой "Повторить"
- [ ] Пустое состояние отображается при отсутствии задач

---

## Примечания

- **Стилизация:** Стили карточек и пагинации будут добавлены в следующем этапе (TASK-055-04)
- **Клик на карточку:** Обработка клика будет реализована в будущих этапах
- **Статус задачи:** Поле `STATUS` загружается, но не отображается (добавим позже)

---

## Следующий этап

После завершения этого этапа переходим к **TASK-055-04: Стилизация и UX (Frontend)**.

