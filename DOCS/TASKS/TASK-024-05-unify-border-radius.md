# TASK-024-05: Унификация скруглений (border-radius) в модуле "График состояния"

**Дата создания:** 2025-12-11 11:54 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-024 (Этап 5)

---

## 📋 Цель задачи

Унифицировать все значения `border-radius` в компонентах модуля "График состояния" через использование CSS-переменных Bitrix24 UI Kit. Обеспечить единообразие скруглений углов во всём модуле и соответствие гайдлайнам Bitrix24.

---

## 🎯 Контекст

В компонентах модуля "График состояния" используются различные значения `border-radius` (2px, 3px, 4px, 6px, 8px, 12px, 50%), которые не унифицированы и не соответствуют стандартам Bitrix24 UI Kit. Для обеспечения единообразия дизайна необходимо заменить все кастомные значения на переменные из системы CSS-переменных.

**Зависимости:**
- **Обязательно:** TASK-024-01 должна быть завершена (система CSS-переменных создана)
- Родительская задача TASK-024 создана
- Компоненты модуля "График состояния" существуют

**Влияет на:**
- Визуальный вид модуля "График состояния"
- Соответствие гайдлайнам Bitrix24
- Последующие этапы TASK-024

---

## 🔍 Анализ текущих значений border-radius

### Полный список используемых значений

#### В компонентах модуля "График состояния":

**GraphStateDashboard.vue:**
- `4px` — кнопки (`.btn-reset-filters`, `.btn-retry`), поля ввода (`.employees-select`, `.date-range-select`, `.date-input`), детали ошибки (`.error-details pre`)
- `6px` — кнопка экспорта (`.btn-export-pdf`), мобильная кнопка фильтров (`.mobile-filters-toggle`)
- `8px` — панель фильтров (`.filters-panel`), контент дашборда (`.dashboard-content`), сообщение об ошибке (`.error-message`)

**GraphStateChart.vue:**
- `2px` — цветные квадратики в легенде (`.filter-color`, `.legend-color`)
- `4px` — кнопки переключения типа графика (`.chart-type-btn`), фильтры (`.chart-filters`), кнопка повтора (`.btn-retry`), детали этапов (`.stage-details-color`, `.employee-detail-item`)
- `6px` — карточки деталей этапов (`.stage-details`)
- `8px` — основной контейнер графика (`.graph-state-chart`), селектор сравнения (`.comparison-type-selector`), легенда (`.graph-legend`), детализация сотрудников (`.employees-details`)
- `12px` — badges со счётчиками (`.stage-details-count`, `.employee-detail-count`)

**CreateSnapshotButton.vue:**
- `4px` — кнопки и элементы формы
- `8px` — карточки и панели

### Статистика использования

| Значение | Количество использований | Компоненты |
|----------|-------------------------|------------|
| `2px` | 2 | GraphStateChart (цветные квадратики) |
| `3px` | 0 | Не используется в модуле "График состояния" |
| `4px` | 15+ | Все компоненты (кнопки, поля, мелкие элементы) |
| `6px` | 3 | GraphStateDashboard, GraphStateChart (средние кнопки, карточки) |
| `8px` | 8+ | Все компоненты (карточки, панели) |
| `12px` | 2 | GraphStateChart (badges) |
| `50%` | 0 | Не используется в модуле "График состояния" |

---

## 🏗️ Архитектура решения

### Соответствие значений переменным Bitrix24

Согласно системе CSS-переменных из TASK-024-01:

| Текущее значение | Переменная Bitrix24 | Назначение |
|-----------------|---------------------|------------|
| `2px` | `var(--radius-sm)` или добавить `--radius-xs: 2px` | Очень мелкие элементы (цветные квадратики) |
| `4px` | `var(--radius-sm)` | Кнопки, поля ввода, мелкие элементы |
| `6px` | `var(--radius-md)` | Средние кнопки, карточки среднего размера |
| `8px` | `var(--radius-lg)` | Карточки, панели |
| `12px` | `var(--radius-xl)` | Badges, счётчики, крупные элементы |
| `50%` | `var(--radius-full)` | Круглые элементы (если появятся) |

### Решение для 2px

**Вариант 1 (рекомендуется):** Добавить переменную `--radius-xs: 2px` в систему CSS-переменных для очень мелких элементов.

