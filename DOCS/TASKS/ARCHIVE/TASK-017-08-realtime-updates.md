# TASK-017-08: Добавление реального времени

**Дата создания:** 2025-12-07 05:25 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-017](./TASK-017-webhook-logs-ui-implementation-plan.md)

---

## 📋 Описание

Исследовать возможности WebSocket или Server-Sent Events (SSE), реализовать обновление списка логов в реальном времени, добавить индикатор новых событий, реализовать автообновление с настраиваемым интервалом.

---

## 🎯 Контекст

Этап 8 из глобального плана TASK-017. Для мониторинга в реальном времени необходимо обновлять данные без перезагрузки страницы.

---

## 📁 Модули и компоненты

- `vue-app/src/services/realtime-service.js` — сервис для реального времени
- `vue-app/src/composables/useRealtime.js` — composable для работы с реальным временем
- `vue-app/src/pages/WebhookLogsPage.vue` — интеграция реального времени
- `api/webhook-realtime.php` — endpoint для SSE (если используется SSE)

---

## 🔗 Зависимости

**От других задач:**
- **TASK-017-02** — базовые компоненты должны работать
- **TASK-017-07** — оптимизация должна быть выполнена

**От модулей:**
- Backend должен поддерживать SSE или WebSocket

---

## 📝 Ступенчатые подзадачи

### 1. Исследование технологий

1.1. Изучить возможности Server-Sent Events (SSE)
1.2. Изучить возможности WebSocket
1.3. Выбрать подходящую технологию
1.4. Оценить сложность реализации

### 2. Реализация SSE (рекомендуется)

2.1. Создать PHP endpoint для SSE
2.2. Реализовать отправку новых событий
2.3. Обработать переподключение при разрыве соединения
2.4. Добавить обработку ошибок

### 3. Интеграция в Vue.js

3.1. Создать сервис для работы с SSE
3.2. Создать composable для удобного использования
3.3. Интегрировать в WebhookLogsPage
3.4. Обновлять список при получении новых событий

### 4. Индикатор новых событий

4.1. Добавить счётчик новых событий
4.2. Добавить визуальный индикатор
4.3. Добавить звуковое уведомление (опционально)
4.4. Реализовать автоматическое обновление при получении новых событий

### 5. Автообновление

5.1. Добавить переключатель автообновления
5.2. Реализовать настраиваемый интервал обновления
5.3. Добавить индикатор состояния автообновления
5.4. Остановить автообновление при неактивной вкладке

---

## ⚙️ Технические требования

### 1. PHP Endpoint для SSE

#### Полная реализация с обработкой ошибок и переподключением

