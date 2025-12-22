/**
 * Утилиты для работы с прогрессом загрузки данных
 * 
 * Централизованная логика для формирования объектов прогресса,
 * нормализации данных и расчёта процента выполнения
 */

/**
 * Формирование объекта деталей прогресса
 * 
 * Создаёт стандартизированный объект details для колбэков прогресса
 * с поддержкой различных сценариев (загрузка тикетов, фильтрация, группировка и т.д.)
 * 
 * @param {string} step - Название этапа (например, 'loading_tickets')
 * @param {number} progress - Процент выполнения (0-100)
 * @param {object} details - Дополнительные детали этапа
 * @param {string} [details.description] - Описание этапа
 * @param {string} [details.stage] - ID стадии
 * @param {string} [details.stageName] - Название стадии
 * @param {number} [details.stageIndex] - Индекс стадии (1-based)
 * @param {number} [details.totalStages] - Общее количество стадий
 * @param {number} [details.count] - Количество загруженных элементов
 * @param {number} [details.total] - Общее количество элементов
 * @param {number} [details.filteredTickets] - Количество отфильтрованных тикетов
 * @param {number} [details.totalTickets] - Общее количество тикетов
 * @param {number} [details.employeeCount] - Количество сотрудников
 * @param {string} [details.warning] - Предупреждение (если есть)
 * @returns {object} Объект с полями step, progress, details
 * 
 * @example
 * createProgressDetails('loading_tickets', 50, {
 *   stage: 'DT140_12:UC_0VHWE2',
 *   stageName: 'Сформировано обращение',
 *   stageIndex: 1,
 *   totalStages: 3,
 *   description: 'Загрузка тикетов стадии "Сформировано обращение" (1/3)...'
 * });
 */
export function createProgressDetails(step, progress, details = {}) {
  // Валидация
  if (!step || typeof step !== 'string') {
    throw new Error('Step must be a non-empty string');
  }
  
  const progressValue = typeof progress === 'number' && !isNaN(progress)
    ? Math.max(0, Math.min(100, progress))
    : 0;
  
  // Автоматическая генерация description, если не передан
  let description = details.description;
  if (!description) {
    description = generateDescription(step, details);
  }
  
  return {
    step,
    progress: progressValue,
    details: {
      ...details,
      description
    }
  };
}

/**
 * Генерация описания этапа на основе данных
 * 
 * @param {string} step - Название этапа
 * @param {object} details - Детали этапа
 * @returns {string} Описание этапа
 */
function generateDescription(step, details) {
  // Для 'loading_tickets' с stageName и stageIndex
  if (step === 'loading_tickets' && details.stageName && details.stageIndex !== undefined) {
    return `Загрузка тикетов стадии "${details.stageName}" (${details.stageIndex}/${details.totalStages || 1})...`;
  }
  
  // Для 'filtering' с количеством тикетов
  if (step === 'filtering' && details.filteredTickets !== undefined && details.totalTickets !== undefined) {
    return `Фильтрация тикетов: ${details.filteredTickets} из ${details.totalTickets}...`;
  }
  
  // Для 'grouping' с количеством сотрудников
  if (step === 'grouping' && details.employeeCount !== undefined) {
    return `Группировка тикетов по ${details.employeeCount} сотрудникам...`;
  }
  
  // Для других этапов с count и total
  if (details.count !== undefined && details.total !== undefined) {
    return `Обработка: ${details.count} из ${details.total}...`;
  }
  
  // Дефолтное описание
  return 'Загрузка данных...';
}

/**
 * Нормализация данных прогресса
 * 
 * Приводит объект прогресса к стандартному формату:
 * - step (обязательно)
 * - progress (0-100)
 * - details (объект с деталями)
 * 
 * Поддерживает различные варианты входных данных:
 * - { step, progress, details }
 * - { step, percent, details } (percent вместо progress)
 * - { step, stage, stageName, ... } (плоская структура)
 * 
 * @param {object} progressInfo - Объект с данными прогресса
 * @returns {object} Нормализованный объект прогресса с полями: { step, progress, details }
 * 
 * @example
 * normalizeProgressData({
 *   step: 'loading_tickets',
 *   percent: 50,
 *   stage: 'DT140_12:UC_0VHWE2'
 * });
 * // { step: 'loading_tickets', progress: 50, details: { stage: 'DT140_12:UC_0VHWE2' } }
 */
export function normalizeProgressData(progressInfo) {
  if (!progressInfo || typeof progressInfo !== 'object') {
    throw new Error('Progress info must be an object');
  }
  
  const step = progressInfo.step || null;
  if (!step) {
    throw new Error('Step is required in progress info');
  }
  
  // Нормализация progress (может быть progress или percent)
  const progress = progressInfo.progress !== undefined && progressInfo.progress !== null
    ? progressInfo.progress 
    : (progressInfo.percent !== undefined && progressInfo.percent !== null ? progressInfo.percent : undefined);
  
  // Нормализация details
  const details = progressInfo.details || {};
  
  // Если данные в плоской структуре, извлекаем их в details
  if (progressInfo.stage) details.stage = progressInfo.stage;
  if (progressInfo.stageName) details.stageName = progressInfo.stageName;
  if (progressInfo.stageIndex !== undefined) details.stageIndex = progressInfo.stageIndex;
  if (progressInfo.totalStages !== undefined) details.totalStages = progressInfo.totalStages;
  if (progressInfo.count !== undefined) details.count = progressInfo.count;
  if (progressInfo.total !== undefined) details.total = progressInfo.total;
  if (progressInfo.warning) details.warning = progressInfo.warning;
  
  return {
    step,
    progress: progress !== undefined && progress !== null ? Math.max(0, Math.min(100, progress)) : undefined,
    details
  };
}

/**
 * Расчёт прогресса в заданном диапазоне
 * 
 * Вычисляет процент выполнения в заданном диапазоне на основе базового прогресса
 * и процента выполнения текущего этапа.
 * 
 * @param {number} baseProgress - Базовый процент (начало диапазона, 0-100)
 * @param {number} range - Размер диапазона (0-100)
 * @param {number} percent - Процент выполнения текущего этапа (0-100)
 * @returns {number} Итоговый процент выполнения (0-100)
 * 
 * @example
 * // Прогресс загрузки тикетов: 10-50% (базовый 10%, диапазон 40%)
 * // Текущий этап выполнен на 50%
 * calculateProgress(10, 40, 50); // 30 (10 + 40 * 0.5)
 * 
 * @example
 * // Прогресс фильтрации: 50-60% (базовый 50%, диапазон 10%)
 * // Фильтрация завершена
 * calculateProgress(50, 10, 100); // 60
 */
export function calculateProgress(baseProgress, range, percent) {
  const base = typeof baseProgress === 'number' && !isNaN(baseProgress)
    ? Math.max(0, Math.min(100, baseProgress))
    : 0;
  
  const rangeValue = typeof range === 'number' && !isNaN(range)
    ? Math.max(0, Math.min(100, range))
    : 0;
  
  const percentValue = typeof percent === 'number' && !isNaN(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;
  
  const calculated = base + (rangeValue * percentValue / 100);
  return Math.max(0, Math.min(100, calculated));
}

