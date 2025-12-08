import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RealtimeService } from '@/services/realtime-service.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';

/**
 * Composable для работы с реальным временем
 * 
 * Обновлён для работы с новым рефакторенным SSE endpoint
 * Использует типизированные интерфейсы и валидацию данных
 * 
 * @param {string} url URL SSE endpoint
 * @param {Object} options Опции
 * @returns {Object} API для работы с реальным временем
 */
export function useRealtime(url, options = {}) {
  const {
    autoConnect = false,
    enableSound = false,
    onNewLogs = null,
    validateLogs = true // Валидация новых логов
  } = options;

  const service = new RealtimeService(url, options);
  const connectionState = ref('disconnected');
  const newLogs = ref([]);
  const newLogsCount = ref(0);
  const lastUpdateTime = ref(null);
  const error = ref(null);
  const reconnectAttempts = ref(0);

  // Вычисляемые свойства
  const isConnected = computed(() => connectionState.value === 'connected');
  const isConnecting = computed(() => connectionState.value === 'connecting');
  const hasError = computed(() => connectionState.value === 'error');
  const hasNewLogs = computed(() => newLogsCount.value > 0);

  // Обработчики событий
  const handleStateChange = (data) => {
    connectionState.value = data.state;
    if (data.state === 'connected') {
      reconnectAttempts.value = 0;
      error.value = null;
    }
  };

  const handleNewLogs = (data) => {
    let logs = data.logs || [];
    
    // Валидация и нормализация логов
    if (validateLogs) {
      logs = normalizeWebhookLogEntries(logs);
      
      // Фильтруем невалидные записи
      const validLogs = logs.filter(log => isValidWebhookLogEntry(log));
      
      if (validLogs.length !== logs.length) {
        console.warn(
          '[useRealtime] Filtered out invalid logs:',
          logs.length - validLogs.length
        );
      }
      
      logs = validLogs;
    }
    
    if (logs.length === 0) {
      return; // Нет валидных логов
    }
    
    // Добавление новых логов
    newLogs.value.push(...logs);
    newLogsCount.value += logs.length;
    lastUpdateTime.value = new Date().toISOString();

    // Звуковое уведомление (опционально)
    if (enableSound && logs.length > 0) {
      playNotificationSound();
    }

    // Callback для обработки новых логов
    if (onNewLogs) {
      onNewLogs(logs);
    }
  };

  const handleError = (data) => {
    error.value = data.message || 'Connection error';
    console.error('[useRealtime] Error:', data);
  };

  const handleTimeout = (data) => {
    console.warn('[useRealtime] Connection timeout:', data);
    // Автоматическое переподключение обрабатывается сервисом
  };

  const handleMaxReconnectAttempts = (data) => {
    error.value = `Max reconnect attempts reached (${data.attempts})`;
    console.error('[useRealtime] Max reconnect attempts:', data);
  };

  // Подключение
  const connect = () => {
    error.value = null;
    service.on('state-change', handleStateChange);
    service.on('new_logs', handleNewLogs);
    service.on('error', handleError);
    service.on('timeout', handleTimeout);
    service.on('max-reconnect-attempts', handleMaxReconnectAttempts);
    service.connect();
  };

  // Отключение
  const disconnect = () => {
    service.off('state-change', handleStateChange);
    service.off('new_logs', handleNewLogs);
    service.off('error', handleError);
    service.off('timeout', handleTimeout);
    service.off('max-reconnect-attempts', handleMaxReconnectAttempts);
    service.disconnect();
  };

  // Очистка новых логов
  const clearNewLogs = () => {
    newLogs.value = [];
    newLogsCount.value = 0;
  };

  // Применение новых логов к основному списку
  const applyNewLogs = (logsList) => {
    if (logsList && Array.isArray(logsList)) {
      // Добавление новых логов в начало списка
      logsList.unshift(...newLogs.value);
      clearNewLogs();
    }
  };

  // Звуковое уведомление
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => {
        console.warn('[useRealtime] Failed to play sound:', err);
      });
    } catch (err) {
      console.warn('[useRealtime] Sound not available:', err);
    }
  };

  // Автоматическое подключение при монтировании
  if (autoConnect) {
    onMounted(() => {
      connect();
    });
  }

  // Отключение при размонтировании
  onUnmounted(() => {
    disconnect();
  });

  return {
    // Состояние
    connectionState,
    isConnected,
    isConnecting,
    hasError,
    newLogs,
    newLogsCount,
    hasNewLogs,
    lastUpdateTime,
    error,
    reconnectAttempts,
    
    // Методы
    connect,
    disconnect,
    clearNewLogs,
    applyNewLogs
  };
}

