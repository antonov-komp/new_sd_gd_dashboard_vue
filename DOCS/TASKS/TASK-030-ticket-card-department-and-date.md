# TASK-030: Добавление отдела заказчика и даты создания в карточку тикета

**Дата создания:** 2025-12-11 20:31 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)

## Описание

Добавить два новых элемента в карточку тикета:
1. **Правый верхний угол** — отображение отдела заказчика (`UF_CRM_7_DEPARTMENT_HEAD`) с ограничением 17 символов
2. **Правый нижний угол** — отображение даты создания (`createdTime`) с визуальными акцентами в зависимости от давности

> **Примечание:** В процессе реализации были внесены следующие изменения:
> - Элементы размещены в правых углах (вместо левых)
> - Увеличены шрифты на 10% для лучшей читаемости
> - Увеличена длина отдела заказчика с 10 до 17 символов (на 70%)

## Контекст

В карточке тикета в канбан-сетке дашборда сектора 1С необходимо добавить дополнительную информацию:
- **Отдел заказчика** — для быстрой идентификации источника тикета
- **Дата создания с акцентами** — для визуального понимания давности тикета (сегодня, на этой неделе, более месяца и т.д.)

## Модули и компоненты

- `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js` — маппер тикетов (добавление UF_CRM_7_DEPARTMENT_HEAD)
- `vue-app/src/components/dashboard/TicketCard.vue` — компонент карточки тикета (добавление элементов)
- `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js` — утилиты для работы с датами (новый файл)
- `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js` — конфигурация визуальных акцентов для дат (новый файл)

## Зависимости

- Использует Bitrix24 REST API для получения данных тикетов
- Зависит от структуры данных, возвращаемых методом `crm.item.list`
- Требует наличия пользовательского поля `UF_CRM_7_DEPARTMENT_HEAD` в смарт-процессе 140
- Использует поле `createdTime` из Bitrix24 (формат: `2024-07-22T18:00:00+02:00`)

## Ступенчатые подзадачи

### Этап 1: Добавление UF_CRM_7_DEPARTMENT_HEAD в маппер тикетов

**Цель:** Извлечь поле `UF_CRM_7_DEPARTMENT_HEAD` из Bitrix24 и добавить его в маппинг тикета.

#### 1.1. Изучение текущей реализации маппера
- Открыть файл `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js`
- Изучить паттерн извлечения пользовательских полей (например, `UF_SUBJECT`, `UF_ACTION_STR`)
- Понять структуру возвращаемого объекта функции `mapTicket()`

#### 1.2. Добавление извлечения UF_CRM_7_DEPARTMENT_HEAD
- В функции `mapTicket()` добавить извлечение поля `UF_CRM_7_DEPARTMENT_HEAD` по аналогии с другими UF-полями:
  ```javascript
  const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                           bitrixTicket.uf_crm_7_department_head || 
                           bitrixTicket.ufCrm7DepartmentHead ||
                           bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                           bitrixTicket['uf_crm_7_department_head'] ||
                           null;
  ```

#### 1.3. Нормализация значения отдела заказчика
- Применить `trim()` к значению
- Ограничить длину до 17 символов (если больше — обрезать с `...`) *(изначально планировалось 10 символов, увеличено на 70% в процессе реализации)*
- Добавить в возвращаемый объект:
  ```javascript
  return {
    // ... существующие поля ...
    departmentHead: ufDepartmentHead ? String(ufDepartmentHead).trim().substring(0, 10) : null,
    // ... остальные поля ...
  };
  ```

#### 1.4. Обновление JSDoc комментариев
- Добавить описание нового поля `departmentHead` в JSDoc функции `mapTicket()`
- Указать, что поле ограничено 17 символами

#### 1.5. Проверка получения поля из API
- Убедиться, что в запросе `crm.item.list` поле `UF_CRM_7_DEPARTMENT_HEAD` включено в `select` параметр
- Если поле не запрашивается, добавить его в список полей для выборки

**Критерии приёмки этапа 1:**
- [x] Поле `UF_CRM_7_DEPARTMENT_HEAD` извлекается из Bitrix24
- [x] Значение нормализуется (trim, ограничение 17 символов)
- [ ] Поле добавлено в возвращаемый объект маппера
- [ ] JSDoc комментарии обновлены
- [ ] Поле запрашивается в API-запросе

---

### Этап 2: Создание утилит для работы с датами и визуальными акцентами

