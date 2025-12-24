# TASK-042-04: Улучшения UX — ленивая загрузка, плавные переходы и исправление отступов

**Дата создания:** 2025-12-16 13:13 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 4 из TASK-042 (улучшения после базовой реализации)

## Цель этапа
Улучшить пользовательский опыт попапа `ResponsibleModal.vue` путём внедрения ленивой загрузки, плавных переходов между уровнями, stagger-анимации для карточек тикетов и исправления отступов для единообразия с соседним модулем.

## Контекст
- **Текущее состояние:** 
  - Базовый функционал попапа реализован (этапы 1-3)
  - Переходы между уровнями происходят мгновенно без анимации
  - Карточки тикетов появляются одновременно без плавной анимации
  - Отступы карточек тикетов не соответствуют соседнему модулю «График состояния»
- **Требуется:** 
  1. Внедрить ленивую загрузку тикетов (загрузка только при переходе на уровень 2)
  2. Добавить плавные переходы между уровнями попапа
  3. Реализовать stagger-анимацию для карточек тикетов
  4. Исправить отступы карточек для единообразия с `EmployeeDetailsModal.vue`
  5. Добавить визуальную обратную связь при взаимодействии

## Анализ реализации в соседнем модуле

### EmployeeDetailsModal.vue (модуль «График состояния»)

**Ключевые особенности:**
- Используется `<Transition name="level" mode="out-in">` для переходов между уровнями
- Используется `<TransitionGroup name="ticket">` для stagger-анимации карточек
- Используется `<Transition name="loading" mode="out-in">` для состояний загрузки
- Отступы: `.level-4 .modal-body { padding: 0; }`, отступы только в `.tickets-list { padding: 20px; }`
- Визуальная обратная связь при клике (scale эффект)

**Структура отступов:**
```css
.level-4 .modal-body {
  padding: 0; /* Убираем padding, так как он будет в .tickets-list */
}

.level-4 .tickets-list-container {
  padding: 0;
}

.level-4 .tickets-list {
  padding: 20px; /* Единственный источник отступов */
}
```

## Задачи этапа

### 1) Внедрение ленивой загрузки тикетов
- **Проблема:** Тикеты загружаются до перехода на уровень 2, что создаёт задержку
- **Решение:** Переход на уровень 2 происходит сразу, загрузка тикетов — асинхронно после перехода
- **Реализация:**
  ```javascript
  async function handleEmployeeClick(employee, event = null) {
    // Визуальная обратная связь
    if (event && event.currentTarget) {
      event.currentTarget.style.transform = 'scale(0.98)';
      setTimeout(() => {
        if (event.currentTarget) {
          event.currentTarget.style.transform = '';
        }
      }, 150);
    }
    
    selectedEmployee.value = employee;
    // Переход на уровень 2 происходит сразу для плавной анимации
    popupLevel.value = 2;
    // Загрузка тикетов происходит после перехода (ленивая загрузка)
    await loadEmployeeTickets(employee.id);
  }
  ```

### 2) Плавные переходы между уровнями
- **Проблема:** Переходы между уровнями происходят мгновенно без анимации
- **Решение:** Использовать Vue `<Transition>` с анимацией fade + slide
- **Реализация:**
  ```vue
  <Transition name="level" mode="out-in">
    <div v-if="popupLevel === 1" key="level-1" class="level-1">
      <!-- Уровень 1 -->
    </div>
    <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
      <!-- Уровень 2 -->
    </div>
  </Transition>
  ```
- **CSS анимации:**
  ```css
  .level-enter-active {
    transition: all 0.3s ease-out;
  }
  .level-enter-from {
    opacity: 0;
    transform: translateX(20px);
  }
  .level-enter-to {
    opacity: 1;
    transform: translateX(0);
  }
  .level-leave-active {
    transition: all 0.3s ease-in;
  }
  .level-leave-from {
    opacity: 1;
    transform: translateX(0);
  }
  .level-leave-to {
    opacity: 0;
    transform: translateX(-20px);
  }
  ```

### 3) Stagger-анимация для карточек тикетов
- **Проблема:** Все карточки тикетов появляются одновременно
- **Решение:** Использовать `<TransitionGroup>` с задержкой для каждой карточки
- **Реализация:**
  ```vue
  <TransitionGroup name="ticket" tag="div" class="tickets-list">
    <TicketCard
      v-for="(ticket, index) in tickets"
      :key="ticket.id"
      :ticket="ticket"
      :style="{ '--ticket-index': index }"
    />
  </TransitionGroup>
  ```
- **CSS анимации:**
  ```css
  .ticket-enter-active {
    transition: opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    transition-delay: calc(var(--ticket-index, 0) * 50ms); /* Stagger-эффект */
    will-change: opacity, transform;
  }
  .ticket-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  .ticket-enter-to {
    opacity: 1;
    transform: translateY(0) scale(1);
    will-change: auto;
  }
  ```

### 4) Плавные переходы для состояний загрузки
- **Проблема:** Состояния (загрузка, ошибка, пусто, список) переключаются мгновенно
- **Решение:** Использовать `<Transition name="loading" mode="out-in">` для всех состояний
- **Реализация:**
  ```vue
  <Transition name="loading" mode="out-in">
    <div v-if="isLoadingTickets" key="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>Загрузка тикетов...</p>
    </div>
    <div v-else-if="error" key="error" class="error-state">
      <!-- Состояние ошибки -->
    </div>
    <div v-else-if="tickets.length === 0" key="empty" class="empty-state">
      <!-- Пустое состояние -->
    </div>
    <div v-else key="tickets" class="tickets-list-container">
      <!-- Список тикетов -->
    </div>
  </Transition>
  ```

