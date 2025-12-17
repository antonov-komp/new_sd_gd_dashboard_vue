/**
 * Утилиты для обработки данных модуля «Трудозатраты на Тикеты сектора 1С»
 */

/**
 * Форматирование времени (часы → "X.X ч")
 * 
 * @param {number} hours - Количество часов
 * @param {number} decimals - Количество знаков после запятой (default: 1)
 * @returns {string} Отформатированная строка
 */
export function formatElapsedTime(hours, decimals = 1) {
  if (typeof hours !== 'number' || isNaN(hours)) {
    return '0 ч';
  }
  
  return `${hours.toFixed(decimals)} ч`;
}

/**
 * Получение метки недели
 * 
 * @param {number} weekNumber - Номер недели
 * @param {string} weekStartUtc - Начало недели (ISO-8601, UTC)
 * @returns {string} Метка недели (например, "Неделя 48 (24.11 - 30.11)")
 */
export function getWeekLabel(weekNumber, weekStartUtc) {
  if (!weekNumber || !weekStartUtc) {
    return `Неделя ${weekNumber || '?'}`;
  }
  
  try {
    const startDate = new Date(weekStartUtc);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const startStr = startDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    const endStr = endDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
    
    return `Неделя ${weekNumber} (${startStr} - ${endStr})`;
  } catch (error) {
    console.error('[TimeTrackingUtils] Error formatting week label:', error);
    return `Неделя ${weekNumber}`;
  }
}

/**
 * Расчёт summary-метрик
 * 
 * @param {Object} data - Данные о трудозатратах
 * @param {number} data.totalElapsedTime - Общая сумма трудозатрат
 * @param {number} data.sector1CEmployeesCount - Количество сотрудников
 * @returns {Object} Summary-метрики
 */
export function calculateSummary(data) {
  const {
    totalElapsedTime = 0,
    sector1CEmployeesCount = 0
  } = data;
  
  const averagePerEmployee = sector1CEmployeesCount > 0
    ? totalElapsedTime / sector1CEmployeesCount
    : 0;
  
  return {
    totalElapsedTime: round(totalElapsedTime, 2),
    employeesCount: sector1CEmployeesCount,
    averagePerEmployee: round(averagePerEmployee, 2)
  };
}

/**
 * Округление числа
 * 
 * @param {number} value - Значение
 * @param {number} decimals - Количество знаков после запятой
 * @returns {number} Округлённое значение
 */
export function round(value, decimals = 2) {
  if (typeof value !== 'number' || isNaN(value)) {
    return 0;
  }
  
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Получение данных сотрудника по неделе
 * 
 * @param {Array} weeks - Массив недель
 * @param {number} weekNumber - Номер недели
 * @param {number} employeeId - ID сотрудника
 * @returns {Object|null} Данные сотрудника за неделю или null
 */
export function getEmployeeWeekData(weeks, weekNumber, employeeId) {
  const week = weeks.find(w => w.weekNumber === weekNumber);
  if (!week || !week.employees) {
    return null;
  }
  
  return week.employees.find(emp => emp.id === employeeId) || null;
}

/**
 * Получение общей суммы трудозатрат сотрудника за период
 * 
 * @param {Array} weeks - Массив недель
 * @param {number} employeeId - ID сотрудника
 * @returns {number} Общая сумма трудозатрат
 */
export function getEmployeeTotalTime(weeks, employeeId) {
  let total = 0;
  
  weeks.forEach(week => {
    if (week.employees) {
      const employee = week.employees.find(emp => emp.id === employeeId);
      if (employee) {
        total += employee.elapsedTime || 0;
      }
    }
  });
  
  return round(total, 2);
}

/**
 * Проверка наличия данных
 * 
 * @param {Object} data - Данные о трудозатратах
 * @returns {boolean} true, если есть данные
 */
export function hasData(data) {
  if (!data || !data.data) {
    return false;
  }
  
  return data.data.totalRecordsCount > 0 || 
         (data.data.weeks && data.data.weeks.length > 0);
}

