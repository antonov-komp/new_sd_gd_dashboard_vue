# TASK-018-05-02-01: Рефакторинг основных Vue.js компонентов для работы с новым API

**Дата создания:** 2025-12-07 17:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг / Адаптация

---

## 📋 Описание

Рефакторинг основных Vue.js компонентов (`WebhookLogsPage`, `WebhookLogList`, `WebhookLogDetails`) для работы с новым рефакторенным API модуля логирования вебхуков. Адаптация компонентов к использованию типизированных интерфейсов, обновлённых сервисов и улучшенной структуре данных.

**Цель этапа:**
- Обновить `WebhookLogsPage` для использования обновлённого `WebhookLogsApiService`
- Адаптировать `WebhookLogList` для работы с новой структурой данных логов
- Обновить `WebhookLogDetails` для отображения улучшенных деталей событий
- Интегрировать типизированные интерфейсы и валидаторы
- Использовать новые форматтеры для отображения данных
- Улучшить обработку ошибок с использованием новых типов ошибок
- Оптимизировать производительность компонентов

---

## 🎯 Контекст

Это первая часть второго этапа рефакторинга Vue.js компонентов (TASK-018-05-02). После обновления сервисов и composables (TASK-018-05-01) необходимо обновить основные компоненты для работы с новым API и структурой данных.

**Текущее состояние:**
- Компоненты используют старый формат данных от API
- Нет типизации данных в компонентах
- Обработка ошибок не использует новые типы
- Форматирование данных реализовано внутри компонентов
- Нет валидации данных перед отображением

**Целевое состояние:**
- Компоненты используют типизированные интерфейсы
- Валидация данных перед отображением
- Использование централизованных форматтеров
- Улучшенная обработка ошибок
- Оптимизированная производительность

**Связи:**
- Зависит от: TASK-018-05-01 (обновлённые сервисы и composables)
- Зависит от него: TASK-018-05-02-02 (вспомогательные компоненты будут использовать обновлённые основные компоненты)
- **Бэкенд:** Новый API использует сущности и возвращает структурированные данные

---

## 📁 Модули и компоненты

### Файлы для изменения:

1. **`vue-app/src/pages/WebhookLogsPage.vue`**
   - Обновить для использования обновлённого `WebhookLogsApiService`
   - Интегрировать типизированные интерфейсы
   - Использовать валидаторы и форматтеры
   - Улучшить обработку ошибок

2. **`vue-app/src/components/webhooks/WebhookLogList.vue`**
   - Адаптировать для новой структуры данных логов
   - Использовать форматтеры для отображения
   - Добавить валидацию данных перед отображением
   - Оптимизировать сортировку и фильтрацию

3. **`vue-app/src/components/webhooks/WebhookLogDetails.vue`**
   - Обновить для отображения улучшенных деталей событий
   - Использовать форматтеры для деталей
   - Улучшить отображение больших payload
   - Добавить валидацию структуры данных

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Обновление WebhookLogsPage

**1.1. Импорт типизированных интерфейсов и утилит:**

```javascript
// Добавить в начало <script> секции WebhookLogsPage.vue

import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';

import { 
  validateFilters,
  validatePagination 
} from '@/utils/webhook-validators.js';

import { 
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';
```

**1.2. Обновить метод `loadLogs()` для использования обновлённого API:**

```javascript
// В setup() функции WebhookLogsPage.vue

const loadLogs = async (forceRefresh = false) => {
  loading.value = true;
  error.value = null;
  
  try {
    // Валидация фильтров перед запросом
    if (!validateFilters(filters.value)) {
      throw new Error('Некорректные параметры фильтрации');
    }
    
    // Использование обновлённого API сервиса
    const result = await WebhookLogsApiService.getLogs(
      filters.value,
      pagination.value.page,
      pagination.value.limit,
      forceRefresh
    );
    
    // Валидация ответа
    if (!result.success) {
      throw new Error(result.error || 'Ошибка загрузки логов');
    }
    
    // Валидация пагинации
    if (!validatePagination(result.pagination)) {
      console.warn('[WebhookLogsPage] Invalid pagination format, using defaults');
      pagination.value = {
        page: pagination.value.page,
        limit: pagination.value.limit,
        total: result.logs.length,
        pages: Math.ceil(result.logs.length / pagination.value.limit)
      };
    } else {
      pagination.value = result.pagination;
    }
    
    // Нормализация и валидация логов
    const normalizedLogs = normalizeWebhookLogEntries(result.logs);
    
    // Фильтрация невалидных записей
    const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));
    
    if (validLogs.length !== normalizedLogs.length) {
      console.warn(
        '[WebhookLogsPage] Filtered out invalid logs:',
        normalizedLogs.length - validLogs.length
      );
    }
    
    logs.value = validLogs;
    
    // Уведомление об успехе
    if (forceRefresh) {
      showSuccess('Логи обновлены');
    }
  } catch (err) {
    console.error('[WebhookLogsPage] Error loading logs:', err);
    error.value = err.message || 'Ошибка загрузки логов';
    showError(error.value);
    
    // Очистка логов при ошибке
    logs.value = [];
  } finally {
    loading.value = false;
  }
};
```

