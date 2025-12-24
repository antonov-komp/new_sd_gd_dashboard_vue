# TASK-024-02: Унификация цветов в GraphStateDashboard

**Дата создания:** 2025-12-11 11:25 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-024 (Этап 2)

---

## 📋 Цель задачи

Заменить все кастомные цвета на переменные Bitrix24 UI Kit в компоненте `GraphStateDashboard.vue`. Обеспечить полное соответствие дизайна гайдлайнам Bitrix24 и единообразие цветовой схемы во всём компоненте.

---

## 🎯 Контекст

В компоненте `GraphStateDashboard.vue` используется множество кастомных цветов, которые не соответствуют стандартам Bitrix24 UI Kit. Это создаёт визуальную несогласованность и усложняет поддержку дизайна.

**Зависимости:**
- **Обязательно:** TASK-024-01 должна быть завершена (система CSS-переменных создана)
- Родительская задача TASK-024 создана
- Компонент `GraphStateDashboard.vue` существует

**Влияет на:**
- Визуальный вид модуля "График состояния"
- Соответствие гайдлайнам Bitrix24
- Последующие этапы TASK-024 (этапы 3-10)

---

## 🔍 Анализ текущих цветов

### Полный список используемых цветов в GraphStateDashboard.vue

#### 1. Основные цвета (кнопки, ссылки)

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `#3b82f6` | `.breadcrumb-link`, `.btn-retry`, `.mobile-filters-toggle`, `outline:focus` | `var(--b24-primary)` |
| `#2563eb` | `.breadcrumb-link:hover`, `.btn-retry:hover`, `.mobile-filters-toggle:hover` | `var(--b24-primary-hover)` |
| `#ef4444` | `.btn-reset-filters` | `var(--b24-danger)` |
| `#dc2626` | `.btn-reset-filters:hover`, `.filter-error` | `var(--b24-danger-hover)` |
| `#10b981` | `.btn-export-pdf` | `var(--b24-success)` |
| `#059669` | `.btn-export-pdf:hover` | `var(--b24-success-hover)` |

#### 2. Цвета текста

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `#1f2937` | `.breadcrumb-current`, `.dashboard-title`, `.filters-header h2` | `var(--b24-text-primary)` |
| `#6b7280` | `.breadcrumb-separator`, `.dashboard-subtitle`, `.filter-hint`, `.date-input-group label` | `var(--b24-text-secondary)` |
| `#374151` | `.filter-label` | `var(--b24-text-primary)` |
| `white` | Кнопки (текст на цветном фоне) | `var(--b24-text-inverse)` |

#### 3. Цвета границ

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `#e5e7eb` | `.dashboard-header border-bottom` | `var(--b24-border-light)` |
| `#d1d5db` | `.employees-select`, `.date-range-select`, `.date-input` | `var(--b24-border-medium)` |

#### 4. Цвета фонов

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `#f9fafb` | `.filters-panel` | `var(--b24-bg-light)` |
| `white` | `.employees-select`, `.date-range-select`, `.date-input`, `.dashboard-content` | `var(--b24-bg-white)` |
| `#ffffff` | `backgroundColor` в `exportToPDF` | `var(--b24-bg-white)` |

#### 5. Цвета сообщений об ошибках

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `#fee2e2` | `.error-message background-color` | `var(--b24-danger-light)` |
| `#fecaca` | `.error-message border` | `var(--b24-danger-light)` (или более тёмный оттенок) |
| `#991b1b` | `.error-header h3`, `.error-close` | `var(--b24-danger)` (или создать `--b24-danger-dark`) |
| `#7f1d1d` | `.error-text`, `.error-details summary` | `var(--b24-danger)` |
| `#fef2f2` | `.error-details pre background-color` | `var(--b24-danger-lighter)` |

#### 6. Специальные случаи

| Текущий цвет | Использование | Замена на переменную |
|--------------|---------------|---------------------|
| `rgba(0, 0, 0, 0.1)` | `.btn-export-pdf:hover box-shadow` | Можно оставить или использовать `var(--shadow-md)` |

---

## 🏗️ Архитектура решения

### Подход к замене

1. **Поэтапная замена** — заменять цвета группами (кнопки, текст, фоны, ошибки)
2. **Проверка после каждой группы** — тестировать визуально после замены каждой категории
3. **Сохранение функциональности** — убедиться, что все состояния (hover, active, disabled) работают корректно
4. **Проверка контрастности** — проверить контрастность текста на фонах после замены

