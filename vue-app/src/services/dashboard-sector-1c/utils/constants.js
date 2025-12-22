/**
 * Константы для дашборда сектора 1С
 * 
 * Содержит все константы: стадии, приоритеты, статусы, секторы
 */

// Реэкспорт констант секторов для удобства использования
export {
  // Старые константы (для обратной совместимости)
  SECTOR_1C_ID,
  SECTOR_HARDWARE_ID,
  SECTOR_BITRIX24_ID,
  SECTOR_PDM_ID,
  KEEPER_USER_ID,
  ALL_SECTOR_IDS,
  OTHER_SECTOR_IDS,
  // Новые константы
  SECTOR_IDS,
  SECTOR_METADATA,
  // Новые функции
  isSectorId,
  getSectorMetadata
} from './sector-constants.js';

/**
 * ID смарт-процесса сектора 1С
 */
export const ENTITY_TYPE_ID = 140;

/**
 * Глобальный тег определения сектора 1С
 */
export const SECTOR_TAG = '1C';

/**
 * Стадии смарт-процесса 140
 */
export const STAGES = {
  FORMED: {
    id: 'formed',
    name: 'Сформировано обращение',
    color: '#007bff',
    bitrixId: 'DT140_12:UC_0VHWE2'
  },
  REVIEW: {
    id: 'review',
    name: 'Рассмотрение ТЗ',
    color: '#ffc107',
    bitrixId: 'DT140_12:PREPARATION'
  },
  EXECUTION: {
    id: 'execution',
    name: 'Исполнение',
    color: '#28a745',
    bitrixId: 'DT140_12:CLIENT'
  }
};

/**
 * Маппинг ID стадий Bitrix24 на внутренние ID
 */
export const STAGE_ID_MAPPING = {
  'DT140_12:UC_0VHWE2': 'formed',
  'DT140_12:PREPARATION': 'review',
  'DT140_12:CLIENT': 'execution'
};

/**
 * Обратный маппинг внутренних ID на ID стадий Bitrix24
 */
export const STAGE_ID_TO_BITRIX = {
  'formed': 'DT140_12:UC_0VHWE2',
  'review': 'DT140_12:PREPARATION',
  'execution': 'DT140_12:CLIENT'
};

/**
 * Приоритеты тикетов
 */
export const PRIORITIES = {
  HIGH: {
    id: 'high',
    label: 'Высокий',
    bitrixValue: '3'
  },
  MEDIUM: {
    id: 'medium',
    label: 'Средний',
    bitrixValue: '2'
  },
  LOW: {
    id: 'low',
    label: 'Низкий',
    bitrixValue: '1'
  }
};

/**
 * Маппинг приоритетов Bitrix24 на внутренние
 */
export const PRIORITY_MAPPING = {
  '3': 'high',
  '2': 'medium',
  '1': 'low'
};

/**
 * Обратный маппинг приоритетов на Bitrix24
 */
export const PRIORITY_TO_BITRIX = {
  'high': '3',
  'medium': '2',
  'low': '1'
};

/**
 * Статусы тикетов
 */
export const STATUSES = {
  IN_PROGRESS: {
    id: 'in_progress',
    label: 'В работе'
  },
  NEW: {
    id: 'new',
    label: 'Новый'
  },
  DONE: {
    id: 'done',
    label: 'Выполнено'
  },
  PENDING: {
    id: 'pending',
    label: 'Ожидание'
  }
};

/**
 * Получение всех стадий для загрузки
 * 
 * @returns {Array<string>} Массив ID стадий Bitrix24
 */
export function getTargetStages() {
  return [
    STAGES.FORMED.bitrixId,
    STAGES.REVIEW.bitrixId,
    STAGES.EXECUTION.bitrixId
  ];
}

/**
 * Получение стадии по внутреннему ID
 * 
 * @param {string} stageId - Внутренний ID стадии
 * @returns {object|null} Объект стадии или null
 */
export function getStageById(stageId) {
  return Object.values(STAGES).find(stage => stage.id === stageId) || null;
}

/**
 * Получение приоритета по внутреннему ID
 * 
 * @param {string} priorityId - Внутренний ID приоритета
 * @returns {object|null} Объект приоритета или null
 */
export function getPriorityById(priorityId) {
  return Object.values(PRIORITIES).find(priority => priority.id === priorityId) || null;
}

/**
 * Получение статуса по внутреннему ID
 * 
 * @param {string} statusId - Внутренний ID статуса
 * @returns {object|null} Объект статуса или null
 */
export function getStatusById(statusId) {
  return Object.values(STATUSES).find(status => status.id === statusId) || null;
}

/**
 * Флаг отключения drag & drop карточек тикетов.
 * true — drag выключен; false — включить обратно без правок логики.
 */
export const DISABLE_TICKET_DRAG = true;

/**
 * Базовый URL Bitrix24 для создания ссылок на iframe
 */
export const BITRIX24_BASE_URL = 'https://bitrix24.kompo.by';

/**
 * Раздел сервис-деска в Bitrix24
 */
export const SERVISDESK_SECTION = 'servisdeskitotdel';

/**
 * Генерация URL для открытия тикета в iframe Bitrix24
 * 
 * @param {number} ticketId - ID тикета
 * @returns {string} URL для iframe
 * 
 * @example
 * getTicketIframeUrl(5025)
 * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'
 */
export function getTicketIframeUrl(ticketId) {
  return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
}


