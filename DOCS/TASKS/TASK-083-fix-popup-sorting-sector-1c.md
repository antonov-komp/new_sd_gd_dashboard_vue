# TASK-083: Исправление сортировки по времени в попапах графика сектора 1С

**Дата создания:** 2026-01-10 17:45 (UTC+3, Брест)
**Статус:** Выполнена
**Приоритет:** Высокий
**Исполнитель:** Frontend Developer (Vue.js)
**Родительская задача:** [TASK-082: Реализация кеширования для Дашборда сектора 1С и Графика состояния](./TASK-082-cache-dashboard-graph-state.md)
**Подзадачи:** 4 подзадачи

---

## 📋 Описание

Исправить некорректную логику сортировки по временным промежуткам в попапах режима "График приема и закрытия сектора 1С" (режим 4 - последняя неделя).

### 🎯 Цели реализации:
1. **Исправить фильтрацию** стикетов по временным периодам в попапах
2. **Восстановить корректность** отображения данных для каждого режима сортировки
3. **Обеспечить консистентность** данных между кешем и отображением
4. **Добавить валидацию** логики фильтрации для предотвращения подобных ошибок

### 📈 Ожидаемые метрики:
- **Корректность сортировки**: 100% соответствие выбранному временному периоду
- **Время отклика**: < 100ms для переключения режимов сортировки
- **Пользовательский опыт**: отсутствие путаницы в отображаемых данных

---

## 🎯 Контекст

### Текущая ситуация:

**Проблема в режиме "График приема и закрытия сектора 1С":**
- ✅ График отображается корректно в режиме 4 (последняя неделя)
- ✅ Цифры на графике кликабельны и открывают попапы
- ❌ **В попапах некорректная сортировка по времени:**
  - Режим "один месяц" - показывает данные за другие периоды
  - Режим "два месяца" - показывает данные за другие периоды
  - Режим "более полугода" - показывает данные за другие периоды
  - Режим "более года" - показывает данные за другие периоды

### Влияние на систему:
- **Пользователь видит некорректные данные** в попапах
- **Нарушается доверие** к аналитической информации
- **Затрудняется принятие решений** на основе искаженных данных
- **Требуется ручная проверка** данных другими способами

### Требуется:
- Анализ текущей логики фильтрации в Vue.js компонентах
- Исправление условий сортировки по временным периодам
- Тестирование всех режимов сортировки
- Валидация консистентности данных

### Предполагаемая причина проблемы:
**Некорректная логика условий фильтрации** в сервисах данных, где:
- Режимы "один месяц" и "два месяца" используют `<=` условие вместо корректного сравнения
- Режимы "более полугода" и "более года" не используют `>` условие для строгого больше
- Возможны проблемы с часовыми поясами и форматами дат
- Отсутствует валидация входных данных

### Связанные компоненты системы:
- **Кеш система** (TASK-082) - данные попапов могут кешироваться
- **Dashboard Sector 1C** - источник данных для графика
- **Graph State Service** - аналогичная логика фильтрации может присутствовать

---

## 🏗️ Модули и компоненты

### Затрагиваемые файлы:

**Vue.js компоненты (vue-app/src/):**

1. **`components/sector-1c/GraphAdmissionClosure.vue`** - основной компонент графика
   ```vue
   <template>
     <div class="graph-admission-closure">
       <!-- График с цифрами и попапами -->
       <div class="graph-container">
         <div
           v-for="item in graphData"
           :key="item.id"
           class="graph-item clickable"
           @click="openPopup(item)"
         >
           {{ item.value }}
         </div>
       </div>

       <!-- Попап с сортировкой -->
       <Popup
         v-if="showPopup"
         :data="popupData"
         :sortMode="currentSortMode"
         @sort-change="handleSortChange"
         @close="closePopup"
       />
     </div>
   </template>
   ```

2. **`components/sector-1c/Popup.vue`** - компонент попапа с сортировкой
   ```vue
   <template>
     <div class="sector-popup">
       <div class="sort-controls">
         <button
           v-for="mode in sortModes"
           :key="mode.key"
           :class="['sort-btn', { active: currentMode === mode.key }]"
           @click="changeSortMode(mode.key)"
         >
           {{ mode.label }}
         </button>
       </div>

       <div class="tickets-container">
         <TicketSticker
           v-for="ticket in filteredTickets"
           :key="ticket.id"
           :ticket="ticket"
         />
       </div>
     </div>
   </template>
   ```

3. **`services/sector-1c/popup-data-service.js`** - сервис для обработки данных попапов
   ```javascript
   class PopupDataService {
     // Методы фильтрации по временным периодам
     static filterByTimePeriod(tickets, period) {
       const now = new Date();
       const periodMap = {
         'one_month': 30,
         'two_months': 60,
         'six_months': 180,
         'one_year': 365
       };

       const days = periodMap[period];
       if (!days) return tickets;

       return tickets.filter(ticket => {
         const ticketDate = new Date(ticket.created_at);
         const diffDays = (now - ticketDate) / (1000 * 60 * 60 * 24);
         return diffDays <= days;
       });
     }
   }
   ```

### Новые/изменяемые файлы:

4. **`utils/time-filters.js`** - утилиты для работы с временными фильтрами
   ```javascript
   /**
    * Константы для временных фильтров
    * Используются для обеспечения консистентности между компонентами
    */
   export const TIME_FILTERS = {
     ONE_MONTH: 'one_month',
     TWO_MONTHS: 'two_months',
     SIX_MONTHS_PLUS: 'six_months_plus',
     ONE_YEAR_PLUS: 'one_year_plus'
   };

   /**
    * Локализованные метки для фильтров
    */
   export const TIME_FILTER_LABELS = {
     [TIME_FILTERS.ONE_MONTH]: 'Один месяц',
     [TIME_FILTERS.TWO_MONTHS]: 'Два месяца',
     [TIME_FILTERS.SIX_MONTHS_PLUS]: 'Более полугода',
     [TIME_FILTERS.ONE_YEAR_PLUS]: 'Более года'
   };

   /**
    * Порядок отображения фильтров (от свежих к старым)
    */
   export const TIME_FILTER_ORDER = [
     TIME_FILTERS.ONE_MONTH,
     TIME_FILTERS.TWO_MONTHS,
     TIME_FILTERS.SIX_MONTHS_PLUS,
     TIME_FILTERS.ONE_YEAR_PLUS
   ];

   /**
    * Конфигурация периодов в днях
    */
   export const TIME_PERIODS_DAYS = {
     [TIME_FILTERS.ONE_MONTH]: 30,
     [TIME_FILTERS.TWO_MONTHS]: 60,
     [TIME_FILTERS.SIX_MONTHS_PLUS]: 180,
     [TIME_FILTERS.ONE_YEAR_PLUS]: 365
   };

   /**
    * Фильтрация тикетов по временному периоду
    * @param {Array} tickets - массив тикетов
    * @param {string} period - ключ периода из TIME_FILTERS
    * @returns {Array} отфильтрованный массив тикетов
    */
   export function filterTicketsByTimePeriod(tickets, period) {
     // Исправленная логика фильтрации
   }

   /**
    * Получение количества тикетов по периодам
    * @param {Array} tickets - массив тикетов
    * @returns {Object} объект с количествами по периодам
    */
   export function getTicketsCountByPeriods(tickets) {
     return TIME_FILTER_ORDER.reduce((acc, period) => {
       acc[period] = filterTicketsByTimePeriod(tickets, period).length;
       return acc;
     }, {});
   }

   /**
    * Валидация корректности фильтрации
    * @param {Array} originalTickets - оригинальный массив
    * @param {Object} filteredResults - результаты фильтрации по периодам
    * @returns {boolean} true если фильтрация корректна
    */
   export function validateTimeFiltering(originalTickets, filteredResults) {
     const totalFiltered = Object.values(filteredResults).reduce((sum, count) => sum + count, 0);
     // Для "более" периодов допускается пересечение, поэтому валидация сложнее
     return totalFiltered >= originalTickets.length * 0.8; // Минимум 80% покрытия
   }
   ```

5. **`utils/date-helpers.js`** - вспомогательные функции для работы с датами
   ```javascript
   /**
    * Безопасное создание даты с валидацией
    * @param {string|Date} dateInput - входная дата
    * @returns {Date|null} валидная дата или null
    */
   export function safeDateParse(dateInput) {
     if (!dateInput) return null;

     try {
       const date = new Date(dateInput);
       return isNaN(date.getTime()) ? null : date;
     } catch (error) {
       console.warn('Invalid date format:', dateInput);
       return null;
     }
   }

   /**
    * Расчет разницы в днях между датами
    * @param {Date} date1 - первая дата
    * @param {Date} date2 - вторая дата
    * @returns {number} разница в днях
    */
   export function getDaysDifference(date1, date2) {
     const msPerDay = 1000 * 60 * 60 * 24;
     return Math.floor((date1 - date2) / msPerDay);
   }

   /**
    * Проверка, является ли дата валидной и не в будущем
    * @param {Date} date - проверяемая дата
    * @returns {boolean} true если дата корректна
    */
   export function isValidPastDate(date) {
     if (!date || isNaN(date.getTime())) return false;
     return date <= new Date();
   }
   ```

6. **`components/common/TicketSticker.vue`** - компонент стикета тикета
   ```vue
   <template>
     <div class="ticket-sticker" :class="statusClass">
       <div class="ticket-header">
         <span class="ticket-id">{{ ticket.id }}</span>
         <span class="ticket-date">{{ formatDate(ticket.created_at) }}</span>
       </div>
       <div class="ticket-content">
         <h4>{{ ticket.title || 'Без названия' }}</h4>
         <p>{{ ticket.description || 'Без описания' }}</p>
         <div class="ticket-meta">
           <span class="status">{{ ticket.status }}</span>
           <span class="priority" :class="priorityClass">{{ ticket.priority }}</span>
         </div>
       </div>
     </div>
   </template>

   <script>
   import { formatDate } from '@/utils/date-helpers';

   export default {
     name: 'TicketSticker',
     props: {
       ticket: {
         type: Object,
         required: true,
         validator(ticket) {
           return ticket.id && ticket.created_at;
         }
       }
     },
     computed: {
       statusClass() {
         return `status-${this.ticket.status?.toLowerCase() || 'unknown'}`;
       },
       priorityClass() {
         return `priority-${this.ticket.priority?.toLowerCase() || 'unknown'}`;
       }
     },
     methods: {
       formatDate(dateString) {
         return formatDate(dateString);
       }
     }
   };
   </script>
   ```

---

## 🔗 Зависимости

### Обязательные зависимости:

| Компонент | Версия | Назначение |
|-----------|--------|------------|
| Vue.js | 3.x | Реактивность и компоненты |
| sector-1c-service | v2.1+ | Сервис данных сектора 1С |
| cache-creation-service | v1.3+ | Кеширование данных |

### Дополнительные зависимости:

- **dashboard-sector-1c** (TASK-082) - для консистентности данных
- **graph-state** (TASK-082) - для унификации подходов к фильтрации

### Риски зависимостей:

1. **Изменения в структуре данных** - могут потребовать адаптации фильтров
2. **Обновление кеширования** - необходимо проверить консистентность после исправлений

---

## 📝 Поэтапные подзадачи

### Этап 1: Анализ проблемы (2 часа)
**Цель:** Понять причину некорректной сортировки

- [ ] Изучить текущую логику фильтрации в `Popup.vue`
- [ ] Проанализировать данные, передаваемые в попап
- [ ] Проверить условия фильтрации по временным периодам
- [ ] Создать тестовые данные для воспроизведения проблемы

### Этап 2: Исправление логики фильтрации (3 часа)
**Цель:** Реализовать корректную сортировку

