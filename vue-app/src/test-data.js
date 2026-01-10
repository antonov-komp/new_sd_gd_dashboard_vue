/**
 * Тестовые данные для проверки фильтрации по временным периодам
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 */

import { TIME_FILTERS } from './utils/time-filters.js';

/**
 * Тестовые тикеты с разными датами создания для проверки фильтрации
 */
export const testTickets = [
  {
    id: 'TICKET-001',
    title: 'Проблема с оборудованием',
    description: 'Не работает принтер в офисе',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 дней назад
    status: 'open',
    priority: 'high'
  },
  {
    id: 'TICKET-002',
    title: 'Ошибка в системе',
    description: 'Система не отвечает на запросы',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 дней назад
    status: 'closed',
    priority: 'urgent'
  },
  {
    id: 'TICKET-003',
    title: 'Запрос на доработку',
    description: 'Нужно добавить новый функционал',
    created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // 200 дней назад
    status: 'open',
    priority: 'normal'
  },
  {
    id: 'TICKET-004',
    title: 'Старый инцидент',
    description: 'Архивная проблема',
    created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // 400 дней назад
    status: 'closed',
    priority: 'low'
  },
  {
    id: 'TICKET-005',
    title: 'Очень старый тикет',
    description: 'Из архива 2020 года',
    created_at: new Date(Date.now() - 1000 * 24 * 60 * 60 * 1000).toISOString(), // 1000 дней назад
    status: 'closed',
    priority: 'low'
  }
];

/**
 * Краевые случаи для тестирования
 */
export const edgeCaseTickets = {
  // Тикеты без обязательных полей
  missingFields: [
    { title: 'Без ID' },
    { id: 'MISSING_DATE', title: 'Без даты' },
    { id: 'EMPTY_DATE', created_at: '', title: 'Пустая дата' },
    { id: 'NULL_DATE', created_at: null, title: 'Null дата' }
  ],

  // Тикеты с некорректными датами
  invalidDate: [
    {
      id: 'INVALID_DATE_1',
      created_at: 'invalid-date-string',
      title: 'Некорректная дата'
    },
    {
      id: 'INVALID_DATE_2',
      created_at: '2024-13-45T25:00:00Z', // Невалидная дата
      title: 'Невозможная дата'
    }
  ],

  // Тикеты с датами из будущего
  futureDate: [
    {
      id: 'FUTURE_DATE',
      created_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Завтра
      title: 'Будущий тикет'
    }
  ],

  // Пустые массивы
  empty: [],

  // Большой набор данных для тестирования производительности
  largeDataset: Array.from({ length: 1000 }, (_, i) => ({
    id: `TICKET-${String(i + 1).padStart(4, '0')}`,
    title: `Тестовый тикет ${i + 1}`,
    description: `Описание тестового тикета номер ${i + 1}`,
    created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: Math.random() > 0.5 ? 'open' : 'closed',
    priority: ['low', 'normal', 'high', 'urgent'][Math.floor(Math.random() * 4)]
  }))
};

/**
 * Ожидаемые результаты фильтрации для testTickets
 */
export const expectedFilterResults = {
  [TIME_FILTERS.ONE_MONTH]: ['TICKET-001'], // ≤ 30 дней
  [TIME_FILTERS.TWO_MONTHS]: ['TICKET-001', 'TICKET-002'], // ≤ 60 дней
  [TIME_FILTERS.SIX_MONTHS_PLUS]: ['TICKET-003', 'TICKET-004', 'TICKET-005'], // > 180 дней
  [TIME_FILTERS.ONE_YEAR_PLUS]: ['TICKET-005'] // > 365 дней
};

/**
 * Функция для генерации тестовых данных с определенными характеристиками
 * @param {Object} options - опции генерации
 * @returns {Array} массив тестовых тикетов
 */
export function generateTestTickets(options = {}) {
  const {
    count = 100,
    dateRange = { min: -365, max: 0 }, // в днях от сегодня
    includeInvalid = false,
    includeFuture = false
  } = options;

  const tickets = [];

  for (let i = 0; i < count; i++) {
    const daysOffset = Math.random() * (dateRange.max - dateRange.min) + dateRange.min;
    const createdAt = new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000);

    tickets.push({
      id: `TEST-${String(i + 1).padStart(4, '0')}`,
      title: `Тестовый тикет ${i + 1}`,
      description: `Автоматически сгенерированный тестовый тикет для проверки фильтрации`,
      created_at: createdAt.toISOString(),
      status: Math.random() > 0.3 ? 'open' : 'closed',
      priority: ['low', 'normal', 'high', 'urgent'][Math.floor(Math.random() * 4)]
    });
  }

  // Добавляем невалидные данные если нужно
  if (includeInvalid) {
    tickets.push(...edgeCaseTickets.missingFields);
    tickets.push(...edgeCaseTickets.invalidDate);
  }

  if (includeFuture) {
    tickets.push(...edgeCaseTickets.futureDate);
  }

  return tickets;
}