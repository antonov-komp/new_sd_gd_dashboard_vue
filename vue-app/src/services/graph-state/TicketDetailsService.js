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
        select: ['*'], // Получаем все поля, как в дашборде 1С
        useOriginalUfNames: 'Y' // Использовать оригинальные имена пользовательских полей
      });

      // Обработка разных форматов ответа (как в DashboardSector1CService)
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

      if (!batchTickets || batchTickets.length === 0) {
        console.warn(`[TicketDetailsService] Ticket with ID ${ticketId} not found`);
        return null;
      }

      // Преобразовать через маппер
      const bitrixTicket = batchTickets[0];
      
      // Логирование для отладки
      console.log('[TicketDetailsService] Bitrix24 ticket response:', {
        id: bitrixTicket.id,
        hasUF_CRM_7_DEPARTMENT_HEAD: !!bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD,
        UF_CRM_7_DEPARTMENT_HEAD: bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD,
        allKeys: Object.keys(bitrixTicket),
        ticketSample: JSON.stringify(bitrixTicket).substring(0, 500)
      });
      
      const mappedTicket = mapTicket(bitrixTicket);

      // Для уровня 3 попапа нужен полный departmentHead (без ограничения 17 символов)
      // Получаем оригинальное значение из Bitrix24
      // Проверяем все возможные варианты именования поля
      const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                               bitrixTicket.uf_crm_7_department_head || 
                               bitrixTicket.ufCrm7DepartmentHead ||
                               bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                               bitrixTicket['uf_crm_7_department_head'] ||
                               bitrixTicket['ufCrm7DepartmentHead'] ||
                               null;
      
      console.log('[TicketDetailsService] Extracted departmentHead:', {
        ufDepartmentHead,
        mappedDepartmentHead: mappedTicket.departmentHead,
        departmentHeadFull: ufDepartmentHead ? String(ufDepartmentHead).trim() : null
      });

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
      console.error(`[TicketDetailsService] Error loading ticket details for ID ${ticketId}:`, error);
      console.error('[TicketDetailsService] Error details:', {
        message: error.message,
        stack: error.stack,
        ticketId: ticketId
      });
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
      console.log('[TicketDetailsService] Loading tickets via API:', {
        ticketIdsCount: toLoad.length,
        ticketIdsSample: toLoad.slice(0, 5),
        entityTypeId: ENTITY_TYPE_ID
      });
      
      // Bitrix24 API поддерживает фильтрацию по массиву ID
      // Используем select: ['*'] как в DashboardSector1CService для получения всех полей
      const result = await Bitrix24ApiService.call('crm.item.list', {
        entityTypeId: ENTITY_TYPE_ID,
        filter: {
          id: toLoad
        },
        select: ['*'], // Получаем все поля, как в дашборде 1С
        useOriginalUfNames: 'Y'
      });

      console.log('[TicketDetailsService] API response received:', {
        hasResult: !!result,
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : [],
        hasResultResult: !!result?.result,
        resultResultType: typeof result?.result,
        isArray: Array.isArray(result?.result),
        resultResultLength: Array.isArray(result?.result) ? result.result.length : 'not array',
        fullResult: result
      });

      // Обработка разных форматов ответа (как в DashboardSector1CService)
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

      if (!batchTickets || batchTickets.length === 0) {
        console.warn('[TicketDetailsService] No tickets in API response:', {
          hasResult: !!result,
          hasResultResult: !!result?.result,
          resultType: typeof result?.result,
          result: result,
          resultKeys: result ? Object.keys(result) : []
        });
        return cached;
      }

      // Преобразовать через маппер и сохранить в кеш
      const loaded = batchTickets.map((bitrixTicket, index) => {
        // Логирование для отладки (только для первого тикета, чтобы не засорять консоль)
        if (index === 0) {
          console.log('[TicketDetailsService] Batch response sample (first ticket):', {
            id: bitrixTicket.id,
            hasUF_CRM_7_DEPARTMENT_HEAD: !!bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD,
            UF_CRM_7_DEPARTMENT_HEAD: bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD,
            allKeys: Object.keys(bitrixTicket).filter(k => k.toLowerCase().includes('department') || k.toLowerCase().includes('uf_crm')),
            sampleTicketKeys: Object.keys(bitrixTicket).slice(0, 20) // Первые 20 ключей для отладки
          });
        }
        
        const mappedTicket = mapTicket(bitrixTicket);
        
        // Логирование для отладки (только для первого тикета)
        if (index === 0) {
          console.log('[TicketDetailsService] After mapTicket:', {
            ticketId: mappedTicket.id,
            hasDepartmentHead: !!mappedTicket.departmentHead,
            departmentHead: mappedTicket.departmentHead,
            mappedTicketKeys: Object.keys(mappedTicket).filter(k => k.toLowerCase().includes('department'))
          });
        }

        // Получить полное значение departmentHead
        // Проверяем все возможные варианты именования поля
        const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                                 bitrixTicket.uf_crm_7_department_head || 
                                 bitrixTicket.ufCrm7DepartmentHead ||
                                 bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                                 bitrixTicket['uf_crm_7_department_head'] ||
                                 bitrixTicket['ufCrm7DepartmentHead'] ||
                                 null;

        // Логирование для отладки (только для первого тикета)
        if (index === 0) {
          console.log('[TicketDetailsService] Extracting departmentHead from bitrixTicket:', {
            ufDepartmentHead,
            hasUF_CRM_7_DEPARTMENT_HEAD: !!bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD,
            bitrixTicketKeys: Object.keys(bitrixTicket).filter(k => k.toLowerCase().includes('department') || k.toLowerCase().includes('uf_crm'))
          });
        }

        // Получить полное значение departmentHead (без ограничения 17 символов)
        let departmentHeadFull = null;
        if (ufDepartmentHead) {
          const trimmed = String(ufDepartmentHead).trim();
          if (trimmed.length > 0) {
            departmentHeadFull = trimmed; // Полное значение без ограничений
          }
        }
        
        // Если departmentHeadFull не получен из исходного объекта, 
        // но есть в mappedTicket - используем его (хотя он ограничен 17 символами)
        // Это лучше, чем ничего
        if (!departmentHeadFull && mappedTicket.departmentHead) {
          departmentHeadFull = mappedTicket.departmentHead;
        }

        const ticketDetails = {
          ...mappedTicket,
          // departmentHead уже есть в mappedTicket (ограничен 17 символами)
          // departmentHeadFull - полное значение без ограничений
          departmentHeadFull: departmentHeadFull || mappedTicket.departmentHead || null
        };
        
        // Логирование для отладки (только для первого тикета)
        if (index === 0) {
          console.log('[TicketDetailsService] Final ticket details:', {
            ticketId: ticketDetails.id,
            departmentHead: ticketDetails.departmentHead,
            departmentHeadFull: ticketDetails.departmentHeadFull
          });
        }

        // Сохранить в кеш
        if (ticketDetails.id) {
          ticketDetailsCache.set(ticketDetails.id, ticketDetails);
        }

        return ticketDetails;
      });

      return [...cached, ...loaded];
    } catch (error) {
      console.error('[TicketDetailsService] Error loading tickets details batch:', error);
      console.error('[TicketDetailsService] Error details:', {
        message: error.message,
        stack: error.stack,
        ticketIdsCount: ticketIds.length,
        ticketIdsSample: ticketIds.slice(0, 5)
      });
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




