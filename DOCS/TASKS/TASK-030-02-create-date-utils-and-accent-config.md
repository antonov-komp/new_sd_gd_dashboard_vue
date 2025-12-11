# TASK-030-02: Создание утилит для работы с датами и визуальными акцентами

**Дата создания:** 2025-12-11 20:40 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-030

## Описание

Создать два новых файла с утилитами для работы с датами:
1. **`date-utils.js`** — функции для парсинга, форматирования дат и определения категории давности
2. **`date-accent-config.js`** — конфигурация визуальных акцентов для 8 категорий давности

## Контекст

В рамках задачи TASK-030 необходимо добавить отображение даты создания тикета с визуальными акцентами в зависимости от давности. Для этого требуется:
1. Парсить дату из формата Bitrix24 (`2024-07-22T18:00:00+02:00`)
2. Форматировать дату в читаемый формат (`DD.MM.YYYY`)
3. Определять категорию давности (сегодня, на этой неделе, более месяца и т.д.)
4. Применять соответствующие визуальные акценты (цвета) для каждой категории

## Модули и компоненты

- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — утилиты для работы с датами (новый файл)
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — конфигурация визуальных акцентов (новый файл)

## Зависимости

- Использует стандартный JavaScript API для работы с датами (`Date`)
- Не требует внешних библиотек
- Формат даты Bitrix24: ISO 8601 с часовым поясом (`2024-07-22T18:00:00+02:00`)

---

## Детальный анализ требований

### 1. Анализ формата даты Bitrix24

#### 1.1. Формат даты в Bitrix24

**Примеры форматов:**
- `2024-07-22T18:00:00+02:00` — полный формат с часовым поясом
- `2024-07-22T18:00:00Z` — формат UTC
- `2024-07-22T18:00:00` — формат без часового пояса

**Особенности:**
- ISO 8601 стандарт
- Может содержать часовой пояс (`+02:00`, `-05:00`, `Z`)
- Может быть без часового пояса (локальное время)

**Проверка в маппере:**
В `ticket-mapper.js` поле `createdAt` извлекается как:
```javascript
const createdAt = bitrixTicket.createdTime || 
                 bitrixTicket.CREATED_DATE || 
                 bitrixTicket.CREATED_TIME || 
                 '';
```

**Вывод:** Нужно обрабатывать все возможные форматы ISO 8601.

#### 1.2. Требования к парсингу

**Требования:**
1. Парсить строку в объект `Date`
2. Обрабатывать некорректные форматы (возвращать `null`)
3. Обрабатывать пустые значения (возвращать `null`)
4. Логировать ошибки для отладки

**Граничные случаи:**
- `null` → `null`
- `undefined` → `null`
- `''` (пустая строка) → `null`
- `'2024-07-22T18:00:00+02:00'` → `Date` объект
- `'invalid-date'` → `null` (с логированием ошибки)

---

### 2. Анализ требований к форматированию

#### 2.1. Формат отображения

**Требуемый формат:** `DD.MM.YYYY`

**Примеры:**
- `2024-07-22T18:00:00+02:00` → `22.07.2024`
- `2024-12-01T10:30:00Z` → `01.12.2024`
- `2024-01-05T00:00:00` → `05.01.2024`

**Особенности:**
- День и месяц всегда двузначные (с ведущим нулём)
- Год четырёхзначный
- Разделитель — точка (`.`)
- **Без времени** (только дата)

#### 2.2. Требования к функции форматирования

**Требования:**
1. Принимать `Date` объект или строку
2. Возвращать пустую строку при некорректных данных
3. Форматировать в `DD.MM.YYYY`
4. Обрабатывать граничные случаи

**Граничные случаи:**
- `null` → `''`
- `undefined` → `''`
- `Date` объект → `'DD.MM.YYYY'`
- Строка (ISO 8601) → `'DD.MM.YYYY'`
- Некорректная дата → `''`

---

### 3. Анализ категорий давности

#### 3.1. Определение категорий

**8 категорий давности:**

1. **СЕГОДНЯ** — дата создания = текущая дата
2. **НА ЭТОЙ НЕДЕЛЕ** — в течение текущей недели (не сегодня)
3. **НА ПРОШЛОЙ НЕДЕЛЕ** — в течение прошлой недели
4. **БОЛЕЕ ДВУХ НЕДЕЛЬ** — от 2 недель до 1 месяца
5. **ДО 1 МЕСЯЦА** — от 1 месяца до 2 месяцев
6. **БОЛЕЕ 2 МЕСЯЦЕВ** — от 2 месяцев до полугода
7. **БОЛЕЕ ПОЛУГОДА** — от полугода до года
8. **БОЛЕЕ ГОДА** — более года

#### 3.2. Логика определения категорий

**Алгоритм:**

```
1. Вычислить разницу между текущей датой и датой создания (в днях, неделях, месяцах, годах)

2. Проверить категории по порядку (от более свежих к более старым):
   
   a) СЕГОДНЯ
      - diffDays === 0
   
   b) НА ЭТОЙ НЕДЕЛЕ
      - created >= startOfWeek (понедельник текущей недели)
      - diffDays < 7
      - diffDays !== 0 (не сегодня)
   
   c) НА ПРОШЛОЙ НЕДЕЛЕ
      - created >= startOfLastWeek (понедельник прошлой недели)
      - created < startOfWeek (до понедельника текущей недели)
   
   d) БОЛЕЕ ДВУХ НЕДЕЛЬ
      - diffWeeks >= 2
      - diffMonths < 1
   
   e) ДО 1 МЕСЯЦА
      - diffMonths >= 1
      - diffMonths < 2
   
   f) БОЛЕЕ 2 МЕСЯЦЕВ
      - diffMonths >= 2
      - diffMonths < 6
   
   g) БОЛЕЕ ПОЛУГОДА
      - diffMonths >= 6
      - diffYears < 1
   
   h) БОЛЕЕ ГОДА
      - diffYears >= 1
      - или fallback для всех остальных случаев
```

