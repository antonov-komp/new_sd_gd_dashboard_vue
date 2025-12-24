# TASK-074: Реализация модуля "Ручное управление кешем" в разделе Администрирования

**Дата создания:** 2025-12-24 10:08 (UTC+3, Брест)  
**Статус:** Черновик (Draft)  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** Модуль "Администрирование" (TASK-004-02)

---

## 📌 Краткое резюме

**Что реализуется:**
- Модуль для ручного управления кешем в административном разделе
- Просмотр статуса кеша для каждого модуля
- Очистка кеша для конкретного модуля или всех модулей
- Статистика кеша (размер, количество записей, TTL)
- Информация о кешированных модулях

**Структура реализации:**
- **5 основных этапов** с детальными подэтапами
- **Backend:** API endpoints для управления кешем
- **Frontend:** Vue.js компоненты для интерфейса управления
- **Интеграция:** Добавление в административный раздел

**Время выполнения:** ~12-18 часов  
**Сложность:** Средняя

---

## 📋 Описание

Реализовать модуль **"Ручное управление кешем"** в разделе Администрирования приложения. Модуль должен предоставлять администраторам возможность:

1. **Просмотр статуса кеша** — информация о кеше для каждого модуля
2. **Очистка кеша** — возможность очистить кеш для конкретного модуля или всех модулей
3. **Статистика кеша** — информация о размере, количестве записей, TTL
4. **Информация о модулях** — список модулей с кешированием и их параметры

**Цель:** Предоставить администраторам удобный интерфейс для управления кешем всех модулей приложения, что позволит быстро обновлять данные при необходимости.

---

## 🎯 Контекст

### Текущая ситуация:

- ✅ Кеширование реализовано для модулей:
  - График приёма/закрытий 1С (`GraphAdmissionClosureCache`)
  - Недельные новые и закрытые тикеты сектора 1С
  - Трудозатраты на Тикеты сектора 1С (`TimeTrackingCache`)
  - Трудозатраты сотрудников сектора 1С по неделям
- ✅ Кеш работает автоматически с TTL 5 минут
- ✅ Есть методы для очистки кеша в PHP-классах
- ❌ Нет интерфейса для ручного управления кешем
- ❌ Нет возможности просмотра статуса кеша
- ❌ Нет статистики по кешу

### Требования:

- Просмотр статуса кеша для каждого модуля
- Очистка кеша для конкретного модуля
- Очистка всего кеша
- Статистика кеша (размер, количество записей)
- Информация о TTL для каждого модуля
- Подтверждение перед очисткой кеша

### Референсная реализация:

- **Модуль:** "Логи вебхуков" (`WebhookLogsPage.vue`) — структура администраторской страницы
- **Модуль:** "Управление пользователями" (`UsersManagementPage.vue`) — структура администраторского модуля
- **Кеш-классы:** `GraphAdmissionClosureCache`, `TimeTrackingCache` — методы управления кешем

---

## 🏗️ Модули и компоненты

### Новые файлы (Vue.js):

#### Frontend (Vue.js):
- `vue-app/src/pages/CacheManagementPage.vue` — основная страница управления кешем
- `vue-app/src/components/cache/CacheModuleCard.vue` — карточка модуля с кешем
- `vue-app/src/components/cache/CacheStats.vue` — статистика кеша
- `vue-app/src/components/cache/CacheActions.vue` — действия с кешем (очистка)
- `vue-app/src/services/cache-management-service.js` — сервис для работы с кешем

#### Backend (PHP):
- `api/admin/cache-status.php` — API endpoint для получения статуса кеша
- `api/admin/cache-clear.php` — API endpoint для очистки кеша
- `api/admin/cache-stats.php` — API endpoint для получения статистики кеша

### Изменяемые файлы:

- `vue-app/src/config/admin-config.js` — добавление нового раздела в администраторские интерфейсы
- `vue-app/src/router/index.js` — добавление маршрута `/admin/cache` с проверкой прав администратора

### Структура директорий:

```
vue-app/src/
├── pages/
│   └── CacheManagementPage.vue          # Основная страница
├── components/
│   └── cache/
│       ├── CacheModuleCard.vue          # Карточка модуля
│       ├── CacheStats.vue               # Статистика
│       └── CacheActions.vue             # Действия
└── services/
    └── cache-management-service.js      # Сервис работы с кешем

api/admin/
├── cache-status.php                     # Статус кеша
├── cache-clear.php                      # Очистка кеша
└── cache-stats.php                      # Статистика
```

---

## 📦 Зависимости

### От задач:

- TASK-004-02: Конфигурация администраторских интерфейсов
- TASK-003: Реализация модуля "Логи вебхуков" (референс структуры)
- TASK-072: Реализация модуля "Управление пользователями" (референс структуры)

### От модулей:

- Модуль "Администрирование" (конфигурация и маршрутизация)
- AccessControlService (проверка прав администратора)
- Кеш-классы:
  - `GraphAdmissionClosureCache` (api/cache/GraphAdmissionClosureCache.php)
  - `TimeTrackingCache` (api/cache/TimeTrackingCache.php)
  - Другие классы кеша для модулей

### От библиотек:

- Vue.js 3.x (Composition API)
- Bitrix24 REST API (опционально, для получения дополнительной информации)

---

## 🎯 Детальный план реализации

### Обзор этапов

Реализация разделена на **5 основных этапов**, каждый из которых содержит детальные подэтапы:

1. **Этап 1:** Настройка конфигурации и маршрутизации
2. **Этап 2:** Создание backend API endpoints
3. **Этап 3:** Создание сервисов для работы с кешем (Frontend)
4. **Этап 4:** Создание компонентов интерфейса (Frontend)
5. **Этап 5:** Интеграция и финализация

---

## 📝 Этап 1: Настройка конфигурации и маршрутизации

**Цель:** Добавить новый раздел в администраторские интерфейсы и настроить маршрутизацию.

**Время выполнения:** ~1-2 часа  
**Приоритет:** Критический (блокирует все остальные этапы)

### Подэтап 1.1: Добавление раздела в admin-config.js

**Файл:** `vue-app/src/config/admin-config.js`

**Задача:** Добавить новый раздел "Ручное управление кешем" в список администраторских интерфейсов.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/config/admin-config.js`**

2. **Найти массив `adminInterfaces` (строка ~17)**

3. **Добавить новый элемент после существующих интерфейсов (после id: 4):**
   ```javascript
   {
     id: 5,
     title: 'Ручное управление кешем',
     icon: '🗑️',
     route: '/admin/cache',
     description: 'Управление кешем модулей приложения'
   }
   ```

4. **Проверить, что ID уникален:**
   - Текущие ID: 1, 2, 3, 4
   - Новый ID: 5 (уникален)

5. **Проверить синтаксис:**
   - Запятая после предыдущего элемента
   - Правильные кавычки
   - Закрывающая скобка

**Полный фрагмент кода после изменений:**
```javascript
adminInterfaces: [
  {
    id: 1,
    title: 'Управление пользователями',
    icon: '👥',
    route: '/admin/users',
    description: 'Управление доступом пользователей к приложению'
  },
  {
    id: 2,
    title: 'Настройки системы',
    icon: '⚙️',
    route: '/admin/settings',
    description: 'Конфигурация системы и параметров приложения'
  },
  {
    id: 3,
    title: 'Логи вебхуков',
    icon: '📋',
    route: '/admin/webhook-logs',
    description: 'Просмотр и анализ логов вебхуков'
  },
  {
    id: 4,
    title: 'Статистика использования',
    icon: '📊',
    route: '/admin/usage-stats',
    description: 'Аналитика использования приложения'
  },
  {
    id: 5,
    title: 'Ручное управление кешем',
    icon: '🗑️',
    route: '/admin/cache',
    description: 'Управление кешем модулей приложения'
  }
]
```

**Критерии приёмки:**
- [ ] Раздел добавлен в `adminInterfaces`
- [ ] ID уникален (5)
- [ ] Маршрут указан корректно (`/admin/cache`)
- [ ] Иконка и описание указаны
- [ ] Синтаксис JavaScript корректен
- [ ] Файл сохраняется без ошибок

**Тестирование:**
```javascript
// В консоли браузера после загрузки страницы
import { getAdminInterfaces } from '@/config/admin-config.js';
const interfaces = getAdminInterfaces();
console.log(interfaces.find(i => i.id === 5)); // Должен вернуть новый интерфейс
```

---

### Подэтап 1.2: Добавление маршрута в router/index.js

**Файл:** `vue-app/src/router/index.js`

**Задача:** Добавить маршрут для страницы управления кешем с проверкой прав администратора.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/router/index.js`**

