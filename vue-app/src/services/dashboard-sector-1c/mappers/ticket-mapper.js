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
 * Используется метод Bitrix24 REST API: crm.item.list
 * Документация: https://context7.com/bitrix24/rest/crm.item.list
 * 
 * @param {object} bitrixTicket - Тикет из Bitrix24 (элемент смарт-процесса)
 * @returns {object} Тикет во внутреннем формате
 * @property {number} id - ID тикета
 * @property {string} title - Название тикета
 * @property {string|null} ufSubject - Тема тикета из UF_SUBJECT
 * @property {string|null} departmentHead - Отдел заказчика из UF_CRM_7_DEPARTMENT_HEAD (ограничено 17 символами)
 * @property {string} priorityId - Внутренний id приоритета
 * @property {string} priorityLabel - Отображаемое значение приоритета
 * @property {Object} priorityColors - Цвета приоритета
 * @property {Object} service - Объект сервиса
 * @property {string} serviceLabel - Отображаемое значение сервиса
 * @property {Object} serviceColors - Цвета сервиса
 * @property {string|null} actionStr - Значение UF_ACTION_STR (динамичная строка, практически всегда заполнена)
 * @property {string} status - Статус тикета
 * @property {number|null} assigneeId - ID назначенного сотрудника
 * @property {string} stageId - ID стадии
 * @property {string} createdAt - Дата создания
 * @property {string} modifiedAt - Дата изменения
 * @property {number} amount - Сумма
 * @property {string} currency - Валюта
 * @property {string} description - Описание тикета
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

  // Извлечение пользовательского поля UF_CRM_7_DEPARTMENT_HEAD (отдел заказчика)
  // Проверяем все возможные варианты именования (по аналогии с UF_CRM_7_UF_PRIORITY)
  const ufDepartmentHead = bitrixTicket.UF_CRM_7_DEPARTMENT_HEAD || 
                           bitrixTicket.uf_crm_7_department_head || 
                           bitrixTicket.ufCrm7DepartmentHead ||
                           bitrixTicket['UF_CRM_7_DEPARTMENT_HEAD'] ||
                           bitrixTicket['uf_crm_7_department_head'] ||
                           null;

  // Нормализация значения отдела заказчика: trim и ограничение 17 символов
  // Если значение пустое или null — возвращаем null
  let departmentHead = null;
  let departmentHeadFull = null; // Полное значение без ограничений
  if (ufDepartmentHead) {
    const trimmed = String(ufDepartmentHead).trim();
    if (trimmed.length > 0) {
      // Полное значение без ограничений (для попапа)
      departmentHeadFull = trimmed;
      // Ограничиваем длину до 17 символов (для отображения в карточках)
      departmentHead = trimmed.length > 17 ? trimmed.substring(0, 17) : trimmed;
    }
  }

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

  // Извлечение пользовательского поля UF_ACTION_STR
  // Проверяем все возможные варианты именования (как в других UF-полях)
  const ufActionStrRaw =
    bitrixTicket.UF_ACTION_STR ||
    bitrixTicket.uf_action_str ||
    bitrixTicket.UfActionStr ||
    bitrixTicket.ufActionStr ||
    bitrixTicket['UF_ACTION_STR'] ||
    bitrixTicket['uf_action_str'] ||
    null;

  // Нормализация значения: trim и проверка на пустоту
  const ufActionStr = ufActionStrRaw ? String(ufActionStrRaw).trim() : null;
  const actionStr = (ufActionStr && ufActionStr.length > 0) ? ufActionStr : null;

  return {
    id: id,
    title: title,
    ufSubject: ufSubject,
    departmentHead: departmentHead, // Ограниченное значение (17 символов) для отображения
    departmentHeadFull: departmentHeadFull, // Полное значение без ограничений для попапа
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
    actionStr: actionStr,
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