**Особенности:**
- Неделя начинается с понедельника (getDay() === 0 для воскресенья)
- Месяц = 30 дней (приблизительно)
- Год = 365 дней (приблизительно)
- Проверка идёт от более свежих к более старым категориям

#### 3.3. Примеры определения категорий

**Пример 1: СЕГОДНЯ**
- Текущая дата: `2024-12-11 15:00:00`
- Дата создания: `2024-12-11 10:00:00`
- Разница: 0 дней
- Категория: `TODAY`

**Пример 2: НА ЭТОЙ НЕДЕЛЕ**
- Текущая дата: `2024-12-11 15:00:00` (среда)
- Дата создания: `2024-12-09 10:00:00` (понедельник)
- Разница: 2 дня
- Категория: `THIS_WEEK`

**Пример 3: НА ПРОШЛОЙ НЕДЕЛЕ**
- Текущая дата: `2024-12-11 15:00:00` (среда)
- Дата создания: `2024-12-04 10:00:00` (среда прошлой недели)
- Разница: 7 дней
- Категория: `LAST_WEEK`

**Пример 4: БОЛЕЕ ДВУХ НЕДЕЛЬ**
- Текущая дата: `2024-12-11`
- Дата создания: `2024-11-25` (16 дней назад)
- Разница: 16 дней (2 недели + 2 дня)
- Категория: `MORE_THAN_TWO_WEEKS`

**Пример 5: БОЛЕЕ ГОДА**
- Текущая дата: `2024-12-11`
- Дата создания: `2023-12-01` (375 дней назад)
- Разница: 375 дней (более года)
- Категория: `MORE_THAN_YEAR`

---

### 4. Анализ визуальных акцентов

#### 4.1. Структура конфигурации акцентов

**Для каждой категории требуется:**
- `label` — текстовая метка (например, "СЕГОДНЯ")
- `color` — цвет границы и акцента
- `backgroundColor` — цвет фона
- `textColor` — цвет текста

**Цветовая схема (от свежих к старым):**
- СЕГОДНЯ — зелёный (свежий, актуальный)
- НА ЭТОЙ НЕДЕЛЕ — голубой (недавний)
- НА ПРОШЛОЙ НЕДЕЛЕ — жёлтый (внимание)
- БОЛЕЕ ДВУХ НЕДЕЛЬ — оранжевый (предупреждение)
- ДО 1 МЕСЯЦА — красный (критично)
- БОЛЕЕ 2 МЕСЯЦЕВ — серый (старый)
- БОЛЕЕ ПОЛУГОДА — тёмно-серый (очень старый)
- БОЛЕЕ ГОДА — чёрный (архивный)

#### 4.2. Выбор цветов

**Принципы:**
1. **Контрастность** — текст должен быть читаемым на фоне
2. **Семантика** — зелёный = свежий, красный = старый/критичный
3. **Доступность** — соответствие WCAG стандартам контрастности
4. **Согласованность** — использование цветов из палитры проекта (если есть)

**Цвета выбраны из Bootstrap цветовой палитры:**
- Зелёный: `#28a745` (success)
- Голубой: `#17a2b8` (info)
- Жёлтый: `#ffc107` (warning)
- Оранжевый: `#fd7e14` (custom)
- Красный: `#dc3545` (danger)
- Серый: `#6c757d` (secondary)
- Тёмно-серый: `#343a40` (dark)

---

## Пошаговая реализация

### Шаг 1: Создание файла date-accent-config.js

#### 1.1. Определение расположения файла

**Путь:** `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js`

**Причина:**
- Файл находится в папке `utils` вместе с другими утилитами
- Следует структуре проекта (аналогично `constants.js`, `ticket-utils.js`)

#### 1.2. Создание структуры файла

**Действие:**
1. Создать новый файл `date-accent-config.js` в папке `vue-app/src/services/dashboard-sector-1c/utils/`
2. Добавить заголовок с описанием:

```javascript
/**
 * Конфигурация визуальных акцентов для дат в карточках тикетов
 * 
 * Определяет категории давности и соответствующие визуальные акценты (цвета)
 * для отображения даты создания тикета в карточке.
 * 
 * Используется в:
 * - TicketCard.vue (отображение даты создания с визуальным акцентом)
 * - date-utils.js (определение категории давности)
 * 
 * @module date-accent-config
 */
```

#### 1.3. Добавление констант категорий

**Действие:**
Добавить объект с константами категорий:

```javascript
/**
 * Константы категорий давности дат
 * 
 * Используются для определения визуального акцента в зависимости от того,
 * насколько давно был создан тикет.
 * 
 * @type {Object<string, string>}
 */
export const DATE_ACCENT_CATEGORIES = {
  /** Сегодня */
  TODAY: 'today',
  
  /** На этой неделе (не сегодня) */
  THIS_WEEK: 'this_week',
  
  /** На прошлой неделе */
  LAST_WEEK: 'last_week',
  
  /** Более двух недель (от 2 недель до 1 месяца) */
  MORE_THAN_TWO_WEEKS: 'more_than_two_weeks',
  
  /** До 1 месяца (от 1 месяца до 2 месяцев) */
  UP_TO_ONE_MONTH: 'up_to_one_month',
  
  /** Более 2 месяцев (от 2 месяцев до полугода) */
  MORE_THAN_TWO_MONTHS: 'more_than_two_months',
  
  /** Более полугода (от полугода до года) */
  MORE_THAN_HALF_YEAR: 'more_than_half_year',
  
  /** Более года */
  MORE_THAN_YEAR: 'more_than_year'
};
```

**Проверка:**
- [ ] Файл создан
- [ ] Заголовок добавлен
- [ ] Константы определены
- [ ] JSDoc комментарии добавлены

---

### Шаг 2: Добавление конфигурации визуальных акцентов

#### 2.1. Структура конфигурации

**Действие:**
Добавить объект с конфигурацией цветов для каждой категории:

```javascript
/**
 * Конфигурация визуальных акцентов для категорий давности
 * 
 * Каждая категория содержит:
 * - label: Текстовая метка для отображения
 * - color: Цвет границы и акцента
 * - backgroundColor: Цвет фона
 * - textColor: Цвет текста
 * 
 * Цвета выбраны из Bootstrap цветовой палитры для согласованности с проектом.
 * 
 * @type {Object<string, {label: string, color: string, backgroundColor: string, textColor: string}>}
 */
export const DATE_ACCENT_CONFIG = {
  [DATE_ACCENT_CATEGORIES.TODAY]: {
    label: 'СЕГОДНЯ',
    color: '#28a745',           // Зелёный (Bootstrap success)
    backgroundColor: '#d4edda',  // Светло-зелёный фон
    textColor: '#155724'         // Тёмно-зелёный текст
  },
  
  [DATE_ACCENT_CATEGORIES.THIS_WEEK]: {
    label: 'НА ЭТОЙ НЕДЕЛЕ',
    color: '#17a2b8',           // Голубой (Bootstrap info)
    backgroundColor: '#d1ecf1', // Светло-голубой фон
    textColor: '#0c5460'         // Тёмно-голубой текст
  },
  
  [DATE_ACCENT_CATEGORIES.LAST_WEEK]: {
    label: 'НА ПРОШЛОЙ НЕДЕЛЕ',
    color: '#ffc107',           // Жёлтый (Bootstrap warning)
    backgroundColor: '#fff3cd',  // Светло-жёлтый фон
    textColor: '#856404'         // Тёмно-жёлтый текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS]: {
    label: 'БОЛЕЕ ДВУХ НЕДЕЛЬ',
    color: '#fd7e14',           // Оранжевый
    backgroundColor: '#ffe5d0',  // Светло-оранжевый фон
    textColor: '#7d3f00'         // Тёмно-оранжевый текст
  },
  
  [DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH]: {
    label: 'ДО 1 МЕСЯЦА',
    color: '#dc3545',           // Красный (Bootstrap danger)
    backgroundColor: '#f8d7da', // Светло-красный фон
    textColor: '#721c24'         // Тёмно-красный текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS]: {
    label: 'БОЛЕЕ 2 МЕСЯЦЕВ',
    color: '#6c757d',           // Серый (Bootstrap secondary)
    backgroundColor: '#e2e3e5',  // Светло-серый фон
    textColor: '#383d41'         // Тёмно-серый текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR]: {
    label: 'БОЛЕЕ ПОЛУГОДА',
    color: '#6c757d',           // Серый
    backgroundColor: '#d6d8db',  // Серый фон
    textColor: '#212529'         // Чёрный текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR]: {
    label: 'БОЛЕЕ ГОДА',
    color: '#343a40',           // Тёмно-серый (Bootstrap dark)
    backgroundColor: '#c6c8ca',  // Тёмно-серый фон
    textColor: '#000000'         // Чёрный текст
  }
};
```

**Проверка:**
- [ ] Конфигурация добавлена
- [ ] Все 8 категорий определены
- [ ] Цвета соответствуют требованиям
- [ ] JSDoc комментарии добавлены

---

### Шаг 3: Создание файла date-utils.js

#### 3.1. Определение расположения файла

**Путь:** `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js`

**Причина:**
- Файл находится в папке `utils` вместе с другими утилитами
- Следует структуре проекта

#### 3.2. Создание структуры файла

**Действие:**
1. Создать новый файл `date-utils.js` в папке `vue-app/src/services/dashboard-sector-1c/utils/`
2. Добавить заголовок с описанием:

```javascript
/**
 * Утилиты для работы с датами в карточках тикетов
 * 
 * Функции для парсинга, форматирования дат и определения категории давности
 * для отображения даты создания тикета с визуальными акцентами.
 * 
 * Используется в:
 * - TicketCard.vue (отображение даты создания)
 * - date-accent-config.js (конфигурация визуальных акцентов)
 * 
 * @module date-utils
 */

import { DATE_ACCENT_CATEGORIES } from './date-accent-config.js';
```

**Проверка:**
- [ ] Файл создан
- [ ] Заголовок добавлен
- [ ] Импорт констант добавлен

---

### Шаг 4: Реализация функции parseBitrixDate()

#### 4.1. Анализ требований

**Требования:**
1. Парсить строку в объект `Date`
2. Обрабатывать все форматы ISO 8601
3. Возвращать `null` при некорректных данных
4. Логировать ошибки для отладки

#### 4.2. Реализация функции

**Действие:**
Добавить функцию парсинга:

```javascript
/**
 * Парсинг даты из формата Bitrix24
 * 
 * Bitrix24 возвращает даты в формате ISO 8601 с часовым поясом:
 * - "2024-07-22T18:00:00+02:00" (с часовым поясом)
 * - "2024-07-22T18:00:00Z" (UTC)
 * - "2024-07-22T18:00:00" (без часового пояса)
 * 
 * @param {string} dateString - Дата в формате Bitrix24 (ISO 8601)
 * @returns {Date|null} Объект Date или null, если дата некорректна
 * 
 * @example
 * parseBitrixDate('2024-07-22T18:00:00+02:00')
 * // Date object: 2024-07-22T16:00:00.000Z (конвертировано в UTC)
 * 
 * @example
 * parseBitrixDate(null)
 * // null
 * 
 * @example
 * parseBitrixDate('invalid-date')
 * // null (с логированием ошибки в консоль)
 */
export function parseBitrixDate(dateString) {
  // Обработка пустых значений
  if (!dateString) {
    return null;
  }
  
  // Приведение к строке (на случай, если передано число или другой тип)
  const dateStr = String(dateString).trim();
  
  // Проверка на пустую строку после trim
  if (dateStr.length === 0) {
    return null;
  }
  
  try {
    // Парсинг даты (JavaScript Date автоматически обрабатывает ISO 8601)
    const date = new Date(dateStr);
    
    // Проверка на валидность даты
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return null;
    }
    
    return date;
  } catch (e) {
    // Обработка исключений при парсинге
    console.error('Error parsing date:', dateString, e);
    return null;
  }
}
```