**1.3. Обновить обработку ошибок:**

```javascript
// Добавить в setup() функцию

const handleApiError = (err) => {
  console.error('[WebhookLogsPage] API Error:', err);
  
  // Обработка разных типов ошибок
  if (err.status === 403) {
    error.value = 'Доступ запрещён';
    showError('У вас нет доступа к логам вебхуков');
  } else if (err.status === 404) {
    error.value = 'Логи не найдены';
    showError('Логи для указанных фильтров не найдены');
  } else if (err.status >= 500) {
    error.value = 'Ошибка сервера';
    showError('Произошла ошибка на сервере. Попробуйте позже.');
  } else {
    error.value = err.message || 'Неизвестная ошибка';
    showError(error.value);
  }
  
  // Очистка данных при критической ошибке
  if (err.status >= 500) {
    logs.value = [];
  }
};
```

**1.4. Обновить обработку фильтров:**

```javascript
// Обновить handleFiltersUpdate()

const handleFiltersUpdate = (newFilters) => {
  // Валидация новых фильтров
  if (!validateFilters(newFilters)) {
    showError('Некорректные параметры фильтрации');
    return;
  }
  
  // Обновление фильтров
  filters.value = { ...filters.value, ...newFilters };
  
  // Сброс пагинации на первую страницу
  pagination.value.page = 1;
  
  // Инвалидация кеша при изменении фильтров
  WebhookLogsApiService.invalidateCacheOnFilterChange(
    filters.value,
    newFilters
  );
  
  // Загрузка логов с новыми фильтрами
  loadLogs(true);
  
  // Обновление URL
  updateUrlFilters(filters.value);
};
```

**1.5. Обновить интеграцию с useRealtime:**

```javascript
// Обновить настройку useRealtime

const {
  connectionState,
  isConnected,
  newLogs,
  newLogsCount,
  hasNewLogs,
  error: realtimeError,
  connect,
  disconnect,
  clearNewLogs,
  applyNewLogs
} = useRealtime('/api/webhook-realtime.php', {
  autoConnect: autoUpdateEnabled.value,
  enableSound: true,
  validateLogs: true, // Включить валидацию новых логов
  onNewLogs: (newLogsData) => {
    console.log('[WebhookLogsPage] New logs received:', newLogsData.length);
    
    // Валидация новых логов уже выполнена в composable
    // Просто добавляем их в начало списка
    if (newLogsData.length > 0) {
      logs.value.unshift(...newLogsData);
      
      // Обновление пагинации
      pagination.value.total += newLogsData.length;
      
      // Уведомление
      showSuccess(`Получено ${newLogsData.length} новых событий`);
    }
  }
});
```

**Результат шага 1:**
- `WebhookLogsPage` обновлён для работы с новым API
- Типизированные интерфейсы интегрированы
- Валидация данных добавлена
- Обработка ошибок улучшена

---

### Шаг 2: Обновление WebhookLogList

**2.1. Импорт утилит:**

```javascript
// Добавить в начало <script> секции WebhookLogList.vue

import { 
  isValidWebhookLogEntry,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';

import { 
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';
```

**2.2. Добавить валидацию props:**

