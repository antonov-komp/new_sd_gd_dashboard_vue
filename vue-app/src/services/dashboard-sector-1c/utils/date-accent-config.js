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
  
  /** Вчера */
  YESTERDAY: 'yesterday',
  
  /** На этой неделе (не сегодня, не вчера) */
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
  
  [DATE_ACCENT_CATEGORIES.YESTERDAY]: {
    label: 'ВЧЕРА',
    color: '#20c997',           // Бирюзовый (Bootstrap teal)
    backgroundColor: '#d1f2eb',  // Светло-бирюзовый фон
    textColor: '#0c5460'         // Тёмно-бирюзовый текст
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

