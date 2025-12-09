/**
 * Сервис диагностики для дашборда сектора 1С
 * 
 * Собирает метрики и проблемные тикеты для диагностики
 * неполного отображения тикетов в дашборде
 * 
 * Используется только при включённом диагностическом режиме
 */

/**
 * Класс для сбора диагностических данных
 */
export class DiagnosticsService {
  constructor() {
    this.reset();
  }

  /**
   * Сброс всех диагностических данных
   */
  reset() {
    this.metrics = {
      // Загрузка тикетов
      ticketsLoading: {
        stages: {}, // { stageId: { loaded: 0, batches: [], total: 0 } }
        totalLoaded: 0
      },
      
      // Фильтрация
      filtering: {
        total: 0,
        filtered: 0,
        rejected: [], // Тикеты, не прошедшие фильтр
        tagValueExamples: [] // Примеры значений UF_CRM_7_TYPE_PRODUCT
      },
      
      // Сотрудники
      employees: {
        uniqueIds: [],
        totalUnique: 0,
        ticketsWithoutAssignedById: [],
        ticketsWithAssignedById1051: []
      },
      
      // Группировка
      grouping: {
        distributionByStages: {}, // { stageId: { employees: {}, total: 0 } }
        ticketsNotInColumn: [], // Тикеты, не попавшие в колонку
        unknownStages: [] // Тикеты с неизвестной стадией
      },
      
      // Нулевая точка
      zeroPoint: {
        byStage: {} // { stageId: count }
      }
    };
  }

  /**
   * Логирование загрузки тикетов по стадии
   * 
   * @param {string} stageId - ID стадии
   * @param {number} batchCount - Количество тикетов в батче
   * @param {number} totalLoaded - Всего загружено
   * @param {string|null} next - Значение next из ответа API
   */
  logTicketsLoading(stageId, batchCount, totalLoaded, next = null) {
    if (!this.metrics.ticketsLoading.stages[stageId]) {
      this.metrics.ticketsLoading.stages[stageId] = {
        loaded: 0,
        batches: [],
        total: 0
      };
    }
    
    const stageMetrics = this.metrics.ticketsLoading.stages[stageId];
    stageMetrics.loaded = totalLoaded;
    stageMetrics.batches.push({
      count: batchCount,
      total: totalLoaded,
      next: next
    });
    stageMetrics.total = totalLoaded;
    
    // Обновляем общее количество
    this.metrics.ticketsLoading.totalLoaded = Object.values(this.metrics.ticketsLoading.stages)
      .reduce((sum, stage) => sum + stage.total, 0);
  }

  /**
   * Логирование фильтрации тикетов
   * 
   * @param {number} total - Всего тикетов до фильтрации
   * @param {number} filtered - Отфильтровано тикетов
   * @param {Array} rejectedTickets - Тикеты, не прошедшие фильтр
   * @param {Array} tagValueExamples - Примеры значений UF_CRM_7_TYPE_PRODUCT
   */
  logFiltering(total, filtered, rejectedTickets = [], tagValueExamples = []) {
    this.metrics.filtering.total = total;
    this.metrics.filtering.filtered = filtered;
    this.metrics.filtering.rejected = rejectedTickets.slice(0, 50); // Ограничиваем до 50
    this.metrics.filtering.tagValueExamples = tagValueExamples.slice(0, 20); // Ограничиваем до 20
  }

  /**
   * Логирование извлечения сотрудников
   * 
   * @param {Array<number>} uniqueIds - Уникальные ID сотрудников
   * @param {Array} ticketsWithoutAssignedById - Тикеты без assignedById
   * @param {Array} ticketsWithAssignedById1051 - Тикеты с assignedById=1051
   */
  logEmployees(uniqueIds, ticketsWithoutAssignedById = [], ticketsWithAssignedById1051 = []) {
    this.metrics.employees.uniqueIds = uniqueIds;
    this.metrics.employees.totalUnique = uniqueIds.length;
    this.metrics.employees.ticketsWithoutAssignedById = ticketsWithoutAssignedById.slice(0, 50);
    this.metrics.employees.ticketsWithAssignedById1051 = ticketsWithAssignedById1051.slice(0, 50);
  }