**Вариант 2:** Заменить `2px` на `var(--radius-sm)` (4px), но это изменит внешний вид цветных квадратиков.

**Рекомендация:** Использовать Вариант 1 — добавить `--radius-xs: 2px` в `bitrix24-ui-variables.css`.

---

## 📝 Детальные шаги реализации

### Шаг 1: Добавление переменной --radius-xs (если отсутствует)

**Действие:** Проверить наличие переменной `--radius-xs` в файле `bitrix24-ui-variables.css` и добавить при необходимости.

**Проверка:**
1. Открыть файл `vue-app/src/styles/bitrix24-ui-variables.css`
2. Найти раздел "СКРУГЛЕНИЯ (BORDER-RADIUS)"
3. Проверить наличие переменной `--radius-xs`

**Если переменной нет, добавить:**

```css
/* ============================================
   СКРУГЛЕНИЯ (BORDER-RADIUS)
   ============================================ */

--radius-xs: 2px;     /* Очень мелкие элементы (цветные квадратики, индикаторы) */
--radius-sm: 4px;     /* Мелкие элементы (badges, индикаторы) */
--radius-md: 6px;     /* Кнопки, поля ввода */
--radius-lg: 8px;     /* Карточки, панели */
--radius-xl: 12px;    /* Большие карточки, модальные окна */
--radius-full: 9999px; /* Круглые элементы (аватары) */
```

**Проверка после шага 1:**
- [ ] Переменная `--radius-xs` добавлена (если отсутствовала)
- [ ] Все переменные скруглений определены
- [ ] Переменные документированы в комментариях

---

### Шаг 2: Унификация скруглений в GraphStateDashboard.vue

**Действие:** Заменить все значения `border-radius` на переменные Bitrix24 в компоненте `GraphStateDashboard.vue`.

#### 2.1. Кнопки (4px → var(--radius-sm))

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
```

#### 2.2. Поля ввода (4px → var(--radius-sm))

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

#### 2.3. Средние кнопки (6px → var(--radius-md))

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
```

#### 2.4. Карточки и панели (8px → var(--radius-lg))

**Найти:**
```css
.filters-panel {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
}

.dashboard-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.error-message {
  background-color: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 16px;
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

.dashboard-content {
  background-color: var(--b24-bg-white);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
  box-shadow: var(--shadow-sm);
}

.error-message {
  background-color: var(--b24-danger-light);
  border: 1px solid var(--b24-danger-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-md);
}
```

#### 2.5. Детали ошибки (4px → var(--radius-sm))

**Найти:**
```css
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
.error-details pre {
  margin-top: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--b24-danger-lighter);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  overflow-x: auto;
}
```

**Проверка после шага 2:**
- [ ] Все скругления в GraphStateDashboard.vue заменены на переменные
- [ ] Визуально компонент выглядит корректно
- [ ] Все состояния (hover, active, disabled) работают

---

### Шаг 3: Унификация скруглений в GraphStateChart.vue

**Действие:** Заменить все значения `border-radius` на переменные Bitrix24 в компоненте `GraphStateChart.vue`.

#### 3.1. Очень мелкие элементы (2px → var(--radius-xs))

**Найти:**
```css
.filter-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
```

**Заменить на:**
```css
.filter-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
```

#### 3.2. Кнопки и мелкие элементы (4px → var(--radius-sm))

**Найти:**
```css
.chart-type-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chart-filters {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 4px;
  flex-wrap: wrap;
}

.btn-retry {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.stage-details-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.employee-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: #f9fafb;
  border-radius: 4px;
  border-left: 3px solid #3b82f6;
  transition: background-color 0.2s;
}
```

**Заменить на:**
```css
.chart-type-btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--b24-bg-white);
  border: 1px solid var(--b24-border-medium);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: all var(--transition-base);
}

.chart-filters {
  display: flex;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-md);
  background: var(--b24-bg-light);
  border-radius: var(--radius-sm);
  flex-wrap: wrap;
}

.btn-retry {
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-primary);
  color: var(--b24-text-inverse);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  cursor: pointer;
  transition: background-color var(--transition-base);
}

.stage-details-color {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.employee-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--b24-primary);
  transition: background-color var(--transition-base);
}
```

#### 3.3. Карточки среднего размера (6px → var(--radius-md))

