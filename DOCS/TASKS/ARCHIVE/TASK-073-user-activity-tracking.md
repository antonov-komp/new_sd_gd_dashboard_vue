# TASK-073: Расширение модуля "Управление пользователями" — отслеживание активности пользователей

**Дата создания:** 2025-12-24 12:32 (UTC+3, Брест)  
**Дата обновления:** 2025-12-24 12:45 (UTC+3, Брест)  
**Статус:** Черновик (Draft)  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-072 (Модуль "Управление пользователями")

---

## 📌 Краткое резюме

**Что реализуется:**
- Отслеживание первого входа пользователей в приложение
- Логирование всех переходов по страницам приложения
- Отображение истории активности в интерфейсе управления пользователями
- Статистика использования приложения

**Структура реализации:**
- **6 основных этапов** с детальными подэтапами
- **Backend:** API endpoints для логирования и получения активности
- **Frontend:** Vue.js сервисы и компоненты для отображения
- **Интеграция:** Логирование в IndexPage и Vue Router

**Время выполнения:** ~18-25 часов  
**Сложность:** Средняя-Высокая

---

## 📋 Описание

Расширить модуль **"Управление пользователями"** в разделе Администрирования функционалом отслеживания активности пользователей. Модуль должен показывать:

1. **Кто открыл приложение** — информация о первом входе пользователя в приложение
2. **Какие страницы открывал** — история навигации пользователя по маршрутам приложения

**Цель:** Предоставить администраторам возможность мониторить активность пользователей, видеть, кто и когда использовал приложение, и какие разделы были наиболее популярными.

---

## 🎯 Контекст

### Текущая ситуация:

- ✅ Модуль "Управление пользователями" реализован (TASK-072)
- ✅ Страница `/admin/users` существует
- ✅ Есть глобальная папка `logs/` для хранения логов
- ✅ Vue Router с navigation guard реализован
- ❌ Нет отслеживания открытий приложения
- ❌ Нет отслеживания навигации по страницам
- ❌ Нет отображения активности пользователей в интерфейсе

### Требования:

- Отслеживание первого входа пользователя в приложение
- Логирование всех переходов по маршрутам (страницам)
- Хранение логов активности в папке `logs/user-activity/`
- Отображение истории активности в интерфейсе управления пользователями
- Фильтрация и поиск по активности
- Статистика использования приложения

### Референсная реализация:

- **Модуль:** "Логи вебхуков" (`WebhookLogsPage.vue`)
  - Структура логирования в `logs/webhooks/`
  - Формат JSON-логов
  - Компоненты для отображения логов
- **Структура:** Аналогично модулю вебхуков, но для активности пользователей

---

## 🏗️ Модули и компоненты

### Новые файлы (Vue.js):

#### Frontend (Vue.js):
- `vue-app/src/services/user-activity-service.js` — сервис для работы с активностью пользователей
- `vue-app/src/services/activity-logging-service.js` — сервис для логирования активности
- `vue-app/src/composables/useActivityTracking.js` — композабл для отслеживания активности
- `vue-app/src/components/users/UserActivityList.vue` — компонент списка активности пользователя
- `vue-app/src/components/users/UserActivityCard.vue` — карточка записи активности
- `vue-app/src/components/users/UserActivityFilters.vue` — фильтры активности
- `vue-app/src/components/users/UserActivityStats.vue` — статистика активности
- `vue-app/src/components/users/UserActivityTimeline.vue` — временная шкала активности

#### Backend (PHP):
- `api/user-activity-log.php` — API endpoint для логирования активности
- `api/user-activity-get.php` — API endpoint для получения активности
- `src/UserActivity/` — модуль для работы с активностью (опционально, если нужна сложная логика)

### Изменяемые файлы:

- `vue-app/src/pages/UsersManagementPage.vue` — добавление раздела "Активность пользователей"
- `vue-app/src/router/index.js` — добавление логирования навигации в navigation guard
- `vue-app/src/components/IndexPage.vue` — логирование первого входа пользователя
- `vue-app/src/services/access-control-service.js` — логирование успешного входа

### Структура директорий:

```
vue-app/src/
├── pages/
│   └── UsersManagementPage.vue              # Расширение существующей страницы
├── components/
│   └── users/
│       ├── UserActivityList.vue              # Список активности
│       ├── UserActivityCard.vue              # Карточка активности
│       ├── UserActivityFilters.vue            # Фильтры
│       ├── UserActivityStats.vue             # Статистика
│       └── UserActivityTimeline.vue           # Временная шкала
├── services/
│   ├── user-activity-service.js             # Сервис работы с активностью
│   └── activity-logging-service.js          # Сервис логирования
└── composables/
    └── useActivityTracking.js                # Композабл отслеживания

api/
├── user-activity-log.php                    # Логирование активности
└── user-activity-get.php                    # Получение активности

logs/
└── user-activity/                           # Логи активности пользователей
    ├── 2025-12-24-10.json                   # Логи за час
    └── ...
```

---

## 📦 Зависимости

### От задач:

- TASK-072: Реализация модуля "Управление пользователями" (базовая функциональность)
- TASK-003: Реализация модуля "Логи вебхуков" (референс структуры логирования)

### От модулей:

- Модуль "Управление пользователями" (базовая страница)
- AccessControlService (получение информации о пользователе)
- Vue Router (отслеживание навигации)
- Bitrix24BxApi / Bitrix24ApiService (получение данных пользователя)

### От библиотек:

- Vue.js 3.x (Composition API)
- Vue Router (navigation guards)

---

## 🎯 Детальный план реализации

### Обзор этапов

Реализация разделена на **6 основных этапов**, каждый из которых содержит детальные подэтапы:

1. **Этап 1:** Настройка инфраструктуры логирования (Backend)
2. **Этап 2:** Создание сервисов логирования (Frontend)
3. **Этап 3:** Интеграция логирования в приложение
4. **Этап 4:** Создание API для получения активности (Backend)
5. **Этап 5:** Создание компонентов отображения (Frontend)
6. **Этап 6:** Интеграция в страницу управления пользователями

---

## 📝 Этап 1: Настройка инфраструктуры логирования (Backend)

**Цель:** Настроить backend-инфраструктуру для логирования активности пользователей.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Критический (блокирует все остальные этапы)

### Подэтап 1.1: Добавление категории в WebhookLogsConfig

**Файл:** `src/WebhookLogs/Config/WebhookLogsConfig.php`

**Задача:** Добавить категорию `user-activity` в список поддерживаемых категорий.

**Детальные шаги:**

1. **Открыть файл `src/WebhookLogs/Config/WebhookLogsConfig.php`**

2. **Найти метод `getCategories()` (строка ~81)**
   ```php
   public static function getCategories(): array
   {
       return ['tasks', 'smart-processes', 'errors'];
   }
   ```

3. **Добавить категорию `user-activity`:**
   ```php
   public static function getCategories(): array
   {
       return ['tasks', 'smart-processes', 'errors', 'user-activity'];
   }
   ```

4. **Проверить, что метод `getCategoryPath()` работает корректно:**
   - Путь должен быть: `logs/webhooks/user-activity/`
   - Метод уже реализован и работает автоматически

**Критерии приёмки:**
- [ ] Категория `user-activity` добавлена в `getCategories()`
- [ ] Метод `isValidCategory('user-activity')` возвращает `true`
- [ ] Путь `getCategoryPath('user-activity')` возвращает корректный путь
- [ ] Нет синтаксических ошибок PHP

**Тестирование:**
```php
// Тест в консоли PHP
use WebhookLogs\Config\WebhookLogsConfig;

var_dump(WebhookLogsConfig::getCategories()); // Должен содержать 'user-activity'
var_dump(WebhookLogsConfig::isValidCategory('user-activity')); // Должен быть true
var_dump(WebhookLogsConfig::getCategoryPath('user-activity')); // Должен вернуть путь
```

---

### Подэтап 1.2: Создание API endpoint для логирования активности

**Файл:** `api/user-activity-log.php` (новый файл)

**Задача:** Создать API endpoint для приёма и сохранения записей активности пользователей.

**Детальные шаги:**