- [ ] Создать утилиты `utils/time-filters.js` для работы с временем
- [ ] Исправить логику фильтрации в сервисах данных
- [ ] Обновить компонент `Popup.vue` для использования новых фильтров
- [ ] Добавить валидацию входных данных

### Этап 3: Тестирование и отладка (2 часа)
**Цель:** Проверить корректность работы всех режимов

- [ ] Тестирование каждого режима сортировки
- [ ] Проверка граничных условий (пустые данные, некорректные даты)
- [ ] Валидация производительности фильтрации
- [ ] Кросс-браузерное тестирование

### Этап 4: Финализация и документация (1 час)
**Цель:** Подготовить код к релизу

- [ ] Код-ревью исправлений
- [ ] Обновление комментариев и документации
- [ ] Подготовка примеров для тестирования
- [ ] Создание инструкции по проверке

---

## 🔌 API-методы

### Используемые методы:

| Метод | Назначение | Документация |
|-------|------------|--------------|
| `sector-1c/get-popup-data` | Получение данных для попапа | [Внутренняя API](./api-sector-1c.md) |
| `cache/get-sector-1c-data` | Получение кешированных данных | [TASK-082](./TASK-082-cache-dashboard-graph-state.md) |

### Детальные спецификации API:

#### `GET /api/sector-1c/get-popup-data`

**Параметры запроса:**
```javascript
{
  sector_id: "sector_1c",        // ID сектора
  mode: 4,                       // Режим графика (4 = последняя неделя)
  item_id: "graph_item_123",     // ID элемента графика
  include_filters: true          // Включить статистику фильтров
}
```

**Формат ответа:**
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "id": "TICKET-001",
        "title": "Проблема с оборудованием",
        "description": "Не работает принтер в офисе",
        "created_at": "2025-12-15T10:30:00Z",
        "updated_at": "2025-12-16T14:20:00Z",
        "status": "open",
        "priority": "high",
        "assignee": "tech@example.com",
        "tags": ["hardware", "urgent"]
      }
    ],
    "metadata": {
      "total_count": 45,
      "date_range": {
        "from": "2025-11-10T00:00:00Z",
        "to": "2026-01-10T23:59:59Z"
      },
      "filter_stats": {
        "one_month": 15,
        "two_months": 28,
        "six_months_plus": 12,
        "one_year_plus": 5
      }
    },
    "sort_modes": [
      {
        "key": "one_month",
        "label": "Один месяц",
        "count": 15,
        "description": "Тикеты за последние 30 дней"
      },
      {
        "key": "two_months",
        "label": "Два месяца",
        "count": 28,
        "description": "Тикеты за последние 60 дней"
      },
      {
        "key": "six_months_plus",
        "label": "Более полугода",
        "count": 12,
        "description": "Тикеты старше 180 дней"
      },
      {
        "key": "one_year_plus",
        "label": "Более года",
        "count": 5,
        "description": "Тикеты старше 365 дней"
      }
    ]
  },
  "cache": {
    "hit": true,
    "ttl": 580,
    "updated_at": "2026-01-10T16:30:00Z"
  }
}
```

**Обработка ошибок:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_SECTOR_ID",
    "message": "Указанный сектор не найден",
    "details": {
      "provided_id": "invalid_sector",
      "available_sectors": ["sector_1c", "sector_2c"]
    }
  }
}
```

#### `GET /api/cache/get-sector-1c-data`

**Назначение:** Получение предварительно рассчитанной статистики фильтров для оптимизации производительности попапов.

**Ответ:**
```json
{
  "success": true,
  "data": {
    "filter_counts": {
      "one_month": 15,
      "two_months": 28,
      "six_months_plus": 12,
      "one_year_plus": 5
    },
    "last_updated": "2026-01-10T16:30:00Z",
    "cache_ttl": 600
  }
}
```

---

## ⚙️ Технические требования

### Функциональные требования:

1. **Фильтрация по времени:**
   - `one_month`: тикеты созданы не более 30 дней назад (включительно)
   - `two_months`: тикеты созданы не более 60 дней назад (включительно)
   - `six_months_plus`: тикеты созданы более 180 дней назад (строго больше)
   - `one_year_plus`: тикеты созданы более 365 дней назад (строго больше)

2. **Формат дат:**
   - **Входной формат:** ISO 8601 string (`2025-12-15T10:30:00Z`) или Unix timestamp
   - **Внутренняя обработка:** JavaScript Date objects с учетом UTC
   - **Часовой пояс:** Все расчеты в UTC для консистентности
   - **Graceful handling:** Некорректные даты пропускаются с логированием

3. **Структура данных тикета:**
   ```javascript
   {
     id: "TICKET-001",           // string, required
     title: "Название тикета",    // string, optional
     description: "Описание",     // string, optional
     created_at: "2025-12-15T10:30:00Z", // ISO string, required
     updated_at: "2025-12-16T14:20:00Z", // ISO string, optional
     status: "open|closed|pending", // enum, required
     priority: "low|normal|high|urgent", // enum, optional
     assignee: "user@example.com", // string, optional
     tags: ["tag1", "tag2"]       // array, optional
   }
   ```

4. **Edge cases для фильтрации:**
   - **Пустой массив тикетов:** вернуть пустой массив
   - **Некорректный period:** вернуть оригинальный массив с предупреждением
   - **Тикеты без created_at:** пропустить с логированием
   - **Будущие даты:** обработать как некорректные
   - **Одинаковые даты:** корректно включать/исключать по границам

5. **Производительность:**
   - Фильтрация < 50ms для 1000+ тикетов
   - Минимизировать перерендеры Vue компонентов
   - Кешировать результаты фильтрации при возможности
   - Lazy loading для больших наборов данных

### Нефункциональные требования:

1. **Надежность:**
   - Graceful degradation при ошибках данных
   - Валидация входных параметров
   - Логирование ошибок фильтрации