**Найти:**
```css
.stage-details {
  background-color: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e5e7eb;
}
```

**Заменить на:**
```css
.stage-details {
  background-color: var(--b24-bg-white);
  border-radius: var(--radius-md);
  padding: var(--spacing-lg);
  border: 1px solid var(--b24-border-light);
}
```

#### 3.4. Карточки и панели (8px → var(--radius-lg))

**Найти:**
```css
.graph-state-chart {
  width: 100%;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.comparison-type-selector {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.graph-legend {
  margin-top: 20px;
  padding: 15px;
  background-color: #f9fafb;
  border-radius: 8px;
}

.employees-details {
  margin-top: 30px;
  padding: 20px;
  background-color: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
```

**Заменить на:**
```css
.graph-state-chart {
  width: 100%;
  padding: var(--spacing-md);
  background: var(--b24-bg-white);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.comparison-type-selector {
  margin-bottom: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
}

.graph-legend {
  margin-top: var(--spacing-md);
  padding: var(--spacing-lg);
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
}

.employees-details {
  margin-top: var(--spacing-xl);
  padding: var(--spacing-md);
  background-color: var(--b24-bg-light);
  border-radius: var(--radius-lg);
  border: 1px solid var(--b24-border-light);
}
```

#### 3.5. Badges и счётчики (12px → var(--radius-xl))

**Найти:**
```css
.stage-details-count {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 4px 12px;
  border-radius: 12px;
}

.employee-detail-count {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
  background-color: white;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
```

**Заменить на:**
```css
.stage-details-count {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--b24-text-secondary);
  background-color: var(--b24-bg);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-xl);
}

.employee-detail-count {
  font-size: var(--font-size-sm);
  color: var(--b24-text-secondary);
  font-weight: 600;
  background-color: var(--b24-bg-white);
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-xl);
  border: 1px solid var(--b24-border-light);
}
```

**Проверка после шага 3:**
- [ ] Все скругления в GraphStateChart.vue заменены на переменные
- [ ] Визуально компонент выглядит корректно
- [ ] Все элементы (кнопки, карточки, badges) используют правильные скругления

---

### Шаг 4: Унификация скруглений в CreateSnapshotButton.vue

**Действие:** Заменить все значения `border-radius` на переменные Bitrix24 в компоненте `CreateSnapshotButton.vue`.

**Найти все использования `border-radius` в файле:**
```bash
grep -n "border-radius" vue-app/src/components/graph-state/CreateSnapshotButton.vue
```

**Заменить по аналогии с предыдущими шагами:**
- `4px` → `var(--radius-sm)`
- `8px` → `var(--radius-lg)`

**Проверка после шага 4:**
- [ ] Все скругления в CreateSnapshotButton.vue заменены на переменные
- [ ] Визуально компонент выглядит корректно

---

### Шаг 5: Финальная проверка и тестирование

**Действие:** Провести полную проверку всех изменений.

1. **Визуальная проверка:**
   - [ ] Открыть все компоненты модуля в браузере
   - [ ] Проверить все кнопки (обычное состояние, hover, active, disabled)
   - [ ] Проверить все поля ввода (обычное состояние, focus)
   - [ ] Проверить все карточки и панели
   - [ ] Проверить все badges и счётчики
   - [ ] Проверить цветные квадратики в легенде
   - [ ] Проверить мобильную версию

2. **Проверка соответствия переменным:**
   - [ ] Все значения `border-radius` используют переменные
   - [ ] Нет кастомных значений (2px, 3px, 4px, 6px, 8px, 12px) в коде
   - [ ] Все переменные определены в `bitrix24-ui-variables.css`

3. **Проверка в разных браузерах:**
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge

4. **Проверка функциональности:**
   - [ ] Все кнопки работают
   - [ ] Все поля ввода работают
   - [ ] Все фильтры работают
   - [ ] График отображается корректно

---

## 🎨 Таблица соответствия значений

### Полная таблица замен