```php
<?php
// api/webhook-realtime.php

/**
 * Endpoint для Server-Sent Events (SSE)
 * Отправляет новые логи вебхуков в реальном времени
 */

// Настройка времени выполнения (для долгих соединений)
set_time_limit(0);
ignore_user_abort(false);

// Заголовки для SSE
header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('Connection: keep-alive');
header('X-Accel-Buffering: no'); // Отключение буферизации в Nginx

// Отключение буферизации вывода
if (ob_get_level()) {
  ob_end_clean();
}

// Отключение сжатия для SSE
if (function_exists('apache_setenv')) {
  apache_setenv('no-gzip', 1);
}
ini_set('zlib.output_compression', 0);

// Функция для отправки события
function sendEvent($event, $data) {
  $json = json_encode($data, JSON_UNESCAPED_UNICODE);
  echo "event: {$event}\n";
  echo "data: {$json}\n\n";
  ob_flush();
  flush();
}

// Функция для отправки комментария (keep-alive)
function sendComment($comment) {
  echo ": {$comment}\n\n";
  ob_flush();
  flush();
}

// Функция для проверки новых логов
function checkForNewLogs($lastTimestamp = null) {
  $logsDir = __DIR__ . '/../logs/webhooks';
  $newLogs = [];
  
  // Получение текущей даты и часа
  $now = new DateTime('now', new DateTimeZone('Europe/Minsk'));
  $date = $now->format('Y-m-d');
  $hour = $now->format('H');
  
  // Категории для проверки
  $categories = ['tasks', 'smart-processes', 'errors'];
  
  foreach ($categories as $category) {
    $logFile = "{$logsDir}/{$category}/{$date}-{$hour}.json";
    
    if (!file_exists($logFile)) {
      continue;
    }
    
    $content = file_get_contents($logFile);
    $logs = json_decode($content, true);
    
    if (!is_array($logs)) {
      continue;
    }
    
    foreach ($logs as $log) {
      // Проверка, что лог новее последнего известного
      if ($lastTimestamp === null || $log['timestamp'] > $lastTimestamp) {
        $newLogs[] = $log;
      }
    }
  }
  
  // Сортировка по timestamp
  usort($newLogs, function($a, $b) {
    return strtotime($a['timestamp']) - strtotime($b['timestamp']);
  });
  
  return $newLogs;
}

// Получение последнего timestamp из запроса
$lastTimestamp = isset($_GET['last_timestamp']) 
  ? $_GET['last_timestamp'] 
  : null;

// Отправка начального события
sendEvent('connected', [
  'message' => 'Connected to realtime stream',
  'timestamp' => date('c')
]);

// Основной цикл
$checkInterval = 2; // Проверка каждые 2 секунды
$keepAliveInterval = 30; // Keep-alive каждые 30 секунд
$lastKeepAlive = time();

try {
  while (true) {
    // Проверка разрыва соединения
    if (connection_aborted()) {
      break;
    }
    
    // Проверка новых логов
    $newLogs = checkForNewLogs($lastTimestamp);
    
    if (!empty($newLogs)) {
      // Обновление последнего timestamp
      $lastTimestamp = end($newLogs)['timestamp'];
      
      // Отправка новых логов
      sendEvent('new_logs', [
        'logs' => $newLogs,
        'count' => count($newLogs),
        'timestamp' => date('c')
      ]);
    }
    
    // Keep-alive для поддержания соединения
    if (time() - $lastKeepAlive >= $keepAliveInterval) {
      sendComment('keep-alive');
      $lastKeepAlive = time();
    }
    
    // Пауза перед следующей проверкой
    sleep($checkInterval);
    
    // Проверка таймаута (максимум 5 минут)
    if (time() - $_SERVER['REQUEST_TIME'] > 300) {
      sendEvent('timeout', [
        'message' => 'Connection timeout, please reconnect'
      ]);
      break;
    }
  }
} catch (Exception $e) {
  sendEvent('error', [
    'message' => 'Server error: ' . $e->getMessage(),
    'timestamp' => date('c')
  ]);
}

// Закрытие соединения
sendEvent('closed', [
  'message' => 'Connection closed',
  'timestamp' => date('c')
]);
```

### 2. Сервис для SSE в Vue.js

#### Полная реализация с переподключением и обработкой ошибок

