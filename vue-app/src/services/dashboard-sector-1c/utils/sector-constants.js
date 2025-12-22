/**
 * Константы секторов для дашборда сектора 1С
 * 
 * Определяет ID всех секторов и хранителя для разделения тикетов
 * по принадлежности к сектору.
 * 
 * Секторы определяют принадлежность сотрудников к отделам:
 * - Сектор 1С (366) — основной сектор
 * - Сектор Железо (368) — сектор оборудования
 * - Сектор Битрикс24 (369) — сектор Битрикс24
 * - Сектор PDM (367) — сектор PDM
 * - Хранитель (1051) — хранитель нулевой очереди
 */

/**
 * ID секторов
 * 
 * Централизованный объект для управления ID секторов
 */
export const SECTOR_IDS = {
  /** Сектор 1С */
  SECTOR_1C: 366,
  /** Сектор Железо */
  SECTOR_HARDWARE: 368,
  /** Сектор Битрикс24 */
  SECTOR_BITRIX24: 369,
  /** Сектор PDM */
  SECTOR_PDM: 367,
  /** Хранитель нулевой очереди */
  KEEPER: 1051
};

/**
 * Метаданные секторов
 * 
 * Содержит дополнительную информацию о каждом секторе:
 * - id: ID сектора
 * - name: Название сектора
 * - code: Код сектора
 * - isMain: Является ли сектор основным (сектор 1С)
 */
export const SECTOR_METADATA = {
  [SECTOR_IDS.SECTOR_1C]: {
    id: SECTOR_IDS.SECTOR_1C,
    name: 'Сектор 1С',
    code: '1C',
    isMain: true
  },
  [SECTOR_IDS.SECTOR_HARDWARE]: {
    id: SECTOR_IDS.SECTOR_HARDWARE,
    name: 'Сектор Железо',
    code: 'HARDWARE',
    isMain: false
  },
  [SECTOR_IDS.SECTOR_BITRIX24]: {
    id: SECTOR_IDS.SECTOR_BITRIX24,
    name: 'Сектор Битрикс24',
    code: 'BITRIX24',
    isMain: false
  },
  [SECTOR_IDS.SECTOR_PDM]: {
    id: SECTOR_IDS.SECTOR_PDM,
    name: 'Сектор PDM',
    code: 'PDM',
    isMain: false
  }
};

/**
 * Массив всех ID секторов (кроме хранителя)
 * 
 * Используется для проверки принадлежности сотрудника к какому-либо сектору
 */
export const ALL_SECTOR_IDS = [
  SECTOR_IDS.SECTOR_1C,
  SECTOR_IDS.SECTOR_HARDWARE,
  SECTOR_IDS.SECTOR_BITRIX24,
  SECTOR_IDS.SECTOR_PDM
];

/**
 * Массив ID других секторов (не 1С)
 * 
 * Используется для определения сотрудников из других секторов
 */
export const OTHER_SECTOR_IDS = [
  SECTOR_IDS.SECTOR_HARDWARE,
  SECTOR_IDS.SECTOR_BITRIX24,
  SECTOR_IDS.SECTOR_PDM
];

/**
 * ID сектора 1С (для обратной совместимости)
 * 
 * @deprecated Используйте SECTOR_IDS.SECTOR_1C вместо этого
 */
export const SECTOR_1C_ID = SECTOR_IDS.SECTOR_1C;

/**
 * ID сектора Железо (для обратной совместимости)
 * 
 * @deprecated Используйте SECTOR_IDS.SECTOR_HARDWARE вместо этого
 */
export const SECTOR_HARDWARE_ID = SECTOR_IDS.SECTOR_HARDWARE;

/**
 * ID сектора Битрикс24 (для обратной совместимости)
 * 
 * @deprecated Используйте SECTOR_IDS.SECTOR_BITRIX24 вместо этого
 */
export const SECTOR_BITRIX24_ID = SECTOR_IDS.SECTOR_BITRIX24;

/**
 * ID сектора PDM (для обратной совместимости)
 * 
 * @deprecated Используйте SECTOR_IDS.SECTOR_PDM вместо этого
 */
export const SECTOR_PDM_ID = SECTOR_IDS.SECTOR_PDM;

/**
 * ID хранителя нулевой очереди (для обратной совместимости)
 * 
 * Хранитель объектов (ID: 1051) хранит тикеты в нулевой точке
 * и не отображается в колонках сотрудников
 * 
 * @deprecated Используйте SECTOR_IDS.KEEPER вместо этого
 */
export const KEEPER_USER_ID = SECTOR_IDS.KEEPER;

/**
 * Проверка, является ли ID сектором
 * 
 * Проверяет, входит ли указанный ID в список секторов (исключает хранителя).
 * 
 * @param {number} sectorId - ID для проверки
 * @returns {boolean} true, если ID является сектором
 * 
 * @example
 * isSectorId(366); // true (сектор 1С)
 * isSectorId(1051); // false (хранитель, не сектор)
 * isSectorId(999); // false (не сектор)
 */
export function isSectorId(sectorId) {
  return ALL_SECTOR_IDS.includes(sectorId);
}

/**
 * Получение метаданных сектора по ID
 * 
 * Возвращает метаданные сектора (название, код, флаг основного сектора).
 * 
 * @param {number} sectorId - ID сектора
 * @returns {object|null} Метаданные сектора или null, если сектор не найден
 * 
 * @example
 * const metadata = getSectorMetadata(366);
 * // { id: 366, name: 'Сектор 1С', code: '1C', isMain: true }
 */
export function getSectorMetadata(sectorId) {
  return SECTOR_METADATA[sectorId] || null;
}