### Структура изменений

```
vue-app/src/components/graph-state/
└── GraphStateDashboard.vue
    └── <style scoped>
        ├── Основные цвета (кнопки, ссылки)
        ├── Цвета текста
        ├── Цвета границ
        ├── Цвета фонов
        ├── Цвета сообщений об ошибках
        └── Адаптивные стили
```

---

## 📝 Детальные шаги реализации

### Шаг 1: Подготовка и анализ

**Действие:** Подготовить рабочую копию компонента и проанализировать все использования цветов

1. Открыть файл `vue-app/src/components/graph-state/GraphStateDashboard.vue`
2. Убедиться, что файл `bitrix24-ui-variables.css` подключен (TASK-024-01)
3. Создать резервную копию компонента (опционально, если используется Git)
4. Просмотреть все использования цветов в секции `<style scoped>`
5. Составить список всех замен (можно использовать таблицу выше)

**Проверка:**
- [ ] Файл компонента открыт
- [ ] CSS-переменные доступны (проверить в DevTools)
- [ ] Список замен составлен

---

### Шаг 2: Замена цветов кнопок и ссылок

**Действие:** Заменить все цвета кнопок и ссылок на переменные Bitrix24

#### 2.1. Breadcrumb ссылка

**Найти:**
```css
.breadcrumb-link {
  color: #3b82f6;
  text-decoration: none;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: #2563eb;
  text-decoration: underline;
}
```

**Заменить на:**
```css
.breadcrumb-link {
  color: var(--b24-primary);
  text-decoration: none;
  transition: color var(--transition-base);
}

.breadcrumb-link:hover {
  color: var(--b24-primary-hover);
  text-decoration: underline;
}
```

#### 2.2. Кнопка сброса фильтров

**Найти:**
```css
.btn-reset-filters {
  padding: 8px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Заменить на:**
```css
.btn-reset-filters {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-danger);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: var(--b24-danger-hover);
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

#### 2.3. Кнопка экспорта в PDF