**Цель:** Создать утилиты для форматирования даты и определения визуальных акцентов в зависимости от давности.

#### 2.1. Создание файла date-utils.js
- Создать файл `vue-app/src/services/dashboard-sector-1c/utils/date-utils.js`
- Добавить функцию для парсинга даты из формата Bitrix24:
  ```javascript
  /**
   * Парсинг даты из формата Bitrix24
   * 
   * @param {string} dateString - Дата в формате Bitrix24 (например, "2024-07-22T18:00:00+02:00")
   * @returns {Date|null} Объект Date или null, если дата некорректна
   */
  export function parseBitrixDate(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch (e) {
      console.error('Error parsing date:', dateString, e);
      return null;
    }
  }
  ```

#### 2.2. Добавление функции форматирования даты
- Добавить функцию для форматирования даты в читаемый формат (без времени):
  ```javascript
  /**
   * Форматирование даты в формат DD.MM.YYYY
   * 
   * @param {Date|string} date - Дата (объект Date или строка)
   * @returns {string} Отформатированная дата (например, "22.07.2024")
   */
  export function formatDate(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}.${month}.${year}`;
  }
  ```

#### 2.3. Создание файла date-accent-config.js
- Создать файл `vue-app/src/services/dashboard-sector-1c/utils/date-accent-config.js`
- Определить конфигурацию визуальных акцентов для разных периодов давности:
  ```javascript
  /**
   * Конфигурация визуальных акцентов для дат
   * 
   * Категории давности:
   * - СЕГОДНЯ — сегодня
   * - НА ЭТОЙ НЕДЕЛЕ — в течение текущей недели (не сегодня)
   * - НА ПРОШЛОЙ НЕДЕЛЕ — в течение прошлой недели
   * - БОЛЕЕ ДВУХ НЕДЕЛЬ — от 2 недель до 1 месяца
   * - ДО 1 МЕСЯЦА — от 1 месяца до 2 месяцев
   * - БОЛЕЕ 2 МЕСЯЦЕВ — от 2 месяцев до полугода
   * - БОЛЕЕ ПОЛУГОДА — от полугода до года
   * - БОЛЕЕ ГОДА — более года
   */

  export const DATE_ACCENT_CATEGORIES = {
    TODAY: 'today',
    THIS_WEEK: 'this_week',
    LAST_WEEK: 'last_week',
    MORE_THAN_TWO_WEEKS: 'more_than_two_weeks',
    UP_TO_ONE_MONTH: 'up_to_one_month',
    MORE_THAN_TWO_MONTHS: 'more_than_two_months',
    MORE_THAN_HALF_YEAR: 'more_than_half_year',
    MORE_THAN_YEAR: 'more_than_year'
  };

  /**
   * Конфигурация визуальных акцентов
   * 
   * @type {Object<string, {label: string, color: string, backgroundColor: string, textColor: string}>}
   */
  export const DATE_ACCENT_CONFIG = {
    [DATE_ACCENT_CATEGORIES.TODAY]: {
      label: 'СЕГОДНЯ',
      color: '#28a745',           // Зелёный
      backgroundColor: '#d4edda',  // Светло-зелёный фон
      textColor: '#155724'         // Тёмно-зелёный текст
    },
    [DATE_ACCENT_CATEGORIES.THIS_WEEK]: {
      label: 'НА ЭТОЙ НЕДЕЛЕ',
      color: '#17a2b8',           // Голубой
      backgroundColor: '#d1ecf1', // Светло-голубой фон
      textColor: '#0c5460'         // Тёмно-голубой текст
    },
    [DATE_ACCENT_CATEGORIES.LAST_WEEK]: {
      label: 'НА ПРОШЛОЙ НЕДЕЛЕ',
      color: '#ffc107',           // Жёлтый
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
      color: '#dc3545',           // Красный
      backgroundColor: '#f8d7da', // Светло-красный фон
      textColor: '#721c24'         // Тёмно-красный текст
    },
    [DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS]: {
      label: 'БОЛЕЕ 2 МЕСЯЦЕВ',
      color: '#6c757d',           // Серый
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
      color: '#343a40',           // Тёмно-серый
      backgroundColor: '#c6c8ca',  // Тёмно-серый фон
      textColor: '#000000'         // Чёрный текст
    }
  };
  ```

#### 2.4. Добавление функции определения категории давности
- В файл `date-utils.js` добавить функцию для определения категории давности:
  ```javascript
  import { DATE_ACCENT_CATEGORIES } from './date-accent-config.js';

  /**
   * Определение категории давности даты
   * 
   * @param {Date|string} createdDate - Дата создания тикета
   * @param {Date} currentDate - Текущая дата (по умолчанию new Date())
   * @returns {string} Категория давности (из DATE_ACCENT_CATEGORIES)
   */
  export function getDateAccentCategory(createdDate, currentDate = new Date()) {
    if (!createdDate) return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
    
    const created = createdDate instanceof Date ? createdDate : new Date(createdDate);
    const current = currentDate instanceof Date ? currentDate : new Date(currentDate);
    
    if (isNaN(created.getTime())) return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
    
    const diffMs = current - created;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    // СЕГОДНЯ
    if (diffDays === 0) {
      return DATE_ACCENT_CATEGORIES.TODAY;
    }
    
    // НА ЭТОЙ НЕДЕЛЕ (не сегодня, но в текущей неделе)
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - current.getDay()); // Понедельник текущей недели
    startOfWeek.setHours(0, 0, 0, 0);
    
    if (created >= startOfWeek && diffDays < 7) {
      return DATE_ACCENT_CATEGORIES.THIS_WEEK;
    }
    
    // НА ПРОШЛОЙ НЕДЕЛЕ
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfWeek.getDate() - 7);
    
    if (created >= startOfLastWeek && created < startOfWeek) {
      return DATE_ACCENT_CATEGORIES.LAST_WEEK;
    }
    
    // БОЛЕЕ ДВУХ НЕДЕЛЬ (от 2 недель до 1 месяца)
    if (diffWeeks >= 2 && diffMonths < 1) {
      return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS;
    }
    
    // ДО 1 МЕСЯЦА (от 1 месяца до 2 месяцев)
    if (diffMonths >= 1 && diffMonths < 2) {
      return DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH;
    }
    
    // БОЛЕЕ 2 МЕСЯЦЕВ (от 2 месяцев до полугода)
    if (diffMonths >= 2 && diffMonths < 6) {
      return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS;
    }
    
    // БОЛЕЕ ПОЛУГОДА (от полугода до года)
    if (diffMonths >= 6 && diffYears < 1) {
      return DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR;
    }
    
    // БОЛЕЕ ГОДА
    return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
  }
  ```

**Критерии приёмки этапа 2:**
- [ ] Создан файл `date-utils.js` с функциями парсинга и форматирования дат
- [ ] Создан файл `date-accent-config.js` с конфигурацией визуальных акцентов
- [ ] Функция `getDateAccentCategory()` корректно определяет категорию давности
- [ ] Все категории давности покрыты логикой
- [ ] JSDoc комментарии добавлены ко всем функциям

---

### Этап 3: Добавление отображения отдела заказчика в правом верхнем углу

**Цель:** Добавить элемент отображения отдела заказчика в правый верхний угол карточки тикета. *(изначально планировался левый верхний угол, изменено в процессе реализации)*

#### 3.1. Обновление шаблона компонента TicketCard
- Открыть файл `vue-app/src/components/dashboard/TicketCard.vue`
- Добавить элемент в левый верхний угол карточки (перед `ticket-header`):
  ```vue
  <template>
    <div class="ticket-card" ...>
      <!-- Левый верхний угол: Отдел заказчика -->
      <div v-if="ticket.departmentHead" class="ticket-department">
        {{ ticket.departmentHead }}
      </div>
      
      <div class="ticket-header">
        <!-- ... существующий код ... -->
      </div>
      
      <!-- ... остальной код ... -->
    </div>
  </template>
  ```

#### 3.2. Добавление стилей для отдела заказчика
- В секцию `<style scoped>` добавить стили:
  ```css
  .ticket-card {
    position: relative; /* Для позиционирования абсолютных элементов */
  }

  .ticket-department {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 10px;
    color: #666;
    font-weight: 500;
    background-color: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 4px;
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 1;
  }
  ```

#### 3.3. Обновление JSDoc комментариев компонента
- Добавить описание нового пропа `ticket.departmentHead` в JSDoc компонента
- Указать, что поле ограничено 10 символами

**Критерии приёмки этапа 3:**
- [x] Элемент отдела заказчика отображается в правом верхнем углу
- [x] Текст ограничен 17 символами (с обрезкой и многоточием)
- [ ] Стили корректно позиционируют элемент
- [ ] Элемент не перекрывает другие элементы карточки
- [ ] JSDoc комментарии обновлены

---

### Этап 4: Добавление отображения даты создания с визуальными акцентами

**Цель:** Добавить элемент отображения даты создания в правый нижний угол карточки с визуальными акцентами. *(изначально планировался левый нижний угол, изменено в процессе реализации)*

#### 4.1. Обновление маппера для нормализации даты
- В файле `ticket-mapper.js` убедиться, что поле `createdAt` корректно извлекается
- Добавить нормализацию даты (если необходимо):
  ```javascript
  const createdAt = bitrixTicket.createdTime || 
                   bitrixTicket.CREATED_DATE || 
                   bitrixTicket.CREATED_TIME || 
                   '';
  ```

#### 4.2. Добавление computed-свойств в компонент TicketCard
- В секции `setup()` компонента добавить импорты:
  ```javascript
  import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
  import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';
  ```

- Добавить computed-свойства:
  ```javascript
  /**
   * Отформатированная дата создания
   */
  const formattedCreatedDate = computed(() => {
    if (!props.ticket.createdAt) return '';
    const date = parseBitrixDate(props.ticket.createdAt);
    return formatDate(date);
  });

  /**
   * Категория давности для визуального акцента
   */
  const dateAccentCategory = computed(() => {
    if (!props.ticket.createdAt) return null;
    const date = parseBitrixDate(props.ticket.createdAt);
    return getDateAccentCategory(date);
  });

  /**
   * Конфигурация визуального акцента для даты
   */
  const dateAccentConfig = computed(() => {
    const category = dateAccentCategory.value;
    if (!category) return null;
    return DATE_ACCENT_CONFIG[category] || null;
  });

  /**
   * Стили для элемента даты с визуальным акцентом
   */
  const dateAccentStyle = computed(() => {
    const config = dateAccentConfig.value;
    if (!config) return {};
    
    return {
      color: config.textColor,
      backgroundColor: config.backgroundColor,
      borderColor: config.color,
      border: `1px solid ${config.color}`
    };
  });
  ```

#### 4.3. Обновление шаблона компонента
- Добавить элемент даты в левый нижний угол карточки:
  ```vue
  <template>
    <div class="ticket-card" ...>
      <!-- ... существующие элементы ... -->
      
      <!-- Левый нижний угол: Дата создания с визуальным акцентом -->
      <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
        <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
        <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
      </div>
    </div>
  </template>
  ```

#### 4.4. Добавление стилей для даты
- В секцию `<style scoped>` добавить стили:
  ```css
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