1. **Создать файл `api/user-activity-log.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для логирования активности пользователей
    * 
    * Метод: POST
    * Путь: /api/user-activity-log.php
    * 
    * Принимает JSON с записью активности и сохраняет в logs/user-activity/YYYY-MM-DD-HH.json
    * 
    * Формат запроса:
    * {
    *   "timestamp": "2025-12-24T10:15:30+03:00",
    *   "type": "app_entry" | "page_visit",
    *   "user_id": 123,
    *   "user_name": "Иван Иванов",
    *   ...
    * }
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "message": "Activity logged"
    * }
    * 
    * Формат ответа (ошибка):
    * {
    *   "error": "Error message"
    * }
    */
   
   // Подключение необходимых файлов
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Repository/WebhookLogsRepository.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Config/WebhookLogsConfig.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Exception/WebhookLoggingException.php';
   
   use WebhookLogs\Repository\WebhookLogsRepository;
   use WebhookLogs\Config\WebhookLogsConfig;
   use WebhookLogs\Exception\WebhookLoggingException;
   
   // Установка заголовков
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
   $requiredFields = ['timestamp', 'type', 'user_id'];
   $missingFields = [];
   
   foreach ($requiredFields as $field) {
       if (!isset($input[$field])) {
           $missingFields[] = $field;
       }
   }
   
   if (!empty($missingFields)) {
       http_response_code(400);
       echo json_encode([
           'error' => 'Missing required fields',
           'missing_fields' => $missingFields
       ]);
       exit;
   }
   
   // Валидация типа активности
   $validTypes = ['app_entry', 'page_visit'];
   if (!in_array($input['type'], $validTypes, true)) {
       http_response_code(400);
       echo json_encode([
           'error' => 'Invalid activity type',
           'type' => $input['type'],
           'valid_types' => $validTypes
       ]);
       exit;
   }
   
   // Валидация user_id (должен быть числом)
   if (!is_numeric($input['user_id'])) {
       http_response_code(400);
       echo json_encode(['error' => 'Invalid user_id. Must be numeric.']);
       exit;
   }
   
   // Валидация timestamp (должен быть валидной датой ISO 8601)
   $timestamp = $input['timestamp'];
   $dateTime = \DateTime::createFromFormat(\DateTime::ISO8601, $timestamp);
   if ($dateTime === false) {
       // Попытка альтернативного формата
       $dateTime = \DateTime::createFromFormat('Y-m-d\TH:i:sP', $timestamp);
   }
   
   if ($dateTime === false) {
       http_response_code(400);
       echo json_encode([
           'error' => 'Invalid timestamp format',
           'timestamp' => $timestamp,
           'expected_format' => 'ISO 8601 (e.g., 2025-12-24T10:15:30+03:00)'
       ]);
       exit;
   }
   
   try {
       // Инициализация репозитория
       $repository = new WebhookLogsRepository();
       
       // Категория для активности пользователей
       $category = 'user-activity';
       
       // Проверка валидности категории
       if (!WebhookLogsConfig::isValidCategory($category)) {
           throw new \RuntimeException("Category '{$category}' is not registered in WebhookLogsConfig");
       }
       
       // Подготовка записи для сохранения
       $entry = [
           'timestamp' => $timestamp,
           'type' => $input['type'],
           'user_id' => (int)$input['user_id'],
           'user_name' => $input['user_name'] ?? null,
           'user_email' => $input['user_email'] ?? null,
           'ip' => $input['ip'] ?? $_SERVER['REMOTE_ADDR'] ?? null,
           'user_agent' => $input['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? null,
           'session_id' => $input['session_id'] ?? null
       ];
       
       // Дополнительные поля для page_visit
       if ($input['type'] === 'page_visit') {
           $entry['route_path'] = $input['route_path'] ?? null;
           $entry['route_name'] = $input['route_name'] ?? null;
           $entry['route_title'] = $input['route_title'] ?? null;
           $entry['from_path'] = $input['from_path'] ?? null;
           $entry['from_name'] = $input['from_name'] ?? null;
       }
       
       // Создание DateTime объекта для сохранения
       $logDateTime = WebhookLogsConfig::getDateTime($timestamp);
       
       // Сохранение записи
       $saved = $repository->save($category, $entry, $logDateTime);
       
       if ($saved) {
           http_response_code(200);
           echo json_encode([
               'success' => true,
               'message' => 'Activity logged successfully',
               'category' => $category,
               'timestamp' => $timestamp
           ]);
       } else {
           http_response_code(500);
           echo json_encode(['error' => 'Failed to save activity log']);
       }
   } catch (WebhookLoggingException $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Logging error',
           'message' => $e->getMessage(),
           'code' => $e->getCode()
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   ```

3. **Проверить права доступа к файлу:**
   ```bash
   chmod 644 api/user-activity-log.php
   ```

**Критерии приёмки:**
- [ ] Файл `api/user-activity-log.php` создан
- [ ] Endpoint принимает POST запросы
- [ ] Валидация всех обязательных полей работает
- [ ] Валидация типа активности работает
- [ ] Записи сохраняются в `logs/user-activity/YYYY-MM-DD-HH.json`
- [ ] Обработка ошибок реализована
- [ ] CORS заголовки настроены

**Тестирование:**
```bash
# Тест через curl
curl -X POST http://localhost/api/user-activity-log.php \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-12-24T10:15:30+03:00",
    "type": "app_entry",
    "user_id": 123,
    "user_name": "Иван Иванов",
    "user_email": "ivan@example.com",
    "session_id": "test-session-123"
  }'

# Ожидаемый ответ:
# {"success":true,"message":"Activity logged successfully","category":"user-activity","timestamp":"2025-12-24T10:15:30+03:00"}
```

---

### Подэтап 1.3: Проверка создания директории для логов

**Задача:** Убедиться, что директория `logs/user-activity/` создаётся автоматически.

**Детальные шаги:**

1. **Проверить, что `WebhookLogsRepository` автоматически создаёт директории:**
   - Метод `save()` использует `LogFileManager::ensureDirectory()`
   - Директория должна создаваться автоматически при первом сохранении

2. **Проверить права доступа:**
   ```bash
   # Проверить существование директории
   ls -la logs/webhooks/
   
   # Если директории нет, она создастся автоматически при первом сохранении
   ```

3. **Протестировать создание директории:**
   - Отправить тестовый запрос к `user-activity-log.php`
   - Проверить, что директория `logs/webhooks/user-activity/` создалась
   - Проверить права доступа (должны быть 755)

**Критерии приёмки:**
- [ ] Директория `logs/webhooks/user-activity/` создаётся автоматически
- [ ] Права доступа корректные (755 для директории, 644 для файлов)
- [ ] Файлы логов создаются в правильном формате (YYYY-MM-DD-HH.json)

---

## 📝 Этап 2: Создание сервисов логирования (Frontend)

**Цель:** Создать frontend-сервисы для логирования активности пользователей.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Критический

### Подэтап 2.1: Создание ActivityLoggingService

**Файл:** `vue-app/src/services/activity-logging-service.js` (новый файл)

**Задача:** Создать сервис для логирования активности пользователей на frontend.

**Детальные шаги:**

1. **Создать `activity-logging-service.js`**
   ```javascript
   /**
    * Сервис для логирования активности пользователей
    * 
    * Логирует:
    * - Первый вход пользователя в приложение
    * - Переходы по маршрутам (страницам)
    * 
    * Формат логов: logs/user-activity/YYYY-MM-DD-HH.json
    */
   export class ActivityLoggingService {
     /**
      * Логирование первого входа пользователя
      * 
      * @param {object} user - Объект пользователя из Bitrix24
      * @param {string} ip - IP адрес пользователя (опционально)
      */
     static async logAppEntry(user, ip = null) {
       const entry = {
         timestamp: new Date().toISOString(),
         type: 'app_entry',
         user_id: user.ID,
         user_name: `${user.NAME} ${user.LAST_NAME}`.trim(),
         user_email: user.EMAIL || null,
         ip: ip || null,
         user_agent: navigator.userAgent,
         session_id: this.getSessionId()
       };
       
       await this.saveLog(entry);
     }
     
     /**
      * Логирование перехода по маршруту
      * 
      * @param {object} route - Объект маршрута из Vue Router
      * @param {object} user - Объект пользователя из Bitrix24
      * @param {object} fromRoute - Предыдущий маршрут (опционально)
      */
     static async logPageVisit(route, user, fromRoute = null) {
       const entry = {
         timestamp: new Date().toISOString(),
         type: 'page_visit',
         user_id: user.ID,
         user_name: `${user.NAME} ${user.LAST_NAME}`.trim(),
         route_path: route.path,
         route_name: route.name || null,
         route_title: route.meta?.title || null,
         from_path: fromRoute?.path || null,
         from_name: fromRoute?.name || null,
         session_id: this.getSessionId()
       };
       
       await this.saveLog(entry);
     }
     
     /**
      * Сохранение записи в лог-файл
      * 
      * @param {object} entry - Запись для логирования
      */
     static async saveLog(entry) {
       try {
         // Отправка на backend API для сохранения
         const response = await fetch('/api/user-activity-log.php', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify(entry)
         });
         
         if (!response.ok) {
           console.error('[ActivityLoggingService] Failed to save log:', response.statusText);
         }
       } catch (error) {
         console.error('[ActivityLoggingService] Error saving log:', error);
         // Не прерываем работу приложения при ошибке логирования
       }
     }
     
     /**
      * Получение ID сессии
      * 
      * @returns {string} ID сессии
      */
     static getSessionId() {
       if (!sessionStorage.getItem('activity_session_id')) {
         sessionStorage.setItem('activity_session_id', this.generateSessionId());
       }
       return sessionStorage.getItem('activity_session_id');
     }
     
     /**
      * Генерация уникального ID сессии
      * 
      * @returns {string} Уникальный ID сессии
      */
     static generateSessionId() {
       return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
     }
   }
   ```

