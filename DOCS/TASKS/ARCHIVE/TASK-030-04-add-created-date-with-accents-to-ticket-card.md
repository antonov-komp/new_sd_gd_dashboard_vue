# TASK-030-04: Добавление отображения даты создания с визуальными акцентами в левом нижнем углу карточки тикета

**Дата создания:** 2025-12-11 20:50 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-030

## Описание

Добавить элемент отображения даты создания тикета (`ticket.createdAt`) в левый нижний угол карточки тикета с визуальными акцентами в зависимости от давности. Элемент должен отображать:
1. Метку категории давности (СЕГОДНЯ, НА ЭТОЙ НЕДЕЛЕ, и т.д.)
2. Отформатированную дату (DD.MM.YYYY)
3. Визуальные акценты (цвета фона, текста, границы) в зависимости от категории давности

## Контекст

В рамках задачи TASK-030 необходимо добавить отображение даты создания тикета с визуальными акцентами. Утилиты для работы с датами уже созданы (этап 2, TASK-030-02):
- `date-utils.js` — функции парсинга, форматирования и определения категории давности
- `date-accent-config.js` — конфигурация визуальных акцентов для 8 категорий давности

Теперь требуется:
1. Импортировать утилиты в компонент TicketCard
2. Создать computed-свойства для форматирования даты и определения категории
3. Добавить элемент в шаблон компонента
4. Применить стили с визуальными акцентами
5. Обновить JSDoc комментарии

## Модули и компоненты

- `vue-app/src/components/dashboard/TicketCard.vue` — компонент карточки тикета (основной файл для изменений)
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — утилиты для работы с датами (используется)
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — конфигурация визуальных акцентов (используется)

## Зависимости

- Зависит от этапа 2 (TASK-030-02): утилиты `date-utils.js` и `date-accent-config.js` должны быть созданы
- Зависит от этапа 1 (TASK-030-01): поле `ticket.createdAt` должно быть доступно в объекте тикета
- Использует абсолютное позиционирование CSS
- Требует установки `position: relative` для контейнера `.ticket-card` (должно быть добавлено в этапе 3)

---

## Детальный анализ текущей реализации

### 1. Анализ структуры компонента TicketCard.vue

#### 1.1. Текущая структура файла

**Файл:** `vue-app/src/components/dashboard/TicketCard.vue`  
**Общее количество строк:** 336

**Структура файла:**
```
1-38:   Template (шаблон компонента)
40-238: Script (логика компонента)
241-334: Style (стили компонента)
```

#### 1.2. Анализ секции script (setup)

**Текущая структура setup() (строки 93-237):**

```javascript
setup(props, { emit }) {
  // 1. Реактивные переменные (строки 94-95)
  const isDragging = ref(false);
  const isDragEnabled = computed(() => !DISABLE_TICKET_DRAG && props.draggable);
  
  // 2. Константы цветов (строки 97-113)
  const NEUTRAL_COLORS = { ... };
  const NEUTRAL_SERVICE_COLORS = { ... };
  const NEUTRAL_ACTION_COLORS = { ... };
  
  // 3. Computed-свойства для приоритета (строки 115-132)
  const priorityData = computed(() => { ... });
  const displayPriorityLabel = computed(() => { ... });
  const priorityChipStyle = computed(() => { ... });
  const priorityBorderStyle = computed(() => { ... });
  
  // 4. Computed-свойства для сервиса (строки 134-148)
  const serviceData = computed(() => { ... });
  const displayServiceLabel = computed(() => { ... });
  const serviceChipStyle = computed(() => { ... });
  
  // 5. Computed-свойства для действия (строки 150-171)
  const actionStrValue = computed(() => { ... });
  const actionChipStyle = computed(() => { ... });
  
  // 6. Обработчики событий (строки 173-222)
  const handleDragStart = (event) => { ... };
  const handleDragEnd = () => { ... };
  const handleCardClick = (event) => { ... };
  
  // 7. Return (строки 224-236)
  return {
    handleDragStart,
    handleDragEnd,
    handleCardClick,
    isDragEnabled,
    priorityChipStyle,
    displayPriorityLabel,
    priorityBorderStyle,
    displayServiceLabel,
    serviceChipStyle,
    actionStrValue,
    actionChipStyle
  };
}
```

**Вывод:** Computed-свойства для даты нужно добавить после computed-свойств для действия (после строки 171), перед обработчиками событий.

#### 1.3. Анализ импортов

**Текущие импорты (строки 41-42):**

```javascript
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
```

**Вывод:** Нужно добавить импорты утилит для работы с датами.

#### 1.4. Анализ структуры данных

**Поле `ticket.createdAt`:**
- Тип: `string`
- Формат: ISO 8601 с часовым поясом (например, `2024-07-22T18:00:00+02:00`)
- Может быть пустой строкой `''`, если дата не указана

**Условие отображения:**
- Отображать только если `formattedCreatedDate` не пустая строка
- Использовать директиву `v-if` для условного рендеринга

---

### 2. Анализ требований к computed-свойствам

#### 2.1. Структура computed-свойств

**Требуется создать 4 computed-свойства:**

1. **`formattedCreatedDate`** — отформатированная дата (DD.MM.YYYY)
   - Использует: `parseBitrixDate()`, `formatDate()`
   - Возвращает: `string` (пустая строка, если дата некорректна)

2. **`dateAccentCategory`** — категория давности
   - Использует: `parseBitrixDate()`, `getDateAccentCategory()`
   - Возвращает: `string | null` (категория из `DATE_ACCENT_CATEGORIES` или `null`)

3. **`dateAccentConfig`** — конфигурация визуального акцента
   - Использует: `dateAccentCategory`, `DATE_ACCENT_CONFIG`
   - Возвращает: `Object | null` (конфигурация с цветами или `null`)

4. **`dateAccentStyle`** — стили для элемента даты
   - Использует: `dateAccentConfig`
   - Возвращает: `Object` (объект стилей или пустой объект)

#### 2.2. Зависимости между computed-свойствами

**Цепочка зависимостей:**
```
ticket.createdAt
  ↓
formattedCreatedDate (использует parseBitrixDate + formatDate)
dateAccentCategory (использует parseBitrixDate + getDateAccentCategory)
  ↓
dateAccentConfig (использует dateAccentCategory + DATE_ACCENT_CONFIG)
  ↓
dateAccentStyle (использует dateAccentConfig)
```

**Оптимизация:**
- `parseBitrixDate()` вызывается дважды (в `formattedCreatedDate` и `dateAccentCategory`)
- Можно создать промежуточное computed-свойство `parsedCreatedDate` для оптимизации
- Или оставить как есть (производительность не критична для небольшого количества тикетов)

---

### 3. Анализ требований к позиционированию

#### 3.1. Требования к расположению