2. **Добавить импорт страницы:**
   ```javascript
   import CacheManagementPage from '@/pages/CacheManagementPage.vue';
   ```

3. **Добавить маршрут в массив `routes`:**
   ```javascript
   {
     path: '/admin/cache',
     name: 'admin-cache',
     component: CacheManagementPage,
     meta: {
       requiresAuth: true,
       title: 'Ручное управление кешем',
       adminOnly: true  // Требует прав администратора
     }
   }
   ```

4. **Проверить, что Navigation Guard обрабатывает `adminOnly: true`**

**Критерии приёмки:**
- [ ] Импорт страницы добавлен
- [ ] Маршрут добавлен в массив `routes`
- [ ] Мета-данные настроены корректно (`adminOnly: true`)
- [ ] Navigation Guard проверяет права администратора

---

## 📝 Этап 2: Создание backend API endpoints

**Цель:** Создать backend API endpoints для получения статуса кеша, статистики и очистки кеша.

**Время выполнения:** ~4-5 часов  
**Приоритет:** Критический

### Подэтап 2.1: Создание API endpoint для получения статуса кеша

**Файл:** `api/admin/cache-status.php` (новый файл)

**Задача:** Создать API endpoint для получения статуса кеша всех модулей.

**Детальные шаги:**

1. **Создать файл `api/admin/cache-status.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для получения статуса кеша всех модулей
    * 
    * Метод: GET
    * Путь: /api/admin/cache-status.php
    * 
    * Требует прав администратора
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "modules": [
    *     {
    *       "id": "graph-admission-closure",
    *       "name": "График приёма/закрытий 1С",
    *       "cache_dir": "api/cache/graph-admission-closure",
    *       "status": "active",
    *       "file_count": 15,
    *       "total_size": 1024000,
    *       "ttl": 300
    *     },
    *     ...
    *   ]
    * }
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';
   
   header('Content-Type: application/json; charset=utf-8');
   header('Access-Control-Allow-Origin: *');
   
   // Проверка прав администратора
   // Примечание: В реальной реализации нужно использовать Bitrix24 API для проверки прав
   // Для тестирования можно временно установить $isAdmin = true
   // TODO: Реализовать проверку через Bitrix24 API (user.current + проверка отдела)
   $isAdmin = true; // Временная заглушка для тестирования
   
   if (!$isAdmin) {
       http_response_code(403);
       echo json_encode(['error' => 'Access denied. Admin rights required.']);
       exit;
   }
   
   try {
       $modules = [];
       
       // Модуль 1: График приёма/закрытий 1С
       $graphCacheDir = __DIR__ . '/../cache/graph-admission-closure';
       $graphModules = [
           [
               'id' => 'graph-admission-closure-months',
               'name' => 'График приёма/закрытий 1С (3 месяца)',
               'cache_dir' => $graphCacheDir . '/months',
               'status' => 'active',
               'ttl' => 300
           ],
           [
               'id' => 'graph-admission-closure-weeks',
               'name' => 'График приёма/закрытий 1С (4 недели)',
               'cache_dir' => $graphCacheDir . '/weeks',
               'status' => 'active',
               'ttl' => 120
           ]
       ];
       
       foreach ($graphModules as $module) {
           $module['file_count'] = getCacheFileCount($module['cache_dir']);
           $module['total_size'] = getCacheTotalSize($module['cache_dir']);
           $modules[] = $module;
       }
       
       // Модуль 2: Трудозатраты на Тикеты сектора 1С
       $timeTrackingCacheDir = __DIR__ . '/../cache/time-tracking-sector-1c';
       $timeTrackingModule = [
           'id' => 'time-tracking-sector-1c',
           'name' => 'Трудозатраты на Тикеты сектора 1С',
           'cache_dir' => $timeTrackingCacheDir,
           'status' => 'active',
           'file_count' => getCacheFileCount($timeTrackingCacheDir),
           'total_size' => getCacheTotalSize($timeTrackingCacheDir),
           'ttl' => 300
       ];
       $modules[] = $timeTrackingModule;
       
       // Модуль 3: Недельные новые и закрытые тикеты сектора 1С
       // TODO: Добавить информацию о кеше этого модуля
       
       // Модуль 4: Трудозатраты сотрудников сектора 1С по неделям
       // TODO: Добавить информацию о кеше этого модуля
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'modules' => $modules
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   
   /**
    * Получение количества файлов в директории кеша
    * 
    * @param string $cacheDir Путь к директории кеша
    * @return int Количество файлов
    */
   function getCacheFileCount(string $cacheDir): int
   {
       if (!is_dir($cacheDir)) {
           return 0;
       }
       
       $files = glob($cacheDir . '/*.json');
       return $files ? count($files) : 0;
   }
   
   /**
    * Получение общего размера файлов в директории кеша
    * 
    * @param string $cacheDir Путь к директории кеша
    * @return int Размер в байтах
    */
   function getCacheTotalSize(string $cacheDir): int
   {
       if (!is_dir($cacheDir)) {
           return 0;
       }
       
       $files = glob($cacheDir . '/*.json');
       $totalSize = 0;
       
       foreach ($files as $file) {
           if (is_file($file)) {
               $totalSize += filesize($file);
           }
       }
       
       return $totalSize;
   }
   ```

**Критерии приёмки:**
- [ ] Файл `cache-status.php` создан
- [ ] Endpoint возвращает статус всех модулей
- [ ] Информация о количестве файлов корректна
- [ ] Информация о размере кеша корректна
- [ ] Обработка ошибок реализована

---

### Подэтап 2.2: Создание API endpoint для очистки кеша

**Файл:** `api/admin/cache-clear.php` (новый файл)

**Задача:** Создать API endpoint для очистки кеша конкретного модуля или всех модулей.

**Детальные шаги:**

1. **Создать файл `api/admin/cache-clear.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для очистки кеша модулей
    * 
    * Метод: POST
    * Путь: /api/admin/cache-clear.php
    * 
    * Параметры запроса:
    * {
    *   "module_id": "graph-admission-closure-months" | "all",
    *   "confirm": true
    * }
    * 
    * Требует прав администратора
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "message": "Cache cleared successfully",
    *   "cleared_modules": ["graph-admission-closure-months"]
    * }
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';
   
   header('Content-Type: application/json; charset=utf-8');
   header('Access-Control-Allow-Origin: *');
   header('Access-Control-Allow-Methods: POST, OPTIONS');
   header('Access-Control-Allow-Headers: Content-Type');
   
   // Обработка OPTIONS запроса (CORS preflight)
   if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
       http_response_code(200);
       exit;
   }
   
   // Проверка метода запроса
   if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
       http_response_code(405);
       echo json_encode(['error' => 'Method not allowed. Use POST.']);
       exit;
   }
   
   // TODO: Проверка прав администратора
   // if (!isAdmin()) {
   //     http_response_code(403);
   //     echo json_encode(['error' => 'Access denied']);
   //     exit;
   // }
   
   // Получение данных из запроса
   $rawInput = file_get_contents('php://input');
   $input = json_decode($rawInput, true);
   
   // Валидация JSON
   if (json_last_error() !== JSON_ERROR_NONE) {
       http_response_code(400);
       echo json_encode([
           'error' => 'Invalid JSON',
           'json_error' => json_last_error_msg()
       ]);
       exit;
   }
   
   // Проверка наличия данных
   if (!$input || !is_array($input)) {
       http_response_code(400);
       echo json_encode(['error' => 'Invalid request body. Expected JSON object.']);
       exit;
   }
   
   // Валидация обязательных полей
   if (!isset($input['module_id'])) {
       http_response_code(400);
       echo json_encode(['error' => 'Missing required field: module_id']);
       exit;
   }
   
   // Проверка подтверждения
   if (!isset($input['confirm']) || $input['confirm'] !== true) {
       http_response_code(400);
       echo json_encode(['error' => 'Confirmation required. Set confirm: true']);
       exit;
   }
   
   try {
       $moduleId = $input['module_id'];
       $clearedModules = [];
       
       if ($moduleId === 'all') {
           // Очистка всего кеша
           
           // График приёма/закрытий 1С (months)
           GraphAdmissionClosureCache::clear();
           $clearedModules[] = 'graph-admission-closure-months';
           $clearedModules[] = 'graph-admission-closure-weeks';
           
           // Трудозатраты на Тикеты сектора 1С
           TimeTrackingCache::clear();
           $clearedModules[] = 'time-tracking-sector-1c';
           
           // TODO: Очистка других модулей
           
       } else {
           // Очистка конкретного модуля
           switch ($moduleId) {
               case 'graph-admission-closure-months':
                   // Очистка только months
                   $cacheDir = __DIR__ . '/../cache/graph-admission-closure/months';
                   clearCacheDirectory($cacheDir);
                   $clearedModules[] = $moduleId;
                   break;
                   
               case 'graph-admission-closure-weeks':
                   // Очистка только weeks
                   $cacheDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
                   clearCacheDirectory($cacheDir);
                   $clearedModules[] = $moduleId;
                   break;
                   
               case 'time-tracking-sector-1c':
                   TimeTrackingCache::clear();
                   $clearedModules[] = $moduleId;
                   break;
                   
               default:
                   http_response_code(400);
                   echo json_encode([
                       'error' => 'Unknown module_id',
                       'module_id' => $moduleId
                   ]);
                   exit;
           }
       }
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'message' => 'Cache cleared successfully',
           'cleared_modules' => $clearedModules
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   
   /**
    * Очистка директории кеша
    * 
    * @param string $cacheDir Путь к директории кеша
    * @return bool true если успешно
    */
   function clearCacheDirectory(string $cacheDir): bool
   {
       if (!is_dir($cacheDir)) {
           return true; // Директория не существует
       }
       
       $files = glob($cacheDir . '/*.json');
       $success = true;
       
       foreach ($files as $file) {
           if (!@unlink($file)) {
               error_log("[Cache] Failed to delete cache file: {$file}");
               $success = false;
           }
       }
       
       return $success;
   }
   ```