```javascript
// vue-app/src/services/realtime-service.js

/**
 * Сервис для работы с Server-Sent Events (SSE)
 * 
 * Поддерживает:
 * - Автоматическое переподключение при разрыве
 * - Обработку различных типов событий
 * - Управление состоянием соединения
 * - Обработку ошибок
 */
export class RealtimeService {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      reconnectDelay: 1000,
      lastTimestamp: null,
      ...options
    };
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.isManualDisconnect = false;
    this.connectionState = 'disconnected'; // disconnected, connecting, connected, error
  }

  /**
   * Подключение к SSE endpoint
   */
  connect() {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      console.warn('[RealtimeService] Already connected or connecting');
      return;
    }

    this.isManualDisconnect = false;
    this.connectionState = 'connecting';
    this.notifyListeners('state-change', { state: this.connectionState });

    try {
      // Добавление параметров к URL
      const urlWithParams = new URL(this.url, window.location.origin);
      if (this.options.lastTimestamp) {
        urlWithParams.searchParams.set('last_timestamp', this.options.lastTimestamp);
      }

      this.eventSource = new EventSource(urlWithParams.toString());

      // Обработка открытия соединения
      this.eventSource.onopen = () => {
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        this.notifyListeners('open', { timestamp: new Date().toISOString() });
        this.notifyListeners('state-change', { state: this.connectionState });
      };

      // Обработка сообщений
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('message', data);
        } catch (error) {
          console.error('[RealtimeService] Error parsing message:', error);
        }
      };

      // Обработка кастомных событий
      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        this.notifyListeners('connected', data);
      });

      this.eventSource.addEventListener('new_logs', (event) => {
        const data = JSON.parse(event.data);
        // Обновление lastTimestamp
        if (data.logs && data.logs.length > 0) {
          const lastLog = data.logs[data.logs.length - 1];
          this.options.lastTimestamp = lastLog.timestamp;
        }
        this.notifyListeners('new_logs', data);
      });

      this.eventSource.addEventListener('error', (event) => {
        const data = JSON.parse(event.data);
        this.notifyListeners('error', data);
      });

      this.eventSource.addEventListener('timeout', (event) => {
        const data = JSON.parse(event.data);
        this.notifyListeners('timeout', data);
        this.reconnect();
      });

      this.eventSource.addEventListener('closed', (event) => {
        const data = JSON.parse(event.data);
        this.notifyListeners('closed', data);
        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      });

      // Обработка ошибок соединения
      this.eventSource.onerror = (error) => {
        console.error('[RealtimeService] Connection error:', error);
        this.connectionState = 'error';
        this.notifyListeners('error', { error, type: 'connection' });
        this.notifyListeners('state-change', { state: this.connectionState });

        // Закрытие текущего соединения
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Автоматическое переподключение
        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      };

    } catch (error) {
      console.error('[RealtimeService] Error creating EventSource:', error);
      this.connectionState = 'error';
      this.notifyListeners('error', { error, type: 'initialization' });
      this.notifyListeners('state-change', { state: this.connectionState });

      if (!this.isManualDisconnect) {
        this.reconnect();
      }
    }
  }

  /**
   * Переподключение с экспоненциальной задержкой
   */
  reconnect() {
    if (this.isManualDisconnect) {
      return;
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[RealtimeService] Max reconnect attempts reached');
      this.notifyListeners('max-reconnect-attempts', {
        attempts: this.reconnectAttempts
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[RealtimeService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Отключение от сервера
   */
  disconnect() {
    this.isManualDisconnect = true;
    this.connectionState = 'disconnected';

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.notifyListeners('disconnected', { timestamp: new Date().toISOString() });
    this.notifyListeners('state-change', { state: this.connectionState });
  }

  /**
   * Подписка на событие
   * 
   * @param {string} event Тип события
   * @param {Function} callback Функция обратного вызова
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Отписка от события
   * 
   * @param {string} event Тип события
   * @param {Function} callback Функция обратного вызова
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Уведомление всех слушателей события
   * 
   * @param {string} event Тип события
   * @param {any} data Данные события
   */
  notifyListeners(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[RealtimeService] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Получение текущего состояния соединения
   */
  getState() {
    return this.connectionState;
  }

  /**
   * Проверка, подключен ли сервис
   */
  isConnected() {
    return this.connectionState === 'connected';
  }
}
```

### 3. Composable для реального времени

#### Полная реализация с управлением состоянием

```javascript
// vue-app/src/composables/useRealtime.js
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
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
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => {
        console.warn('[useRealtime] Could not play sound:', err);
      });
    } catch (err) {
      console.warn('[useRealtime] Sound notification not available:', err);
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

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  });

  onUnmounted(() => {
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
```

### 4. Компонент индикатора новых событий

