/**
 * Маппер для преобразования тикетов из Bitrix24 в внутренний формат
 * 
 * Для смарт-процессов поля могут быть в нижнем регистре (id, title, stageId, assignedById)
 */

import { mapStageId } from './stage-mapper.js';
import {
  DEFAULT_PRIORITY_ID,
  getPriorityByBitrixValue,
  getPriorityById,
  getPriorityColors
} from '@/config/priority-config.js';
import {
  getServiceByBitrixValue,
  getDefaultService,
  getServiceColors
} from '@/config/service-config.js';
import { PRIORITY_MAPPING, PRIORITY_TO_BITRIX } from '../utils/constants.js';

/**
 * Маппинг тикета из Bitrix24 в внутренний формат
 * 
 * @param {object} bitrixTicket - Тикет из Bitrix24 (элемент смарт-процесса)
 * @returns {object} Тикет во внутреннем формате
 */
export function mapTicket(bitrixTicket) {
  // Обрабатываем как верхний, так и нижний регистр полей
  const id = parseInt(bitrixTicket.id || bitrixTicket.ID || 0);
  const title = bitrixTicket.title || bitrixTicket.TITLE || 'Без названия';
  const stageId = bitrixTicket.stageId || bitrixTicket.STAGE_ID || '';
  const assignedById = bitrixTicket.assignedById || bitrixTicket.ASSIGNED_BY_ID || null;
  const createdAt = bitrixTicket.createdTime || bitrixTicket.CREATED_DATE || bitrixTicket.CREATED_TIME || '';
  const updatedAt = bitrixTicket.updatedTime || bitrixTicket.MODIFY_DATE || bitrixTicket.UPDATED_TIME || '';
  
  // Извлечение пользовательского поля UF_SUBJECT
  // Проверяем все возможные варианты именования (как в sector-filter.js)
  const ufSubject = bitrixTicket.UF_SUBJECT || 
                    bitrixTicket.uf_subject || 
                    bitrixTicket.ufSubject ||
                    bitrixTicket['UF_SUBJECT'] ||
                    bitrixTicket['uf_subject'] ||
                    null;

  const priorityRaw =
    bitrixTicket.UF_CRM_7_UF_PRIORITY ||
    bitrixTicket.uf_crm_7_uf_priority ||
    bitrixTicket.ufCrm7UfPriority ||
    bitrixTicket['UF_CRM_7_UF_PRIORITY'] ||
    bitrixTicket['uf_crm_7_uf_priority'] ||
    bitrixTicket.priority ||
    bitrixTicket.PRIORITY ||
    null;

  const priorityObj = getPriorityByBitrixValue(priorityRaw);
  const priorityColors = getPriorityColors(priorityObj);

  const serviceRaw =
    bitrixTicket.UF_SLA_SERVICE_STR ||
    bitrixTicket.uf_sla_service_str ||
    bitrixTicket.UfSlaServiceStr ||
    bitrixTicket.ufSlaServiceStr ||
    bitrixTicket.service || // обратная совместимость, если значение уже маппилось ранее
    null;

  const serviceObj = getServiceByBitrixValue(serviceRaw);
  const serviceColors = getServiceColors(serviceObj);

  return {
    id: id,
    title: title,
    ufSubject: ufSubject,
    priorityId: priorityObj.id,
    priorityLabel: priorityObj.label,
    priorityColors: priorityColors,
    // legacy поле для обратной совместимости
    priority: priorityObj.id,
    priorityBitrixValue: priorityObj.bitrixValue || null,
    service: serviceObj,
    serviceLabel: serviceObj.label,
    serviceColors: serviceColors,
    serviceBitrixValue: serviceObj.bitrixValue || getDefaultService().bitrixValue,
    status: mapStatus(stageId),
    assigneeId: assignedById ? parseInt(assignedById) : null,
    stageId: mapStageId(stageId),
    createdAt: createdAt,
    modifiedAt: updatedAt,
    amount: bitrixTicket.opportunity || bitrixTicket.OPPORTUNITY || 0,
    currency: bitrixTicket.currencyId || bitrixTicket.CURRENCY_ID || 'RUB',
    description: bitrixTicket.comments || bitrixTicket.COMMENTS || ''
  };
}

/**
 * Маппинг приоритета из Bitrix24
 * 
 * @param {string} bitrixPriority - Приоритет в Bitrix24 (UF_CRM_7_UF_PRIORITY)
 * @returns {string} Внутренний id приоритета
 */
export function mapPriority(bitrixPriority) {
  return getPriorityByBitrixValue(bitrixPriority).id;
}

/**
 * Маппинг приоритета на формат Bitrix24
 * 
 * @param {string|object} priority - Приоритет (id или объект)
 * @returns {string|null} Приоритет в Bitrix24 (исходное текстовое значение)
 */
export function mapPriorityToBitrix(priority) {
  if (priority && typeof priority === 'object') {
    return priority.bitrixValue || null;
  }

  const priorityObj = getPriorityById(priority);
  if (priorityObj && priorityObj.bitrixValue) {
    return priorityObj.bitrixValue;
  }

  // fallback: если пришёл старый числовой код — поддерживаем прежнее поведение
  if (PRIORITY_TO_BITRIX[priority]) {
    return PRIORITY_TO_BITRIX[priority];
  }

  return getPriorityById(DEFAULT_PRIORITY_ID).bitrixValue;
}

/**
 * Маппинг значения "В работе" на формат Bitrix24
 *
 * @param {string|object|null|undefined} service - объект сервиса или значение bitrixValue
 * @returns {string|null} Строка для Bitrix24 (UF_SLA_SERVICE_STR)
 */
export function mapServiceToBitrix(service) {
  if (service && typeof service === 'object') {
    return service.bitrixValue || null;
  }

  const serviceObj = getServiceByBitrixValue(service);
  if (serviceObj && serviceObj.bitrixValue) {
    return serviceObj.bitrixValue;
  }

  return getDefaultService().bitrixValue;
}

/**
 * Маппинг статуса
 * 
 * @param {string} bitrixStatus - Статус в Bitrix24
 * @returns {string} Статус (in_progress, new, done, pending)
 */
export function mapStatus(bitrixStatus) {
  // Маппинг статусов Bitrix24
  // Можно расширить в зависимости от конфигурации
  return 'in_progress';
}

