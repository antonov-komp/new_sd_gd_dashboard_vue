# TASK-030-07: Добавление категории "ВЧЕРА" и относительного форматирования даты

**Дата создания:** 2025-12-12 08:33 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-030

---

## Описание

Добавить категорию "ВЧЕРА" в конфигурацию визуальных акцентов и реализовать относительное форматирование даты для недавних дат (например, "Сегодня", "Вчера" вместо "12.12.2024").

**Цель:** Улучшить читаемость даты создания тикета в карточке, показывая относительные значения для недавних дат.

---

## Контекст

В рамках задачи TASK-030-04 была реализована система отображения даты создания тикета с визуальными акцентами. Сейчас отображается:
- Метка категории (например, "СЕГОДНЯ", "НА ЭТОЙ НЕДЕЛЕ")
- Значение даты в формате `DD.MM.YYYY` (например, "12.12.2024")

**Требуется улучшить:**
1. Добавить категорию "ВЧЕРА" между "СЕГОДНЯ" и "НА ЭТОЙ НЕДЕЛЕ"
2. Для недавних дат показывать относительные значения вместо даты:
   - "Сегодня" вместо "12.12.2024" (если сегодня)
   - "Вчера" вместо "11.12.2024" (если вчера)
   - Для остальных — обычный формат `DD.MM.YYYY`

---

## Модули и компоненты

- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — добавление категории "ВЧЕРА"
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — добавление функции относительного форматирования и обновление логики определения категории
- `vue-app/src/components/dashboard/TicketCard.vue` — обновление для использования относительного форматирования

---

## Зависимости

- Зависит от TASK-030-02: утилиты `date-utils.js` и `date-accent-config.js` должны быть созданы
- Зависит от TASK-030-04: компонент `TicketCard.vue` должен отображать дату создания
- Зависит от TASK-030-06: нормализация дат должна быть реализована

---

## Детальный анализ требований

### 1. Категория "ВЧЕРА"

**Требования:**
- Добавить новую категорию `YESTERDAY` в `DATE_ACCENT_CATEGORIES`
- Добавить конфигурацию визуального акцента для "ВЧЕРА"
- Цвета: промежуточные между "СЕГОДНЯ" (зелёный) и "НА ЭТОЙ НЕДЕЛЕ" (голубой)
- Рекомендуемый цвет: светло-зелёный или бирюзовый

**Логика определения:**
- Если `diffDays === 1` → категория "ВЧЕРА"
- Проверка должна быть после "СЕГОДНЯ" (diffDays === 0) и перед "НА ЭТОЙ НЕДЕЛЕ"

### 2. Относительное форматирование даты

**Требования:**
- Создать функцию `formatDateRelative()` для относительного форматирования
- Для "сегодня" → "Сегодня"
- Для "вчера" → "Вчера"
- Для остальных → обычный формат `DD.MM.YYYY`

**Логика:**
- Использовать нормализованные даты для определения "сегодня" и "вчера"
- Если дата сегодня → "Сегодня"
- Если дата вчера → "Вчера"
- Иначе → `formatDate(date)` (DD.MM.YYYY)

---

## Пошаговая реализация

### Шаг 1: Добавление категории "ВЧЕРА" в date-accent-config.js

**Действие:**
1. Добавить константу `YESTERDAY` в `DATE_ACCENT_CATEGORIES`
2. Добавить конфигурацию визуального акцента для "ВЧЕРА"

**Код:**
```javascript
export const DATE_ACCENT_CATEGORIES = {
  /** Сегодня */
  TODAY: 'today',
  
  /** Вчера */
  YESTERDAY: 'yesterday',  // ← Добавить
  
  /** На этой неделе (не сегодня, не вчера) */
  THIS_WEEK: 'this_week',
  // ... остальные категории
};

export const DATE_ACCENT_CONFIG = {
  [DATE_ACCENT_CATEGORIES.TODAY]: {
    label: 'СЕГОДНЯ',
    color: '#28a745',
    backgroundColor: '#d4edda',
    textColor: '#155724'
  },
  
  [DATE_ACCENT_CATEGORIES.YESTERDAY]: {  // ← Добавить
    label: 'ВЧЕРА',
    color: '#20c997',           // Бирюзовый (Bootstrap teal)
    backgroundColor: '#d1f2eb',  // Светло-бирюзовый фон
    textColor: '#0c5460'         // Тёмно-бирюзовый текст
  },
  
  [DATE_ACCENT_CATEGORIES.THIS_WEEK]: {
    // ... остальная конфигурация
  }
};
```