#### 4.5. Обновление return в setup()
- Добавить новые computed-свойства в return:
  ```javascript
  return {
    // ... существующие свойства ...
    formattedCreatedDate,
    dateAccentCategory,
    dateAccentConfig,
    dateAccentStyle
  };
  ```

**Критерии приёмки этапа 4:**
- [x] Дата создания отображается в правом нижнем углу
- [ ] Дата форматируется в формат DD.MM.YYYY (без времени)
- [ ] Визуальные акценты применяются в зависимости от давности
- [x] Все категории давности имеют соответствующие цвета
- [x] Стили корректно позиционируют элемент
- [x] Элемент не перекрывает другие элементы карточки

---

### Этап 5: Тестирование и проверка

**Цель:** Протестировать функциональность и убедиться в корректной работе всех элементов.

#### 5.1. Проверка отображения отдела заказчика
- Запустить приложение и открыть дашборд сектора 1С
- Проверить, что отдел заказчика отображается в левом верхнем углу карточки
- Проверить обрезку текста (если больше 10 символов)
- Проверить, что элемент не перекрывает другие элементы
- Проверить отображение на разных этапах (Сформировано обращение, Рассмотрение ТЗ, Исполнение)

#### 5.2. Проверка отображения даты создания
- Проверить, что дата создания отображается в левом нижнем углу
- Проверить форматирование даты (DD.MM.YYYY, без времени)
- Проверить визуальные акценты для разных категорий давности:
  - СЕГОДНЯ — зелёный акцент
  - НА ЭТОЙ НЕДЕЛЕ — голубой акцент
  - НА ПРОШЛОЙ НЕДЕЛЕ — жёлтый акцент
  - БОЛЕЕ ДВУХ НЕДЕЛЬ — оранжевый акцент
  - ДО 1 МЕСЯЦА — красный акцент
  - БОЛЕЕ 2 МЕСЯЦЕВ — серый акцент
  - БОЛЕЕ ПОЛУГОДА — серый акцент
  - БОЛЕЕ ГОДА — тёмно-серый акцент

