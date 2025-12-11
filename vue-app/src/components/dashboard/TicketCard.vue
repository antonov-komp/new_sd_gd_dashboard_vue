<template>
  <div
    class="ticket-card"
    :draggable="isDragEnabled"
    :style="priorityBorderStyle"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- Правый верхний угол: Отдел заказчика -->
    <div v-if="ticket.departmentHead" class="ticket-department">
      {{ ticket.departmentHead }}
    </div>
    
    <div class="ticket-header">
      <span class="ticket-icon">🎫</span>
      <span class="ticket-id">#{{ ticket.id }}</span>
    </div>
    
    <div class="ticket-title">
      {{ ticket.ufSubject || ticket.title || 'Без названия' }}
    </div>
    
    <div class="ticket-meta">
      <span class="ticket-priority" :style="priorityChipStyle">
        {{ displayPriorityLabel }}
      </span>
      <span class="ticket-service" :style="serviceChipStyle">
        {{ displayServiceLabel }}
      </span>
    </div>
    
    <div v-if="actionStrValue" class="ticket-action">
      <span class="ticket-action-chip" :style="actionChipStyle">
        {{ actionStrValue }}
      </span>
    </div>
    
    <div v-if="ticket.description" class="ticket-description">
      {{ ticket.description }}
    </div>
    
    <!-- Правый нижний угол: Дата создания с визуальным акцентом -->
    <div v-if="formattedCreatedDate" class="ticket-created-date" :style="dateAccentStyle">
      <span class="ticket-date-label">{{ dateAccentConfig?.label || '' }}</span>
      <span class="ticket-date-value">{{ formattedCreatedDate }}</span>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import { DISABLE_TICKET_DRAG, getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
import { parseBitrixDate, formatDate, getDateAccentCategory } from '@/services/dashboard-sector-1c/utils/date-utils.js';
import { DATE_ACCENT_CONFIG } from '@/services/dashboard-sector-1c/utils/date-accent-config.js';

/**
 * Компонент карточки тикета
 * 
 * Отображает информацию о тикете (ID, тема, приоритет, статус)
 * Поддерживает перетаскивание (Drag & Drop)
 * При клике открывает детальную информацию о тикете в iframe Bitrix24
 * 
 * Используется в:
 * - EmployeeColumn.vue (тикеты сотрудника)
 * - ZeroPoint.vue (входящие тикеты)
 * 
 * @component
 * @prop {Object} ticket - Объект тикета
 * @prop {number} ticket.id - ID тикета
 * @prop {string} ticket.title - Название тикета (fallback, если отсутствует ufSubject)
 * @prop {string|null} ticket.ufSubject - Тема тикета из пользовательского поля UF_SUBJECT (приоритетное для отображения)
 * @prop {string} ticket.priorityId - Внутренний id приоритета (из UF_CRM_7_UF_PRIORITY)
 * @prop {string} ticket.priorityLabel - Отображаемое значение приоритета
 * @prop {Object} ticket.priorityColors - Цвета приоритета { color, backgroundColor, textColor }
 * @prop {string} ticket.priority - legacy-поле приоритета (id), сохраняется для обратной совместимости
 * @prop {string} ticket.status - Статус (in_progress, new, done, pending)
 * @prop {string|null} ticket.actionStr - Значение UF_ACTION_STR из Bitrix24 (динамичная строка, опционально)
 * @prop {string|null} ticket.departmentHead - Отдел заказчика из UF_CRM_7_DEPARTMENT_HEAD (ограничено 10 символами, опционально)
 * @prop {string} ticket.description - Описание тикета (опционально)
 * @prop {boolean} draggable - Можно ли перетаскивать тикет
 * @emits {Object} click - Тикет кликнут
 * @emits {Object} drag-start - Начато перетаскивание тикета
 * @emits {void} drag-end - Завершено перетаскивание тикета
 */
export default {
  name: 'TicketCard',
  props: {
    /**
     * Объект тикета
     * @type {Object}
     */
    ticket: {
      type: Object,
      required: true
    },
    /**
     * Можно ли перетаскивать тикет
     * @type {boolean}
     */
    draggable: {
      type: Boolean,
      default: true
    }
  },
  emits: ['click', 'drag-start', 'drag-end'],
  setup(props, { emit }) {
    const isDragging = ref(false);
    const isDragEnabled = computed(() => !DISABLE_TICKET_DRAG && props.draggable);

    const NEUTRAL_COLORS = {
      color: '#ced4da',
      backgroundColor: '#f1f3f5',
      textColor: '#6c757d'
    };

    const NEUTRAL_SERVICE_COLORS = {
      color: '#ced4da',
      backgroundColor: '#f8f9fa',
      textColor: '#6c757d'
    };

    const NEUTRAL_ACTION_COLORS = {
      color: '#dee2e6',
      backgroundColor: '#f8f9fa',
      textColor: '#6c757d'
    };

    const priorityData = computed(() => {
      return {
        label: props.ticket.priorityLabel || 'Не указано',
        colors: props.ticket.priorityColors || NEUTRAL_COLORS
      };
    });

    const displayPriorityLabel = computed(() => priorityData.value.label || 'Не указано');

    const priorityChipStyle = computed(() => ({
      color: priorityData.value.colors.textColor || NEUTRAL_COLORS.textColor,
      backgroundColor: priorityData.value.colors.backgroundColor || NEUTRAL_COLORS.backgroundColor,
      borderColor: priorityData.value.colors.color || NEUTRAL_COLORS.color
    }));

    const priorityBorderStyle = computed(() => ({
      borderLeftColor: priorityData.value.colors.color || NEUTRAL_COLORS.color
    }));

    const serviceData = computed(() => {
      const service = props.ticket.service || {};
      return {
        label: service.label || props.ticket.serviceLabel || 'Не указано',
        colors: service.colors || props.ticket.serviceColors || NEUTRAL_SERVICE_COLORS
      };
    });

    const displayServiceLabel = computed(() => serviceData.value.label || 'Не указано');

    const serviceChipStyle = computed(() => ({
      color: serviceData.value.colors.textColor || NEUTRAL_SERVICE_COLORS.textColor,
      backgroundColor: serviceData.value.colors.backgroundColor || NEUTRAL_SERVICE_COLORS.backgroundColor,
      borderColor: serviceData.value.colors.color || NEUTRAL_SERVICE_COLORS.color
    }));

    /**
     * Computed-свойство для получения значения UF_ACTION_STR
     * Нормализует значение: trim и проверка на пустоту
     * 
     * @returns {string|null} Значение UF_ACTION_STR или null, если пусто
     */
    const actionStrValue = computed(() => {
      const value = props.ticket.actionStr || props.ticket.ufActionStr || null;
      if (!value) return null;
      const trimmed = String(value).trim();
      return trimmed.length > 0 ? trimmed : null;
    });

    /**
     * Стили для чипа UF_ACTION_STR (второй этаж)
     * Использует нейтральные цвета
     */
    const actionChipStyle = computed(() => ({
      color: NEUTRAL_ACTION_COLORS.textColor,
      backgroundColor: NEUTRAL_ACTION_COLORS.backgroundColor,
      borderColor: NEUTRAL_ACTION_COLORS.color
    }));

    /**
     * Отформатированная дата создания
     */
    const formattedCreatedDate = computed(() => {
      if (!props.ticket.createdAt) return '';
      const date = parseBitrixDate(props.ticket.createdAt);
      return formatDate(date);
    });

    /**
     * Категория давности для визуального акцента
     */
    const dateAccentCategory = computed(() => {
      if (!props.ticket.createdAt) return null;
      const date = parseBitrixDate(props.ticket.createdAt);
      return getDateAccentCategory(date);
    });

    /**
     * Конфигурация визуального акцента для даты
     */
    const dateAccentConfig = computed(() => {
      const category = dateAccentCategory.value;
      if (!category) return null;
      return DATE_ACCENT_CONFIG[category] || null;
    });

    /**
     * Стили для элемента даты с визуальным акцентом
     */
    const dateAccentStyle = computed(() => {
      const config = dateAccentConfig.value;
      if (!config) return {};
      
      return {
        color: config.textColor,
        backgroundColor: config.backgroundColor,
        borderColor: config.color,
        border: `1px solid ${config.color}`
      };
    });

    /**
     * Обработка начала перетаскивания
     * 
     * @param {Event} event - Событие dragstart
     */
    const handleDragStart = (event) => {
      if (!isDragEnabled.value) {
        return;
      }
      // Сохраняем данные тикета в dataTransfer
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('application/json', JSON.stringify(props.ticket));
      
      // Добавляем визуальный эффект
      event.dataTransfer.setDragImage(event.target, 0, 0);
      
      isDragging.value = true;
      emit('drag-start', props.ticket);
    };

    /**
     * Обработка окончания перетаскивания
     */
    const handleDragEnd = () => {
      if (!isDragEnabled.value) {
        return;
      }
      isDragging.value = false;
      emit('drag-end');
    };

    /**
     * Обработка клика по карточке тикета
     * Открывает детальную информацию о тикете в iframe Bitrix24
     * 
     * @param {Event} event - Событие клика
     */
    const handleCardClick = (event) => {
      // Предотвращаем клик, если идёт перетаскивание
      if (isDragging.value) {
        return;
      }
      
      const iframeUrl = getTicketIframeUrl(props.ticket.id);
      
      // Открываем всегда в новой вкладке (по требованию)
      window.open(iframeUrl, '_blank');

      emit('click', props.ticket);
    };

    return {
      handleDragStart,
      handleDragEnd,
      handleCardClick,
      isDragEnabled,
      priorityChipStyle,
      displayPriorityLabel,
      priorityBorderStyle,
      displayServiceLabel,
      serviceChipStyle,
      actionStrValue,
      actionChipStyle,
      formattedCreatedDate,
      dateAccentCategory,
      dateAccentConfig,
      dateAccentStyle
    };
  }
};
</script>

<style scoped>
.ticket-card {
  position: relative; /* Для позиционирования абсолютных элементов */
  background: white;
  border-radius: 4px;
  padding: 12px;
  border-left: 4px solid #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ticket-department {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 11px;
  color: #666;
  font-weight: 500;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 2px 6px;
  border-radius: 4px;
  max-width: 136px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  z-index: 1;
}

.ticket-card:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.ticket-card[draggable="true"] {
  cursor: grab;
}

.ticket-card[draggable="true"]:active {
  cursor: grabbing;
}

.ticket-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ticket-icon {
  font-size: 18px;
}

.ticket-id {
  font-size: 12px;
  color: #666;
  font-weight: 600;
}

.ticket-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  line-height: 1.4;
}

.ticket-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.ticket-priority,
.ticket-service {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}

.ticket-action {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.ticket-action-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  border: 1px solid;
}

.ticket-description {
  font-size: 12px;
  color: #666;
  line-height: 1.4;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}

.ticket-created-date {
  position: absolute;
  bottom: 8px;
  right: 8px;
  font-size: 10px;
  padding: 4px 6px;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 60px;
  z-index: 1;
}

.ticket-date-label {
  font-weight: 600;
  text-transform: uppercase;
  font-size: 9px;
  line-height: 1;
}

.ticket-date-value {
  font-weight: 500;
  font-size: 10px;
  line-height: 1.2;
}
</style>

