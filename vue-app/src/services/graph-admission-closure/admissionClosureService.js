/**
 * Сервис для работы с модулем «График приёма и закрытий сектора 1С»
 *
 * Использует REST-эндпоинт бэкенда:
 * - POST /api/graph-1c-admission-closure.php
 *
 * Документация (контракт зафиксирован в TASK-041-02):
 * - meta { weekNumber, weekStartUtc, weekEndUtc }
 * - data { newTickets, closedTickets, series { new[], closed[] }, stages[], responsible[] }
 */

const DEFAULT_ENDPOINT = '/api/graph-1c-admission-closure.php';

/**
 * Нормализует ответ бэкенда в ожидаемый формат фронта.
 * Гарантирует наличие meta/data и пустых значений по умолчанию.
 */
function normalizeResponse(raw) {
  if (!raw) {
    return {
      meta: null,
      data: {
        newTickets: 0,
        closedTickets: 0,
        series: { new: [0], closed: [0] },
        stages: [],
        responsible: []
      }
    };
  }

  const payload = raw.data || raw.result || raw;

  return {
    meta: payload.meta || raw.meta || null,
    data: {
      newTickets: payload.data?.newTickets ?? payload.newTickets ?? 0,
      closedTickets: payload.data?.closedTickets ?? payload.closedTickets ?? 0,
      series: {
        new: payload.data?.series?.new ?? payload.series?.new ?? [0],
        closed: payload.data?.series?.closed ?? payload.series?.closed ?? [0]
      },
      stages: payload.data?.stages ?? payload.stages ?? [],
      responsible: payload.data?.responsible ?? payload.responsible ?? [],
      newTicketsByStages: payload.data?.newTicketsByStages ?? payload.newTicketsByStages ?? null
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
 * @param {boolean} [params.useCache=true] - Флаг кэша для бэкенда.
 * @param {boolean} [params.forceRefresh=false] - Принудительная перезагрузка данных.
 * @param {boolean} [params.includeTickets=false] - Включить тикеты для каждого сотрудника в responsible[].
 * @param {boolean} [params.includeNewTicketsByStages=false] - Включить новые тикеты по стадиям в newTicketsByStages[].
 * @returns {Promise<{meta: object|null, data: object}>}
 */
export async function fetchAdmissionClosureStats(params = {}) {
  const {
    endpoint = DEFAULT_ENDPOINT,
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    useCache = true,
    forceRefresh = false,
    includeTickets = false,
    includeNewTicketsByStages = false
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    useCache,
    forceRefresh,
    includeTickets,
    includeNewTicketsByStages
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