**Позиция:** Левый нижний угол карточки

**Координаты:**
- `bottom: 8px` — отступ снизу (соответствует padding карточки)
- `left: 8px` — отступ слева (соответствует padding карточки)

**Причина выбора координат:**
- Карточка имеет `padding: 12px`
- Элемент должен быть внутри padding, но не слишком близко к краю
- `8px` обеспечивает визуальный отступ от края карточки
- Не конфликтует с элементом отдела заказчика (который в левом верхнем углу)

#### 3.2. Требования к размерам

**Минимальная ширина:** `60px`

**Причина:**
- Элемент содержит две строки (метка категории + дата)
- Минимальная ширина обеспечивает читаемость

**Высота:** Автоматическая (зависит от содержимого и padding)

#### 3.3. Требования к визуальному оформлению

**Структура элемента:**
- Две строки:
  1. Метка категории (например, "СЕГОДНЯ") — верхняя строка
  2. Дата (например, "22.07.2024") — нижняя строка

**Стили контейнера:**
- Фон: динамический (из `dateAccentConfig.backgroundColor`)
- Граница: динамическая (из `dateAccentConfig.color`)
- Текст: динамический цвет (из `dateAccentConfig.textColor`)

**Стили метки категории:**
- `font-size: 8px` — очень маленький размер
- `font-weight: 600` — жирный для акцента
- `text-transform: uppercase` — верхний регистр
- `line-height: 1` — компактность

**Стили даты:**
- `font-size: 9px` — маленький размер
- `font-weight: 500` — средний вес
- `line-height: 1.2` — читаемость

---

## Пошаговая реализация

### Шаг 1: Добавление импортов утилит

#### 1.1. Анализ текущих импортов

**Текущие импорты (строки 41-42):**

```javascript
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
```

#### 1.2. Добавление импортов утилит для дат

**Действие:**
1. Найти строку 42 (конец импортов)
2. Добавить после неё новые импорты:

```javascript
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';
```

**Детальное объяснение импортов:**

1. **`parseBitrixDate`**
   - Функция для парсинга даты из формата Bitrix24
   - Принимает: `string` (ISO 8601)
   - Возвращает: `Date | null`

2. **`formatDate`**
   - Функция для форматирования даты в DD.MM.YYYY
   - Принимает: `Date | string`
   - Возвращает: `string` (DD.MM.YYYY или пустая строка)

3. **`getDateAccentCategory`**
   - Функция для определения категории давности
   - Принимает: `Date | string`, `Date` (опционально, текущая дата)
   - Возвращает: `string` (категория из `DATE_ACCENT_CATEGORIES`)

4. **`DATE_ACCENT_CONFIG`**
   - Конфигурация визуальных акцентов для всех категорий
   - Тип: `Object<string, {label, color, backgroundColor, textColor}>`

**Проверка:**
- [ ] Импорты добавлены после существующих
- [ ] Пути к файлам корректны
- [ ] Имена функций/констант соответствуют экспортам из утилит
- [ ] Синтаксис корректен

---

### Шаг 2: Создание computed-свойства formattedCreatedDate

#### 2.1. Определение места вставки

**Место вставки:**
- После computed-свойств для действия (после строки 171, где заканчивается `actionChipStyle`)
- Перед обработчиками событий (перед строкой 173, где начинается `handleDragStart`)

**Причина:**
- Логическая группировка: сначала computed-свойства, затем обработчики событий

#### 2.2. Реализация computed-свойства

**Действие:**
Добавить computed-свойство для форматирования даты:

```javascript
    /**
     * Стили для чипа UF_ACTION_STR (второй этаж)
     * Использует нейтральные цвета
     */
    const actionChipStyle = computed(() => ({
      color: NEUTRAL_ACTION_COLORS.textColor,
      backgroundColor: NEUTRAL_ACTION_COLORS.backgroundColor,
      borderColor: NEUTRAL_ACTION_COLORS.color
    }));

    /**
     * Отформатированная дата создания тикета
     * 
     * Парсит дату из формата Bitrix24 (ISO 8601) и форматирует в DD.MM.YYYY
     * Возвращает пустую строку, если дата отсутствует или некорректна
     * 
     * @returns {string} Отформатированная дата (DD.MM.YYYY) или пустая строка
     * 
     * @example
     * // Входные данные: ticket.createdAt = '2024-07-22T18:00:00+02:00'
     * // Результат: '22.07.2024'
     */
    const formattedCreatedDate = computed(() => {
      // Проверка на наличие даты
      if (!props.ticket.createdAt) {
        return '';
      }
      
      // Парсинг даты из формата Bitrix24
      const date = parseBitrixDate(props.ticket.createdAt);
      
      // Если дата некорректна, возвращаем пустую строку
      if (!date) {
        return '';
      }
      
      // Форматирование даты в DD.MM.YYYY
      return formatDate(date);
    });
```

**Детальное объяснение:**

1. **Проверка на наличие даты:**
   - `if (!props.ticket.createdAt)` — проверяет на `null`, `undefined`, пустую строку
   - Возвращает пустую строку, если дата отсутствует

2. **Парсинг даты:**
   - `parseBitrixDate(props.ticket.createdAt)` — преобразует строку в объект `Date`
   - Возвращает `null`, если дата некорректна

3. **Проверка на валидность:**
   - `if (!date)` — проверяет, что дата была успешно распарсена
   - Возвращает пустую строку, если парсинг не удался

4. **Форматирование:**
   - `formatDate(date)` — форматирует дату в `DD.MM.YYYY`
   - Возвращает пустую строку, если дата некорректна

**Проверка:**
- [ ] Computed-свойство добавлено после `actionChipStyle`
- [ ] Логика обработки даты корректна
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 3: Создание computed-свойства dateAccentCategory

#### 3.1. Реализация computed-свойства

**Действие:**
Добавить computed-свойство для определения категории давности:

```javascript
    /**
     * Категория давности даты создания тикета
     * 
     * Определяет, к какой категории давности относится дата создания:
     * - СЕГОДНЯ — сегодня
     * - НА ЭТОЙ НЕДЕЛЕ — в течение текущей недели (не сегодня)
     * - НА ПРОШЛОЙ НЕДЕЛЕ — в течение прошлой недели
     * - БОЛЕЕ ДВУХ НЕДЕЛЬ — от 2 недель до 1 месяца
     * - ДО 1 МЕСЯЦА — от 1 месяца до 2 месяцев
     * - БОЛЕЕ 2 МЕСЯЦЕВ — от 2 месяцев до полугода
     * - БОЛЕЕ ПОЛУГОДА — от полугода до года
     * - БОЛЕЕ ГОДА — более года
     * 
     * @returns {string|null} Категория давности (из DATE_ACCENT_CATEGORIES) или null, если дата отсутствует
     * 
     * @example
     * // Входные данные: ticket.createdAt = '2024-12-11T10:00:00+02:00' (сегодня)
     * // Результат: 'today'
     * 
     * @example
     * // Входные данные: ticket.createdAt = '2023-01-01T10:00:00+02:00' (более года)
     * // Результат: 'more_than_year'
     */
    const dateAccentCategory = computed(() => {
      // Проверка на наличие даты
      if (!props.ticket.createdAt) {
        return null;
      }
      
      // Парсинг даты из формата Bitrix24
      const date = parseBitrixDate(props.ticket.createdAt);
      
      // Если дата некорректна, возвращаем null
      if (!date) {
        return null;
      }
      
      // Определение категории давности
      // Используется текущая дата по умолчанию (new Date())
      return getDateAccentCategory(date);
    });
```

