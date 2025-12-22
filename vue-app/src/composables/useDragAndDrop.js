/**
 * Композабл для работы с Drag & Drop
 * 
 * Переиспользуемая логика для перетаскивания тикетов
 */

import { ref } from 'vue';
import { canMoveTicket } from '@/services/dashboard-sector-1c/utils/validation.js';
import { useNotifications } from './useNotifications.js';
import { Logger } from '@/services/dashboard-sector-1c/utils/logger.js';

/**
 * Композабл для Drag & Drop
 * 
 * @param {Function} onDrop - Callback при сбросе тикета (ticket, employeeId, stageId) => void
 * @returns {object} Объект с методами и состоянием для Drag & Drop
 */
export function useDragAndDrop(onDrop) {
  const notifications = useNotifications();
  
  // Состояние активной зоны сброса
  const isDropZoneActive = ref(false);

  /**
   * Обработка начала перетаскивания
   * 
   * @param {DragEvent} event - Событие dragstart
   * @param {object} ticket - Тикет
   */
  const handleDragStart = (event, ticket) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/json', JSON.stringify(ticket));
    event.dataTransfer.setDragImage(event.target, 0, 0);
  };

  /**
   * Обработка наведения на зону сброса
   * 
   * @param {DragEvent} event - Событие dragover
   */
  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    isDropZoneActive.value = true;
  };

  /**
   * Обработка выхода из зоны сброса
   * 
   * @param {DragEvent} event - Событие dragleave
   */
  const handleDragLeave = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    // Проверяем, действительно ли курсор вышел из зоны
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      isDropZoneActive.value = false;
    }
  };

  /**
   * Обработка сброса тикета
   * 
   * @param {DragEvent} event - Событие drop
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   */
  const handleDrop = async (event, employeeId, stageId) => {
    event.preventDefault();
    isDropZoneActive.value = false;

    const ticketData = event.dataTransfer.getData('application/json');
    
    if (!ticketData) {
      return;
    }

    try {
      const ticket = JSON.parse(ticketData);

      // Валидация возможности перемещения
      if (!canMoveTicket(ticket, employeeId, stageId)) {
        notifications.warning('Нельзя переместить тикет сюда');
        return;
      }

      // Вызываем callback
      if (onDrop && typeof onDrop === 'function') {
        await onDrop(ticket, employeeId, stageId);
      }
    } catch (error) {
      Logger.error('Error parsing ticket data', 'useDragAndDrop', error);
      notifications.error('Ошибка обработки данных тикета');
    }
  };

  /**
   * Обработка окончания перетаскивания
   * 
   * @param {DragEvent} event - Событие dragend
   */
  const handleDragEnd = (event) => {
    isDropZoneActive.value = false;
  };

  return {
    isDropZoneActive,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  };
}