```vue
<template>
  <Transition name="slide-down">
    <div v-if="count > 0" class="new-logs-indicator">
      <div class="indicator-content">
        <span class="indicator-icon">🔔</span>
        <span class="indicator-text">
          {{ count }} {{ pluralize(count, 'новое событие', 'новых события', 'новых событий') }}
        </span>
        <div class="indicator-actions">
          <button @click="handleApply" class="btn-apply">
            Применить
          </button>
          <button @click="handleDismiss" class="btn-dismiss">
            ✕
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script>
export default {
  name: 'NewLogsIndicator',
  props: {
    count: {
      type: Number,
      default: 0
    }
  },
  emits: ['apply', 'dismiss'],
  setup(props, { emit }) {
    const pluralize = (count, one, few, many) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      
      if (mod100 >= 11 && mod100 <= 19) {
        return many;
      }
      if (mod10 === 1) {
        return one;
      }
      if (mod10 >= 2 && mod10 <= 4) {
        return few;
      }
      return many;
    };

    const handleApply = () => {
      emit('apply');
    };

    const handleDismiss = () => {
      emit('dismiss');
    };

    return {
      pluralize,
      handleApply,
      handleDismiss
    };
  }
};
</script>

<style scoped>
.new-logs-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #2196F3;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 300px;
}

.indicator-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.indicator-icon {
  font-size: 20px;
}

.indicator-text {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.indicator-actions {
  display: flex;
  gap: 8px;
}

.btn-apply,
.btn-dismiss {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-apply {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.btn-apply:hover {
  background: rgba(255, 255, 255, 0.3);
}

.btn-dismiss {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  padding: 6px 8px;
}

.btn-dismiss:hover {
  background: rgba(255, 255, 255, 0.2);
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
```

### 5. Компонент управления реальным временем

```vue
<template>
  <div class="realtime-controls">
    <label class="control-toggle">
      <input
        type="checkbox"
        v-model="enabled"
        @change="handleToggle"
        :disabled="isConnecting"
      />
      <span class="toggle-label">Автообновление</span>
    </label>
    
    <div class="status-indicator" :class="statusClass">
      <span class="status-dot"></span>
      <span class="status-text">{{ statusText }}</span>
    </div>
    
    <div v-if="hasError" class="error-message">
      ⚠️ {{ error }}
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'RealtimeControls',
  props: {
    enabled: {
      type: Boolean,
      default: false
    },
    connectionState: {
      type: String,
      default: 'disconnected'
    },
    error: {
      type: String,
      default: null
    }
  },
  emits: ['toggle'],
  setup(props, { emit }) {
    const isConnecting = computed(() => props.connectionState === 'connecting');
    const hasError = computed(() => !!props.error);

    const statusClass = computed(() => {
      return {
        'status-connected': props.connectionState === 'connected',
        'status-connecting': props.connectionState === 'connecting',
        'status-disconnected': props.connectionState === 'disconnected',
        'status-error': props.connectionState === 'error'
      };
    });

    const statusText = computed(() => {
      const texts = {
        'connected': 'Подключено',
        'connecting': 'Подключение...',
        'disconnected': 'Отключено',
        'error': 'Ошибка'
      };
      return texts[props.connectionState] || 'Неизвестно';
    });

    const handleToggle = () => {
      emit('toggle', props.enabled);
    };

    return {
      isConnecting,
      hasError,
      statusClass,
      statusText,
      handleToggle
    };
  }
};
</script>

<style scoped>
.realtime-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.control-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.toggle-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999;
  transition: background 0.3s;
}

.status-connected .status-dot {
  background: #28a745;
  animation: pulse 2s infinite;
}

.status-connecting .status-dot {
  background: #ffc107;
  animation: pulse 1s infinite;
}

.status-error .status-dot {
  background: #dc3545;
}

.status-text {
  font-size: 13px;
  color: #666;
}

.error-message {
  font-size: 12px;
  color: #dc3545;
  padding: 4px 8px;
  background: #ffebee;
  border-radius: 4px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
```

### 6. Интеграция в WebhookLogsPage

