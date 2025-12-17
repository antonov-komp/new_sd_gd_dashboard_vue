# TASK-053-02: Создание информационного попапа выбора режима

**Дата создания:** 2025-12-17 13:35 (UTC+3, Брест)  
**Статус:** 📋 Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-053: Изменение формата выбора периода и внедрение 3-месячного режима](./TASK-053-period-selection-3-months-mode.md)  
**Этап:** 1.2 (Часть 1: Изменение формата выбора периода)

---

## 📋 Описание

Создать информационный попап, который будет показываться при первом входе в модуль «График приёма и закрытий сектора 1С». Попап должен объяснять пользователю различия между двумя режимами отображения:
1. **4 последние недели**
2. **3 последних месяца**

Попап должен иметь возможность скрытия с флагом "Не показывать снова" и сохранять это предпочтение в localStorage.

---

## 🎯 Контекст

### Текущее состояние

**Проблема:**
- Пользователи не понимают различий между режимами отображения
- Нет объяснения, когда использовать какой режим
- При первом входе в модуль нет подсказок

### Требуемое состояние

**Информационный попап:**
- Показывается только при первом входе в модуль
- Объясняет различия между режимами
- Имеет возможность скрытия с флагом "Не показывать снова"
- Сохраняет предпочтение пользователя в localStorage

---

## 🔧 Технические требования

### Компонент: PeriodModeInfoModal.vue

**Расположение:** `vue-app/src/components/graph-admission-closure/PeriodModeInfoModal.vue`

**Props:**
```typescript
{
  isVisible: boolean,  // Видимость попапа
}
```

**Emits:**
```typescript
{
  'close': () => void,  // Закрытие попапа
}
```

**Функциональность:**
- Показывать попап только при первом входе в модуль
- Проверять флаг в localStorage: `graph-admission-closure-period-mode-info-shown`
- Если флаг установлен — не показывать попап
- При установке чекбокса "Не показывать снова" — установить флаг
- Закрытие попапа по кнопке "Понятно" или клику вне попапа

**Содержимое попапа:**
- Заголовок: "Выбор режима отображения"
- Описание режима "4 последние недели"
- Описание режима "3 последних месяца"
- Чекбокс "Не показывать снова"
- Кнопка "Понятно"

**Визуальный дизайн:**
- Модальное окно в стиле Bitrix24
- Центрирование на экране
- Затемнение фона при открытии
- Анимация появления/исчезновения
- Адаптивность (работа на мобильных устройствах)

### Интеграция в GraphAdmissionClosureDashboard.vue

**Изменения:**
1. Добавить состояние `showPeriodModeInfo: ref(false)`
2. Проверять флаг в localStorage при монтировании компонента
3. Показывать попап при первом входе (если флаг не установлен)
4. Добавить компонент `PeriodModeInfoModal` в template

**Логика показа попапа:**
```javascript
const STORAGE_KEY = 'graph-admission-closure-period-mode-info-shown';

onMounted(() => {
  const infoShown = localStorage.getItem(STORAGE_KEY);
  if (!infoShown || infoShown !== 'true') {
    showPeriodModeInfo.value = true;
  }
});
```

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Создание компонента PeriodModeInfoModal.vue

1. **Создать файл компонента:**
   ```bash
   touch vue-app/src/components/graph-admission-closure/PeriodModeInfoModal.vue
   ```

2. **Реализовать структуру компонента:**
   - Template с модальным окном
   - Script setup с props и emits
   - Стили в соответствии с гайдлайнами Bitrix24

3. **Добавить логику чекбокса "Не показывать снова":**
   - При установке чекбокса сохранять флаг в localStorage
   - При закрытии попапа проверять чекбокс и устанавливать флаг

4. **Добавить обработчики событий:**
   - Закрытие по кнопке "Понятно"
   - Закрытие по клику вне попапа (опционально)
   - Закрытие по клавише Escape

### Шаг 2: Интеграция в GraphAdmissionClosureDashboard.vue

1. **Импортировать компонент:**
   ```javascript
   import PeriodModeInfoModal from './PeriodModeInfoModal.vue';
   ```

2. **Добавить состояние:**
   ```javascript
   const showPeriodModeInfo = ref(false);
   ```

3. **Добавить логику проверки флага:**
   ```javascript
   onMounted(() => {
     const infoShown = localStorage.getItem('graph-admission-closure-period-mode-info-shown');
     if (!infoShown || infoShown !== 'true') {
       showPeriodModeInfo.value = true;
     }
   });
   ```

4. **Добавить компонент в template:**
   - Разместить в конце template
   - Передать `:is-visible="showPeriodModeInfo"`
   - Обработать событие `@close`

---

## 🔍 Детали реализации

### Логика показа попапа

