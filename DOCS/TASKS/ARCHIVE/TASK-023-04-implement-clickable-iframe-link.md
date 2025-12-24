# TASK-023-04: Этап 4 - Реализация кликабельной ссылки на iframe

**Дата создания:** 2025-12-11 11:02 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-023

## Описание этапа

Реализация кликабельной ссылки на iframe для открытия детальной информации о тикете в Bitrix24. Вся карточка тикета должна быть кликабельной с переходом в iframe. Необходимо создать константы для URL, функцию генерации URL, обновить обработчик клика в компоненте и обеспечить совместимость с функциональностью drag & drop.

## Цель этапа

1. Создать константы для базового URL Bitrix24 и раздела сервис-деска
2. Создать функцию генерации URL iframe для тикета
3. Обновить компонент TicketCard для обработки клика с открытием iframe
4. Обеспечить предотвращение клика при перетаскивании (drag & drop)
5. Реализовать fallback на `window.open()` при недоступности BX API
6. Убедиться, что визуальная индикация кликабельности присутствует

---

## Подзадача 4.1: Создание константы для URL iframe

### 4.1.1. Анализ текущей структуры файла constants.js

**Файл:** `vue-app/src/services/dashboard-sector-1c/utils/constants.js`

#### Текущая структура файла

**Строки 1-182:**
- Реэкспорт констант из `sector-constants.js` (строки 8-23)
- Константа `ENTITY_TYPE_ID = 140` (строка 28) — **УЖЕ СУЩЕСТВУЕТ!**
- Константа `SECTOR_TAG = '1C'` (строка 33)
- Объекты `STAGES`, `PRIORITIES`, `STATUSES`
- Функции `getTargetStages()`, `getStageById()`, и т.д.

#### Анализ существующих констант

**Константа `ENTITY_TYPE_ID` (строка 28):**
```javascript
export const ENTITY_TYPE_ID = 140;
```

**Вывод:** Константа `ENTITY_TYPE_ID` уже существует и равна 140. **Использовать её, не создавать дубликат!**

### 4.1.2. Определение необходимых констант

#### Константы для генерации URL iframe

**Необходимые константы:**

1. **`BITRIX24_BASE_URL`**
   - Значение: `'https://bitrix24.kompo.by'`
   - Описание: Базовый URL портала Bitrix24
   - Использование: Начало всех URL для iframe
   - **Новая константа** (не существует)

2. **`SERVISDESK_SECTION`**
   - Значение: `'servisdeskitotdel'`
   - Описание: Раздел сервис-деска в Bitrix24
   - Использование: Часть пути для доступа к тикетам
   - **Новая константа** (не существует)

3. **`ENTITY_TYPE_ID`**
   - Значение: `140`
   - Описание: ID смарт-процесса сектора 1С
   - Использование: Указание типа сущности в URL
   - **УЖЕ СУЩЕСТВУЕТ** (строка 28) — использовать существующую!

### 4.1.3. Определение места размещения констант

#### Рекомендуемое место

**После константы `ENTITY_TYPE_ID` (после строки 28), перед константой `SECTOR_TAG` (строка 33)**

**Обоснование:**
- Логически группируется с `ENTITY_TYPE_ID` (оба используются для работы с тикетами)
- Не нарушает существующую структуру файла
- Легко найти при поиске констант, связанных с тикетами

#### Альтернативные варианты

**Вариант 1: В конце файла (не рекомендуется)**
- Константы будут далеко от `ENTITY_TYPE_ID`
- Труднее найти связанные константы

**Вариант 2: В отдельном файле (не рекомендуется)**
- Усложняет структуру проекта
- Дополнительный импорт в компонентах

### 4.1.4. Реализация добавления констант

#### Шаг 1: Открыть файл constants.js

**Действие:**
1. Открыть файл `vue-app/src/services/dashboard-sector-1c/utils/constants.js`
2. Найти строку 28 (`export const ENTITY_TYPE_ID = 140;`)
3. Прокрутить до строки 33 (`export const SECTOR_TAG = '1C';`)

#### Шаг 2: Добавить константы

**Точное место вставки:** После строки 28, перед строкой 30 (комментарий о глобальном теге)