2. **Создать backend API endpoint `api/user-activity-log.php`**
   ```php
   <?php
   /**
    * API endpoint для логирования активности пользователей
    * 
    * Сохраняет записи активности в logs/user-activity/YYYY-MM-DD-HH.json
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Repository/WebhookLogsRepository.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Config/WebhookLogsConfig.php';
   
   use WebhookLogs\Repository\WebhookLogsRepository;
   use WebhookLogs\Config\WebhookLogsConfig;
   
   header('Content-Type: application/json');
   
   // Проверка метода запроса
   if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
       http_response_code(405);
       echo json_encode(['error' => 'Method not allowed']);
       exit;
   }
   
   // Получение данных из запроса
   $input = json_decode(file_get_contents('php://input'), true);
   
   if (!$input) {
       http_response_code(400);
       echo json_encode(['error' => 'Invalid JSON']);
       exit;
   }
   
   // Валидация обязательных полей
   $requiredFields = ['timestamp', 'type', 'user_id'];
   foreach ($requiredFields as $field) {
       if (!isset($input[$field])) {
           http_response_code(400);
           echo json_encode(['error' => "Missing required field: {$field}"]);
           exit;
       }
   }
   
   try {
       // Используем существующую структуру логирования вебхуков
       // Адаптируем для активности пользователей
       $repository = new WebhookLogsRepository();
       
       // Категория для активности пользователей
       $category = 'user-activity';
       
       // Сохранение записи
       $saved = $repository->save($category, $input);
       
       if ($saved) {
           http_response_code(200);
           echo json_encode(['success' => true, 'message' => 'Activity logged']);
       } else {
           http_response_code(500);
           echo json_encode(['error' => 'Failed to save activity log']);
       }
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode(['error' => $e->getMessage()]);
   }
   ```

**Критерии приёмки:**
- [ ] Сервис `ActivityLoggingService` создан
- [ ] Метод `logAppEntry()` логирует первый вход
- [ ] Метод `logPageVisit()` логирует переходы по страницам
- [ ] Backend API endpoint `user-activity-log.php` сохраняет логи
- [ ] Логи сохраняются в `logs/user-activity/YYYY-MM-DD-HH.json`
- [ ] Обработка ошибок реализована (не прерывает работу приложения)

---

## 📝 Этап 2: Создание сервисов логирования (Frontend)

**Цель:** Создать frontend-сервисы для логирования активности пользователей.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Критический

### Подэтап 2.1: Создание ActivityLoggingService

**Файл:** `vue-app/src/services/activity-logging-service.js` (новый файл)

**Задача:** Создать сервис для логирования активности пользователей на frontend.

**Детальные шаги:**

1. **Создать файл `vue-app/src/services/activity-logging-service.js`**

2. **Реализовать полный код сервиса:**
   ```javascript
   /**
    * Сервис для логирования активности пользователей
    * 
    * Логирует:
    * - Первый вход пользователя в приложение (app_entry)
    * - Переходы по маршрутам (page_visit)
    * 
    * Формат логов: logs/user-activity/YYYY-MM-DD-HH.json
    * 
    * Использует backend API: /api/user-activity-log.php
    */
   
   export class ActivityLoggingService {
     /**
      * Базовый URL для API запросов
      */
     static getApiUrl() {
       // Определяем базовый URL относительно текущего домена
       const baseUrl = window.location.origin;
       const path = window.location.pathname;
       // Убираем /index.php или другие файлы из пути
       const apiPath = path.replace(/\/[^\/]*\.php$/, '') + '/api';
       return `${baseUrl}${apiPath}`;
     }
     
     /**
      * Логирование первого входа пользователя
      * 
      * @param {object} user - Объект пользователя из Bitrix24
      * @param {string} ip - IP адрес пользователя (опционально)
      * @returns {Promise<boolean>} true если успешно
      */
     static async logAppEntry(user, ip = null) {
       if (!user || !user.ID) {
         console.warn('[ActivityLoggingService] Invalid user object for app entry logging');
         return false;
       }
       
       const entry = {
         timestamp: new Date().toISOString(),
         type: 'app_entry',
         user_id: user.ID,
         user_name: this.getUserName(user),
         user_email: user.EMAIL || null,
         ip: ip || this.getClientIp(),
         user_agent: navigator.userAgent,
         session_id: this.getSessionId()
       };
       
       return await this.saveLog(entry);
     }
     
     /**
      * Логирование перехода по маршруту
      * 
      * @param {object} route - Объект маршрута из Vue Router
      * @param {object} user - Объект пользователя из Bitrix24
      * @param {object} fromRoute - Предыдущий маршрут (опционально)
      * @returns {Promise<boolean>} true если успешно
      */
     static async logPageVisit(route, user, fromRoute = null) {
       if (!user || !user.ID) {
         console.warn('[ActivityLoggingService] Invalid user object for page visit logging');
         return false;
       }
       
       if (!route || !route.path) {
         console.warn('[ActivityLoggingService] Invalid route object for page visit logging');
         return false;
       }
       
       const entry = {
         timestamp: new Date().toISOString(),
         type: 'page_visit',
         user_id: user.ID,
         user_name: this.getUserName(user),
         route_path: route.path,
         route_name: route.name || null,
         route_title: route.meta?.title || null,
         from_path: fromRoute?.path || null,
         from_name: fromRoute?.name || null,
         session_id: this.getSessionId()
       };
       
       return await this.saveLog(entry);
     }
     
     /**
      * Сохранение записи в лог-файл через backend API
      * 
      * @param {object} entry - Запись для логирования
      * @returns {Promise<boolean>} true если успешно
      */
     static async saveLog(entry) {
       try {
         const apiUrl = `${this.getApiUrl()}/user-activity-log.php`;
         
         const response = await fetch(apiUrl, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'X-Requested-With': 'XMLHttpRequest'
           },
           body: JSON.stringify(entry),
           // Не ждём долго ответа, чтобы не блокировать UI
           signal: AbortSignal.timeout(5000) // 5 секунд таймаут
         });
         
         if (!response.ok) {
           const errorText = await response.text();
           console.error('[ActivityLoggingService] Failed to save log:', {
             status: response.status,
             statusText: response.statusText,
             error: errorText
           });
           return false;
         }
         
         const result = await response.json();
         
         if (result.success) {
           return true;
         } else {
           console.error('[ActivityLoggingService] API returned error:', result.error);
           return false;
         }
       } catch (error) {
         // Не прерываем работу приложения при ошибке логирования
         if (error.name === 'AbortError') {
           console.warn('[ActivityLoggingService] Request timeout (activity logging skipped)');
         } else {
           console.error('[ActivityLoggingService] Error saving log:', error);
         }
         return false;
       }
     }
     
     /**
      * Получение ID сессии
      * 
      * @returns {string} ID сессии
      */
     static getSessionId() {
       const storageKey = 'activity_session_id';
       
       // Проверяем sessionStorage
       if (sessionStorage.getItem(storageKey)) {
         return sessionStorage.getItem(storageKey);
       }
       
       // Генерируем новый ID сессии
       const sessionId = this.generateSessionId();
       sessionStorage.setItem(storageKey, sessionId);
       
       return sessionId;
     }
     
     /**
      * Генерация уникального ID сессии
      * 
      * @returns {string} Уникальный ID сессии
      */
     static generateSessionId() {
       const timestamp = Date.now();
       const random = Math.random().toString(36).substring(2, 11);
       return `${timestamp}-${random}`;
     }
     
     /**
      * Получение имени пользователя из объекта пользователя
      * 
      * @param {object} user - Объект пользователя
      * @returns {string} Имя пользователя
      */
     static getUserName(user) {
       const name = user.NAME || '';
       const lastName = user.LAST_NAME || '';
       const fullName = `${name} ${lastName}`.trim();
       
       return fullName || user.EMAIL || `User #${user.ID}`;
     }
     
     /**
      * Получение IP адреса клиента (если доступно)
      * 
      * @returns {string|null} IP адрес или null
      */
     static getClientIp() {
       // IP адрес определяется на backend, но можем попытаться получить из заголовков
       // В реальности IP будет определяться на сервере
       return null;
     }
     
     /**
      * Проверка, был ли уже залогирован вход в приложение в этой сессии
      * 
      * @returns {boolean} true если вход уже залогирован
      */
     static isAppEntryLogged() {
       return sessionStorage.getItem('app_entry_logged') === 'true';
     }
     
     /**
      * Отметить, что вход в приложение был залогирован
      */
     static markAppEntryLogged() {
       sessionStorage.setItem('app_entry_logged', 'true');
     }
   }
   ```

**Критерии приёмки:**
- [ ] Файл `activity-logging-service.js` создан
- [ ] Метод `logAppEntry()` реализован
- [ ] Метод `logPageVisit()` реализован
- [ ] Метод `saveLog()` отправляет данные на backend
- [ ] Обработка ошибок реализована (не прерывает работу приложения)
- [ ] Генерация session_id работает
- [ ] Проверка `isAppEntryLogged()` работает

**Тестирование:**
```javascript
// В консоли браузера
import { ActivityLoggingService } from '@/services/activity-logging-service.js';