**Условия показа:**
1. Первый вход в модуль (флаг не установлен в localStorage)
2. Флаг `graph-admission-closure-period-mode-info-shown` не равен `'true'`

**Условия скрытия:**
1. Пользователь нажал "Понятно" и установил чекбокс "Не показывать снова"
2. Флаг установлен в localStorage

**Обработка ошибок localStorage:**
- Если localStorage недоступен → показывать попап каждый раз (не сохранять флаг)
- Логировать предупреждения в консоль

### Анимации

**Появление:**
- Fade-in для overlay (0.3s)
- Scale + fade-in для модального окна (0.3s)
- Использовать CSS transitions для плавности

**Исчезновение:**
- Fade-out для overlay и модального окна (0.3s)
- Обратный scale для модального окна

### Закрытие попапа

**Способы закрытия:**
1. Кнопка "Понятно"
2. Кнопка "×" в заголовке
3. Клик вне модального окна (на overlay)
4. Клавиша Escape

**Обработка всех способов:**
- Все способы должны вызывать одну функцию `handleClose()`
- Проверять чекбокс перед закрытием
- Сохранять флаг только если чекбокс установлен

### Доступность

**ARIA-атрибуты:**
- `role="dialog"` для модального окна
- `aria-labelledby="modal-title"` для связи с заголовком
- `aria-modal="true"` для указания модальности
- `aria-label` для кнопки закрытия

**Фокус:**
- При открытии попапа фокус должен быть на кнопке "Понятно"
- При закрытии фокус должен вернуться на элемент, который открыл попап
- Tab-навигация должна быть ограничена внутри попапа

**Клавиатура:**
- Escape — закрытие попапа
- Tab — навигация по элементам внутри попапа
- Enter/Space на кнопке "Понятно" — закрытие

## 💻 Примеры кода

### PeriodModeInfoModal.vue

```vue
<template>
  <Transition name="modal-fade">
    <div
      v-if="isVisible"
      class="modal-overlay"
      @click.self="handleClose"
      @keydown.esc="handleClose"
    >
      <div class="modal-container" role="dialog" aria-labelledby="modal-title" aria-modal="true">
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">
            <span class="modal-icon">ℹ️</span>
            Выбор режима отображения
          </h2>
          <button
            class="modal-close-btn"
            @click="handleClose"
            aria-label="Закрыть"
            type="button"
          >
            ×
          </button>
        </div>
        
        <div class="modal-body">
          <div class="mode-description">
            <div class="mode-item">
              <div class="mode-header">
                <span class="mode-icon">📅</span>
                <h3 class="mode-title">4 последние недели</h3>
              </div>
              <p class="mode-text">
                Отображение данных за последние 4 недели с детализацией по неделям. 
                Подходит для краткосрочного анализа динамики поступления и закрытия тикетов.
              </p>
            </div>
            
            <div class="mode-item">
              <div class="mode-header">
                <span class="mode-icon">📊</span>
                <h3 class="mode-title">3 последних месяца</h3>
              </div>
              <p class="mode-text">
                Отображение данных за последние 3 месяца с детализацией по месяцам 
                и неделям внутри месяцев. Подходит для долгосрочного анализа и выявления трендов.
              </p>
            </div>
          </div>
          
          <div class="modal-checkbox">
            <label class="checkbox-label">
              <input
                type="checkbox"
                v-model="dontShowAgain"
                class="checkbox-input"
              />
              <span class="checkbox-text">Не показывать снова</span>
            </label>
          </div>
        </div>
        
        <div class="modal-footer">
          <button
            class="btn btn-primary"
            @click="handleClose"
            type="button"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['close']);

const dontShowAgain = ref(false);
const STORAGE_KEY = 'graph-admission-closure-period-mode-info-shown';

/**
 * Обработка закрытия попапа
 */
function handleClose() {
  // Сохранение флага, если установлен чекбокс
  if (dontShowAgain.value) {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      console.warn('[PeriodModeInfoModal] Failed to save to localStorage:', error);
      // Продолжаем закрытие даже при ошибке localStorage
    }
  }
  
  emit('close');
}

/**
 * Обработка нажатия Escape
 */
function handleEscape(event) {
  if (event.key === 'Escape' && props.isVisible) {
    handleClose();
  }
}

// Обработчик Escape при монтировании
onMounted(() => {
  if (props.isVisible) {
    document.addEventListener('keydown', handleEscape);
    // Фокус на кнопке "Понятно"
    nextTick(() => {
      const button = document.querySelector('.btn-primary');
      if (button) {
        button.focus();
      }
    });
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape);
});

// Обновление обработчика при изменении видимости
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleEscape);
    nextTick(() => {
      const button = document.querySelector('.btn-primary');
      if (button) {
        button.focus();
      }
    });
  } else {
    document.removeEventListener('keydown', handleEscape);
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--spacing-lg, 20px);
}

.modal-container {
  background-color: var(--b24-bg-white, #ffffff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 10px 25px rgba(0, 0, 0, 0.2));
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-lg, 20px);
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
}

.modal-title {
  margin: 0;
  font-size: var(--font-size-xl, 20px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
}

.modal-icon {
  font-size: 24px;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--b24-text-secondary, #6b7280);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm, 4px);
  transition: all var(--transition-base, 0.2s);
}

.modal-close-btn:hover {
  background-color: var(--b24-bg-light, #f5f7fb);
  color: var(--b24-text-primary, #111827);
}

.modal-body {
  padding: var(--spacing-lg, 20px);
  flex: 1;
}

.mode-description {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg, 20px);
  margin-bottom: var(--spacing-lg, 20px);
}

.mode-item {
  padding: var(--spacing-md, 16px);
  background-color: var(--b24-bg-light, #f9fafb);
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.mode-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  margin-bottom: var(--spacing-sm, 8px);
}

.mode-icon {
  font-size: 24px;
}

.mode-title {
  margin: 0;
  font-size: var(--font-size-lg, 16px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.mode-text {
  margin: 0;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.6;
}

.modal-checkbox {
  padding-top: var(--spacing-md, 16px);
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm, 8px);
  cursor: pointer;
  font-size: var(--font-size-base, 14px);
  color: var(--b24-text-primary, #111827);
}

.checkbox-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.checkbox-text {
  user-select: none;
}

.modal-footer {
  padding: var(--spacing-lg, 20px);
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: var(--spacing-sm, 8px) var(--spacing-lg, 20px);
  border: none;
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-base, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
}

.btn-primary {
  background-color: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #ffffff);
}

.btn-primary:hover {
  background-color: var(--b24-primary-hover, #0056b3);
}

/* Анимации */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-container,
.modal-fade-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from .modal-container,
.modal-fade-leave-to .modal-container {
  transform: scale(0.9);
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-overlay {
    padding: var(--spacing-md, 16px);
  }
  
  .modal-container {
    max-width: 100%;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: var(--spacing-md, 16px);
  }
}
</style>
```

