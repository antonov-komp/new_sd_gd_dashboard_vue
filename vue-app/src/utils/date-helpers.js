/**
 * Вспомогательные функции для работы с датами
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 *
 * @module date-helpers
 */

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

/**
 * Форматирование даты в читаемый формат
 * @param {Date|string} date - дата для форматирования
 * @returns {string} отформатированная дата
 */
export function formatDate(date) {
  const dateObj = safeDateParse(date);
  if (!dateObj) return '';

  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();

  return `${day}.${month}.${year}`;
}