/**
 * Универсальный сервис дашборда сектора
 *
 * Работает с любым сектором (1С, PDM, Битрикс24, Инфраструктура)
 * Использует универсальные адаптеры и сервисы для получения данных
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { SectorServiceFactory } from './sectors/factory/SectorServiceFactory.js';
import { SectorDataNormalizer } from './sectors/SectorDataNormalizer.js';

/**
 * Универсальный сервис дашборда сектора
 */
export class UniversalSectorDashboardService {
  constructor(sectorId) {
    this.sectorId = sectorId;
    this.cache = new Map();

    // Синхронно инициализируем сервис сектора
    try {
      this.sectorService = SectorServiceFactory.create(sectorId);
      console.log(`[UniversalSectorDashboardService] Initialized for sector: ${this.sectorId}`);
    } catch (error) {
      console.error(`[UniversalSectorDashboardService] Failed to initialize for sector ${this.sectorId}:`, error);
      throw error;
    }
  }

  /**
   * Получение данных сектора для дашборда
   *
   * @param {object} options - Опции загрузки
   * @returns {Promise<object>} Данные сектора в формате дашборда
   */
  async getSectorDashboardData(options = {}) {
    const cacheKey = `dashboard:${this.sectorId}:${JSON.stringify(options)}`;

    // Проверяем кеш
    if (!options.forceRefresh && this.cache.has(cacheKey)) {
      console.log(`[UniversalSectorDashboardService] Cache hit for dashboard data: ${this.sectorId}`);
      return this.cache.get(cacheKey);
    }

    try {
      console.log(`[UniversalSectorDashboardService] Loading dashboard data for sector: ${this.sectorId}`);

      // Получаем сырые данные сектора
      const rawSectorData = await this.sectorService.getSectorData(options);

      // Нормализуем данные для дашборда
      const dashboardData = this.normalizeSectorDataToDashboard(rawSectorData);

      // Кешируем результат (5 минут)
      this.cache.set(cacheKey, dashboardData);

      // Автоматическая очистка кеша через 5 минут
      setTimeout(() => {
        this.cache.delete(cacheKey);
      }, 5 * 60 * 1000);

      console.log(`[UniversalSectorDashboardService] Returning dashboard data for ${this.sectorId}:`, {
        stages: dashboardData.stages?.length || 0,
        employees: dashboardData.employees?.length || 0,
        totalTickets: dashboardData.metadata?.totalTickets || 0
      });

      return dashboardData;

    } catch (error) {
      console.error(`[UniversalSectorDashboardService] Failed to get dashboard data for ${this.sectorId}:`, error);
      throw error;
    }
  }