// Тест логирования входа
const user = { ID: 123, NAME: 'Иван', LAST_NAME: 'Иванов', EMAIL: 'ivan@example.com' };
await ActivityLoggingService.logAppEntry(user);

// Тест логирования перехода
const route = { path: '/dashboard', name: 'dashboard', meta: { title: 'Dashboard' } };
await ActivityLoggingService.logPageVisit(route, user);
```

---

## 📝 Этап 3: Интеграция логирования в приложение

**Цель:** Интегрировать логирование активности в существующие компоненты приложения.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 3.1: Добавление логирования первого входа в IndexPage.vue

**Файл:** `vue-app/src/components/IndexPage.vue`

**Задача:** Добавить логирование первого входа пользователя при загрузке главной страницы.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/components/IndexPage.vue`**

2. **Найти секцию импортов и добавить:**
   ```javascript
   import { ActivityLoggingService } from '@/services/activity-logging-service.js';
   import { AccessControlService } from '@/services/access-control-service.js';
   ```

3. **Найти метод `onMounted()` или `setup()` и добавить логику:**
   ```javascript
   // В onMounted() после успешной проверки доступа
   onMounted(async () => {
     // ... существующий код проверки доступа ...
     
     // Логирование первого входа (только один раз за сессию)
     if (accessResult.allowed && !ActivityLoggingService.isAppEntryLogged()) {
       try {
         const currentUser = await AccessControlService.getCurrentUser();
         if (currentUser) {
           const logged = await ActivityLoggingService.logAppEntry(currentUser);
           if (logged) {
             ActivityLoggingService.markAppEntryLogged();
           }
         }
       } catch (error) {
         // Не прерываем работу приложения при ошибке логирования
         console.error('[IndexPage] Error logging app entry:', error);
       }
     }
   });
   ```

**Критерии приёмки:**
- [ ] Импорт `ActivityLoggingService` добавлен
- [ ] Логирование первого входа работает в `onMounted()`
- [ ] Логирование выполняется только один раз за сессию
- [ ] Ошибки логирования не прерывают работу приложения
- [ ] Запись создаётся в логах при открытии приложения

---

### Подэтап 3.2: Добавление логирования навигации в router/index.js

**Файл:** `vue-app/src/router/index.js`

