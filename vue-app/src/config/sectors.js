/**
 * Конфигурация секторов стартовой страницы
 * Каждый сектор имеет визуальное оформление и набор модулей-плиток
 *
 * @version 1.0
 * @since 2026-01-12
 */

export const SECTORS_CONFIG = {
  // Сектор 1: 1С (текущий)
  sector1c: {
    id: '1c',
    name: 'Сектор 1С',
    description: 'Модули для работы с системами 1С:Предприятие',
    icon: '⚙️',
    color: '#007bff', // Синий цвет
    borderColor: '#0056b3',
    backgroundColor: '#f8f9fa',
    filterValue: '1C', // UF_CRM_7_TYPE_PRODUCT = '1C'
    modules: [
      'DashboardSector1C',      // ⚙️ 📋 Дашборд сектора 1С
      'TicketsManagementSector1C', // Управление тикетами сектора 1С
      'StateChart',             // 📊 График состояния
      'ChangesVisualization'    // Визуализация изменений сост
    ],
    features: ['smart-process-140', '1c-integration'],
    order: 1
  },

  // Сектор 2: PDM
  sectorPdm: {
    id: 'pdm',
    name: 'Сектор PDM',
    description: 'Управление системами PDM (Product Data Management)',
    icon: '🔧',
    color: '#28a745', // Зеленый цвет
    borderColor: '#1e7e34',
    backgroundColor: '#f8fff8',
    filterValue: 'PDM', // UF_CRM_7_TYPE_PRODUCT = 'PDM'
    modules: [
      // Модули будут добавлены по мере реализации
      // 'PdmDashboard',
      // 'PdmTicketsManagement'
    ],
    features: ['pdm-integration'],
    order: 2
  },

  // Сектор 3: Битрикс24
  sectorBitrix24: {
    id: 'bitrix24',
    name: 'Сектор Битрикс24',
    description: 'Управление и поддержка Битрикс24',
    icon: '🌐',
    color: '#ffc107', // Желтый цвет
    borderColor: '#d39e00',
    backgroundColor: '#fffef8',
    filterValue: 'Bitrix24', // UF_CRM_7_TYPE_PRODUCT = 'Bitrix24'
    modules: [
      // Модули будут добавлены по мере реализации
      // 'Bitrix24Dashboard',
      // 'Bitrix24TicketsManagement',
      // 'Bitrix24Analytics'
    ],
    features: ['bitrix24-integration'],
    order: 3
  },

  // Сектор 4: Железо/Инфраструктура/Прочее
  sectorInfrastructure: {
    id: 'infrastructure',
    name: 'Сектор Железо/Инфраструктура',
    description: 'Управление инфраструктурой, оборудованием и прочими задачами',
    icon: '🖥️',
    color: '#dc3545', // Красный цвет
    borderColor: '#bd2130',
    backgroundColor: '#fff8f8',
    filterValues: ['Железо', 'Прочее'], // UF_CRM_7_TYPE_PRODUCT = 'Железо' OR 'Прочее'
    modules: [
      // Модули будут добавлены по мере реализации
      // 'InfrastructureDashboard',
      // 'HardwareManagement',
      // 'InfrastructureTickets'
    ],
    features: ['infrastructure-management'],
    order: 4
  }
};

/**
 * Вспомогательные функции для работы с конфигурацией секторов
 */
export class SectorConfigUtils {
  /**
   * Получить все сектора отсортированные по порядку
   */
  static getAllSectors() {
    return Object.values(SECTORS_CONFIG)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  /**
   * Получить сектор по ID
   */
  static getSectorById(sectorId) {
    return SECTORS_CONFIG[sectorId] || null;
  }

  /**
   * Получить сектора с модулями
   */
  static getSectorsWithModules() {
    return this.getAllSectors()
      .filter(sector => sector.modules && sector.modules.length > 0);
  }

  /**
   * Получить цвета всех секторов для тематизации
   */
  static getSectorColors() {
    const colors = {};
    Object.values(SECTORS_CONFIG).forEach(sector => {
      colors[sector.id] = sector.color;
    });
    return colors;
  }

  /**
   * Проверить, существует ли сектор
   */
  static sectorExists(sectorId) {
    return !!SECTORS_CONFIG[sectorId];
  }

  /**
   * Получить следующий порядок для нового сектора
   */
  static getNextOrder() {
    const maxOrder = Math.max(...Object.values(SECTORS_CONFIG).map(s => s.order || 0));
    return maxOrder + 1;
  }
}

export default SECTORS_CONFIG;