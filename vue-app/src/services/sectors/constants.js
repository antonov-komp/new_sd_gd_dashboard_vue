/**
 * Константы для секторов и стадий
 *
 * Все секторы используют единые стадии смарт-процесса DT140_12
 * Различие только в поле UF_CRM_7_TYPE_PRODUCT
 */

// Единые стадии DT140_12 для всех секторов
export const UNIFIED_DT140_STAGES = {
  'DT140_12:UC_0VHWE2': {
    name: 'Сформировано обращение',
    color: '#007bff',
    order: 1,
    description: 'Начальная стадия - обращение сформировано'
  },
  'DT140_12:PREPARATION': {
    name: 'Рассмотрение ТЗ',
    color: '#ffc107',
    order: 2,
    description: 'Анализ и рассмотрение технического задания'
  },
  'DT140_12:CLIENT': {
    name: 'Исполнение',
    color: '#28a745',
    order: 3,
    description: 'Выполнение работ и внедрение решений'
  }
};

// Фильтры по секторам для поля UF_CRM_7_TYPE_PRODUCT
export const SECTOR_FILTERS = {
  '1c': '1C',
  'pdm': 'PDM',
  'bitrix24': 'Bitrix24',
  'infrastructure': 'Infrastructure'
};

// Конфигурация секторов
export const SECTOR_CONFIGS = {
  '1c': {
    name: '1C',
    filterValue: SECTOR_FILTERS['1c'],
    stages: UNIFIED_DT140_STAGES,
    realApi: true // Использует реальный Bitrix24 API
  },
  'pdm': {
    name: 'PDM',
    filterValue: SECTOR_FILTERS['pdm'],
    stages: UNIFIED_DT140_STAGES,
    realApi: false // Пока использует тестовые данные
  },
  'bitrix24': {
    name: 'Bitrix24',
    filterValue: SECTOR_FILTERS['bitrix24'],
    stages: UNIFIED_DT140_STAGES,
    realApi: false // Пока использует тестовые данные
  },
  'infrastructure': {
    name: 'Infrastructure',
    filterValue: SECTOR_FILTERS['infrastructure'],
    stages: UNIFIED_DT140_STAGES,
    realApi: false // Пока использует тестовые данные
  }
};

export default {
  UNIFIED_DT140_STAGES,
  SECTOR_FILTERS,
  SECTOR_CONFIGS
};