**Задача:** Добавить логирование всех переходов по маршрутам в navigation guard.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/router/index.js`**

2. **Добавить импорты в начало файла:**
   ```javascript
   import { ActivityLoggingService } from '@/services/activity-logging-service.js';
   import { AccessControlService } from '@/services/access-control-service.js';
   ```

3. **Найти `router.beforeEach()` и добавить логику логирования:**
   ```javascript
   router.beforeEach(async (to, from, next) => {
     // ... существующий код проверки доступа ...
     
     // Логирование перехода по маршруту
     // Логируем только для авторизованных пользователей и если это не первый рендер
     if ((to.meta.requiresAuth || to.meta.adminOnly) && from.name !== null) {
       try {
         // Проверяем, что пользователь авторизован
         const accessResult = await AccessControlService.checkAccess();
         
         if (accessResult.allowed) {
           const currentUser = await AccessControlService.getCurrentUser();
           
           if (currentUser && to.path !== from.path) {
             // Логируем переход асинхронно, не блокируя навигацию
             ActivityLoggingService.logPageVisit(to, currentUser, from)
               .catch(error => {
                 // Ошибка логирования не должна прерывать навигацию
                 console.error('[Router] Error logging page visit:', error);
               });
           }
         }
       } catch (error) {
         // Ошибка логирования не должна прерывать навигацию
         console.error('[Router] Error in activity logging:', error);
       }
     }
     
     // Разрешаем переход (не ждём завершения логирования)
     next();
   });
   ```

**Важные моменты:**
- Логирование выполняется асинхронно и не блокирует навигацию
- Логируем только для авторизованных пользователей
- Не логируем первый рендер (`from.name === null`)
- Не логируем переход на тот же путь (`to.path === from.path`)

**Критерии приёмки:**
- [ ] Импорты добавлены
- [ ] Логирование навигации работает в `router.beforeEach()`
- [ ] Логирование не блокирует навигацию
- [ ] Переходы логируются корректно
- [ ] Первый рендер не логируется
- [ ] Записи создаются в логах при переходах

---

## 📝 Этап 4: Создание API для получения активности (Backend)

**Цель:** Создать backend API для получения данных об активности пользователей.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Высокий

### Подэтап 4.1: Создание API endpoint для получения активности

**Файл:** `api/user-activity-get.php` (новый файл)

**Задача:** Создать API endpoint для получения записей активности с фильтрацией.

**Детальные шаги:**

1. **Создать файл `api/user-activity-get.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для получения активности пользователей
    * 
    * Метод: GET
    * Путь: /api/user-activity-get.php
    * 
    * Параметры запроса:
    * - user_id (опционально) - ID пользователя для фильтрации
    * - date_from (опционально) - Дата начала (YYYY-MM-DD), по умолчанию -7 дней
    * - date_to (опционально) - Дата окончания (YYYY-MM-DD), по умолчанию сегодня
    * - type (опционально) - Тип активности (app_entry, page_visit)
    * - limit (опционально) - Лимит записей (по умолчанию 1000, максимум 10000)
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "data": [...],
    *   "count": 123,
    *   "filters": {...}
    * }
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Repository/WebhookLogsRepository.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Config/WebhookLogsConfig.php';
   
   use WebhookLogs\Repository\WebhookLogsRepository;
   use WebhookLogs\Config\WebhookLogsConfig;
   
   header('Content-Type: application/json; charset=utf-8');
   header('Access-Control-Allow-Origin: *');
   
   // Получение параметров запроса
   $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
   $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : null;
   $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : null;
   $type = isset($_GET['type']) ? $_GET['type'] : null;
   $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 1000;
   
   // Валидация limit
   $limit = max(1, min($limit, 10000));
   
   // Валидация типа
   if ($type !== null && !in_array($type, ['app_entry', 'page_visit'], true)) {
       http_response_code(400);
       echo json_encode([
           'error' => 'Invalid activity type',
           'type' => $type,
           'valid_types' => ['app_entry', 'page_visit']
       ]);
       exit;
   }
   
   try {
       $repository = new WebhookLogsRepository();
       $category = 'user-activity';
       
       // Определение диапазона дат
       $endDate = new \DateTime();
       $endDate->setTime(23, 59, 59);
       
       if ($dateTo) {
           $endDate = \DateTime::createFromFormat('Y-m-d', $dateTo);
           if ($endDate === false) {
               throw new \InvalidArgumentException("Invalid date_to format. Expected YYYY-MM-DD");
           }
           $endDate->setTime(23, 59, 59);
       }
       
       if ($dateFrom) {
           $startDate = \DateTime::createFromFormat('Y-m-d', $dateFrom);
           if ($startDate === false) {
               throw new \InvalidArgumentException("Invalid date_from format. Expected YYYY-MM-DD");
           }
           $startDate->setTime(0, 0, 0);
       } else {
           // По умолчанию - последние 7 дней
           $startDate = clone $endDate;
           $startDate->modify('-7 days');
           $startDate->setTime(0, 0, 0);
       }
       
       // Проверка, что startDate <= endDate
       if ($startDate > $endDate) {
           http_response_code(400);
           echo json_encode(['error' => 'date_from must be less than or equal to date_to']);
           exit;
       }
       
       // Сбор всех записей за период
       $activity = [];
       $currentDate = clone $startDate;
       
       while ($currentDate <= $endDate) {
           $dateStr = $currentDate->format('Y-m-d');
           
           // Чтение логов за все часы дня
           for ($hour = 0; $hour < 24; $hour++) {
               try {
                   $hourActivity = $repository->read($category, $dateStr, $hour);
                   $activity = array_merge($activity, $hourActivity);
               } catch (\Exception $e) {
                   // Пропускаем отсутствующие файлы
                   continue;
               }
           }
           
           $currentDate->modify('+1 day');
       }
       
       // Фильтрация по пользователю
       if ($userId !== null) {
           $activity = array_filter($activity, function($entry) use ($userId) {
               return isset($entry['user_id']) && (int)$entry['user_id'] === $userId;
           });
       }
       
       // Фильтрация по типу
       if ($type !== null) {
           $activity = array_filter($activity, function($entry) use ($type) {
               return isset($entry['type']) && $entry['type'] === $type;
           });
       }
       
       // Сортировка по времени (новые первыми)
       usort($activity, function($a, $b) {
           $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
           $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
           return $timeB - $timeA;
       });
       
       // Применение лимита
       $activity = array_slice($activity, 0, $limit);
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'data' => array_values($activity),
           'count' => count($activity),
           'filters' => [
               'user_id' => $userId,
               'date_from' => $startDate->format('Y-m-d'),
               'date_to' => $endDate->format('Y-m-d'),
               'type' => $type,
               'limit' => $limit
           ]
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   ```

**Критерии приёмки:**
- [ ] Файл `user-activity-get.php` создан
- [ ] Endpoint принимает GET запросы
- [ ] Фильтрация по пользователю работает
- [ ] Фильтрация по дате работает
- [ ] Фильтрация по типу работает
- [ ] Лимит записей работает
- [ ] Сортировка по времени работает
- [ ] Обработка ошибок реализована

**Тестирование:**
```bash
# Тест получения активности
curl "http://localhost/api/user-activity-get.php?date_from=2025-12-20&date_to=2025-12-24"

# Тест с фильтрами
curl "http://localhost/api/user-activity-get.php?user_id=123&type=page_visit&limit=100"
```

---

## 📝 Этап 5: Создание компонентов отображения (Frontend)

**Цель:** Создать Vue.js компоненты для отображения активности пользователей.

**Время выполнения:** ~6-8 часов  
**Приоритет:** Высокий

### Подэтап 5.1: Создание UserActivityService

**Файл:** `vue-app/src/services/user-activity-service.js` (новый файл)

**Задача:** Создать сервис для получения и обработки данных об активности.

**Детальные шаги:**

1. **Создать файл `vue-app/src/services/user-activity-service.js`**

2. **Реализовать полный код сервиса:**
   ```javascript
   /**
    * Сервис для работы с активностью пользователей
    * 
    * Использует backend API для получения данных об активности
    * API endpoint: /api/user-activity-get.php
    */
   
   export class UserActivityService {
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
      * Получение активности пользователя
      * 
      * @param {object} options - Опции запроса
      * @param {number} options.userId - ID пользователя (опционально)
      * @param {string} options.dateFrom - Дата начала (YYYY-MM-DD)
      * @param {string} options.dateTo - Дата окончания (YYYY-MM-DD)
      * @param {string} options.type - Тип активности (app_entry, page_visit)
      * @param {number} options.limit - Лимит записей (по умолчанию 1000)
      * @returns {Promise<Array>} Массив записей активности
      */
     static async getActivity(options = {}) {
       const {
         userId = null,
         dateFrom = null,
         dateTo = null,
         type = null,
         limit = 1000
       } = options;
       
       const params = new URLSearchParams();
       if (userId) params.append('user_id', userId);
       if (dateFrom) params.append('date_from', dateFrom);
       if (dateTo) params.append('date_to', dateTo);
       if (type) params.append('type', type);
       if (limit) params.append('limit', limit);
       
       try {
         const apiUrl = `${this.getApiUrl()}/user-activity-get.php`;
         const response = await fetch(`${apiUrl}?${params.toString()}`);
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.success) {
           return result.data || [];
         } else {
           throw new Error(result.error || 'Failed to get activity');
         }
       } catch (error) {
         console.error('[UserActivityService] Error getting activity:', error);
         throw error;
       }
     }
     
     /**
      * Получение статистики активности
      * 
      * @param {object} options - Опции запроса
      * @returns {Promise<object>} Статистика активности
      */
     static async getActivityStats(options = {}) {
       const activity = await this.getActivity(options);
       
       const stats = {
         total_entries: activity.length,
         total_app_entries: 0,
         total_page_visits: 0,
         unique_users: new Set(),
         pages_visited: {},
         activity_by_date: {},
         activity_by_hour: {}
       };
       
       activity.forEach(entry => {
         if (entry.type === 'app_entry') {
           stats.total_app_entries++;
           stats.unique_users.add(entry.user_id);
         } else if (entry.type === 'page_visit') {
           stats.total_page_visits++;
           
           // Подсчёт посещений страниц
           const page = entry.route_title || entry.route_path || entry.route_name || 'unknown';
           stats.pages_visited[page] = (stats.pages_visited[page] || 0) + 1;
         }
         
         // Группировка по дате
         if (entry.timestamp) {
           const date = new Date(entry.timestamp).toISOString().split('T')[0];
           stats.activity_by_date[date] = (stats.activity_by_date[date] || 0) + 1;
           
           // Группировка по часу
           const hour = new Date(entry.timestamp).getHours();
           stats.activity_by_hour[hour] = (stats.activity_by_hour[hour] || 0) + 1;
         }
       });
       
       stats.unique_users_count = stats.unique_users.size;
       stats.unique_users = Array.from(stats.unique_users);
       
       return stats;
     }
     
     /**
      * Получение активности конкретного пользователя
      * 
      * @param {number} userId - ID пользователя
      * @param {object} options - Дополнительные опции
      * @returns {Promise<Array>} Массив записей активности пользователя
      */
     static async getUserActivity(userId, options = {}) {
       return await this.getActivity({
         ...options,
         userId: userId
       });
     }
   }
   ```

**Критерии приёмки:**
- [ ] Файл `user-activity-service.js` создан
- [ ] Метод `getActivity()` возвращает данные
- [ ] Метод `getActivityStats()` возвращает статистику
- [ ] Метод `getUserActivity()` возвращает активность пользователя
- [ ] Обработка ошибок реализована

---

### Подэтап 5.2-5.5: Создание компонентов отображения

**Компоненты для создания:**
- `UserActivityList.vue` — список активности
- `UserActivityCard.vue` — карточка записи
- `UserActivityFilters.vue` — фильтры
- `UserActivityStats.vue` — статистика

**Детальные инструкции по каждому компоненту находятся в оригинальном документе (строки 630-970).**

**Критерии приёмки для всех компонентов:**
- [ ] Все компоненты созданы
- [ ] Компоненты используют `UserActivityService`
- [ ] Обработка состояний (loading, error, empty) реализована
- [ ] Стилизация соответствует гайдлайнам Bitrix24
- [ ] Компоненты переиспользуемы и изолированы

---

## 📝 Этап 6: Интеграция в страницу управления пользователями

**Цель:** Добавить раздел "Активность пользователей" на страницу управления пользователями.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 6.1: Расширение UsersManagementPage.vue

**Файл:** `vue-app/src/pages/UsersManagementPage.vue`

**Задача:** Добавить раздел "Активность пользователей" на страницу.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/pages/UsersManagementPage.vue`**

2. **Добавить импорты компонентов:**
   ```javascript
   import UserActivityList from '@/components/users/UserActivityList.vue';
   import UserActivityFilters from '@/components/users/UserActivityFilters.vue';
   import UserActivityStats from '@/components/users/UserActivityStats.vue';
   ```

3. **Добавить состояние для фильтров:**
   ```javascript
   const activityFilters = ref({
     userId: null,
     type: null,
     dateFrom: null,
     dateTo: null
   });
   ```

