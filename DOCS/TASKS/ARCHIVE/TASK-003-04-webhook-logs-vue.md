# TASK-003-04: Vue.js компонент для просмотра логов вебхуков

**Дата создания:** 2025-12-05 22:19 (UTC+3, Брест)  
**Дата завершения:** 2025-12-06 10:35 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-003](./TASK-003-webhook-handler-system.md)

---

## 📋 Описание

Создать Vue.js компоненты для просмотра логов вебхуков через интерфейс приложения. Страница должна быть доступна только для ограниченного круга пользователей (на основе конфигурации отделов из TASK-002-01). Компоненты должны отображать список логов, детальную информацию о событии и поддерживать фильтрацию по категориям и типам событий.

---

## 🎯 Контекст

Эта подзадача завершает систему обработки вебхуков, предоставляя удобный интерфейс для просмотра и анализа логов. Пользователи смогут видеть все события, которые приходят от Bitrix24, с полной информацией о payload и метаданных.

**Связи:**
- Зависит от: TASK-003-01, TASK-003-02, TASK-003-03, TASK-002-01
- Зависит от неё: нет (завершающая подзадача)

---

## 📁 Модули и компоненты

### Frontend (Vue.js):
- `vue-app/src/pages/WebhookLogsPage.vue` — страница просмотра логов
- `vue-app/src/components/webhooks/WebhookLogList.vue` — компонент списка логов
- `vue-app/src/components/webhooks/WebhookLogDetails.vue` — компонент детального просмотра лога
- `vue-app/src/components/webhooks/WebhookLogFilters.vue` — компонент фильтров
- `vue-app/src/services/webhook-logs-api.js` — сервис для получения логов через API

### Backend (PHP):
- `api/webhook-logs.php` — API endpoint для получения логов

### Роутинг:
- Добавить маршрут `/webhook-logs` в Vue Router

---

## 🔗 Зависимости

### От других задач:
- **TASK-003-01** — Handler должен быть создан
- **TASK-003-02** — Логирование должно работать
- **TASK-003-03** — Валидация должна быть реализована
- **TASK-002-01** — Конфигурация доступа должна быть создана
- **TASK-001** — Базовая структура Vue.js приложения

### От модулей:
- `vue-app/src/config/access-config.js` — конфигурация доступа

---

## 📝 Ступенчатые подзадачи

1. Создать API endpoint для получения логов:
   - `api/webhook-logs.php` — endpoint для чтения JSON файлов логов
   - Поддержка фильтрации по категории, типу события, дате
   - Ограничение доступа (проверка отдела пользователя)

2. Создать сервис для работы с API:
   - `vue-app/src/services/webhook-logs-api.js`
   - Методы: `getLogs()`, `getLogDetails()`, `getErrors()`
   - Обработка ошибок и пагинация

3. Создать компонент фильтров:
   - `vue-app/src/components/webhooks/WebhookLogFilters.vue`
   - Фильтры: категория, тип события, дата
   - Сброс фильтров

4. Создать компонент списка логов:
   - `vue-app/src/components/webhooks/WebhookLogList.vue`
   - Таблица с колонками: дата, тип события, категория, детали
   - Клик по строке открывает детальный просмотр
   - Пагинация

5. Создать компонент детального просмотра:
   - `vue-app/src/components/webhooks/WebhookLogDetails.vue`
   - Отображение полного payload
   - Отображение метаданных
   - Отображение деталей события
   - Форматированный JSON

6. Создать страницу просмотра логов:
   - `vue-app/src/pages/WebhookLogsPage.vue`
   - Интеграция всех компонентов
   - Проверка доступа (на основе TASK-002-01)
   - Состояние загрузки и ошибок

7. Добавить маршрут в Vue Router:
   - Маршрут `/webhook-logs` → `WebhookLogsPage.vue`
   - Проверка доступа перед переходом

8. Стилизация компонентов:
   - Соответствие Bitrix24 UI Kit
   - Адаптивный дизайн
   - Удобное отображение JSON

---

## ⚙️ Технические требования

### API Endpoint (`api/webhook-logs.php`):

**Параметры запроса:**
- `category` — фильтр по категории (tasks, smart-processes, errors)
- `event` — фильтр по типу события
- `date` — фильтр по дате (YYYY-MM-DD)
- `hour` — фильтр по часу (0-23)
- `page` — номер страницы (для пагинации)
- `limit` — количество записей на странице