2. **Поддерживаемость:**
   - Читаемые имена переменных
   - Комментарии для сложной логики
   - Модульная структура кода

---

## ✅ Критерии приёмки

### Функциональное тестирование:

- [ ] **Режим "Один месяц":** отображаются только тикеты за последние 30 дней
- [ ] **Режим "Два месяца":** отображаются только тикеты за последние 60 дней
- [ ] **Режим "Более полугода":** отображаются только тикеты старше 180 дней
- [ ] **Режим "Более года":** отображаются только тикеты старше 365 дней
- [ ] **Переключение режимов:** мгновенное обновление без задержек
- [ ] **Пустые результаты:** корректное отображение "Нет данных"

### Техническое тестирование:

- [ ] **Производительность:** фильтрация < 100ms
- [ ] **Память:** отсутствие утечек при переключении режимов
- [ ] **Кросс-браузерность:** работает в Chrome, Firefox, Safari
- [ ] **Мобильные устройства:** корректное отображение на планшетах

### Интеграционное тестирование:

- [ ] **С кешем:** данные консистентны с кешированными данными
- [ ] **С API:** корректная загрузка данных из backend
- [ ] **С другими компонентами:** не влияет на работу графика

---

## 💻 Примеры кода

### 1. Исправленная логика фильтрации:

```javascript
// utils/time-filters.js
import { safeDateParse, getDaysDifference, isValidPastDate } from './date-helpers';

/**
 * Фильтрация тикетов по временному периоду с полной валидацией
 * @param {Array} tickets - массив тикетов для фильтрации
 * @param {string} period - период из TIME_FILTERS
 * @param {Date} referenceDate - опциональная дата отсчета (по умолчанию - сейчас)
 * @returns {Array} отфильтрованный массив тикетов
 */
export function filterTicketsByTimePeriod(tickets, period, referenceDate = new Date()) {
  // Валидация входных параметров
  if (!Array.isArray(tickets)) {
    console.warn('filterTicketsByTimePeriod: tickets must be an array');
    return [];
  }

  if (!TIME_PERIODS_DAYS[period]) {
    console.warn(`filterTicketsByTimePeriod: Unknown period "${period}"`);
    return tickets; // Возвращаем оригинал для обратной совместимости
  }

  const daysThreshold = TIME_PERIODS_DAYS[period];
  const isPlusPeriod = period.includes('_plus');

  return tickets.filter(ticket => {
    try {
      // Валидация обязательных полей
      if (!ticket || !ticket.id || !ticket.created_at) {
        console.warn(`Ticket missing required fields:`, ticket);
        return false;
      }

      // Безопасный парсинг даты
      const ticketDate = safeDateParse(ticket.created_at);
      if (!ticketDate) {
        console.warn(`Invalid date for ticket ${ticket.id}: ${ticket.created_at}`);
        return false;
      }

      // Проверка на корректность даты (не в будущем)
      if (!isValidPastDate(ticketDate)) {
        console.warn(`Future or invalid date for ticket ${ticket.id}: ${ticket.created_at}`);
        return false;
      }

      // Расчет разницы в днях
      const diffInDays = getDaysDifference(referenceDate, ticketDate);

      // Применение логики фильтрации
      if (isPlusPeriod) {
        // Для "более" периодов: строго больше порога
        return diffInDays > daysThreshold;
      } else {
        // Для конкретных периодов: меньше или равно порогу
        return diffInDays <= daysThreshold;
      }

    } catch (error) {
      console.error(`Error filtering ticket ${ticket?.id || 'unknown'}:`, error);
      return false;
    }
  });
}

/**
 * Оптимизированная версия с мемоизацией для повторяющихся фильтраций
 * @param {Array} tickets - массив тикетов
 * @param {string} period - период фильтрации
 * @returns {Array} отфильтрованный массив
 */
export function filterTicketsByTimePeriodMemoized(tickets, period) {
  // Простая мемоизация по хешу массива и периода
  const cacheKey = `${tickets.length}_${period}_${tickets[0]?.created_at || 'empty'}`;

  if (filterTicketsByTimePeriodMemoized.cache?.[cacheKey]) {
    return filterTicketsByTimePeriodMemoized.cache[cacheKey];
  }

  const result = filterTicketsByTimePeriod(tickets, period);

  // Ограничение размера кеша
  if (!filterTicketsByTimePeriodMemoized.cache) {
    filterTicketsByTimePeriodMemoized.cache = {};
  }

  if (Object.keys(filterTicketsByTimePeriodMemoized.cache).length > 10) {
    // Очистка старых записей (простая стратегия)
    const keys = Object.keys(filterTicketsByTimePeriodMemoized.cache);
    delete filterTicketsByTimePeriodMemoized.cache[keys[0]];
  }

  filterTicketsByTimePeriodMemoized.cache[cacheKey] = result;
  return result;
}
```

### 1.1. Альтернативная реализация с группировкой:

```javascript
/**
 * Группировка тикетов по временным периодам (все периоды за один проход)
 * @param {Array} tickets - массив тикетов
 * @returns {Object} объект с массивами тикетов по периодам
 */
export function groupTicketsByTimePeriods(tickets) {
  const now = new Date();
  const groups = {
    [TIME_FILTERS.ONE_MONTH]: [],
    [TIME_FILTERS.TWO_MONTHS]: [],
    [TIME_FILTERS.SIX_MONTHS_PLUS]: [],
    [TIME_FILTERS.ONE_YEAR_PLUS]: []
  };

  tickets.forEach(ticket => {
    const ticketDate = safeDateParse(ticket.created_at);
    if (!ticketDate || !isValidPastDate(ticketDate)) return;

    const diffInDays = getDaysDifference(now, ticketDate);

    // Определение принадлежности к периодам
    if (diffInDays <= 30) {
      groups[TIME_FILTERS.ONE_MONTH].push(ticket);
    }
    if (diffInDays <= 60) {
      groups[TIME_FILTERS.TWO_MONTHS].push(ticket);
    }
    if (diffInDays > 180) {
      groups[TIME_FILTERS.SIX_MONTHS_PLUS].push(ticket);
    }
    if (diffInDays > 365) {
      groups[TIME_FILTERS.ONE_YEAR_PLUS].push(ticket);
    }
  });

  return groups;
}
```