4. **Добавить секцию в template:**
   ```vue
   <div class="activity-section">
     <h2>📊 Активность пользователей</h2>
     
     <UserActivityFilters
       :filters="activityFilters"
       :users="users"
       @update-filters="handleFiltersUpdate"
     />
     
     <UserActivityStats :filters="activityFilters" />
     
     <UserActivityList
       :userId="activityFilters.userId"
       :dateFrom="activityFilters.dateFrom"
       :dateTo="activityFilters.dateTo"
       :type="activityFilters.type"
       @view-details="handleViewActivityDetails"
     />
   </div>
   ```

5. **Добавить методы обработки:**
   ```javascript
   const handleFiltersUpdate = (newFilters) => {
     activityFilters.value = { ...newFilters };
   };
   
   const handleViewActivityDetails = (entry) => {
     // Логика просмотра деталей активности
     console.log('View activity details:', entry);
   };
   ```

**Критерии приёмки:**
- [ ] Раздел "Активность пользователей" добавлен
- [ ] Фильтры активности работают
- [ ] Статистика отображается
- [ ] Список активности отображается
- [ ] Интеграция с существующим функционалом работает

---

## ✅ Итоговые критерии приёмки

### Функциональность:
- [ ] Логирование первого входа работает
- [ ] Логирование переходов по страницам работает
- [ ] Логи сохраняются в `logs/user-activity/`
- [ ] Раздел "Активность пользователей" отображается
- [ ] Фильтры активности работают
- [ ] Статистика активности отображается
- [ ] Список активности отображается корректно

### Безопасность:
- [ ] Доступ только для администраторов
- [ ] Логирование не прерывает работу приложения
- [ ] Валидация данных на backend

### UX:
- [ ] Индикация загрузки данных
- [ ] Обработка ошибок с понятными сообщениями
- [ ] Адаптивность для мобильных устройств
- [ ] Соответствие гайдлайнам Bitrix24

### Производительность:
- [ ] Загрузка данных не превышает 3 секунд
- [ ] Кеширование данных работает
- [ ] Оптимизация запросов к API
   ```javascript
   // В onMounted() после успешной проверки доступа
   import { ActivityLoggingService } from '@/services/activity-logging-service.js';
   import { AccessControlService } from '@/services/access-control-service.js';
   
   onMounted(async () => {
     // ... существующий код проверки доступа ...
     
     // Логирование первого входа (только один раз за сессию)
     if (accessResult.allowed && !sessionStorage.getItem('app_entry_logged')) {
       try {
         const currentUser = await AccessControlService.getCurrentUser();
         if (currentUser) {
           await ActivityLoggingService.logAppEntry(currentUser);
           sessionStorage.setItem('app_entry_logged', 'true');
         }
       } catch (error) {
         console.error('[IndexPage] Error logging app entry:', error);
       }
     }
   });
   ```

2. **Добавить логирование навигации в `router/index.js`**
   ```javascript
   import { ActivityLoggingService } from '@/services/activity-logging-service.js';
   import { AccessControlService } from '@/services/access-control-service.js';
   
   router.beforeEach(async (to, from, next) => {
     // ... существующий код проверки доступа ...
     
     // Логирование перехода по маршруту (только для авторизованных пользователей)
     if (to.meta.requiresAuth || to.meta.adminOnly) {
       try {
         const currentUser = await AccessControlService.getCurrentUser();
         if (currentUser && to.path !== from.path) {
           // Логируем только если это не первый рендер (from.name !== null)
           if (from.name !== null) {
             await ActivityLoggingService.logPageVisit(to, currentUser, from);
           }
         }
       } catch (error) {
         console.error('[Router] Error logging page visit:', error);
         // Не прерываем навигацию при ошибке логирования
       }
     }
     
     // Разрешаем переход
     next();
   });
   ```

**Критерии приёмки:**
- [ ] Логирование первого входа работает в `IndexPage.vue`
- [ ] Логирование навигации работает в `router/index.js`
- [ ] Логирование не прерывает работу приложения при ошибках
- [ ] Первый вход логируется только один раз за сессию
- [ ] Переходы по страницам логируются корректно

---

### Этап 3: Создание сервиса для получения активности

**Цель:** Создать сервис для получения и обработки данных об активности пользователей.

**Шаги:**

1. **Создать `user-activity-service.js`**
   ```javascript
   /**
    * Сервис для работы с активностью пользователей
    * 
    * Использует backend API для получения данных об активности
    */
   export class UserActivityService {
     /**
      * Получение активности пользователя
      * 
      * @param {object} options - Опции запроса
      * @param {number} options.userId - ID пользователя (опционально)
      * @param {string} options.dateFrom - Дата начала (YYYY-MM-DD)
      * @param {string} options.dateTo - Дата окончания (YYYY-MM-DD)
      * @param {string} options.type - Тип активности (app_entry, page_visit)
      * @returns {Promise<Array>} Массив записей активности
      */
     static async getActivity(options = {}) {
       const {
         userId = null,
         dateFrom = null,
         dateTo = null,
         type = null
       } = options;
       
       const params = new URLSearchParams();
       if (userId) params.append('user_id', userId);
       if (dateFrom) params.append('date_from', dateFrom);
       if (dateTo) params.append('date_to', dateTo);
       if (type) params.append('type', type);
       
       try {
         const response = await fetch(`/api/user-activity-get.php?${params.toString()}`);
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         return result.data || [];
       } catch (error) {
         console.error('[UserActivityService] Error getting activity:', error);
         throw error;
       }
     }
     
     /**
      * Получение статистики активности
      * 
      * @param {object} options - Опции запроса
      * @returns {Promise<object>} Статистика активности
      */
     static async getActivityStats(options = {}) {
       const activity = await this.getActivity(options);
       
       const stats = {
         total_entries: 0,
         total_page_visits: 0,
         unique_users: new Set(),
         pages_visited: {},
         activity_by_date: {},
         activity_by_hour: {}
       };
       
       activity.forEach(entry => {
         stats.total_entries++;
         
         if (entry.type === 'app_entry') {
           stats.unique_users.add(entry.user_id);
         } else if (entry.type === 'page_visit') {
           stats.total_page_visits++;
           
           // Подсчёт посещений страниц
           const page = entry.route_path || entry.route_name || 'unknown';
           stats.pages_visited[page] = (stats.pages_visited[page] || 0) + 1;
         }
         
         // Группировка по дате
         const date = new Date(entry.timestamp).toISOString().split('T')[0];
         stats.activity_by_date[date] = (stats.activity_by_date[date] || 0) + 1;
         
         // Группировка по часу
         const hour = new Date(entry.timestamp).getHours();
         stats.activity_by_hour[hour] = (stats.activity_by_hour[hour] || 0) + 1;
       });
       
       stats.unique_users_count = stats.unique_users.size;
       stats.unique_users = Array.from(stats.unique_users);
       
       return stats;
     }
     
     /**
      * Получение активности конкретного пользователя
      * 
      * @param {number} userId - ID пользователя
      * @param {object} options - Дополнительные опции
      * @returns {Promise<Array>} Массив записей активности пользователя
      */
     static async getUserActivity(userId, options = {}) {
       return await this.getActivity({
         ...options,
         userId: userId
       });
     }
   }
   ```