**Детальное объяснение:**

1. **Проверка на наличие даты:**
   - Аналогично `formattedCreatedDate`
   - Возвращает `null`, если дата отсутствует

2. **Парсинг даты:**
   - Использует ту же функцию `parseBitrixDate()`
   - Возвращает `null`, если парсинг не удался

3. **Определение категории:**
   - `getDateAccentCategory(date)` — определяет категорию давности
   - Использует текущую дату по умолчанию (второй параметр не указан)
   - Возвращает строку из `DATE_ACCENT_CATEGORIES`

**Оптимизация:**
- Можно создать промежуточное computed-свойство `parsedCreatedDate` для избежания двойного парсинга
- Но для простоты оставляем как есть (производительность не критична)

**Проверка:**
- [ ] Computed-свойство добавлено после `formattedCreatedDate`
- [ ] Логика определения категории корректна
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 4: Создание computed-свойства dateAccentConfig

#### 4.1. Реализация computed-свойства

**Действие:**
Добавить computed-свойство для получения конфигурации визуального акцента:

```javascript
    /**
     * Конфигурация визуального акцента для даты создания
     * 
     * Получает конфигурацию цветов и метки для категории давности даты.
     * Конфигурация содержит:
     * - label: Текстовая метка категории (например, "СЕГОДНЯ")
     * - color: Цвет границы и акцента
     * - backgroundColor: Цвет фона
     * - textColor: Цвет текста
     * 
     * @returns {Object|null} Конфигурация визуального акцента или null, если категория не определена
     * 
     * @example
     * // Если dateAccentCategory = 'today'
     * // Результат:
     * // {
     * //   label: 'СЕГОДНЯ',
     * //   color: '#28a745',
     * //   backgroundColor: '#d4edda',
     * //   textColor: '#155724'
     * // }
     */
    const dateAccentConfig = computed(() => {
      // Получаем категорию давности
      const category = dateAccentCategory.value;
      
      // Если категория не определена, возвращаем null
      if (!category) {
        return null;
      }
      
      // Получаем конфигурацию для категории из DATE_ACCENT_CONFIG
      const config = DATE_ACCENT_CONFIG[category];
      
      // Если конфигурация не найдена, возвращаем null
      if (!config) {
        console.warn('Date accent config not found for category:', category);
        return null;
      }
      
      return config;
    });
```

**Детальное объяснение:**

1. **Получение категории:**
   - `dateAccentCategory.value` — использует ранее созданное computed-свойство
   - Может быть `null`, если дата отсутствует

2. **Проверка на наличие категории:**
   - Если категория не определена, возвращается `null`
   - Элемент даты не будет отображаться (условие `v-if`)

3. **Получение конфигурации:**
   - `DATE_ACCENT_CONFIG[category]` — получает конфигурацию для категории
   - Если конфигурация не найдена, логируется предупреждение и возвращается `null`

**Проверка:**
- [ ] Computed-свойство добавлено после `dateAccentCategory`
- [ ] Логика получения конфигурации корректна
- [ ] Обработка отсутствия конфигурации добавлена
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 5: Создание computed-свойства dateAccentStyle

#### 5.1. Реализация computed-свойства

**Действие:**
Добавить computed-свойство для генерации стилей элемента даты:

```javascript
    /**
     * Стили для элемента даты с визуальным акцентом
     * 
     * Генерирует объект стилей для применения к элементу даты через :style.
     * Стили включают:
     * - color: Цвет текста (из конфигурации)
     * - backgroundColor: Цвет фона (из конфигурации)
     * - borderColor: Цвет границы (из конфигурации)
     * - border: Граница с цветом из конфигурации
     * 
     * @returns {Object} Объект стилей для применения через :style или пустой объект
     * 
     * @example
     * // Если dateAccentConfig содержит цвета для категории "today"
     * // Результат:
     * // {
     * //   color: '#155724',
     * //   backgroundColor: '#d4edda',
     * //   borderColor: '#28a745',
     * //   border: '1px solid #28a745'
     * // }
     */
    const dateAccentStyle = computed(() => {
      // Получаем конфигурацию визуального акцента
      const config = dateAccentConfig.value;
      
      // Если конфигурация отсутствует, возвращаем пустой объект
      if (!config) {
        return {};
      }
      
      // Генерируем объект стилей
      return {
        color: config.textColor,
        backgroundColor: config.backgroundColor,
        borderColor: config.color,
        border: `1px solid ${config.color}`
      };
    });
```

**Детальное объяснение:**

1. **Получение конфигурации:**
   - `dateAccentConfig.value` — использует ранее созданное computed-свойство
   - Может быть `null`, если категория не определена

2. **Проверка на наличие конфигурации:**
   - Если конфигурация отсутствует, возвращается пустой объект `{}`
   - Стили не применяются, но элемент может отображаться с дефолтными стилями

3. **Генерация стилей:**
   - `color: config.textColor` — цвет текста
   - `backgroundColor: config.backgroundColor` — цвет фона
   - `borderColor: config.color` — цвет границы
   - `border: '1px solid ${config.color}'` — граница с цветом

**Проверка:**
- [ ] Computed-свойство добавлено после `dateAccentConfig`
- [ ] Логика генерации стилей корректна
- [ ] Все свойства стилей включены
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 6: Обновление return в setup()

#### 6.1. Анализ текущего return

**Текущий return (строки 224-236):**

```javascript
    return {
      handleDragStart,
      handleDragEnd,
      handleCardClick,
      isDragEnabled,
      priorityChipStyle,
      displayPriorityLabel,
      priorityBorderStyle,
      displayServiceLabel,
      serviceChipStyle,
      actionStrValue,
      actionChipStyle
    };
```

#### 6.2. Добавление новых computed-свойств в return

**Действие:**
Добавить новые computed-свойства в return:

```javascript
    return {
      handleDragStart,
      handleDragEnd,
      handleCardClick,
      isDragEnabled,
      priorityChipStyle,
      displayPriorityLabel,
      priorityBorderStyle,
      displayServiceLabel,
      serviceChipStyle,
      actionStrValue,
      actionChipStyle,
      formattedCreatedDate,    // ← Добавить
      dateAccentCategory,       // ← Добавить (опционально, если нужно в шаблоне)
      dateAccentConfig,         // ← Добавить
      dateAccentStyle           // ← Добавить
    };
```

**Детальное объяснение:**

1. **`formattedCreatedDate`**
   - Используется в шаблоне для отображения даты
   - Обязательно для добавления

2. **`dateAccentCategory`**
   - Может использоваться для отладки или дополнительной логики
   - Опционально, но рекомендуется добавить

3. **`dateAccentConfig`**
   - Используется в шаблоне для отображения метки категории (`dateAccentConfig?.label`)
   - Обязательно для добавления

4. **`dateAccentStyle`**
   - Используется в шаблоне для применения стилей (`:style="dateAccentStyle"`)
   - Обязательно для добавления

**Проверка:**
- [ ] Все новые computed-свойства добавлены в return
- [ ] Порядок соответствует логике (можно сгруппировать по функциональности)
- [ ] Синтаксис корректен

---

### Шаг 7: Добавление элемента в шаблон

#### 7.1. Определение места вставки

**Место вставки:**
- Внутри `.ticket-card` (корневой контейнер)
- После всех существующих элементов (после `.ticket-description`, строка 36)
- Перед закрывающим тегом `</div>` корневого контейнера

**Причина:**
- Элемент должен быть последним в DOM для корректного абсолютного позиционирования
- Не влияет на порядок визуального отображения (абсолютное позиционирование)

**Визуальная схема:**
```vue
<template>
  <div class="ticket-card" ...>
    <!-- ... существующие элементы ... -->
    
    <div v-if="ticket.description" class="ticket-description">
      {{ ticket.description }}
    </div>
    
    <!-- ← МЕСТО ВСТАВКИ: элемент даты создания -->
    <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
      <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
      <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
    </div>
  </div>
</template>
```

#### 7.2. Добавление элемента в шаблон

**Действие:**
1. Найти строку 36 (конец `.ticket-description`)
2. Найти строку 37 (закрывающий тег `</div>` корневого контейнера)
3. Добавить между ними новый элемент:

```vue
    <div v-if="ticket.description" class="ticket-description">
      {{ ticket.description }}
    </div>
    
    <!-- Дата создания с визуальным акцентом (левый нижний угол) -->
    <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
      <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
      <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
    </div>
  </div>
</template>
```

**Детальное объяснение:**

1. **Условие отображения:**
   - `v-if="formattedCreatedDate"` — элемент отображается только если дата отформатирована
   - Проверяет на пустую строку (если дата некорректна, `formattedCreatedDate` вернёт `''`)

2. **Класс элемента:**
   - `class="ticket-created-date"` — для применения стилей

3. **Динамические стили:**
   - `:style="dateAccentStyle"` — применяет стили с визуальными акцентами
   - Стили зависят от категории давности

4. **Метка категории:**
   - `<span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>`
   - Использует optional chaining (`?.`) для безопасного доступа
   - Fallback на пустую строку, если конфигурация отсутствует

5. **Значение даты:**
   - `<span class="ticket-date-value">{{ formattedCreatedDate }}</span>`
   - Отображает отформатированную дату (DD.MM.YYYY)

**Проверка:**
- [ ] Элемент добавлен после всех существующих элементов
- [ ] Условие `v-if` добавлено
- [ ] Классы указаны корректно
- [ ] Динамические стили применены (`:style`)
- [ ] Оба span-элемента добавлены
- [ ] Синтаксис корректен

---

### Шаг 8: Добавление стилей для элемента даты

#### 8.1. Анализ текущих стилей

**Текущие стили `.ticket-card` (после этапа 3):**

```css
.ticket-card {
  position: relative;  /* ← Уже добавлено в этапе 3 */
  background: white;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Вывод:** `position: relative` уже установлен, дополнительных изменений не требуется.

#### 8.2. Добавление стилей .ticket-created-date

**Действие:**
1. Найти конец стилей компонента (после строки 333, перед закрывающим тегом `</style>`)
2. Добавить стили для `.ticket-created-date` и вложенных элементов:

```css
.ticket-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ticket-created-date {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 9px;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 60px;
  z-index: 1;
}

.ticket-date-label {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 8px;
  line-height: 1;
}

.ticket-date-value {
  font-weight: 500;
  font-size: 9px;
  line-height: 1.2;
}
```

**Детальное объяснение каждого свойства:**

**Стили `.ticket-created-date`:**

1. **`position: absolute`**
   - Абсолютное позиционирование относительно `.ticket-card`
   - Элемент выходит из потока документа

2. **`bottom: 8px`**
   - Отступ снизу от края `.ticket-card`
   - Учитывает `padding: 12px` карточки

3. **`left: 8px`**
   - Отступ слева от края `.ticket-card`
   - Соответствует позиции элемента отдела заказчика (визуальная согласованность)

4. **`font-size: 9px`**
   - Базовый размер шрифта для контейнера
   - Маленький размер для компактности

5. **`padding: 4px 6px`**
   - Вертикальный padding: `4px` (больше, чем у отдела заказчика, т.к. две строки)
   - Горизонтальный padding: `6px` (соответствует отделу заказчика)

6. **`border-radius: 4px`**
   - Скругление углов (соответствует другим элементам карточки)

7. **`display: flex`**
   - Flexbox для вертикального расположения дочерних элементов

8. **`flex-direction: column`**
   - Вертикальное расположение (метка сверху, дата снизу)

9. **`gap: 2px`**
   - Отступ между меткой и датой

10. **`min-width: 60px`**
    - Минимальная ширина для читаемости

11. **`z-index: 1`**
    - Элемент поверх других элементов карточки

**Стили `.ticket-date-label`:**

1. **`font-weight: 600`**
   - Жирный шрифт для акцента на метке категории

2. **`text-transform: uppercase`**
   - Верхний регистр для метки (например, "СЕГОДНЯ")

3. **`font-size: 8px`**
   - Очень маленький размер для компактности

4. **`line-height: 1`**
   - Минимальная высота строки для компактности

**Стили `.ticket-date-value`:**

1. **`font-weight: 500`**
   - Средний вес для читаемости

2. **`font-size: 9px`**
   - Немного больше, чем метка, для читаемости даты

3. **`line-height: 1.2`**
   - Немного больше, чем у метки, для читаемости

**Проверка:**
- [ ] Все стили добавлены
- [ ] Значения соответствуют требованиям
- [ ] Структура стилей корректна (контейнер + два вложенных элемента)
- [ ] Синтаксис корректен

---

### Шаг 9: Обновление JSDoc комментариев

#### 9.1. Анализ текущих JSDoc комментариев

**Текущая структура JSDoc (строки 44-70):**

```javascript
/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, отдел заказчика, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * При клике открывает детальную информацию о тикете в iframe Bitrix24
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 * 
 * @component
 * @prop {Object} ticket - Объект тикета
 * @prop {number} ticket.id - ID тикета
 * @prop {string} ticket.title - Название тикета (fallback, если отсутствует ufSubject)
 * @prop {string|null} ticket.ufSubject - Тема тикета из пользовательского поля UF_SUBJECT (приоритетное для отображения)
 * @prop {string|null} ticket.departmentHead - Отдел заказчика из UF_CRM_7_DEPARTMENT_HEAD (ограничено 10 символами, отображается в левом верхнем углу карточки)
 * @prop {string} ticket.priorityId - Внутренний id приоритета (из UF_CRM_7_UF_PRIORITY)
 * @prop {string} ticket.priorityLabel - Отображаемое значение приоритета
 * @prop {Object} ticket.priorityColors - Цвета приоритета { color, backgroundColor, textColor }
 * @prop {string} ticket.priority - legacy-поле приоритета (id), сохраняется для обратной совместимости
 * @prop {string} ticket.status - Статус (in_progress, new, done, pending)
 * @prop {string|null} ticket.actionStr - Значение UF_ACTION_STR из Bitrix24 (динамичная строка, опционально)
 * @prop {string} ticket.description - Описание тикета (опционально)
 * @prop {boolean} draggable - Можно ли перетаскивать тикет
 * @emits {Object} click - Тикет кликнут
 * @emits {Object} drag-start - Начато перетаскивание тикета
 * @emits {void} drag-end - Завершено перетаскивание тикета
 */
