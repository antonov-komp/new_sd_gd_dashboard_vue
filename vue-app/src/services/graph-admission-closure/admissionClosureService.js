/**
 * Сервис для работы с модулем «График приёма и закрытий сектора 1С»
 *
 * Использует REST-эндпоинт бэкенда:
 * - POST /api/graph-1c-admission-closure.php
 *
 * Документация (контракт зафиксирован в TASK-041-02, расширен в TASK-044-02, TASK-044-04):
 * - meta { weekNumber, weekStartUtc, weekEndUtc }
 * - data { newTickets, closedTickets, carryoverTickets, series { new[], closed[], carryover[] }, stages[], responsible[], carryoverTicketsByDuration[] }
 */

const DEFAULT_ENDPOINT = '/api/graph-1c-admission-closure.php';

/**
 * Нормализует ответ бэкенда в ожидаемый формат фронта.
 * Гарантирует наличие meta/data и пустых значений по умолчанию.
 * TASK-048: Обновлено для поддержки данных за 4 недели.
 */
function normalizeResponse(raw) {
  if (!raw) {
    return {
      meta: null,
      data: {
        currentWeek: { // TASK-048
          newTickets: 0,
          closedTickets: 0,
          closedTicketsCreatedThisWeek: 0,
          closedTicketsCreatedOtherWeek: 0,
          carryoverTickets: 0,
          carryoverTicketsCreatedThisWeek: 0,
          carryoverTicketsCreatedOtherWeek: 0
        },
        newTickets: 0,
        closedTickets: 0,
        closedTicketsCreatedThisWeek: 0, // TASK-047
        closedTicketsCreatedOtherWeek: 0, // TASK-047
        series: { 
          new: [0], 
          closed: [0],
          closedCreatedThisWeek: [0], // TASK-048
          closedCreatedOtherWeek: [0], // TASK-048
          carryover: [0],
          carryoverCreatedThisWeek: [0], // TASK-048
          carryoverCreatedOtherWeek: [0] // TASK-048
        },
        weeksData: [], // TASK-048
        stages: [],
        responsible: [],
        responsibleCreatedThisWeek: [], // TASK-047
        responsibleCreatedOtherWeek: [] // TASK-047
      }
    };
  }

  const payload = raw.data || raw.result || raw;
  const meta = payload.meta || raw.meta || null;

  return {
    meta: {
      ...meta,
      // TASK-048: Добавляем currentWeek и weeks в meta
      currentWeek: meta?.currentWeek || (meta ? {
        weekNumber: meta.weekNumber,
        weekStartUtc: meta.weekStartUtc,
        weekEndUtc: meta.weekEndUtc
      } : null),
      weeks: meta?.weeks || []
    },
    data: {
      // TASK-048: Добавляем currentWeek в data
      currentWeek: payload.data?.currentWeek || (payload.data ? {
        newTickets: payload.data.newTickets ?? 0,
        closedTickets: payload.data.closedTickets ?? 0,
        closedTicketsCreatedThisWeek: payload.data.closedTicketsCreatedThisWeek ?? 0,
        closedTicketsCreatedOtherWeek: payload.data.closedTicketsCreatedOtherWeek ?? 0,
        carryoverTickets: payload.data.carryoverTickets ?? 0,
        carryoverTicketsCreatedThisWeek: payload.data.carryoverTicketsCreatedThisWeek ?? 0,
        carryoverTicketsCreatedOtherWeek: payload.data.carryoverTicketsCreatedOtherWeek ?? 0
      } : {
        newTickets: 0,
        closedTickets: 0,
        closedTicketsCreatedThisWeek: 0,
        closedTicketsCreatedOtherWeek: 0,
        carryoverTickets: 0,
        carryoverTicketsCreatedThisWeek: 0,
        carryoverTicketsCreatedOtherWeek: 0
      }),
      // Для обратной совместимости
      newTickets: payload.data?.currentWeek?.newTickets ?? payload.data?.newTickets ?? payload.newTickets ?? 0,
      closedTickets: payload.data?.currentWeek?.closedTickets ?? payload.data?.closedTickets ?? payload.closedTickets ?? 0,
      closedTicketsCreatedThisWeek: payload.data?.currentWeek?.closedTicketsCreatedThisWeek ?? payload.data?.closedTicketsCreatedThisWeek ?? payload.closedTicketsCreatedThisWeek ?? 0, // TASK-047
      closedTicketsCreatedOtherWeek: payload.data?.currentWeek?.closedTicketsCreatedOtherWeek ?? payload.data?.closedTicketsCreatedOtherWeek ?? payload.closedTicketsCreatedOtherWeek ?? 0, // TASK-047
      carryoverTickets: payload.data?.currentWeek?.carryoverTickets ?? payload.data?.carryoverTickets ?? payload.carryoverTickets ?? 0,
      carryoverTicketsCreatedThisWeek: payload.data?.currentWeek?.carryoverTicketsCreatedThisWeek ?? payload.data?.carryoverTicketsCreatedThisWeek ?? payload.carryoverTicketsCreatedThisWeek ?? 0, // TASK-047
      carryoverTicketsCreatedOtherWeek: payload.data?.currentWeek?.carryoverTicketsCreatedOtherWeek ?? payload.data?.carryoverTicketsCreatedOtherWeek ?? payload.carryoverTicketsCreatedOtherWeek ?? 0, // TASK-047
      // TASK-048: Обновляем series для поддержки 4 недель и разбивок
      series: {
        new: payload.data?.series?.new ?? payload.series?.new ?? [0],
        closed: payload.data?.series?.closed ?? payload.series?.closed ?? [0],
        closedCreatedThisWeek: payload.data?.series?.closedCreatedThisWeek ?? payload.series?.closedCreatedThisWeek ?? [0], // TASK-048
        closedCreatedOtherWeek: payload.data?.series?.closedCreatedOtherWeek ?? payload.series?.closedCreatedOtherWeek ?? [0], // TASK-048
        carryover: payload.data?.series?.carryover ?? payload.series?.carryover ?? [0],
        carryoverCreatedThisWeek: payload.data?.series?.carryoverCreatedThisWeek ?? payload.series?.carryoverCreatedThisWeek ?? [0], // TASK-048
        carryoverCreatedOtherWeek: payload.data?.series?.carryoverCreatedOtherWeek ?? payload.series?.carryoverCreatedOtherWeek ?? [0] // TASK-048
      },
      // TASK-048: Добавляем weeksData
      weeksData: payload.data?.weeksData ?? payload.weeksData ?? [],
      stages: payload.data?.stages ?? payload.stages ?? [],
      responsible: payload.data?.responsible ?? payload.responsible ?? [],
      responsibleCreatedThisWeek: payload.data?.responsibleCreatedThisWeek ?? payload.responsibleCreatedThisWeek ?? [], // TASK-047
      responsibleCreatedOtherWeek: payload.data?.responsibleCreatedOtherWeek ?? payload.responsibleCreatedOtherWeek ?? [], // TASK-047
      newTicketsByStages: payload.data?.newTicketsByStages ?? payload.newTicketsByStages ?? null,
      carryoverTicketsByDuration: payload.data?.carryoverTicketsByDuration ?? payload.carryoverTicketsByDuration ?? null,
      // TASK-053-03: Данные для 3-месячного режима
      newTicketsByMonth: payload.data?.newTicketsByMonth ?? payload.newTicketsByMonth ?? [],
      closedTicketsByMonth: payload.data?.closedTicketsByMonth ?? payload.closedTicketsByMonth ?? [],
      carryoverTicketsByMonth: payload.data?.carryoverTicketsByMonth ?? payload.carryoverTicketsByMonth ?? []
    }
  };
}

