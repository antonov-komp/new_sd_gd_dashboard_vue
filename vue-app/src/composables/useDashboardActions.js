/**
 * Композабл для действий дашборда сектора 1С
 * 
 * Управляет действиями: загрузка данных, назначение тикетов, создание тикетов
 */

import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';
import { useNotifications } from './useNotifications.js';
import { useLoadingProgress } from './useLoadingProgress.js';
import { handleErrorWithNotification } from '@/services/dashboard-sector-1c/utils/error-handler.js';
import { canMoveTicket, validateTicketData } from '@/services/dashboard-sector-1c/utils/validation.js';

/**
 * Композабл для действий дашборда
 * 
 * @param {object} state - Состояние дашборда (из useDashboardState)
 * @returns {object} Объект с методами для действий
 */
export function useDashboardActions(state) {
  const notifications = useNotifications();
  const loadingProgress = useLoadingProgress();

  /**
   * Загрузка данных сектора из API
   * 
   * @param {boolean} useCache - Использовать кеш (по умолчанию true)
   */
  const loadSectorData = async (useCache = true) => {
    state.isLoading.value = true;
    state.error.value = null;
    loadingProgress.reset();
    
    // Устанавливаем начальный этап сразу
    loadingProgress.updateStep('cache_check', { description: 'Инициализация загрузки данных...' });
    loadingProgress.updateProgress(0);

    try {
      const data = await DashboardSector1CService.getSectorData(
        useCache,
        (progressInfo) => {
          console.log('Progress callback received:', progressInfo);
          
          // Обновляем этап (step) - это обязательно должно быть
          if (progressInfo.step) {
            console.log('Updating step to:', progressInfo.step);
            loadingProgress.updateStep(progressInfo.step, progressInfo.details || {});
          } else {
            console.warn('Progress info without step:', progressInfo);
          }
          
          // Обновляем прогресс
          if (progressInfo.progress !== undefined && progressInfo.progress !== null) {
            console.log('Updating progress to:', progressInfo.progress);
            loadingProgress.updateProgress(progressInfo.progress);
            // Если прогресс обновляется, значит загрузка продолжается - очищаем временную ошибку
            loadingProgress.clearTemporaryError();
          } else if (progressInfo.percent !== undefined && progressInfo.percent !== null) {
            // Если передан percent вместо progress, используем его
            console.log('Updating progress from percent to:', progressInfo.percent);
            loadingProgress.updateProgress(progressInfo.percent);
            loadingProgress.clearTemporaryError();
          }
          
          // НЕ показываем ошибки из колбэка прогресса во время загрузки
          // Ошибки будут показаны только в catch блоке, если загрузка действительно завершилась с ошибкой
          // Это предотвращает показ временных ошибок, которые могут исчезнуть при успешной загрузке
        }
      );
      
      state.updateState(data);
    } catch (err) {
      state.error.value = err.message;
      loadingProgress.setError(err.message);
      handleErrorWithNotification(err, 'loading sector data', notifications.error);
    } finally {
      // Небольшая задержка перед скрытием прелоадера (если загрузка успешна)
      if (!state.error.value) {
        // Показываем "Готово!" на 800мс перед скрытием
        setTimeout(() => {
          state.isLoading.value = false;
          // Ещё небольшая задержка перед сбросом прогресса
          setTimeout(() => {
            loadingProgress.reset();
          }, 200);
        }, 800);
      } else {
        state.isLoading.value = false;
      }
    }
  };

  /**
   * Назначение тикета сотруднику
   * 
   * @param {object} ticket - Тикет
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   * @returns {Promise<boolean>} Успешность операции
   */
  const assignTicket = async (ticket, employeeId, stageId) => {
    // Валидация
    if (!canMoveTicket(ticket, employeeId, stageId)) {
      notifications.warning('Нельзя переместить тикет сюда');
      return false;
    }

    try {
      const success = await DashboardSector1CService.assignTicket(
        ticket.id,
        employeeId,
        stageId
      );

      if (success) {
        // Обновляем локальное состояние
        state.updateLocalStateAfterMove(ticket, employeeId, stageId);
        notifications.success('Тикет перемещён');
      }

      return success;
    } catch (err) {
      handleErrorWithNotification(err, 'assigning ticket', notifications.error);
      return false;
    } finally {
      state.draggedTicket.value = null;
    }
  };

  /**
   * Перемещение тикета на этап
   * 
   * @param {object} ticket - Тикет
   * @param {string} stageId - ID этапа
   * @returns {Promise<boolean>} Успешность операции
   */
  const moveTicketToStage = async (ticket, stageId) => {
    return await assignTicket(ticket, ticket.assigneeId, stageId);
  };

  /**
   * Назначение тикета сотруднику (из нулевой точки)
   * 
   * @param {object} ticket - Тикет
   * @param {number} employeeId - ID сотрудника
   * @returns {Promise<boolean>} Успешность операции
   */
  const assignTicketToEmployee = async (ticket, employeeId) => {
    return await assignTicket(ticket, employeeId, ticket.stageId);
  };

  /**
   * Создание нового тикета
   * 
   * @param {object} ticketData - Данные тикета
   * @returns {Promise<number>} ID созданного тикета (0 при ошибке)
   */
  const createTicket = async (ticketData) => {
    // Валидация
    const validation = validateTicketData(ticketData);
    if (!validation.valid) {
      const errorMessage = validation.errors.join(', ');
      notifications.error(errorMessage);
      return 0;
    }

    try {
      const ticketId = await DashboardSector1CService.createTicket(ticketData);

      if (ticketId > 0) {
        // Перезагружаем данные для обновления состояния
        await loadSectorData(false); // Не используем кеш, чтобы получить новый тикет
        notifications.success('Тикет создан');
      }

      return ticketId;
    } catch (err) {
      handleErrorWithNotification(err, 'creating ticket', notifications.error);
      return 0;
    }
  };

  /**
   * Обработка начала перетаскивания тикета
   * 
   * @param {object} ticket - Тикет
   */
  const handleTicketDragStart = (ticket) => {
    state.draggedTicket.value = ticket;
  };

  /**
   * Обработка сброса тикета
   * 
   * @param {object} ticket - Тикет
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   */
  const handleTicketDrop = async (ticket, employeeId, stageId) => {
    await assignTicket(ticket, employeeId, stageId);
  };

  return {
    loadSectorData,
    assignTicket,
    moveTicketToStage,
    assignTicketToEmployee,
    createTicket,
    handleTicketDragStart,
    handleTicketDrop,
    loadingProgress
  };
}