**Детальное объяснение:**

1. **Проверка на пустые значения:**
   - `null`, `undefined`, `''` → возвращается `null`

2. **Приведение к строке:**
   - `String(dateString).trim()` — обрабатывает все типы данных

3. **Парсинг:**
   - `new Date(dateStr)` — JavaScript автоматически парсит ISO 8601

4. **Валидация:**
   - `isNaN(date.getTime())` — проверка на валидность даты

5. **Обработка ошибок:**
   - `try/catch` — обработка исключений
   - Логирование в консоль для отладки

**Проверка:**
- [ ] Функция добавлена
- [ ] Обработка всех граничных случаев
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 5: Реализация функции formatDate()

#### 5.1. Анализ требований

**Требования:**
1. Форматировать дату в `DD.MM.YYYY`
2. Принимать `Date` объект или строку
3. Возвращать пустую строку при некорректных данных
4. День и месяц всегда двузначные (с ведущим нулём)

#### 5.2. Реализация функции

**Действие:**
Добавить функцию форматирования:

```javascript
/**
 * Форматирование даты в формат DD.MM.YYYY
 * 
 * Форматирует дату в читаемый формат для отображения в карточке тикета.
 * День и месяц всегда двузначные (с ведущим нулём).
 * 
 * @param {Date|string} date - Дата (объект Date или строка ISO 8601)
 * @returns {string} Отформатированная дата в формате DD.MM.YYYY или пустая строка
 * 
 * @example
 * formatDate(new Date('2024-07-22T18:00:00+02:00'))
 * // '22.07.2024'
 * 
 * @example
 * formatDate('2024-12-01T10:30:00Z')
 * // '01.12.2024'
 * 
 * @example
 * formatDate(null)
 * // ''
 * 
 * @example
 * formatDate('invalid-date')
 * // ''
 */
export function formatDate(date) {
  // Обработка пустых значений
  if (!date) {
    return '';
  }
  
  // Преобразование в объект Date
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    // Попытка парсинга строки
    dateObj = new Date(date);
  }
  
  // Проверка на валидность даты
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Извлечение компонентов даты
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // getMonth() возвращает 0-11
  const year = dateObj.getFullYear();
  
  // Форматирование с ведущими нулями
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);
  
  // Возврат отформатированной даты
  return `${dayStr}.${monthStr}.${yearStr}`;
}
```

**Детальное объяснение:**

1. **Обработка пустых значений:**
   - `null`, `undefined` → возвращается `''`

2. **Преобразование в Date:**
   - Если уже `Date` → используется как есть
   - Если строка → парсится через `new Date()`

3. **Валидация:**
   - `isNaN(dateObj.getTime())` → возвращается `''`

4. **Извлечение компонентов:**
   - `getDate()` — день (1-31)
   - `getMonth() + 1` — месяц (1-12, т.к. `getMonth()` возвращает 0-11)
   - `getFullYear()` — год (4 цифры)

5. **Форматирование:**
   - `padStart(2, '0')` — добавляет ведущий ноль для дня и месяца

**Проверка:**
- [ ] Функция добавлена
- [ ] Форматирование корректно (DD.MM.YYYY)
- [ ] Обработка всех граничных случаев
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 6: Реализация функции getDateAccentCategory()

#### 6.1. Анализ логики определения категорий

**Алгоритм определения:**

```
1. Вычислить разницу между текущей датой и датой создания:
   - diffMs (миллисекунды)
   - diffDays (дни)
   - diffWeeks (недели)
   - diffMonths (месяцы, приблизительно 30 дней)
   - diffYears (годы, приблизительно 365 дней)

2. Определить начало текущей недели (понедельник):
   - startOfWeek = текущая дата - current.getDay() дней
   - Установить время на 00:00:00

3. Определить начало прошлой недели:
   - startOfLastWeek = startOfWeek - 7 дней

4. Проверить категории по порядку (от свежих к старым):
   a) СЕГОДНЯ: diffDays === 0
   b) НА ЭТОЙ НЕДЕЛЕ: created >= startOfWeek && diffDays < 7 && diffDays !== 0
   c) НА ПРОШЛОЙ НЕДЕЛЕ: created >= startOfLastWeek && created < startOfWeek
   d) БОЛЕЕ ДВУХ НЕДЕЛЬ: diffWeeks >= 2 && diffMonths < 1
   e) ДО 1 МЕСЯЦА: diffMonths >= 1 && diffMonths < 2
   f) БОЛЕЕ 2 МЕСЯЦЕВ: diffMonths >= 2 && diffMonths < 6
   g) БОЛЕЕ ПОЛУГОДА: diffMonths >= 6 && diffYears < 1
   h) БОЛЕЕ ГОДА: diffYears >= 1 (или fallback)
```

#### 6.2. Реализация функции

**Действие:**
Добавить функцию определения категории:

```javascript
/**
 * Определение категории давности даты
 * 
 * Определяет, к какой категории давности относится дата создания тикета,
 * на основе разницы между текущей датой и датой создания.
 * 
 * Категории:
 * - СЕГОДНЯ — дата создания = текущая дата
 * - НА ЭТОЙ НЕДЕЛЕ — в течение текущей недели (не сегодня)
 * - НА ПРОШЛОЙ НЕДЕЛЕ — в течение прошлой недели
 * - БОЛЕЕ ДВУХ НЕДЕЛЬ — от 2 недель до 1 месяца
 * - ДО 1 МЕСЯЦА — от 1 месяца до 2 месяцев
 * - БОЛЕЕ 2 МЕСЯЦЕВ — от 2 месяцев до полугода
 * - БОЛЕЕ ПОЛУГОДА — от полугода до года
 * - БОЛЕЕ ГОДА — более года
 * 
 * @param {Date|string} createdDate - Дата создания тикета
 * @param {Date} currentDate - Текущая дата (по умолчанию new Date())
 * @returns {string} Категория давности (из DATE_ACCENT_CATEGORIES)
 * 
 * @example
 * // Сегодня
 * getDateAccentCategory(new Date('2024-12-11'), new Date('2024-12-11'))
 * // 'today'
 * 
 * @example
 * // На этой неделе
 * getDateAccentCategory(new Date('2024-12-09'), new Date('2024-12-11'))
 * // 'this_week'
 * 
 * @example
 * // Более года
 * getDateAccentCategory('2023-01-01', new Date('2024-12-11'))
 * // 'more_than_year'
 */
export function getDateAccentCategory(createdDate, currentDate = new Date()) {
  // Обработка пустых значений
  if (!createdDate) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
  }
  
  // Преобразование в объекты Date
  const created = createdDate instanceof Date 
    ? createdDate 
    : new Date(createdDate);
  const current = currentDate instanceof Date 
    ? currentDate 
    : new Date(currentDate);
  
  // Проверка на валидность дат
  if (isNaN(created.getTime()) || isNaN(current.getTime())) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
  }
  
  // Вычисление разницы в миллисекундах
  const diffMs = current - created;
  
  // Проверка на отрицательную разницу (дата создания в будущем)
  if (diffMs < 0) {
    // Если дата создания в будущем, считаем как "сегодня"
    return DATE_ACCENT_CATEGORIES.TODAY;
  }
  
  // Вычисление разницы в днях, неделях, месяцах, годах
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30); // Приблизительно 30 дней в месяце
  const diffYears = Math.floor(diffDays / 365);  // Приблизительно 365 дней в году
  
  // 1. СЕГОДНЯ
  if (diffDays === 0) {
    return DATE_ACCENT_CATEGORIES.TODAY;
  }
  
  // 2. НА ЭТОЙ НЕДЕЛЕ (не сегодня, но в текущей неделе)
  // Определяем начало текущей недели (понедельник)
  const startOfWeek = new Date(current);
  const dayOfWeek = current.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Дней до понедельника
  startOfWeek.setDate(current.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setMinutes(0, 0, 0);
  startOfWeek.setSeconds(0, 0, 0);
  startOfWeek.setMilliseconds(0);
  
  if (created >= startOfWeek && diffDays < 7) {
    return DATE_ACCENT_CATEGORIES.THIS_WEEK;
  }
  
  // 3. НА ПРОШЛОЙ НЕДЕЛЕ
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  
  if (created >= startOfLastWeek && created < startOfWeek) {
    return DATE_ACCENT_CATEGORIES.LAST_WEEK;
  }
  
  // 4. БОЛЕЕ ДВУХ НЕДЕЛЬ (от 2 недель до 1 месяца)
  if (diffWeeks >= 2 && diffMonths < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS;
  }
  
  // 5. ДО 1 МЕСЯЦА (от 1 месяца до 2 месяцев)
  if (diffMonths >= 1 && diffMonths < 2) {
    return DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH;
  }
  
  // 6. БОЛЕЕ 2 МЕСЯЦЕВ (от 2 месяцев до полугода)
  if (diffMonths >= 2 && diffMonths < 6) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS;
  }
  
  // 7. БОЛЕЕ ПОЛУГОДА (от полугода до года)
  if (diffMonths >= 6 && diffYears < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR;
  }
  
  // 8. БОЛЕЕ ГОДА (fallback для всех остальных случаев)
  return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
}
```

**Детальное объяснение:**

1. **Обработка пустых значений:**
   - `null`, `undefined` → возвращается `MORE_THAN_YEAR` (fallback)

2. **Преобразование в Date:**
   - Поддержка как `Date` объектов, так и строк

3. **Валидация:**
   - Проверка на валидность обеих дат
   - Обработка отрицательной разницы (дата в будущем)

4. **Вычисление разницы:**
   - Дни, недели, месяцы, годы (приблизительные значения)

5. **Определение начала недели:**
   - Понедельник = начало недели
   - Обработка воскресенья (`getDay() === 0`)

6. **Проверка категорий:**
   - От более свежих к более старым
   - Каждая категория проверяется по порядку

**Проверка:**
- [ ] Функция добавлена
- [ ] Логика определения категорий корректна
- [ ] Обработка всех граничных случаев
- [ ] JSDoc комментарии добавлены
- [ ] Примеры использования добавлены

---

### Шаг 7: Тестирование утилит

#### 7.1. Тестирование parseBitrixDate()

**Тестовые сценарии:**

1. **Валидная дата с часовым поясом:**
   ```javascript
   parseBitrixDate('2024-07-22T18:00:00+02:00')
   // Ожидается: Date object
   ```

2. **Валидная дата UTC:**
   ```javascript
   parseBitrixDate('2024-07-22T18:00:00Z')
   // Ожидается: Date object
   ```

3. **Валидная дата без часового пояса:**
   ```javascript
   parseBitrixDate('2024-07-22T18:00:00')
   // Ожидается: Date object
   ```

4. **Пустые значения:**
   ```javascript
   parseBitrixDate(null)        // null
   parseBitrixDate(undefined)  // null
   parseBitrixDate('')         // null
   ```

5. **Некорректная дата:**
   ```javascript
   parseBitrixDate('invalid-date')
   // Ожидается: null (с предупреждением в консоль)
   ```

**Проверка:**
- [ ] Все тестовые сценарии проверены
- [ ] Результаты соответствуют ожиданиям

#### 7.2. Тестирование formatDate()

**Тестовые сценарии:**

1. **Date объект:**
   ```javascript
   formatDate(new Date('2024-07-22T18:00:00+02:00'))
   // Ожидается: '22.07.2024'
   ```

2. **Строка ISO 8601:**
   ```javascript
   formatDate('2024-12-01T10:30:00Z')
   // Ожидается: '01.12.2024'
   ```

