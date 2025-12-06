/**
 * Публичный API сервиса дашборда сектора 1С
 * 
 * Объединяет все модули (репозитории, мапперы, фильтры, групперы)
 * в единый интерфейс для работы с дашбордом
 * 
 * Используемые методы Bitrix24 REST API:
 * - crm.item.list - получение списка элементов смарт-процесса
 * - crm.item.get - получение детальной информации об элементе
 * - crm.item.update - обновление элемента
 * - crm.item.add - создание элемента
 * - user.get - получение данных сотрудников
 * - crm.timeline.comment.add - добавление комментария
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.list
 * - https://context7.com/bitrix24/rest/crm.item.update
 * - https://context7.com/bitrix24/rest/user.get
 */

import { TicketRepository } from './data/ticket-repository.js';
import { EmployeeRepository } from './data/employee-repository.js';
import { mapTicket } from './mappers/ticket-mapper.js';
import { mapEmployees } from './mappers/employee-mapper.js';
import { mapStageIdToBitrix } from './mappers/stage-mapper.js';
import { getTargetStages } from './mappers/stage-mapper.js';
import { filterBySector } from './filters/sector-filter.js';
import { groupTicketsByStages, getZeroPointTickets, extractUniqueEmployeeIds } from './groupers/ticket-grouper.js';
import { ApiClient } from './data/api-client.js';
import { CacheManager } from './cache/cache-manager.js';
import { ENTITY_TYPE_ID } from './utils/constants.js';
import { TicketDetailsService } from './services/ticket-details-service.js';
import { 
  createProgressDetails, 
  normalizeProgressData,
  calculateProgress 
} from './utils/progress-utils.js';
import { Logger } from './utils/logger.js';

/**
 * Сервис для работы с дашбордом сектора 1С
 */