```javascript
// В setup() функции WebhookLogList.vue

// Валидация и нормализация логов при получении props
const validatedLogs = computed(() => {
  if (!props.logs || !Array.isArray(props.logs)) {
    console.warn('[WebhookLogList] Invalid logs prop:', props.logs);
    return [];
  }
  
  return props.logs
    .map(log => normalizeWebhookLogEntry(log))
    .filter(log => {
      if (!isValidWebhookLogEntry(log)) {
        console.warn('[WebhookLogList] Invalid log entry:', log);
        return false;
      }
      return true;
    });
});
```

**2.3. Обновить форматирование данных:**

```javascript
// Обновить методы форматирования

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  return formatTimestamp(timestamp, 'short');
};

const formatEvent = (event) => {
  if (!event) return '—';
  return formatEventType(event);
};

const formatCategoryLabel = (category) => {
  if (!category) return '—';
  return formatCategory(category);
};

const formatDetailsPreview = (details) => {
  if (!details || typeof details !== 'object') {
    return '—';
  }
  return formatEventDetails(details);
};
```

**2.4. Обновить сортировку для работы с типизированными данными:**

```javascript
// Обновить sortedLogs computed

const sortedLogs = computed(() => {
  if (!validatedLogs.value || validatedLogs.value.length === 0) {
    return [];
  }
  
  const logs = [...validatedLogs.value]; // Копия массива
  
  return logs.sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy.value) {
      case 'timestamp':
        // Используем ISO 8601 формат для сравнения
        aValue = new Date(a.timestamp || 0).getTime();
        bValue = new Date(b.timestamp || 0).getTime();
        break;
      case 'event':
        aValue = (a.event || '').toLowerCase();
        bValue = (b.event || '').toLowerCase();
        break;
      case 'category':
        aValue = (a.category || '').toLowerCase();
        bValue = (b.category || '').toLowerCase();
        break;
      case 'ip':
        aValue = (a.ip || '').toLowerCase();
        bValue = (b.ip || '').toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) {
      return sortOrder.value === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder.value === 'asc' ? 1 : -1;
    }
    return 0;
  });
});
```

**2.5. Обновить отображение деталей:**

```javascript
// Обновить шаблон для использования форматтеров

// В template секции, заменить:
<td>
  <div class="details-preview">
    <span v-if="log.details?.task_id">Задача #{{ log.details.task_id }}</span>
    <span v-else-if="log.details?.entity_id">Элемент #{{ log.details.entity_id }}</span>
    <span v-else>-</span>
  </div>
</td>

// На:
<td>
  <div class="details-preview">
    {{ formatDetailsPreview(log.details) }}
  </div>
</td>
```

**2.6. Добавить обработку ошибок валидации:**

```javascript
// Добавить в setup()

watch(() => props.logs, (newLogs) => {
  if (newLogs && Array.isArray(newLogs)) {
    const invalidCount = newLogs.filter(log => !isValidWebhookLogEntry(log)).length;
    if (invalidCount > 0) {
      console.warn(
        `[WebhookLogList] Received ${invalidCount} invalid log entries out of ${newLogs.length}`
      );
    }
  }
}, { immediate: true });
```

**Результат шага 2:**
- `WebhookLogList` обновлён для работы с новой структурой данных
- Форматтеры интегрированы
- Валидация данных добавлена
- Сортировка оптимизирована

---

### Шаг 3: Обновление WebhookLogDetails

**3.1. Импорт утилит:**

```javascript
// Добавить в начало <script> секции WebhookLogDetails.vue

import { 
  isValidWebhookLogEntry,
  isValidEventDetails,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';

import { 
  formatTimestamp,
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';
```

**3.2. Добавить валидацию props:**

```javascript
// В setup() функции WebhookLogDetails.vue

// Валидация и нормализация лога
const validatedLog = computed(() => {
  if (!props.log) {
    return null;
  }
  
  const normalized = normalizeWebhookLogEntry(props.log);
  
  if (!isValidWebhookLogEntry(normalized)) {
    console.error('[WebhookLogDetails] Invalid log entry:', props.log);
    return null;
  }
  
  return normalized;
});

// Проверка валидности деталей
const validatedDetails = computed(() => {
  if (!validatedLog.value || !validatedLog.value.details) {
    return null;
  }
  
  if (!isValidEventDetails(validatedLog.value.details)) {
    console.warn('[WebhookLogDetails] Invalid event details:', validatedLog.value.details);
    return null;
  }
  
  return validatedLog.value.details;
});
```