```

#### 9.2. Добавление описания нового поля

**Действие:**
1. Найти строку с `@prop {string} ticket.description` (примерно строка 66)
2. Добавить после неё описание нового поля:

```javascript
 * @prop {string} ticket.description - Описание тикета (опционально)
 * @prop {string} ticket.createdAt - Дата создания тикета в формате ISO 8601 (например, "2024-07-22T18:00:00+02:00"), отображается в левом нижнем углу карточки с визуальными акцентами в зависимости от давности
 * @prop {boolean} draggable - Можно ли перетаскивать тикет
```

**Детальное описание:**
- **Тип:** `{string}` — строка в формате ISO 8601
- **Имя:** `ticket.createdAt` — поле из маппера тикетов
- **Описание:** "Дата создания тикета в формате ISO 8601 (например, "2024-07-22T18:00:00+02:00"), отображается в левом нижнем углу карточки с визуальными акцентами в зависимости от давности"
  - Указывает формат даты
  - Указывает расположение в карточке
  - Указывает наличие визуальных акцентов

#### 9.3. Обновление общего описания компонента

**Действие:**
1. Найти строку 47 (`Отображает информацию о тикете (ID, тема, отдел заказчика, приоритет, статус)`)
2. Обновить описание:

```javascript
/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, отдел заказчика, дата создания, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * При клике открывает детальную информацию о тикете в iframe Bitrix24
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 * 
 * @component
 * ...
 */
```

**Проверка:**
- [ ] JSDoc комментарий добавлен после `ticket.description`
- [ ] Тип указан корректно (`{string}`)
- [ ] Описание содержит информацию о формате, расположении и визуальных акцентах
- [ ] Общее описание компонента обновлено
- [ ] Форматирование соответствует остальным комментариям

---

### Шаг 10: Тестирование изменений

#### 10.1. Локальное тестирование

**Действие:**
1. Запустить приложение локально
2. Открыть дашборд сектора 1С
3. Проверить консоль браузера на наличие ошибок
4. Проверить, что карточки тикетов отображаются корректно

**Проверка в консоли:**
```javascript
// В консоли браузера проверить структуру тикета
console.log(ticket);
// Должно содержать поле: createdAt