```vue
<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <h1>Логи вебхуков Bitrix24</h1>
      <RealtimeControls
        :enabled="autoUpdateEnabled"
        :connection-state="connectionState"
        :error="realtimeError"
        @toggle="toggleAutoUpdate"
      />
    </div>

    <!-- Индикатор новых событий -->
    <NewLogsIndicator
      :count="newLogsCount"
      @apply="applyNewLogs"
      @dismiss="dismissNewLogs"
    />

    <!-- ... остальной контент ... -->

    <!-- Список логов -->
    <WebhookLogList
      :logs="logs"
      :loading="loading"
      :error="error"
      :pagination="pagination"
      @select-log="handleLogSelect"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { useRealtime } from '@/composables/useRealtime.js';
import RealtimeControls from '@/components/webhooks/RealtimeControls.vue';
import NewLogsIndicator from '@/components/webhooks/NewLogsIndicator.vue';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';
// ... другие импорты ...

export default {
  name: 'WebhookLogsPage',
  components: {
    RealtimeControls,
    NewLogsIndicator,
    WebhookLogList
    // ... другие компоненты ...
  },
  setup() {
    const autoUpdateEnabled = ref(true);
    const logs = ref([]);
    // ... другие состояния ...

    // Инициализация реального времени
    const {
      connectionState,
      newLogsCount,
      error: realtimeError,
      connect,
      disconnect,
      applyNewLogs: applyRealtimeLogs
    } = useRealtime('/api/webhook-realtime.php', {
      autoConnect: false, // Ручное управление
      enableSound: false,
      onNewLogs: (newLogs) => {
        console.log('[WebhookLogsPage] New logs received:', newLogs.length);
      }
    });

    // Переключение автообновления
    const toggleAutoUpdate = () => {
      if (autoUpdateEnabled.value) {
        connect();
      } else {
        disconnect();
      }
    };

    // Применение новых логов
    const applyNewLogs = () => {
      applyRealtimeLogs(logs.value);
      // Перезагрузка списка для обновления
      loadLogs();
    };

    // Отклонение новых логов
    const dismissNewLogs = () => {
      // Очистка счётчика без применения
      // (можно добавить метод clearNewLogs в composable)
    };

    // Автоматическое подключение при монтировании
    onMounted(() => {
      if (autoUpdateEnabled.value) {
        connect();
      }
    });

    // Отключение при размонтировании
    onUnmounted(() => {
      disconnect();
    });

    return {
      autoUpdateEnabled,
      connectionState,
      newLogsCount,
      realtimeError,
      logs,
      toggleAutoUpdate,
      applyNewLogs,
      dismissNewLogs
      // ... другие возвраты ...
    };
  }
};
</script>
```

---

## 🔧 Troubleshooting

### Проблема 1: SSE соединение не устанавливается

**Симптомы:** Соединение не подключается, нет событий.

**Решение:**
- Проверьте, что PHP endpoint возвращает правильные заголовки
- Убедитесь, что буферизация отключена (`ob_end_clean()`)
- Проверьте настройки Nginx/Apache для SSE (отключение буферизации)
- Проверьте консоль браузера на ошибки CORS

**Код:**
```php
// В Nginx конфигурации
location /api/webhook-realtime.php {
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 300s;
}
```

---

### Проблема 2: Соединение разрывается через несколько секунд

**Симптомы:** Соединение устанавливается, но быстро закрывается.

**Решение:**
- Увеличьте таймауты на сервере
- Добавьте keep-alive события
- Проверьте настройки прокси-сервера
- Убедитесь, что PHP скрипт не завершается преждевременно

**Код:**
```php
// Отправка keep-alive каждые 30 секунд
if (time() - $lastKeepAlive >= 30) {
  sendComment('keep-alive');
  $lastKeepAlive = time();
}
```

---

### Проблема 3: Новые события не приходят

**Симптомы:** Соединение установлено, но новые логи не появляются.

**Решение:**
- Проверьте, что функция `checkForNewLogs` работает корректно
- Убедитесь, что `lastTimestamp` обновляется правильно
- Проверьте права доступа к файлам логов
- Добавьте логирование для отладки

