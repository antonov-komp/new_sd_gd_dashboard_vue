/**
 * Вспомогательные функции для работы с конфигурацией секторов
 *
 * Предоставляет утилиты для нормализации конфигурации секторов,
 * валидации и получения описаний фильтров.
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from './logger.js';

/**
 * Получить нормализованные значения фильтра для сектора
 *
 * Преобразует filterValue сектора в массив строк для фильтрации,
 * обрабатывая различные форматы конфигурации.
 *
 * @param {Object} sectorConfig - Конфигурация сектора из SECTORS_CONFIG
 * @returns {string[]} Массив нормализованных значений фильтра
 *
 * @example
 * // Одиночное значение
 * getSectorFilterValues({ filterValue: '1C' }) // ['1C']
 *
 * // Множественное значение (массив)
 * getSectorFilterValues({ filterValue: ['Железо', 'Прочее'] }) // ['Железо', 'Прочее']
 *
 * // Устаревший формат с filterValues
 * getSectorFilterValues({ filterValues: ['A', 'B'] }) // ['A', 'B']
 */
export function getSectorFilterValues(sectorConfig) {
  try {
    if (!sectorConfig) {
      Logger.warn('getSectorFilterValues: sectorConfig is null or undefined', 'sector-config-helper');
      return [];
    }

    const { filterValue, filterValues, id, name } = sectorConfig;

    // Определяем значения фильтра (поддержка старого и нового форматов)
    let values = null;

    if (Array.isArray(filterValue)) {
      values = filterValue;
    } else if (Array.isArray(filterValues)) {
      values = filterValues; // Устаревший формат для совместимости
    } else if (filterValue !== null && filterValue !== undefined) {
      values = [filterValue];
    }

    if (!values || values.length === 0) {
      Logger.warn(`Sector ${id || 'unknown'} has no filter values`, 'sector-config-helper');
      return [];
    }

    // Фильтруем null/undefined значения
    const filteredValues = values.filter(value =>
      value !== null && value !== undefined && value !== ''
    );

    Logger.debug(`Sector ${id} filter values: ${filteredValues.join(', ')}`, 'sector-config-helper');

    return filteredValues;

  } catch (error) {
    Logger.error(`Error getting filter values for sector ${sectorConfig?.id || 'unknown'}`, 'sector-config-helper', error);
    return [];
  }
}

/**
 * Валидация конфигурации сектора
 *
 * Проверяет наличие обязательных полей и корректность значений.
 *
 * @param {Object} sectorConfig - Конфигурация сектора для валидации
 * @returns {boolean} true если конфигурация валидна
 *
 * @example
 * validateSectorConfig({
 *   id: '1c',
 *   name: '1C',
 *   filterValue: '1C'
 * }) // true
 *
 * validateSectorConfig({
 *   id: 'invalid'
 * }) // false (нет filterValue и name)
 */
export function validateSectorConfig(sectorConfig) {
  if (!sectorConfig || typeof sectorConfig !== 'object') {
    Logger.error('validateSectorConfig: invalid sectorConfig', 'sector-config-helper', sectorConfig);
    return false;
  }

  const requiredFields = ['id', 'name'];
  const hasFilter = sectorConfig.filterValue !== undefined ||
                   (Array.isArray(sectorConfig.filterValues) && sectorConfig.filterValues.length > 0);

  // Проверяем обязательные поля
  for (const field of requiredFields) {
    if (!sectorConfig[field]) {
      Logger.error(`Sector config missing required field: ${field}`, 'sector-config-helper', sectorConfig);
      return false;
    }
  }

  // Проверяем наличие фильтра
  if (!hasFilter) {
    Logger.error('Sector config missing filter value (filterValue or filterValues)', 'sector-config-helper', sectorConfig);
    return false;
  }

  // Проверяем корректность типов
  if (typeof sectorConfig.id !== 'string' || sectorConfig.id.trim() === '') {
    Logger.error('Sector config id must be non-empty string', 'sector-config-helper', sectorConfig);
    return false;
  }

  if (typeof sectorConfig.name !== 'string' || sectorConfig.name.trim() === '') {
    Logger.error('Sector config name must be non-empty string', 'sector-config-helper', sectorConfig);
    return false;
  }

  return true;
}