| Текущее значение | Переменная Bitrix24 | Использование | Компоненты |
|-----------------|---------------------|---------------|------------|
| `2px` | `var(--radius-xs)` | Очень мелкие элементы (цветные квадратики) | GraphStateChart |
| `4px` | `var(--radius-sm)` | Кнопки, поля ввода, мелкие элементы | Все компоненты |
| `6px` | `var(--radius-md)` | Средние кнопки, карточки среднего размера | GraphStateDashboard, GraphStateChart |
| `8px` | `var(--radius-lg)` | Карточки, панели | Все компоненты |
| `12px` | `var(--radius-xl)` | Badges, счётчики | GraphStateChart |
| `50%` | `var(--radius-full)` | Круглые элементы (если появятся) | - |

### Правила применения

1. **Очень мелкие элементы (2px):**
   - Цветные квадратики в легенде
   - Маленькие индикаторы
   - Использовать `var(--radius-xs)`

2. **Мелкие элементы (4px):**
   - Кнопки стандартного размера
   - Поля ввода
   - Мелкие карточки
   - Использовать `var(--radius-sm)`

3. **Средние элементы (6px):**
   - Средние кнопки (экспорт, мобильные)
   - Карточки среднего размера
   - Использовать `var(--radius-md)`

4. **Крупные элементы (8px):**
   - Основные карточки
   - Панели
   - Контейнеры
   - Использовать `var(--radius-lg)`

5. **Очень крупные элементы (12px):**
   - Badges
   - Счётчики
   - Крупные карточки
   - Использовать `var(--radius-xl)`

6. **Круглые элементы:**
   - Аватары
   - Круглые кнопки
   - Использовать `var(--radius-full)`

---

## ✅ Критерии приёмки

### Обязательные требования:

- [ ] Переменная `--radius-xs` добавлена в систему CSS-переменных (если отсутствовала)
- [ ] Все значения `border-radius: 2px` заменены на `var(--radius-xs)`
- [ ] Все значения `border-radius: 4px` заменены на `var(--radius-sm)`
- [ ] Все значения `border-radius: 6px` заменены на `var(--radius-md)`
- [ ] Все значения `border-radius: 8px` заменены на `var(--radius-lg)`
- [ ] Все значения `border-radius: 12px` заменены на `var(--radius-xl)`
- [ ] Все скругления в GraphStateDashboard.vue унифицированы
- [ ] Все скругления в GraphStateChart.vue унифицированы
- [ ] Все скругления в CreateSnapshotButton.vue унифицированы
- [ ] Нет кастомных значений `border-radius` в коде (кроме переменных)
- [ ] Все изменения протестированы визуально
- [ ] Все изменения протестированы функционально
- [ ] Компоненты работают корректно во всех браузерах
- [ ] Мобильная версия работает корректно

### Дополнительные требования (опционально):

- [ ] Проверка соответствия гайдлайнам Bitrix24
- [ ] Документирование изменений в комментариях кода

---

## 📝 Примеры кода