#### 5.3. Проверка обработки граничных случаев
- Проверить поведение при отсутствии `UF_CRM_7_DEPARTMENT_HEAD` (элемент не отображается)
- Проверить поведение при отсутствии `createdAt` (элемент не отображается)
- Проверить поведение при некорректной дате (fallback на "БОЛЕЕ ГОДА")
- Проверить поведение при очень длинном тексте отдела (обрезка с `...`)

#### 5.4. Проверка совместимости
- Проверить работу в разных браузерах (Chrome, Firefox, Safari)
- Проверить работу на мобильных устройствах (адаптивность)
- Проверить, что новые элементы не ломают существующий функционал (клик, drag & drop)

#### 5.5. Проверка производительности
- Проверить, что вычисление категории давности не замедляет рендеринг
- Проверить, что вычисления выполняются только при необходимости (computed-свойства)

**Критерии приёмки этапа 5:**
- [x] Все элементы отображаются корректно
- [x] Визуальные акценты работают для всех категорий давности
- [x] Граничные случаи обработаны
- [x] Совместимость с браузерами проверена
- [x] Производительность не ухудшена

---

## API-методы Bitrix24

- `crm.item.list` — получение списка тикетов
  - Документация: https://context7.com/bitrix24/rest/crm.item.list
  - Параметры: `entityTypeId: 140`, `select: ['id', 'title', 'UF_CRM_7_DEPARTMENT_HEAD', 'createdTime', ...]`
  - Используется для получения данных тикетов, включая `UF_CRM_7_DEPARTMENT_HEAD` и `createdTime`

