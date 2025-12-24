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

import { getApiUrl } from '@/utils/path-utils.js';

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
    const endpoint = getApiUrl(DEFAULT_ENDPOINT);
    const response = await fetch(endpoint, {
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

    const normalized = normalizeResponse(raw);
    
    // TASK-076: Проверка использования кеша и показ уведомления
    if (raw.cache_used === true) {
      const { CacheNotificationService } = await import('@/services/cache-notification-service.js');
      CacheNotificationService.notifyCacheUsed('Трудозатраты на Тикеты сектора 1С');
    }
    
    return normalized;
  } catch (error) {
    console.error('[TimeTrackingService] Error fetching time tracking data:', error);
    throw error;
  }
}

/**
 * @typedef {Object} TaskDetail
 * @property {number} id - ID задачи
 * @property {string} title - Название задачи
 * @property {string|null} startDate - Дата начала (ISO string или null)
 * @property {string|null} deadline - Дедлайн (ISO string или null)
 * @property {string|null} closedDate - Дата завершения (ISO string или null)
 * @property {number} status - Статус задачи (2-7, для будущего использования)
 * @property {number} stageId - ID стадии (для будущего использования)
 * @property {number} responsibleId - ID ответственного
 * @property {number} createdBy - ID создателя
 * @property {number} elapsedTime - Трудозатрата в часах
 */

/**
 * @typedef {Object} TasksPagination
 * @property {number} totalTasks - Общее количество задач
 * @property {number} currentPage - Текущая страница
 * @property {number} perPage - Количество задач на страницу
 * @property {number} totalPages - Общее количество страниц
 */

/**
 * @typedef {Object} TasksDetailsResponse
 * @property {TaskDetail[]} tasks - Массив задач
 * @property {TasksPagination} pagination - Метаданные пагинации
 */

/**
 * Получение детальной информации о задачах с поддержкой пагинации
 * 
 * Используется метод Bitrix24 API: tasks.task.get
 * Документация: https://context7.com/bitrix24/rest/tasks.task.get
 * 
 * @param {Object} params Параметры запроса
 * @param {Array<number>} params.taskIds Массив ID задач
 * @param {number} [params.employeeId] ID сотрудника (опционально)
 * @param {number} [params.weekNumber] Номер недели (опционально)
 * @param {number} [params.page=1] Номер страницы (по умолчанию 1)
 * @param {number} [params.perPage=10] Количество задач на страницу (по умолчанию 10)
 * @returns {Promise<TasksDetailsResponse>} Объект с массивом задач и метаданными пагинации
 * @throws {Error} При ошибке запроса или API
 */
export async function getTasksDetails({ 
  taskIds, 
  employeeId, 
  weekNumber, 
  page = 1, 
  perPage = 10 
}) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      tasks: [],
      pagination: {
        totalTasks: 0,
        currentPage: 1,
        perPage: perPage,
        totalPages: 0
      }
    };
  }
  
  try {
    const endpoint = getApiUrl(DEFAULT_ENDPOINT);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: '1C',
        includeTaskDetails: true,
        taskIds: taskIds,
        employeeId: employeeId || undefined,
        weekNumber: weekNumber || undefined,
        page: page,
        perPage: perPage
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || result.error_description || 'Ошибка получения данных о задачах');
    }
    
    return {
      tasks: result.data.tasks || [],
      pagination: result.data.pagination || {
        totalTasks: 0,
        currentPage: 1,
        perPage: perPage,
        totalPages: 0
      }
    };
  } catch (error) {
    console.error('[timeTrackingService] Error loading tasks details:', error);
    throw error;
  }
}

/**
 * Экспорт сервиса
 */
export const timeTrackingService = {
  getTimeTrackingData,
  getTasksDetails
};