export class DashboardSector1CService {
  /**
   * Получение данных сектора 1С
   * 
   * Логика:
   * 1. Проверяем кеш данных сектора
   * 2. Если кеш есть - возвращаем из кеша
   * 3. Если кеша нет:
   *    - Получаем все тикеты смарт-процесса 140 (с пагинацией, с кешированием)
   *    - Фильтруем тикеты по тегу сектора 1С
   *    - Из тикетов извлекаем уникальных сотрудников (assignedById)
   *    - Получаем данные только этих сотрудников (с кешированием)
   *    - Раскладываем тикеты по этапам и сотрудникам
   *    - Сохраняем результат в кеш
   * 
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   * @param {Function|null} onProgress - Колбэк для отслеживания прогресса (опционально)
   * @returns {Promise<object>} Данные сектора (stages, employees, zeroPointTickets)
   */
  static async getSectorData(useCache = true, onProgress = null) {
    // Начало загрузки - устанавливаем начальный этап
    if (onProgress) {
      onProgress(createProgressDetails('cache_check', 0, {
        description: 'Инициализация загрузки...'
      }));
    }
    
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getSectorDataCacheKey();
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        if (onProgress) {
          onProgress(createProgressDetails('cache_hit', 100, {
            description: 'Данные загружены из кеша'
          }));
        }
        return cached;
      }
    }

    try {
      // Шаг 1: Получаем все тикеты с пагинацией (с кешированием)
      if (onProgress) {
        onProgress(createProgressDetails('loading_tickets', 10, {
          description: 'Начало загрузки тикетов из Bitrix24...'
        }));
      }
      
      const targetStages = getTargetStages();
      const allTickets = await TicketRepository.getAllTickets(targetStages, (stageProgress) => {
        if (onProgress) {
          // Нормализуем данные прогресса из репозитория
          const normalized = normalizeProgressData(stageProgress);
          
          // Рассчитываем общий прогресс: 10-50% для загрузки тикетов
          const totalProgress = calculateProgress(10, 40, normalized.progress || 0);
          
          // Формируем объект прогресса с деталями
          onProgress(createProgressDetails(
            normalized.step || 'loading_tickets',
            totalProgress,
            {
              ...normalized.details,
              warning: normalized.details.warning
            }
          ));
        }
      });

      // Шаг 2: Фильтруем тикеты по тегу сектора 1С
      if (onProgress) {
        onProgress(createProgressDetails('filtering', 50, {
          totalTickets: allTickets.length,
          description: `Фильтрация ${allTickets.length} тикетов по сектору 1С...`
        }));
      }
      const filteredTickets = filterBySector(allTickets);
      
      if (onProgress) {
        onProgress(createProgressDetails('filtering', 50, {
          totalTickets: allTickets.length,
          filteredTickets: filteredTickets.length,
          description: `Отфильтровано ${filteredTickets.length} тикетов из ${allTickets.length}`
        }));
      }

      // Шаг 3: Извлекаем уникальных сотрудников из тикетов
      if (onProgress) {
        onProgress(createProgressDetails('extracting_employees', 60, {
          filteredTickets: filteredTickets.length,
          description: `Анализ ${filteredTickets.length} тикетов для определения сотрудников...`
        }));
      }
      const uniqueEmployeeIds = extractUniqueEmployeeIds(filteredTickets);
      
      if (onProgress) {
        onProgress(createProgressDetails('extracting_employees', 60, {
          employeeCount: uniqueEmployeeIds.length,
          description: `Найдено ${uniqueEmployeeIds.length} уникальных сотрудников`
        }));
      }

      // Шаг 4: Получаем данные только этих сотрудников (с кешированием)
      if (onProgress) {
        onProgress(createProgressDetails('loading_employees', 65, {
          employeeCount: uniqueEmployeeIds.length,
          description: `Загрузка данных ${uniqueEmployeeIds.length} сотрудников...`
        }));
      }
      const bitrixUsers = await EmployeeRepository.getEmployeesByIds(uniqueEmployeeIds);
      const employees = mapEmployees(bitrixUsers);
      
      if (onProgress) {
        onProgress(createProgressDetails('loading_employees', 90, {
          employeeCount: employees.length,
          description: `Загружено данных ${employees.length} сотрудников`
        }));
      }

      // Шаг 5: Группируем тикеты по этапам и сотрудникам
      if (onProgress) {
        onProgress(createProgressDetails('grouping', 90, {
          filteredTickets: filteredTickets.length,
          employeeCount: employees.length,
          description: `Группировка ${filteredTickets.length} тикетов по этапам и ${employees.length} сотрудникам...`
        }));
      }
      const stages = groupTicketsByStages(filteredTickets, employees);

      const result = {
        stages,
        employees: employees,
        zeroPointTickets: getZeroPointTickets(filteredTickets)
      };

      // Шаг 6: Сохраняем в кеш
      if (onProgress) {
        onProgress(createProgressDetails('caching', 95, {
          description: 'Сохранение результатов в кеш для ускорения следующих загрузок...'
        }));
      }
      if (useCache) {
        const cacheKey = CacheManager.getSectorDataCacheKey();
        CacheManager.set(cacheKey, result, CacheManager.TICKETS_TTL);
      }

      if (onProgress) {
        onProgress(createProgressDetails('complete', 100, {
          description: 'Загрузка завершена'
        }));
      }

      return result;
    } catch (error) {
      Logger.error('Error getting sector data', 'DashboardSector1CService', error);
      if (onProgress) {
        onProgress({
          step: 'error',
          progress: 0,
          error: error.message
        });
      }
      throw error;
    }
  }

  /**
   * Назначение тикета сотруднику
   * 
   * Метод: crm.item.update
   * Документация: https://context7.com/bitrix24/rest/crm.item.update
   * 
   * @param {number} ticketId - ID тикета
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа (внутренний формат: formed, review, execution)
   * @returns {Promise<boolean>} Успешность операции
   */
  static async assignTicket(ticketId, employeeId, stageId) {
    try {
      const bitrixStageId = mapStageIdToBitrix(stageId);
      const result = await TicketRepository.assignTicket(ticketId, employeeId, bitrixStageId);
      
      // Инвалидируем кеш данных сектора после назначения
      if (result) {
        CacheManager.invalidateTicketsCache();
      }
      
      return result;
    } catch (error) {
      Logger.error('Error assigning ticket', 'DashboardSector1CService', error);
      throw error;
    }
  }

  /**
   * Создание нового тикета
   * 
   * Метод: crm.item.add
   * Документация: https://context7.com/bitrix24/rest/crm.item.add
   * 
   * @param {object} ticketData - Данные тикета
   * @param {string} ticketData.title - Название тикета
   * @param {number} ticketData.employeeId - ID сотрудника (опционально)
   * @param {string} ticketData.stageId - ID этапа (внутренний формат: formed, review, execution)
   * @returns {Promise<number>} ID созданного тикета
   */
  static async createTicket(ticketData) {
    try {
      const bitrixStageId = mapStageIdToBitrix(ticketData.stageId || 'formed');
      
      const fields = {
        title: ticketData.title,
        stageId: bitrixStageId
      };

      if (ticketData.employeeId) {
        fields.assignedById = ticketData.employeeId;
      }

      const ticketId = await TicketRepository.createTicket(fields);
      
      // Инвалидируем кеш данных сектора после создания
      if (ticketId > 0) {
        CacheManager.invalidateTicketsCache();
      }
      
      return ticketId;
    } catch (error) {
      Logger.error('Error creating ticket', 'DashboardSector1CService', error);
      throw error;
    }
  }

  /**
   * Получение детальной информации о тикете
   * 
   * Метод: crm.item.get
   * Документация: https://context7.com/bitrix24/rest/crm.item.get
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<object>} Данные тикета во внутреннем формате
   */
  static async getTicket(ticketId) {
    try {
      const bitrixTicket = await TicketRepository.getTicket(ticketId);
      return mapTicket(bitrixTicket);
    } catch (error) {
      Logger.error('Error getting ticket', 'DashboardSector1CService', error);
      throw error;
    }
  }

  /**
   * Получение полных данных по тикету
   * 
   * Использует TicketDetailsService для получения всех полей тикета,
   * включая дополнительные пользовательские поля (UF_*).
   * 
   * Метод: crm.item.get
   * Документация: https://context7.com/bitrix24/rest/crm.item.get
   * 
   * @param {number} ticketId - ID тикета
   * @param {object} options - Опции получения данных
   * @param {Array<string>} options.select - Список полей для получения (по умолчанию ['*'] - все поля)
   * @param {boolean} options.useOriginalUfNames - Использовать оригинальные имена пользовательских полей (по умолчанию true)
   * @returns {Promise<object>} Полные данные тикета
   */
  static async getTicketDetails(ticketId, options = {}) {
    try {
      return await TicketDetailsService.getTicketDetails(ticketId, options);
    } catch (error) {
      Logger.error('Error getting ticket details', 'DashboardSector1CService', error);
      throw error;
    }
  }

  /**
   * Добавление комментария к тикету
   * 
   * Метод: crm.timeline.comment.add
   * Документация: https://context7.com/bitrix24/rest/crm.timeline.comment.add
   * 
   * @param {number} ticketId - ID тикета
   * @param {string} comment - Текст комментария
   * @returns {Promise<boolean>} Успешность операции
   */
  static async addComment(ticketId, comment) {
    try {
      const result = await ApiClient.call('crm.timeline.comment.add', {
        fields: {
          entityId: ticketId,
          entityType: 'DYNAMIC_' + ENTITY_TYPE_ID, // Для смарт-процессов используется префикс DYNAMIC_
          comment: comment
        }
      });

      return result.result !== undefined;
    } catch (error) {
      Logger.error('Error adding comment', 'DashboardSector1CService', error);
      throw error;
    }
  }
}