### 2. Обновленный компонент Popup:

```vue
<template>
  <div class="sector-popup">
    <div class="sort-controls">
      <button
        v-for="mode in sortModes"
        :key="mode.key"
        :class="['sort-btn', { active: sortMode === mode.key }]"
        @click="handleSortChange(mode.key)"
      >
        {{ mode.label }}
        <span class="count">({{ mode.count }})</span>
      </button>
    </div>

    <div class="tickets-container">
      <TicketSticker
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        :ticket="ticket"
      />
      <div v-if="filteredTickets.length === 0" class="no-data">
        Нет данных за выбранный период
      </div>
    </div>
  </div>
</template>

<script>
import { filterTicketsByTimePeriod, TIME_FILTER_LABELS } from '@/utils/time-filters';

export default {
  name: 'SectorPopup',
  props: {
    tickets: {
      type: Array,
      required: true
    },
    initialSortMode: {
      type: String,
      default: 'one_month'
    }
  },
  data() {
    return {
      sortMode: this.initialSortMode
    };
  },
  computed: {
    sortModes() {
      return Object.keys(TIME_FILTER_LABELS).map(key => ({
        key,
        label: TIME_FILTER_LABELS[key],
        count: this.getTicketsCount(key)
      }));
    },
    filteredTickets() {
      return filterTicketsByTimePeriod(this.tickets, this.sortMode);
    }
  },
  methods: {
    handleSortChange(newMode) {
      this.sortMode = newMode;
      this.$emit('sort-change', newMode);
    },
    getTicketsCount(mode) {
      return filterTicketsByTimePeriod(this.tickets, mode).length;
    }
  }
};
</script>
```

### 3. Тестовые данные для проверки:

```javascript
// test-data.js
export const testTickets = [
  {
    id: 'TICKET-001',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 дней назад
    status: 'open'
  },
  {
    id: 'TICKET-002',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 дней назад
    status: 'closed'
  },
  {
    id: 'TICKET-003',
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 дней назад
    status: 'open'
  },
  {
    id: 'TICKET-004',
    created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 дней назад
    status: 'closed'
  }
];

// Ожидаемые результаты:
// one_month: TICKET-001 (1)
// two_months: TICKET-001, TICKET-002 (2)
// six_months_plus: TICKET-003, TICKET-004 (2)
// one_year_plus: TICKET-004 (1)
```

---

## 🧪 Тестирование

### Модульное тестирование:

```javascript
// tests/unit/utils/time-filters.test.js
import { filterTicketsByTimePeriod, getTicketsCountByPeriods, validateTimeFiltering } from '@/utils/time-filters';
import { TIME_FILTERS } from '@/utils/time-filters';
import { testTickets, edgeCaseTickets } from '@/test-data';

describe('Time Filters', () => {
  describe('filterTicketsByTimePeriod', () => {
    test('filters tickets for one month', () => {
      const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_MONTH);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('TICKET-001');
    });

    test('filters tickets for two months', () => {
      const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.TWO_MONTHS);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['TICKET-001', 'TICKET-002']);
    });

    test('filters tickets for six months plus', () => {
      const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.SIX_MONTHS_PLUS);
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['TICKET-003', 'TICKET-004']);
    });

    test('filters tickets for one year plus', () => {
      const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_YEAR_PLUS);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('TICKET-004');
    });

    test('handles invalid dates gracefully', () => {
      const result = filterTicketsByTimePeriod(edgeCaseTickets.invalidDate, TIME_FILTERS.ONE_MONTH);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('VALID-TICKET');
    });

    test('handles future dates', () => {
      const result = filterTicketsByTimePeriod(edgeCaseTickets.futureDate, TIME_FILTERS.ONE_MONTH);
      expect(result).toHaveLength(0);
    });

    test('handles empty array', () => {
      const result = filterTicketsByTimePeriod([], TIME_FILTERS.ONE_MONTH);
      expect(result).toHaveLength(0);
    });

    test('handles unknown period', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = filterTicketsByTimePeriod(testTickets, 'unknown_period');
      expect(result).toBe(testTickets); // Возвращает оригинал
      expect(consoleSpy).toHaveBeenCalledWith('filterTicketsByTimePeriod: Unknown period "unknown_period"');
      consoleSpy.mockRestore();
    });

    test('handles tickets without required fields', () => {
      const result = filterTicketsByTimePeriod(edgeCaseTickets.missingFields, TIME_FILTERS.ONE_MONTH);
      expect(result).toHaveLength(0);
    });

    test('custom reference date', () => {
      const pastDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 дней назад
      const result = filterTicketsByTimePeriod(testTickets, TIME_FILTERS.ONE_MONTH, pastDate);
      // Все тикеты будут старше 30 дней относительно даты 100 дней назад
      expect(result).toHaveLength(0);
    });
  });

  describe('getTicketsCountByPeriods', () => {
    test('returns correct counts for all periods', () => {
      const counts = getTicketsCountByPeriods(testTickets);
      expect(counts).toEqual({
        [TIME_FILTERS.ONE_MONTH]: 1,
        [TIME_FILTERS.TWO_MONTHS]: 2,
        [TIME_FILTERS.SIX_MONTHS_PLUS]: 2,
        [TIME_FILTERS.ONE_YEAR_PLUS]: 1
      });
    });
  });

  describe('validateTimeFiltering', () => {
    test('validates correct filtering', () => {
      const counts = getTicketsCountByPeriods(testTickets);
      const isValid = validateTimeFiltering(testTickets, counts);
      expect(isValid).toBe(true);
    });

    test('detects incorrect filtering', () => {
      const invalidCounts = {
        [TIME_FILTERS.ONE_MONTH]: 0,
        [TIME_FILTERS.TWO_MONTHS]: 0,
        [TIME_FILTERS.SIX_MONTHS_PLUS]: 0,
        [TIME_FILTERS.ONE_YEAR_PLUS]: 0
      };
      const isValid = validateTimeFiltering(testTickets, invalidCounts);
      expect(isValid).toBe(false);
    });
  });

  describe('Performance', () => {
    test('filters large dataset within time limit', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `TICKET-${i}`,
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'open'
      }));

      const startTime = performance.now();
      const result = filterTicketsByTimePeriod(largeDataset, TIME_FILTERS.ONE_MONTH);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // < 100ms
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
```