// Проверить computed-свойства
console.log('formattedCreatedDate:', formattedCreatedDate.value);
console.log('dateAccentCategory:', dateAccentCategory.value);
console.log('dateAccentConfig:', dateAccentConfig.value);
console.log('dateAccentStyle:', dateAccentStyle.value);
```

#### 10.2. Проверка отображения элемента даты

**Тестовые сценарии:**

1. **Тикет с датой создания сегодня**
   - Входные данные: `ticket.createdAt = '2024-12-11T15:00:00+02:00'` (сегодня)
   - Ожидаемый результат:
     - Элемент отображается в левом нижнем углу
     - Метка: "СЕГОДНЯ"
     - Дата: "11.12.2024"
     - Цвета: зелёный акцент

2. **Тикет с датой создания на этой неделе**
   - Входные данные: `ticket.createdAt = '2024-12-09T10:00:00+02:00'` (2 дня назад)
   - Ожидаемый результат:
     - Элемент отображается
     - Метка: "НА ЭТОЙ НЕДЕЛЕ"
     - Дата: "09.12.2024"
     - Цвета: голубой акцент

3. **Тикет с датой создания более года**
   - Входные данные: `ticket.createdAt = '2023-01-01T10:00:00+02:00'` (более года)
   - Ожидаемый результат:
     - Элемент отображается
     - Метка: "БОЛЕЕ ГОДА"
     - Дата: "01.01.2023"
     - Цвета: тёмно-серый акцент

4. **Тикет без даты создания**
   - Входные данные: `ticket.createdAt = ''` или `null`
   - Ожидаемый результат: Элемент не отображается (условие `v-if`)

5. **Тикет с некорректной датой**
   - Входные данные: `ticket.createdAt = 'invalid-date'`
   - Ожидаемый результат: Элемент не отображается (форматирование вернёт пустую строку)

**Проверка:**
- [ ] Все тестовые сценарии проверены
- [ ] Элемент отображается корректно
- [ ] Позиционирование корректно (левый нижний угол)
- [ ] Визуальные акценты применяются для всех категорий

#### 10.3. Проверка визуальных акцентов для всех категорий

**Тестовые сценарии для каждой категории:**

1. **СЕГОДНЯ (today)**
   - Цвета: зелёный (#28a745), светло-зелёный фон (#d4edda), тёмно-зелёный текст (#155724)

2. **НА ЭТОЙ НЕДЕЛЕ (this_week)**
   - Цвета: голубой (#17a2b8), светло-голубой фон (#d1ecf1), тёмно-голубой текст (#0c5460)

3. **НА ПРОШЛОЙ НЕДЕЛЕ (last_week)**
   - Цвета: жёлтый (#ffc107), светло-жёлтый фон (#fff3cd), тёмно-жёлтый текст (#856404)

4. **БОЛЕЕ ДВУХ НЕДЕЛЬ (more_than_two_weeks)**
   - Цвета: оранжевый (#fd7e14), светло-оранжевый фон (#ffe5d0), тёмно-оранжевый текст (#7d3f00)

5. **ДО 1 МЕСЯЦА (up_to_one_month)**
   - Цвета: красный (#dc3545), светло-красный фон (#f8d7da), тёмно-красный текст (#721c24)

6. **БОЛЕЕ 2 МЕСЯЦЕВ (more_than_two_months)**
   - Цвета: серый (#6c757d), светло-серый фон (#e2e3e5), тёмно-серый текст (#383d41)

7. **БОЛЕЕ ПОЛУГОДА (more_than_half_year)**
   - Цвета: серый (#6c757d), серый фон (#d6d8db), чёрный текст (#212529)

8. **БОЛЕЕ ГОДА (more_than_year)**
   - Цвета: тёмно-серый (#343a40), тёмно-серый фон (#c6c8ca), чёрный текст (#000000)

**Проверка:**
- [ ] Все 8 категорий проверены
- [ ] Цвета соответствуют конфигурации
- [ ] Текст читаем на фоне
- [ ] Граница отображается корректно

#### 10.4. Проверка позиционирования

**Визуальная проверка:**

1. **Позиция элемента:**
   - Элемент должен быть в левом нижнем углу карточки
   - Отступ снизу: `8px` от края карточки
   - Отступ слева: `8px` от края карточки

2. **Наложение на другие элементы:**
   - Элемент не должен перекрывать описание тикета критично
   - Элемент может слегка накладываться на другие элементы (это допустимо)

3. **Z-index:**
   - Элемент должен быть поверх других элементов карточки
   - Текст должен быть читаемым

**Проверка:**
- [ ] Позиция корректна
- [ ] Наложение минимальное или отсутствует
- [ ] Текст читаем

#### 10.5. Проверка форматирования даты

**Тестовые сценарии:**

1. **Форматирование даты:**
   - Входные данные: `'2024-07-22T18:00:00+02:00'`
   - Ожидаемый результат: `'22.07.2024'`

2. **Форматирование даты с ведущими нулями:**
   - Входные данные: `'2024-01-05T00:00:00Z'`
   - Ожидаемый результат: `'05.01.2024'`

3. **Форматирование даты без часового пояса:**
   - Входные данные: `'2024-12-01T10:30:00'`
   - Ожидаемый результат: `'01.12.2024'`

**Проверка:**
- [ ] Форматирование корректно (DD.MM.YYYY)
- [ ] Ведущие нули добавляются
- [ ] Разделитель — точка (`.`)

#### 10.6. Проверка адаптивности

**Действие:**
1. Проверить отображение на разных размерах экрана
2. Проверить работу на мобильных устройствах
3. Проверить, что элемент не ломает макет карточки

**Проверка:**
- [ ] Адаптивность работает корректно
- [ ] Элемент не ломает макет на мобильных устройствах
- [ ] Текст читаем на всех размерах экрана

#### 10.7. Проверка производительности

**Действие:**
1. Загрузить дашборд с большим количеством тикетов (100+)
2. Измерить время рендеринга
3. Проверить, что вычисление computed-свойств не замедляет рендеринг

**Проверка:**
- [ ] Время рендеринга не увеличилось значительно
- [ ] Нет задержек при отображении карточек
- [ ] Computed-свойства вычисляются эффективно

---

## Итоговый код изменений

### Обновлённые импорты

```javascript
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';
```

### Обновлённый шаблон (template)

```vue
<template>
  <div
    class="ticket-card"
    :draggable="isDragEnabled"
    :style="priorityBorderStyle"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Отдел заказчика (левый верхний угол) -->
    <div v-if="ticket.departmentHead" class="ticket-department">
      {{ ticket.departmentHead }}
    </div>
    
    <div class="ticket-header">
      <span class="ticket-icon">🎫</span>
      <span class="ticket-id">#{{ ticket.id }}</span>
    </div>
    
    <div class="ticket-title">
      {{ ticket.ufSubject || ticket.title || 'Без названия' }}
    </div>
    
    <div class="ticket-meta">
      <span class="ticket-priority" :style="priorityChipStyle">
        {{ displayPriorityLabel }}
      </span>
      <span class="ticket-service" :style="serviceChipStyle">
        {{ displayServiceLabel }}
      </span>
    </div>
    
    <div v-if="actionStrValue" class="ticket-action">
      <span class="ticket-action-chip" :style="actionChipStyle">
        {{ actionStrValue }}
      </span>
    </div>
    
    <div v-if="ticket.description" class="ticket-description">
      {{ ticket.description }}
    </div>
    
    <!-- Дата создания с визуальным акцентом (левый нижний угол) -->
    <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
      <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
      <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
    </div>
  </div>
</template>
```

### Обновлённая секция setup() (computed-свойства)

```javascript
    /**
     * Стили для чипа UF_ACTION_STR (второй этаж)
     * Использует нейтральные цвета
     */
    const actionChipStyle = computed(() => ({
      color: NEUTRAL_ACTION_COLORS.textColor,
      backgroundColor: NEUTRAL_ACTION_COLORS.backgroundColor,
      borderColor: NEUTRAL_ACTION_COLORS.color
    }));

    /**
     * Отформатированная дата создания тикета
     * 
     * Парсит дату из формата Bitrix24 (ISO 8601) и форматирует в DD.MM.YYYY
     * Возвращает пустую строку, если дата отсутствует или некорректна
     * 
     * @returns {string} Отформатированная дата (DD.MM.YYYY) или пустая строка
     */
    const formattedCreatedDate = computed(() => {
      if (!props.ticket.createdAt) {
        return '';
      }
      
      const date = parseBitrixDate(props.ticket.createdAt);
      
      if (!date) {
        return '';
      }
      
      return formatDate(date);
    });

    /**
     * Категория давности даты создания тикета
     * 
     * Определяет, к какой категории давности относится дата создания:
     * - СЕГОДНЯ, НА ЭТОЙ НЕДЕЛЕ, НА ПРОШЛОЙ НЕДЕЛЕ, БОЛЕЕ ДВУХ НЕДЕЛЬ,
     *   ДО 1 МЕСЯЦА, БОЛЕЕ 2 МЕСЯЦЕВ, БОЛЕЕ ПОЛУГОДА, БОЛЕЕ ГОДА
     * 
     * @returns {string|null} Категория давности (из DATE_ACCENT_CATEGORIES) или null, если дата отсутствует
     */
    const dateAccentCategory = computed(() => {
      if (!props.ticket.createdAt) {
        return null;
      }
      
      const date = parseBitrixDate(props.ticket.createdAt);
      
      if (!date) {
        return null;
      }
      
      return getDateAccentCategory(date);
    });

    /**
     * Конфигурация визуального акцента для даты создания
     * 
     * Получает конфигурацию цветов и метки для категории давности даты.
     * Конфигурация содержит:
     * - label: Текстовая метка категории (например, "СЕГОДНЯ")
     * - color: Цвет границы и акцента
     * - backgroundColor: Цвет фона
     * - textColor: Цвет текста
     * 
     * @returns {Object|null} Конфигурация визуального акцента или null, если категория не определена
     */
    const dateAccentConfig = computed(() => {
      const category = dateAccentCategory.value;
      
      if (!category) {
        return null;
      }
      
      const config = DATE_ACCENT_CONFIG[category];
      
      if (!config) {
        console.warn('Date accent config not found for category:', category);
        return null;
      }
      
      return config;
    });

    /**
     * Стили для элемента даты с визуальным акцентом
     * 
     * Генерирует объект стилей для применения к элементу даты через :style.
     * Стили включают:
     * - color: Цвет текста (из конфигурации)
     * - backgroundColor: Цвет фона (из конфигурации)
     * - borderColor: Цвет границы (из конфигурации)
     * - border: Граница с цветом из конфигурации
     * 
     * @returns {Object} Объект стилей для применения через :style или пустой объект
     */
    const dateAccentStyle = computed(() => {
      const config = dateAccentConfig.value;
      
      if (!config) {
        return {};
      }
      
      return {
        color: config.textColor,
        backgroundColor: config.backgroundColor,
        borderColor: config.color,
        border: `1px solid ${config.color}`
      };
    });