**Критерии приёмки:**
- [ ] Файл `cache-clear.php` создан
- [ ] Endpoint принимает POST запросы
- [ ] Очистка конкретного модуля работает
- [ ] Очистка всех модулей работает
- [ ] Требуется подтверждение (`confirm: true`)
- [ ] Обработка ошибок реализована

---

### Подэтап 2.3: Создание API endpoint для получения статистики кеша

**Файл:** `api/admin/cache-stats.php` (новый файл)

**Задача:** Создать API endpoint для получения детальной статистики кеша.

**Детальные шаги:**

1. **Создать файл `api/admin/cache-stats.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для получения детальной статистики кеша
    * 
    * Метод: GET
    * Путь: /api/admin/cache-stats.php
    * 
    * Требует прав администратора
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "stats": {
    *     "total_modules": 4,
    *     "total_files": 25,
    *     "total_size": 2048000,
    *     "total_size_formatted": "2.00 MB",
    *     "oldest_cache": "2025-12-24T08:00:00+03:00",
    *     "newest_cache": "2025-12-24T10:05:00+03:00",
    *     "modules": [
    *       {
    *         "id": "graph-admission-closure-months",
    *         "file_count": 10,
    *         "size": 1024000,
    *         "size_formatted": "1.00 MB",
    *         "avg_file_size": 102400
    *       },
    *       ...
    *     ]
    *   }
    * }
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';
   
   header('Content-Type: application/json; charset=utf-8');
   header('Access-Control-Allow-Origin: *');
   
   // TODO: Проверка прав администратора
   // if (!isAdmin()) {
   //     http_response_code(403);
   //     echo json_encode(['error' => 'Access denied']);
   //     exit;
   // }
   
   try {
       $modules = [];
       $totalFiles = 0;
       $totalSize = 0;
       $oldestCache = null;
       $newestCache = null;
       
       // Модуль 1: График приёма/закрытий 1С (months)
       $graphMonthsDir = __DIR__ . '/../cache/graph-admission-closure/months';
       $graphMonthsStats = getCacheDirectoryStats($graphMonthsDir);
       if ($graphMonthsStats['file_count'] > 0) {
           $modules[] = [
               'id' => 'graph-admission-closure-months',
               'name' => 'График приёма/закрытий 1С (3 месяца)',
               'file_count' => $graphMonthsStats['file_count'],
               'size' => $graphMonthsStats['total_size'],
               'size_formatted' => formatBytes($graphMonthsStats['total_size']),
               'avg_file_size' => $graphMonthsStats['file_count'] > 0 
                   ? round($graphMonthsStats['total_size'] / $graphMonthsStats['file_count']) 
                   : 0
           ];
           $totalFiles += $graphMonthsStats['file_count'];
           $totalSize += $graphMonthsStats['total_size'];
           updateOldestNewest($graphMonthsStats, $oldestCache, $newestCache);
       }
       
       // Модуль 2: График приёма/закрытий 1С (weeks)
       $graphWeeksDir = __DIR__ . '/../cache/graph-admission-closure/weeks';
       $graphWeeksStats = getCacheDirectoryStats($graphWeeksDir);
       if ($graphWeeksStats['file_count'] > 0) {
           $modules[] = [
               'id' => 'graph-admission-closure-weeks',
               'name' => 'График приёма/закрытий 1С (4 недели)',
               'file_count' => $graphWeeksStats['file_count'],
               'size' => $graphWeeksStats['total_size'],
               'size_formatted' => formatBytes($graphWeeksStats['total_size']),
               'avg_file_size' => $graphWeeksStats['file_count'] > 0 
                   ? round($graphWeeksStats['total_size'] / $graphWeeksStats['file_count']) 
                   : 0
           ];
           $totalFiles += $graphWeeksStats['file_count'];
           $totalSize += $graphWeeksStats['total_size'];
           updateOldestNewest($graphWeeksStats, $oldestCache, $newestCache);
       }
       
       // Модуль 3: Трудозатраты на Тикеты сектора 1С
       $timeTrackingDir = __DIR__ . '/../cache/time-tracking-sector-1c';
       $timeTrackingStats = getCacheDirectoryStats($timeTrackingDir);
       if ($timeTrackingStats['file_count'] > 0) {
           $modules[] = [
               'id' => 'time-tracking-sector-1c',
               'name' => 'Трудозатраты на Тикеты сектора 1С',
               'file_count' => $timeTrackingStats['file_count'],
               'size' => $timeTrackingStats['total_size'],
               'size_formatted' => formatBytes($timeTrackingStats['total_size']),
               'avg_file_size' => $timeTrackingStats['file_count'] > 0 
                   ? round($timeTrackingStats['total_size'] / $timeTrackingStats['file_count']) 
                   : 0
           ];
           $totalFiles += $timeTrackingStats['file_count'];
           $totalSize += $timeTrackingStats['total_size'];
           updateOldestNewest($timeTrackingStats, $oldestCache, $newestCache);
       }
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'stats' => [
               'total_modules' => count($modules),
               'total_files' => $totalFiles,
               'total_size' => $totalSize,
               'total_size_formatted' => formatBytes($totalSize),
               'oldest_cache' => $oldestCache ? date('c', $oldestCache) : null,
               'newest_cache' => $newestCache ? date('c', $newestCache) : null,
               'modules' => $modules
           ]
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   
   /**
    * Получение статистики директории кеша
    * 
    * @param string $cacheDir Путь к директории кеша
    * @return array Статистика директории
    */
   function getCacheDirectoryStats(string $cacheDir): array
   {
       $stats = [
           'file_count' => 0,
           'total_size' => 0,
           'oldest_timestamp' => null,
           'newest_timestamp' => null
       ];
       
       if (!is_dir($cacheDir)) {
           return $stats;
       }
       
       $files = glob($cacheDir . '/*.json');
       if (!$files) {
           return $stats;
       }
       
       $stats['file_count'] = count($files);
       
       foreach ($files as $file) {
           if (!is_file($file)) {
               continue;
           }
           
           $size = filesize($file);
           $stats['total_size'] += $size;
           
           // Чтение метаданных для определения времени создания
           $content = @file_get_contents($file);
           if ($content !== false) {
               $data = @json_decode($content, true);
               if ($data && isset($data['metadata']['created_at'])) {
                   $createdAt = $data['metadata']['created_at'];
                   
                   if ($stats['oldest_timestamp'] === null || $createdAt < $stats['oldest_timestamp']) {
                       $stats['oldest_timestamp'] = $createdAt;
                   }
                   
                   if ($stats['newest_timestamp'] === null || $createdAt > $stats['newest_timestamp']) {
                       $stats['newest_timestamp'] = $createdAt;
                   }
               }
           }
       }
       
       return $stats;
   }
   
   /**
    * Обновление oldest/newest кеша
    * 
    * @param array $stats Статистика директории
    * @param int|null $oldestCache Ссылка на oldest timestamp
    * @param int|null $newestCache Ссылка на newest timestamp
    */
   function updateOldestNewest(array $stats, ?int &$oldestCache, ?int &$newestCache): void
   {
       if ($stats['oldest_timestamp'] !== null) {
           if ($oldestCache === null || $stats['oldest_timestamp'] < $oldestCache) {
               $oldestCache = $stats['oldest_timestamp'];
           }
       }
       
       if ($stats['newest_timestamp'] !== null) {
           if ($newestCache === null || $stats['newest_timestamp'] > $newestCache) {
               $newestCache = $stats['newest_timestamp'];
           }
       }
   }
   
   /**
    * Форматирование размера в читаемый формат
    * 
    * @param int $bytes Размер в байтах
    * @return string Отформатированный размер
    */
   function formatBytes(int $bytes): string
   {
       if ($bytes === 0) {
           return '0 B';
       }
       
       $k = 1024;
       $sizes = ['B', 'KB', 'MB', 'GB'];
       $i = floor(log($bytes) / log($k));
       
       return round($bytes / pow($k, $i) * 100) / 100 . ' ' . $sizes[$i];
   }
   ```

