/**
 * Конфигурация приоритетов для UF_CRM_7_UF_PRIORITY (Bitrix24)
 *
 * Источник значений: поле смарт-процесса `UF_CRM_7_UF_PRIORITY`
 * Документация Bitrix24 REST: https://context7.com/bitrix24/rest/crm.item.list
 *
 * Формат объекта приоритета:
 * {
 *   id: string,              // внутренний ID (kebab/camel)
 *   label: string,           // отображаемое имя
 *   bitrixValue: string|null // значение в Bitrix24 (как приходит из UF), null для fallback
 *   color: string,           // основной цвет (бордер)
 *   backgroundColor: string, // фон чипа
 *   textColor: string,       // цвет текста
 *   order: number,           // порядок сортировки (меньше — выше)
 *   description?: string
 * }
 */

const warnedUnknownValues = new Set();

/**
 * Нормализация входного значения из Bitrix24 (trim + lower case)
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).trim().toLowerCase() || null;
}

const PRIORITY_LIST = [
  {
    id: 'general',
    label: 'Генеральский',
    bitrixValue: 'Генеральский',
    color: '#6f42c1',
    backgroundColor: '#f4edfd',
    textColor: '#3a275f',
    order: 1,
    description: 'Высший приоритет (генеральский уровень)'
  },
  {
    id: 'external',
    label: 'Внешние обстоятельства',
    bitrixValue: 'Внешние обстоятельства',
    color: '#d63384',
    backgroundColor: '#fce8f3',
    textColor: '#8a1c56',
    order: 2,
    description: 'Внешние обстоятельства/блокеры'
  },
  {
    id: 'board',
    label: 'Задачи правления и совета директоров',
    bitrixValue: 'Задачи правления и совета директоров',
    color: '#0d6efd',
    backgroundColor: '#e7f1ff',
    textColor: '#0a58ca',
    order: 3,
    description: 'Задачи правления / совета директоров'
  },
  {
    id: 'errors',
    label: 'Ошибки/сбои',
    bitrixValue: 'Ошибки/сбои',
    color: '#dc3545',
    backgroundColor: '#fdecef',
    textColor: '#8c1b29',
    order: 4,
    description: 'Инциденты, ошибки и сбои'
  },
  {
    id: 'operations',
    label: 'Текущая деятельность',
    bitrixValue: 'Текущая деятельность',
    color: '#6c757d',
    backgroundColor: '#f1f3f5',
    textColor: '#343a40',
    order: 5,
    description: 'Операционная деятельность'
  },
  {
    id: 'projects',
    label: 'Проекты',
    bitrixValue: 'Проекты',
    color: '#198754',
    backgroundColor: '#e9f6ef',
    textColor: '#0f5132',
    order: 6,
    description: 'Проектные задачи'
  },
  {
    id: 'optimization',
    label: 'Оптимизация',
    bitrixValue: 'Оптимизация',
    color: '#ffc107',
    backgroundColor: '#fff8e1',
    textColor: '#8c6d1f',
    order: 7,
    description: 'Оптимизация и улучшения'
  },
];

const DEFAULT_PRIORITY = {
  id: 'unknown',
  label: 'Не указано',
  bitrixValue: null,
  color: '#ced4da',
  backgroundColor: '#f1f3f5',
  textColor: '#6c757d',
  order: 99,
  description: 'Fallback для пустых/неизвестных значений'
};

export const DEFAULT_PRIORITY_ID = DEFAULT_PRIORITY.id;

// Индексы для быстрого доступа
const PRIORITY_BY_ID = {};
const PRIORITY_BY_BITRIX_VALUE = {};

[...PRIORITY_LIST, DEFAULT_PRIORITY].forEach((priority) => {
  PRIORITY_BY_ID[priority.id] = priority;
  const normalized = normalizeValue(priority.bitrixValue);
  if (normalized) {
    PRIORITY_BY_BITRIX_VALUE[normalized] = priority;
  }
});

/**
 * Возвращает объект приоритета по внутреннему id
 * @param {string|null|undefined} id
 * @returns {object} Объект приоритета или fallback
 */
export function getPriorityById(id) {
  if (!id) {
    return DEFAULT_PRIORITY;
  }
  const normalizedId = String(id).trim();
  return PRIORITY_BY_ID[normalizedId] || DEFAULT_PRIORITY;
}

/**
 * Возвращает объект приоритета по значению из Bitrix24 UF_CRM_7_UF_PRIORITY
 * @param {string|null|undefined} value - исходное значение из Bitrix24
 * @returns {object} Объект приоритета или fallback
 */
export function getPriorityByBitrixValue(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return DEFAULT_PRIORITY;
  }

  const priority = PRIORITY_BY_BITRIX_VALUE[normalized];
  if (priority) {
    return priority;
  }

  // Значение не известно — логируем в dev, но не мешаем рантайму
  if (process.env.NODE_ENV !== 'production' && !warnedUnknownValues.has(normalized)) {
    warnedUnknownValues.add(normalized);
    console.warn('[priority] Unknown UF_CRM_7_UF_PRIORITY value', value);
  }

  return DEFAULT_PRIORITY;
}

/**
 * Получить список приоритетов (отсортированный по order)
 * @returns {Array<object>}
 */
export function getPriorityList() {
  return [...PRIORITY_LIST, DEFAULT_PRIORITY].sort((a, b) => a.order - b.order);
}

/**
 * Проверка, что значение известно конфигу (по id или bitrixValue)
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export function isKnownPriority(value) {
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }
  return Boolean(PRIORITY_BY_ID[normalized] || PRIORITY_BY_BITRIX_VALUE[normalized]);
}

/**
 * Удобный доступ к цветам приоритета
 * @param {string|object|null|undefined} priorityLike - id, bitrixValue или объект приоритета
 * @returns {{color: string, backgroundColor: string, textColor: string}}
 */
export function getPriorityColors(priorityLike) {
  if (priorityLike && typeof priorityLike === 'object' && priorityLike.color) {
    return {
      color: priorityLike.color,
      backgroundColor: priorityLike.backgroundColor,
      textColor: priorityLike.textColor
    };
  }

  const priority =
    getPriorityById(priorityLike) ||
    getPriorityByBitrixValue(priorityLike) ||
    DEFAULT_PRIORITY;

  return {
    color: priority.color,
    backgroundColor: priority.backgroundColor,
    textColor: priority.textColor
  };
}

export const PRIORITY_CONFIG = {
  BY_ID: PRIORITY_BY_ID,
  BY_BITRIX_VALUE: PRIORITY_BY_BITRIX_VALUE,
  LIST: getPriorityList()
};

