/**
 * Композабл для действий дашборда сектора 1С
 * 
 * Управляет действиями: загрузка данных, назначение тикетов, создание тикетов
 */

import { ref } from 'vue';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';
import { useNotifications } from './useNotifications.js';
import { useLoadingProgress } from './useLoadingProgress.js';
import { useTransition } from './useTransition.js';
import { PRELOADER_TRANSITION } from '@/services/dashboard-sector-1c/utils/transition-config.js';
import { handleErrorWithNotification } from '@/services/dashboard-sector-1c/utils/error-handler.js';
import { canMoveTicket, validateTicketData } from '@/services/dashboard-sector-1c/utils/validation.js';
import { normalizeProgressData } from '@/services/dashboard-sector-1c/utils/progress-utils.js';

/**
 * Композабл для действий дашборда
 * 
 * @param {object} state - Состояние дашборда (из useDashboardState)
 * @returns {object} Объект с методами для действий
 */
export function useDashboardActions(state) {
  const notifications = useNotifications();
  const loadingProgress = useLoadingProgress();
  const { isTransitioning, executeTransition } = useTransition();

  /**
   * Обработка колбэка прогресса из сервиса
   * 
   * Нормализует данные прогресса и обновляет состояние загрузки
   * 
   * @param {object} progressInfo - Объект с данными прогресса из сервиса
   * @param {object} loadingProgress - Объект композабла useLoadingProgress
   * 
   * @example
   * handleProgressCallback(
   *   { step: 'loading_tickets', progress: 50, details: { description: 'Загрузка...' } },
   *   loadingProgress
   * );
   */
  function handleProgressCallback(progressInfo, loadingProgress) {
    // Нормализуем данные прогресса
    const normalized = normalizeProgressData(progressInfo);
    
    // Обновляем этап (step) - это обязательно должно быть
    if (normalized.step) {
      loadingProgress.updateStep(normalized.step, normalized.details || {});
    }
    
    // Обновляем прогресс
    if (normalized.progress !== undefined && normalized.progress !== null) {
      loadingProgress.updateProgress(normalized.progress);
      // Если прогресс обновляется, значит загрузка продолжается - очищаем временную ошибку
      loadingProgress.clearTemporaryError();
    }
    
    // НЕ показываем ошибки из колбэка прогресса во время загрузки
    // Ошибки будут показаны только в catch блоке, если загрузка действительно завершилась с ошибкой
    // Это предотвращает показ временных ошибок, которые могут исчезнуть при успешной загрузке
  }

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
          handleProgressCallback(progressInfo, loadingProgress);
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
        // Показываем "Готово!" перед началом перехода
        loadingProgress.updateStep('complete', { description: 'Дашборд загружен' });
        loadingProgress.updateProgress(100);
        
        // Используем конфигурацию для тайминга показа "Готово!"
        const readyDisplayTime = PRELOADER_TRANSITION.readyDisplayTime || 800;
        
        setTimeout(() => {
          // Выполняем transition с таймингами из конфигурации
          executeTransition(
            () => {
              // Начало fade-out прелоадера (isTransitioning устанавливается в executeTransition)
            },
            () => {
              // Начало fade-in дашборда
              state.isLoading.value = false;
            },
            PRELOADER_TRANSITION
          );
          
          // Сброс прогресса после завершения fade-out
          setTimeout(() => {
            loadingProgress.reset();
          }, PRELOADER_TRANSITION.fadeOutDuration);
        }, readyDisplayTime);
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
    loadingProgress,
    isTransitioning
  };
}