**Код для вставки:**
```javascript
/**
 * ID смарт-процесса сектора 1С
 */
export const ENTITY_TYPE_ID = 140;

/**
 * Базовый URL Bitrix24 для создания ссылок на iframe
 * 
 * Используется для генерации URL для открытия тикетов в iframe Bitrix24
 */
export const BITRIX24_BASE_URL = 'https://bitrix24.kompo.by';

/**
 * Раздел сервис-деска в Bitrix24
 * 
 * Используется в URL для доступа к тикетам сервис-деска
 */
export const SERVISDESK_SECTION = 'servisdeskitotdel';

/**
 * Глобальный тег определения сектора 1С
 */
export const SECTOR_TAG = '1C';
```

#### Шаг 3: Объяснение констант

**`BITRIX24_BASE_URL`:**
- **Назначение:** Базовый URL портала Bitrix24
- **Формат:** Полный URL с протоколом (https://)
- **Использование:** Начало всех URL для iframe
- **Пример:** `'https://bitrix24.kompo.by'`

**`SERVISDESK_SECTION`:**
- **Назначение:** Раздел сервис-деска в структуре URL Bitrix24
- **Формат:** Строка без пробелов, в нижнем регистре
- **Использование:** Часть пути в URL iframe
- **Пример:** `'servisdeskitotdel'`

**`ENTITY_TYPE_ID`:**
- **Назначение:** ID смарт-процесса сектора 1С
- **Формат:** Число
- **Использование:** Указание типа сущности в URL
- **Значение:** `140` (уже существует)

### 4.1.5. Проверка корректности добавления

#### Визуальная проверка

**После добавления констант файл должен выглядеть так:**
```javascript
/**
 * ID смарт-процесса сектора 1С
 */
export const ENTITY_TYPE_ID = 140;

/**
 * Базовый URL Bitrix24 для создания ссылок на iframe
 * 
 * Используется для генерации URL для открытия тикетов в iframe Bitrix24
 */
export const BITRIX24_BASE_URL = 'https://bitrix24.kompo.by';

/**
 * Раздел сервис-деска в Bitrix24
 * 
 * Используется в URL для доступа к тикетам сервис-деска
 */
export const SERVISDESK_SECTION = 'servisdeskitotdel';

/**
 * Глобальный тег определения сектора 1С
 */
export const SECTOR_TAG = '1C';
```

#### Проверка синтаксиса

**Действия:**
1. Сохранить файл
2. Проверить, что нет синтаксических ошибок
3. Убедиться, что отступы корректны (2 пробела)
4. Проверить, что экспорты корректны (`export const`)

---

## Подзадача 4.2: Создание функции генерации URL iframe

### 4.2.1. Анализ структуры URL iframe

#### Пример URL

**Пример:** `https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/`

#### Разбивка URL на компоненты

1. **Протокол и домен:** `https://bitrix24.kompo.by`
2. **Базовый путь:** `/page/`
3. **Раздел:** `servisdeskitotdel`
4. **Модуль:** `servisdesk`
5. **Тип сущности:** `type/140`
6. **Действие:** `details/`
7. **ID тикета:** `5025`
8. **Завершающий слэш:** `/`

#### Паттерн генерации

```
{BITRIX24_BASE_URL}/page/{SERVISDESK_SECTION}/servisdesk/type/{ENTITY_TYPE_ID}/details/{ticketId}/
```

**Где:**
- `{BITRIX24_BASE_URL}` = `'https://bitrix24.kompo.by'`
- `{SERVISDESK_SECTION}` = `'servisdeskitotdel'`
- `{ENTITY_TYPE_ID}` = `140`
- `{ticketId}` = ID тикета (параметр функции)

### 4.2.2. Определение места размещения функции

#### Рекомендуемое место

**В том же файле `constants.js`, после констант, перед функциями `getTargetStages()` (строка 143)**

**Обоснование:**
- Логически связана с константами (использует их)
- Группируется с другими утилитарными функциями
- Легко найти при поиске функций, связанных с URL

#### Альтернативные варианты

**Вариант 1: В отдельном файле `iframe-url-helper.js` (не рекомендуется)**
- Усложняет структуру проекта
- Дополнительный импорт в компонентах

**Вариант 2: В конце файла (не рекомендуется)**
- Функция будет далеко от используемых констант

### 4.2.3. Реализация функции генерации URL

#### Шаг 1: Определить место вставки

**Действие:**
1. В файле `constants.js` найти строку 142 (комментарий перед `getTargetStages()`)
2. Вставить функцию перед функцией `getTargetStages()`

#### Шаг 2: Создать функцию

**Код для вставки:**
```javascript
/**
 * Генерация URL для открытия тикета в iframe Bitrix24
 * 
 * Создаёт URL для открытия детальной информации о тикете в Bitrix24.
 * URL имеет формат: {baseUrl}/page/{section}/servisdesk/type/{entityTypeId}/details/{ticketId}/
 * 
 * @param {number} ticketId - ID тикета
 * @returns {string} URL для iframe
 * 
 * @example
 * getTicketIframeUrl(5025)
 * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'
 * 
 * @example
 * getTicketIframeUrl(123)
 * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/123/'
 */
export function getTicketIframeUrl(ticketId) {
  // Валидация входного параметра
  if (!ticketId || typeof ticketId !== 'number') {
    console.warn('getTicketIframeUrl: Invalid ticketId', ticketId);
    return '';
  }
  
  // Генерация URL с использованием констант
  return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
}
```

#### Шаг 3: Объяснение реализации

**Валидация параметра:**
- Проверка на существование `ticketId`
- Проверка типа (должен быть `number`)
- Логирование предупреждения при некорректном значении
- Возврат пустой строки при ошибке (безопасный fallback)

**Генерация URL:**
- Использование template literals (обратные кавычки)
- Подстановка констант: `BITRIX24_BASE_URL`, `SERVISDESK_SECTION`, `ENTITY_TYPE_ID`
- Подстановка параметра: `ticketId`
- Завершающий слэш в конце URL

**JSDoc комментарии:**
- Описание функции
- Описание параметра `@param`
- Описание возвращаемого значения `@returns`
- Примеры использования `@example`

### 4.2.4. Альтернативная реализация (без валидации)

**Если валидация не требуется (упрощённый вариант):**
```javascript
/**
 * Генерация URL для открытия тикета в iframe Bitrix24
 * 
 * @param {number} ticketId - ID тикета
 * @returns {string} URL для iframe
 * 
 * @example
 * getTicketIframeUrl(5025)
 * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'
 */
export function getTicketIframeUrl(ticketId) {
  return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
}
```

**Рекомендация:** Использовать вариант с валидацией для надёжности.

### 4.2.5. Проверка корректности функции

#### Визуальная проверка

**После добавления функции файл должен содержать:**
```javascript
// ... константы ...

/**
 * Генерация URL для открытия тикета в iframe Bitrix24
 * 
 * @param {number} ticketId - ID тикета
 * @returns {string} URL для iframe
 * 
 * @example
 * getTicketIframeUrl(5025)
 * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'
 */
export function getTicketIframeUrl(ticketId) {
  if (!ticketId || typeof ticketId !== 'number') {
    console.warn('getTicketIframeUrl: Invalid ticketId', ticketId);
    return '';
  }
  
  return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
}

/**
 * Получение всех стадий для загрузки
 * 
 * @returns {Array<string>} Массив ID стадий Bitrix24
 */
export function getTargetStages() {
  // ...
}
```

#### Проверка через тестирование

**Действие:**
1. Открыть консоль браузера
2. Импортировать функцию (если возможно) или проверить в коде
3. Вызвать функцию с тестовыми значениями

**Примеры тестирования:**
```javascript
// В консоли браузера (после загрузки приложения)
getTicketIframeUrl(5025)
// Ожидаемый результат: 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'

getTicketIframeUrl(123)
// Ожидаемый результат: 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/123/'

getTicketIframeUrl(null)
// Ожидаемый результат: '' (пустая строка) + предупреждение в консоли
```

---

## Подзадача 4.3: Обновление компонента TicketCard для обработки клика

### 4.3.1. Анализ текущей обработки клика

**Файл:** `vue-app/src/components/dashboard/TicketCard.vue`

#### Текущая реализация

**Строка 10 (шаблон):**
```vue
@click="$emit('click', ticket)"
```

**Анализ:**
- Текущий обработчик просто эмитит событие `click`
- Событие обрабатывается родительским компонентом
- Нет логики открытия iframe

#### Текущая структура setup()

**Строки 82-143:**
```javascript
setup(props, { emit }) {
  const getPriorityLabel = (priority) => { /* ... */ };
  const getStatusLabel = (status) => { /* ... */ };
  const handleDragStart = (event) => { /* ... */ };
  const handleDragEnd = () => { /* ... */ };

  return {
    getPriorityLabel,
    getStatusLabel,
    handleDragStart,
    handleDragEnd
  };
}
```

**Вывод:** Нужно добавить функцию `handleCardClick` и импортировать `getTicketIframeUrl`.

### 4.3.2. Импорт функции getTicketIframeUrl

#### Шаг 1: Добавить импорт

**Место:** В начале блока `<script>`, после комментариев, перед `export default`

**Текущая структура импортов:**
```javascript
<script>
/**
 * Компонент карточки тикета
 * ...
 */
export default {
  // ...
}
</script>
```

**Новый код:**
```javascript
<script>
/**
 * Компонент карточки тикета
 * ...
 */
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';

export default {
  // ...
}
</script>
```

#### Шаг 2: Объяснение импорта

**Путь импорта:** `@/services/dashboard-sector-1c/utils/constants.js`

**Где:**
- `@` — алиас для `src` (настроен в Vite/Webpack)
- `services/dashboard-sector-1c/utils/constants.js` — путь к файлу с константами

**Что импортируется:**
- `getTicketIframeUrl` — функция генерации URL iframe

**Синтаксис:** Named import (именованный импорт)

### 4.3.3. Создание функции handleCardClick

#### Шаг 1: Определить место вставки

**Место:** В функции `setup()`, после `handleDragEnd`, перед `return`

**Структура:**
```javascript
setup(props, { emit }) {
  // ... существующие функции ...
  
  const handleDragEnd = () => {
    emit('drag-end');
  };

  // ДОБАВИТЬ ЗДЕСЬ: handleCardClick

  return {
    // ...
  };
}
```

#### Шаг 2: Создать функцию handleCardClick

**Код для вставки:**
```javascript
/**
 * Обработка клика по карточке тикета
 * 
 * Открывает детальную информацию о тикете в iframe Bitrix24.
 * Предотвращает клик при перетаскивании (drag & drop).
 * 
 * @param {Event} event - Событие клика
 */
const handleCardClick = (event) => {
  // Предотвращаем клик при перетаскивании
  // Проверяем, не начато ли перетаскивание
  if (props.draggable && event.target.closest('.ticket-card[draggable="true"]')) {
    // Если элемент перетаскивается, не обрабатываем клик
    return;
  }
  
  // Дополнительная проверка: если есть активное перетаскивание
  // (можно проверить через состояние, если оно доступно)
  // В данном случае полагаемся на проверку draggable атрибута
  
  // Генерируем URL для iframe
  const iframeUrl = getTicketIframeUrl(props.ticket.id);
  
  // Проверяем, что URL сгенерирован корректно
  if (!iframeUrl) {
    console.error('Failed to generate iframe URL for ticket', props.ticket.id);
    return;
  }
  
  // Использование BX.helper для открытия iframe (если доступен)
  if (typeof BX !== 'undefined' && BX.helper) {
    try {
      BX.helper.show(iframeUrl, {
        width: 1200,
        height: 800
      });
    } catch (error) {
      console.error('Error opening iframe with BX.helper:', error);
      // Fallback на window.open()
      window.open(iframeUrl, '_blank');
    }
  } else {
    // Fallback: открытие в новом окне (если BX.helper недоступен)
    window.open(iframeUrl, '_blank');
  }
  
  // Эмитим событие click для обратной совместимости
  emit('click', props.ticket);
};
```

#### Шаг 3: Объяснение логики функции

**1. Предотвращение клика при перетаскивании:**
```javascript
if (props.draggable && event.target.closest('.ticket-card[draggable="true"]')) {
  return;
}
```
- Проверяет, можно ли перетаскивать карточку (`props.draggable`)
- Проверяет, является ли элемент перетаскиваемым (`draggable="true"`)
- Если да — прерывает выполнение функции (не обрабатывает клик)

**2. Генерация URL:**
```javascript
const iframeUrl = getTicketIframeUrl(props.ticket.id);
```
- Вызывает функцию генерации URL с ID тикета
- Сохраняет результат в переменную

**3. Валидация URL:**
```javascript
if (!iframeUrl) {
  console.error('Failed to generate iframe URL for ticket', props.ticket.id);
  return;
}
```
- Проверяет, что URL сгенерирован корректно (не пустая строка)
- Логирует ошибку при проблеме
- Прерывает выполнение при ошибке

**4. Открытие iframe через BX.helper:**
```javascript
if (typeof BX !== 'undefined' && BX.helper) {
  try {
    BX.helper.show(iframeUrl, {
      width: 1200,
      height: 800
    });
  } catch (error) {
    // Fallback на window.open()
    window.open(iframeUrl, '_blank');
  }
}
```
- Проверяет доступность BX API
- Пытается открыть iframe через `BX.helper.show()`
- Обрабатывает ошибки через `try/catch`
- Использует fallback при ошибке

**5. Fallback на window.open():**
```javascript
else {
  window.open(iframeUrl, '_blank');
}
```
- Используется, если BX.helper недоступен
- Открывает URL в новой вкладке

**6. Эмит события:**
```javascript
emit('click', props.ticket);
```
- Эмитит событие `click` для обратной совместимости
- Родительские компоненты могут обработать событие, если нужно

### 4.3.4. Упрощённая версия функции (без дополнительных проверок)

**Если нужна более простая реализация:**
```javascript
const handleCardClick = (event) => {
  // Предотвращаем клик при перетаскивании
  if (props.draggable) {
    return;
  }
  
  const iframeUrl = getTicketIframeUrl(props.ticket.id);
  
  if (typeof BX !== 'undefined' && BX.helper) {
    BX.helper.show(iframeUrl, {
      width: 1200,
      height: 800
    });
  } else {
    window.open(iframeUrl, '_blank');
  }
  
  emit('click', props.ticket);
};
```

**Рекомендация:** Использовать полную версию с проверками для надёжности.

### 4.3.5. Добавление функции в return

#### Шаг 1: Найти блок return

**Строки 137-142:**
```javascript
return {
  getPriorityLabel,
  getStatusLabel,
  handleDragStart,
  handleDragEnd
};
```

#### Шаг 2: Добавить handleCardClick

**Обновлённый return:**
```javascript
return {
  getPriorityLabel,
  getStatusLabel,
  handleDragStart,
  handleDragEnd,
  handleCardClick  // Добавить новую функцию
};
```

### 4.3.6. Проверка корректности изменений

#### Визуальная проверка

**После всех изменений функция setup() должна выглядеть так:**
```javascript
setup(props, { emit }) {
  const getPriorityLabel = (priority) => { /* ... */ };
  const getStatusLabel = (status) => { /* ... */ };
  const handleDragStart = (event) => { /* ... */ };
  const handleDragEnd = () => { /* ... */ };
  
  const handleCardClick = (event) => {
    // ... код функции ...
  };

  return {
    getPriorityLabel,
    getStatusLabel,
    handleDragStart,
    handleDragEnd,
    handleCardClick
  };
}
```

---

## Подзадача 4.4: Обновление обработчика клика в шаблоне

### 4.4.1. Анализ текущего обработчика

**Строка 10 (шаблон):**
```vue
@click="$emit('click', ticket)"
```

**Анализ:**
- Используется inline обработчик
- Просто эмитит событие
- Нужно заменить на вызов функции `handleCardClick`

### 4.4.2. Замена обработчика

#### Шаг 1: Найти обработчик в шаблоне

**Строки 2-13:**
```vue
<div
  class="ticket-card"
  :class="{ ... }"
  :draggable="draggable"
  @click="$emit('click', ticket)"
  @dragstart="handleDragStart"
  @dragend="handleDragEnd"
>
```

#### Шаг 2: Заменить обработчик

**Текущий код:**
```vue
@click="$emit('click', ticket)"
```

**Новый код:**
```vue
@click="handleCardClick"
```

#### Шаг 3: Объяснение изменения

**Было:**
- Inline обработчик с прямым вызовом `$emit`
- Событие обрабатывалось родительским компонентом

**Стало:**
- Обработчик вызывает функцию `handleCardClick`
- Функция содержит логику открытия iframe
- Событие всё ещё эмитится внутри функции (для обратной совместимости)

### 4.4.3. Финальная структура шаблона

**После замены блок должен выглядеть так:**
```vue
<div
  class="ticket-card"
  :class="{
    'priority-high': ticket.priority === 'high',
    'priority-medium': ticket.priority === 'medium',
    'priority-low': ticket.priority === 'low'
  }"
  :draggable="draggable"
  @click="handleCardClick"
  @dragstart="handleDragStart"
  @dragend="handleDragEnd"
>
  <!-- ... содержимое карточки ... -->
</div>
```

### 4.4.4. Проверка корректности замены

#### Визуальная проверка

- [ ] Обработчик `@click` заменён на `@click="handleCardClick"`
- [ ] Функция `handleCardClick` определена в `setup()`
- [ ] Функция добавлена в `return`
- [ ] Импорт `getTicketIframeUrl` добавлен

---

## Подзадача 4.5: Добавление визуальной индикации кликабельности

### 4.5.1. Анализ текущих стилей

**Файл:** `vue-app/src/components/dashboard/TicketCard.vue`

#### Текущие стили для кликабельности

**Строки 148-156:**
```css
.ticket-card {
  background: white;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #ddd;
  cursor: pointer;  /* ← УЖЕ ЕСТЬ! */
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Строки 158-161:**
```css
.ticket-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}
```

#### Анализ существующих стилей

**`cursor: pointer` (строка 153):**
- Уже присутствует!
- Указывает, что элемент кликабельный
- **Вывод:** Визуальная индикация уже есть, изменений не требуется

**Hover эффект (строки 158-161):**
- Уже присутствует!
- Увеличивает тень при наведении
- Поднимает карточку вверх (`transform: translateY(-2px)`)
- **Вывод:** Hover эффект уже есть, изменений не требуется

### 4.5.2. Проверка необходимости дополнительных стилей

#### Анализ требований

**Требования:**
- Карточка должна визуально указывать на кликабельность
- Должен быть hover эффект
- Курсор должен меняться на pointer

**Текущее состояние:**
- ✅ `cursor: pointer` — есть
- ✅ Hover эффект — есть
- ✅ Плавные переходы — есть

**Вывод:** Дополнительные стили не требуются!

### 4.5.3. Опциональные улучшения (если нужно)

#### Улучшение 1: Более выраженный hover эффект

**Если нужно сделать hover эффект более заметным:**
```css
.ticket-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transform: translateY(-4px);
  border-left-color: #007bff; /* Изменение цвета границы */
}
```

**Рекомендация:** Оставить текущий hover эффект (он уже хороший).

#### Улучшение 2: Активное состояние (при клике)

**Если нужно добавить визуальную обратную связь при клике:**
```css
.ticket-card:active {
  transform: translateY(0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
```

**Рекомендация:** Не обязательно, но может улучшить UX.

### 4.5.4. Итоговый вывод

**Текущие стили полностью соответствуют требованиям:**
- ✅ `cursor: pointer` — визуальная индикация кликабельности
- ✅ Hover эффект — обратная связь при наведении
- ✅ Плавные переходы — улучшение UX

**Действие:** Никаких изменений в стилях не требуется!

---

## Проверка корректности изменений

### 4.6.1. Визуальная проверка кода

#### Чек-лист визуальной проверки

- [ ] Константы `BITRIX24_BASE_URL` и `SERVISDESK_SECTION` добавлены в `constants.js`
- [ ] Функция `getTicketIframeUrl()` создана и экспортирована
- [ ] Импорт `getTicketIframeUrl` добавлен в `TicketCard.vue`
- [ ] Функция `handleCardClick` создана в `setup()`
- [ ] Функция `handleCardClick` добавлена в `return`
- [ ] Обработчик `@click` обновлён в шаблоне
- [ ] Стили проверены (уже есть `cursor: pointer` и hover эффект)

### 4.6.2. Проверка через тестирование

#### Локальное тестирование

**Действие:**
1. Запустить приложение локально
2. Открыть дашборд сектора 1С
3. Кликнуть по карточке тикета

**Ожидаемый результат:**
- Открывается iframe с детальной информацией о тикете
- URL в iframe корректный (проверить в консоли браузера)
- Нет ошибок в консоли

#### Проверка различных сценариев

**Сценарий 1: Клик по карточке (обычный клик)**
- **Действие:** Кликнуть по карточке тикета
- **Ожидаемый результат:** Открывается iframe с детальной информацией

**Сценарий 2: Перетаскивание (drag & drop)**
- **Действие:** Начать перетаскивать карточку
- **Ожидаемый результат:** Клик не срабатывает, перетаскивание работает

**Сценарий 3: BX.helper недоступен**
- **Действие:** Открыть приложение вне Bitrix24 (standalone режим)
- **Ожидаемый результат:** Открывается новая вкладка с URL тикета

**Сценарий 4: Некорректный ticketId**
- **Действие:** Попытаться открыть тикет с некорректным ID
- **Ожидаемый результат:** Ошибка в консоли, iframe не открывается

### 4.6.3. Проверка обратной совместимости

#### Убедиться, что существующий код не сломан

**Проверка событий:**
- Событие `@click` всё ещё эмитится (внутри `handleCardClick`)
- Родительские компоненты могут обработать событие, если нужно
- События `@drag-start` и `@drag-end` работают корректно

**Проверка функциональности:**
- Drag & Drop работает корректно
- Клик не мешает перетаскиванию
- Визуальные эффекты работают

---

## Итоговый план действий для этапа 4

### Чек-лист выполнения

#### 4.1. Создание константы для URL iframe
- [ ] Открыт файл `constants.js`
- [ ] Добавлена константа `BITRIX24_BASE_URL`
- [ ] Добавлена константа `SERVISDESK_SECTION`
- [ ] Проверено использование существующей константы `ENTITY_TYPE_ID`
- [ ] Добавлены JSDoc комментарии к константам

#### 4.2. Создание функции генерации URL iframe
- [ ] Создана функция `getTicketIframeUrl(ticketId)`
- [ ] Добавлена валидация параметра
- [ ] Добавлены JSDoc комментарии с примерами
- [ ] Функция экспортирована
- [ ] Протестирована генерация URL

#### 4.3. Обновление компонента TicketCard для обработки клика
- [ ] Добавлен импорт `getTicketIframeUrl`
- [ ] Создана функция `handleCardClick`
- [ ] Реализована проверка на перетаскивание
- [ ] Реализовано открытие iframe через BX.helper
- [ ] Реализован fallback на window.open()
- [ ] Функция добавлена в `return`

#### 4.4. Обновление обработчика клика в шаблоне
- [ ] Заменён обработчик `@click="$emit('click', ticket)"` на `@click="handleCardClick"`
- [ ] Проверена корректность синтаксиса Vue.js

#### 4.5. Добавление визуальной индикации кликабельности
- [ ] Проверено наличие `cursor: pointer` в стилях
- [ ] Проверено наличие hover эффекта
- [ ] Убедиться, что визуальная индикация работает

#### 4.6. Проверка корректности изменений
- [ ] Визуально проверен код
- [ ] Приложение запускается без ошибок
- [ ] Проверено открытие iframe при клике
- [ ] Проверено, что drag & drop не нарушен
- [ ] Проверена обратная совместимость

### Документирование результатов

#### Создать файл с результатами изменений

**Файл:** `DOCS/TASKS/TASK-023-04-implementation-results.md`

**Содержимое:**
- Список изменённых файлов
- Изменения в каждом файле
- Результаты тестирования
- Известные проблемы (если есть)

---

## Критерии завершения этапа 4

- [ ] Константы `BITRIX24_BASE_URL` и `SERVISDESK_SECTION` созданы
- [ ] Функция `getTicketIframeUrl()` создана и работает корректно
- [ ] Функция `handleCardClick` реализована в компоненте
- [ ] Обработчик клика обновлён в шаблоне
- [ ] Клик по карточке открывает iframe с детальной информацией
- [ ] Перетаскивание (drag & drop) работает корректно
- [ ] Fallback на `window.open()` работает при недоступности BX.helper
- [ ] Визуальная индикация кликабельности присутствует
- [ ] Приложение работает без ошибок
- [ ] Обратная совместимость сохранена

---

## Следующий этап

После завершения этапа 4 переходим к **Этапу 5: Тестирование и проверка** (TASK-023-05)

---

## История правок

- 2025-12-11 11:02 (UTC+3, Брест): Создан документ этапа 4

