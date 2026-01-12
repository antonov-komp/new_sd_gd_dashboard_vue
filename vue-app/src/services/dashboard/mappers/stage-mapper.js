/**
 * Маппер для работы с этапами обработки тикетов
 *
 * Преобразует данные этапов из Bitrix24 в унифицированный формат
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { STAGE_IDS, STAGE_NAMES, STAGE_COLORS } from '../utils/constants.js';
import { Logger } from '../utils/logger.js';

/**
 * Получение целевых этапов для сектора
 *
 * @returns {Array} Массив этапов
 */
export function getTargetStages() {
  return [
    {
      id: STAGE_IDS.NEW,
      name: STAGE_NAMES[STAGE_IDS.NEW],
      color: STAGE_COLORS[STAGE_IDS.NEW],
      order: 1
    },
    {
      id: STAGE_IDS.ANALYSIS,
      name: STAGE_NAMES[STAGE_IDS.ANALYSIS],
      color: STAGE_COLORS[STAGE_IDS.ANALYSIS],
      order: 2
    },
    {
      id: STAGE_IDS.DEVELOPMENT,
      name: STAGE_NAMES[STAGE_IDS.DEVELOPMENT],
      color: STAGE_COLORS[STAGE_IDS.DEVELOPMENT],
      order: 3
    },
    {
      id: STAGE_IDS.TESTING,
      name: STAGE_NAMES[STAGE_IDS.TESTING],
      color: STAGE_COLORS[STAGE_IDS.TESTING],
      order: 4
    },
    {
      id: STAGE_IDS.DEPLOYMENT,
      name: STAGE_NAMES[STAGE_IDS.DEPLOYMENT],
      color: STAGE_COLORS[STAGE_IDS.DEPLOYMENT],
      order: 5
    },
    {
      id: STAGE_IDS.CLOSED,
      name: STAGE_NAMES[STAGE_IDS.CLOSED],
      color: STAGE_COLORS[STAGE_IDS.CLOSED],
      order: 6
    }
  ];
}

/**
 * Получение этапа по ID
 *
 * @param {string} stageId - ID этапа
 * @returns {object|null} Этап или null
 */
export function getStageById(stageId) {
  const stages = getTargetStages();
  return stages.find(stage => stage.id === stageId) || null;
}

/**
 * Получение этапа по названию
 *
 * @param {string} stageName - Название этапа
 * @returns {object|null} Этап или null
 */
export function getStageByName(stageName) {
  const stages = getTargetStages();
  return stages.find(stage => stage.name === stageName) || null;
}

/**
 * Получение цвета этапа
 *
 * @param {string} stageId - ID этапа
 * @returns {string} Цвет этапа или дефолтный
 */
export function getStageColor(stageId) {
  return STAGE_COLORS[stageId] || '#6c757d';
}

/**
 * Сортировка этапов по порядку
 *
 * @param {Array} stages - Массив этапов
 * @returns {Array} Отсортированный массив
 */
export function sortStagesByOrder(stages) {
  return stages.sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Группировка тикетов по этапам
 *
 * @param {Array} tickets - Массив тикетов
 * @returns {object} Объект с группировкой по этапам
 */
export function groupTicketsByStages(tickets) {
  const grouped = {};

  // Инициализируем все этапы
  const stages = getTargetStages();
  stages.forEach(stage => {
    grouped[stage.id] = [];
  });

  // Группируем тикеты
  tickets.forEach(ticket => {
    const stageId = ticket.STAGE_ID || STAGE_IDS.NEW;
    if (grouped[stageId]) {
      grouped[stageId].push(ticket);
    } else {
      // Если этап не найден, помещаем в NEW
      grouped[STAGE_IDS.NEW].push(ticket);
    }
  });

  Logger.debug('Tickets grouped by stages', 'StageMapper', {
    totalTickets: tickets.length,
    stagesCount: Object.keys(grouped).length
  });

  return grouped;
}

export default {
  getTargetStages,
  getStageById,
  getStageByName,
  getStageColor,
  sortStagesByOrder,
  groupTicketsByStages
};