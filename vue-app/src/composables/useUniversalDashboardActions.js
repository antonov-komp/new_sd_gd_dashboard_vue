/**
 * Универсальный композабл для действий дашборда сектора
 *
 * Работает с любым сектором (1С, PDM, Битрикс24, Инфраструктура)
 * Управляет действиями: загрузка данных, назначение тикетов, создание тикетов
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { UniversalSectorDashboardService } from '@/services/universal-sector-dashboard-service.js';

/**
 * Универсальный композабл для действий дашборда сектора
 *
 * @param {object} state - Состояние дашборда (из useUniversalDashboardState)
 * @param {string} sectorId - ID сектора
 * @returns {object} Объект с методами для действий
 */
export function useUniversalDashboardActions(state, sectorId) {
  console.log(`🔧 [useUniversalDashboardActions] Initialized for sector: ${sectorId}`);

  // Сервис дашборда для сектора
  let dashboardService = null;

  const getDashboardService = () => {
    if (!dashboardService) {
      try {
        console.log(`🏭 [useUniversalDashboardActions] Creating service for sector: ${sectorId}`);
        dashboardService = UniversalSectorDashboardService.getService(sectorId);
        console.log(`✅ [useUniversalDashboardActions] Service created successfully`);
      } catch (error) {
        console.error(`❌ [useUniversalDashboardActions] Failed to create service:`, error);
        // Возвращаем mock сервис для предотвращения краха
        dashboardService = {
          getSectorDashboardData: async () => ({
            stages: [],
            employees: [],
            zeroPointTickets: {},
            metadata: {
              sectorId,
              totalTickets: 0,
              totalEmployees: 0
            }
          })
        };
      }
    }
    return dashboardService;
  };

  /**
   * Загрузка данных сектора
   *
   * @param {object} options - Опции загрузки
   * @returns {Promise<void>}
   */
  const loadSectorData = async (options = {}) => {
    try {
      state.setLoading(true, 'Загрузка данных сектора...');
      state.clearError();

      const service = getDashboardService();
      const dashboardData = await service.getSectorDashboardData(options);

      // Обновляем состояние
      state.updateStages(dashboardData.stages);
      state.updateEmployees(dashboardData.employees);
      state.updateZeroPointTickets(dashboardData.zeroPointTickets);
      state.updateSectorStats({
        totalTickets: dashboardData.metadata.totalTickets,
        totalEmployees: dashboardData.metadata.totalEmployees,
        activeStages: dashboardData.stages.length,
        lastUpdated: dashboardData.metadata.lastUpdated
      });

      notifications.success('Данные сектора загружены', `Загружено ${dashboardData.metadata.totalTickets} тикетов`);

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to load sector data for ${sectorId}:`, error);
      state.setError(error.message || 'Ошибка загрузки данных сектора');
      notifications.error('Ошибка загрузки', error.message || 'Не удалось загрузить данные сектора');
      throw error;
    } finally {
      state.setLoading(false);
    }
  };

  /**
   * Обновление назначения тикета
   *
   * @param {string} ticketId - ID тикета
   * @param {string} newStageId - Новый ID этапа
   * @param {string} employeeId - ID сотрудника (опционально)
   * @returns {Promise<void>}
   */
  const updateTicketAssignment = async (ticketId, newStageId, employeeId = null) => {
    try {
      const service = getDashboardService();
      await service.updateTicketAssignment(ticketId, newStageId, employeeId);

      notifications.success('Тикет обновлен', 'Назначение тикета успешно изменено');

      // Перезагружаем данные для обновления состояния
      await loadSectorData({ forceRefresh: true });

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to update ticket assignment:`, error);
      notifications.error('Ошибка обновления', error.message || 'Не удалось обновить назначение тикета');
      throw error;
    }
  };

  /**
   * Создание нового тикета
   *
   * @param {object} ticketData - Данные тикета
   * @returns {Promise<object>} Созданный тикет
   */
  const createTicket = async (ticketData) => {
    try {
      const service = getDashboardService();
      const newTicket = await service.createTicket(ticketData);

      notifications.success('Тикет создан', `Тикет "${newTicket.title}" успешно создан`);

      // Перезагружаем данные
      await loadSectorData({ forceRefresh: true });

      return newTicket;

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to create ticket:`, error);
      notifications.error('Ошибка создания', error.message || 'Не удалось создать тикет');
      throw error;
    }
  };

  /**
   * Перемещение тикета между этапами
   *
   * @param {object} ticket - Тикет для перемещения
   * @param {string} targetStageId - ID целевого этапа
   * @param {string} employeeId - ID сотрудника (опционально)
   * @returns {Promise<void>}
   */
  const moveTicket = async (ticket, targetStageId, employeeId = null) => {
    try {
      // Проверяем возможность перемещения
      if (!canMoveTicket(ticket, targetStageId)) {
        throw new Error('Перемещение тикета невозможно');
      }

      await updateTicketAssignment(ticket.id, targetStageId, employeeId);

      notifications.success('Тикет перемещен', `Тикет перемещен на этап "${getStageName(targetStageId)}"`);

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to move ticket:`, error);
      notifications.error('Ошибка перемещения', error.message || 'Не удалось переместить тикет');
      throw error;
    }
  };

  /**
   * Назначение тикета сотруднику
   *
   * @param {string} ticketId - ID тикета
   * @param {string} employeeId - ID сотрудника
   * @returns {Promise<void>}
   */
  const assignTicketToEmployee = async (ticketId, employeeId) => {
    try {
      const service = getDashboardService();
      const ticket = findTicket(ticketId);

      if (!ticket) {
        throw new Error('Тикет не найден');
      }

      await service.updateTicketAssignment(ticketId, ticket.stageId, employeeId);

      const employee = state.getEmployeeById(employeeId);
      const employeeName = employee ? employee.name : 'сотруднику';

      notifications.success('Тикет назначен', `Тикет назначен ${employeeName}`);

      // Перезагружаем данные
      await loadSectorData({ forceRefresh: true });

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to assign ticket:`, error);
      notifications.error('Ошибка назначения', error.message || 'Не удалось назначить тикет');
      throw error;
    }
  };

  /**
   * Очистка кеша сектора
   *
   * @returns {Promise<void>}
   */
  const clearCache = async () => {
    try {
      const service = getDashboardService();
      service.clearCache();

      notifications.success('Кеш очищен', 'Кеш сектора успешно очищен');

      // Перезагружаем данные
      await loadSectorData({ forceRefresh: true });

    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to clear cache:`, error);
      notifications.error('Ошибка очистки', error.message || 'Не удалось очистить кеш');
      throw error;
    }
  };

  /**
   * Получение статистики сектора
   *
   * @returns {Promise<object>} Статистика сектора
   */
  const getSectorStats = async () => {
    try {
      const service = getDashboardService();
      return await service.getSectorStats();
    } catch (error) {
      console.error(`[useUniversalDashboardActions] Failed to get sector stats:`, error);
      throw error;
    }
  };

  /**
   * Переход к графику состояния
   *
   * @returns {void}
   */
  const navigateToGraphState = () => {
    // Импортируем роутер динамически
    import('vue-router').then(({ useRouter }) => {
      const router = useRouter();
      router.push('/graph/state');
    }).catch(error => {
      console.error('Failed to navigate to graph state:', error);
    });
  };

  /**
   * Переход к графику приемки-закрытия
   *
   * @returns {void}
   */
  const navigateToAdmissionClosure = () => {
    import('vue-router').then(({ useRouter }) => {
      const router = useRouter();
      router.push('/graph/admission-closure');
    }).catch(error => {
      console.error('Failed to navigate to admission closure:', error);
    });
  };

  /**
   * Переход к управлению тикетами
   *
   * @returns {void}
   */
  const navigateToTicketsManagement = () => {
    import('vue-router').then(({ useRouter }) => {
      const router = useRouter();
      router.push('/tickets/time-tracking');
    }).catch(error => {
      console.error('Failed to navigate to tickets management:', error);
    });
  };

  // Вспомогательные функции
  const canMoveTicket = (ticket, targetStageId) => {
    // Базовая проверка возможности перемещения
    if (!ticket || !targetStageId) return false;

    // Тикет не может быть перемещен в тот же этап
    if (ticket.stageId === targetStageId) return false;

    // Дополнительные проверки могут быть добавлены здесь
    return true;
  };

  const findTicket = (ticketId) => {
    // Поиск тикета во всех этапах
    for (const stage of state.stages) {
      const ticket = stage.tickets?.find(t => t.id === ticketId);
      if (ticket) {
        return { ...ticket, stageId: stage.id };
      }
    }

    // Поиск в нулевой точке
    for (const [stageId, tickets] of Object.entries(state.zeroPointTickets)) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        return { ...ticket, stageId };
      }
    }

    return null;
  };

  const getStageName = (stageId) => {
    const stage = state.getStageById(stageId);
    return stage ? stage.name : stageId;
  };

  return {
    // Основные действия
    loadSectorData,
    updateTicketAssignment,
    createTicket,
    moveTicket,
    assignTicketToEmployee,
    clearCache,
    getSectorStats,

    // Навигация
    navigateToGraphState,
    navigateToAdmissionClosure,
    navigateToTicketsManagement,

    // Вспомогательные
    canMoveTicket,
    findTicket,
    getStageName
  };
}

export default useUniversalDashboardActions;