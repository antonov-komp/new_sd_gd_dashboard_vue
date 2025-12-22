# Руководство разработчика: Интерфейс логов вебхуков

**Дата создания:** 2025-12-07  
**Версия:** 1.0

---

## 📋 Содержание

1. [Архитектура](#архитектура)
2. [Структура компонентов](#структура-компонентов)
3. [API сервисы](#api-сервисы)
4. [Composables](#composables)
5. [Утилиты](#утилиты)
6. [Процесс разработки](#процесс-разработки)
7. [Примеры использования](#примеры-использования)

---

## 🏗️ Архитектура

### Технологический стек

- **Vue.js 3.x** — фреймворк для UI (Composition API)
- **Vue Router 4.x** — маршрутизация
- **Chart.js 4.x** — графики и визуализация
- **Vanilla JS** — без дополнительных зависимостей для логики

### Структура проекта

```
vue-app/src/
├── pages/
│   └── WebhookLogsPage.vue          # Главная страница
├── components/
│   ├── webhooks/                    # Компоненты для логов
│   │   ├── WebhookLogList.vue       # Список логов
│   │   ├── WebhookLogDetails.vue    # Детальный просмотр
│   │   ├── WebhookLogFilters.vue    # Фильтры
│   │   ├── WebhookLogSearch.vue     # Поиск
│   │   ├── WebhookLogsStats.vue     # Статистика
│   │   ├── WebhookLogsDashboard.vue # Дашборд
│   │   ├── WebhookLogsExport.vue    # Экспорт
│   │   ├── RealtimeControls.vue     # Управление реальным временем
│   │   └── NewLogsIndicator.vue     # Индикатор новых событий
│   └── common/                       # Общие компоненты
│       ├── LoadingSkeleton.vue
│       ├── EmptyState.vue
│       ├── ErrorDisplay.vue
│       ├── Notification.vue
│       └── NotificationContainer.vue
├── services/
│   ├── webhook-logs-api.js          # API для логов
│   └── realtime-service.js          # Сервис реального времени
├── composables/
│   ├── useCache.js                  # Кеширование
│   ├── useRealtime.js               # Реальное время
│   ├── useNotifications.js           # Уведомления
│   ├── useLocalStorage.js           # LocalStorage
│   └── useUrlFilters.js              # URL фильтры
└── utils/
    ├── export-utils.js                # Экспорт данных
    ├── log-search.js                  # Поиск в логах
    └── chart-config.js                # Конфигурация Chart.js
```

---

## 🧩 Структура компонентов

### WebhookLogsPage

Главная страница, координирует работу всех компонентов.

**Основные функции:**
- Проверка доступа
- Загрузка логов
- Управление фильтрами и поиском
- Интеграция реального времени
- Обработка экспорта

**Props:** нет (страница)

**Emits:** нет

**Состояние:**
- `logs` — массив логов
- `filters` — объект фильтров
- `searchQuery` — строка поиска
- `pagination` — объект пагинации
- `selectedLog` — выбранный лог для детального просмотра
- `autoUpdateEnabled` — флаг автообновления

### WebhookLogList

Компонент для отображения списка логов в виде таблицы.

**Props:**
- `logs` (Array, required) — массив логов
- `loading` (Boolean) — флаг загрузки
- `error` (String) — сообщение об ошибке
- `pagination` (Object) — объект пагинации
- `selectedLogs` (Array) — выбранные логи

**Emits:**
- `select-log` — выбор лога для детального просмотра
- `page-change` — смена страницы
- `update:selectedLogs` — обновление выбранных логов

**Особенности:**
- Клиентская сортировка по колонкам
- Выбор записей чекбоксами
- Визуальные индикаторы статуса

### WebhookLogDetails

Модальное окно для детального просмотра лога.

**Props:**
- `log` (Object, required) — объект лога

**Emits:**
- `close` — закрытие модального окна

**Особенности:**
- Форматирование JSON payload
- Копирование данных в буфер обмена
- Оптимизация для больших payload (ленивая загрузка)

### WebhookLogFilters

Компонент фильтров для логов.

**Props:**
- `filters` (Object, required) — объект фильтров

**Emits:**
- `update:filters` — обновление фильтров
- `reset` — сброс фильтров

**Особенности:**
- Быстрые фильтры (Сегодня, Вчера и т.д.)
- Синхронизация с URL
- Сохранение в LocalStorage

### WebhookLogSearch

Компонент поиска по логам.

**Props:**
- `modelValue` (String) — значение поиска

**Emits:**
- `update:modelValue` — обновление значения
- `search` — выполнение поиска

**Особенности:**
- Debounce для оптимизации
- Клиентский поиск по нескольким полям

---

## 🔌 API сервисы

### WebhookLogsApiService

Сервис для работы с API логов.

**Методы:**

#### `getLogs(filters, pagination, forceRefresh)`

Получение списка логов с фильтрацией и пагинацией.

```javascript
const result = await WebhookLogsApiService.getLogs(
  { category: 'tasks', date: '2025-12-07' },
  { page: 1, limit: 50 },
  false // forceRefresh
);
```

**Параметры:**
- `filters` (Object) — фильтры
- `pagination` (Object) — пагинация
- `forceRefresh` (Boolean) — принудительное обновление

**Возвращает:** Promise с объектом `{ logs, pagination }`

**Кеширование:**
- TTL: 2 минуты
- Автоматическая инвалидация при изменении фильтров

#### `invalidateCacheOnFilterChange(oldFilters, newFilters)`

Инвалидация кеша при изменении фильтров.

```javascript
WebhookLogsApiService.invalidateCacheOnFilterChange(oldFilters, newFilters);
```

### RealtimeService

Сервис для работы с Server-Sent Events (SSE).

**Методы:**

#### `connect()`

Подключение к SSE endpoint.

```javascript
const service = new RealtimeService('/api/webhook-realtime.php');
service.connect();
```

#### `disconnect()`

Отключение от SSE endpoint.

```javascript
service.disconnect();
```

#### `on(event, callback)`

Подписка на событие.

```javascript
service.on('new_logs', (data) => {
  console.log('New logs:', data.logs);
});
```

**События:**
- `connected` — подключение установлено
- `new_logs` — получены новые логи
- `error` — ошибка соединения
- `timeout` — таймаут соединения
- `closed` — соединение закрыто
- `state-change` — изменение состояния

---

## 🎣 Composables

### useRealtime

Composable для работы с реальным временем.

```javascript
import { useRealtime } from '@/composables/useRealtime.js';

const {
  connectionState,
  isConnected,
  newLogsCount,
  connect,
  disconnect,
  applyNewLogs
} = useRealtime('/api/webhook-realtime.php', {
  autoConnect: false,
  enableSound: false,
  onNewLogs: (logs) => {
    console.log('New logs:', logs);
  }
});
```

**Опции:**
- `autoConnect` (Boolean) — автоматическое подключение
- `enableSound` (Boolean) — звуковые уведомления
- `onNewLogs` (Function) — callback при новых логах

### useCache

Composable для кеширования запросов.

```javascript
import { useCache } from '@/composables/useCache.js';

const { get, set, getCacheKey, invalidate } = useCache({
  ttl: 5 * 60 * 1000, // 5 минут
  maxSize: 100
});

const cacheKey = getCacheKey('/api/endpoint', { param: 'value' });
const cached = get(cacheKey);
if (!cached) {
  const data = await fetchData();
  set(cacheKey, data);
}
```

### useNotifications

Composable для управления уведомлениями.

```javascript
import { useNotifications } from '@/composables/useNotifications.js';

const { success, error, warning, info } = useNotifications();

success('Операция выполнена успешно');
error('Произошла ошибка');
```

### useUrlFilters

Composable для синхронизации фильтров с URL.

```javascript
import { useUrlFilters } from '@/composables/useUrlFilters.js';

const { filters, updateFilters, clearFilters } = useUrlFilters();

updateFilters({ category: 'tasks' });
```

---

## 🛠️ Утилиты

### export-utils.js

Утилиты для экспорта данных.

**Функции:**

#### `exportToCSV(data, filename)`

Экспорт в CSV формат.

```javascript
import { exportToCSV } from '@/utils/export-utils.js';

exportToCSV(logs, 'webhook-logs.csv');
```

#### `exportToJSON(data, filename, pretty)`

Экспорт в JSON формат.

```javascript
import { exportToJSON } from '@/utils/export-utils.js';

exportToJSON(logs, 'webhook-logs.json', true);
```

### log-search.js

Утилита для поиска в логах.

```javascript
import { searchInLogs } from '@/utils/log-search.js';

const results = searchInLogs(logs, 'ONTASKADD');
```

---

## 🔄 Процесс разработки

### Добавление нового фильтра

1. Добавьте поле в `WebhookLogFilters.vue`
2. Обновите `useUrlFilters.js` для синхронизации
3. Обновите `WebhookLogsApiService.getLogs()` для обработки фильтра
4. Обновите API endpoint `/api/webhook-logs.php`

### Добавление нового компонента

1. Создайте компонент в `components/webhooks/`
2. Добавьте JSDoc комментарии
3. Документируйте props и emits
4. Добавьте тесты (если возможно)

### Оптимизация производительности

1. Используйте кеширование для повторяющихся запросов
2. Используйте ленивую загрузку для тяжёлых компонентов
3. Оптимизируйте рендеринг больших списков
4. Используйте debounce для поиска

---

## 💡 Примеры использования

### Создание кастомного фильтра

```javascript
// В WebhookLogFilters.vue
const customFilter = ref('');

const handleCustomFilter = () => {
  emit('update:filters', {
    ...filters.value,
    custom: customFilter.value
  });
};
```

### Интеграция с внешним API

```javascript
// В WebhookLogsApiService
static async getLogsFromExternalAPI(filters) {
  const response = await fetch('/api/external-endpoint', {
    method: 'POST',
    body: JSON.stringify(filters)
  });
  return response.json();
}
```

### Кастомное уведомление

```javascript
import { useNotifications } from '@/composables/useNotifications.js';

const { showNotification } = useNotifications();

showNotification({
  type: 'success',
  message: 'Кастомное сообщение',
  duration: 5000
});
```

---

## 📚 Дополнительные ресурсы

- [Vue.js Documentation](https://vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Bitrix24 REST API](https://context7.com/bitrix24/rest/)

---

**Последнее обновление:** 2025-12-07

