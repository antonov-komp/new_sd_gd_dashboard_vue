/**
 * Конфигурация значений "В работе" для сектора 1С (поле Bitrix24 `UF_SLA_SERVICE_STR`)
 *
 * Источник значений: текстовое поле смарт‑процесса `UF_SLA_SERVICE_STR`.
 * Документация Bitrix24 REST: https://context7.com/bitrix24/rest/crm.item.list
 *
 * Формат объекта сервиса:
 * {
 *   id: string,              // внутренний ID (kebab/camel)
 *   label: string,           // отображаемое имя
 *   bitrixValue: string|null // значение в Bitrix24 (как приходит из UF), null — для fallback
 *   color: string,           // цвет бордера/акцента
 *   backgroundColor: string, // фон плашки
 *   textColor: string,       // цвет текста
 *   order: number,           // порядок сортировки (меньше — выше)
 *   description?: string     // опционально
 * }
 *
 * Как расширять:
 * 1) Добавьте новый объект в SERVICE_LIST с уникальным id и bitrixValue.
 * 2) Подберите палитру (color/backgroundColor/textColor) с хорошим контрастом.
 * 3) Укажите order для сортировки и описание для контекста.
 * 4) При необходимости обновите UI/мапперы, чтобы использовать новое значение.
 */

const warnedUnknownValues = new Set();

/**
 * Нормализация входного значения (trim + lower case)
 * @param {string|null|undefined} value
 * @returns {string|null}
 */
function normalizeValue(value) {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value).trim().toLowerCase() || null;
}

const SERVICE_LIST = [
  {
    id: '1c-accounting',
    label: '1С.Бухгалтерия',
    bitrixValue: '1С.Бухгалтерия',
    color: '#0d6efd',
    backgroundColor: '#e7f1ff',
    textColor: '#0a58ca',
    order: 1,
    description: 'Бухгалтерский контур 1С'
  },
  {
    id: '1c-tickets',
    label: '1С.Талоны',
    bitrixValue: '1С.Талоны',
    color: '#20c997',
    backgroundColor: '#e6f7f1',
    textColor: '#0f5132',
    order: 2,
    description: 'Работа с талонами 1С'
  },
  {
    id: '1c-zup',
    label: '1С.ЗУП',
    bitrixValue: '1С.ЗУП',
    color: '#6f42c1',
    backgroundColor: '#f4edfd',
    textColor: '#3a275f',
    order: 3,
    description: 'Зарплата и управление персоналом'
  },
  {
    id: '1c-docflow',
    label: '1С.Документооборот',
    bitrixValue: '1С.Документооборот',
    color: '#fd7e14',
    backgroundColor: '#fff3e6',
    textColor: '#b54708',
    order: 4,
    description: 'Документооборот 1С'
  },
  {
    id: '1c-integrations',
    label: '1С.Интеграции',
    bitrixValue: '1С.Интеграции',
    color: '#0ca678',
    backgroundColor: '#e8f7f2',
    textColor: '#0b4f38',
    order: 5,
    description: 'Интеграции и сопряжения 1С'
  }
];

const DEFAULT_SERVICE = {
  id: 'unknown',
  label: 'Не указано',
  bitrixValue: null,
  color: '#ced4da',
  backgroundColor: '#f1f3f5',
  textColor: '#6c757d',
  order: 99,
  description: 'Fallback для пустых или неидентифицированных значений'
};

// Индексы для быстрого доступа
const SERVICE_BY_ID = {};
const SERVICE_BY_BITRIX_VALUE = {};

[...SERVICE_LIST, DEFAULT_SERVICE].forEach((service) => {
  SERVICE_BY_ID[service.id] = service;
  const normalized = normalizeValue(service.bitrixValue);
  if (normalized) {
    SERVICE_BY_BITRIX_VALUE[normalized] = service;
  }
});

/**
 * Вернуть объект сервиса по значению из Bitrix24 UF_SLA_SERVICE_STR
 * @param {string|null|undefined} value
 * @returns {object} Объект сервиса или fallback
 */
export function getServiceByBitrixValue(value) {
  const normalized = normalizeValue(value);

  if (!normalized) {
    return DEFAULT_SERVICE;
  }

  const service = SERVICE_BY_BITRIX_VALUE[normalized];
  if (service) {
    return service;
  }

  if (process.env.NODE_ENV !== 'production' && !warnedUnknownValues.has(normalized)) {
    warnedUnknownValues.add(normalized);
    console.warn('[service-config] Unknown UF_SLA_SERVICE_STR value', value);
  }

  return DEFAULT_SERVICE;
}

/**
 * Вернуть fallback-значение
 * @returns {object}
 */
export function getDefaultService() {
  return DEFAULT_SERVICE;
}

/**
 * Вернуть список всех сервисов (отсортированный по order)
 * @returns {Array<object>}
 */
export function getAllServices() {
  return [...SERVICE_LIST, DEFAULT_SERVICE].sort((a, b) => a.order - b.order);
}

/**
 * Проверка, что значение известно конфигу (по bitrixValue или id)
 * @param {string|null|undefined} value
 * @returns {boolean}
 */
export function isValidService(value) {
  if (value === null || value === undefined) {
    return false;
  }
  const normalized = normalizeValue(value);
  if (!normalized) {
    return false;
  }

  return Boolean(
    SERVICE_BY_ID[normalized] ||
    SERVICE_BY_BITRIX_VALUE[normalized]
  );
}

/**
 * Вспомогательная функция для извлечения цветов по объекту сервиса
 * @param {object} service
 * @returns {{color: string, backgroundColor: string, textColor: string}}
 */
export function getServiceColors(service) {
  const target = service && typeof service === 'object' ? service : DEFAULT_SERVICE;
  return {
    color: target.color || DEFAULT_SERVICE.color,
    backgroundColor: target.backgroundColor || DEFAULT_SERVICE.backgroundColor,
    textColor: target.textColor || DEFAULT_SERVICE.textColor
  };
}

export const SERVICE_CONFIG = {
  BY_ID: SERVICE_BY_ID,
  BY_BITRIX_VALUE: SERVICE_BY_BITRIX_VALUE,
  LIST: getAllServices()
};

export default {
  getServiceByBitrixValue,
  getDefaultService,
  getAllServices,
  isValidService,
  getServiceColors,
  SERVICE_CONFIG
};