**3.3. Обновить computed свойства для основной информации:**

```javascript
// Обновить mainInfo computed

const mainInfo = computed(() => {
  if (!validatedLog.value) {
    return {};
  }
  
  const log = validatedLog.value;
  
  return {
    timestamp: log.timestamp,
    event: log.event,
    category: log.category,
    ip: log.ip || 'N/A'
  };
});
```

**3.4. Обновить форматирование значений:**

```javascript
// Обновить методы форматирования

const formatKey = (key) => {
  const keyMap = {
    'timestamp': 'Дата и время',
    'event': 'Тип события',
    'category': 'Категория',
    'ip': 'IP адрес',
    'task_id': 'ID задачи',
    'task_title': 'Название задачи',
    'entity_id': 'ID сущности',
    'title': 'Название',
    'comment_text': 'Текст комментария'
  };
  
  return keyMap[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
};

const formatValue = (value) => {
  if (value === null || value === undefined) {
    return 'N/A';
  }
  
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }
  
  if (typeof value === 'object') {
    // Для массивов
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return 'Пусто';
      }
      return value.join(', ');
    }
    
    // Для объектов - форматируем как JSON
    try {
      return JSON.stringify(value, null, 2);
    } catch (e) {
      return '[Не удалось сериализовать]';
    }
  }
  
  return String(value);
};
```

**3.5. Обновить отображение деталей события:**

```javascript
// Обновить шаблон для деталей события

// В template секции, заменить отображение деталей:
<div v-if="log.details && Object.keys(log.details).length > 0" class="details-section">
  <h4>Детали события</h4>
  <div class="info-grid">
    <div
      v-for="(value, key) in validatedDetails"
      :key="key"
      class="info-item"
    >
      <label>{{ formatKey(key) }}:</label>
      <span>{{ formatValue(value) }}</span>
    </div>
  </div>
</div>

// Добавить проверку на валидность:
<div v-if="validatedDetails && Object.keys(validatedDetails).length > 0" class="details-section">
  <h4>Детали события</h4>
  <div class="info-grid">
    <div
      v-for="(value, key) in validatedDetails"
      :key="key"
      class="info-item"
    >
      <label>{{ formatKey(key) }}:</label>
      <span>{{ formatValue(value) }}</span>
    </div>
  </div>
</div>
```

**3.6. Улучшить обработку больших payload:**

```javascript
// Обновить computed для payload

const payloadSize = computed(() => {
  if (!validatedLog.value || !validatedLog.value.payload) {
    return 0;
  }
  
  try {
    const jsonString = JSON.stringify(validatedLog.value.payload);
    return new Blob([jsonString]).size;
  } catch (e) {
    console.error('[WebhookLogDetails] Error calculating payload size:', e);
    return 0;
  }
});

const formattedPayload = computed(() => {
  if (!validatedLog.value || !validatedLog.value.payload) {
    return '{}';
  }
  
  try {
    return JSON.stringify(validatedLog.value.payload, null, 2);
  } catch (e) {
    console.error('[WebhookLogDetails] Error formatting payload:', e);
    return '[Ошибка форматирования]';
  }
});
```

**3.7. Добавить обработку ошибок валидации:**

```javascript
// Добавить watch для отслеживания изменений props

watch(() => props.log, (newLog) => {
  if (newLog) {
    const normalized = normalizeWebhookLogEntry(newLog);
    if (!isValidWebhookLogEntry(normalized)) {
      console.error('[WebhookLogDetails] Invalid log entry received:', newLog);
      // Можно показать сообщение об ошибке пользователю
    }
  }
}, { immediate: true });
```

**Результат шага 3:**
- `WebhookLogDetails` обновлён для работы с новой структурой данных
- Валидация данных добавлена
- Форматтеры интегрированы
- Обработка больших payload улучшена

---

### Шаг 4: Тестирование обновлённых компонентов

**4.1. Создать чек-лист для тестирования:**

