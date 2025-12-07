import { ref, computed, onMounted, onUnmounted } from 'vue';
import { RealtimeService } from '@/services/realtime-service.js';

/**
 * Composable для работы с реальным временем
 * 
 * @param {string} url URL SSE endpoint
 * @param {Object} options Опции
 * @returns {Object} API для работы с реальным временем
 */
export function useRealtime(url, options = {}) {
  const {
    autoConnect = false,
    enableSound = false,
    onNewLogs = null
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
  };

  const handleNewLogs = (data) => {
    const logs = data.logs || [];
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
      // Простое звуковое уведомление через Web Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (err) {
      console.warn('[useRealtime] Sound notification not available:', err);
    }
  };

  // Остановка при неактивной вкладке
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Вкладка неактивна - можно приостановить обновления
      // (опционально, можно оставить подключение)
    } else {
      // Вкладка активна - переподключение если нужно
      if (connectionState.value === 'disconnected' && autoConnect) {
        connect();
      }
    }
  };

  // Автоматическое подключение при монтировании
  if (autoConnect) {
    onMounted(() => {
      connect();
      document.addEventListener('visibilitychange', handleVisibilityChange);
    });
  } else {
    onMounted(() => {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  // Отключение при размонтировании
  onUnmounted(() => {
    disconnect();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    // Состояние
    connectionState,
    isConnected,
    isConnecting,
    hasError,
    hasNewLogs,
    newLogs,
    newLogsCount,
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

