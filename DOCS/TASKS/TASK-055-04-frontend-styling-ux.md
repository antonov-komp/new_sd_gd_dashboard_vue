# TASK-055-04: Стилизация и UX для попапа со списком задач

**Дата создания:** 2025-12-17 17:04 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer) / UX/UI-дизайнер  
**Связь с задачей:** Этап 4 из TASK-055  
**Зависимости:** TASK-055-03

---

## Цель этапа

Обеспечить единообразный стиль и хороший UX для попапа со списком задач, включая стилизацию карточек, пагинации, адаптивность и анимации.

---

## Контекст

- **Текущее состояние:**
  - Компонент попапа реализован, но стили отсутствуют или минимальны
  - Нет адаптивности для мобильных устройств
  - Нет плавных анимаций переходов

- **Требуется:**
  1. Стилизация карточек задач
  2. Стилизация пагинации
  3. Адаптивность для мобильных устройств
  4. Анимации и переходы

---

## Задачи этапа

### 1) Стилизация карточек задач

**Файл:** `vue-app/src/components/tickets-time-tracking/TimeTrackingDetailModal.vue`

**Стили:**

```css
/* Карточки задач */
.tasks-cards-container {
  width: 100%;
}

.tasks-cards-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.task-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
  border-color: #d1d5db;
}

/* Состояния карточек */
.task-card--overdue {
  border-left: 4px solid #dc2626;
  background-color: #fef2f2;
}

.task-card--completed {
  border-left: 4px solid #10b981;
  background-color: #f0fdf4;
}

.task-card--in-progress {
  border-left: 4px solid #f59e0b;
  background-color: #fffbeb;
}

/* Заголовок карточки */
.task-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.task-card__number {
  font-weight: 600;
  font-size: 16px;
  color: #007bff;
}

.task-card__time {
  font-weight: 600;
  font-size: 14px;
  color: #059669;
  background-color: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
}

/* Название задачи */
.task-card__title {
  font-size: 16px;
  font-weight: 500;
  color: #111827;
  margin-bottom: 16px;
  line-height: 1.5;
}

/* Даты */
.task-card__dates {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.task-card__date-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.date-icon {
  font-size: 16px;
}

.date-label {
  color: #6b7280;
  min-width: 80px;
}

.date-value {
  color: #374151;
  font-weight: 500;
}

.date-value--overdue {
  color: #dc2626;
  font-weight: 600;
}

/* Плейсхолдер для статуса */
.task-card__status-placeholder {
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
  font-size: 12px;
  color: #9ca3af;
  font-style: italic;
  min-height: 20px;
}
```

---

### 2) Стилизация пагинации

**Стили:**

```css
/* Пагинация */
.tasks-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

.pagination-btn {
  padding: 8px 16px;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.pagination-btn:hover:not(:disabled) {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-pages {
  display: flex;
  gap: 4px;
}

.pagination-page {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background-color: #ffffff;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination-page:hover {
  background-color: #f9fafb;
  border-color: #9ca3af;
}

.pagination-page--active {
  background-color: #007bff;
  color: #ffffff;
  border-color: #007bff;
}

.pagination-page--active:hover {
  background-color: #0056b3;
  border-color: #0056b3;
}
```

---

### 3) Стилизация кнопки "Список задач" и навигации

**Стили:**

```css
/* Кнопка "Список задач" */
.detail-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}

.btn-tasks-list {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-tasks-list:hover {
  background-color: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
}

.btn-tasks-list:active {
  transform: translateY(0);
}

/* Уровень 2: Список задач */
.tasks-list-level {
  width: 100%;
}

.tasks-list-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.btn-back {
  padding: 8px 16px;
  background-color: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background-color: #e5e7eb;
  border-color: #9ca3af;
}

.tasks-list-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}
```

---

### 4) Адаптивность для мобильных устройств

**Медиа-запросы:**

```css
/* Адаптивность для мобильных */
@media (max-width: 768px) {
  .task-card {
    padding: 12px;
  }
  
  .task-card__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .task-card__title {
    font-size: 14px;
  }
  
  .task-card__dates {
    gap: 6px;
  }
  
  .task-card__date-item {
    font-size: 13px;
  }
  
  .date-label {
    min-width: 70px;
    font-size: 12px;
  }
  
  .tasks-pagination {
    flex-wrap: wrap;
    gap: 4px;
  }
  
  .pagination-btn {
    padding: 6px 12px;
    font-size: 12px;
  }
  
  .pagination-page {
    min-width: 32px;
    height: 32px;
    padding: 0 8px;
    font-size: 12px;
  }
  
  .tasks-list-title {
    font-size: 16px;
  }
  
  .btn-tasks-list {
    padding: 10px 20px;
    font-size: 14px;
  }
}
```

---

### 5) Анимации и переходы

**Transition для уровней:**

```css
/* Transition анимации между уровнями */
.level-enter-active,
.level-leave-active {
  transition: all 0.3s ease;
}

.level-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.level-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
```

**Transition для карточек:**

```css
/* Transition для карточек */
.task-card-enter-active,
.task-card-leave-active {
  transition: all 0.3s ease;
}

.task-card-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.task-card-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
```

**Индикатор загрузки:**

```css
/* Состояния загрузки, ошибки, пустое */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon,
.empty-state-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-title,
.empty-state-message {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.error-message {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 16px;
}

.btn-retry {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background-color: #0056b3;
}
```

---

## Критерии приёмки

- [ ] Карточки задач стилизованы и выглядят единообразно
- [ ] Пагинация стилизована и работает корректно
- [ ] Адаптивность для мобильных устройств работает
- [ ] Плавные переходы между уровнями работают
- [ ] Анимация появления карточек работает
- [ ] Индикаторы загрузки отображаются корректно
- [ ] Стили соответствуют другим попапам в проекте
- [ ] Hover-эффекты работают на всех элементах

---

## Тестирование

### 1. Тестирование стилей

- [ ] Карточки задач отображаются с правильными стилями
- [ ] Состояния карточек (просрочено, завершено, в работе) визуально различимы
- [ ] Пагинация стилизована и работает корректно
- [ ] Кнопки имеют правильные hover-эффекты

### 2. Тестирование адаптивности

- [ ] На мобильных устройствах (< 768px) карточки отображаются компактно
- [ ] Пагинация адаптируется под размер экрана
- [ ] Текст читаем на всех размерах экрана

### 3. Тестирование анимаций

- [ ] Переходы между уровнями плавные
- [ ] Анимация появления карточек работает
- [ ] Индикатор загрузки отображается корректно

---

## Примечания

- **Цветовая схема:** Используется цветовая схема проекта (синий #007bff для primary, красный #dc2626 для ошибок, зелёный #10b981 для успеха)
- **Шрифты:** Используются системные шрифты проекта
- **Отступы:** Соблюдается модульная сетка (8px, 16px, 24px)

---

## Следующий этап

После завершения этого этапа переходим к **TASK-055-05: Обработка ошибок и состояний (Frontend)**.