  /**
   * Нормализация данных сектора в формат дашборда
   *
   * Преобразует универсальные данные сектора в формат, понятный дашборду:
   * - stages: массив этапов с сотрудниками и тикетами
   * - zeroPointTickets: тикеты без назначения по этапам
   * - employees: список всех сотрудников сектора
   *
   * @param {object} sectorData - Данные сектора
   * @returns {object} Нормализованные данные для дашборда
   */
  normalizeSectorDataToDashboard(sectorData) {
    // Используем нормализатор для унификации данных
    const normalizedData = SectorDataNormalizer.normalizeSectorData(sectorData, {
      id: this.sectorId
    });

    // Преобразуем в формат дашборда
    const dashboardData = {
      stages: this.convertStagesToDashboardFormat(normalizedData.stages),
      employees: normalizedData.employees,
      zeroPointTickets: this.extractZeroPointTickets(normalizedData),
      metadata: {
        sectorId: this.sectorId,
        totalTickets: normalizedData.metrics?.totalTickets || 0,
        totalEmployees: normalizedData.employees?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    };

    return dashboardData;
  }

  /**
   * Преобразование этапов в формат дашборда
   *
   * @param {Array} stages - Этапы сектора
   * @returns {Array} Этапы в формате дашборда
   */
  convertStagesToDashboardFormat(stages) {
    return stages.map(stage => ({
      id: this.mapStageIdToDashboardId(stage.id),
      name: stage.name,
      color: stage.color || '#666',
      employees: stage.employees || [],
      tickets: stage.tickets || [],
      metrics: {
        ticketCount: stage.tickets?.length || 0,
        employeeCount: stage.employees?.length || 0
      }
    }));
  }

  /**
   * Маппинг ID этапов сектора на ID дашборда
   *
   * Для разных секторов этапы могут иметь разные ID,
   * но дашборд ожидает стандартизированные ID: formed, review, execution
   *
   * @param {string} stageId - ID этапа сектора
   * @returns {string} ID этапа дашборда
   */
  mapStageIdToDashboardId(stageId) {
    // Маппинг для сектора 1С (DT140_12:...)
    const stageMappings = {
      // Сектор 1С
      'DT140_12:UC_0VHWE2': 'formed',    // Сформировано обращение
      'DT140_12:PREPARATION': 'review',   // Рассмотрение ТЗ
      'DT140_12:CLIENT': 'execution',     // Исполнение

      // Общие маппинги (если сектора используют похожие ID)
      'formed': 'formed',
      'review': 'review',
      'execution': 'execution',
      'request': 'formed',
      'assessment': 'review',
      'deployment': 'execution'
    };

    return stageMappings[stageId] || stageId;
  }

  /**
   * Извлечение тикетов без назначения (нулевая точка)
   *
   * @param {object} normalizedData - Нормализованные данные сектора
   * @returns {object} Тикеты без назначения по этапам
   */
  extractZeroPointTickets(normalizedData) {
    const zeroPointTickets = {};

    // Для каждого этапа находим тикеты без назначения
    normalizedData.stages.forEach(stage => {
      const dashboardStageId = this.mapStageIdToDashboardId(stage.id);

      // Тикеты без назначения (assignedTo = null или undefined)
      const unassignedTickets = stage.tickets.filter(ticket =>
        !ticket.assignedTo || ticket.assignedTo === null || ticket.assignedTo === ''
      );

      zeroPointTickets[dashboardStageId] = unassignedTickets;
    });

    return zeroPointTickets;
  }

  /**
   * Обновление назначения тикета
   *
   * @param {string} ticketId - ID тикета
   * @param {string} newStageId - Новый ID этапа
   * @param {string} employeeId - ID сотрудника
   * @returns {Promise<object>} Результат обновления
   */
  async updateTicketAssignment(ticketId, newStageId, employeeId) {
    try {
      // Маппим ID этапа дашборда обратно в ID сектора
      const sectorStageId = this.mapDashboardIdToStageId(newStageId);

      const result = await this.sectorService.updateTicketAssignment(ticketId, sectorStageId, employeeId);

      // Очищаем кеш после обновления
      this.clearCache();

      return result;
    } catch (error) {
      console.error(`[UniversalSectorDashboardService] Failed to update ticket assignment:`, error);
      throw error;
    }
  }

  /**
   * Обратное маппинг ID этапа дашборда в ID сектора
   *
   * @param {string} dashboardStageId - ID этапа дашборда
   * @returns {string} ID этапа сектора
   */
  mapDashboardIdToStageId(dashboardStageId) {
    // Обратный маппинг для сектора 1С
    const reverseMappings = {
      'formed': 'DT140_12:UC_0VHWE2',
      'review': 'DT140_12:PREPARATION',
      'execution': 'DT140_12:CLIENT'
    };

    return reverseMappings[dashboardStageId] || dashboardStageId;
  }

  /**
   * Очистка кеша
   */
  clearCache() {
    this.cache.clear();
    console.log(`[UniversalSectorDashboardService] Cache cleared for sector: ${this.sectorId}`);
  }

  /**
   * Создание нового тикета
   *
   * @param {object} ticketData - Данные тикета
   * @returns {Promise<object>} Созданный тикет
   */
  async createTicket(ticketData) {
    try {
      const result = await this.sectorService.createTicket({
        ...ticketData,
        sectorId: this.sectorId
      });

      // Очищаем кеш после создания
      this.clearCache();

      return result;
    } catch (error) {
      console.error(`[UniversalSectorDashboardService] Failed to create ticket:`, error);
      throw error;
    }
  }

  /**
   * Получение статистики сектора
   *
   * @returns {Promise<object>} Статистика сектора
   */
  async getSectorStats() {
    try {
      const data = await this.getSectorDashboardData();

      return {
        totalTickets: data.metadata.totalTickets,
        totalEmployees: data.metadata.totalEmployees,
        stagesCount: data.stages.length,
        unassignedTickets: Object.values(data.zeroPointTickets).reduce((sum, tickets) => sum + tickets.length, 0),
        lastUpdated: data.metadata.lastUpdated
      };
    } catch (error) {
      console.error(`[UniversalSectorDashboardService] Failed to get sector stats:`, error);
      throw error;
    }
  }
}

/**
 * Фабрика для создания сервисов дашборда секторов
 */
export class UniversalSectorDashboardFactory {
  static services = new Map();

  /**
   * Получение или создание сервиса дашборда для сектора
   *
   * @param {string} sectorId - ID сектора
   * @returns {UniversalSectorDashboardService} Сервис дашборда
   */
  static getService(sectorId) {
    if (!this.services.has(sectorId)) {
      this.services.set(sectorId, new UniversalSectorDashboardService(sectorId));
    }
    return this.services.get(sectorId);
  }

  /**
   * Очистка всех сервисов (для тестирования)
   */
  static clearAll() {
    this.services.clear();
  }
}

export default UniversalSectorDashboardService;