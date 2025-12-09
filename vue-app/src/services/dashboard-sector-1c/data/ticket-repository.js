/**
 * Репозиторий для работы с тикетами (элементами смарт-процесса)
 * 
 * Отвечает за загрузку и обновление тикетов через Bitrix24 REST API
 * 
 * Используемые методы Bitrix24:
 * - crm.item.list - получение списка элементов
 * - crm.item.get - получение элемента
 * - crm.item.update - обновление элемента
 * - crm.item.add - создание элемента
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.list
 * - https://context7.com/bitrix24/rest/crm.item.update
 */

import { ApiClient } from './api-client.js';
import { CacheManager } from '../cache/cache-manager.js';
import { Logger } from '../utils/logger.js';
import { 
  createProgressDetails, 
  normalizeProgressData,
  calculateProgress 
} from '../utils/progress-utils.js';
import { getDiagnosticsService, isDiagnosticsEnabled } from '../utils/diagnostics-service.js';

/**
 * ID смарт-процесса сектора 1С
 */
const ENTITY_TYPE_ID = 140;

/**
 * Репозиторий для работы с тикетами
 */
export class TicketRepository {
  /**
   * Получение всех тикетов по стадиям с пагинацией
   * 
   * Загружает тикеты из трёх стадий:
   * - DT140_12:UC_0VHWE2 - Сформировано обращение
   * - DT140_12:PREPARATION - Рассмотрение ТЗ
   * - DT140_12:CLIENT - Исполнение
   * 
   * @param {Array<string>} stageIds - Массив ID стадий для загрузки
   * @param {Function|null} onProgress - Колбэк для отслеживания прогресса (опционально)
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @returns {Promise<Array>} Массив всех тикетов
   */
  static async getAllTickets(stageIds, onProgress = null, useCache = true) {
    const allTickets = [];
    const totalStages = stageIds.length;
    
    try {
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[i];
        const stageName = this.getStageName(stageId);
        
        if (onProgress) {
          const baseProgress = (i / totalStages) * 100;
          onProgress(createProgressDetails('loading_tickets', baseProgress, {
            stage: stageId,
            stageName: stageName,
            stageIndex: i + 1,
            totalStages: totalStages
          }));
        }
        
        try {
          const stageTickets = await this.getTicketsByStage(stageId, useCache, onProgress ? (batchProgress) => {
            // Используем утилиту для расчёта прогресса в диапазоне
            const stageProgress = calculateProgress(
              (i / totalStages) * 100,  // базовый прогресс
              (1 / totalStages) * 100,   // диапазон для текущей стадии
              batchProgress.percent || 0 // процент выполнения батча
            );
            
            onProgress(createProgressDetails('loading_tickets', stageProgress, {
              stage: stageId,
              stageName: stageName,
              stageIndex: i + 1,
              totalStages: totalStages,
              count: batchProgress.count,
              total: batchProgress.total
            }));
          } : null);
          
          allTickets.push(...stageTickets);
        } catch (stageError) {
          Logger.error(`Error loading tickets for stage ${stageId}`, 'TicketRepository', stageError);
          
          // Формируем понятное сообщение об ошибке
          let errorMessage = `Ошибка загрузки стадии "${stageName}"`;
          if (stageError.message) {
            if (stageError.message.includes('HTTP error') || stageError.message.includes('network')) {
              errorMessage = `Ошибка соединения при загрузке стадии "${stageName}". Проверьте подключение к интернету.`;
            } else if (stageError.message.includes('timeout')) {
              errorMessage = `Превышено время ожидания при загрузке стадии "${stageName}". Попробуйте позже.`;
            } else if (stageError.message.includes('403') || stageError.message.includes('401')) {
              errorMessage = `Ошибка доступа при загрузке стадии "${stageName}". Проверьте права доступа.`;
            } else {
              errorMessage = `Ошибка загрузки стадии "${stageName}": ${stageError.message}`;
            }
          }
          
          // НЕ передаём ошибку через колбэк прогресса - она будет показана только в catch блоке
          // Это предотвращает показ временных ошибок во время загрузки
          
          // Пробрасываем ошибку дальше, чтобы прервать весь процесс
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      Logger.error('Error in getAllTickets', 'TicketRepository', error);
      throw error;
    }

    return allTickets;
  }

  /**
   * Получение читаемого названия стадии
   * 
   * @param {string} stageId - ID стадии
   * @returns {string} Название стадии
   */
  static getStageName(stageId) {
    const stageNames = {
      'DT140_12:UC_0VHWE2': 'Сформировано обращение',
      'DT140_12:PREPARATION': 'Рассмотрение ТЗ',
      'DT140_12:CLIENT': 'Исполнение'
    };
    return stageNames[stageId] || stageId;
  }

  /**
   * Получение тикетов по конкретной стадии с пагинацией
   * 
   * Bitrix24 возвращает максимум 50 элементов за запрос
   * Используем пагинацию для получения всех тикетов
   * Использует кеширование для оптимизации
   * 
   * @param {string} stageId - ID стадии
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @param {Function|null} onProgress - Колбэк для отслеживания прогресса (опционально)
   * @returns {Promise<Array>} Массив тикетов стадии
   */
  static async getTicketsByStage(stageId, useCache = true, onProgress = null) {
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getTicketsCacheKey(stageId);
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        try {
          const diagnostics = getDiagnosticsService();
          if (diagnostics && isDiagnosticsEnabled()) {
            diagnostics.logTicketsLoading(
              stageId,
              cached.length,
              cached.length,
              null
            );
          }
        } catch (diagError) {
          Logger.warn('Diagnostics logging error (cache hit) in getTicketsByStage', 'TicketRepository', diagError);
        }
        if (onProgress) {
          onProgress(normalizeProgressData({
            step: 'loading_tickets',
            percent: 100,
            count: cached.length,
            total: cached.length
          }));
        }
        return cached;
      }
    }

