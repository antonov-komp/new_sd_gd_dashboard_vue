/**
 * Вспомогательные функции для работы с секторами
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { Logger } from './logger.js';

/**
 * Очистка кеша сектора
 *
 * @param {string} sectorId - ID сектора
 */
export function clearSectorCache(sectorId) {
  try {
    // Очистка localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`sector-${sectorId}-`)) {
        localStorage.removeItem(key);
      }
    });

    // Очистка sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (key.startsWith(`sector-${sectorId}-`)) {
        sessionStorage.removeItem(key);
      }
    });

    Logger.info(`Sector cache cleared for: ${sectorId}`, 'SectorHelper');
  } catch (error) {
    Logger.error(`Failed to clear sector cache for: ${sectorId}`, 'SectorHelper', error);
  }
}

/**
 * Получение настроек сектора
 *
 * @param {string} sectorId - ID сектора
 * @returns {object} Настройки сектора
 */
export function getSectorSettings(sectorId) {
  const defaultSettings = {
    cacheEnabled: true,
    cacheTimeout: 5 * 60 * 1000, // 5 минут
    autoRefresh: false,
    autoRefreshInterval: 30 * 1000, // 30 секунд
    showZeroPointTickets: true,
    showEmployeeStats: true,
    maxTicketsPerStage: 50
  };

  try {
    const stored = localStorage.getItem(`sector-${sectorId}-settings`);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    Logger.error(`Failed to load sector settings for: ${sectorId}`, 'SectorHelper', error);
  }

  return defaultSettings;
}

/**
 * Сохранение настроек сектора
 *
 * @param {string} sectorId - ID сектора
 * @param {object} settings - Настройки сектора
 */
export function saveSectorSettings(sectorId, settings) {
  try {
    localStorage.setItem(`sector-${sectorId}-settings`, JSON.stringify(settings));
    Logger.info(`Sector settings saved for: ${sectorId}`, 'SectorHelper');
  } catch (error) {
    Logger.error(`Failed to save sector settings for: ${sectorId}`, 'SectorHelper', error);
  }
}

/**
 * Получение ключа для кеширования данных сектора
 *
 * @param {string} sectorId - ID сектора
 * @param {string} dataType - Тип данных
 * @param {object} params - Параметры запроса
 * @returns {string} Ключ кеша
 */
export function getSectorCacheKey(sectorId, dataType, params = {}) {
  const paramsStr = Object.keys(params).sort().map(key =>
    `${key}:${JSON.stringify(params[key])}`
  ).join('|');

  return `sector-${sectorId}-${dataType}-${paramsStr}`;
}

/**
 * Проверка доступности сектора
 *
 * @param {string} sectorId - ID сектора
 * @returns {boolean} true если сектор доступен
 */
export function isSectorAvailable(sectorId) {
  const availableSectors = ['1c', 'pdm', 'bitrix24', 'infrastructure'];
  return availableSectors.includes(sectorId);
}

/**
 * Получение названия сектора
 *
 * @param {string} sectorId - ID сектора
 * @returns {string} Название сектора
 */
export function getSectorDisplayName(sectorId) {
  const names = {
    '1c': '1С',
    'pdm': 'PDM',
    'bitrix24': 'Битрикс24',
    'infrastructure': 'Инфраструктура'
  };

  return names[sectorId] || sectorId;
}

/**
 * Получение цвета сектора
 *
 * @param {string} sectorId - ID сектора
 * @returns {string} Цвет сектора
 */
export function getSectorColor(sectorId) {
  const colors = {
    '1c': '#007bff',
    'pdm': '#28a745',
    'bitrix24': '#ffc107',
    'infrastructure': '#dc3545'
  };

  return colors[sectorId] || '#6c757d';
}

export default {
  clearSectorCache,
  getSectorSettings,
  saveSectorSettings,
  getSectorCacheKey,
  isSectorAvailable,
  getSectorDisplayName,
  getSectorColor
};