  /**
   * Логирование группировки тикетов
   * 
   * @param {Array} stages - Массив этапов с тикетами
   * @param {Array} ticketsNotInColumn - Тикеты, не попавшие в колонку
   * @param {Array} unknownStages - Тикеты с неизвестной стадией
   */
  logGrouping(stages, ticketsNotInColumn = [], unknownStages = []) {
    // Распределение по стадиям
    stages.forEach(stage => {
      const employeeCounts = {};
      let stageTotal = 0;
      
      stage.employees.forEach(emp => {
        const count = (emp.ticketsInsideSector || []).length + (emp.ticketsOutsideSector || []).length;
        employeeCounts[emp.id] = count;
        stageTotal += count;
      });
      
      this.metrics.grouping.distributionByStages[stage.id] = {
        employees: employeeCounts,
        total: stageTotal
      };
    });
    
    this.metrics.grouping.ticketsNotInColumn = ticketsNotInColumn.slice(0, 50);
    this.metrics.grouping.unknownStages = unknownStages.slice(0, 50);
  }

  /**
   * Логирование нулевой точки
   * 
   * @param {object} zeroPointTickets - Объект с тикетами по стадиям
   */
  logZeroPoint(zeroPointTickets) {
    Object.keys(zeroPointTickets).forEach(stageId => {
      this.metrics.zeroPoint.byStage[stageId] = Array.isArray(zeroPointTickets[stageId])
        ? zeroPointTickets[stageId].length
        : 0;
    });
  }

  /**
   * Получение всех метрик
   * 
   * @returns {object} Объект с метриками
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Получение проблемных тикетов
   * 
   * @returns {object} Объект с проблемными тикетами
   */
  getProblematicTickets() {
    return {
      withoutAssignedById: this.metrics.employees.ticketsWithoutAssignedById,
      withAssignedById1051: this.metrics.employees.ticketsWithAssignedById1051,
      withoutSectorTag: this.metrics.filtering.rejected,
      notInColumn: this.metrics.grouping.ticketsNotInColumn,
      unknownStage: this.metrics.grouping.unknownStages
    };
  }

  /**
   * Экспорт метрик в JSON
   * 
   * @returns {string} JSON-строка с метриками
   */
  exportToJSON() {
    return JSON.stringify({
      metrics: this.metrics,
      problematicTickets: this.getProblematicTickets(),
      timestamp: new Date().toISOString()
    }, null, 2);
  }
}

/**
 * Глобальный экземпляр сервиса диагностики
 */
let diagnosticsInstance = null;

/**
 * Получение экземпляра сервиса диагностики
 * 
 * @returns {DiagnosticsService} Экземпляр сервиса
 */
export function getDiagnosticsService() {
  if (!diagnosticsInstance) {
    diagnosticsInstance = new DiagnosticsService();
  }
  return diagnosticsInstance;
}

/**
 * Проверка, включён ли диагностический режим
 * 
 * @param {object} route - Объект route из Vue Router (опционально)
 * @returns {boolean} true, если диагностика включена
 */
export function isDiagnosticsEnabled(route = null) {
  // Проверяем query-параметр из route (если передан) - это основной способ для Vue Router
  if (route && route.query && route.query.diagnostics === 'true') {
    return true;
  }
  
  // Проверяем hash (для hash mode router)
  // В hash mode URL выглядит так: #/dashboard/sector-1c?diagnostics=true
  if (typeof window !== 'undefined' && window.location) {
    const hash = window.location.hash;
    
    // Парсим hash для извлечения query-параметров
    if (hash) {
      const hashParts = hash.split('?');
      if (hashParts.length > 1) {
        const queryString = hashParts[1];
        const urlParams = new URLSearchParams(queryString);
        if (urlParams.get('diagnostics') === 'true') {
          return true;
        }
      }
      
      // Также проверяем просто наличие в hash (для совместимости)
      if (hash.includes('diagnostics=true')) {
        return true;
      }
    }
    
    // Проверяем обычный query-параметр (на случай, если не hash mode)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('diagnostics') === 'true') {
      return true;
    }
  }
  
  // Проверяем localStorage (для отладки)
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('dashboard-sector-1c-diagnostics') === 'true';
  }
  
  return false;
}