3. **Дата с ведущими нулями:**
   ```javascript
   formatDate(new Date('2024-01-05T00:00:00'))
   // Ожидается: '05.01.2024'
   ```

4. **Пустые значения:**
   ```javascript
   formatDate(null)        // ''
   formatDate(undefined)  // ''
   ```

5. **Некорректная дата:**
   ```javascript
   formatDate('invalid-date')
   // Ожидается: ''
   ```

**Проверка:**
- [ ] Все тестовые сценарии проверены
- [ ] Форматирование корректно (DD.MM.YYYY)
- [ ] Ведущие нули добавляются

#### 7.3. Тестирование getDateAccentCategory()

**Тестовые сценарии:**

1. **СЕГОДНЯ:**
   ```javascript
   const today = new Date('2024-12-11T15:00:00');
   getDateAccentCategory(today, today)
   // Ожидается: 'today'
   ```

2. **НА ЭТОЙ НЕДЕЛЕ:**
   ```javascript
   const created = new Date('2024-12-09T10:00:00'); // Понедельник
   const current = new Date('2024-12-11T15:00:00'); // Среда
   getDateAccentCategory(created, current)
   // Ожидается: 'this_week'
   ```

3. **НА ПРОШЛОЙ НЕДЕЛЕ:**
   ```javascript
   const created = new Date('2024-12-04T10:00:00'); // Среда прошлой недели
   const current = new Date('2024-12-11T15:00:00'); // Среда текущей недели
   getDateAccentCategory(created, current)
   // Ожидается: 'last_week'
   ```

4. **БОЛЕЕ ДВУХ НЕДЕЛЬ:**
   ```javascript
   const created = new Date('2024-11-25T10:00:00'); // 16 дней назад
   const current = new Date('2024-12-11T15:00:00');
   getDateAccentCategory(created, current)
   // Ожидается: 'more_than_two_weeks'
   ```

5. **БОЛЕЕ ГОДА:**
   ```javascript
   const created = new Date('2023-01-01T10:00:00');
   const current = new Date('2024-12-11T15:00:00');
   getDateAccentCategory(created, current)
   // Ожидается: 'more_than_year'
   ```

6. **Пустые значения:**
   ```javascript
   getDateAccentCategory(null)
   // Ожидается: 'more_than_year'
   ```

7. **Дата в будущем:**
   ```javascript
   const created = new Date('2024-12-20T10:00:00'); // Будущее
   const current = new Date('2024-12-11T15:00:00');
   getDateAccentCategory(created, current)
   // Ожидается: 'today' (обработка отрицательной разницы)
   ```

**Проверка:**
- [ ] Все тестовые сценарии проверены
- [ ] Категории определяются корректно
- [ ] Граничные случаи обработаны

---

## Итоговый код файлов

### Полный код date-accent-config.js

```javascript
/**
 * Конфигурация визуальных акцентов для дат в карточках тикетов
 * 
 * Определяет категории давности и соответствующие визуальные акценты (цвета)
 * для отображения даты создания тикета в карточке.
 * 
 * Используется в:
 * - TicketCard.vue (отображение даты создания с визуальным акцентом)
 * - date-utils.js (определение категории давности)
 * 
 * @module date-accent-config
 */

/**
 * Константы категорий давности дат
 * 
 * Используются для определения визуального акцента в зависимости от того,
 * насколько давно был создан тикет.
 * 
 * @type {Object<string, string>}
 */
export const DATE_ACCENT_CATEGORIES = {
  /** Сегодня */
  TODAY: 'today',
  
  /** На этой неделе (не сегодня) */
  THIS_WEEK: 'this_week',
  
  /** На прошлой неделе */
  LAST_WEEK: 'last_week',
  
  /** Более двух недель (от 2 недель до 1 месяца) */
  MORE_THAN_TWO_WEEKS: 'more_than_two_weeks',
  
  /** До 1 месяца (от 1 месяца до 2 месяцев) */
  UP_TO_ONE_MONTH: 'up_to_one_month',
  
  /** Более 2 месяцев (от 2 месяцев до полугода) */
  MORE_THAN_TWO_MONTHS: 'more_than_two_months',
  
  /** Более полугода (от полугода до года) */
  MORE_THAN_HALF_YEAR: 'more_than_half_year',
  
  /** Более года */
  MORE_THAN_YEAR: 'more_than_year'
};

/**
 * Конфигурация визуальных акцентов для категорий давности
 * 
 * Каждая категория содержит:
 * - label: Текстовая метка для отображения
 * - color: Цвет границы и акцента
 * - backgroundColor: Цвет фона
 * - textColor: Цвет текста
 * 
 * Цвета выбраны из Bootstrap цветовой палитры для согласованности с проектом.
 * 
 * @type {Object<string, {label: string, color: string, backgroundColor: string, textColor: string}>}
 */
export const DATE_ACCENT_CONFIG = {
  [DATE_ACCENT_CATEGORIES.TODAY]: {
    label: 'СЕГОДНЯ',
    color: '#28a745',           // Зелёный (Bootstrap success)
    backgroundColor: '#d4edda',  // Светло-зелёный фон
    textColor: '#155724'         // Тёмно-зелёный текст
  },
  
  [DATE_ACCENT_CATEGORIES.THIS_WEEK]: {
    label: 'НА ЭТОЙ НЕДЕЛЕ',
    color: '#17a2b8',           // Голубой (Bootstrap info)
    backgroundColor: '#d1ecf1', // Светло-голубой фон
    textColor: '#0c5460'         // Тёмно-голубой текст
  },
  
  [DATE_ACCENT_CATEGORIES.LAST_WEEK]: {
    label: 'НА ПРОШЛОЙ НЕДЕЛЕ',
    color: '#ffc107',           // Жёлтый (Bootstrap warning)
    backgroundColor: '#fff3cd',  // Светло-жёлтый фон
    textColor: '#856404'         // Тёмно-жёлтый текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS]: {
    label: 'БОЛЕЕ ДВУХ НЕДЕЛЬ',
    color: '#fd7e14',           // Оранжевый
    backgroundColor: '#ffe5d0',  // Светло-оранжевый фон
    textColor: '#7d3f00'         // Тёмно-оранжевый текст
  },
  
  [DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH]: {
    label: 'ДО 1 МЕСЯЦА',
    color: '#dc3545',           // Красный (Bootstrap danger)
    backgroundColor: '#f8d7da', // Светло-красный фон
    textColor: '#721c24'         // Тёмно-красный текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS]: {
    label: 'БОЛЕЕ 2 МЕСЯЦЕВ',
    color: '#6c757d',           // Серый (Bootstrap secondary)
    backgroundColor: '#e2e3e5',  // Светло-серый фон
    textColor: '#383d41'         // Тёмно-серый текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR]: {
    label: 'БОЛЕЕ ПОЛУГОДА',
    color: '#6c757d',           // Серый
    backgroundColor: '#d6d8db',  // Серый фон
    textColor: '#212529'         // Чёрный текст
  },
  
  [DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR]: {
    label: 'БОЛЕЕ ГОДА',
    color: '#343a40',           // Тёмно-серый (Bootstrap dark)
    backgroundColor: '#c6c8ca',  // Тёмно-серый фон
    textColor: '#000000'         // Чёрный текст
  }
};
```