**Найти:**
```css
.btn-export-pdf {
  padding: 10px 20px;
  background-color: #10b981;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-export-pdf:hover:not(:disabled) {
  background-color: #059669;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.btn-export-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

**Заменить на:**
```css
.btn-export-pdf {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-success);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.btn-export-pdf:hover:not(:disabled) {
  background-color: var(--b24-success-hover);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-export-pdf:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

#### 2.4. Кнопка повтора (retry)

**Найти:**
```css
.btn-retry {
  padding: 8px 16px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-retry:hover {
  background-color: #2563eb;
}
```

**Заменить на:**
```css
.btn-retry {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn-retry:hover {
  background-color: var(--b24-primary-hover);
}
```

#### 2.5. Мобильная кнопка фильтров

**Найти:**
```css
.mobile-filters-toggle {
  width: 100%;
  padding: 12px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  transition: background-color 0.2s;
}

.mobile-filters-toggle:hover {
  background-color: #2563eb;
}
```

**Заменить на:**
```css
.mobile-filters-toggle {
  width: 100%;
  padding: var(--spacing-md);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  transition: background-color var(--transition-base);
}

.mobile-filters-toggle:hover {
  background-color: var(--b24-primary-hover);
}
```

**Проверка после шага 2:**
- [ ] Все кнопки используют переменные Bitrix24
- [ ] Состояния hover работают корректно
- [ ] Состояния disabled работают корректно
- [ ] Визуально кнопки выглядят правильно

---

### Шаг 3: Замена цветов текста

**Действие:** Заменить все цвета текста на переменные Bitrix24

#### 3.1. Breadcrumb элементы

**Найти:**
```css
.breadcrumb-separator {
  color: #6b7280;
}

.breadcrumb-current {
  color: #1f2937;
  font-weight: 600;
}
```

**Заменить на:**
```css
.breadcrumb-separator {
  color: var(--b24-text-secondary);
}

.breadcrumb-current {
  color: var(--b24-text-primary);
  font-weight: 600;
}
```

#### 3.2. Заголовки

**Найти:**
```css
.dashboard-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
}

.dashboard-subtitle {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.filters-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}
```

**Заменить на:**
```css
.dashboard-title {
  margin: 0 0 var(--spacing-sm) 0;
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--b24-text-primary);
}

.dashboard-subtitle {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--b24-text-secondary);
}

.filters-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--b24-text-primary);
}
```

#### 3.3. Метки фильтров

**Найти:**
```css
.filter-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

.filter-hint {
  color: #6b7280;
  font-size: 12px;
  margin-top: 4px;
}

.date-input-group label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}
```

**Заменить на:**
```css
.filter-label {
  font-weight: 600;
  color: var(--b24-text-primary);
  font-size: var(--font-size-sm);
}

.filter-hint {
  color: var(--b24-text-secondary);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
}

.date-input-group label {
  font-size: var(--font-size-xs);
  color: var(--b24-text-secondary);
  font-weight: 500;
}
```

**Проверка после шага 3:**
- [ ] Все цвета текста используют переменные Bitrix24
- [ ] Контрастность текста достаточна (WCAG AA)
- [ ] Визуально текст читается хорошо

---

### Шаг 4: Замена цветов границ

**Действие:** Заменить все цвета границ на переменные Bitrix24

#### 4.1. Граница заголовка

**Найти:**
```css
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}
```

**Заменить на:**
```css
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 2px solid var(--b24-border-light);
}
```

#### 4.2. Границы полей ввода

**Найти:**
```css
.employees-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.date-range-select {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}

.date-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
}
```

**Заменить на:**
```css
.employees-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}

.date-range-select {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}

.date-input {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background-color: var(--b24-bg-white);
}
```

#### 4.3. Фокус для доступности

**Найти:**
```css
button:focus,
input:focus,
select:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}
```

**Заменить на:**
```css
button:focus,
input:focus,
select:focus {
  outline: 2px solid var(--b24-primary);
  outline-offset: 2px;
}
```

**Проверка после шага 4:**
- [ ] Все границы используют переменные Bitrix24
- [ ] Границы визуально согласованы
- [ ] Фокус виден и использует правильный цвет

---

### Шаг 5: Замена цветов фонов

**Действие:** Заменить все цвета фонов на переменные Bitrix24

#### 5.1. Фон панели фильтров

**Найти:**
```css
.filters-panel {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}
```

**Заменить на:**
```css
.filters-panel {
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}
```

#### 5.2. Фон контента дашборда

**Найти:**
```css
.dashboard-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Заменить на:**
```css
.dashboard-content {
  background-color: var(--b24-bg-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}
```

#### 5.3. Фон в JavaScript коде (exportToPDF)

**Найти:**
```javascript
const canvas = await html2canvas(chartElement, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff'
});
```

**Заменить на:**
```javascript
// Примечание: В JavaScript нельзя использовать CSS-переменные напрямую
// Используем значение, соответствующее переменной --b24-bg-white
const canvas = await html2canvas(chartElement, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: '#ffffff' // Соответствует var(--b24-bg-white)
});
```

**Альтернативный вариант (если нужно использовать переменную):**
```javascript
// Получить значение CSS-переменной
const bgColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--b24-bg-white').trim() || '#ffffff';

