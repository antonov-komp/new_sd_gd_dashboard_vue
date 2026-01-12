/**
 * Сервис для работы с сотрудниками сектора 1С
 * 
 * Использует Bitrix24 REST API: user.get
 * Документация: https://context7.com/bitrix24/rest/user.get
 * 
 * Фильтрует сотрудников по подразделению сектора 1С (ID: 366)
 * 
 * Дата создания: 2025-12-11 (UTC+3, Брест)
 */

import { DashboardBitrix24Facade } from '@/services/facades/DashboardBitrix24Facade.js';
import { SECTOR_IDS } from '@/services/dashboard-sector-1c/utils/sector-constants.js';

// Константы
const DEFAULT_LIMIT = 20;
const CACHE_TTL = 5 * 60 * 1000; // 5 минут
const DEBOUNCE_DELAY = 300; // 300ms

/**
 * Получение списка сотрудников сектора 1С
 * 
 * Фильтрует сотрудников по подразделению сектора 1С (ID: 366)
 * 
 * @param {Object} options - Параметры запроса
 * @param {string} options.search - Поисковый запрос (по ФИО/должности)
 * @param {number} options.limit - Лимит результатов (по умолчанию 20)
 * @param {number|Array} options.sectorDepartmentId - ID подразделения (по умолчанию 366 - сектор 1С)
 * @returns {Promise<Array>} Массив сотрудников в формате { id, name, position, department }
 */
export async function fetchEmployees({
  search = '',
  limit = DEFAULT_LIMIT,
  sectorDepartmentId = SECTOR_IDS.SECTOR_1C // По умолчанию фильтр по сектору 1С (366)
} = {}) {
  // Проверка кеша
  const cacheKey = `sector1c_employees_${search}_${limit}_${sectorDepartmentId || 'all'}`;
  const cached = sessionStorage.getItem(cacheKey);
  
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) {
        return data;
      }
    } catch (e) {
      // Игнорируем ошибки парсинга кеша
      console.warn('[sector1cEmployees] Cache parse error:', e);
    }
  }
  
  try {
    // Фильтр для Bitrix24 API
    const filter = {
      'ACTIVE': 'Y'
    };
    
    // Фильтр по подразделению сектора 1С
    // В Bitrix24 UF_DEPARTMENT может быть массивом или числом
    // По умолчанию используем SECTOR_IDS.SECTOR_1C (366)
    if (sectorDepartmentId) {
      if (Array.isArray(sectorDepartmentId)) {
        filter['UF_DEPARTMENT'] = sectorDepartmentId;
      } else {
        // Bitrix24 может принимать как число, так и массив
        // Используем массив для совместимости
        filter['UF_DEPARTMENT'] = [sectorDepartmentId];
      }
    } else {
      // Если не указан, используем сектор 1С по умолчанию
      filter['UF_DEPARTMENT'] = [SECTOR_IDS.SECTOR_1C];
    }
    
    // Поиск по ФИО/должности (минимум 2 символа)
    if (search && search.length >= 2) {
      // Bitrix24 поддерживает поиск через % для частичного совпадения
      filter['%NAME'] = search;
      filter['%LAST_NAME'] = search;
      filter['%WORK_POSITION'] = search;
    }
    
    // Вызов через DashboardBitrix24Facade
    const facade = new DashboardBitrix24Facade();
    const result = await facade.call('user.get', {
      filter: filter,
      select: [
        'ID',
        'NAME',
        'LAST_NAME',
        'SECOND_NAME',
        'WORK_POSITION',
        'UF_DEPARTMENT'
      ],
      order: {
        'LAST_NAME': 'ASC',
        'NAME': 'ASC'
      },
      start: 0
    });
    
    // Обработка результата
    const users = result.result || [];
    
    // Маппинг в формат приложения
    const employees = users
      .slice(0, limit)
      .map(user => ({
        id: parseInt(user.ID),
        name: formatFullName(user),
        position: user.WORK_POSITION || '',
        department: user.UF_DEPARTMENT || null
      }));
    
    // Сохранение в кеш
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify({
        data: employees,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Игнорируем ошибки записи в sessionStorage (может быть переполнен)
      console.warn('[sector1cEmployees] Cache write error:', e);
    }
    
    return employees;
  } catch (error) {
    console.error('[sector1cEmployees] Ошибка загрузки сотрудников:', error);
    throw new Error(`Не удалось загрузить сотрудников: ${error.message}`);
  }
}

/**
 * Форматирование полного имени сотрудника
 * 
 * @param {Object} user - Объект пользователя из Bitrix24
 * @returns {string} Полное имя
 */
function formatFullName(user) {
  const parts = [
    user.LAST_NAME,
    user.NAME,
    user.SECOND_NAME
  ].filter(Boolean);
  
  return parts.length > 0
    ? parts.join(' ')
    : user.NAME || 'Без имени';
}

/**
 * Очистка кеша сотрудников
 */
export function clearEmployeesCache() {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('sector1c_employees_')) {
        sessionStorage.removeItem(key);
      }
    });
  } catch (e) {
    console.warn('[sector1cEmployees] Cache clear error:', e);
  }
}

/**
 * Дебаунс-обёртка для поиска
 * 
 * @param {Function} callback - Функция для вызова
 * @param {number} delay - Задержка в миллисекундах (по умолчанию 300ms)
 * @returns {Function} Дебаунсированная функция
 */
export function debounceSearch(callback, delay = DEBOUNCE_DELAY) {
  let timeoutId;
  
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback.apply(this, args), delay);
  };
}