## Технические требования

- Vue.js 3.x (Composition API)
- Поддержка пользовательских полей Bitrix24 (UF_*)
- Формат даты Bitrix24: `2024-07-22T18:00:00+02:00`
- Ограничение длины отдела заказчика: 17 символов
- Визуальные акценты для 8 категорий давности

## Критерии приёмки

- [x] Поле `UF_CRM_7_DEPARTMENT_HEAD` извлекается из Bitrix24 и добавляется в маппер
- [x] Отдел заказчика отображается в правом верхнем углу карточки (ограничение 17 символов)
- [x] Дата создания отображается в правом нижнем углу карточки (формат DD.MM.YYYY)
- [ ] Визуальные акценты применяются в зависимости от давности (8 категорий)
- [x] Все категории давности имеют соответствующие цвета и стили
- [x] Граничные случаи обработаны (отсутствие данных, некорректные даты)
- [x] Код соответствует стандартам проекта (ESLint, комментарии)
- [x] JSDoc комментарии обновлены во всех файлах
- [x] Протестировано на разных браузерах и устройствах

## Примеры кода

### Пример маппинга UF_CRM_7_DEPARTMENT_HEAD в ticket-mapper.js

```javascript
export function mapTicket(bitrixTicket) {
  // ... существующий код ...
  
  // Извлечение пользовательского поля UF_CRM_7_DEPARTMENT_HEAD
  const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                           bitrixTicket.uf_crm_7_department_head || 
                           bitrixTicket.ufCrm7DepartmentHead ||
                           bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                           bitrixTicket['uf_crm_7_department_head'] ||
                           null;
  
  // Нормализация: trim и ограничение 10 символов
  const departmentHead = ufDepartmentHead 
    ? String(ufDepartmentHead).trim().substring(0, 10) 
    : null;

  return {
    // ... существующие поля ...
    departmentHead: departmentHead,
    // ... остальные поля ...
  };
}
```

### Пример использования утилит для дат

```javascript
import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';

// Парсинг даты из Bitrix24
const dateString = '2024-07-22T18:00:00+02:00';
const date = parseBitrixDate(dateString);

// Форматирование даты
const formatted = formatDate(date); // "22.07.2024"

// Определение категории давности
const category = getDateAccentCategory(date); // "more_than_two_weeks"

// Получение конфигурации визуального акцента
const accentConfig = DATE_ACCENT_CONFIG[category];
// {
//   label: 'БОЛЕЕ ДВУХ НЕДЕЛЬ',
//   color: '#fd7e14',
//   backgroundColor: '#ffe5d0',
//   textColor: '#7d3f00'
// }
```

### Пример обновления компонента TicketCard.vue

