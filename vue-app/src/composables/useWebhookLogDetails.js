/**
 * Composable для работы с деталями лога вебхука
 * 
 * Расположение: vue-app/src/composables/useWebhookLogDetails.js
 * 
 * Инкапсулирует логику загрузки и отображения деталей лога
 * Использует типизированные интерфейсы из types/webhook-logs.js
 */

import { ref, computed } from 'vue';
import { 
  normalizeWebhookLogEntry,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';

/**
 * Composable для работы с деталями лога
 * 
 * @param {Object|string} logOrId Лог или ID лога
 * @param {Object} options Опции
 * @param {boolean} options.autoLoad Автоматическая загрузка
 * @returns {Object} API для работы с деталями лога
 */
export function useWebhookLogDetails(logOrId, options = {}) {
  const { autoLoad = false } = options;

  // Состояние
  const log = ref(null);
  const loading = ref(false);
  const error = ref(null);
  const expandedSections = ref({
    payload: false,
    details: false,
    raw: false
  });

  // Вычисляемые свойства
  const hasLog = computed(() => log.value !== null && isValidWebhookLogEntry(log.value));
  const formattedTimestamp = computed(() => {
    if (!log.value) return '—';
    return formatTimestamp(log.value.timestamp, 'long');
  });
  const formattedEventType = computed(() => {
    if (!log.value) return '—';
    return formatEventType(log.value.event);
  });
  const formattedCategory = computed(() => {
    if (!log.value) return '—';
    return formatCategory(log.value.category);
  });
  const formattedDetails = computed(() => {
    if (!log.value || !log.value.details) return '—';
    return formatEventDetails(log.value.details);
  });

  // Загрузка лога
  const loadLog = async (logData) => {
    if (loading.value) {
      return;
    }

    try {
      loading.value = true;
      error.value = null;

      // Если передан объект лога, нормализуем его
      if (typeof logData === 'object') {
        const normalized = normalizeWebhookLogEntry(logData);
        if (!isValidWebhookLogEntry(normalized)) {
          throw new Error('Invalid log data');
        }
        log.value = normalized;
      } else {
        // Если передан ID, загружаем через API
        // TODO: Реализовать загрузку по ID через API
        throw new Error('Loading by ID not implemented yet');
      }

    } catch (err) {
      error.value = err.message || 'Failed to load log details';
      console.error('[useWebhookLogDetails] Error loading log:', err);
      log.value = null;
    } finally {
      loading.value = false;
    }
  };

  // Установка лога
  const setLog = (logData) => {
    if (!logData) {
      log.value = null;
      return;
    }

    const normalized = normalizeWebhookLogEntry(logData);
    if (!isValidWebhookLogEntry(normalized)) {
      console.warn('[useWebhookLogDetails] Attempted to set invalid log');
      return;
    }

    log.value = normalized;
  };

  // Переключение секций
  const toggleSection = (section) => {
    if (expandedSections.value.hasOwnProperty(section)) {
      expandedSections.value[section] = !expandedSections.value[section];
    }
  };

  // Развёртывание всех секций
  const expandAll = () => {
    Object.keys(expandedSections.value).forEach(key => {
      expandedSections.value[key] = true;
    });
  };

  // Сворачивание всех секций
  const collapseAll = () => {
    Object.keys(expandedSections.value).forEach(key => {
      expandedSections.value[key] = false;
    });
  };

  // Автоматическая загрузка
  if (autoLoad && logOrId) {
    loadLog(logOrId);
  } else if (logOrId && typeof logOrId === 'object') {
    setLog(logOrId);
  }

  return {
    // Состояние
    log,
    loading,
    error,
    expandedSections,
    
    // Вычисляемые свойства
    hasLog,
    formattedTimestamp,
    formattedEventType,
    formattedCategory,
    formattedDetails,
    
    // Методы
    loadLog,
    setLog,
    toggleSection,
    expandAll,
    collapseAll
  };
}