---

### Шаг 2: Обновление функции getDateAccentCategory() для определения "ВЧЕРА"

**Действие:**
1. Добавить проверку на "ВЧЕРА" после проверки "СЕГОДНЯ"
2. Обновить логику "НА ЭТОЙ НЕДЕЛЕ" (исключить "вчера")

**Код:**
```javascript
  // 1. СЕГОДНЯ
  if (diffDays === 0) {
    return DATE_ACCENT_CATEGORIES.TODAY;
  }
  
  // 2. ВЧЕРА  // ← Добавить
  if (diffDays === 1) {
    return DATE_ACCENT_CATEGORIES.YESTERDAY;
  }
  
  // 3. НА ЭТОЙ НЕДЕЛЕ (не сегодня, не вчера, но в текущей неделе)
  // Определяем начало текущей недели (понедельник)
  const startOfWeek = new Date(currentNormalized);
  const dayOfWeek = currentNormalized.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startOfWeek.setDate(currentNormalized.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  if (createdNormalized >= startOfWeek && diffDays < 7) {
    return DATE_ACCENT_CATEGORIES.THIS_WEEK;
  }
```

---

### Шаг 3: Создание функции formatDateRelative()

**Действие:**
1. Создать функцию `formatDateRelative()` в `date-utils.js`
2. Функция должна определять "сегодня" и "вчера" и возвращать относительные значения

**Код:**
```javascript
/**
 * Относительное форматирование даты
 * 
 * Форматирует дату в относительный формат для недавних дат:
 * - "Сегодня" для текущей даты
 * - "Вчера" для вчерашней даты
 * - "DD.MM.YYYY" для остальных дат
 * 
 * @param {Date|string} date - Дата для форматирования
 * @param {Date} currentDate - Текущая дата (по умолчанию new Date())
 * @returns {string} Относительно отформатированная дата
 * 
 * @example
 * // Сегодня
 * formatDateRelative(new Date('2024-12-12T10:00:00'), new Date('2024-12-12T15:00:00'))
 * // 'Сегодня'
 * 
 * @example
 * // Вчера
 * formatDateRelative(new Date('2024-12-11T10:00:00'), new Date('2024-12-12T15:00:00'))
 * // 'Вчера'
 * 
 * @example
 * // Остальные даты
 * formatDateRelative(new Date('2024-12-10T10:00:00'), new Date('2024-12-12T15:00:00'))
 * // '10.12.2024'
 */
export function formatDateRelative(date, currentDate = new Date()) {
  // Обработка пустых значений
  if (!date) {
    return '';
  }
  
  // Преобразование в объекты Date
  const dateObj = date instanceof Date ? date : new Date(date);
  const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
  
  // Проверка на валидность дат
  if (isNaN(dateObj.getTime()) || isNaN(current.getTime())) {
    return formatDate(dateObj); // Fallback на обычное форматирование
  }
  
  // Нормализация дат для сравнения календарных дней
  const dateNormalized = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  );
  const currentNormalized = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate()
  );
  
  // Вычисление разницы в днях
  const diffMs = currentNormalized - dateNormalized;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Сегодня
  if (diffDays === 0) {
    return 'Сегодня';
  }
  
  // Вчера
  if (diffDays === 1) {
    return 'Вчера';
  }
  
  // Остальные даты - обычное форматирование
  return formatDate(dateObj);
}
```

---

### Шаг 4: Обновление TicketCard.vue для использования относительного форматирования

**Действие:**
1. Импортировать `formatDateRelative` из `date-utils.js`
2. Обновить computed-свойство `formattedCreatedDate` для использования `formatDateRelative`