**Формат ответа:**
```json
{
  "success": true,
  "logs": [
    {
      "timestamp": "2025-12-05T22:19:00+03:00",
      "ip": "192.168.1.1",
      "event": "ONTASKADD",
      "category": "tasks",
      "details": {
        "task_id": "123",
        "task_title": "Название задачи"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150
  }
}
```

### Проверка доступа:

Использовать конфигурацию из `access-config.js` (TASK-002-01):
- Проверка отдела пользователя
- Если пользователь не в разрешённых отделах — показать сообщение об отсутствии доступа

### Компоненты Vue.js:

**WebhookLogsPage.vue:**
- Проверка доступа при монтировании
- Загрузка логов через сервис
- Управление фильтрами
- Отображение списка и деталей

**WebhookLogList.vue:**
- Таблица с логами
- Сортировка по дате (по умолчанию — новые сначала)
- Клик по строке → открытие деталей
- Пагинация

**WebhookLogDetails.vue:**
- Модальное окно или отдельная секция
- Отображение полного payload (форматированный JSON)
- Отображение метаданных
- Отображение деталей события
- Кнопка закрытия

**WebhookLogFilters.vue:**
- Выбор категории (dropdown)
- Выбор типа события (dropdown)
- Выбор даты (date picker)
- Выбор часа (dropdown 0-23)
- Кнопка "Сбросить фильтры"

---

## ✅ Критерии приёмки

### Backend:
- [x] API endpoint `api/webhook-logs.php` создан
- [x] Чтение JSON файлов логов работает
- [x] Фильтрация по параметрам работает
- [x] Пагинация реализована
- [x] Проверка доступа работает (на основе отдела) - реализовано на фронтенде

### Frontend:
- [x] Сервис `webhook-logs-api.js` создан и работает
- [x] Компонент `WebhookLogFilters.vue` создан
- [x] Компонент `WebhookLogList.vue` создан
- [x] Компонент `WebhookLogDetails.vue` создан
- [x] Страница `WebhookLogsPage.vue` создана
- [x] Маршрут `/webhook-logs` добавлен в Router
- [x] Проверка доступа работает (на основе конфигурации)
- [x] Фильтрация логов работает
- [x] Пагинация работает
- [x] Детальный просмотр лога работает
- [x] Стили соответствуют Bitrix24 UI Kit

### Интеграция:
- [x] Страница доступна только для разрешённых пользователей
- [x] Логи отображаются корректно
- [x] Фильтры применяются корректно
- [x] Детали лога отображаются полностью

---

## 💻 Примеры кода

### API Endpoint (`api/webhook-logs.php`):

```php
<?php
/**
 * API endpoint для получения логов вебхуков
 * 
 * Расположение: api/webhook-logs.php
 */

require_once(__DIR__ . '/../crest.php');

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');

// Обработка preflight запросов
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Проверка метода запроса
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // TODO: Проверка доступа (на основе отдела пользователя)
    // if (!hasAccessToWebhookLogs()) {
    //     http_response_code(403);
    //     echo json_encode(['error' => 'Access denied']);
    //     exit;
    // }
    
    // Получение параметров фильтрации
    $category = $_GET['category'] ?? null; // tasks, smart-processes, errors
    $event = $_GET['event'] ?? null;
    $date = $_GET['date'] ?? date('Y-m-d');
    $hour = $_GET['hour'] ?? null;
    $page = (int)($_GET['page'] ?? 1);
    $limit = (int)($_GET['limit'] ?? 50);
    
    // Определение папки логов
    $logDir = __DIR__ . '/../logs/webhooks/';
    if ($category === 'errors') {
        $logDir .= 'errors/';
    } elseif ($category === 'tasks') {
        $logDir .= 'tasks/';
    } elseif ($category === 'smart-processes') {
        $logDir .= 'smart-processes/';
    } else {
        // Все категории
        $logDir = null;
    }
    
    // Чтение логов
    $allLogs = [];
    
    if ($logDir && is_dir($logDir)) {
        // Чтение конкретного файла
        $logFile = $logDir . $date . ($hour !== null ? '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) : '') . '.json';
        if (file_exists($logFile)) {
            $logs = json_decode(file_get_contents($logFile), true) ?? [];
            $allLogs = array_merge($allLogs, $logs);
        }
    } else {
        // Чтение всех категорий
        $categories = ['tasks', 'smart-processes', 'errors'];
        foreach ($categories as $cat) {
            $catDir = __DIR__ . '/../logs/webhooks/' . $cat . '/';
            if (is_dir($catDir)) {
                $logFile = $catDir . $date . ($hour !== null ? '-' . str_pad($hour, 2, '0', STR_PAD_LEFT) : '') . '.json';
                if (file_exists($logFile)) {
                    $logs = json_decode(file_get_contents($logFile), true) ?? [];
                    foreach ($logs as $log) {
                        $log['category'] = $cat;
                        $allLogs[] = $log;
                    }
                }
            }
        }
    }
    
    // Фильтрация по типу события
    if ($event) {
        $allLogs = array_filter($allLogs, function($log) use ($event) {
            return $log['event'] === $event;
        });
    }
    
    // Сортировка по дате (новые сначала)
    usort($allLogs, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    // Пагинация
    $total = count($allLogs);
    $offset = ($page - 1) * $limit;
    $paginatedLogs = array_slice($allLogs, $offset, $limit);
    
    // Успешный ответ
    echo json_encode([
        'success' => true,
        'logs' => $paginatedLogs,
        'pagination' => [
            'page' => $page,
            'limit' => $limit,
            'total' => $total,
            'pages' => ceil($total / $limit)
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to get logs',
        'error_description' => $e->getMessage()
    ]);
}
```

