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
   * Обновление опций сервиса
   * 
   * @param {Object} newOptions Новые опции
   */
  updateOptions(newOptions) {
    this.options = {
      ...this.options,
      ...newOptions
    };
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
      let urlString = this.url;
      
      // Если URL не начинается с http:// или https://, добавляем базовый URL
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        const urlWithParams = new URL(urlString, window.location.origin);
        if (this.options.lastTimestamp) {
          urlWithParams.searchParams.set('last_timestamp', this.options.lastTimestamp);
        }
        urlString = urlWithParams.toString();
      } else {
        // Если это полный URL, добавляем параметры через URLSearchParams
        const url = new URL(urlString);
        if (this.options.lastTimestamp) {
          url.searchParams.set('last_timestamp', this.options.lastTimestamp);
        }
        urlString = url.toString();
      }

      console.log('[RealtimeService] Connecting to:', urlString);
      this.eventSource = new EventSource(urlString);

      // Обработка открытия соединения
      this.eventSource.onopen = () => {
        console.log('[RealtimeService] EventSource opened');
        // Не устанавливаем состояние 'connected' сразу, ждем события 'connected' от сервера
        // Это позволяет серверу отправить начальное событие перед установкой состояния
        this.notifyListeners('open', { timestamp: new Date().toISOString() });
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
        try {
          const data = JSON.parse(event.data);
          console.log('[RealtimeService] Connected event received:', data);
          this.connectionState = 'connected';
          this.reconnectAttempts = 0;
          this.notifyListeners('connected', data);
          this.notifyListeners('state-change', { state: this.connectionState });
        } catch (error) {
          console.error('[RealtimeService] Error parsing connected event:', error);
        }
      });

      this.eventSource.addEventListener('new_logs', (event) => {
        const data = JSON.parse(event.data);
        // Обновление lastTimestamp
        if (data.logs && data.logs.length > 0) {
          const lastLog = data.logs[data.logs.length - 1];
          if (lastLog.timestamp) {
            this.options.lastTimestamp = lastLog.timestamp;
          }
        }
        this.notifyListeners('new_logs', data);
      });

      this.eventSource.addEventListener('error', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('error', data);
        } catch {
          // Если нет данных, просто уведомляем об ошибке
          this.notifyListeners('error', { message: 'Server error' });
        }
      });

      this.eventSource.addEventListener('timeout', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('timeout', data);
        } catch {
          this.notifyListeners('timeout', { message: 'Connection timeout' });
        }
        this.reconnect();
      });

      this.eventSource.addEventListener('closed', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notifyListeners('closed', data);
        } catch {
          this.notifyListeners('closed', { message: 'Connection closed' });
        }
        if (!this.isManualDisconnect) {
          this.reconnect();
        }
      });

      // Обработка ошибок соединения
      this.eventSource.onerror = (error) => {
        console.error('[RealtimeService] Connection error:', error);
        console.error('[RealtimeService] EventSource readyState:', this.eventSource?.readyState);
        
        // readyState: 0 = CONNECTING, 1 = OPEN, 2 = CLOSED
        if (this.eventSource?.readyState === EventSource.CLOSED) {
          // Соединение закрыто - это может быть нормально, если сервер закрыл соединение
          console.log('[RealtimeService] EventSource closed by server');
          this.connectionState = 'disconnected';
          this.notifyListeners('state-change', { state: this.connectionState });
          
          if (!this.isManualDisconnect) {
            this.reconnect();
          }
        } else if (this.eventSource?.readyState === EventSource.CONNECTING) {
          // Все еще пытается подключиться - не устанавливаем ошибку сразу
          console.log('[RealtimeService] Still connecting...');
        } else {
          // Другая ошибка
          this.connectionState = 'error';
          this.notifyListeners('error', { 
            error, 
            type: 'connection',
            message: 'Failed to connect to realtime stream',
            readyState: this.eventSource?.readyState
          });
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
    const delay = Math.min(
      this.options.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.options.reconnectInterval
    );

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

