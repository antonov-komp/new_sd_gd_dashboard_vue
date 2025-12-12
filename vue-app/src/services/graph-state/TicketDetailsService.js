/**
 * Сервис для загрузки деталей тикетов через Bitrix24 REST API
 * 
 * Используется для получения полной информации о тикетах (stageId, departmentHead),
 * которая отсутствует в слепках версии 1.0.
 * 
 * Метод Bitrix24 REST API: crm.item.list
 * Документация: https://context7.com/bitrix24/rest/crm.item.list
 * 
 * Дата создания: 2025-12-12 (UTC+3, Брест)
 * Задача: TASK-033-01
 */

import { Bitrix24ApiService } from '@/services/bitrix24-api.js';
import { mapTicket } from '@/services/dashboard-sector-1c/mappers/ticket-mapper.js';

/**
 * ID смарт-процесса сектора 1С в Bitrix24
 */
const ENTITY_TYPE_ID = 140;

/**
 * Кеш для деталей тикетов
 * Ключ: ID тикета, Значение: объект тикета с полными данными
 */
const ticketDetailsCache = new Map();

/**
 * Получить детали тикета из кеша или загрузить через API
 * 
 * @param {number} ticketId - ID тикета
 * @returns {Promise<Object|null>} Детали тикета или null при ошибке
 */
async function getTicketDetails(ticketId) {
  // Проверка кеша
  if (ticketDetailsCache.has(ticketId)) {
    return ticketDetailsCache.get(ticketId);
  }
  
  // Загрузка через API
  try {
    const details = await TicketDetailsService.getTicketDetails(ticketId);
    
    // Сохранение в кеш
    if (details) {
      ticketDetailsCache.set(ticketId, details);
    }
    
    return details;
  } catch (error) {
    console.error(`Error loading ticket details for ID ${ticketId}:`, error);
    return null;
  }
}

/**
 * Сервис для загрузки деталей тикетов
 */
class TicketDetailsService {
  /**
   * Получить детали одного тикета
   * 
   * @param {number} ticketId - ID тикета
   * @returns {Promise<Object|null>} Детали тикета или null при ошибке
   */
  static async getTicketDetails(ticketId) {
    if (!ticketId) {
      console.warn('Ticket ID is required');
      return null;
    }

    try {
      const result = await Bitrix24ApiService.call('crm.item.list', {
        entityTypeId: ENTITY_TYPE_ID,
        filter: {
          id: ticketId
        },
        select: [
          'id',
          'title',
          'stageId',
          'UF_CRM_7_DEPARTMENT_HEAD',
          'createdTime',
          'assignedById'
        ],
        useOriginalUfNames: 'Y' // Использовать оригинальные имена пользовательских полей
      });

      if (!result.result || result.result.length === 0) {
        console.warn(`Ticket with ID ${ticketId} not found`);
        return null;
      }

      // Преобразовать через маппер
      const bitrixTicket = result.result[0];
      const mappedTicket = mapTicket(bitrixTicket);

      // Для уровня 3 попапа нужен полный departmentHead (без ограничения 17 символов)
      // Получаем оригинальное значение из Bitrix24
      const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                               bitrixTicket.uf_crm_7_department_head || 
                               bitrixTicket.ufCrm7DepartmentHead ||
                               bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                               bitrixTicket['uf_crm_7_department_head'] ||
                               null;

      // Нормализация: только trim, без ограничения длины
      let departmentHeadFull = null;
      if (ufDepartmentHead) {
        const trimmed = String(ufDepartmentHead).trim();
        if (trimmed.length > 0) {
          departmentHeadFull = trimmed; // Полное значение без ограничений
        }
      }

      // Добавляем полное значение departmentHead
      return {
        ...mappedTicket,
        departmentHeadFull: departmentHeadFull // Полное значение для уровня 3
      };
    } catch (error) {
      console.error(`Error loading ticket details for ID ${ticketId}:`, error);
      return null;
    }
  }

  /**
   * Получить детали нескольких тикетов (батч-загрузка)
   * 
   * @param {Array<number>} ticketIds - Массив ID тикетов
   * @returns {Promise<Array>} Массив деталей тикетов
   */
  static async getTicketsDetails(ticketIds) {
    if (!ticketIds || !Array.isArray(ticketIds) || ticketIds.length === 0) {
      return [];
    }

    // Разделить на закешированные и незакешированные
    const cached = [];
    const toLoad = [];

    ticketIds.forEach(id => {
      if (ticketDetailsCache.has(id)) {
        cached.push(ticketDetailsCache.get(id));
      } else {
        toLoad.push(id);
      }
    });

    // Если все закешированы, вернуть из кеша
    if (toLoad.length === 0) {
      return cached;
    }

    // Загрузить незакешированные (батч-запрос)
    try {
      // Bitrix24 API поддерживает фильтрацию по массиву ID
      const result = await Bitrix24ApiService.call('crm.item.list', {
        entityTypeId: ENTITY_TYPE_ID,
        filter: {
          id: toLoad
        },
        select: [
          'id',
          'title',
          'stageId',
          'UF_CRM_7_DEPARTMENT_HEAD',
          'createdTime',
          'assignedById'
        ],
        useOriginalUfNames: 'Y'
      });

      if (!result.result || !Array.isArray(result.result)) {
        console.warn('Invalid response from Bitrix24 API');
        return cached;
      }

      // Преобразовать через маппер и сохранить в кеш
      const loaded = result.result.map(bitrixTicket => {
        const mappedTicket = mapTicket(bitrixTicket);

        // Получить полное значение departmentHead
        const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                                 bitrixTicket.uf_crm_7_department_head || 
                                 bitrixTicket.ufCrm7DepartmentHead ||
                                 bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                                 bitrixTicket['uf_crm_7_department_head'] ||
                                 null;

        let departmentHeadFull = null;
        if (ufDepartmentHead) {
          const trimmed = String(ufDepartmentHead).trim();
          if (trimmed.length > 0) {
            departmentHeadFull = trimmed;
          }
        }

        const ticketDetails = {
          ...mappedTicket,
          departmentHeadFull: departmentHeadFull
        };

        // Сохранить в кеш
        if (ticketDetails.id) {
          ticketDetailsCache.set(ticketDetails.id, ticketDetails);
        }

        return ticketDetails;
      });

      return [...cached, ...loaded];
    } catch (error) {
      console.error('Error loading tickets details batch:', error);
      return cached; // Вернуть хотя бы закешированные
    }
  }

  /**
   * Очистка кеша (при необходимости)
   * 
   * @param {number} maxSize - Максимальный размер кеша (по умолчанию 1000)
   */
  static clearCache(maxSize = 1000) {
    if (ticketDetailsCache.size > maxSize) {
      ticketDetailsCache.clear();
    }
  }

  /**
   * Получить размер кеша
   * 
   * @returns {number} Количество элементов в кеше
   */
  static getCacheSize() {
    return ticketDetailsCache.size;
  }
}

export default TicketDetailsService;