```markdown
## Чек-лист тестирования

### WebhookLogsPage
- [ ] Загрузка логов работает корректно
- [ ] Фильтры применяются и валидируются
- [ ] Пагинация работает с новым API
- [ ] Обработка ошибок отображается корректно
- [ ] Интеграция с useRealtime работает
- [ ] Новые логи добавляются в список
- [ ] Кеширование работает корректно

### WebhookLogList
- [ ] Логи отображаются в таблице
- [ ] Сортировка работает по всем колонкам
- [ ] Форматирование данных корректное
- [ ] Валидация данных работает (невалидные логи фильтруются)
- [ ] Выбор логов работает
- [ ] Пагинация отображается корректно

### WebhookLogDetails
- [ ] Детали лога отображаются корректно
- [ ] Детали события форматируются правильно
- [ ] Большие payload обрабатываются корректно
- [ ] Копирование в буфер обмена работает
- [ ] Валидация данных работает
- [ ] Ошибки валидации обрабатываются
```

**4.2. Ручное тестирование:**

1. Открыть страницу `/admin/webhook-logs`
2. Проверить загрузку логов
3. Применить различные фильтры
4. Проверить сортировку в таблице
5. Открыть детали лога
6. Проверить отображение деталей события
7. Проверить работу реального времени
8. Проверить обработку ошибок

**Результат шага 4:**
- Компоненты протестированы
- Все функции работают корректно
- Ошибки исправлены

---

## 📊 Критерии приёмки

- [ ] `WebhookLogsPage.vue` обновлён для работы с новым API
- [ ] Типизированные интерфейсы интегрированы во все компоненты
- [ ] Валидаторы используются для проверки данных
- [ ] Форматтеры используются для отображения данных
- [ ] `WebhookLogList.vue` адаптирован для новой структуры данных
- [ ] `WebhookLogDetails.vue` обновлён для отображения улучшенных деталей
- [ ] Обработка ошибок улучшена во всех компонентах
- [ ] Валидация данных добавлена перед отображением
- [ ] Производительность компонентов оптимизирована
- [ ] Все компоненты протестированы и работают корректно
- [ ] Код соответствует стандартам ESLint
- [ ] JSDoc комментарии добавлены для всех методов
- [ ] **Совместимость с Vue.js интерфейсом сохранена**
- [ ] **Формат данных соответствует ожиданиям компонентов**
- [ ] **Нет ошибок в консоли браузера**
- [ ] **Все функции работают корректно с новым API**

---

## 🔍 Проверка выполнения

**Команды для проверки:**
```bash
# Проверить синтаксис Vue файлов
npm run lint vue-app/src/pages/WebhookLogsPage.vue
npm run lint vue-app/src/components/webhooks/WebhookLogList.vue
npm run lint vue-app/src/components/webhooks/WebhookLogDetails.vue

# Запустить тесты (если есть)
npm run test vue-app/src/pages/WebhookLogsPage.test.js
npm run test vue-app/src/components/webhooks/WebhookLogList.test.js
npm run test vue-app/src/components/webhooks/WebhookLogDetails.test.js

# Проверить работу в браузере
# Открыть /admin/webhook-logs и проверить все функции
```

**Ручное тестирование:**
1. Открыть страницу `/admin/webhook-logs`
2. Проверить загрузку логов через обновлённый API
3. Проверить работу фильтров
4. Проверить сортировку в таблице
5. Проверить пагинацию
6. Открыть детали лога и проверить отображение
7. Проверить работу реального времени
8. Проверить обработку ошибок
9. Проверить валидацию данных (попробовать передать невалидные данные)

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-05-01:** Использует обновлённые сервисы, composables, типы и утилиты

**Зависит от него:**
- **TASK-018-05-02-02:** Вспомогательные компоненты будут использовать обновлённые основные компоненты

---

## 📝 История правок

- **2025-12-07 17:00 (UTC+3, Брест):** Создана задача рефакторинга основных Vue.js компонентов для работы с новым API

---

## 💡 Дополнительные рекомендации

1. **Производительность:**
   - Использовать `v-memo` для оптимизации рендеринга больших списков
   - Ленивая загрузка деталей событий
   - Виртуализация списка для больших объёмов данных

2. **Безопасность:**
   - Санитизация всех данных перед отображением
   - Защита от XSS в форматтерах
   - Валидация всех входящих данных

3. **Доступность:**
   - ARIA-атрибуты для интерактивных элементов
   - Клавиатурная навигация
   - Поддержка скринридеров

4. **Документация:**
   - Примеры использования в JSDoc
   - Описание props и emits
   - Руководство по расширению компонентов

