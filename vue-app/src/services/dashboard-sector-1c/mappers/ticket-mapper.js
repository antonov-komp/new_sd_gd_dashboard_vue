/**
 * Маппер для преобразования тикетов из Bitrix24 в внутренний формат
 * 
 * Для смарт-процессов поля могут быть в нижнем регистре (id, title, stageId, assignedById)
 */

import { mapStageId } from './stage-mapper.js';

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

  return {
    id: id,
    title: title,
    priority: mapPriority(bitrixTicket.priority || bitrixTicket.PRIORITY),
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
 * @param {string} bitrixPriority - Приоритет в Bitrix24
 * @returns {string} Приоритет (high, medium, low)
 */
export function mapPriority(bitrixPriority) {
  const mapping = {
    '3': 'high',
    '2': 'medium',
    '1': 'low'
  };
  return mapping[bitrixPriority] || 'medium';
}

/**
 * Маппинг приоритета на формат Bitrix24
 * 
 * @param {string} priority - Приоритет (high, medium, low)
 * @returns {string} Приоритет в Bitrix24
 */
export function mapPriorityToBitrix(priority) {
  const mapping = {
    'high': '3',
    'medium': '2',
    'low': '1'
  };
  return mapping[priority] || '2';
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