    const allTickets = [];
    let start = 0;
    const limit = 50; // Максимум элементов за запрос
    let hasMore = true;
    let totalEstimated = 0; // Оценочное общее количество (будет обновляться)
    let firstBatchError = null; // Сохраняем ошибку первого батча

    while (hasMore) {
      try {
        const result = await ApiClient.call('crm.item.list', {
          entityTypeId: ENTITY_TYPE_ID,
          filter: {
            stageId: stageId
          },
          select: ['*'],
          order: { id: 'DESC' },
          start: start,
          useOriginalUfNames: 'Y' // Использовать оригинальные имена пользовательских полей
        });

        // Извлекаем массив тикетов из ответа
        let batchTickets = [];
        if (result && result.result) {
          if (Array.isArray(result.result)) {
            batchTickets = result.result;
          } else if (result.result.items && Array.isArray(result.result.items)) {
            batchTickets = result.result.items;
          } else if (result.result.data && Array.isArray(result.result.data)) {
            batchTickets = result.result.data;
          }
        }

        if (batchTickets.length > 0) {
          allTickets.push(...batchTickets);
          start += batchTickets.length;
          
          // Проверяем наличие поля next в ответе для определения, есть ли ещё данные
          // Bitrix24 API возвращает поле next в result.result.next, если есть ещё данные
          // Если получили меньше limit, значит это последняя страница
          // Если получили ровно limit, проверяем наличие next
          const hasNext = result?.result?.next !== null && result?.result?.next !== undefined && result?.result?.next !== '';
          hasMore = batchTickets.length === limit && hasNext;
          
          // Логирование диагностики (только если включена)
          try {
            const diagnostics = getDiagnosticsService();
            if (diagnostics && isDiagnosticsEnabled()) {
              diagnostics.logTicketsLoading(
                stageId,
                batchTickets.length,
                allTickets.length,
                result?.result?.next || null
              );
            }
          } catch (diagError) {
            // Игнорируем ошибки диагностики, чтобы не ломать основной процесс
            Logger.warn('Diagnostics logging error', 'TicketRepository', diagError);
          }
          
          // Обновляем оценку общего количества
          if (hasMore) {
            totalEstimated = start + limit; // Предполагаем, что будет ещё хотя бы один батч
          } else {
            totalEstimated = allTickets.length; // Это финальное количество
          }
          
          // Вызываем колбэк прогресса
          if (onProgress) {
            const percent = totalEstimated > 0 ? Math.min(100, (allTickets.length / totalEstimated) * 100) : 0;
            onProgress(normalizeProgressData({
              step: 'loading_tickets',
              percent: percent,
              count: allTickets.length,
              total: totalEstimated
            }));
          }
          
          // Сбрасываем ошибку первого батча, если загрузка успешна
          firstBatchError = null;
        } else {
          hasMore = false;
        }
      } catch (error) {
        Logger.error(`Error loading tickets batch for stage ${stageId} (start: ${start})`, 'TicketRepository', error);
        
        // Если это первый батч и произошла ошибка - это критично
        if (start === 0) {
          firstBatchError = error;
          // Пробрасываем ошибку, так как не удалось загрузить даже первый батч
          throw new Error(`Не удалось загрузить тикеты для стадии ${stageId}: ${error.message || error}`);
        }
        
        // Если это не первый батч, прерываем цикл, но возвращаем то, что успело загрузиться
        hasMore = false;
        
        // Уведомляем о частичной загрузке
        if (onProgress && allTickets.length > 0) {
          onProgress(createProgressDetails('loading_tickets', 100, {
            count: allTickets.length,
            total: allTickets.length,
            warning: `Загружено частично: ${allTickets.length} тикетов. Ошибка при загрузке остальных.`
          }));
        }
      }
    }
    