2. **Создать backend API endpoint `api/user-activity-get.php`**
   ```php
   <?php
   /**
    * API endpoint для получения активности пользователей
    * 
    * Читает логи из logs/user-activity/YYYY-MM-DD-HH.json
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/src/WebhookLogs/Repository/WebhookLogsRepository.php';
   
   use WebhookLogs\Repository\WebhookLogsRepository;
   
   header('Content-Type: application/json');
   
   // Получение параметров запроса
   $userId = isset($_GET['user_id']) ? (int)$_GET['user_id'] : null;
   $dateFrom = isset($_GET['date_from']) ? $_GET['date_from'] : null;
   $dateTo = isset($_GET['date_to']) ? $_GET['date_to'] : null;
   $type = isset($_GET['type']) ? $_GET['type'] : null;
   
   try {
       $repository = new WebhookLogsRepository();
       $category = 'user-activity';
       
       // Определение диапазона дат
       if ($dateFrom && $dateTo) {
           $startDate = new \DateTime($dateFrom);
           $endDate = new \DateTime($dateTo);
           $endDate->modify('+1 day'); // Включаем последний день
           
           $activity = [];
           $currentDate = clone $startDate;
           
           while ($currentDate < $endDate) {
               $dateStr = $currentDate->format('Y-m-d');
               
               // Чтение логов за все часы дня
               for ($hour = 0; $hour < 24; $hour++) {
                   try {
                       $hourActivity = $repository->read($category, $dateStr, $hour);
                       $activity = array_merge($activity, $hourActivity);
                   } catch (\Exception $e) {
                       // Пропускаем отсутствующие файлы
                       continue;
                   }
               }
               
               $currentDate->modify('+1 day');
           }
       } else {
           // По умолчанию - последние 7 дней
           $endDate = new \DateTime();
           $startDate = clone $endDate;
           $startDate->modify('-7 days');
           
           $activity = [];
           $currentDate = clone $startDate;
           
           while ($currentDate <= $endDate) {
               $dateStr = $currentDate->format('Y-m-d');
               
               for ($hour = 0; $hour < 24; $hour++) {
                   try {
                       $hourActivity = $repository->read($category, $dateStr, $hour);
                       $activity = array_merge($activity, $hourActivity);
                   } catch (\Exception $e) {
                       continue;
                   }
               }
               
               $currentDate->modify('+1 day');
           }
       }
       
       // Фильтрация по пользователю
       if ($userId !== null) {
           $activity = array_filter($activity, function($entry) use ($userId) {
               return isset($entry['user_id']) && $entry['user_id'] == $userId;
           });
       }
       
       // Фильтрация по типу
       if ($type !== null) {
           $activity = array_filter($activity, function($entry) use ($type) {
               return isset($entry['type']) && $entry['type'] === $type;
           });
       }
       
       // Сортировка по времени (новые первыми)
       usort($activity, function($a, $b) {
           $timeA = isset($a['timestamp']) ? strtotime($a['timestamp']) : 0;
           $timeB = isset($b['timestamp']) ? strtotime($b['timestamp']) : 0;
           return $timeB - $timeA;
       });
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'data' => array_values($activity),
           'count' => count($activity)
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => $e->getMessage()
       ]);
   }
   ```

**Критерии приёмки:**
- [ ] Сервис `UserActivityService` создан
- [ ] Метод `getActivity()` возвращает данные об активности
- [ ] Метод `getActivityStats()` возвращает статистику
- [ ] Метод `getUserActivity()` возвращает активность пользователя
- [ ] Backend API endpoint `user-activity-get.php` работает
- [ ] Фильтрация по пользователю, дате и типу работает

---

### Этап 4: Создание компонентов для отображения активности

**Цель:** Создать Vue.js компоненты для отображения активности пользователей.

**Шаги:**

1. **Создать `UserActivityList.vue`**
   ```vue
   <template>
     <div class="user-activity-list">
       <div v-if="loading" class="loading">
         Загрузка активности...
       </div>
       
       <div v-else-if="error" class="error">
         {{ error }}
       </div>
       
       <div v-else-if="activity.length === 0" class="empty">
         Активность не найдена
       </div>
       
       <div v-else class="activity-items">
         <UserActivityCard
           v-for="entry in activity"
           :key="entry.timestamp + entry.user_id"
           :entry="entry"
           @view-details="handleViewDetails"
         />
       </div>
     </div>
   </template>
   
   <script>
   import { ref, onMounted, watch } from 'vue';
   import { UserActivityService } from '@/services/user-activity-service.js';
   import UserActivityCard from './UserActivityCard.vue';
   
   export default {
     name: 'UserActivityList',
     components: {
       UserActivityCard
     },
     props: {
       userId: {
         type: Number,
         default: null
       },
       dateFrom: {
         type: String,
         default: null
       },
       dateTo: {
         type: String,
         default: null
       },
       type: {
         type: String,
         default: null
       }
     },
     emits: ['view-details'],
     setup(props, { emit }) {
       const activity = ref([]);
       const loading = ref(false);
       const error = ref(null);
       
       const loadActivity = async () => {
         loading.value = true;
         error.value = null;
         
         try {
           const options = {
             userId: props.userId,
             dateFrom: props.dateFrom,
             dateTo: props.dateTo,
             type: props.type
           };
           
           activity.value = await UserActivityService.getActivity(options);
         } catch (err) {
           error.value = err.message || 'Ошибка загрузки активности';
           console.error('[UserActivityList] Error:', err);
         } finally {
           loading.value = false;
         }
       };
       
       const handleViewDetails = (entry) => {
         emit('view-details', entry);
       };
       
       onMounted(() => {
         loadActivity();
       });
       
       watch(() => [props.userId, props.dateFrom, props.dateTo, props.type], () => {
         loadActivity();
       }, { deep: true });
       
       return {
         activity,
         loading,
         error,
         handleViewDetails
       };
     }
   };
   </script>
   ```

2. **Создать `UserActivityCard.vue`**
   ```vue
   <template>
     <div class="user-activity-card" :class="cardClass">
       <div class="activity-icon">
         <span v-if="entry.type === 'app_entry'">🚪</span>
         <span v-else-if="entry.type === 'page_visit'">📄</span>
       </div>
       
       <div class="activity-content">
         <div class="activity-header">
           <span class="user-name">{{ entry.user_name }}</span>
           <span class="activity-time">{{ formatTime(entry.timestamp) }}</span>
         </div>
         
         <div class="activity-details">
           <span v-if="entry.type === 'app_entry'" class="activity-type">
             Открыл приложение
           </span>
           <span v-else-if="entry.type === 'page_visit'" class="activity-type">
             Открыл страницу: {{ entry.route_title || entry.route_path }}
           </span>
         </div>
         
         <div v-if="entry.type === 'page_visit' && entry.from_path" class="activity-from">
           С: {{ entry.from_name || entry.from_path }}
         </div>
       </div>
     </div>
   </template>
   
   <script>
   export default {
     name: 'UserActivityCard',
     props: {
       entry: {
         type: Object,
         required: true
       }
     },
     computed: {
       cardClass() {
         return {
           'activity-entry': this.entry.type === 'app_entry',
           'activity-visit': this.entry.type === 'page_visit'
         };
       }
     },
     methods: {
       formatTime(timestamp) {
         const date = new Date(timestamp);
         return date.toLocaleString('ru-RU', {
           year: 'numeric',
           month: '2-digit',
           day: '2-digit',
           hour: '2-digit',
           minute: '2-digit'
         });
       }
     }
   };
   </script>
   ```

3. **Создать `UserActivityFilters.vue`**
   ```vue
   <template>
     <div class="user-activity-filters">
       <div class="filter-group">
         <label>Пользователь:</label>
         <select v-model="localFilters.userId" @change="updateFilters">
           <option :value="null">Все пользователи</option>
           <option v-for="user in users" :key="user.ID" :value="user.ID">
             {{ user.NAME }} {{ user.LAST_NAME }}
           </option>
         </select>
       </div>
       
       <div class="filter-group">
         <label>Тип активности:</label>
         <select v-model="localFilters.type" @change="updateFilters">
           <option :value="null">Все типы</option>
           <option value="app_entry">Открытие приложения</option>
           <option value="page_visit">Переходы по страницам</option>
         </select>
       </div>
       
       <div class="filter-group">
         <label>Дата от:</label>
         <input type="date" v-model="localFilters.dateFrom" @change="updateFilters" />
       </div>
       
       <div class="filter-group">
         <label>Дата до:</label>
         <input type="date" v-model="localFilters.dateTo" @change="updateFilters" />
       </div>
       
       <button @click="resetFilters" class="btn-reset">Сбросить</button>
     </div>
   </template>
   
   <script>
   import { ref, watch } from 'vue';
   
   export default {
     name: 'UserActivityFilters',
     props: {
       filters: {
         type: Object,
         default: () => ({})
       },
       users: {
         type: Array,
         default: () => []
       }
     },
     emits: ['update-filters'],
     setup(props, { emit }) {
       const localFilters = ref({
         userId: props.filters.userId || null,
         type: props.filters.type || null,
         dateFrom: props.filters.dateFrom || null,
         dateTo: props.filters.dateTo || null
       });
       
       const updateFilters = () => {
         emit('update-filters', { ...localFilters.value });
       };
       
       const resetFilters = () => {
         localFilters.value = {
           userId: null,
           type: null,
           dateFrom: null,
           dateTo: null
         };
         updateFilters();
       };
       
       watch(() => props.filters, (newFilters) => {
         localFilters.value = { ...newFilters };
       }, { deep: true });
       
       return {
         localFilters,
         updateFilters,
         resetFilters
       };
     }
   };
   </script>
   ```