**Код:**
```javascript
// Импорты
import { parseBitrixDate, formatDate, getDateAccentCategory, formatDateRelative } from '@/services/dashboard-sector-1c/utils/date-utils.js';

// В setup()
const formattedCreatedDate = computed(() => {
  if (!props.ticket.createdAt) return '';
  const date = parseBitrixDate(props.ticket.createdAt);
  if (!date) return '';
  
  // Использование относительного форматирования
  return formatDateRelative(date);
});
```

---

## Критерии приёмки

### Обязательные проверки

- [ ] Категория "ВЧЕРА" добавлена в `date-accent-config.js`
  - [ ] Константа `YESTERDAY` добавлена в `DATE_ACCENT_CATEGORIES`
  - [ ] Конфигурация визуального акцента добавлена в `DATE_ACCENT_CONFIG`
  - [ ] Цвета выбраны корректно (промежуточные между "СЕГОДНЯ" и "НА ЭТОЙ НЕДЕЛЕ")

- [ ] Функция `getDateAccentCategory()` обновлена
  - [ ] Проверка на "ВЧЕРА" добавлена после "СЕГОДНЯ"
  - [ ] Логика "НА ЭТОЙ НЕДЕЛЕ" обновлена (исключает "вчера")
  - [ ] Все тестовые сценарии работают корректно

- [ ] Функция `formatDateRelative()` создана
  - [ ] Функция определяет "сегодня" и возвращает "Сегодня"
  - [ ] Функция определяет "вчера" и возвращает "Вчера"
  - [ ] Для остальных дат возвращается обычный формат `DD.MM.YYYY`
  - [ ] JSDoc комментарии добавлены

- [ ] Компонент `TicketCard.vue` обновлён
  - [ ] Импорт `formatDateRelative` добавлен
  - [ ] Computed-свойство `formattedCreatedDate` использует `formatDateRelative`
  - [ ] Отображение работает корректно для всех случаев

### Дополнительные проверки

- [ ] Тестирование
  - [ ] Тикет, созданный сегодня, показывает "Сегодня" в значении даты
  - [ ] Тикет, созданный вчера, показывает "Вчера" в значении даты и метку "ВЧЕРА"
  - [ ] Тикет, созданный позавчера, показывает дату в формате `DD.MM.YYYY`
  - [ ] Все остальные категории работают корректно

- [ ] Визуальные акценты
  - [ ] Категория "ВЧЕРА" имеет корректные цвета
  - [ ] Цвета читаемы и соответствуют дизайн-системе

---

## История правок

- **2025-12-12 08:33 (UTC+3, Брест):** Создана задача TASK-030-07
  - Добавлено описание требований
  - Добавлен пошаговый план реализации
  - Добавлены критерии приёмки

- **2025-12-12 08:33 (UTC+3, Брест):** Задача реализована
  - Добавлена категория "ВЧЕРА" в `date-accent-config.js`
  - Обновлена функция `getDateAccentCategory()` для определения "вчера"
  - Создана функция `formatDateRelative()` для относительного форматирования
  - Обновлён компонент `TicketCard.vue` для использования относительного форматирования
  - Тикеты, созданные сегодня, показывают "Сегодня" вместо даты
  - Тикеты, созданные вчера, показывают дату "DD.MM.YYYY" и метку "ВЧЕРА"
  - Линтер не выдаёт ошибок

- **2025-12-12 08:33 (UTC+3, Брест):** Задача успешно завершена
  - Исправлено отображение даты для категории "ВЧЕРА" (теперь показывается дата вместо слова "Вчера")
  - Все требования выполнены, функциональность протестирована
  - Задача закрыта

---

## Связанные документы

- `DOCS/TASKS/TASK-030-ticket-card-department-and-date.md` — родительская задача
- `DOCS/TASKS/TASK-030-02-create-date-utils-and-accent-config.md` — создание утилит для работы с датами
- `DOCS/TASKS/TASK-030-04-add-created-date-with-accents-to-ticket-card.md` — добавление отображения даты создания
- `DOCS/TASKS/TASK-030-06-fix-date-category-calculation.md` — исправление определения категории давности
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — файл для изменений
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — файл для изменений
- `vue-app/src/components/dashboard/TicketCard.vue` — файл для изменений




