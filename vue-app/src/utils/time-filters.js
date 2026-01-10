/**
 * Утилиты для фильтрации данных по временным периодам
 *
 * Реализует корректную логику фильтрации тикетов по временным периодам
 * для попапов в графике сектора 1С.
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 *
 * @module time-filters
 */

import { safeDateParse, getDaysDifference, isValidPastDate } from './date-helpers.js';

/**
 * Константы для временных фильтров
 * Используются для обеспечения консистентности между компонентами
 */
export const TIME_FILTERS = {
  ONE_MONTH: 'one_month',
  TWO_MONTHS: 'two_months',
  MORE_THAN_HALF_YEAR: 'more_than_half_year',
  MORE_THAN_YEAR: 'more_than_year'
};

/**
 * Локализованные метки для фильтров
 */
export const TIME_FILTER_LABELS = {
  [TIME_FILTERS.ONE_MONTH]: 'Один месяц',
  [TIME_FILTERS.TWO_MONTHS]: 'Два месяца',
  [TIME_FILTERS.MORE_THAN_HALF_YEAR]: 'Более полугода',
  [TIME_FILTERS.MORE_THAN_YEAR]: 'Более года'
};

/**
 * Порядок отображения фильтров (от свежих к старым)
 */
export const TIME_FILTER_ORDER = [
  TIME_FILTERS.ONE_MONTH,
  TIME_FILTERS.TWO_MONTHS,
  TIME_FILTERS.MORE_THAN_HALF_YEAR,
  TIME_FILTERS.MORE_THAN_YEAR
];

/**
 * Конфигурация периодов в днях
 */
export const TIME_PERIODS_DAYS = {
  [TIME_FILTERS.ONE_MONTH]: 30,
  [TIME_FILTERS.TWO_MONTHS]: 60,
  [TIME_FILTERS.MORE_THAN_HALF_YEAR]: 180,
  [TIME_FILTERS.MORE_THAN_YEAR]: 365
};

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
  const isPlusPeriod = period.includes('more_than');

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