### Полный код date-utils.js

```javascript
/**
 * Утилиты для работы с датами в карточках тикетов
 * 
 * Функции для парсинга, форматирования дат и определения категории давности
 * для отображения даты создания тикета с визуальными акцентами.
 * 
 * Используется в:
 * - TicketCard.vue (отображение даты создания)
 * - date-accent-config.js (конфигурация визуальных акцентов)
 * 
 * @module date-utils
 */

import { DATE_ACCENT_CATEGORIES } from './date-accent-config.js';

/**
 * Парсинг даты из формата Bitrix24
 * 
 * Bitrix24 возвращает даты в формате ISO 8601 с часовым поясом:
 * - "2024-07-22T18:00:00+02:00" (с часовым поясом)
 * - "2024-07-22T18:00:00Z" (UTC)
 * - "2024-07-22T18:00:00" (без часового пояса)
 * 
 * @param {string} dateString - Дата в формате Bitrix24 (ISO 8601)
 * @returns {Date|null} Объект Date или null, если дата некорректна
 * 
 * @example
 * parseBitrixDate('2024-07-22T18:00:00+02:00')
 * // Date object: 2024-07-22T16:00:00.000Z (конвертировано в UTC)
 * 
 * @example
 * parseBitrixDate(null)
 * // null
 * 
 * @example
 * parseBitrixDate('invalid-date')
 * // null (с логированием ошибки в консоль)
 */
export function parseBitrixDate(dateString) {
  // Обработка пустых значений
  if (!dateString) {
    return null;
  }
  
  // Приведение к строке (на случай, если передано число или другой тип)
  const dateStr = String(dateString).trim();
  
  // Проверка на пустую строку после trim
  if (dateStr.length === 0) {
    return null;
  }
  
  try {
    // Парсинг даты (JavaScript Date автоматически обрабатывает ISO 8601)
    const date = new Date(dateStr);
    
    // Проверка на валидность даты
    if (isNaN(date.getTime())) {
      console.warn('Invalid date format:', dateString);
      return null;
    }
    
    return date;
  } catch (e) {
    // Обработка исключений при парсинге
    console.error('Error parsing date:', dateString, e);
    return null;
  }
}

/**
 * Форматирование даты в формат DD.MM.YYYY
 * 
 * Форматирует дату в читаемый формат для отображения в карточке тикета.
 * День и месяц всегда двузначные (с ведущим нулём).
 * 
 * @param {Date|string} date - Дата (объект Date или строка ISO 8601)
 * @returns {string} Отформатированная дата в формате DD.MM.YYYY или пустая строка
 * 
 * @example
 * formatDate(new Date('2024-07-22T18:00:00+02:00'))
 * // '22.07.2024'
 * 
 * @example
 * formatDate('2024-12-01T10:30:00Z')
 * // '01.12.2024'
 * 
 * @example
 * formatDate(null)
 * // ''
 * 
 * @example
 * formatDate('invalid-date')
 * // ''
 */
export function formatDate(date) {
  // Обработка пустых значений
  if (!date) {
    return '';
  }
  
  // Преобразование в объект Date
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    // Попытка парсинга строки
    dateObj = new Date(date);
  }
  
  // Проверка на валидность даты
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Извлечение компонентов даты
  const day = dateObj.getDate();
  const month = dateObj.getMonth() + 1; // getMonth() возвращает 0-11
  const year = dateObj.getFullYear();
  
  // Форматирование с ведущими нулями
  const dayStr = String(day).padStart(2, '0');
  const monthStr = String(month).padStart(2, '0');
  const yearStr = String(year);
  
  // Возврат отформатированной даты
  return `${dayStr}.${monthStr}.${yearStr}`;
}

/**
 * Определение категории давности даты
 * 
 * Определяет, к какой категории давности относится дата создания тикета,
 * на основе разницы между текущей датой и датой создания.
 * 
 * Категории:
 * - СЕГОДНЯ — дата создания = текущая дата
 * - НА ЭТОЙ НЕДЕЛЕ — в течение текущей недели (не сегодня)
 * - НА ПРОШЛОЙ НЕДЕЛЕ — в течение прошлой недели
 * - БОЛЕЕ ДВУХ НЕДЕЛЬ — от 2 недель до 1 месяца
 * - ДО 1 МЕСЯЦА — от 1 месяца до 2 месяцев
 * - БОЛЕЕ 2 МЕСЯЦЕВ — от 2 месяцев до полугода
 * - БОЛЕЕ ПОЛУГОДА — от полугода до года
 * - БОЛЕЕ ГОДА — более года
 * 
 * @param {Date|string} createdDate - Дата создания тикета
 * @param {Date} currentDate - Текущая дата (по умолчанию new Date())
 * @returns {string} Категория давности (из DATE_ACCENT_CATEGORIES)
 * 
 * @example
 * // Сегодня
 * getDateAccentCategory(new Date('2024-12-11'), new Date('2024-12-11'))
 * // 'today'
 * 
 * @example
 * // На этой неделе
 * getDateAccentCategory(new Date('2024-12-09'), new Date('2024-12-11'))
 * // 'this_week'
 * 
 * @example
 * // Более года
 * getDateAccentCategory('2023-01-01', new Date('2024-12-11'))
 * // 'more_than_year'
 */
export function getDateAccentCategory(createdDate, currentDate = new Date()) {
  // Обработка пустых значений
  if (!createdDate) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
  }
  
  // Преобразование в объекты Date
  const created = createdDate instanceof Date 
    ? createdDate 
    : new Date(createdDate);
  const current = currentDate instanceof Date 
    ? currentDate 
    : new Date(currentDate);
  
  // Проверка на валидность дат
  if (isNaN(created.getTime()) || isNaN(current.getTime())) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
  }
  
  // Вычисление разницы в миллисекундах
  const diffMs = current - created;
  
  // Проверка на отрицательную разницу (дата создания в будущем)
  if (diffMs < 0) {
    // Если дата создания в будущем, считаем как "сегодня"
    return DATE_ACCENT_CATEGORIES.TODAY;
  }
  
  // Вычисление разницы в днях, неделях, месяцах, годах
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30); // Приблизительно 30 дней в месяце
  const diffYears = Math.floor(diffDays / 365);  // Приблизительно 365 дней в году
  
  // 1. СЕГОДНЯ
  if (diffDays === 0) {
    return DATE_ACCENT_CATEGORIES.TODAY;
  }
  
  // 2. НА ЭТОЙ НЕДЕЛЕ (не сегодня, но в текущей неделе)
  // Определяем начало текущей недели (понедельник)
  const startOfWeek = new Date(current);
  const dayOfWeek = current.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Дней до понедельника
  startOfWeek.setDate(current.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setMinutes(0, 0, 0);
  startOfWeek.setSeconds(0, 0, 0);
  startOfWeek.setMilliseconds(0);
  
  if (created >= startOfWeek && diffDays < 7) {
    return DATE_ACCENT_CATEGORIES.THIS_WEEK;
  }
  
  // 3. НА ПРОШЛОЙ НЕДЕЛЕ
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  
  if (created >= startOfLastWeek && created < startOfWeek) {
    return DATE_ACCENT_CATEGORIES.LAST_WEEK;
  }
  
  // 4. БОЛЕЕ ДВУХ НЕДЕЛЬ (от 2 недель до 1 месяца)
  if (diffWeeks >= 2 && diffMonths < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS;
  }
  
  // 5. ДО 1 МЕСЯЦА (от 1 месяца до 2 месяцев)
  if (diffMonths >= 1 && diffMonths < 2) {
    return DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH;
  }
  
  // 6. БОЛЕЕ 2 МЕСЯЦЕВ (от 2 месяцев до полугода)
  if (diffMonths >= 2 && diffMonths < 6) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS;
  }
  
  // 7. БОЛЕЕ ПОЛУГОДА (от полугода до года)
  if (diffMonths >= 6 && diffYears < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR;
  }
  
  // 8. БОЛЕЕ ГОДА (fallback для всех остальных случаев)
  return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
}
```