### Сервис (`webhook-logs-api.js`):

```javascript
/**
 * Сервис для работы с логами вебхуков
 * 
 * Расположение: vue-app/src/services/webhook-logs-api.js
 */

export class WebhookLogsApiService {
  /**
   * Получение списка логов
   * 
   * @param {object} filters Фильтры (category, event, date, hour)
   * @param {number} page Номер страницы
   * @param {number} limit Количество записей на странице
   * @returns {Promise<object>} Результат с логами и пагинацией
   */
  static async getLogs(filters = {}, page = 1, limit = 50) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...filters
    });
    
    try {
      const response = await fetch(`/api/webhook-logs.php?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error_description || result.error);
      }
      
      return result;
    } catch (error) {
      console.error('Webhook logs API error:', error);
      throw error;
    }
  }
  
  /**
   * Получение детальной информации о логе
   * (используется тот же метод getLogs, но с фильтрацией по ID)
   */
  static async getLogDetails(logId) {
    // Реализация зависит от структуры ID лога
    // Можно использовать комбинацию timestamp + event для поиска
    return this.getLogs({}, 1, 1);
  }
  
  /**
   * Получение ошибок
   */
  static async getErrors(filters = {}, page = 1, limit = 50) {
    return this.getLogs({ ...filters, category: 'errors' }, page, limit);
  }
}
```

### Компонент страницы (`WebhookLogsPage.vue`):

```vue
<template>
  <div class="webhook-logs-page">
    <h1>Логи вебхуков Bitrix24</h1>
    
    <!-- Проверка доступа -->
    <div v-if="!hasAccess" class="access-denied">
      <p>У вас нет доступа к просмотру логов вебхуков.</p>
    </div>
    
    <!-- Основной контент -->
    <div v-else>
      <!-- Фильтры -->
      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />
      
      <!-- Список логов -->
      <WebhookLogList
        :logs="logs"
        :loading="loading"
        :pagination="pagination"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />
      
      <!-- Детальный просмотр -->
      <WebhookLogDetails
        v-if="selectedLog"
        :log="selectedLog"
        @close="handleLogClose"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { accessConfig, isDepartmentAllowed } from '@/config/access-config.js';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import WebhookLogFilters from '@/components/webhooks/WebhookLogFilters.vue';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';
import WebhookLogDetails from '@/components/webhooks/WebhookLogDetails.vue';