4. **Создать `UserActivityStats.vue`**
   ```vue
   <template>
     <div class="user-activity-stats">
       <div class="stats-grid">
         <div class="stat-card">
           <div class="stat-value">{{ stats.total_entries }}</div>
           <div class="stat-label">Всего записей</div>
         </div>
         
         <div class="stat-card">
           <div class="stat-value">{{ stats.unique_users_count }}</div>
           <div class="stat-label">Уникальных пользователей</div>
         </div>
         
         <div class="stat-card">
           <div class="stat-value">{{ stats.total_page_visits }}</div>
           <div class="stat-label">Переходов по страницам</div>
         </div>
       </div>
       
       <div v-if="Object.keys(stats.pages_visited).length > 0" class="pages-stats">
         <h3>Популярные страницы:</h3>
         <ul>
           <li v-for="(count, page) in sortedPages" :key="page">
             {{ page }}: {{ count }} посещений
           </li>
         </ul>
       </div>
     </div>
   </template>
   
   <script>
   import { ref, computed, onMounted } from 'vue';
   import { UserActivityService } from '@/services/user-activity-service.js';
   
   export default {
     name: 'UserActivityStats',
     props: {
       filters: {
         type: Object,
         default: () => ({})
       }
     },
     setup(props) {
       const stats = ref({
         total_entries: 0,
         unique_users_count: 0,
         total_page_visits: 0,
         pages_visited: {}
       });
       
       const loadStats = async () => {
         try {
           stats.value = await UserActivityService.getActivityStats(props.filters);
         } catch (error) {
           console.error('[UserActivityStats] Error loading stats:', error);
         }
       };
       
       const sortedPages = computed(() => {
         const pages = stats.value.pages_visited || {};
         return Object.entries(pages)
           .sort((a, b) => b[1] - a[1])
           .slice(0, 10)
           .reduce((acc, [page, count]) => {
             acc[page] = count;
             return acc;
           }, {});
       });
       
       onMounted(() => {
         loadStats();
       });
       
       return {
         stats,
         sortedPages
       };
     }
   };
   </script>
   ```

**Критерии приёмки:**
- [ ] Компонент `UserActivityList.vue` отображает список активности
- [ ] Компонент `UserActivityCard.vue` отображает запись активности
- [ ] Компонент `UserActivityFilters.vue` работает с фильтрами
- [ ] Компонент `UserActivityStats.vue` отображает статистику
- [ ] Все компоненты интегрированы и работают корректно

---

### Этап 5: Интеграция в страницу управления пользователями

**Цель:** Добавить раздел "Активность пользователей" на страницу управления пользователями.

**Шаги:**

1. **Расширить `UsersManagementPage.vue`**
   ```vue
   <template>
     <div class="users-management-page">
       <!-- Существующий контент -->
       
       <!-- Новый раздел: Активность пользователей -->
       <div class="activity-section">
         <h2>📊 Активность пользователей</h2>
         
         <UserActivityFilters
           :filters="activityFilters"
           :users="users"
           @update-filters="handleFiltersUpdate"
         />
         
         <UserActivityStats :filters="activityFilters" />
         
         <UserActivityList
           :userId="activityFilters.userId"
           :dateFrom="activityFilters.dateFrom"
           :dateTo="activityFilters.dateTo"
           :type="activityFilters.type"
           @view-details="handleViewActivityDetails"
         />
       </div>
     </div>
   </template>
   
   <script>
   // ... существующий код ...
   
   import UserActivityList from '@/components/users/UserActivityList.vue';
   import UserActivityFilters from '@/components/users/UserActivityFilters.vue';
   import UserActivityStats from '@/components/users/UserActivityStats.vue';
   
   // ... добавление компонентов и логики ...
   </script>
   ```

**Критерии приёмки:**
- [ ] Раздел "Активность пользователей" добавлен на страницу
- [ ] Фильтры активности работают
- [ ] Статистика отображается
- [ ] Список активности отображается
- [ ] Интеграция с существующим функционалом работает

---

## 🔗 API-методы

### Backend API endpoints:

1. **`POST /api/user-activity-log.php`** — логирование активности
   - Параметры: JSON body с записью активности
   - Ответ: `{ "success": true, "message": "Activity logged" }`

2. **`GET /api/user-activity-get.php`** — получение активности
   - Параметры:
     - `user_id` (опционально) — ID пользователя
     - `date_from` (опционально) — Дата начала (YYYY-MM-DD)
     - `date_to` (опционально) — Дата окончания (YYYY-MM-DD)
     - `type` (опционально) — Тип активности (app_entry, page_visit)
   - Ответ: `{ "success": true, "data": [...], "count": 123 }`

---

## 📁 Формат логов

### Структура файлов:

```
logs/user-activity/
├── 2025-12-24-10.json   # Логи за 10:00-10:59
├── 2025-12-24-11.json   # Логи за 11:00-11:59
└── ...
```

### Формат записи:

**Открытие приложения:**
```json
{
  "timestamp": "2025-12-24T10:15:30+03:00",
  "type": "app_entry",
  "user_id": 123,
  "user_name": "Иван Иванов",
  "user_email": "ivan@example.com",
  "ip": "195.208.184.34",
  "user_agent": "Mozilla/5.0...",
  "session_id": "1735026930-abc123"
}
```

**Переход по странице:**
```json
{
  "timestamp": "2025-12-24T10:20:45+03:00",
  "type": "page_visit",
  "user_id": 123,
  "user_name": "Иван Иванов",
  "route_path": "/dashboard/graph-admission-closure",
  "route_name": "dashboard-graph-admission-closure",
  "route_title": "График приёма и закрытий сектора 1С",
  "from_path": "/",
  "from_name": "index",
  "session_id": "1735026930-abc123"
}
```

---

## 🎨 Технические требования

### Vue.js:

- **Версия:** 3.x (Composition API)
- **Стиль:** Composition API с `setup()`
- **Реактивность:** `ref()`, `computed()`, `watch()`

### Логирование:

- **Формат:** JSON
- **Структура:** Аналогично логам вебхуков
- **Хранение:** `logs/user-activity/YYYY-MM-DD-HH.json`
- **Ротация:** Автоматическая по часам

### Производительность:

- **Ленивая загрузка:** Использование `defineAsyncComponent` для тяжёлых компонентов
- **Кеширование:** Кеширование данных активности (sessionStorage, TTL: 5 минут)
- **Оптимизация:** Минимизация запросов к API

---

## ✅ Критерии приёмки

### Функциональность:

- [ ] Логирование первого входа работает
- [ ] Логирование переходов по страницам работает
- [ ] Логи сохраняются в `logs/user-activity/`
- [ ] Раздел "Активность пользователей" отображается на странице
- [ ] Фильтры активности работают
- [ ] Статистика активности отображается
- [ ] Список активности отображается корректно

### Безопасность:

- [ ] Доступ только для администраторов
- [ ] Логирование не прерывает работу приложения при ошибках
- [ ] Валидация данных на backend

### UX:

- [ ] Индикация загрузки данных
- [ ] Обработка ошибок с понятными сообщениями
- [ ] Адаптивность для мобильных устройств
- [ ] Соответствие гайдлайнам Bitrix24

### Производительность:

- [ ] Загрузка данных не превышает 3 секунд
- [ ] Кеширование данных работает
- [ ] Оптимизация запросов к API

---

## 📝 Примечания

### Важные замечания:

1. **Логирование не должно прерывать работу приложения:**
   - Все ошибки логирования обрабатываются в try/catch
   - При ошибке логирования приложение продолжает работать

2. **Использование существующей структуры:**
   - Используется `WebhookLogsRepository` для сохранения логов
   - Формат аналогичен логам вебхуков
   - Категория: `user-activity`

3. **Сессии:**
   - ID сессии генерируется один раз при первом входе
   - Хранится в `sessionStorage`
   - Используется для группировки активности пользователя

4. **Производительность:**
   - Рекомендуется кеширование данных активности
   - TTL кеша: 5 минут
   - Пагинация для больших объёмов данных (если требуется)

---

## 🔄 История правок

- 2025-12-24 12:32 (UTC+3, Брест): Создан черновик задачи TASK-073

---

## 📚 Связанные документы

- `DOCS/TASKS/TASK-072-users-management-module.md` — базовая реализация модуля "Управление пользователями"
- `DOCS/ANALYSIS/administration-module-comprehensive-analysis.md` — анализ модуля администрирования
- `DOCS/USER-GUIDE/logs-webhooks/05-logging.md` — документация по логированию вебхуков (референс)
- `vue-app/src/pages/WebhookLogsPage.vue` — референсная реализация страницы логов