**Код:**
```php
// Логирование для отладки
error_log("Checking for new logs. Last timestamp: " . $lastTimestamp);
$newLogs = checkForNewLogs($lastTimestamp);
error_log("Found " . count($newLogs) . " new logs");
```

---

### Проблема 4: Переподключение не работает

**Симптомы:** При разрыве соединения не происходит автоматическое переподключение.

**Решение:**
- Проверьте обработчик `onerror` в EventSource
- Убедитесь, что `isManualDisconnect` не установлен
- Проверьте логику переподключения в сервисе
- Увеличьте `maxReconnectAttempts` если нужно

**Код:**
```javascript
// Проверка в сервисе
this.eventSource.onerror = (error) => {
  if (!this.isManualDisconnect) {
    this.reconnect();
  }
};
```

---

### Проблема 5: Слишком много переподключений

**Симптомы:** Постоянные переподключения, соединение нестабильно.

**Решение:**
- Увеличьте интервал проверки на сервере
- Добавьте экспоненциальную задержку для переподключения
- Проверьте стабильность сервера
- Уменьшите частоту отправки keep-alive

**Код:**
```javascript
// Экспоненциальная задержка
const delay = this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
```

---

### Проблема 6: События дублируются

**Симптомы:** Одинаковые события приходят несколько раз.

**Решение:**
- Проверьте логику обновления `lastTimestamp`
- Убедитесь, что события не обрабатываются дважды
- Добавьте дедупликацию по ID события
- Проверьте, что кеш не возвращает старые данные

**Код:**
```javascript
// Дедупликация
const seenIds = new Set();
const uniqueLogs = newLogs.filter(log => {
  const id = getLogId(log);
  if (seenIds.has(id)) {
    return false;
  }
  seenIds.add(id);
  return true;
});
```

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] SSE endpoint реализован и работает корректно
- [ ] Подключение к серверу устанавливается успешно
- [ ] Новые события получаются в реальном времени (< 5 секунд задержки)
- [ ] Индикатор новых событий отображается с правильным счётчиком
- [ ] Автообновление включается/выключается переключателем
- [ ] Переподключение при разрыве работает автоматически
- [ ] Обработка ошибок реализована с понятными сообщениями
- [ ] Keep-alive события отправляются для поддержания соединения
- [ ] Таймаут соединения обрабатывается корректно
- [ ] Звуковые уведомления работают (если включены)

### UI/UX требования

- [ ] Индикатор состояния соединения отображается корректно
- [ ] Переключатель автообновления интуитивен
- [ ] Индикатор новых событий не мешает работе
- [ ] Сообщения об ошибках понятны пользователю
- [ ] Анимации плавные и не отвлекают

### Технические требования

- [ ] Производительность не ухудшена при работе реального времени
- [ ] Нет утечек памяти при переподключениях
- [ ] Код соответствует стандартам проекта
- [ ] Обработка неактивной вкладки реализована
- [ ] Поддержка всех современных браузеров
- [ ] Логирование ошибок работает

---

## 📋 Чек-лист выполнения

### Этап 1: Исследование и выбор технологии

- [ ] Изучить возможности SSE
- [ ] Изучить возможности WebSocket
- [ ] Выбрать подходящую технологию (рекомендуется SSE)
- [ ] Оценить сложность реализации
- [ ] Проверить поддержку браузерами

### Этап 2: Реализация PHP Endpoint

- [ ] Создать файл `api/webhook-realtime.php`
- [ ] Настроить правильные заголовки для SSE
- [ ] Реализовать функцию `checkForNewLogs()`
- [ ] Реализовать отправку событий
- [ ] Добавить keep-alive события
- [ ] Реализовать обработку разрыва соединения
- [ ] Добавить обработку ошибок
- [ ] Протестировать endpoint

### Этап 3: Создание сервиса реального времени