### Интеграционное тестирование компонентов:

```javascript
// tests/integration/components/Popup.integration.test.js
import { mount } from '@vue/test-utils';
import Popup from '@/components/sector-1c/Popup.vue';
import { testTickets } from '@/test-data';

describe('Popup Component Integration', () => {
  let wrapper;

  beforeEach(() => {
    wrapper = mount(Popup, {
      props: {
        tickets: testTickets,
        initialSortMode: 'one_month'
      }
    });
  });

  afterEach(() => {
    wrapper.unmount();
  });

  test('displays correct ticket count for each filter', async () => {
    const filterButtons = wrapper.findAll('.sort-btn');

    // Проверяем количество для каждого фильтра
    const oneMonthButton = filterButtons.find(btn => btn.text().includes('Один месяц'));
    expect(oneMonthButton.text()).toContain('(1)');

    const twoMonthsButton = filterButtons.find(btn => btn.text().includes('Два месяца'));
    expect(twoMonthsButton.text()).toContain('(2)');
  });

  test('changes filter mode on button click', async () => {
    const sixMonthsButton = wrapper.find('.sort-btn').filter(btn =>
      btn.text().includes('Более полугода')
    ).at(0);

    await sixMonthsButton.trigger('click');

    // Проверяем, что отображаются правильные тикеты
    const ticketStickers = wrapper.findAll('.ticket-sticker');
    expect(ticketStickers).toHaveLength(2);
  });

  test('shows no data message when no tickets match filter', async () => {
    // Создаем компонент с тикетами, которые не подходят под фильтр
    const oldTickets = testTickets.map(ticket => ({
      ...ticket,
      created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() // 400 дней назад
    }));

    await wrapper.setProps({ tickets: oldTickets });

    const oneMonthButton = wrapper.find('.sort-btn').filter(btn =>
      btn.text().includes('Один месяц')
    ).at(0);

    await oneMonthButton.trigger('click');

    expect(wrapper.text()).toContain('Нет данных за выбранный период');
  });

  test('emits sort-change event', async () => {
    const twoMonthsButton = wrapper.find('.sort-btn').filter(btn =>
      btn.text().includes('Два месяца')
    ).at(0);

    await twoMonthsButton.trigger('click');

    expect(wrapper.emitted('sort-change')).toBeTruthy();
    expect(wrapper.emitted('sort-change')[0]).toEqual(['two_months']);
  });
});
```

### E2E тестирование:

```javascript
// tests/e2e/popup-sorting.spec.js
describe('Sector 1C Popup Sorting', () => {
  it('should correctly filter tickets by time periods', () => {
    // Переход к графику сектора 1С, режим 4
    cy.visit('/sector-1c/graph?mode=4');

    // Клик на цифру для открытия попапа
    cy.get('.graph-item.clickable').first().click();

    // Проверка режима "Один месяц"
    cy.get('.sort-btn[data-mode="one_month"]').click();
    cy.get('.ticket-sticker').should('have.length', 1);

    // Проверка режима "Более года"
    cy.get('.sort-btn[data-mode="one_year_plus"]').click();
    cy.get('.ticket-sticker').should('have.length', 1);
  });
});
```

### Ручное тестирование:

1. **Подготовка:**
   - Открыть режим "График приема и закрытия сектора 1С"
   - Выбрать режим 4 (последняя неделя)
   - Убедиться, что цифры отображаются

2. **Тестирование сортировки:**
   - Кликнуть на любую цифру для открытия попапа
   - Проверить каждый режим сортировки:
     - "Один месяц" - только свежие тикеты
     - "Два месяца" - тикеты за 2 месяца
     - "Более полугода" - старые тикеты
     - "Более года" - самые старые тикеты

3. **Проверка граничных условий:**
   - Попап с пустыми данными
   - Некорректные даты в данных
   - Большое количество тикетов (>1000)

---

## 📊 Мониторинг и безопасность

### Метрики производительности:

- **Время фильтрации:** < 100ms для переключения режимов
- **Использование памяти:** < 50MB при работе с большими данными
- **CPU нагрузка:** < 5% при фильтрации

### Логирование:

```javascript
// В компоненте Popup
methods: {
  handleSortChange(newMode) {
    console.log(`Popup sorting changed to: ${newMode}`);
    this.sortMode = newMode;

    // Логирование производительности
    const startTime = performance.now();
    const filtered = this.filteredTickets;
    const endTime = performance.now();

    console.log(`Filtering took ${endTime - startTime}ms, results: ${filtered.length}`);
  }
}
```

### Безопасность:

- **Валидация данных:** проверка корректности дат перед фильтрацией
- **XSS защита:** экранирование данных в шаблонах
- **CSRF защита:** использование токенов для API запросов

---

## 🚀 План развертывания

### Этапы развертывания:

**Этап 1: Подготовка**
```bash
# Создание резервной копии
cp vue-app/src/components/sector-1c/Popup.vue vue-app/src/components/sector-1c/Popup.vue.backup
cp vue-app/src/services/sector-1c/popup-data-service.js vue-app/src/services/sector-1c/popup-data-service.js.backup
```