const canvas = await html2canvas(chartElement, {
  scale: 2,
  useCORS: true,
  logging: false,
  backgroundColor: bgColor
});
```

**Проверка после шага 5:**
- [ ] Все фоны используют переменные Bitrix24
- [ ] Визуально фоны согласованы
- [ ] Контрастность текста на фонах достаточна

---

### Шаг 6: Замена цветов сообщений об ошибках

**Действие:** Заменить все цвета сообщений об ошибках на переменные Bitrix24

#### 6.1. Контейнер ошибки

**Найти:**
```css
.error-message {
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
}
```

**Заменить на:**
```css
.error-message {
  background-color: var(--b24-danger-light);
  border: 1px solid var(--b24-danger-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
```

#### 6.2. Заголовок и текст ошибки

**Найти:**
```css
.error-header h3 {
  margin: 0;
  flex: 1;
  font-size: 18px;
  color: #991b1b;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #991b1b;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  margin: 10px 0;
  color: #7f1d1d;
}
```

**Заменить на:**
```css
.error-header h3 {
  margin: 0;
  flex: 1;
  font-size: var(--font-size-lg);
  color: var(--b24-danger);
}

.error-close {
  background: none;
  border: none;
  font-size: var(--font-size-xl);
  cursor: pointer;
  color: var(--b24-danger);
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-text {
  margin: var(--spacing-sm) 0;
  color: var(--b24-danger);
}
```

#### 6.3. Детали ошибки

**Найти:**
```css
.error-details summary {
  cursor: pointer;
  color: #7f1d1d;
  font-size: 14px;
}

.error-details pre {
  margin-top: 8px;
  padding: 8px;
  background-color: #fef2f2;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}
```

**Заменить на:**
```css
.error-details summary {
  cursor: pointer;
  color: var(--b24-danger);
  font-size: var(--font-size-sm);
}

.error-details pre {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--b24-danger-lighter);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  overflow-x: auto;
}
```

#### 6.4. Цвет ошибки валидации

**Найти:**
```css
.filter-error {
  color: #dc2626;
  font-size: 12px;
  margin-top: 4px;
  display: block;
}
```

**Заменить на:**
```css
.filter-error {
  color: var(--b24-danger-hover);
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
  display: block;
}
```

**Проверка после шага 6:**
- [ ] Все цвета ошибок используют переменные Bitrix24
- [ ] Сообщения об ошибках визуально согласованы
- [ ] Контрастность текста ошибок достаточна

---

### Шаг 7: Замена отступов и скруглений (дополнительно)

**Действие:** Заменить отступы и скругления на переменные (если они ещё не заменены)

**Примечание:** Этот шаг можно выполнить параллельно с заменой цветов или отдельно. Важно использовать переменные для всех отступов и скруглений.

**Примеры замен:**

1. **Отступы:**
   - `padding: 20px` → `padding: var(--spacing-md)`
   - `margin-bottom: 30px` → `margin-bottom: var(--spacing-xl)`
   - `gap: 8px` → `gap: var(--spacing-sm)`
   - `gap: 10px` → `gap: var(--spacing-sm)` (округлить до 8px)
   - `gap: 12px` → `gap: var(--spacing-md)` (округлить до 16px)
   - `gap: 15px` → `gap: var(--spacing-md)` (округлить до 16px)

2. **Скругления:**
   - `border-radius: 4px` → `border-radius: var(--radius-sm)`
   - `border-radius: 6px` → `border-radius: var(--radius-md)`
   - `border-radius: 8px` → `border-radius: var(--radius-lg)`

**Проверка после шага 7:**
- [ ] Все отступы используют переменные (кратные 8px)
- [ ] Все скругления используют переменные
- [ ] Визуально всё согласовано

---

### Шаг 8: Финальная проверка и тестирование

**Действие:** Провести полную проверку всех изменений

1. **Визуальная проверка:**
   - [ ] Открыть компонент в браузере
   - [ ] Проверить все кнопки (обычное состояние, hover, disabled)
   - [ ] Проверить все ссылки (обычное состояние, hover)
   - [ ] Проверить все поля ввода (обычное состояние, focus)
   - [ ] Проверить сообщения об ошибках (если возможно вызвать ошибку)
   - [ ] Проверить панель фильтров
   - [ ] Проверить мобильную версию

2. **Проверка контрастности:**
   - [ ] Использовать инструмент WebAIM Contrast Checker
   - [ ] Проверить контрастность всех текстов на фонах
   - [ ] Убедиться, что контрастность соответствует WCAG AA (минимум 4.5:1 для обычного текста)

3. **Проверка в разных браузерах:**
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge

4. **Проверка функциональности:**
   - [ ] Все кнопки работают
   - [ ] Все ссылки работают
   - [ ] Все фильтры работают
   - [ ] Экспорт в PDF работает (если библиотеки установлены)
   - [ ] Сообщения об ошибках отображаются корректно

---

## 🎨 Таблица соответствия цветов

### Полная таблица замен

| Категория | Текущий цвет | Переменная Bitrix24 | Комментарий |
|-----------|--------------|---------------------|-------------|
| **Кнопки Primary** | | | |
| Кнопка (основной) | `#3b82f6` | `var(--b24-primary)` | Основная кнопка |
| Кнопка (hover) | `#2563eb` | `var(--b24-primary-hover)` | При наведении |
| **Кнопки Danger** | | | |
| Кнопка сброса | `#ef4444` | `var(--b24-danger)` | Кнопка сброса фильтров |
| Кнопка сброса (hover) | `#dc2626` | `var(--b24-danger-hover)` | При наведении |
| **Кнопки Success** | | | |
| Кнопка экспорта | `#10b981` | `var(--b24-success)` | Кнопка экспорта в PDF |
| Кнопка экспорта (hover) | `#059669` | `var(--b24-success-hover)` | При наведении |
| **Текст** | | | |
| Основной текст | `#1f2937` | `var(--b24-text-primary)` | Заголовки, основной текст |
| Вторичный текст | `#6b7280` | `var(--b24-text-secondary)` | Подзаголовки, подсказки |
| Текст на кнопках | `white` | `var(--b24-text-inverse)` | Текст на цветных фонах |
| **Границы** | | | |
| Светлая граница | `#e5e7eb` | `var(--b24-border-light)` | Разделители |
| Средняя граница | `#d1d5db` | `var(--b24-border-medium)` | Поля ввода |
| **Фоны** | | | |
| Светлый фон | `#f9fafb` | `var(--b24-bg-light)` | Панель фильтров |
| Белый фон | `white`, `#ffffff` | `var(--b24-bg-white)` | Карточки, поля ввода |
| **Ошибки** | | | |
| Фон ошибки | `#fee2e2` | `var(--b24-danger-light)` | Фон сообщения об ошибке |
| Граница ошибки | `#fecaca` | `var(--b24-danger-light)` | Граница сообщения |
| Текст ошибки | `#991b1b`, `#7f1d1d` | `var(--b24-danger)` | Текст в сообщении об ошибке |
| Фон деталей ошибки | `#fef2f2` | `var(--b24-danger-lighter)` | Фон блока деталей |

---

## ✅ Критерии приёмки

### Обязательные требования:

- [ ] Все цвета кнопок заменены на переменные Bitrix24
- [ ] Все состояния кнопок (hover, active, disabled) используют переменные
- [ ] Все цвета текста заменены на переменные Bitrix24
- [ ] Все цвета границ заменены на переменные Bitrix24
- [ ] Все цвета фонов заменены на переменные Bitrix24
- [ ] Все цвета сообщений об ошибках заменены на переменные Bitrix24
- [ ] Все отступы используют переменные (кратные 8px)
- [ ] Все скругления используют переменные
- [ ] Контрастность текста соответствует WCAG AA (минимум 4.5:1)
- [ ] Все изменения протестированы визуально
- [ ] Все изменения протестированы функционально
- [ ] Компонент работает корректно во всех браузерах
- [ ] Мобильная версия работает корректно

### Дополнительные требования (опционально):

- [ ] Проверка контрастности с помощью инструментов (WebAIM Contrast Checker)
- [ ] Проверка доступности с помощью инструментов (axe DevTools)
- [ ] Документирование изменений в комментариях кода

---

## 📝 Примеры кода

### Пример 1: Полная замена стилей кнопки

**До:**
```css
.btn-reset-filters {
  padding: 8px 16px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**После:**
```css
.btn-reset-filters {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-danger);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--font-size-sm);
  transition: background-color var(--transition-base);
}

.btn-reset-filters:hover:not(:disabled) {
  background-color: var(--b24-danger-hover);
}

.btn-reset-filters:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### Пример 2: Замена стилей сообщения об ошибке

**До:**
```css
.error-message {
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
}

.error-header h3 {
  margin: 0;
  flex: 1;
  font-size: 18px;
  color: #991b1b;
}

.error-text {
  margin: 10px 0;
  color: #7f1d1d;
}
```

**После:**
```css
.error-message {
  background-color: var(--b24-danger-light);
  border: 1px solid var(--b24-danger-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}

.error-header h3 {
  margin: 0;
  flex: 1;
  font-size: var(--font-size-lg);
  color: var(--b24-danger);
}

.error-text {
  margin: var(--spacing-sm) 0;
  color: var(--b24-danger);
}
```

### Пример 3: Замена стилей панели фильтров

**До:**
```css
.filters-panel {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.filters-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
}
```

**После:**
```css
.filters-panel {
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  margin-bottom: var(--spacing-xl);
}

.filters-header h2 {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 600;
  color: var(--b24-text-primary);
}
```

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Проверка кнопок:**
   - [ ] Кнопка "Экспорт в PDF" работает
   - [ ] Кнопка "Сбросить фильтры" работает
   - [ ] Кнопка "Повторить попытку" работает (при ошибке)
   - [ ] Мобильная кнопка "Фильтры" работает
   - [ ] Все состояния hover работают
   - [ ] Состояние disabled работает корректно

2. **Проверка ссылок:**
   - [ ] Breadcrumb ссылка работает
   - [ ] Состояние hover работает

3. **Проверка полей ввода:**
   - [ ] Все поля ввода работают
   - [ ] Состояние focus работает
   - [ ] Валидация работает

4. **Проверка фильтров:**
   - [ ] Фильтры по этапам работают
   - [ ] Фильтр по сотрудникам работает
   - [ ] Фильтр по датам работает
   - [ ] Сброс фильтров работает

### Визуальное тестирование:

1. **Проверка цветов:**
   - [ ] Все кнопки используют правильные цвета Bitrix24
   - [ ] Все тексты используют правильные цвета Bitrix24
   - [ ] Все фоны используют правильные цвета Bitrix24
   - [ ] Все границы используют правильные цвета Bitrix24

2. **Проверка контрастности:**
   - [ ] Текст на кнопках читается хорошо
   - [ ] Текст на фонах читается хорошо
   - [ ] Контрастность соответствует WCAG AA

3. **Проверка в разных браузерах:**
   - [ ] Chrome (последняя версия)
   - [ ] Firefox (последняя версия)
   - [ ] Safari (последняя версия)
   - [ ] Edge (последняя версия)

4. **Проверка на разных устройствах:**
   - [ ] Десктоп (>= 1024px)
   - [ ] Планшет (768px - 1023px)
   - [ ] Мобильное устройство (< 768px)

### Инструменты для тестирования:

- **WebAIM Contrast Checker:** https://webaim.org/resources/contrastchecker/
- **axe DevTools:** Расширение для браузера для проверки доступности
- **Chrome DevTools:** Проверка значений CSS-переменных
- **Визуальная проверка:** Открыть компонент и проверить все элементы

---

## 📚 Связанная документация

- **Родительская задача:** `DOCS/TASKS/TASK-024-improve-graph-state-ui-design.md`
- **Этап 1 (CSS-переменные):** `DOCS/TASKS/TASK-024-01-create-css-variables-system.md`
- **Анализ дизайна:** `DOCS/GUIDES/ui-analysis-graph-state-sector-1c.md`
- **Компонент:** `vue-app/src/components/graph-state/GraphStateDashboard.vue`
- **Bitrix24 UI Kit:** https://apidocs.bitrix24.ru/sdk/ui.html

---

## 🔗 Зависимости

- **Зависит от:**
  - ✅ TASK-024-01 (система CSS-переменных должна быть создана)
  - Родительская задача TASK-024 создана
  - Компонент `GraphStateDashboard.vue` существует

- **Влияет на:**
  - Визуальный вид модуля "График состояния"
  - Соответствие гайдлайнам Bitrix24
  - Последующие этапы TASK-024

---

## 📝 История правок

- 2025-12-11 11:25 (UTC+3, Брест): Создана подзадача TASK-024-02 для унификации цветов в GraphStateDashboard

---

## 💡 Дополнительные заметки

### Рекомендации:

1. **Поэтапная замена:**
   - Заменять цвета группами (кнопки, текст, фоны, ошибки)
   - Тестировать после каждой группы
   - Не заменять всё сразу — это усложнит отладку

2. **Проверка контрастности:**
   - Использовать инструмент WebAIM Contrast Checker
   - Проверять все комбинации текста и фона
   - Убедиться, что контрастность соответствует WCAG AA (минимум 4.5:1)

3. **Сохранение функциональности:**
   - Убедиться, что все состояния (hover, active, disabled, focus) работают
   - Проверить все интерактивные элементы
   - Проверить мобильную версию

4. **Документирование:**
   - Комментировать сложные замены
   - Указывать причину замены, если она неочевидна

### Потенциальные проблемы:

1. **Контрастность:**
   - Некоторые комбинации цветов могут не соответствовать WCAG AA
   - В этом случае нужно использовать более контрастные цвета или изменить структуру

2. **Совместимость:**
   - CSS-переменные поддерживаются во всех современных браузерах
   - Если требуется поддержка старых браузеров, нужны fallback значения (но это не требуется для Bitrix24)

3. **Производительность:**
   - CSS-переменные не влияют на производительность
   - Замена цветов не должна ухудшить производительность

### Чек-лист перед завершением:

- [ ] Все цвета заменены на переменные Bitrix24
- [ ] Все отступы заменены на переменные (кратные 8px)
- [ ] Все скругления заменены на переменные
- [ ] Все состояния (hover, active, disabled, focus) работают
- [ ] Контрастность проверена и соответствует WCAG AA
- [ ] Компонент протестирован во всех браузерах
- [ ] Мобильная версия протестирована
- [ ] Функциональность не нарушена
- [ ] Визуально всё выглядит правильно