/**
 * Запрашивает недельные агрегаты (новые/закрытые тикеты) для сектора 1С.
 *
 * @param {Object} params
 * @param {string} [params.product='1C'] - Обязательный фильтр на сектор (первый шаг).
 * @param {string|null} [params.weekStartUtc=null] - Начало недели ISO8601 (опционально, бэкенд может вычислить сам).
 * @param {string|null} [params.weekEndUtc=null] - Конец недели ISO8601 (опционально).
 * @param {string} [params.periodMode='weeks'] - Режим периода: 'weeks' (4 недели) или 'months' (3 месяца) (TASK-053-03).
 * @param {boolean} [params.useCache=true] - Флаг кэша для бэкенда.
 * @param {boolean} [params.forceRefresh=false] - Принудительная перезагрузка данных.
 * @param {boolean} [params.includeTickets=false] - Включить тикеты для каждого сотрудника в responsible[].
 * @param {boolean} [params.includeNewTicketsByStages=false] - Включить новые тикеты по стадиям в newTicketsByStages[].
 * @param {boolean} [params.includeCarryoverTickets=true] - Включить переходящие тикеты в ответ (TASK-044-02).
 * @param {boolean} [params.includeCarryoverTicketsByDuration=false] - Включить переходящие тикеты по срокам в carryoverTicketsByDuration[] (TASK-044-04).
 * @returns {Promise<{meta: object|null, data: object}>}
 */
export async function fetchAdmissionClosureStats(params = {}) {
  const {
    endpoint = DEFAULT_ENDPOINT,
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    periodMode = 'weeks', // TASK-053-03: Новый параметр
    useCache = true,
    forceRefresh = false,
    includeTickets = false,
    includeNewTicketsByStages = false,
    includeCarryoverTickets = true,
    includeCarryoverTicketsByDuration = false
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    periodMode, // TASK-053-03: Добавляем параметр periodMode
    useCache,
    forceRefresh,
    includeTickets,
    includeNewTicketsByStages,
    includeCarryoverTickets,
    includeCarryoverTicketsByDuration
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Ошибка запроса (${response.status})`);
  }

  const json = await response.json();

  if (json?.success === false) {
    throw new Error(json.message || 'Бэкенд вернул ошибку');
  }

  return normalizeResponse(json);
}

export default {
  fetchAdmissionClosureStats
};