/**
 * Получить описание фильтра для сектора
 *
 * Формирует человеко-читаемое описание условий фильтрации.
 *
 * @param {Object} sectorConfig - Конфигурация сектора
 * @returns {string} Описание фильтра
 *
 * @example
 * // Одиночное значение
 * getSectorFilterDescription({ filterValue: '1C', filterField: 'UF_CRM_7_TYPE_PRODUCT' })
 * // "UF_CRM_7_TYPE_PRODUCT = '1C'"
 *
 * // Множественное значение
 * getSectorFilterDescription({ filterValue: ['Железо', 'Прочее'] })
 * // "UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')"
 */
export function getSectorFilterDescription(sectorConfig) {
  try {
    const values = getSectorFilterValues(sectorConfig);
    const field = sectorConfig.filterField || 'UF_CRM_7_TYPE_PRODUCT';

    if (values.length === 0) {
      return `${field} = (no filter)`;
    }

    if (values.length === 1) {
      return `${field} = '${values[0]}'`;
    } else {
      return `${field} IN (${values.map(v => `'${v}'`).join(', ')})`;
    }

  } catch (error) {
    Logger.error('Error getting sector filter description', 'sector-config-helper', error);
    return 'Error generating description';
  }
}

/**
 * Нормализация конфигурации сектора
 *
 * Приводит конфигурацию к единому формату, исправляет известные проблемы.
 *
 * @param {Object} sectorConfig - Исходная конфигурация сектора
 * @returns {Object} Нормализованная конфигурация
 *
 * @example
 * // Преобразует устаревший формат
 * normalizeSectorConfig({
 *   filterValues: ['A', 'B'], // старый формат
 *   filterValue: undefined
 * })
 * // { filterValue: ['A', 'B'], filterValues: ['A', 'B'] }
 */
export function normalizeSectorConfig(sectorConfig) {
  if (!sectorConfig) {
    return null;
  }

  const normalized = { ...sectorConfig };

  // Обеспечиваем наличие filterField
  if (!normalized.filterField) {
    normalized.filterField = 'UF_CRM_7_TYPE_PRODUCT';
  }

  // Обеспечиваем наличие filterValue в правильном формате
  if (!normalized.filterValue && Array.isArray(normalized.filterValues)) {
    // Конвертируем старый формат filterValues в filterValue
    normalized.filterValue = normalized.filterValues;
  } else if (normalized.filterValue && !Array.isArray(normalized.filterValue)) {
    // Конвертируем одиночное значение в массив для унификации
    normalized.filterValue = [normalized.filterValue];
  }

  return normalized;
}

/**
 * Получить краткую информацию о секторе для логирования
 *
 * @param {Object} sectorConfig - Конфигурация сектора
 * @returns {Object} Краткая информация
 *
 * @example
 * getSectorInfo({ id: '1c', name: '1C', filterValue: '1C' })
 * // { id: '1c', name: '1C', filterCount: 1, filterDescription: "UF_CRM_7_TYPE_PRODUCT = '1C'" }
 */
export function getSectorInfo(sectorConfig) {
  const values = getSectorFilterValues(sectorConfig);
  const description = getSectorFilterDescription(sectorConfig);

  return {
    id: sectorConfig.id,
    name: sectorConfig.name,
    filterCount: values.length,
    filterDescription: description,
    filterField: sectorConfig.filterField || 'UF_CRM_7_TYPE_PRODUCT'
  };
}

/**
 * Сравнение двух конфигураций секторов
 *
 * Определяет, изменились ли параметры фильтрации сектора.
 *
 * @param {Object} config1 - Первая конфигурация
 * @param {Object} config2 - Вторая конфигурация
 * @returns {boolean} true если конфигурации эквивалентны
 */
export function areSectorConfigsEqual(config1, config2) {
  if (!config1 || !config2) {
    return false;
  }

  // Сравниваем основные поля
  const fieldsToCompare = ['id', 'filterField'];
  for (const field of fieldsToCompare) {
    if (config1[field] !== config2[field]) {
      return false;
    }
  }

  // Сравниваем значения фильтра
  const values1 = getSectorFilterValues(config1).sort();
  const values2 = getSectorFilterValues(config2).sort();

  if (values1.length !== values2.length) {
    return false;
  }

  return values1.every((value, index) => value === values2[index]);
}