---

## Критерии приёмки

### Обязательные проверки

- [ ] Файл `date-accent-config.js` создан
  - [ ] Константы `DATE_ACCENT_CATEGORIES` определены (8 категорий)
  - [ ] Конфигурация `DATE_ACCENT_CONFIG` определена (8 категорий с цветами)
  - [ ] JSDoc комментарии добавлены

- [ ] Файл `date-utils.js` создан
  - [ ] Функция `parseBitrixDate()` реализована
  - [ ] Функция `formatDate()` реализована
  - [ ] Функция `getDateAccentCategory()` реализована
  - [ ] Импорт констант из `date-accent-config.js` добавлен
  - [ ] JSDoc комментарии добавлены

- [ ] Функция `parseBitrixDate()` работает корректно
  - [ ] Парсит валидные даты ISO 8601
  - [ ] Возвращает `null` для пустых значений
  - [ ] Логирует ошибки для некорректных дат

- [ ] Функция `formatDate()` работает корректно
  - [ ] Форматирует в `DD.MM.YYYY`
  - [ ] Добавляет ведущие нули
  - [ ] Возвращает пустую строку для некорректных данных

- [ ] Функция `getDateAccentCategory()` работает корректно
  - [ ] Определяет все 8 категорий давности
  - [ ] Обрабатывает граничные случаи (пустые значения, даты в будущем)
  - [ ] Корректно вычисляет начало недели (понедельник)

### Дополнительные проверки

- [ ] Код соответствует стандартам проекта
  - [ ] ESLint не выдаёт ошибок
  - [ ] Форматирование соответствует остальному коду
  - [ ] Комментарии добавлены где необходимо

- [ ] Производительность
  - [ ] Функции выполняются быстро (нет задержек)
  - [ ] Нет лишних вычислений

- [ ] Тестирование
  - [ ] Все тестовые сценарии проверены
  - [ ] Граничные случаи обработаны

---

## История правок

- **2025-12-11 20:40 (UTC+3, Брест):** Создана задача TASK-030-02
  - Добавлено детальное описание этапа
  - Добавлен анализ требований и форматов дат
  - Добавлены пошаговые инструкции с примерами кода
  - Добавлены критерии приёмки и примеры тестирования
  - Добавлен полный код обоих файлов

---

## Связанные документы

- `DOCS/TASKS/TASK-030-ticket-card-department-and-date.md` — родительская задача
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — файл для создания
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — файл для создания
- `vue-app/src/services/dashboard-sector-1c/utils/constants.js` — пример структуры утилит