**Критерии приёмки:**
- [ ] Файл `cache-stats.php` создан
- [ ] Endpoint возвращает детальную статистику
- [ ] Статистика включает размер, количество файлов, TTL
- [ ] Статистика включает oldest/newest кеш
- [ ] Форматирование размера работает корректно
- [ ] Обработка ошибок реализована

**Тестирование:**
```bash
# Тест через curl
curl "http://localhost/api/admin/cache-stats.php"

# Ожидаемый ответ:
# {"success":true,"stats":{"total_modules":3,"total_files":25,...}}
```

---

## 📝 Этап 3: Создание сервисов для работы с кешем (Frontend)

**Цель:** Создать frontend-сервисы для работы с API управления кешем.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 3.1: Создание CacheManagementService

**Файл:** `vue-app/src/services/cache-management-service.js` (новый файл)

**Задача:** Создать сервис для работы с API управления кешем.

**Детальные шаги:**

1. **Создать файл `vue-app/src/services/cache-management-service.js`**

2. **Реализовать полный код сервиса:**
   ```javascript
   /**
    * Сервис для управления кешем модулей
    * 
    * Использует backend API для получения статуса и очистки кеша
    * API endpoints:
    * - /api/admin/cache-status.php - получение статуса
    * - /api/admin/cache-clear.php - очистка кеша
    * - /api/admin/cache-stats.php - статистика кеша
    */
   
   export class CacheManagementService {
     /**
      * Базовый URL для API запросов
      */
     static getApiUrl() {
       const baseUrl = window.location.origin;
       const path = window.location.pathname;
       const apiPath = path.replace(/\/[^\/]*\.php$/, '') + '/api';
       return `${baseUrl}${apiPath}`;
     }
     
     /**
      * Получение статуса кеша всех модулей
      * 
      * @returns {Promise<Array>} Массив модулей с информацией о кеше
      */
     static async getCacheStatus() {
       try {
         const apiUrl = `${this.getApiUrl()}/admin/cache-status.php`;
         const response = await fetch(apiUrl, {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
             'X-Requested-With': 'XMLHttpRequest'
           }
         });
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.success) {
           return result.modules || [];
         } else {
           throw new Error(result.error || 'Failed to get cache status');
         }
       } catch (error) {
         console.error('[CacheManagementService] Error getting cache status:', error);
         throw error;
       }
     }
     
     /**
      * Очистка кеша модуля
      * 
      * @param {string} moduleId - ID модуля или 'all' для очистки всего кеша
      * @returns {Promise<boolean>} true если успешно
      */
     static async clearCache(moduleId) {
       try {
         const apiUrl = `${this.getApiUrl()}/admin/cache-clear.php`;
         const response = await fetch(apiUrl, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'X-Requested-With': 'XMLHttpRequest'
           },
           body: JSON.stringify({
             module_id: moduleId,
             confirm: true
           })
         });
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.success) {
           return true;
         } else {
           throw new Error(result.error || 'Failed to clear cache');
         }
       } catch (error) {
         console.error('[CacheManagementService] Error clearing cache:', error);
         throw error;
       }
     }
     
     /**
      * Получение статистики кеша
      * 
      * @returns {Promise<object>} Статистика кеша
      */
     static async getCacheStats() {
       try {
         const apiUrl = `${this.getApiUrl()}/admin/cache-stats.php`;
         const response = await fetch(apiUrl, {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
             'X-Requested-With': 'XMLHttpRequest'
           }
         });
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.success) {
           return result.stats || {};
         } else {
           throw new Error(result.error || 'Failed to get cache stats');
         }
       } catch (error) {
         console.error('[CacheManagementService] Error getting cache stats:', error);
         throw error;
       }
     }
     
     /**
      * Форматирование размера кеша в читаемый формат
      * 
      * @param {number} bytes - Размер в байтах
      * @returns {string} Отформатированный размер
      */
     static formatCacheSize(bytes) {
       if (bytes === 0) return '0 B';
       
       const k = 1024;
       const sizes = ['B', 'KB', 'MB', 'GB'];
       const i = Math.floor(Math.log(bytes) / Math.log(k));
       
       return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
     }
     
     /**
      * Форматирование TTL в читаемый формат
      * 
      * @param {number} seconds - TTL в секундах
      * @returns {string} Отформатированный TTL
      */
     static formatTTL(seconds) {
       if (seconds < 60) {
         return `${seconds} сек`;
       } else if (seconds < 3600) {
         return `${Math.floor(seconds / 60)} мин`;
       } else {
         return `${Math.floor(seconds / 3600)} ч`;
       }
     }
   }
   ```

**Критерии приёмки:**
- [ ] Файл `cache-management-service.js` создан
- [ ] Метод `getCacheStatus()` возвращает статус кеша
- [ ] Метод `clearCache()` очищает кеш
- [ ] Метод `getCacheStats()` возвращает статистику
- [ ] Методы форматирования работают корректно
- [ ] Обработка ошибок реализована

---

## 📝 Этап 4: Создание компонентов интерфейса (Frontend)

**Цель:** Создать Vue.js компоненты для отображения и управления кешем.

**Время выполнения:** ~4-6 часов  
**Приоритет:** Высокий

### Подэтап 4.1: Создание основной страницы CacheManagementPage.vue

**Файл:** `vue-app/src/pages/CacheManagementPage.vue` (новый файл)

**Задача:** Создать основную страницу управления кешем.

**Детальные шаги:**

1. **Создать файл `vue-app/src/pages/CacheManagementPage.vue`**