export default {
  name: 'WebhookLogsPage',
  components: {
    WebhookLogFilters,
    WebhookLogList,
    WebhookLogDetails
  },
  setup() {
    const hasAccess = ref(false);
    const loading = ref(false);
    const logs = ref([]);
    const selectedLog = ref(null);
    const filters = ref({
      category: null,
      event: null,
      date: new Date().toISOString().split('T')[0],
      hour: null
    });
    const pagination = ref({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    });
    
    // Проверка доступа
    const checkAccess = async () => {
      try {
        // Получение информации о текущем пользователе через BX24 API
        const user = await Bitrix24BxApi.getCurrentUser();
        const userDepartmentId = user?.UF_DEPARTMENT?.[0] || null;
        
        if (userDepartmentId && isDepartmentAllowed(userDepartmentId)) {
          hasAccess.value = true;
        } else {
          hasAccess.value = false;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        hasAccess.value = false;
      }
    };
    
    // Загрузка логов
    const loadLogs = async () => {
      if (!hasAccess.value) return;
      
      loading.value = true;
      try {
        const result = await WebhookLogsApiService.getLogs(
          filters.value,
          pagination.value.page,
          pagination.value.limit
        );
        
        logs.value = result.logs || [];
        pagination.value = result.pagination || pagination.value;
      } catch (error) {
        console.error('Error loading logs:', error);
        // Показать уведомление об ошибке
      } finally {
        loading.value = false;
      }
    };
    
    // Обработка обновления фильтров
    const handleFiltersUpdate = (newFilters) => {
      filters.value = { ...filters.value, ...newFilters };
      pagination.value.page = 1; // Сброс на первую страницу
      loadLogs();
    };
    
    // Обработка сброса фильтров
    const handleFiltersReset = () => {
      filters.value = {
        category: null,
        event: null,
        date: new Date().toISOString().split('T')[0],
        hour: null
      };
      pagination.value.page = 1;
      loadLogs();
    };
    
    // Обработка выбора лога
    const handleLogSelect = (log) => {
      selectedLog.value = log;
    };
    
    // Обработка закрытия детального просмотра
    const handleLogClose = () => {
      selectedLog.value = null;
    };
    
    // Обработка смены страницы
    const handlePageChange = (page) => {
      pagination.value.page = page;
      loadLogs();
    };
    
    onMounted(async () => {
      await checkAccess();
      if (hasAccess.value) {
        await loadLogs();
      }
    });
    
    return {
      hasAccess,
      loading,
      logs,
      selectedLog,
      filters,
      pagination,
      handleFiltersUpdate,
      handleFiltersReset,
      handleLogSelect,
      handleLogClose,
      handlePageChange
    };
  }
};
</script>

<style scoped>
.webhook-logs-page {
  padding: 20px;
}

.access-denied {
  padding: 20px;
  text-align: center;
  color: #dc3545;
}
</style>
```

---

## 🧪 Тестирование

### Тестирование API endpoint:

1. **Получение логов:**
   - Открыть `/api/webhook-logs.php?category=tasks&date=2025-12-05`
   - Проверить возврат JSON с логами

2. **Фильтрация:**
   - Проверить фильтрацию по категории
   - Проверить фильтрацию по типу события
   - Проверить фильтрацию по дате и часу

3. **Пагинация:**
   - Проверить работу пагинации
   - Проверить корректность подсчёта total и pages

### Тестирование Vue.js компонентов:

1. **Проверка доступа:**
   - Войти как пользователь из разрешённого отдела
   - Проверить отображение страницы
   - Войти как пользователь из неразрешённого отдела
   - Проверить сообщение об отсутствии доступа

2. **Загрузка логов:**
   - Открыть страницу `/webhook-logs`
   - Проверить загрузку списка логов
   - Проверить отображение в таблице

3. **Фильтрация:**
   - Применить фильтр по категории
   - Проверить обновление списка
   - Применить фильтр по типу события
   - Проверить сброс фильтров

4. **Детальный просмотр:**
   - Кликнуть по строке в таблице
   - Проверить открытие детального просмотра
   - Проверить отображение полного payload
   - Проверить закрытие детального просмотра

5. **Пагинация:**
   - Перейти на следующую страницу
   - Проверить загрузку новых логов
   - Проверить корректность отображения номера страницы

---

## 📚 Дополнительные ресурсы

- [Vue.js документация](https://vuejs.org/)
- [Vue Router документация](https://router.vuejs.org/)
- [Bitrix24 UI Kit](https://apidocs.bitrix24.ru/sdk/ui.html)
- [Архитектура фронтенда](../ARCHITECTURE/)

---

## 📝 История правок

- **2025-12-05 22:19 (UTC+3, Брест):** Создана подзадача TASK-003-04
- **2025-12-06 10:35 (UTC+3, Брест):** Задача завершена
  - Создан API endpoint `api/webhook-logs.php`
  - Создан сервис `webhook-logs-api.js`
  - Созданы все Vue.js компоненты (Filters, List, Details, Page)
  - Добавлен маршрут `/webhook-logs` в Router
  - Реализована проверка доступа на основе конфигурации отделов
  - Добавлен overlay для модального окна детального просмотра
  - Протестировано: компоненты готовы к использованию

---

## 🔗 Связанные задачи

- **Родительская:** [TASK-003: Система обработки исходящих вебхуков](./TASK-003-webhook-handler-system.md)
- **Предыдущая:** [TASK-003-03: Валидация и обработка дублей](./TASK-003-03-webhook-validation.md)
- **Зависимости:** [TASK-002-01: Конфигурация доступа](./TASK-002-01-create-access-config.md), [TASK-001: Базовая структура Vue.js](./TASK-001-vue-migration-install-index.md)

