/**
 * Сервис для обработки данных попапов сектора 1С
 *
 * Реализует логику фильтрации тикетов по временным периодам
 * для попапов в графике сектора 1С.
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 *
 * @module popup-data-service
 */

import { filterTicketsByTimePeriod, TIME_FILTERS, TIME_FILTER_LABELS, TIME_FILTER_ORDER, getTicketsCountByPeriods } from '@/utils/time-filters.js';
import { safeDateParse } from '@/utils/date-helpers.js';

/**
 * Сервис для обработки данных попапов
 */
export class PopupDataService {
  /**
   * Получение данных для попапа с предварительной фильтрацией
   * @param {Array} tickets - массив всех тикетов
   * @param {Object} filters - параметры фильтрации
   * @returns {Object} данные для попапа
   */
  static getPopupData(tickets, filters = {}) {
    try {
      // Фильтрация тикетов по основным критериям (если нужны)
      let filteredTickets = this.applyBaseFilters(tickets, filters);

      // Получение статистики по периодам
      const filterStats = getTicketsCountByPeriods(filteredTickets);

      // Формирование конфигурации режимов сортировки
      const sortModes = TIME_FILTER_ORDER.map(period => ({
        key: period,
        label: TIME_FILTER_LABELS[period],
        count: filterStats[period],
        description: this.getPeriodDescription(period)
      }));

      return {
        tickets: filteredTickets,
        filterStats,
        sortModes,
        totalCount: filteredTickets.length
      };
    } catch (error) {
      console.error('[PopupDataService] Error in getPopupData:', error);
      return {
        tickets: [],
        filterStats: {},
        sortModes: [],
        totalCount: 0,
        error: error.message
      };
    }
  }

  /**
   * Получение отфильтрованных тикетов по временному периоду
   * @param {Array} tickets - массив тикетов
   * @param {string} period - период фильтрации
   * @returns {Array} отфильтрованные тикеты
   */
  static getFilteredTickets(tickets, period) {
    try {
      return filterTicketsByTimePeriod(tickets, period);
    } catch (error) {
      console.error(`[PopupDataService] Error filtering tickets for period ${period}:`, error);
      return [];
    }
  }

  /**
   * Применение базовых фильтров (кроме временных)
   * @param {Array} tickets - массив тикетов
   * @param {Object} filters - параметры фильтрации
   * @returns {Array} отфильтрованные тикеты
   */
  static applyBaseFilters(tickets, filters = {}) {
    if (!Array.isArray(tickets)) return [];

    let filtered = [...tickets];

    // Фильтр по статусу
    if (filters.status) {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    // Фильтр по приоритету
    if (filters.priority) {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    // Фильтр по исполнителю
    if (filters.assignee) {
      filtered = filtered.filter(ticket => ticket.assignee === filters.assignee);
    }

    // Фильтр по ключевым словам в названии
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(ticket =>
        ticket.title?.toLowerCase().includes(searchTerm) ||
        ticket.description?.toLowerCase().includes(searchTerm)
      );
    }

    return filtered;
  }

  /**
   * Получение описания для периода
   * @param {string} period - период
   * @returns {string} описание периода
   */
  static getPeriodDescription(period) {
    const descriptions = {
      [TIME_FILTERS.ONE_MONTH]: 'Тикеты за последние 30 дней',
      [TIME_FILTERS.TWO_MONTHS]: 'Тикеты за последние 60 дней',
      [TIME_FILTERS.SIX_MONTHS_PLUS]: 'Тикеты старше 180 дней',
      [TIME_FILTERS.ONE_YEAR_PLUS]: 'Тикеты старше 365 дней'
    };

    return descriptions[period] || 'Неизвестный период';
  }

  /**
   * Валидация данных тикетов
   * @param {Array} tickets - массив тикетов
   * @returns {Object} результат валидации
   */
  static validateTickets(tickets) {
    if (!Array.isArray(tickets)) {
      return { valid: false, error: 'Tickets must be an array' };
    }

    const errors = [];
    let validCount = 0;
    let invalidDates = 0;

    tickets.forEach((ticket, index) => {
      if (!ticket) {
        errors.push(`Ticket at index ${index} is null or undefined`);
        return;
      }

      if (!ticket.id) {
        errors.push(`Ticket at index ${index} missing id`);
        return;
      }

      if (!ticket.created_at) {
        errors.push(`Ticket ${ticket.id} missing created_at`);
        return;
      }

      const date = safeDateParse(ticket.created_at);
      if (!date) {
        errors.push(`Ticket ${ticket.id} has invalid created_at: ${ticket.created_at}`);
        invalidDates++;
        return;
      }

      validCount++;
    });

    return {
      valid: errors.length === 0,
      validCount,
      invalidCount: tickets.length - validCount,
      invalidDates,
      errors: errors.slice(0, 10), // Ограничиваем количество ошибок
      totalErrors: errors.length
    };
  }
}