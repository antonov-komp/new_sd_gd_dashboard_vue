/**
 * Маппер для преобразования ID этапов между Bitrix24 и внутренним форматом
 * 
 * Стадии смарт-процесса 140:
 * - DT140_12:UC_0VHWE2 - Сформировано обращение
 * - DT140_12:PREPARATION - Рассмотрение ТЗ
 * - DT140_12:CLIENT - Исполнение
 */

/**
 * Маппинг ID этапа Bitrix24 на внутренний ID
 * 
 * @param {string} bitrixStageId - ID этапа в Bitrix24
 * @returns {string} Внутренний ID этапа
 */
export function mapStageId(bitrixStageId) {
  const mapping = {
    'DT140_12:UC_0VHWE2': 'formed',      // Сформировано обращение
    'DT140_12:PREPARATION': 'review',    // Рассмотрение ТЗ
    'DT140_12:CLIENT': 'execution'        // Исполнение
  };
  
  return mapping[bitrixStageId] || 'formed';
}

/**
 * Маппинг внутреннего ID этапа на ID этапа Bitrix24
 * 
 * @param {string} stageId - Внутренний ID этапа
 * @returns {string} ID этапа в Bitrix24 (смарт-процесс 140)
 */
export function mapStageIdToBitrix(stageId) {
  const mapping = {
    'formed': 'DT140_12:UC_0VHWE2',      // Сформировано обращение
    'review': 'DT140_12:PREPARATION',     // Рассмотрение ТЗ
    'execution': 'DT140_12:CLIENT'        // Исполнение
  };
  return mapping[stageId] || 'DT140_12:UC_0VHWE2';
}

/**
 * Получение списка всех стадий для загрузки
 * 
 * @returns {Array<string>} Массив ID стадий Bitrix24
 */
export function getTargetStages() {
  return [
    'DT140_12:UC_0VHWE2',    // Сформировано обращение
    'DT140_12:PREPARATION',   // Рассмотрение ТЗ
    'DT140_12:CLIENT'          // Исполнение
  ];
}

