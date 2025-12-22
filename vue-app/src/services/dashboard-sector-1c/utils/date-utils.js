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
 * Относительное форматирование даты
 * 
 * Форматирует дату в относительный формат для недавних дат:
 * - "Сегодня" для текущей даты
 * - "DD.MM.YYYY" для вчерашней даты (метка "ВЧЕРА" отображается отдельно)
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
 * // Вчера (показываем дату, т.к. метка "ВЧЕРА" отображается отдельно)
 * formatDateRelative(new Date('2024-12-11T10:00:00'), new Date('2024-12-12T15:00:00'))
 * // '11.12.2024'
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
  
  // Вчера - показываем дату, т.к. метка "ВЧЕРА" уже отображается сверху
  if (diffDays === 1) {
    return formatDate(dateObj);
  }
  
  // Остальные даты - обычное форматирование
  return formatDate(dateObj);
}

/**
 * Определение категории давности даты
 * 
 * Определяет, к какой категории давности относится дата создания тикета,
 * на основе разницы между текущей датой и датой создания.
 * 
 * **Важно:** Даты нормализуются (время сбрасывается до 00:00:00) перед вычислением
 * разницы, чтобы обеспечить корректное сравнение календарных дней, а не времени.
 * 
 * Категории:
 * - СЕГОДНЯ — дата создания = текущая дата (календарный день)
 * - ВЧЕРА — дата создания = вчерашняя дата (календарный день)
 * - НА ЭТОЙ НЕДЕЛЕ — в течение текущей недели (не сегодня, не вчера)
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
 * // Сегодня (независимо от времени)
 * getDateAccentCategory(new Date('2024-12-11T23:59:00'), new Date('2024-12-12T00:01:00'))
 * // 'this_week' (правильно, т.к. это разные календарные дни)
 * 
 * @example
 * // Сегодня (тот же календарный день)
 * getDateAccentCategory(new Date('2024-12-11T08:00:00'), new Date('2024-12-11T23:59:00'))
 * // 'today' (правильно, т.к. это один календарный день)
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
  
  // Нормализация дат: сброс времени до 00:00:00 для корректного сравнения календарных дней
  const createdNormalized = new Date(
    created.getFullYear(),
    created.getMonth(),
    created.getDate()
  );
  const currentNormalized = new Date(
    current.getFullYear(),
    current.getMonth(),
    current.getDate()
  );
  
  // Вычисление разницы в миллисекундах между нормализованными датами
  const diffMs = currentNormalized - createdNormalized;
  
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
  
  // 2. ВЧЕРА
  if (diffDays === 1) {
    return DATE_ACCENT_CATEGORIES.YESTERDAY;
  }
  
  // 3. НА ЭТОЙ НЕДЕЛЕ (не сегодня, не вчера, но в текущей неделе)
  // Определяем начало текущей недели (понедельник)
  const startOfWeek = new Date(currentNormalized);
  const dayOfWeek = currentNormalized.getDay(); // 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Дней до понедельника
  startOfWeek.setDate(currentNormalized.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);
  
  if (createdNormalized >= startOfWeek && diffDays < 7) {
    return DATE_ACCENT_CATEGORIES.THIS_WEEK;
  }
  
  // 4. НА ПРОШЛОЙ НЕДЕЛЕ
  const startOfLastWeek = new Date(startOfWeek);
  startOfLastWeek.setDate(startOfWeek.getDate() - 7);
  
  if (createdNormalized >= startOfLastWeek && createdNormalized < startOfWeek) {
    return DATE_ACCENT_CATEGORIES.LAST_WEEK;
  }
  
  // 5. БОЛЕЕ ДВУХ НЕДЕЛЬ (от 2 недель до 1 месяца)
  if (diffWeeks >= 2 && diffMonths < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_WEEKS;
  }
  
  // 6. ДО 1 МЕСЯЦА (от 1 месяца до 2 месяцев)
  if (diffMonths >= 1 && diffMonths < 2) {
    return DATE_ACCENT_CATEGORIES.UP_TO_ONE_MONTH;
  }
  
  // 7. БОЛЕЕ 2 МЕСЯЦЕВ (от 2 месяцев до полугода)
  if (diffMonths >= 2 && diffMonths < 6) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_TWO_MONTHS;
  }
  
  // 8. БОЛЕЕ ПОЛУГОДА (от полугода до года)
  if (diffMonths >= 6 && diffYears < 1) {
    return DATE_ACCENT_CATEGORIES.MORE_THAN_HALF_YEAR;
  }
  
  // 9. БОЛЕЕ ГОДА (fallback для всех остальных случаев)
  return DATE_ACCENT_CATEGORIES.MORE_THAN_YEAR;
}

