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
   * Получение всех тикетов по фильтру UF_CRM_7_TYPE_PRODUCT
   *
   * Загружает тикеты из всех стадий смарт-процесса DT140_12
   * с фильтрацией по полю UF_CRM_7_TYPE_PRODUCT
   *
   * @param {string|Array<string>} filterValue - Значение фильтра (или массив значений)
   * @param {string} filterField - Поле для фильтрации (по умолчанию 'UF_CRM_7_TYPE_PRODUCT')
   * @param {Function|null} onProgress - Колбэк для отслеживания прогресса (опционально)
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @returns {Promise<Array>} Массив всех тикетов
   */
  static async getAllTicketsByFilter(filterValue, filterField = 'UF_CRM_7_TYPE_PRODUCT', onProgress = null, useCache = true) {
    Logger.info(`Loading tickets by filter: ${filterField} = ${filterValue}`, 'TicketRepository');

    try {
      const allTickets = [];

      // Получаем все стадии DT140_12
      const targetStages = ['DT140_12:UC_0VHWE2', 'DT140_12:PREPARATION', 'DT140_12:CLIENT'];
      const totalStages = targetStages.length;

      for (let i = 0; i < targetStages.length; i++) {
        const stageId = targetStages[i];
        const stageName = this.getStageName(stageId);

        if (onProgress) {
          const baseProgress = (i / totalStages) * 100;
          onProgress({
            step: 'loading_tickets',
            progress: baseProgress,
            details: {
              stage: stageId,
              stageName: stageName,
              stageIndex: i + 1,
              totalStages: totalStages,
              filter: `${filterField} = ${filterValue}`
            }
          });
        }

        try {
          // Получаем тикеты стадии с фильтром
          const stageTickets = await this.getTicketsByStageWithFilter(
            stageId,
            filterValue,
            filterField,
            useCache,
            onProgress ? (batchProgress) => {
              const stageProgress = calculateProgress(
                (i / totalStages) * 100,
                (1 / totalStages) * 100,
                batchProgress.percent || 0
              );

              onProgress({
                step: 'loading_tickets',
                progress: stageProgress,
                details: {
                  stage: stageId,
                  stageName: stageName,
                  stageIndex: i + 1,
                  totalStages: totalStages,
                  count: batchProgress.count,
                  total: batchProgress.total,
                  filter: `${filterField} = ${filterValue}`
                }
              });
            } : null
          );

          allTickets.push(...stageTickets);

        } catch (stageError) {
          Logger.error(`Error loading tickets for stage ${stageId} with filter ${filterField} = ${filterValue}`, 'TicketRepository', stageError);
          // Продолжаем с другими стадиями
        }
      }

      Logger.info(`Loaded ${allTickets.length} tickets with filter ${filterField} = ${filterValue}`, 'TicketRepository');
      return allTickets;

    } catch (error) {
      Logger.error(`Error loading tickets by filter ${filterField} = ${filterValue}`, 'TicketRepository', error);
      throw error;
    }
  }

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
          start: start, // Используем start как смещение (0, 50, 100, ...)
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
          // Bitrix24 API для смарт-процессов может возвращать next в разных форматах:
          // - result.result.next (строка или число)
          // - result.next (на верхнем уровне)
          // - Если получили меньше limit, значит это последняя страница
          // - Если получили ровно limit, проверяем наличие next
          
          // Проверяем наличие поля next в разных местах ответа
          // Bitrix24 для смарт-процессов может возвращать next в result.result.next
          const nextValue = result?.result?.next ?? result?.next;
          
          // hasNext = есть ли поле next (не null, не undefined, не пустая строка, не 0)
          const hasNext = nextValue !== null && 
                         nextValue !== undefined && 
                         nextValue !== '' && 
                         String(nextValue) !== '0';
          
          // Продолжаем загрузку, если:
          // 1. Получили полный батч (limit) И есть next - точно есть ещё данные
          // 2. Если получили меньше limit - это последняя страница (даже если есть next)
          hasMore = batchTickets.length === limit && hasNext;
          
          // Детальное логирование для диагностики
          if (isDiagnosticsEnabled()) {
            Logger.debug(`[Pagination] Stage: ${stageId}, Batch: ${batchTickets.length}, Total: ${allTickets.length}, Start: ${start}, NextValue: ${nextValue}, HasNext: ${hasNext}, HasMore: ${hasMore}`, 'TicketRepository');
          }
          
          // Логирование диагностики (только если включена)
          try {
            const diagnostics = getDiagnosticsService();
            if (diagnostics && isDiagnosticsEnabled()) {
              // Логируем полную структуру ответа для диагностики
              Logger.debug(`[Pagination Debug] Stage: ${stageId}, Batch: ${batchTickets.length}, Total: ${allTickets.length}`, 'TicketRepository', {
                resultStructure: {
                  hasResult: !!result?.result,
                  resultIsArray: Array.isArray(result?.result),
                  hasItems: !!result?.result?.items,
                  hasData: !!result?.result?.data,
                  hasNext: !!nextValue,
                  nextValue: nextValue,
                  nextType: typeof nextValue,
                  resultKeys: result?.result ? Object.keys(result.result) : []
                }
              });
              
              diagnostics.logTicketsLoading(
                stageId,
                batchTickets.length,
                allTickets.length,
                nextValue || null
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
   * Получение тикетов стадии с дополнительным фильтром
   *
   * Аналогично getTicketsByStage, но добавляет фильтр по пользовательскому полю
   *
   * @param {string} stageId - ID стадии
   * @param {string|Array<string>} filterValue - Значение фильтра
   * @param {string} filterField - Поле для фильтрации
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @param {Function|null} onProgress - Колбэк для отслеживания прогресса (опционально)
   * @returns {Promise<Array>} Массив тикетов стадии
   */
  static async getTicketsByStageWithFilter(stageId, filterValue, filterField = 'UF_CRM_7_TYPE_PRODUCT', useCache = true, onProgress = null) {
    Logger.info(`Loading tickets for stage ${stageId} with filter ${filterField} = ${filterValue}`, 'TicketRepository');

    // Создаем уникальный ключ кеша для фильтра
    const cacheKey = `tickets_${stageId}_${filterField}_${JSON.stringify(filterValue)}`;

    // Проверяем кеш
    if (useCache) {
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        Logger.info(`Cache hit for filtered tickets: ${stageId} with ${filterField} = ${filterValue}`, 'TicketRepository');
        if (onProgress) {
          onProgress({
            step: 'loading_tickets',
            percent: 100,
            count: cached.length,
            total: cached.length
          });
        }
        return cached;
      }
    }

    const allTickets = [];
    let start = 0;
    const limit = 50;
    let hasMore = true;
    let totalEstimated = 0;

    // Создаем фильтр для запроса
    const apiFilter = {
      stageId: stageId
    };

    // Добавляем фильтр по пользовательскому полю
    if (Array.isArray(filterValue)) {
      apiFilter[filterField] = filterValue; // Для массива значений
    } else {
      apiFilter[filterField] = filterValue; // Для одиночного значения
    }

    while (hasMore) {
      try {
        const result = await ApiClient.call('crm.item.list', {
          entityTypeId: ENTITY_TYPE_ID,
          filter: apiFilter,
          select: ['*'],
          order: { id: 'DESC' },
          start: start,
          useOriginalUfNames: 'Y'
        });

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

          // Обновляем оценку общего количества
          totalEstimated = Math.max(totalEstimated, start + batchTickets.length);

          if (onProgress) {
            onProgress({
              step: 'loading_tickets',
              percent: Math.min((start / Math.max(totalEstimated, start)) * 100, 95),
              count: start,
              total: totalEstimated
            });
          }

          // Проверяем, есть ли еще данные
          hasMore = batchTickets.length === limit && result.next;
        } else {
          hasMore = false;
        }

      } catch (error) {
        Logger.error(`Error loading batch for stage ${stageId} with filter ${filterField} = ${filterValue}`, 'TicketRepository', error);
        hasMore = false;
        throw error;
      }
    }

    // Кешируем результат
    if (useCache) {
      CacheManager.set(cacheKey, allTickets);
      Logger.info(`Cached ${allTickets.length} filtered tickets for stage ${stageId}`, 'TicketRepository');
    }

    // Диагностика
    try {
      const diagnostics = getDiagnosticsService();
      if (diagnostics && isDiagnosticsEnabled()) {
        diagnostics.logTicketsLoading(
          `${stageId}_${filterValue}`,
          allTickets.length,
          allTickets.length,
          null
        );
      }
    } catch (diagError) {
      Logger.warn('Diagnostics logging error in getTicketsByStageWithFilter', 'TicketRepository', diagError);
    }

    if (onProgress) {
      onProgress({
        step: 'loading_tickets',
        percent: 100,
        count: allTickets.length,
        total: allTickets.length
      });
    }

    Logger.info(`Loaded ${allTickets.length} tickets for stage ${stageId} with filter ${filterField} = ${filterValue}`, 'TicketRepository');
    return allTickets;
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

