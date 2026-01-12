/**
 * Константы для дашбордов секторов
 *
 * @version 1.0
 * @since 2026-01-12
 */

// ID типа сущности для смарт-процесса DT140_12
export const ENTITY_TYPE_ID = 140;

// Этапы обработки тикетов (общие для всех секторов)
export const STAGE_IDS = {
  NEW: 'DT140_12:NEW', // Новый
  ANALYSIS: 'DT140_12:ANALYSIS', // Анализ
  DEVELOPMENT: 'DT140_12:DEVELOPMENT', // Разработка
  TESTING: 'DT140_12:TESTING', // Тестирование
  DEPLOYMENT: 'DT140_12:DEPLOYMENT', // Внедрение
  CLOSED: 'DT140_12:CLOSED' // Закрыт
};

// Названия этапов
export const STAGE_NAMES = {
  [STAGE_IDS.NEW]: 'Новый',
  [STAGE_IDS.ANALYSIS]: 'Анализ',
  [STAGE_IDS.DEVELOPMENT]: 'Разработка',
  [STAGE_IDS.TESTING]: 'Тестирование',
  [STAGE_IDS.DEPLOYMENT]: 'Внедрение',
  [STAGE_IDS.CLOSED]: 'Закрыт'
};

// Цвета этапов
export const STAGE_COLORS = {
  [STAGE_IDS.NEW]: '#007bff', // Синий
  [STAGE_IDS.ANALYSIS]: '#ffc107', // Желтый
  [STAGE_IDS.DEVELOPMENT]: '#28a745', // Зеленый
  [STAGE_IDS.TESTING]: '#17a2b8', // Голубой
  [STAGE_IDS.DEPLOYMENT]: '#6f42c1', // Фиолетовый
  [STAGE_IDS.CLOSED]: '#6c757d' // Серый
};

// Поля UF для фильтрации по секторам
export const SECTOR_FILTER_FIELD = 'UF_CRM_7_TYPE_PRODUCT';

// Значения фильтра для секторов
export const SECTOR_FILTER_VALUES = {
  '1c': '1C',
  'pdm': 'PDM',
  'bitrix24': 'Битрикс24',
  'infrastructure': ['Железо', 'Прочее']
};

// Таймауты кеширования (в миллисекундах)
export const CACHE_TIMEOUTS = {
  TICKETS: 5 * 60 * 1000, // 5 минут
  EMPLOYEES: 15 * 60 * 1000, // 15 минут
  STAGES: 60 * 60 * 1000 // 1 час
};

// Лимиты загрузки данных
export const LOAD_LIMITS = {
  TICKETS: 1000,
  EMPLOYEES: 500,
  BATCH_SIZE: 50
};

export default {
  ENTITY_TYPE_ID,
  STAGE_IDS,
  STAGE_NAMES,
  STAGE_COLORS,
  SECTOR_FILTER_FIELD,
  SECTOR_FILTER_VALUES,
  CACHE_TIMEOUTS,
  LOAD_LIMITS
};