### Пример 1: Замена скруглений кнопок

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
```

### Пример 2: Замена скруглений карточек

**До:**
```css
.filters-panel {
  background-color: #f9fafb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
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
```

### Пример 3: Замена скруглений badges

**До:**
```css
.stage-details-count {
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  background-color: #f3f4f6;
  padding: 4px 12px;
  border-radius: 12px;
}
```

**После:**
```css
.stage-details-count {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--b24-text-secondary);
  background-color: var(--b24-bg);
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--radius-xl);
}
```

### Пример 4: Замена скруглений очень мелких элементов

**До:**
```css
.filter-color {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}
```

**После:**
```css
.filter-color {
  width: 16px;
  height: 16px;
  border-radius: var(--radius-xs);
  border: 1px solid rgba(0, 0, 0, 0.1);
}
```

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Проверка кнопок:**
   - [ ] Все кнопки имеют правильные скругления
   - [ ] Состояния hover/active/disabled работают корректно
   - [ ] Визуально кнопки выглядят единообразно

2. **Проверка полей ввода:**
   - [ ] Все поля ввода имеют правильные скругления
   - [ ] Состояние focus работает корректно
   - [ ] Визуально поля выглядят единообразно

3. **Проверка карточек и панелей:**
   - [ ] Все карточки имеют правильные скругления
   - [ ] Все панели имеют правильные скругления
   - [ ] Визуально карточки выглядят единообразно

4. **Проверка badges и счётчиков:**
   - [ ] Все badges имеют правильные скругления
   - [ ] Все счётчики имеют правильные скругления
   - [ ] Визуально badges выглядят единообразно

### Визуальное тестирование:

1. **Проверка скруглений:**
   - [ ] Все элементы используют переменные Bitrix24
   - [ ] Нет кастомных значений в коде
   - [ ] Визуально всё выглядит единообразно

2. **Проверка в разных браузерах:**
   - [ ] Chrome (последняя версия)
   - [ ] Firefox (последняя версия)
   - [ ] Safari (последняя версия)
   - [ ] Edge (последняя версия)

3. **Проверка на разных устройствах:**
   - [ ] Десктоп (>= 1024px)
   - [ ] Планшет (768px - 1023px)
   - [ ] Мобильное устройство (< 768px)

### Инструменты для тестирования:

- **Chrome DevTools:** Проверить значения CSS-переменных
- **Визуальная проверка:** Открыть компоненты и проверить все элементы
- **Поиск по коду:** Использовать `grep` для поиска кастомных значений

---

## 📚 Связанная документация

- **Родительская задача:** `DOCS/TASKS/TASK-024-improve-graph-state-ui-design.md`
- **Этап 1 (CSS-переменные):** `DOCS/TASKS/TASK-024-01-create-css-variables-system.md`
- **Этап 2 (Dashboard):** `DOCS/TASKS/TASK-024-02-unify-colors-dashboard.md`
- **Этап 3 (Chart):** `DOCS/TASKS/TASK-024-03-unify-colors-chart.md`
- **Компоненты:**
  - `vue-app/src/components/graph-state/GraphStateDashboard.vue`
  - `vue-app/src/components/graph-state/GraphStateChart.vue`
  - `vue-app/src/components/graph-state/CreateSnapshotButton.vue`
- **Bitrix24 UI Kit:** https://apidocs.bitrix24.ru/sdk/ui.html

---

## 🔗 Зависимости

- **Зависит от:**
  - ✅ TASK-024-01 (система CSS-переменных должна быть создана)
  - Родительская задача TASK-024 создана
  - Компоненты модуля "График состояния" существуют

- **Влияет на:**
  - Визуальный вид модуля "График состояния"
  - Соответствие гайдлайнам Bitrix24
  - Последующие этапы TASK-024

---

## 📝 История правок

- 2025-12-11 11:54 (UTC+3, Брест): Создана подзадача TASK-024-05 для унификации скруглений в модуле "График состояния"

---

## 💡 Дополнительные заметки

### Рекомендации:

1. **Поэтапная замена:**
   - Заменять скругления по компонентам (GraphStateDashboard → GraphStateChart → CreateSnapshotButton)
   - Тестировать после каждого компонента
   - Не заменять всё сразу — это усложнит отладку

2. **Проверка переменных:**
   - Убедиться, что все переменные определены в `bitrix24-ui-variables.css`
   - Проверить значения переменных в DevTools
   - Убедиться, что переменные доступны во всех компонентах

3. **Сохранение функциональности:**
   - Убедиться, что все состояния (hover, active, disabled, focus) работают
   - Проверить все интерактивные элементы
   - Проверить мобильную версию

4. **Документирование:**
   - Комментировать сложные замены
   - Указывать причину замены, если она неочевидна

### Потенциальные проблемы:

1. **Отсутствие переменной --radius-xs:**
   - Если переменная отсутствует, нужно добавить её в `bitrix24-ui-variables.css`
   - Альтернатива: использовать `var(--radius-sm)` для элементов 2px, но это изменит внешний вид

2. **Совместимость:**
   - CSS-переменные поддерживаются во всех современных браузерах
   - Если требуется поддержка старых браузеров, нужны fallback значения (но это не требуется для Bitrix24)

3. **Визуальные изменения:**
   - Замена значений может немного изменить внешний вид элементов
   - Это нормально, так как цель — унификация
   - Важно проверить визуально после замены

### Чек-лист перед завершением:

- [ ] Переменная `--radius-xs` добавлена (если отсутствовала)
- [ ] Все скругления заменены на переменные
- [ ] Нет кастомных значений в коде
- [ ] Все компоненты протестированы визуально
- [ ] Все компоненты протестированы функционально
- [ ] Мобильная версия протестирована
- [ ] Все браузеры протестированы
- [ ] Функциональность не нарушена
- [ ] Визуально всё выглядит единообразно