2. **Реализовать структуру страницы:**
   ```vue
   <template>
     <div class="cache-management-page">
       <div class="page-header">
         <h1>🗑️ Ручное управление кешем</h1>
         <button @click="goBack" class="btn-back">← Назад</button>
       </div>
       
       <div v-if="loading" class="loading">
         Загрузка статуса кеша...
       </div>
       
       <div v-else-if="error" class="error">
         {{ error }}
       </div>
       
       <div v-else class="cache-content">
         <CacheStats :modules="modules" />
         
         <div class="modules-list">
           <CacheModuleCard
             v-for="module in modules"
             :key="module.id"
             :module="module"
             @clear="handleClearCache"
           />
         </div>
         
         <CacheActions
           :modules="modules"
           @clear-all="handleClearAllCache"
         />
       </div>
     </div>
   </template>
   
   <script>
   import { ref, onMounted } from 'vue';
   import { useRouter } from 'vue-router';
   import { CacheManagementService } from '@/services/cache-management-service.js';
   import CacheStats from '@/components/cache/CacheStats.vue';
   import CacheModuleCard from '@/components/cache/CacheModuleCard.vue';
   import CacheActions from '@/components/cache/CacheActions.vue';
   
   export default {
     name: 'CacheManagementPage',
     components: {
       CacheStats,
       CacheModuleCard,
       CacheActions
     },
     setup() {
       const router = useRouter();
       const modules = ref([]);
       const loading = ref(false);
       const error = ref(null);
       
       const loadCacheStatus = async () => {
         loading.value = true;
         error.value = null;
         
         try {
           modules.value = await CacheManagementService.getCacheStatus();
         } catch (err) {
           error.value = err.message || 'Ошибка загрузки статуса кеша';
           console.error('[CacheManagementPage] Error:', err);
         } finally {
           loading.value = false;
         }
       };
       
       const handleClearCache = async (moduleId) => {
         if (!confirm(`Вы уверены, что хотите очистить кеш модуля "${moduleId}"?`)) {
           return;
         }
         
         try {
           await CacheManagementService.clearCache(moduleId);
           // Перезагружаем статус после очистки
           await loadCacheStatus();
           
           // Уведомление об успехе
           alert('Кеш успешно очищен');
         } catch (err) {
           alert('Ошибка очистки кеша: ' + err.message);
           console.error('[CacheManagementPage] Error clearing cache:', err);
         }
       };
       
       const handleClearAllCache = async () => {
         if (!confirm('Вы уверены, что хотите очистить весь кеш? Это действие нельзя отменить.')) {
           return;
         }
         
         try {
           await CacheManagementService.clearCache('all');
           // Перезагружаем статус после очистки
           await loadCacheStatus();
           
           // Уведомление об успехе
           alert('Весь кеш успешно очищен');
         } catch (err) {
           alert('Ошибка очистки кеша: ' + err.message);
           console.error('[CacheManagementPage] Error clearing all cache:', err);
         }
       };
       
       const goBack = () => {
         router.push({ name: 'index' });
       };
       
       onMounted(() => {
         loadCacheStatus();
       });
       
       return {
         modules,
         loading,
         error,
         handleClearCache,
         handleClearAllCache,
         goBack
       };
     }
   };
   </script>
   
   <style scoped>
   .cache-management-page {
     padding: 20px;
     max-width: 1200px;
     margin: 0 auto;
   }
   
   .page-header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 30px;
   }
   
   .page-header h1 {
     margin: 0;
     font-size: 24px;
   }
   
   .btn-back {
     padding: 8px 16px;
     background-color: #6c757d;
     color: white;
     border: none;
     border-radius: 4px;
     cursor: pointer;
   }
   
   .btn-back:hover {
     background-color: #5a6268;
   }
   
   .loading,
   .error {
     padding: 20px;
     text-align: center;
   }
   
   .error {
     color: #dc3545;
   }
   
   .cache-content {
     display: flex;
     flex-direction: column;
     gap: 20px;
   }
   
   .modules-list {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
     gap: 20px;
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Страница создана и отображается
- [ ] Загрузка статуса кеша работает
- [ ] Очистка кеша работает
- [ ] Обработка ошибок реализована
- [ ] Кнопка "Назад" работает

---

### Подэтап 4.2: Создание компонента CacheModuleCard.vue

**Файл:** `vue-app/src/components/cache/CacheModuleCard.vue` (новый файл)

**Задача:** Создать карточку модуля с информацией о кеше и кнопкой очистки.

**Детальные шаги:**

1. **Создать директорию для компонентов:**
   ```bash
   mkdir -p vue-app/src/components/cache
   ```

2. **Создать файл `vue-app/src/components/cache/CacheModuleCard.vue`**

3. **Реализовать полный код компонента:**
   ```vue
   <template>
     <div class="cache-module-card">
       <div class="card-header">
         <h3 class="module-name">{{ module.name }}</h3>
         <span class="module-status" :class="statusClass">
           {{ statusText }}
         </span>
       </div>
       
       <div class="card-body">
         <div class="cache-info">
           <div class="info-row">
             <span class="info-label">Файлов:</span>
             <span class="info-value">{{ module.file_count || 0 }}</span>
           </div>
           
           <div class="info-row">
             <span class="info-label">Размер:</span>
             <span class="info-value">{{ formattedSize }}</span>
           </div>
           
           <div class="info-row">
             <span class="info-label">TTL:</span>
             <span class="info-value">{{ formattedTTL }}</span>
           </div>
           
           <div v-if="module.cache_dir" class="info-row">
             <span class="info-label">Директория:</span>
             <span class="info-value cache-dir">{{ module.cache_dir }}</span>
           </div>
         </div>
       </div>
       
       <div class="card-footer">
         <button
           @click="handleClear"
           :disabled="clearing || module.file_count === 0"
           class="btn-clear"
           :class="{ 'btn-disabled': clearing || module.file_count === 0 }"
         >
           <span v-if="clearing">Очистка...</span>
           <span v-else>🗑️ Очистить кеш</span>
         </button>
       </div>
     </div>
   </template>
   
   <script>
   import { ref, computed } from 'vue';
   import { CacheManagementService } from '@/services/cache-management-service.js';
   
   export default {
     name: 'CacheModuleCard',
     props: {
       module: {
         type: Object,
         required: true,
         validator: (value) => {
           return value && typeof value.id === 'string' && typeof value.name === 'string';
         }
       }
     },
     emits: ['clear'],
     setup(props, { emit }) {
       const clearing = ref(false);
       
       const formattedSize = computed(() => {
         return CacheManagementService.formatCacheSize(props.module.total_size || 0);
       });
       
       const formattedTTL = computed(() => {
         return CacheManagementService.formatTTL(props.module.ttl || 0);
       });
       
       const statusClass = computed(() => {
         if (props.module.file_count > 0) {
           return 'status-active';
         }
         return 'status-empty';
       });
       
       const statusText = computed(() => {
         if (props.module.file_count > 0) {
           return 'Активен';
         }
         return 'Пуст';
       });
       
       const handleClear = async () => {
         if (clearing.value || props.module.file_count === 0) {
           return;
         }
         
         if (!confirm(`Вы уверены, что хотите очистить кеш модуля "${props.module.name}"?`)) {
           return;
         }
         
         clearing.value = true;
         
         try {
           await CacheManagementService.clearCache(props.module.id);
           emit('clear', props.module.id);
           
           // Уведомление об успехе
           if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
             BX.UI.Notification.Center.notify({
               content: `Кеш модуля "${props.module.name}" успешно очищен`,
               autoHideDelay: 3000
             });
           }
         } catch (error) {
           console.error('[CacheModuleCard] Error clearing cache:', error);
           
           // Уведомление об ошибке
           if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
             BX.UI.Notification.Center.notify({
               content: `Ошибка очистки кеша: ${error.message}`,
               autoHideDelay: 5000
             });
           } else {
             alert(`Ошибка очистки кеша: ${error.message}`);
           }
         } finally {
           clearing.value = false;
         }
       };
       
       return {
         clearing,
         formattedSize,
         formattedTTL,
         statusClass,
         statusText,
         handleClear
       };
     }
   };
   </script>
   
   <style scoped>
   .cache-module-card {
     background: white;
     border: 1px solid #e0e0e0;
     border-radius: 8px;
     padding: 20px;
     box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
     transition: box-shadow 0.3s ease;
   }
   
   .cache-module-card:hover {
     box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
   }
   
   .card-header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 15px;
     padding-bottom: 15px;
     border-bottom: 1px solid #e0e0e0;
   }
   
   .module-name {
     margin: 0;
     font-size: 18px;
     font-weight: 600;
     color: #333;
   }
   
   .module-status {
     padding: 4px 12px;
     border-radius: 12px;
     font-size: 12px;
     font-weight: 500;
   }
   
   .status-active {
     background-color: #d4edda;
     color: #155724;
   }
   
   .status-empty {
     background-color: #f8d7da;
     color: #721c24;
   }
   
   .card-body {
     margin-bottom: 15px;
   }
   
   .cache-info {
     display: flex;
     flex-direction: column;
     gap: 10px;
   }
   
   .info-row {
     display: flex;
     justify-content: space-between;
     align-items: center;
   }
   
   .info-label {
     font-weight: 500;
     color: #666;
   }
   
   .info-value {
     color: #333;
     font-weight: 600;
   }
   
   .cache-dir {
     font-size: 12px;
     font-family: monospace;
     color: #999;
     word-break: break-all;
   }
   
   .card-footer {
     display: flex;
     justify-content: flex-end;
     padding-top: 15px;
     border-top: 1px solid #e0e0e0;
   }
   
   .btn-clear {
     padding: 8px 16px;
     background-color: #dc3545;
     color: white;
     border: none;
     border-radius: 4px;
     cursor: pointer;
     font-size: 14px;
     transition: background-color 0.3s ease;
   }
   
   .btn-clear:hover:not(.btn-disabled) {
     background-color: #c82333;
   }
   
   .btn-clear.btn-disabled {
     background-color: #6c757d;
     cursor: not-allowed;
     opacity: 0.6;
   }
   
   @media (max-width: 768px) {
     .cache-module-card {
       padding: 15px;
     }
     
     .module-name {
       font-size: 16px;
     }
     
     .info-row {
       flex-direction: column;
       align-items: flex-start;
       gap: 4px;
     }
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Файл `CacheModuleCard.vue` создан
- [ ] Компонент отображает информацию о модуле
- [ ] Кнопка очистки работает
- [ ] Обработка состояний (clearing) реализована
- [ ] Уведомления работают (через BX.UI или alert)
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Адаптивность для мобильных устройств

---

### Подэтап 4.3: Создание компонента CacheStats.vue

**Файл:** `vue-app/src/components/cache/CacheStats.vue` (новый файл)

**Задача:** Создать компонент для отображения общей статистики кеша.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/cache/CacheStats.vue`**

2. **Реализовать полный код компонента:**
   ```vue
   <template>
     <div class="cache-stats">
       <h2 class="stats-title">📊 Общая статистика кеша</h2>
       
       <div class="stats-grid">
         <div class="stat-card">
           <div class="stat-icon">📦</div>
           <div class="stat-content">
             <div class="stat-value">{{ totalModules }}</div>
             <div class="stat-label">Модулей с кешем</div>
           </div>
         </div>
         
         <div class="stat-card">
           <div class="stat-icon">📄</div>
           <div class="stat-content">
             <div class="stat-value">{{ totalFiles }}</div>
             <div class="stat-label">Всего файлов</div>
           </div>
         </div>
         
         <div class="stat-card">
           <div class="stat-icon">💾</div>
           <div class="stat-content">
             <div class="stat-value">{{ totalSizeFormatted }}</div>
             <div class="stat-label">Общий размер</div>
           </div>
         </div>
         
         <div class="stat-card">
           <div class="stat-icon">⏱️</div>
           <div class="stat-content">
             <div class="stat-value">{{ avgTTL }}</div>
             <div class="stat-label">Средний TTL</div>
           </div>
         </div>
       </div>
     </div>
   </template>
   
   <script>
   import { computed } from 'vue';
   import { CacheManagementService } from '@/services/cache-management-service.js';
   
   export default {
     name: 'CacheStats',
     props: {
       modules: {
         type: Array,
         required: true,
         default: () => []
       }
     },
     setup(props) {
       const totalModules = computed(() => {
         return props.modules.length;
       });
       
       const totalFiles = computed(() => {
         return props.modules.reduce((sum, module) => {
           return sum + (module.file_count || 0);
         }, 0);
       });
       
       const totalSize = computed(() => {
         return props.modules.reduce((sum, module) => {
           return sum + (module.total_size || 0);
         }, 0);
       });
       
       const totalSizeFormatted = computed(() => {
         return CacheManagementService.formatCacheSize(totalSize.value);
       });
       
       const avgTTL = computed(() => {
         if (props.modules.length === 0) {
           return '0 мин';
         }
         
         const totalTTL = props.modules.reduce((sum, module) => {
           return sum + (module.ttl || 0);
         }, 0);
         
         const avg = Math.round(totalTTL / props.modules.length);
         return CacheManagementService.formatTTL(avg);
       });
       
       return {
         totalModules,
         totalFiles,
         totalSizeFormatted,
         avgTTL
       };
     }
   };
   </script>
   
   <style scoped>
   .cache-stats {
     background: white;
     border: 1px solid #e0e0e0;
     border-radius: 8px;
     padding: 20px;
     margin-bottom: 20px;
   }
   
   .stats-title {
     margin: 0 0 20px 0;
     font-size: 20px;
     font-weight: 600;
     color: #333;
   }
   
   .stats-grid {
     display: grid;
     grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
     gap: 15px;
   }
   
   .stat-card {
     display: flex;
     align-items: center;
     gap: 15px;
     padding: 15px;
     background: #f8f9fa;
     border-radius: 6px;
     border: 1px solid #e0e0e0;
   }
   
   .stat-icon {
     font-size: 32px;
     line-height: 1;
   }
   
   .stat-content {
     flex: 1;
   }
   
   .stat-value {
     font-size: 24px;
     font-weight: 700;
     color: #333;
     margin-bottom: 4px;
   }
   
   .stat-label {
     font-size: 12px;
     color: #666;
     text-transform: uppercase;
     letter-spacing: 0.5px;
   }
   
   @media (max-width: 768px) {
     .stats-grid {
       grid-template-columns: repeat(2, 1fr);
     }
     
     .stat-card {
       flex-direction: column;
       text-align: center;
     }
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Файл `CacheStats.vue` создан
- [ ] Компонент отображает общую статистику
- [ ] Все вычисляемые значения корректны
- [ ] Форматирование размера и TTL работает
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Адаптивность для мобильных устройств

---

### Подэтап 4.4: Создание компонента CacheActions.vue

**Файл:** `vue-app/src/components/cache/CacheActions.vue` (новый файл)

**Задача:** Создать компонент для действий с кешем (очистка всего кеша).

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/cache/CacheActions.vue`**

2. **Реализовать полный код компонента:**
   ```vue
   <template>
     <div class="cache-actions">
       <div class="actions-header">
         <h3>⚡ Действия с кешем</h3>
       </div>
       
       <div class="actions-content">
         <div class="action-info">
           <p>
             Вы можете очистить весь кеш всех модулей одним действием.
             Это действие нельзя отменить.
           </p>
           <p class="warning-text">
             ⚠️ После очистки кеш будет автоматически пересоздан при следующем запросе к модулям.
           </p>
         </div>
         
         <div class="actions-buttons">
           <button
             @click="handleClearAll"
             :disabled="clearing || !hasCache"
             class="btn-clear-all"
             :class="{ 'btn-disabled': clearing || !hasCache }"
           >
             <span v-if="clearing">Очистка...</span>
             <span v-else>🗑️ Очистить весь кеш</span>
           </button>
           
           <button
             @click="handleRefresh"
             :disabled="refreshing"
             class="btn-refresh"
             :class="{ 'btn-disabled': refreshing }"
           >
             <span v-if="refreshing">Обновление...</span>
             <span v-else>🔄 Обновить статус</span>
           </button>
         </div>
       </div>
     </div>
   </template>
   
   <script>
   import { ref, computed } from 'vue';
   import { CacheManagementService } from '@/services/cache-management-service.js';
   
   export default {
     name: 'CacheActions',
     props: {
       modules: {
         type: Array,
         required: true,
         default: () => []
       }
     },
     emits: ['clear-all', 'refresh'],
     setup(props, { emit }) {
       const clearing = ref(false);
       const refreshing = ref(false);
       
       const hasCache = computed(() => {
         return props.modules.some(module => (module.file_count || 0) > 0);
       });
       
       const handleClearAll = async () => {
         if (clearing.value || !hasCache.value) {
           return;
         }
         
         const totalFiles = props.modules.reduce((sum, module) => {
           return sum + (module.file_count || 0);
         }, 0);
         
         if (!confirm(
           `Вы уверены, что хотите очистить весь кеш?\n\n` +
           `Будет очищено ${totalFiles} файлов из ${props.modules.length} модулей.\n\n` +
           `Это действие нельзя отменить.`
         )) {
           return;
         }
         
         clearing.value = true;
         
         try {
           await CacheManagementService.clearCache('all');
           emit('clear-all');
           
           // Уведомление об успехе
           if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
             BX.UI.Notification.Center.notify({
               content: 'Весь кеш успешно очищен',
               autoHideDelay: 3000
             });
           } else {
             alert('Весь кеш успешно очищен');
           }
         } catch (error) {
           console.error('[CacheActions] Error clearing all cache:', error);
           
           // Уведомление об ошибке
           if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
             BX.UI.Notification.Center.notify({
               content: `Ошибка очистки кеша: ${error.message}`,
               autoHideDelay: 5000
             });
           } else {
             alert(`Ошибка очистки кеша: ${error.message}`);
           }
         } finally {
           clearing.value = false;
         }
       };
       
       const handleRefresh = async () => {
         if (refreshing.value) {
           return;
         }
         
         refreshing.value = true;
         emit('refresh');
         
         // Сбрасываем состояние через небольшую задержку
         setTimeout(() => {
           refreshing.value = false;
         }, 1000);
       };
       
       return {
         clearing,
         refreshing,
         hasCache,
         handleClearAll,
         handleRefresh
       };
     }
   };
   </script>
   
   <style scoped>
   .cache-actions {
     background: white;
     border: 1px solid #e0e0e0;
     border-radius: 8px;
     padding: 20px;
     margin-top: 20px;
   }
   
   .actions-header {
     margin-bottom: 15px;
     padding-bottom: 15px;
     border-bottom: 1px solid #e0e0e0;
   }
   
   .actions-header h3 {
     margin: 0;
     font-size: 18px;
     font-weight: 600;
     color: #333;
   }
   
   .actions-content {
     display: flex;
     flex-direction: column;
     gap: 15px;
   }
   
   .action-info {
     color: #666;
     font-size: 14px;
     line-height: 1.6;
   }
   
   .action-info p {
     margin: 0 0 10px 0;
   }
   
   .warning-text {
     color: #856404;
     background-color: #fff3cd;
     padding: 10px;
     border-radius: 4px;
     border-left: 4px solid #ffc107;
   }
   
   .actions-buttons {
     display: flex;
     gap: 10px;
     flex-wrap: wrap;
   }
   
   .btn-clear-all,
   .btn-refresh {
     padding: 10px 20px;
     border: none;
     border-radius: 4px;
     cursor: pointer;
     font-size: 14px;
     font-weight: 500;
     transition: all 0.3s ease;
   }
   
   .btn-clear-all {
     background-color: #dc3545;
     color: white;
   }
   
   .btn-clear-all:hover:not(.btn-disabled) {
     background-color: #c82333;
   }
   
   .btn-refresh {
     background-color: #007bff;
     color: white;
   }
   
   .btn-refresh:hover:not(.btn-disabled) {
     background-color: #0056b3;
   }
   
   .btn-disabled {
     opacity: 0.6;
     cursor: not-allowed;
   }
   
   @media (max-width: 768px) {
     .actions-buttons {
       flex-direction: column;
     }
     
     .btn-clear-all,
     .btn-refresh {
       width: 100%;
     }
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Файл `CacheActions.vue` создан
- [ ] Кнопка "Очистить весь кеш" работает
- [ ] Кнопка "Обновить статус" работает
- [ ] Подтверждение перед очисткой работает
- [ ] Обработка состояний (clearing, refreshing) реализована
- [ ] Уведомления работают
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Адаптивность для мобильных устройств

---

**Критерии приёмки для всех компонентов:**
- [ ] Все компоненты созданы
- [ ] Компоненты используют `CacheManagementService`
- [ ] Обработка состояний (loading, error) реализована
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Компоненты переиспользуемы и изолированы

---

## 📝 Этап 5: Интеграция и финализация

**Цель:** Интегрировать все компоненты и завершить реализацию.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 5.1: Интеграция компонентов в основную страницу

**Файл:** `vue-app/src/pages/CacheManagementPage.vue`

**Задача:** Убедиться, что все компоненты правильно интегрированы и работают вместе.

**Детальные шаги:**

1. **Проверить импорты всех компонентов:**
   ```javascript
   import CacheStats from '@/components/cache/CacheStats.vue';
   import CacheModuleCard from '@/components/cache/CacheModuleCard.vue';
   import CacheActions from '@/components/cache/CacheActions.vue';
   ```

2. **Проверить регистрацию компонентов:**
   ```javascript
   components: {
     CacheStats,
     CacheModuleCard,
     CacheActions
   }
   ```

3. **Проверить обработку событий:**
   - `@clear` на `CacheModuleCard` → `handleClearCache`
   - `@clear-all` на `CacheActions` → `handleClearAllCache`
   - `@refresh` на `CacheActions` → перезагрузка статуса

4. **Проверить обновление данных после очистки:**
   - После очистки кеша должен вызываться `loadCacheStatus()`
   - Данные должны обновляться автоматически

**Критерии приёмки:**
- [ ] Все компоненты импортированы и зарегистрированы
- [ ] События обрабатываются корректно
- [ ] Данные обновляются после очистки кеша
- [ ] Нет ошибок в консоли браузера

---

### Подэтап 5.2: Проверка работы API endpoints

**Задача:** Протестировать все API endpoints через curl или Postman.

**Детальные шаги:**

1. **Тест получения статуса кеша:**
   ```bash
   curl -X GET "http://localhost/api/admin/cache-status.php" \
     -H "Content-Type: application/json"
   ```
   
   **Ожидаемый результат:**
   - HTTP 200
   - JSON с `success: true` и массивом `modules`

2. **Тест получения статистики:**
   ```bash
   curl -X GET "http://localhost/api/admin/cache-stats.php" \
     -H "Content-Type: application/json"
   ```
   
   **Ожидаемый результат:**
   - HTTP 200
   - JSON с `success: true` и объектом `stats`

3. **Тест очистки кеша конкретного модуля:**
   ```bash
   curl -X POST "http://localhost/api/admin/cache-clear.php" \
     -H "Content-Type: application/json" \
     -d '{"module_id":"graph-admission-closure-months","confirm":true}'
   ```
   
   **Ожидаемый результат:**
   - HTTP 200
   - JSON с `success: true` и массивом `cleared_modules`

4. **Тест очистки всего кеша:**
   ```bash
   curl -X POST "http://localhost/api/admin/cache-clear.php" \
     -H "Content-Type: application/json" \
     -d '{"module_id":"all","confirm":true}'
   ```
   
   **Ожидаемый результат:**
   - HTTP 200
   - JSON с `success: true` и массивом всех очищенных модулей

5. **Тест валидации (без confirm):**
   ```bash
   curl -X POST "http://localhost/api/admin/cache-clear.php" \
     -H "Content-Type: application/json" \
     -d '{"module_id":"graph-admission-closure-months"}'
   ```
   
   **Ожидаемый результат:**
   - HTTP 400
   - JSON с `error: "Confirmation required"`

**Критерии приёмки:**
- [ ] Все API endpoints возвращают корректные ответы
- [ ] Валидация работает корректно
- [ ] Обработка ошибок работает
- [ ] CORS заголовки настроены

---

### Подэтап 5.3: Проверка работы Vue.js компонентов

**Задача:** Протестировать все компоненты в браузере.

**Детальные шаги:**

1. **Открыть страницу `/admin/cache` в браузере**

2. **Проверить отображение:**
   - Заголовок страницы отображается
   - Компонент `CacheStats` отображает статистику
   - Компоненты `CacheModuleCard` отображаются для каждого модуля
   - Компонент `CacheActions` отображается внизу

3. **Проверить интерактивность:**
   - Кнопка "Очистить кеш" на карточке модуля работает
   - Кнопка "Очистить весь кеш" работает
   - Кнопка "Обновить статус" работает
   - Подтверждение перед очисткой работает

4. **Проверить состояния:**
   - Индикация загрузки отображается при загрузке данных
   - Сообщения об ошибках отображаются при ошибках
   - Кнопки блокируются во время операций

5. **Проверить обновление данных:**
   - После очистки кеша данные обновляются
   - Статистика пересчитывается корректно

**Критерии приёмки:**
- [ ] Все компоненты отображаются корректно
- [ ] Все интерактивные элементы работают
- [ ] Состояния обрабатываются корректно
- [ ] Данные обновляются после действий

---

### Подэтап 5.4: Проверка интеграции с административным разделом

**Задача:** Убедиться, что модуль правильно интегрирован в административный раздел.

**Детальные шаги:**

1. **Проверить отображение в попапе администратора:**
   - Открыть главную страницу приложения
   - Нажать на кнопку администратора (⚙️)
   - Проверить, что раздел "Ручное управление кешем" отображается в списке

2. **Проверить навигацию:**
   - Кликнуть на раздел "Ручное управление кешем"
   - Проверить, что происходит переход на `/admin/cache`
   - Проверить, что страница загружается

3. **Проверить права доступа:**
   - Попытаться открыть `/admin/cache` без прав администратора
   - Проверить, что происходит редирект на главную страницу

4. **Проверить кнопку "Назад":**
   - На странице управления кешем нажать "Назад"
   - Проверить, что происходит возврат на главную страницу

**Критерии приёмки:**
- [ ] Раздел отображается в попапе администратора
- [ ] Навигация работает корректно
- [ ] Проверка прав доступа работает
- [ ] Кнопка "Назад" работает

---

### Подэтап 5.5: Проверка обработки ошибок

**Задача:** Убедиться, что все ошибки обрабатываются корректно.

**Детальные шаги:**

1. **Проверить обработку ошибок API:**
   - Временно изменить URL API в сервисе на несуществующий
   - Проверить, что ошибка отображается пользователю
   - Вернуть правильный URL

2. **Проверить обработку пустого кеша:**
   - Очистить весь кеш
   - Проверить, что модули отображаются с статусом "Пуст"
   - Проверить, что кнопки очистки заблокированы для пустых модулей

3. **Проверить обработку сетевых ошибок:**
   - Отключить интернет (или заблокировать запросы)
   - Попытаться загрузить статус кеша
   - Проверить, что ошибка отображается

**Критерии приёмки:**
- [ ] Ошибки API обрабатываются корректно
- [ ] Пустой кеш обрабатывается корректно
- [ ] Сетевые ошибки обрабатываются корректно
- [ ] Пользователь видит понятные сообщения об ошибках

---

### Подэтап 5.6: Проверка стилизации и адаптивности

**Задача:** Убедиться, что стилизация соответствует гайдлайнам и адаптивна.

**Детальные шаги:**

1. **Проверить стилизацию на десктопе:**
   - Открыть страницу на большом экране
   - Проверить расположение элементов
   - Проверить отступы и размеры

2. **Проверить адаптивность на планшете:**
   - Открыть страницу на планшете (768px)
   - Проверить, что элементы адаптируются
   - Проверить, что сетка карточек работает корректно

3. **Проверить адаптивность на мобильном:**
   - Открыть страницу на мобильном устройстве (375px)
   - Проверить, что все элементы видны
   - Проверить, что кнопки доступны

4. **Проверить соответствие гайдлайнам Bitrix24:**
   - Сравнить цвета с гайдлайнами Bitrix24
   - Проверить типографику
   - Проверить отступы и размеры элементов

**Критерии приёмки:**
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Адаптивность работает на всех устройствах
- [ ] Все элементы видны и доступны
- [ ] Нет проблем с переполнением контента

---

### Подэтап 5.7: Финальное тестирование

**Задача:** Провести полное тестирование всего функционала.

**Детальные шаги:**

1. **Создать чек-лист тестирования:**
   - [ ] Открытие страницы управления кешем
   - [ ] Загрузка статуса кеша
   - [ ] Отображение статистики
   - [ ] Отображение карточек модулей
   - [ ] Очистка кеша одного модуля
   - [ ] Очистка всего кеша
   - [ ] Обновление статуса
   - [ ] Навигация назад
   - [ ] Проверка прав доступа

2. **Выполнить все пункты чек-листа**

3. **Исправить найденные ошибки**

4. **Повторить тестирование после исправлений**

**Критерии приёмки:**
- [ ] Все пункты чек-листа выполнены
- [ ] Все ошибки исправлены
- [ ] Функционал работает стабильно
- [ ] Нет критических ошибок в консоли

---

## 🔗 API-методы

### Backend API endpoints:

1. **`GET /api/admin/cache-status.php`** — получение статуса кеша
   - Ответ: `{ "success": true, "modules": [...] }`

2. **`POST /api/admin/cache-clear.php`** — очистка кеша
   - Параметры: `{ "module_id": "module-id" | "all", "confirm": true }`
   - Ответ: `{ "success": true, "message": "...", "cleared_modules": [...] }`

3. **`GET /api/admin/cache-stats.php`** — получение статистики кеша
   - Ответ: `{ "success": true, "stats": {...} }`

---

## 🎨 Технические требования

### Vue.js:

- **Версия:** 3.x (Composition API)
- **Стиль:** Composition API с `setup()`
- **Реактивность:** `ref()`, `computed()`, `watch()`

### Компоненты:

- **Модульность:** Каждый компонент в отдельном файле
- **Переиспользуемость:** Компоненты должны быть переиспользуемыми
- **Props/Emits:** Чёткое определение интерфейса компонентов

### Стилизация:

- **Подход:** Scoped styles в компонентах
- **Гайдлайны:** Соответствие стилям Bitrix24
- **Адаптивность:** Поддержка мобильных устройств

### Производительность:

- **Ленивая загрузка:** Использование `defineAsyncComponent` для тяжёлых компонентов
- **Кеширование:** Кеширование данных статуса (sessionStorage, TTL: 1 минута)
- **Оптимизация:** Минимизация запросов к API

---

## ✅ Критерии приёмки

### Функциональность:

- [ ] Страница доступна по маршруту `/admin/cache`
- [ ] Проверка прав администратора работает
- [ ] Просмотр статуса кеша работает для всех модулей
- [ ] Очистка кеша для конкретного модуля работает
- [ ] Очистка всего кеша работает
- [ ] Статистика кеша отображается корректно
- [ ] Подтверждение перед очисткой работает
- [ ] Кнопка "Назад" ведёт на главную страницу

### Безопасность:

- [ ] Доступ только для администраторов
- [ ] Проверка прав на уровне маршрутизации
- [ ] Проверка прав на уровне API endpoints
- [ ] Требуется подтверждение перед очисткой кеша

### UX:

- [ ] Индикация загрузки данных
- [ ] Обработка ошибок с понятными сообщениями
- [ ] Адаптивность для мобильных устройств
- [ ] Соответствие гайдлайнам Bitrix24
- [ ] Подтверждение перед критическими действиями

### Производительность:

- [ ] Загрузка данных не превышает 3 секунд
- [ ] Кеширование данных работает
- [ ] Оптимизация запросов к API

---

## 📝 Примечания

### Важные замечания:

1. **Модули с кешированием:**
   - График приёма/закрытий 1С (3 месяца и 4 недели)
   - Недельные новые и закрытые тикеты сектора 1С
   - Трудозатраты на Тикеты сектора 1С
   - Трудозатраты сотрудников сектора 1С по неделям

2. **Структура кеша:**
   - Файловый кеш в директориях `api/cache/`
   - Формат файлов: JSON
   - TTL: 5 минут (300 секунд) для большинства модулей
   - TTL: 2 минуты (120 секунд) для режима "4 недели"

3. **Безопасность:**
   - Все изменения кеша должны проверяться на backend
   - Требуется подтверждение перед очисткой
   - Логирование всех действий администраторов

4. **Обратная совместимость:**
   - Очистка кеша не должна ломать работу приложения
   - После очистки кеш будет автоматически пересоздан при следующем запросе

5. **Проверка прав администратора в API endpoints:**
   
   **Важно:** В текущей реализации используется заглушка `$isAdmin = true` для тестирования.
   В продакшене необходимо реализовать проверку через Bitrix24 API.
   
   **Пример реализации проверки прав:**
   ```php
   // В начале каждого API endpoint (cache-status.php, cache-clear.php, cache-stats.php)
   
   // Вариант 1: Проверка через сессию Bitrix24 (если доступна)
   session_start();
   if (!isset($_SESSION['BX_USER_ID']) || !isUserAdmin($_SESSION['BX_USER_ID'])) {
       http_response_code(403);
       echo json_encode(['error' => 'Access denied. Admin rights required.']);
       exit;
   }
   
   // Вариант 2: Проверка через Bitrix24 REST API
   // Требуется передача токена или вебхука в запросе
   $userId = $_GET['user_id'] ?? null;
   $authToken = $_GET['auth_token'] ?? null;
   
   if (!$userId || !$authToken || !isUserAdminViaAPI($userId, $authToken)) {
       http_response_code(403);
       echo json_encode(['error' => 'Access denied. Admin rights required.']);
       exit;
   }
   
   // Вспомогательная функция для проверки прав
   function isUserAdmin($userId) {
       // Проверка через access-config.js или БД
       // Использовать функцию isAdmin() из access-config.js
       require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/vue-app/src/config/access-config.php';
       // TODO: Реализовать проверку через Bitrix24 API
       return true; // Временная заглушка
   }
   ```
   
   **Рекомендация:** Использовать проверку прав на уровне Vue Router (уже реализовано через `adminOnly: true`),
   но также добавить проверку на backend для безопасности.

6. **Структура директорий кеша:**
   
   ```
   api/cache/
   ├── graph-admission-closure/
   │   ├── months/          # Кеш для режима "3 месяца"
   │   │   └── *.json
   │   └── weeks/           # Кеш для режима "4 недели"
   │       └── *.json
   ├── time-tracking-sector-1c/
   │   └── *.json           # Кеш для трудозатрат
   └── ...
   ```
   
   **Важно:** Убедиться, что директории создаются автоматически при первом сохранении кеша.
   Права доступа: 755 для директорий, 644 для файлов.

7. **Логирование действий:**
   
   Рекомендуется логировать все действия администраторов по управлению кешем:
   - Очистка кеша конкретного модуля
   - Очистка всего кеша
   - Просмотр статуса кеша
   
   **Пример логирования:**
   ```php
   error_log(sprintf(
       "[Cache Management] User %d cleared cache for module: %s",
       $userId,
       $moduleId
   ));
   ```

---

## 🔄 История правок

- 2025-12-24 10:08 (UTC+3, Брест): Создан черновик задачи TASK-074
- 2025-12-24 10:15 (UTC+3, Брест): Расширена детализация задачи:
  - Добавлены детальные инструкции для всех подэтапов
  - Добавлен полный код для всех Vue.js компонентов (CacheModuleCard, CacheStats, CacheActions)
  - Добавлены детальные инструкции для API endpoints (cache-stats.php)
  - Улучшен этап 5 с детальными подэтапами тестирования
  - Добавлены примеры тестирования через curl
  - Добавлены инструкции по проверке прав администратора

---

## 📚 Связанные документы

- `DOCS/ANALYSIS/administration-module-comprehensive-analysis.md` — анализ модуля администрирования
- `DOCS/TASKS/TASK-072-users-management-module.md` — референс реализации администраторского модуля
- `DOCS/TASKS/TASK-003-webhook-logs-module.md` — референс структуры администраторской страницы
- `api/cache/GraphAdmissionClosureCache.php` — класс кеша для графика приёма/закрытий
- `api/cache/TimeTrackingCache.php` — класс кеша для трудозатрат