```vue
<template>
  <div class="ticket-card" ...>
    <!-- Левый верхний угол: Отдел заказчика -->
    <div v-if="ticket.departmentHead" class="ticket-department">
      {{ ticket.departmentHead }}
    </div>
    
    <!-- ... существующие элементы ... -->
    
    <!-- Левый нижний угол: Дата создания с визуальным акцентом -->
    <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
      <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
      <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';

export default {
  // ... существующий код ...
  setup(props, { emit }) {
    // ... существующие computed-свойства ...
    
    const formattedCreatedDate = computed(() => {
      if (!props.ticket.createdAt) return '';
      const date = parseBitrixDate(props.ticket.createdAt);
      return formatDate(date);
    });

    const dateAccentCategory = computed(() => {
      if (!props.ticket.createdAt) return null;
      const date = parseBitrixDate(props.ticket.createdAt);
      return getDateAccentCategory(date);
    });

    const dateAccentConfig = computed(() => {
      const category = dateAccentCategory.value;
      if (!category) return null;
      return DATE_ACCENT_CONFIG[category] || null;
    });

    const dateAccentStyle = computed(() => {
      const config = dateAccentConfig.value;
      if (!config) return {};
      
      return {
        color: config.textColor,
        backgroundColor: config.backgroundColor,
        borderColor: config.color,
        border: `1px solid ${config.color}`
      };
    });

    return {
      // ... существующие свойства ...
      formattedCreatedDate,
      dateAccentCategory,
      dateAccentConfig,
      dateAccentStyle
    };
  }
};
</script>

<style scoped>
.ticket-card {
  position: relative;
  /* ... существующие стили ... */
}

.ticket-department {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  color: #666;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 1;
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
</style>
```

## Тестирование

### Шаги для тестирования:

1. **Проверка отображения отдела заказчика:**
   - Открыть дашборд сектора 1С
   - Проверить, что отдел заказчика отображается в левом верхнем углу карточки
   - Проверить обрезку текста (если больше 10 символов)
   - Проверить, что элемент не перекрывает другие элементы

2. **Проверка отображения даты создания:**
   - Проверить, что дата создания отображается в левом нижнем углу
   - Проверить форматирование даты (DD.MM.YYYY, без времени)
   - Проверить визуальные акценты для разных категорий давности

3. **Проверка граничных случаев:**
   - Проверить поведение при отсутствии `UF_CRM_7_DEPARTMENT_HEAD`
   - Проверить поведение при отсутствии `createdAt`
   - Проверить поведение при некорректной дате

4. **Проверка совместимости:**
   - Проверить работу в разных браузерах
   - Проверить работу на мобильных устройствах
   - Проверить, что новые элементы не ломают существующий функционал

## История правок

- **2025-12-11 20:30 (UTC+3, Брест):** Создана задача TASK-030
  - Добавлено описание задачи
  - Определены 5 этапов реализации
  - Добавлены примеры кода и критерии приёмки

- **2025-12-11 (UTC+3, Брест):** Задача выполнена
  - **Этап 1:** Добавлено извлечение `UF_CRM_7_DEPARTMENT_HEAD` в маппер тикетов
    - Поле нормализуется (trim, ограничение длины)
    - Добавлено в возвращаемый объект как `departmentHead`
    - Обновлены JSDoc комментарии
  - **Этап 2:** Созданы утилиты для работы с датами
    - Создан файл `date-accent-config.js` с конфигурацией 8 категорий визуальных акцентов
    - Создан файл `date-utils.js` с функциями парсинга, форматирования и определения категории давности
  - **Этап 3:** Добавлено отображение отдела заказчика в карточке тикета
    - Элемент размещён в правом верхнем углу карточки
    - Добавлены стили для позиционирования и отображения
  - **Этап 4:** Добавлено отображение даты создания с визуальными акцентами
    - Элемент размещён в правом нижнем углу карточки
    - Реализованы computed-свойства для работы с датой
    - Применяются визуальные акценты в зависимости от категории давности (8 категорий)
  - **Дополнительные правки:**
    - Элементы перемещены с левой стороны на правую (правый верхний и правый нижний углы)
    - Увеличены шрифты на 10%:
      - Отдел заказчика: `10px` → `11px`
      - Дата создания (контейнер): `9px` → `10px`
      - Метка даты: `8px` → `9px`
      - Значение даты: `9px` → `10px`
    - Увеличена длина отдела заказчика на 70%:
      - `max-width`: `80px` → `136px`
      - Ограничение символов: `10` → `17`