### Интеграция в GraphAdmissionClosureDashboard.vue

```vue
<template>
  <div class="ac-dashboard">
    <!-- ... существующий код ... -->
    
    <!-- Информационный попап -->
    <PeriodModeInfoModal
      :is-visible="showPeriodModeInfo"
      @close="showPeriodModeInfo = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import PeriodModeInfoModal from './PeriodModeInfoModal.vue';
// ... остальные импорты ...

const showPeriodModeInfo = ref(false);
const STORAGE_KEY = 'graph-admission-closure-period-mode-info-shown';

/**
 * Проверка флага показа попапа при монтировании
 */
onMounted(() => {
  const infoShown = localStorage.getItem(STORAGE_KEY);
  if (!infoShown || infoShown !== 'true') {
    showPeriodModeInfo.value = true;
  }
});
</script>
```

---

## ✅ Критерии приёмки

- [ ] Компонент `PeriodModeInfoModal.vue` создан и работает корректно
- [ ] Попап показывается при первом входе в модуль
- [ ] Попап содержит описание обоих режимов ("4 последние недели" и "3 последних месяца")
- [ ] Чекбокс "Не показывать снова" работает корректно
- [ ] При установке чекбокса флаг сохраняется в localStorage
- [ ] После закрытия попап больше не показывается (если установлен флаг)
- [ ] Попап можно закрыть по кнопке "Понятно"
- [ ] Попап можно закрыть по клику вне попапа (опционально)
- [ ] Попап можно закрыть по клавише Escape
- [ ] Компонент соответствует гайдлайнам Bitrix24 UI
- [ ] Анимация появления/исчезновения работает плавно
- [ ] Компонент адаптивен (работает на мобильных устройствах)
- [ ] Добавлены ARIA-атрибуты для доступности

---

## 🔗 Зависимости

**Зависит от:**
- [TASK-053-01: Создание переключателя режимов](./TASK-053-01-period-mode-selector.md) — попап объясняет режимы, которые выбираются в переключателе

**Зависит от этого этапа:**
- Нет (это информационный компонент)

---

## 📝 История правок

- **2025-12-17 13:35 (UTC+3, Брест):** Создана подзадача TASK-053-02
  - Определены требования для создания информационного попапа
  - Зафиксированы технические требования и примеры кода
  - Добавлены критерии приёмки

---

## 💡 Примечания

- **Визуальный дизайн:** Попап должен быть информативным, но не перегруженным текстом
- **LocalStorage:** Ключ должен быть уникальным для модуля
- **Тестирование:** Протестировать показ попапа при первом входе, работу чекбокса, сохранение флага
- **UX:** Попап не должен мешать работе пользователя, но должен быть заметным