```

### Обновлённый return в setup()

```javascript
    return {
      handleDragStart,
      handleDragEnd,
      handleCardClick,
      isDragEnabled,
      priorityChipStyle,
      displayPriorityLabel,
      priorityBorderStyle,
      displayServiceLabel,
      serviceChipStyle,
      actionStrValue,
      actionChipStyle,
      formattedCreatedDate,
      dateAccentCategory,
      dateAccentConfig,
      dateAccentStyle
    };
```

### Обновлённые стили (style)

```css
.ticket-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ticket-created-date {
  position: absolute;
  bottom: 8px;
  left: 8px;
  font-size: 9px;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 60px;
  z-index: 1;
}

.ticket-date-label {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 8px;
  line-height: 1;
}

.ticket-date-value {
  font-weight: 500;
  font-size: 9px;
  line-height: 1.2;
}
```

### Обновлённый JSDoc комментарий

```javascript
/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, отдел заказчика, дата создания, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * При клике открывает детальную информацию о тикете в iframe Bitrix24
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 * 
 * @component
 * @prop {Object} ticket - Объект тикета
 * @prop {number} ticket.id - ID тикета
 * @prop {string} ticket.title - Название тикета (fallback, если отсутствует ufSubject)
 * @prop {string|null} ticket.ufSubject - Тема тикета из пользовательского поля UF_SUBJECT (приоритетное для отображения)
 * @prop {string|null} ticket.departmentHead - Отдел заказчика из UF_CRM_7_DEPARTMENT_HEAD (ограничено 10 символами, отображается в левом верхнем углу карточки)
 * @prop {string} ticket.priorityId - Внутренний id приоритета (из UF_CRM_7_UF_PRIORITY)
 * @prop {string} ticket.priorityLabel - Отображаемое значение приоритета
 * @prop {Object} ticket.priorityColors - Цвета приоритета { color, backgroundColor, textColor }
 * @prop {string} ticket.priority - legacy-поле приоритета (id), сохраняется для обратной совместимости
 * @prop {string} ticket.status - Статус (in_progress, new, done, pending)
 * @prop {string|null} ticket.actionStr - Значение UF_ACTION_STR из Bitrix24 (динамичная строка, опционально)
 * @prop {string} ticket.description - Описание тикета (опционально)
 * @prop {string} ticket.createdAt - Дата создания тикета в формате ISO 8601 (например, "2024-07-22T18:00:00+02:00"), отображается в левом нижнем углу карточки с визуальными акцентами в зависимости от давности
 * @prop {boolean} draggable - Можно ли перетаскивать тикет
 * @emits {Object} click - Тикет кликнут
 * @emits {Object} drag-start - Начато перетаскивание тикета
 * @emits {void} drag-end - Завершено перетаскивание тикета
 */