**Этап 2: Развертывание новых файлов**
```bash
# Копирование утилит
scp utils/time-filters.js server:/path/to/vue-app/src/utils/

# Обновление компонентов
scp vue-app/src/components/sector-1c/Popup.vue server:/path/to/vue-app/src/components/sector-1c/
scp vue-app/src/services/sector-1c/popup-data-service.js server:/path/to/vue-app/src/services/sector-1c/
```

**Этап 3: Перезапуск сервисов**
```bash
# Очистка кеша Vue приложений
npm run build
sudo systemctl restart nginx
```

### План отката:

**При обнаружении проблем:**
```bash
# Восстановление оригинальных файлов
cp vue-app/src/components/sector-1c/Popup.vue.backup vue-app/src/components/sector-1c/Popup.vue
cp vue-app/src/services/sector-1c/popup-data-service.js.backup vue-app/src/services/sector-1c/popup-data-service.js

# Удаление новых утилит
rm vue-app/src/utils/time-filters.js

# Пересборка и перезапуск
npm run build
sudo systemctl restart nginx
```

### Критерии успешности развертывания:

- ✅ Все режимы сортировки работают корректно
- ✅ Нет ошибок в консоли браузера
- ✅ Производительность не ухудшилась
- ✅ Мобильная версия работает корректно

---

## ❓ Вопросы и ответы

### Технические вопросы:

**Q: Какое поведение ожидается для тикетов, созданных точно на границе периода?**
A: Для конкретных периодов ("один месяц", "два месяца") - включать тикеты, созданные точно на границе (например, 30 дней назад). Для "более" периодов ("более полугода") - строго больше границы.

**Q: Нужно ли учитывать время создания тикета или только дату?**
A: Учитывать полную дату-время в UTC. Разница рассчитывается в днях с учетом времени.

**Q: Что делать с тикетами без даты создания?**
A: Пропускать такие тикеты с логированием предупреждения. Не включать в результаты фильтрации.

**Q: Как обрабатывать будущие даты в created_at?**
A: Считать некорректными и пропускать с логированием. Тикеты не должны быть созданы в будущем.

**Q: Нужно ли кешировать результаты фильтрации на frontend?**
A: Да, для больших наборов данных (>100 тикетов) реализовать мемоизацию результатов фильтрации.

### Бизнес-вопросы:

**Q: Может ли пользователь видеть тикеты из разных периодов одновременно?**
A: Нет, фильтры должны быть взаимоисключающими - пользователь видит тикеты только одного выбранного периода.

**Q: Нужно ли показывать количество тикетов для каждого периода?**
A: Да, рядом с названием каждого режима сортировки показывать количество тикетов в круглых скобках.

**Q: Что показывать, если в выбранном периоде нет тикетов?**
A: Показывать сообщение "Нет данных за выбранный период" вместо пустого списка.

**Q: Как должен работать фильтр по умолчанию при открытии попапа?**
A: По умолчанию выбирать "Один месяц" - самый свежий и наиболее востребованный период.

### Архитектурные вопросы:

**Q: Где должна выполняться фильтрация - на frontend или backend?**
A: Основная фильтрация на frontend для интерактивности, но backend может предоставлять предварительно рассчитанную статистику по периодам для оптимизации.

**Q: Нужно ли сохранять выбранный режим сортировки между сессиями?**
A: Пока нет, но подготовить архитектуру для возможности добавления этой функциональности в будущем (localStorage).

**Q: Как интегрировать с существующей системой кеширования?**
A: Использовать кеш для получения полных данных, но фильтрацию выполнять на frontend для каждого запроса.

---

## 📊 Мониторинг и безопасность

### Метрики производительности:

- **Время фильтрации:** < 100ms для переключения режимов
- **Использование памяти:** < 50MB при работе с большими данными
- **CPU нагрузка:** < 5% при фильтрации
- **Количество DOM обновлений:** < 10 при переключении фильтров

### Логирование:

```javascript
// В компоненте Popup - логирование пользовательских действий
methods: {
  handleSortChange(newMode) {
    console.log(`[Popup] Sort mode changed: ${this.sortMode} -> ${newMode}`);

    const startTime = performance.now();
    // ... фильтрация
    const endTime = performance.now();

    console.log(`[Popup] Filtering completed in ${(endTime - startTime).toFixed(2)}ms, ${filteredTickets.length} tickets shown`);

    // Отправка метрик в аналитику (если есть)
    if (window.analytics) {
      window.analytics.track('popup_sort_changed', {
        from_mode: this.sortMode,
        to_mode: newMode,
        tickets_count: filteredTickets.length,
        filter_time: endTime - startTime
      });
    }
  }
}

// В утилитах фильтрации - логирование ошибок
export function filterTicketsByTimePeriod(tickets, period) {
  try {
    // ... основная логика

    const invalidTickets = tickets.length - validTickets.length;
    if (invalidTickets > 0) {
      console.warn(`[TimeFilters] Skipped ${invalidTickets} tickets with invalid data`);
    }

    return result;
  } catch (error) {
    console.error(`[TimeFilters] Critical error in filterTicketsByTimePeriod:`, error);
    // Fallback - вернуть пустой массив
    return [];
  }
}
```

### Мониторинг качества данных:

```javascript
// Проверка консистентности данных при загрузке
export function validatePopupData(data) {
  const errors = [];

  if (!data.tickets || !Array.isArray(data.tickets)) {
    errors.push('tickets array is missing or invalid');
  }

  if (!data.metadata?.filter_stats) {
    errors.push('filter statistics are missing');
  }

  // Проверка соответствия количества тикетов статистике
  const actualCounts = getTicketsCountByPeriods(data.tickets);
  const reportedCounts = data.metadata.filter_stats;

  Object.keys(TIME_FILTERS).forEach(period => {
    if (actualCounts[period] !== reportedCounts[period]) {
      errors.push(`Count mismatch for ${period}: actual ${actualCounts[period]}, reported ${reportedCounts[period]}`);
    }
  });

  if (errors.length > 0) {
    console.error('[PopupData] Data validation errors:', errors);
    // Можно отправить в систему мониторинга
  }

  return errors.length === 0;
}
```