    // Если была ошибка первого батча, пробрасываем её
    if (firstBatchError && allTickets.length === 0) {
      throw firstBatchError;
    }

    // Сохраняем в кеш
    if (useCache) {
      const cacheKey = CacheManager.getTicketsCacheKey(stageId);
      CacheManager.set(cacheKey, allTickets, CacheManager.TICKETS_TTL);
    }

    return allTickets;
  }

  /**
   * Получение детальной информации о тикете
   * 
   * Метод: crm.item.get
   * Документация: https://context7.com/bitrix24/rest/crm.item.get
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<object>} Данные тикета
   */
  static async getTicket(ticketId) {
    const result = await ApiClient.call('crm.item.get', {
      entityTypeId: ENTITY_TYPE_ID,
      id: ticketId
    });

    return result.result || null;
  }

  /**
   * Обновление тикета
   * 
   * Метод: crm.item.update
   * Документация: https://context7.com/bitrix24/rest/crm.item.update
   * 
   * Инвалидирует кеш тикетов после обновления
   * 
   * @param {number} ticketId - ID тикета
   * @param {object} fields - Поля для обновления
   * @returns {Promise<boolean>} Успешность операции
   */
  static async updateTicket(ticketId, fields) {
    const result = await ApiClient.call('crm.item.update', {
      entityTypeId: ENTITY_TYPE_ID,
      id: ticketId,
      fields: fields
    });

    const success = result.result === true;
    
    // Инвалидируем кеш тикетов после обновления
    if (success) {
      CacheManager.invalidateTicketsCache();
    }

    return success;
  }

  /**
   * Создание нового тикета
   * 
   * Метод: crm.item.add
   * Документация: https://context7.com/bitrix24/rest/crm.item.add
   * 
   * Инвалидирует кеш тикетов после создания
   * 
   * @param {object} fields - Поля тикета
   * @returns {Promise<number>} ID созданного тикета
   */
  static async createTicket(fields) {
    const result = await ApiClient.call('crm.item.add', {
      entityTypeId: ENTITY_TYPE_ID,
      fields: fields
    });

    const ticketId = result.result ? parseInt(result.result) : 0;
    
    // Инвалидируем кеш тикетов после создания
    if (ticketId > 0) {
      CacheManager.invalidateTicketsCache();
    }

    return ticketId;
  }

  /**
   * Назначение тикета сотруднику
   * 
   * @param {number} ticketId - ID тикета
   * @param {number} employeeId - ID сотрудника
   * @param {string} bitrixStageId - ID этапа в Bitrix24
   * @returns {Promise<boolean>} Успешность операции
   */
  static async assignTicket(ticketId, employeeId, bitrixStageId) {
    return await this.updateTicket(ticketId, {
      assignedById: employeeId,
      stageId: bitrixStageId
    });
  }
}