### 5) Исправление отступов карточек тикетов
- **Проблема:** Двойные отступы из-за padding в `.modal__body` и `.tickets-list`
- **Решение:** Убрать padding из `.modal__body` на уровне 2, оставить только в `.tickets-list`
- **Реализация:**
  ```css
  /* Уровень 1: сохраняем padding для списка сотрудников */
  .modal__body {
    padding: 16px 20px;
  }
  
  /* Уровень 2: убираем padding, так как он будет в .tickets-list */
  .level-2 .modal__body {
    padding: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .tickets-list-container {
    padding: 0; /* Убираем padding */
  }
  
  .tickets-list {
    padding: 20px; /* Единственный источник отступов */
  }
  ```

### 6) Визуальная обратная связь
- **Проблема:** Нет визуальной обратной связи при клике на элементы
- **Решение:** Добавить эффекты scale при клике и hover при наведении
- **Реализация:**
  ```css
  .responsible-list__item--clickable {
    cursor: pointer;
    transition: background-color 0.2s;
  }
  .responsible-list__item--clickable:hover {
    background: var(--b24-bg-hover, #e9ecef);
  }
  
  .tickets-list .ticket-card:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  .tickets-list .ticket-card:active {
    transform: scale(0.98);
    opacity: 0.8;
  }
  ```

## Технические детали реализации

### Файлы, которые были изменены

1. **`vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`**
   - Добавлен `<Transition name="level" mode="out-in">` для переходов между уровнями
   - Добавлен `<Transition name="loading" mode="out-in">` для состояний загрузки
   - Добавлен `<TransitionGroup name="ticket">` для stagger-анимации карточек
   - Обновлена функция `handleEmployeeClick()` для визуальной обратной связи
   - Добавлены CSS анимации для всех переходов
   - Исправлены отступы для уровня 2

### Структура отступов (до и после)

**До исправления:**
```css
.modal__body {
  padding: 16px 20px; /* Применяется ко всем уровням */
}
.tickets-list {
  padding: 20px; /* Дополнительные отступы */
}
/* Итог: двойные отступы (16px + 20px = 36px) */
```

**После исправления:**
```css
.modal__body {
  padding: 16px 20px; /* Только для уровня 1 */
}
.level-2 .modal__body {
  padding: 0; /* Убрано для уровня 2 */
}
.tickets-list-container {
  padding: 0; /* Убрано */
}
.tickets-list {
  padding: 20px; /* Единственный источник отступов */
}
/* Итог: единые отступы (20px) */
```

## Ступенчатые подзадачи

1. **Изучение реализации в EmployeeDetailsModal**
   - Проанализировать использование `<Transition>` и `<TransitionGroup>`
   - Изучить структуру отступов
   - Изучить визуальную обратную связь

2. **Внедрение ленивой загрузки**
   - Обновить функцию `handleEmployeeClick()` для немедленного перехода
   - Оставить загрузку тикетов асинхронной после перехода

3. **Добавление плавных переходов**
   - Обернуть уровни в `<Transition name="level">`
   - Добавить CSS анимации для переходов
   - Обернуть состояния в `<Transition name="loading">`

4. **Реализация stagger-анимации**
   - Обернуть список тикетов в `<TransitionGroup name="ticket">`
   - Добавить `--ticket-index` для каждой карточки
   - Добавить CSS анимации с задержкой

5. **Исправление отступов**
   - Добавить `.level-2 .modal__body { padding: 0; }`
   - Убедиться, что `.tickets-list-container` имеет `padding: 0`
   - Оставить отступы только в `.tickets-list`

6. **Добавление визуальной обратной связи**
   - Добавить эффект scale при клике на сотрудника
   - Добавить hover-эффекты для карточек тикетов
   - Добавить active-эффекты для карточек

## Критерии приёмки этапа

- [ ] Переходы между уровнями происходят плавно с анимацией fade + slide
- [ ] Тикеты загружаются только при переходе на уровень 2 (ленивая загрузка)
- [ ] Карточки тикетов появляются последовательно с stagger-эффектом (задержка 50ms)
- [ ] Состояния загрузки переключаются плавно с анимацией fade
- [ ] Отступы карточек тикетов соответствуют соседнему модулю (20px, без двойных отступов)
- [ ] При клике на сотрудника есть визуальная обратная связь (scale эффект)
- [ ] При hover на карточках тикетов есть визуальная обратная связь (поднятие и тень)
- [ ] Все анимации оптимизированы для производительности (will-change, transform)

## Дополнительные уточнения

### Оптимизация производительности
- Использован `will-change` для оптимизации анимаций
- Аппаратное ускорение через `transform: translateZ(0)`
- Плавная прокрутка с `scroll-behavior: smooth`
- Отключение `will-change` после завершения анимации

### Единообразие с соседним модулем
- Структура отступов идентична `EmployeeDetailsModal.vue`
- Анимации переходов идентичны соседнему модулю
- Визуальная обратная связь идентична соседнему модулю

### Совместимость
- Все изменения обратно совместимы
- Не ломают существующий функционал
- Улучшают UX без изменения логики

## История правок

- 2025-12-16 13:13 (UTC+3, Брест): Создан этап 4 задачи TASK-042
- 2025-12-16 13:13 (UTC+3, Брест): Реализована ленивая загрузка и плавные переходы
- 2025-12-16 13:13 (UTC+3, Брест): Исправлены отступы карточек тикетов