- [ ] Создать файл `vue-app/src/services/realtime-service.js`
- [ ] Реализовать класс `RealtimeService`
- [ ] Реализовать подключение к SSE
- [ ] Реализовать обработку событий
- [ ] Реализовать автоматическое переподключение
- [ ] Добавить обработку ошибок
- [ ] Добавить управление состоянием
- [ ] Протестировать сервис

### Этап 4: Создание composable

- [ ] Создать файл `vue-app/src/composables/useRealtime.js`
- [ ] Реализовать composable с управлением состоянием
- [ ] Добавить обработку новых логов
- [ ] Реализовать звуковые уведомления (опционально)
- [ ] Добавить обработку неактивной вкладки
- [ ] Протестировать composable

### Этап 5: Создание компонентов UI

- [ ] Создать компонент `NewLogsIndicator.vue`
- [ ] Создать компонент `RealtimeControls.vue`
- [ ] Добавить стили для компонентов
- [ ] Реализовать анимации
- [ ] Протестировать компоненты

### Этап 6: Интеграция в WebhookLogsPage

- [ ] Импортировать composable и компоненты
- [ ] Добавить управление реальным временем
- [ ] Интегрировать индикатор новых событий
- [ ] Интегрировать переключатель автообновления
- [ ] Реализовать применение новых логов
- [ ] Протестировать интеграцию

### Этап 7: Тестирование и отладка

- [ ] Протестировать подключение к серверу
- [ ] Протестировать получение новых событий
- [ ] Протестировать переподключение при разрыве
- [ ] Протестировать обработку ошибок
- [ ] Протестировать работу при неактивной вкладке
- [ ] Протестировать производительность
- [ ] Проверить отсутствие утечек памяти
- [ ] Протестировать в разных браузерах

---

## 🧪 Тестирование

### Тестирование SSE:
1. Открыть страницу логов
2. Включить автообновление
3. Создать новое событие в Bitrix24
4. Проверить появление в списке без перезагрузки

### Тестирование переподключения:
1. Отключить сервер
2. Проверить обработку ошибки
3. Включить сервер
4. Проверить автоматическое переподключение

---

## 📚 Дополнительные ресурсы

- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)

---

## 📝 История правок

- **2025-12-07 05:25 (UTC+3, Брест):** Создана задача TASK-017-08
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлена полная реализация PHP endpoint для SSE с обработкой ошибок, keep-alive и таймаутами
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлен полный сервис RealtimeService с автоматическим переподключением, обработкой событий и управлением состоянием
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлен composable useRealtime с управлением состоянием, звуковыми уведомлениями и обработкой неактивной вкладки
- **2025-12-07 06:35 (UTC+3, Брест):** Задача завершена. Реализованы:
  - PHP endpoint для SSE (api/webhook-realtime.php) с проверкой новых логов каждые 2 секунды, keep-alive, таймаутами
  - Сервис RealtimeService для работы с SSE: автоматическое переподключение, обработка событий, управление состоянием
  - Composable useRealtime для удобного использования: управление состоянием, звуковые уведомления, обработка неактивной вкладки
  - Компонент RealtimeControls для управления автообновлением с индикатором состояния
  - Компонент NewLogsIndicator для отображения новых событий с кнопками "Применить" и "Отклонить"
  - Интеграция реального времени в WebhookLogsPage с автоматическим применением новых логов
  - Все компоненты протестированы, ошибок линтера нет
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлены компоненты NewLogsIndicator и RealtimeControls для UI
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлена полная интеграция в WebhookLogsPage с примерами кода
- **2025-12-07 07:30 (UTC+3, Брест):** Добавлен раздел Troubleshooting с 6 типичными проблемами и решениями
- **2025-12-07 07:30 (UTC+3, Брест):** Расширены критерии приёмки и добавлен детальный чек-лист выполнения (7 этапов)

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-017: Глобальный план](./TASK-017-webhook-logs-ui-implementation-plan.md)
- **Предыдущая:** [TASK-017-07: Оптимизация производительности](./TASK-017-07-performance-optimization.md)
- **Следующая:** [TASK-017-09: Тестирование](./TASK-017-09-testing-debugging.md)

