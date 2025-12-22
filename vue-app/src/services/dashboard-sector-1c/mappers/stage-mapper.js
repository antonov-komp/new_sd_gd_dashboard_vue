/**
 * Маппер для преобразования ID этапов между Bitrix24 и внутренним форматом
 * 
 * Использует константы из utils/constants.js
 */

import { STAGE_ID_MAPPING, STAGE_ID_TO_BITRIX, getTargetStages as getTargetStagesFromConstants } from '../utils/constants.js';

/**
 * Маппинг ID этапа Bitrix24 на внутренний ID
 * 
 * @param {string} bitrixStageId - ID этапа в Bitrix24
 * @returns {string} Внутренний ID этапа
 */
export function mapStageId(bitrixStageId) {
  return STAGE_ID_MAPPING[bitrixStageId] || 'formed';
}

/**
 * Маппинг внутреннего ID этапа на ID этапа Bitrix24
 * 
 * @param {string} stageId - Внутренний ID этапа
 * @returns {string} ID этапа в Bitrix24 (смарт-процесс 140)
 */
export function mapStageIdToBitrix(stageId) {
  return STAGE_ID_TO_BITRIX[stageId] || 'DT140_12:UC_0VHWE2';
}

/**
 * Получение списка всех стадий для загрузки
 * 
 * @returns {Array<string>} Массив ID стадий Bitrix24
 */
export function getTargetStages() {
  return getTargetStagesFromConstants();
}