### Безопасность:

- **Валидация данных:** проверка корректности дат перед фильтрацией
- **XSS защита:** экранирование данных в шаблонах Vue
- **CSRF защита:** использование токенов для API запросов
- **Rate limiting:** ограничение частоты запросов к API
- **Audit logging:** логирование всех действий пользователя с фильтрами

### Alert'ы для мониторинга:

1. **Производительность:** Alert если время фильтрации > 500ms
2. **Качество данных:** Alert если > 10% тикетов имеют некорректные даты
3. **Использование:** Alert если пользователь часто переключает фильтры (> 50 раз в минуту)
4. **Ошибки:** Alert при > 5 ошибках фильтрации за 5 минут

---

## 🎯 Рекомендации по реализации

### Потенциальные сложности:

1. **Производительность с большими данными:**
   - Для >1000 тикетов рассмотреть виртуализацию списка
   - Использовать Web Workers для тяжелых вычислений
   - Расслоить загрузку данных (pagination в попапах)

2. **Консистентность данных:**
   - Синхронизировать фильтры между frontend и backend
   - Валидировать данные при каждом получении
   - Рассмотреть использование GraphQL для точных запросов

3. **Пользовательский опыт:**
   - Добавить loading states при переключении фильтров
   - Рассмотреть анимации переходов между фильтрами
   - Добавить возможность сброса фильтра к умолчанию

### Оптимизации производительности:

```javascript
// Lazy loading для больших списков
computed: {
  visibleTickets() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredTickets.slice(start, end);
  }
}

// Виртуализация списка
<template>
  <virtual-list
    :data-key="'id'"
    :data-sources="filteredTickets"
    :data-component="TicketSticker"
    :estimate-size="80"
  />
</template>
```

### Расширение функциональности:

```javascript
// Возможность множественного выбора периодов (будущая версия)
computed: {
  multiFilteredTickets() {
    const selectedPeriods = this.selectedPeriods; // ['one_month', 'six_months_plus']
    return this.tickets.filter(ticket => {
      return selectedPeriods.some(period =>
        filterTicketsByTimePeriod([ticket], period).length > 0
      );
    });
  }
}

// Экспорт отфильтрованных данных
methods: {
  exportFilteredTickets() {
    const data = this.filteredTickets.map(ticket => ({
      id: ticket.id,
      title: ticket.title,
      created_at: ticket.created_at,
      status: ticket.status
    }));

    const csv = this.convertToCSV(data);
    this.downloadCSV(csv, `tickets_${this.sortMode}_${new Date().toISOString().split('T')[0]}.csv`);
  }
}
```

### Тестирование производительности:

```javascript
// Бенчмарки для разных размеров данных
const benchmarks = [
  { size: 100, expectedTime: 10 },
  { size: 1000, expectedTime: 50 },
  { size: 10000, expectedTime: 200 }
];

benchmarks.forEach(({ size, expectedTime }) => {
  test(`filters ${size} tickets within ${expectedTime}ms`, () => {
    const largeDataset = generateTickets(size);
    const startTime = performance.now();
    const result = filterTicketsByTimePeriod(largeDataset, TIME_FILTERS.ONE_MONTH);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(expectedTime);
    expect(result.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 Чек-лист для code review

### Код качество:
- [ ] Все функции имеют JSDoc комментарии
- [ ] Используются константы вместо магических чисел
- [ ] Нет дублирования кода в фильтрах
- [ ] Корректная обработка ошибок во всех функциях

### Производительность:
- [ ] Нет лишних перерендеров Vue компонентов
- [ ] Оптимизированы вычисления в computed свойствах
- [ ] Используется мемоизация для повторяющихся операций
- [ ] Проверена работа с большими наборами данных

### Безопасность:
- [ ] Все входные данные валидируются
- [ ] Нет XSS уязвимостей в шаблонах
- [ ] Логирование не раскрывает чувствительные данные
- [ ] Обработка ошибок не ломает пользовательский интерфейс

### Тестирование:
- [ ] Unit тесты для всех функций фильтрации
- [ ] Integration тесты для компонентов
- [ ] E2E тесты для пользовательских сценариев
- [ ] Тесты производительности

### Документация:
- [ ] Обновлен раздел API в документации
- [ ] Добавлены примеры использования новых функций
- [ ] Обновлены типы данных в TypeScript определениях (если есть)
- [ ] Добавлены миграционные инструкции

---

## 📊 История правок

- **2026-01-10 17:45 (UTC+3, Брест):** Создана задача на основе анализа проблемы сортировки в попапах
- **2026-01-10 18:15 (UTC+3, Брест):** Добавлены детальные спецификации компонентов и API
- **2026-01-10 18:45 (UTC+3, Брест):** Расширены разделы тестирования и план развертывания
- **2026-01-10 19:15 (UTC+3, Брест):** Добавлены детальные структуры данных, edge cases и валидация
- **2026-01-10 19:45 (UTC+3, Брест):** Расширены примеры кода с мемоизацией и группировкой
- **2026-01-10 20:15 (UTC+3, Брест):** Добавлены разделы мониторинга, безопасности и Q&A
- **2026-01-10 20:45 (UTC+3, Брест):** Уточнены технические требования и критерии приёмки
- **2026-01-10 21:15 (UTC+3, Брест):** Добавлены рекомендации по реализации, чек-лист code review и оптимизации производительности
- **2026-01-10 21:30 (UTC+3, Брест):** Начата работа над задачей - этап анализа проблемы
- **2026-01-10 22:15 (UTC+3, Брест):** Завершена реализация исправления сортировки по времени в попапах
- **2026-01-10 22:45 (UTC+3, Брест):** Добавлена оптимизация производительности попапов (предзагрузка, кеширование, улучшенные loading состояния)

---

**Автор:** Технический писатель и Аналитик
**Версия документа:** 3.0