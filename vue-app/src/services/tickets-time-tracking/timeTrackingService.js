/**
 * Сервис для работы с модулем «Трудозатраты на Тикеты сектора 1С»
 *
 * Использует REST-эндпоинт бэкенда:
 * - POST /api/tickets-time-tracking-sector-1c.php
 *
 * Документация (контракт зафиксирован в TASK-050-02):
 * - meta { weekNumber, weekStartUtc, weekEndUtc, totalWeeks, sector1CEmployeesCount }
 * - data { totalElapsedTime, totalElapsedTimeUnit, totalRecordsCount, weeks[], employeesSummary[] }
 */

const DEFAULT_ENDPOINT = '/api/tickets-time-tracking-sector-1c.php';

/**
 * Нормализует ответ бэкенда в ожидаемый формат фронта.
 * Гарантирует наличие meta/data и пустых значений по умолчанию.
 */
function normalizeResponse(raw) {
  if (!raw) {
    return {
      meta: null,
      data: {
        totalElapsedTime: 0,
        totalElapsedTimeUnit: 'hours',
        totalRecordsCount: 0,
        weeks: [],
        employeesSummary: []
      }
    };
  }

  const payload = raw.data || raw.result || raw;
  const meta = payload.meta || raw.meta || null;

  return {
    meta: {
      weekNumber: meta?.weekNumber ?? null,
      weekStartUtc: meta?.weekStartUtc ?? null,
      weekEndUtc: meta?.weekEndUtc ?? null,
      totalWeeks: meta?.totalWeeks ?? 0,
      sector1CEmployeesCount: meta?.sector1CEmployeesCount ?? 0
    },
    data: {
      totalElapsedTime: payload.data?.totalElapsedTime ?? payload.totalElapsedTime ?? 0,
      totalElapsedTimeUnit: payload.data?.totalElapsedTimeUnit ?? payload.totalElapsedTimeUnit ?? 'hours',
      totalRecordsCount: payload.data?.totalRecordsCount ?? payload.totalRecordsCount ?? 0,
      weeks: payload.data?.weeks ?? payload.weeks ?? [],
      employeesSummary: payload.data?.employeesSummary ?? payload.employeesSummary ?? []
    }
  };
}

/**
 * Получение данных о трудозатратах
 * 
 * @param {Object} params - Параметры запроса
 * @param {string} params.product - Фильтр на сектор (default: '1C')
 * @param {string} params.weekStartUtc - Начало недели (ISO-8601, UTC, optional)
 * @param {string} params.weekEndUtc - Конец недели (ISO-8601, UTC, optional)
 * @param {number} params.weeksCount - Количество недель (default: 4)
 * @returns {Promise<Object>} Нормализованные данные о трудозатратах
 */
export async function getTimeTrackingData(params = {}) {
  const {
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    weeksCount = 4
  } = params;

  try {
    const response = await fetch(DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product,
        weekStartUtc,
        weekEndUtc,
        weeksCount
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const raw = await response.json();

    if (raw.error) {
      throw new Error(raw.error_description || raw.error || 'Unknown error');
    }

    return normalizeResponse(raw);
  } catch (error) {
    console.error('[TimeTrackingService] Error fetching time tracking data:', error);
    throw error;
  }
}

/**
 * Экспорт сервиса
 */
export const timeTrackingService = {
  getTimeTrackingData
};

