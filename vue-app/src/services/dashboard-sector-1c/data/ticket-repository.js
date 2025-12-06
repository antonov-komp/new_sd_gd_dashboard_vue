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
   * @returns {Promise<Array>} Массив всех тикетов
   */
  static async getAllTickets(stageIds) {
    const allTickets = [];
    
    for (const stageId of stageIds) {
      console.log(`Loading tickets for stage: ${stageId}`);
      const stageTickets = await this.getTicketsByStage(stageId);
      allTickets.push(...stageTickets);
      console.log(`Loaded ${stageTickets.length} tickets for stage ${stageId}`);
    }

    return allTickets;
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
   * @returns {Promise<Array>} Массив тикетов стадии
   */
  static async getTicketsByStage(stageId, useCache = true) {
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getTicketsCacheKey(stageId);
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        console.log(`Cache hit for stage ${stageId}`);
        return cached;
      }
    }

    const allTickets = [];
    let start = 0;
    const limit = 50; // Максимум элементов за запрос
    let hasMore = true;

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
          hasMore = batchTickets.length === limit;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error loading tickets batch for stage ${stageId} (start: ${start}):`, error);
        hasMore = false; // Прерываем цикл при ошибке
      }
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