```

---

## ASCII-схема карточки с новыми элементами

### Визуальная схема расположения элементов

```
┌─────────────────────────────────────────────────────────────┐
│  [Отдел]  ← ticket-department (absolute, top: 8px, left: 8px)│
│           ┌────────────────────────────────────────────────┐  │
│           │  🎫 #12345  ← ticket-header                    │  │
│           └────────────────────────────────────────────────┘  │
│                                                                │
│           Тема тикета из UF_SUBJECT                          │
│           ← ticket-title                                      │
│                                                                │
│           ┌──────────┐  ┌──────────┐                        │
│           │ Приоритет │  │ Сервис   │                        │
│           │  (чип)   │  │  (чип)   │                        │
│           └──────────┘  └──────────┘                        │
│                                                                │
│           ┌──────────────────────────┐                      │
│           │ UF_ACTION_STR (чип)     │                      │
│           └──────────────────────────┘                      │
│                                                                │
│           Описание тикета (опционально)                      │
│           Максимум 2 строки, обрезка ...                     │
│                                                                │
│                                                                │
│  ┌──────────────┐                                             │
│  │ СЕГОДНЯ      │  ← ticket-created-date                     │
│  │ 22.07.2024   │     (absolute, bottom: 8px, left: 8px)     │
│  └──────────────┘                                             │
│                                                                │
└─────────────────────────────────────────────────────────────┘
```

### Детальная схема позиционирования

```
┌─────────────────────────────────────────────────────────────┐
│  padding: 12px                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ top: 8px                                              │   │
│  │ left: 8px                                            │   │
│  │ ┌──────────────┐                                     │   │
│  │ │ [Отдел]      │  ← ticket-department (absolute)     │   │
│  │ └──────────────┘                                     │   │
│  │                                                       │   │
│  │  🎫 #12345  ← ticket-header                          │   │
│  │                                                       │   │
│  │  Тема тикета...                                      │   │
│  │                                                       │   │
│  │  [Приоритет] [Сервис]                                │   │
│  │                                                       │   │
│  │  ...                                                 │   │
│  │                                                       │   │
│  │                                                       │   │
│  │  bottom: 8px                                         │   │
│  │  left: 8px                                           │   │
│  │  ┌──────────────┐                                    │   │
│  │  │ СЕГОДНЯ      │  ← ticket-created-date (absolute)  │   │
│  │  │ 22.07.2024   │     (две строки: метка + дата)     │   │
│  │  └──────────────┘                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  padding: 12px                                               │
└─────────────────────────────────────────────────────────────┘
```

### Схема структуры элемента даты

```
┌─────────────────────────────┐
│  ticket-created-date        │
│  (контейнер с flex column)  │
│  ┌───────────────────────┐  │
│  │ СЕГОДНЯ               │  │ ← ticket-date-label
│  │ (font-size: 8px)      │  │   (uppercase, bold)
│  │ (text-transform:      │  │
│  │  uppercase)           │  │
│  └───────────────────────┘  │
│  gap: 2px                   │
│  ┌───────────────────────┐  │
│  │ 22.07.2024            │  │ ← ticket-date-value
│  │ (font-size: 9px)      │  │   (medium weight)
│  └───────────────────────┘  │
│                             │
│  Стили (динамические):      │
│  - backgroundColor:         │
│    (из dateAccentConfig)    │
│  - border: 1px solid        │
│    (цвет из dateAccentConfig)│
│  - color: textColor         │
│    (из dateAccentConfig)    │
└─────────────────────────────┘
```

---

## Критерии приёмки

### Обязательные проверки

- [ ] Импорты утилит для работы с датами добавлены
  - [ ] Импорт `parseBitrixDate`, `formatDate`, `getDateAccentCategory` из `date-utils.js`
  - [ ] Импорт `DATE_ACCENT_CONFIG` из `date-accent-config.js`
  - [ ] Пути к файлам корректны

- [ ] Computed-свойства созданы
  - [ ] `formattedCreatedDate` — форматирование даты
  - [ ] `dateAccentCategory` — определение категории давности
  - [ ] `dateAccentConfig` — получение конфигурации акцента
  - [ ] `dateAccentStyle` — генерация стилей
  - [ ] Все computed-свойства добавлены в return

- [ ] Элемент даты добавлен в шаблон
  - [ ] Элемент добавлен после всех существующих элементов
  - [ ] Условие `v-if="formattedCreatedDate"` добавлено
  - [ ] Класс `ticket-created-date` указан
  - [ ] Динамические стили применены (`:style="dateAccentStyle"`)
  - [ ] Оба span-элемента добавлены (метка и дата)

- [ ] Стили для элемента даты добавлены
  - [ ] Стили `.ticket-created-date` добавлены
  - [ ] Стили `.ticket-date-label` добавлены
  - [ ] Стили `.ticket-date-value` добавлены
  - [ ] Абсолютное позиционирование работает корректно
  - [ ] Элемент находится в левом нижнем углу

- [ ] Визуальные акценты применяются корректно
  - [ ] Цвета фона применяются для всех категорий
  - [ ] Цвета текста применяются для всех категорий
  - [ ] Границы применяются для всех категорий
  - [ ] Метки категорий отображаются корректно

- [ ] JSDoc комментарии обновлены
  - [ ] Добавлено описание поля `ticket.createdAt`
  - [ ] Указан формат даты, расположение и визуальные акценты
  - [ ] Обновлено общее описание компонента

### Дополнительные проверки

- [ ] Граничные случаи обработаны
  - [ ] `null` → элемент не отображается
  - [ ] `''` (пустая строка) → элемент не отображается
  - [ ] Некорректная дата → элемент не отображается
  - [ ] Все 8 категорий давности работают корректно

- [ ] Форматирование даты корректно
  - [ ] Формат DD.MM.YYYY
  - [ ] Ведущие нули добавляются
  - [ ] Разделитель — точка (`.`)

- [ ] Адаптивность работает корректно
  - [ ] Элемент корректно отображается на разных размерах экрана
  - [ ] Элемент не ломает макет на мобильных устройствах
  - [ ] Текст читаем на всех размерах экрана

- [ ] Производительность не ухудшена
  - [ ] Время рендеринга не увеличилось значительно
  - [ ] Нет задержек при отображении карточек
  - [ ] Computed-свойства вычисляются эффективно

- [ ] Код соответствует стандартам проекта
  - [ ] ESLint не выдаёт ошибок
  - [ ] Форматирование соответствует остальному коду
  - [ ] Комментарии добавлены где необходимо

---

## Примеры тестирования

### Пример 1: Тикет с датой создания сегодня

**Входные данные:**
```javascript
const ticket = {
  id: 12345,
  title: 'Тестовый тикет',
  createdAt: '2024-12-11T15:00:00+02:00'  // Сегодня
};
```

**Ожидаемый результат:**
- Элемент `.ticket-created-date` отображается в левом нижнем углу
- Метка: "СЕГОДНЯ"
- Дата: "11.12.2024"
- Цвета: зелёный акцент (фон: #d4edda, текст: #155724, граница: #28a745)

### Пример 2: Тикет с датой создания на этой неделе

**Входные данные:**
```javascript
const ticket = {
  id: 12346,
  title: 'Тестовый тикет 2',
  createdAt: '2024-12-09T10:00:00+02:00'  // 2 дня назад
};
```

**Ожидаемый результат:**
- Элемент отображается
- Метка: "НА ЭТОЙ НЕДЕЛЕ"
- Дата: "09.12.2024"
- Цвета: голубой акцент (фон: #d1ecf1, текст: #0c5460, граница: #17a2b8)

### Пример 3: Тикет с датой создания более года

**Входные данные:**
```javascript
const ticket = {
  id: 12347,
  title: 'Тестовый тикет 3',
  createdAt: '2023-01-01T10:00:00+02:00'  // Более года
};
```

**Ожидаемый результат:**
- Элемент отображается
- Метка: "БОЛЕЕ ГОДА"
- Дата: "01.01.2023"
- Цвета: тёмно-серый акцент (фон: #c6c8ca, текст: #000000, граница: #343a40)

### Пример 4: Тикет без даты создания

**Входные данные:**
```javascript
const ticket = {
  id: 12348,
  title: 'Тестовый тикет 4',
  createdAt: null
};
```

**Ожидаемый результат:**
- Элемент `.ticket-created-date` не отображается (условие `v-if`)

---

## История правок

- **2025-12-11 20:50 (UTC+3, Брест):** Создана задача TASK-030-04
  - Добавлено детальное описание этапа
  - Добавлен анализ текущей структуры компонента и computed-свойств
  - Добавлены пошаговые инструкции с примерами кода
  - Добавлены ASCII-схемы расположения элементов и структуры элемента даты
  - Добавлены критерии приёмки и примеры тестирования для всех 8 категорий давности

---

## Связанные документы

- `DOCS/TASKS/TASK-030-ticket-card-department-and-date.md` — родительская задача
- `DOCS/TASKS/TASK-030-02-create-date-utils-and-accent-config.md` — этап 2 (создание утилит для дат)
- `vue-app/src/components/dashboard/TicketCard.vue` — файл для изменений
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — утилиты для работы с датами
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — конфигурация визуальных акцентов
- `DOCS/GUIDES/ui-ticket-card-guideline.md` — гайдлайн по карточке тикета

