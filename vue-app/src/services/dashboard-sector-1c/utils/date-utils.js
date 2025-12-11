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

