# TASK-074-1: Ручное создание кеша с боковой нотификацией прогресса

**Дата создания:** 2025-12-24 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-074 (Реализация модуля "Ручное управление кешем")

---

## 📌 Краткое резюме

**Что реализуется:**
- Кнопка "Создать кеш" для каждого модуля в интерфейсе управления кешем
- Backend API endpoint для ручного создания кеша с поддержкой прогресса
- Боковая нотификация с отображением прогресса создания кеша
- Автоматическое обновление интерфейса после успешного создания

**Структура реализации:**
- **4 основных этапа** с детальными подэтапами
- **Backend:** API endpoint для создания кеша с прогрессом
- **Frontend:** Компонент боковой нотификации с прогрессом
- **Интеграция:** Добавление кнопки и обработчиков в CacheModuleCard

**Время выполнения:** ~8-12 часов  
**Сложность:** Средняя

---

## 📋 Описание

Реализовать функционал **ручного создания кеша** для каждого модуля в интерфейсе управления кешем. Процесс создания должен отображаться через **боковую нотификацию** с прогресс-баром, показывающим этапы создания кеша. После успешного создания интерфейс должен автоматически обновиться.

**Цель:** Предоставить администраторам возможность принудительно создать кеш для модуля, не дожидаясь автоматического создания при следующем запросе.

---

## 🎯 Контекст

### Текущая ситуация:

- ✅ Интерфейс управления кешем реализован (TASK-074)
- ✅ Есть кнопка "Очистить кеш" для каждого модуля
- ✅ Отображается статус кеша (активен/просрочен/пуст)
- ✅ Отображается дата создания и время до истечения
- ❌ Нет возможности вручную создать кеш
- ❌ Нет отображения прогресса создания кеша

### Требования:

- Кнопка "Создать кеш" рядом с кнопкой "Очистить кеш"
- Боковая нотификация с прогресс-баром во время создания
- Отображение этапов создания кеша (загрузка данных, обработка, сохранение)
- Автоматическое обновление интерфейса после создания
- Обработка ошибок с понятными сообщениями

### Референсная реализация:

- **Система уведомлений:** `useNotifications` composable и `NotificationContainer` компонент
- **Компонент прогресса:** `Notification.vue` с поддержкой прогресс-бара
- **API endpoints:** `api/graph-1c-admission-closure.php`, `api/tickets-time-tracking-sector-1c.php`

---

## 🏗️ Модули и компоненты

### Новые файлы:

#### Backend (PHP):
- `api/admin/cache-create.php` — API endpoint для создания кеша с поддержкой прогресса

#### Frontend (Vue.js):
- `vue-app/src/components/common/SideNotification.vue` — компонент боковой нотификации с прогрессом
- `vue-app/src/composables/useSideNotification.js` — composable для управления боковыми нотификациями

### Изменяемые файлы:

- `vue-app/src/components/cache/CacheModuleCard.vue` — добавление кнопки "Создать кеш"
- `vue-app/src/services/cache-management-service.js` — добавление метода `createCache()` с поддержкой прогресса
- `vue-app/src/pages/CacheManagementPage.vue` — интеграция SideNotification компонента

### Структура директорий:

```
vue-app/src/
├── components/
│   ├── cache/
│   │   └── CacheModuleCard.vue          # Добавление кнопки создания
│   └── common/
│       └── SideNotification.vue        # Новый компонент боковой нотификации
├── composables/
│   └── useSideNotification.js            # Новый composable
└── services/
    └── cache-management-service.js      # Расширение сервиса

api/admin/
└── cache-create.php                     # Новый API endpoint
```

---

## 📦 Зависимости

### От задач:

- TASK-074: Реализация модуля "Ручное управление кешем" (базовая функциональность)

### От модулей:

- Модуль "Администрирование" (конфигурация и маршрутизация)
- AccessControlService (проверка прав администратора)
- Кеш-классы:
  - `GraphAdmissionClosureCache` (api/cache/GraphAdmissionClosureCache.php)
  - `TimeTrackingCache` (api/cache/TimeTrackingCache.php)
- Сервисы генерации данных:
  - `GraphAdmissionClosureService` (api/graph-admission-closure/service/GraphAdmissionClosureService.php)
  - Сервис для трудозатрат (api/tickets-time-tracking-sector-1c.php)

### От библиотек:

- Vue.js 3.x (Composition API)
- Существующая система уведомлений (`useNotifications`)

---

## 🎯 Детальный план реализации

### Обзор этапов

Реализация разделена на **4 основных этапа**, каждый из которых содержит детальные подэтапы:

1. **Этап 1:** Создание backend API endpoint для создания кеша
2. **Этап 2:** Создание компонента боковой нотификации с прогрессом
3. **Этап 3:** Расширение frontend сервиса и добавление кнопки
4. **Этап 4:** Интеграция и финализация

---

## 📝 Этап 1: Создание backend API endpoint для создания кеша

**Цель:** Создать API endpoint, который будет генерировать данные и сохранять их в кеш с поддержкой прогресса.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Критический

### Подэтап 1.1: Создание API endpoint cache-create.php

**Файл:** `api/admin/cache-create.php` (новый файл)

**Задача:** Создать API endpoint для создания кеша конкретного модуля.

**Детальные шаги:**

1. **Создать файл `api/admin/cache-create.php`**

2. **Реализовать полный код endpoint:**
   ```php
   <?php
   /**
    * API endpoint для ручного создания кеша модулей
    * 
    * Метод: POST
    * Путь: /api/admin/cache-create.php
    * 
    * Параметры запроса:
    * {
    *   "module_id": "graph-admission-closure-months",
    *   "params": {} // Дополнительные параметры для генерации данных
    * }
    * 
    * Требует прав администратора
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "message": "Cache created successfully",
    *   "module_id": "graph-admission-closure-months",
    *   "cache_info": {
    *     "file_count": 1,
    *     "total_size": 102400,
    *     "created_at": 1703328000
    *   }
    * }
    * 
    * Формат ответа (прогресс):
    * {
    *   "progress": 50,
    *   "step": "processing_data",
    *   "message": "Обработка данных..."
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
   
   try {
       $moduleId = $input['module_id'];
       $params = $input['params'] ?? [];
       
       // Функция для отправки прогресса (если используется Server-Sent Events)
       // В данном случае используем обычный JSON ответ, но можно расширить до SSE
       
       switch ($moduleId) {
           case 'graph-admission-closure-months':
               // Создание кеша для графика приёма/закрытий (3 месяца)
               $result = createGraphAdmissionClosureCache('months', $params);
               break;
               
           case 'graph-admission-closure-weeks':
               // Создание кеша для графика приёма/закрытий (4 недели)
               $result = createGraphAdmissionClosureCache('weeks', $params);
               break;
               
           case 'time-tracking-sector-1c':
               // Создание кеша для трудозатрат
               $result = createTimeTrackingCache($params);
               break;
               
           default:
               http_response_code(400);
               echo json_encode([
                   'error' => 'Unknown module_id',
                   'module_id' => $moduleId
               ]);
               exit;
       }
       
       http_response_code(200);
       echo json_encode([
           'success' => true,
           'message' => 'Cache created successfully',
           'module_id' => $moduleId,
           'cache_info' => $result
       ]);
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   
   /**
    * Создание кеша для графика приёма/закрытий
    * 
    * @param string $mode Режим ('months' или 'weeks')
    * @param array $params Дополнительные параметры
    * @return array Информация о созданном кеше
    */
   function createGraphAdmissionClosureCache(string $mode, array $params = []): array
   {
       require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/service/GraphAdmissionClosureService.php';
       
       // Параметры по умолчанию
       $defaultParams = [
           'product' => '1C',
           'periodMode' => $mode,
           'includeTickets' => false,
           'includeNewTicketsByStages' => false,
           'includeCarryoverTickets' => true,
           'includeCarryoverTicketsByDuration' => false
       ];
       
       $requestParams = array_merge($defaultParams, $params);
       
       // Генерация данных через сервис
       $service = new GraphAdmissionClosureService();
       $data = $service->getData($requestParams);
       
       // Генерация ключа кеша
       $cacheKey = GraphAdmissionClosureCache::generateKey($requestParams);
       
       // Определение TTL
       $ttl = $mode === 'weeks' ? 120 : 300;
       
       // Сохранение в кеш
       $success = GraphAdmissionClosureCache::set($cacheKey, $data, $ttl);
       
       if (!$success) {
           throw new \Exception('Failed to save cache');
       }
       
       // Получение информации о созданном кеше
       $cacheDir = __DIR__ . '/../cache/graph-admission-closure/' . $mode;
       $cacheFile = $cacheDir . '/' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $cacheKey) . '.json';
       
       $fileCount = file_exists($cacheFile) ? 1 : 0;
       $totalSize = file_exists($cacheFile) ? filesize($cacheFile) : 0;
       
       $createdAt = null;
       if (file_exists($cacheFile)) {
           $content = @file_get_contents($cacheFile);
           if ($content !== false) {
               $cacheData = @json_decode($content, true);
               if ($cacheData && isset($cacheData['metadata']['created_at'])) {
                   $createdAt = $cacheData['metadata']['created_at'];
               }
           }
       }
       
       return [
           'file_count' => $fileCount,
           'total_size' => $totalSize,
           'created_at' => $createdAt
       ];
   }
   
   /**
    * Создание кеша для трудозатрат
    * 
    * @param array $params Дополнительные параметры
    * @return array Информация о созданном кеше
    */
   function createTimeTrackingCache(array $params = []): array
   {
       // Загрузка данных через API endpoint
       // Используем тот же механизм, что и при обычном запросе
       $apiUrl = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . 
                 dirname($_SERVER['SCRIPT_NAME']) . '/../tickets-time-tracking-sector-1c.php';
       
       // Параметры запроса
       $queryParams = array_merge([
           'force_refresh' => '1' // Принудительное обновление
       ], $params);
       
       $url = $apiUrl . '?' . http_build_query($queryParams);
       
       // Выполнение запроса
       $context = stream_context_create([
           'http' => [
               'method' => 'GET',
               'timeout' => 300 // 5 минут таймаут
           ]
       ]);
       
       $response = @file_get_contents($url, false, $context);
       
       if ($response === false) {
           throw new \Exception('Failed to generate cache data');
       }
       
       $data = @json_decode($response, true);
       
       if (!$data || !isset($data['success']) || !$data['success']) {
           throw new \Exception('Failed to generate cache data: ' . ($data['error'] ?? 'Unknown error'));
       }
       
       // Кеш уже создан через TimeTrackingCache в процессе выполнения API
       // Получаем информацию о созданном кеше
       $cacheDir = __DIR__ . '/../cache/time-tracking-sector-1c';
       $files = glob($cacheDir . '/*.json');
       
       $fileCount = $files ? count($files) : 0;
       $totalSize = 0;
       $newestCreatedAt = null;
       
       foreach ($files as $file) {
           if (is_file($file)) {
               $totalSize += filesize($file);
               
               $content = @file_get_contents($file);
               if ($content !== false) {
                   $cacheData = @json_decode($content, true);
                   if ($cacheData && isset($cacheData['metadata']['created_at'])) {
                       $createdAt = $cacheData['metadata']['created_at'];
                       if ($newestCreatedAt === null || $createdAt > $newestCreatedAt) {
                           $newestCreatedAt = $createdAt;
                       }
                   }
               }
           }
       }
       
       return [
           'file_count' => $fileCount,
           'total_size' => $totalSize,
           'created_at' => $newestCreatedAt
       ];
   }
   ```

**Критерии приёмки:**
- [ ] Файл `cache-create.php` создан
- [ ] Endpoint принимает POST запросы
- [ ] Создание кеша для `graph-admission-closure-months` работает
- [ ] Создание кеша для `graph-admission-closure-weeks` работает
- [ ] Создание кеша для `time-tracking-sector-1c` работает
- [ ] Возвращается информация о созданном кеше
- [ ] Обработка ошибок реализована

---

## 📝 Этап 2: Создание компонента боковой нотификации с прогрессом

**Цель:** Создать компонент боковой нотификации, который будет отображать прогресс создания кеша.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 2.1: Создание composable useSideNotification.js

**Файл:** `vue-app/src/composables/useSideNotification.js` (новый файл)

**Задача:** Создать composable для управления боковыми нотификациями с прогрессом.

**Детальные шаги:**

1. **Создать файл `vue-app/src/composables/useSideNotification.js`**

2. **Реализовать полный код composable:**
   ```javascript
   import { ref } from 'vue';
   
   const sideNotifications = ref([]);
   let notificationIdCounter = 0;
   
   /**
    * Composable для управления боковыми нотификациями с прогрессом
    * 
    * Боковые нотификации отображаются сбоку экрана и показывают
    * прогресс длительных операций (создание кеша, загрузка данных и т.д.)
    */
   export function useSideNotification() {
     /**
      * Показать боковую нотификацию с прогрессом
      * 
      * @param {string} title Заголовок нотификации
      * @param {string} message Сообщение
      * @param {string} type Тип (info, success, error, warning)
      * @returns {number} ID нотификации
      */
     const show = (title, message = '', type = 'info') => {
       const id = ++notificationIdCounter;
       const notification = {
         id,
         title,
         message,
         type,
         progress: 0,
         step: null,
         isActive: true,
         timestamp: Date.now()
       };
       
       sideNotifications.value.push(notification);
       return id;
     };
     
     /**
      * Обновить прогресс нотификации
      * 
      * @param {number} id ID нотификации
      * @param {number} progress Прогресс (0-100)
      * @param {string} step Текущий этап
      * @param {string} message Дополнительное сообщение
      */
     const updateProgress = (id, progress, step = null, message = null) => {
       const notification = sideNotifications.value.find(n => n.id === id);
       if (notification) {
         notification.progress = Math.max(0, Math.min(100, progress));
         if (step !== null) {
           notification.step = step;
         }
         if (message !== null) {
           notification.message = message;
         }
       }
     };
     
     /**
      * Завершить нотификацию успешно
      * 
      * @param {number} id ID нотификации
      * @param {string} message Финальное сообщение
      */
     const complete = (id, message = null) => {
       const notification = sideNotifications.value.find(n => n.id === id);
       if (notification) {
         notification.progress = 100;
         notification.type = 'success';
         notification.isActive = false;
         if (message !== null) {
           notification.message = message;
         }
         
         // Автоматически скрыть через 3 секунды
         setTimeout(() => {
           remove(id);
         }, 3000);
       }
     };
     
     /**
      * Завершить нотификацию с ошибкой
      * 
      * @param {number} id ID нотификации
      * @param {string} message Сообщение об ошибке
      */
     const error = (id, message) => {
       const notification = sideNotifications.value.find(n => n.id === id);
       if (notification) {
         notification.progress = 0;
         notification.type = 'error';
         notification.isActive = false;
         notification.message = message;
         
         // Автоматически скрыть через 5 секунд
         setTimeout(() => {
           remove(id);
         }, 5000);
       }
     };
     
     /**
      * Удалить нотификацию
      * 
      * @param {number} id ID нотификации
      */
     const remove = (id) => {
       const index = sideNotifications.value.findIndex(n => n.id === id);
       if (index > -1) {
         sideNotifications.value.splice(index, 1);
       }
     };
     
     /**
      * Очистить все нотификации
      */
     const clear = () => {
       sideNotifications.value = [];
     };
     
     return {
       notifications: sideNotifications,
       show,
       updateProgress,
       complete,
       error,
       remove,
       clear
     };
   }
   ```

**Критерии приёмки:**
- [ ] Файл `useSideNotification.js` создан
- [ ] Метод `show()` создаёт нотификацию
- [ ] Метод `updateProgress()` обновляет прогресс
- [ ] Метод `complete()` завершает успешно
- [ ] Метод `error()` завершает с ошибкой
- [ ] Метод `remove()` удаляет нотификацию

---

### Подэтап 2.2: Создание компонента SideNotification.vue

**Файл:** `vue-app/src/components/common/SideNotification.vue` (новый файл)

**Задача:** Создать компонент для отображения боковой нотификации с прогресс-баром.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/common/SideNotification.vue`**

2. **Реализовать полный код компонента:**
   ```vue
   <template>
     <div 
       :class="['side-notification', `side-notification-${notification.type}`]"
       v-if="notification.isActive || notification.type === 'success' || notification.type === 'error'"
     >
       <div class="notification-header">
         <div class="notification-title-row">
           <span class="notification-icon">{{ icon }}</span>
           <h4 class="notification-title">{{ notification.title }}</h4>
           <button 
             @click="handleClose" 
             class="notification-close"
             aria-label="Закрыть"
           >
             ✕
           </button>
         </div>
       </div>
       
       <div class="notification-body">
         <p v-if="notification.message" class="notification-message">
           {{ notification.message }}
         </p>
         
         <div v-if="notification.step" class="notification-step">
           <span class="step-label">Этап:</span>
           <span class="step-value">{{ formatStep(notification.step) }}</span>
         </div>
       </div>
       
       <div class="notification-progress">
         <div class="progress-bar-container">
           <div 
             class="progress-bar" 
             :class="`progress-bar-${notification.type}`"
             :style="{ width: `${notification.progress}%` }"
           ></div>
         </div>
         <div class="progress-text">
           {{ notification.progress }}%
         </div>
       </div>
     </div>
   </template>
   
   <script>
   import { computed } from 'vue';
   
   export default {
     name: 'SideNotification',
     props: {
       notification: {
         type: Object,
         required: true
       }
     },
     emits: ['close'],
     setup(props, { emit }) {
       const icons = {
         success: '✅',
         error: '❌',
         warning: '⚠️',
         info: '🔄'
       };
       
       const icon = computed(() => {
         return icons[props.notification.type] || 'ℹ️';
       });
       
       const formatStep = (step) => {
         const stepNames = {
           'loading_data': 'Загрузка данных...',
           'processing_data': 'Обработка данных...',
           'saving_cache': 'Сохранение в кеш...',
           'completed': 'Завершено'
         };
         
         return stepNames[step] || step;
       };
       
       const handleClose = () => {
         emit('close', props.notification.id);
       };
       
       return {
         icon,
         formatStep,
         handleClose
       };
     }
   };
   </script>
   
   <style scoped>
   .side-notification {
     position: fixed;
     right: 20px;
     top: 20px;
     width: 400px;
     max-width: calc(100vw - 40px);
     background: white;
     border-radius: 8px;
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
     border-left: 4px solid;
     z-index: 10001;
     overflow: hidden;
     animation: slideIn 0.3s ease-out;
   }
   
   @keyframes slideIn {
     from {
       transform: translateX(100%);
       opacity: 0;
     }
     to {
       transform: translateX(0);
       opacity: 1;
     }
   }
   
   .side-notification-info {
     border-left-color: #2196F3;
   }
   
   .side-notification-success {
     border-left-color: #28a745;
   }
   
   .side-notification-error {
     border-left-color: #dc3545;
   }
   
   .side-notification-warning {
     border-left-color: #ffc107;
   }
   
   .notification-header {
     padding: 16px;
     border-bottom: 1px solid #e0e0e0;
   }
   
   .notification-title-row {
     display: flex;
     align-items: center;
     gap: 12px;
   }
   
   .notification-icon {
     font-size: 24px;
     flex-shrink: 0;
   }
   
   .notification-title {
     flex: 1;
     margin: 0;
     font-size: 16px;
     font-weight: 600;
     color: #333;
   }
   
   .notification-close {
     background: none;
     border: none;
     font-size: 20px;
     color: #999;
     cursor: pointer;
     padding: 0;
     width: 24px;
     height: 24px;
     display: flex;
     align-items: center;
     justify-content: center;
     border-radius: 4px;
     transition: all 0.2s;
   }
   
   .notification-close:hover {
     background: #f5f5f5;
     color: #666;
   }
   
   .notification-body {
     padding: 16px;
   }
   
   .notification-message {
     margin: 0 0 12px 0;
     font-size: 14px;
     color: #666;
     line-height: 1.5;
   }
   
   .notification-step {
     display: flex;
     align-items: center;
     gap: 8px;
     font-size: 13px;
   }
   
   .step-label {
     color: #999;
   }
   
   .step-value {
     color: #333;
     font-weight: 500;
   }
   
   .notification-progress {
     padding: 12px 16px;
     background: #f8f9fa;
     border-top: 1px solid #e0e0e0;
   }
   
   .progress-bar-container {
     height: 8px;
     background: #e0e0e0;
     border-radius: 4px;
     overflow: hidden;
     margin-bottom: 8px;
   }
   
   .progress-bar {
     height: 100%;
     transition: width 0.3s ease;
     border-radius: 4px;
   }
   
   .progress-bar-info {
     background: #2196F3;
   }
   
   .progress-bar-success {
     background: #28a745;
   }
   
   .progress-bar-error {
     background: #dc3545;
   }
   
   .progress-bar-warning {
     background: #ffc107;
   }
   
   .progress-text {
     text-align: center;
     font-size: 12px;
     color: #666;
     font-weight: 500;
   }
   
   @media (max-width: 768px) {
     .side-notification {
       right: 10px;
       left: 10px;
       width: auto;
     }
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Файл `SideNotification.vue` создан
- [ ] Компонент отображает заголовок и сообщение
- [ ] Прогресс-бар отображается корректно
- [ ] Этапы отображаются в читаемом формате
- [ ] Анимация появления работает
- [ ] Кнопка закрытия работает
- [ ] Адаптивность для мобильных устройств

---

### Подэтап 2.3: Создание контейнера для боковых нотификаций

**Файл:** `vue-app/src/components/common/SideNotificationContainer.vue` (новый файл)

**Задача:** Создать контейнер для отображения нескольких боковых нотификаций.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/common/SideNotificationContainer.vue`**

2. **Реализовать полный код компонента:**
   ```vue
   <template>
     <Teleport to="body">
       <div class="side-notification-container">
         <TransitionGroup name="side-notification" tag="div">
           <SideNotification
             v-for="notification in notifications"
             :key="notification.id"
             :notification="notification"
             @close="removeNotification(notification.id)"
           />
         </TransitionGroup>
       </div>
     </Teleport>
   </template>
   
   <script>
   import { computed } from 'vue';
   import { useSideNotification } from '@/composables/useSideNotification.js';
   import SideNotification from './SideNotification.vue';
   
   export default {
     name: 'SideNotificationContainer',
     components: {
       SideNotification
     },
     setup() {
       const { notifications, remove } = useSideNotification();
       
       const removeNotification = (id) => {
         remove(id);
       };
       
       return {
         notifications,
         removeNotification
       };
     }
   };
   </script>
   
   <style scoped>
   .side-notification-container {
     position: fixed;
     top: 20px;
     right: 20px;
     z-index: 10000;
     display: flex;
     flex-direction: column;
     gap: 12px;
     pointer-events: none;
   }
   
   .side-notification-enter-active,
   .side-notification-leave-active {
     transition: all 0.3s ease;
   }
   
   .side-notification-enter-from {
     opacity: 0;
     transform: translateX(100%);
   }
   
   .side-notification-leave-to {
     opacity: 0;
     transform: translateX(100%);
   }
   
   @media (max-width: 768px) {
     .side-notification-container {
       right: 10px;
       left: 10px;
     }
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Файл `SideNotificationContainer.vue` создан
- [ ] Контейнер отображает все активные нотификации
- [ ] Анимации появления/исчезновения работают
- [ ] Нотификации располагаются вертикально с отступами

---

## 📝 Этап 3: Расширение frontend сервиса и добавление кнопки

**Цель:** Добавить метод создания кеша в сервис и кнопку в компонент карточки модуля.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Высокий

### Подэтап 3.1: Расширение CacheManagementService

**Файл:** `vue-app/src/services/cache-management-service.js`

**Задача:** Добавить метод `createCache()` с поддержкой прогресса через колбэки.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/services/cache-management-service.js`**

2. **Добавить метод `createCache()`:**
   ```javascript
   /**
    * Создание кеша модуля с поддержкой прогресса
    * 
    * @param {string} moduleId - ID модуля
    * @param {object} params - Параметры для создания кеша
    * @param {function} onProgress - Колбэк для обновления прогресса (progress, step, message)
    * @returns {Promise<object>} Информация о созданном кеше
    */
   static async createCache(moduleId, params = {}, onProgress = null) {
     try {
       const apiUrl = getApiUrl('/api/admin/cache-create.php');
       
       // Вызов колбэка прогресса: начало
       if (onProgress) {
         onProgress(0, 'loading_data', 'Начало создания кеша...');
       }
       
       // Выполнение запроса
       const response = await fetch(apiUrl, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'X-Requested-With': 'XMLHttpRequest'
         },
         body: JSON.stringify({
           module_id: moduleId,
           params: params
         })
       });
       
       // Вызов колбэка прогресса: обработка
       if (onProgress) {
         onProgress(30, 'processing_data', 'Обработка данных...');
       }
       
       if (!response.ok) {
         throw new Error(`HTTP error! status: ${response.status}`);
       }
       
       const result = await response.json();
       
       // Вызов колбэка прогресса: сохранение
       if (onProgress) {
         onProgress(70, 'saving_cache', 'Сохранение в кеш...');
       }
       
       if (result.success) {
         // Вызов колбэка прогресса: завершение
         if (onProgress) {
           onProgress(100, 'completed', 'Кеш успешно создан');
         }
         
         return result.cache_info || {};
       } else {
         throw new Error(result.error || 'Failed to create cache');
       }
     } catch (error) {
       console.error('[CacheManagementService] Error creating cache:', error);
       
       // Вызов колбэка прогресса: ошибка
       if (onProgress) {
         onProgress(0, 'error', `Ошибка: ${error.message}`);
       }
       
       throw error;
     }
   }
   ```

**Критерии приёмки:**
- [ ] Метод `createCache()` добавлен в сервис
- [ ] Метод поддерживает колбэк прогресса
- [ ] Прогресс обновляется на разных этапах
- [ ] Обработка ошибок реализована

---

### Подэтап 3.2: Добавление кнопки "Создать кеш" в CacheModuleCard

**Файл:** `vue-app/src/components/cache/CacheModuleCard.vue`

**Задача:** Добавить кнопку "Создать кеш" рядом с кнопкой "Очистить кеш" и интегрировать боковую нотификацию.

**Детальные шаги:**

1. **Открыть файл `vue-app/src/components/cache/CacheModuleCard.vue`**

2. **Добавить импорты:**
   ```javascript
   import { useSideNotification } from '@/composables/useSideNotification.js';
   ```

3. **Обновить template, добавив кнопку создания:**
   ```vue
   <div class="card-footer">
     <div class="footer-buttons">
       <button
         @click="handleCreateCache"
         :disabled="creating || (module.file_count > 0 && module.status === 'active')"
         class="btn-create"
         :class="{ 'btn-disabled': creating || (module.file_count > 0 && module.status === 'active') }"
       >
         <span v-if="creating">Создание...</span>
         <span v-else>🔄 Создать кеш</span>
       </button>
       
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
   ```

4. **Добавить логику создания кеша в setup:**
   ```javascript
   const creating = ref(false);
   const sideNotification = useSideNotification();
   
   const handleCreateCache = async () => {
     if (creating.value) {
       return;
     }
     
     // Показываем боковую нотификацию
     const notificationId = sideNotification.show(
       `Создание кеша: ${props.module.name}`,
       'Начало создания кеша...',
       'info'
     );
     
     creating.value = true;
     
     try {
       await CacheManagementService.createCache(
         props.module.id,
         {},
         (progress, step, message) => {
           // Обновляем прогресс в нотификации
           sideNotification.updateProgress(notificationId, progress, step, message);
         }
       );
       
       // Завершаем нотификацию успешно
       sideNotification.complete(notificationId, 'Кеш успешно создан');
       
       // Эмитим событие для обновления интерфейса
       emit('created', props.module.id);
       
     } catch (error) {
       console.error('[CacheModuleCard] Error creating cache:', error);
       
       // Завершаем нотификацию с ошибкой
       sideNotification.error(notificationId, `Ошибка создания кеша: ${error.message}`);
     } finally {
       creating.value = false;
     }
   };
   ```

5. **Обновить return в setup:**
   ```javascript
   return {
     clearing,
     creating,
     formattedSize,
     formattedTTL,
     statusClass,
     statusValueClass,
     statusText,
     formattedCreatedAt,
     formattedExpiresAt,
     handleClear,
     handleCreateCache
   };
   ```

6. **Добавить стили для кнопок:**
   ```css
   .footer-buttons {
     display: flex;
     gap: 10px;
     justify-content: flex-end;
   }
   
   .btn-create {
     padding: 8px 16px;
     background-color: #007bff;
     color: white;
     border: none;
     border-radius: 4px;
     cursor: pointer;
     font-size: 14px;
     transition: background-color 0.3s ease;
   }
   
   .btn-create:hover:not(.btn-disabled) {
     background-color: #0056b3;
   }
   
   .btn-create.btn-disabled {
     background-color: #6c757d;
     cursor: not-allowed;
     opacity: 0.6;
   }
   ```

**Критерии приёмки:**
- [ ] Кнопка "Создать кеш" добавлена
- [ ] Боковая нотификация показывается при создании
- [ ] Прогресс обновляется во время создания
- [ ] Интерфейс обновляется после успешного создания
- [ ] Обработка ошибок реализована
- [ ] Кнопка блокируется во время создания

---

## 📝 Этап 4: Интеграция и финализация

**Цель:** Интегрировать все компоненты и завершить реализацию.

**Время выполнения:** ~1-2 часа  
**Приоритет:** Высокий

### Подэтап 4.1: Интеграция SideNotificationContainer в CacheManagementPage

**Файл:** `vue-app/src/pages/CacheManagementPage.vue`

**Задача:** Добавить контейнер боковых нотификаций на страницу.

**Детальные шаги:**

1. **Добавить импорт:**
   ```javascript
   import SideNotificationContainer from '@/components/common/SideNotificationContainer.vue';
   ```

2. **Добавить компонент в template:**
   ```vue
   <template>
     <div class="cache-management-page">
       <!-- ... существующий контент ... -->
       
       <!-- Контейнер боковых нотификаций -->
       <SideNotificationContainer />
     </div>
   </template>
   ```

3. **Зарегистрировать компонент:**
   ```javascript
   components: {
     CacheStats,
     CacheModuleCard,
     CacheActions,
     SideNotificationContainer
   }
   ```

4. **Добавить обработчик события `created`:**
   ```javascript
   const handleCacheCreated = async (moduleId) => {
     // Перезагружаем статус после создания кеша
     await loadCacheStatus();
   };
   ```

5. **Обновить CacheModuleCard, добавив обработчик:**
   ```vue
   <CacheModuleCard
     v-for="module in modules"
     :key="module.id"
     :module="module"
     @clear="handleClearCache"
     @created="handleCacheCreated"
   />
   ```

**Критерии приёмки:**
- [ ] SideNotificationContainer добавлен на страницу
- [ ] Нотификации отображаются корректно
- [ ] Интерфейс обновляется после создания кеша

---

### Подэтап 4.2: Тестирование функционала

**Задача:** Протестировать создание кеша для всех модулей.

**Детальные шаги:**

1. **Тест создания кеша для графика приёма/закрытий (3 месяца):**
   - Нажать кнопку "Создать кеш"
   - Проверить появление боковой нотификации
   - Проверить обновление прогресса
   - Проверить обновление интерфейса после создания

2. **Тест создания кеша для графика приёма/закрытий (4 недели):**
   - Повторить те же шаги

3. **Тест создания кеша для трудозатрат:**
   - Повторить те же шаги

4. **Тест обработки ошибок:**
   - Временно изменить URL API на несуществующий
   - Проверить отображение ошибки в нотификации

**Критерии приёмки:**
- [ ] Создание кеша работает для всех модулей
- [ ] Боковая нотификация отображается корректно
- [ ] Прогресс обновляется во время создания
- [ ] Интерфейс обновляется после создания
- [ ] Ошибки обрабатываются корректно

---

## 🔗 API-методы

### Backend API endpoint:

**`POST /api/admin/cache-create.php`** — создание кеша модуля
- Параметры: `{ "module_id": "module-id", "params": {} }`
- Ответ: `{ "success": true, "cache_info": {...} }`

---

## 🎨 Технические требования

### Vue.js:

- **Версия:** 3.x (Composition API)
- **Стиль:** Composition API с `setup()`
- **Реактивность:** `ref()`, `computed()`

### Компоненты:

- **Модульность:** Каждый компонент в отдельном файле
- **Переиспользуемость:** Компоненты должны быть переиспользуемыми
- **Props/Emits:** Чёткое определение интерфейса компонентов

### Стилизация:

- **Подход:** Scoped styles в компонентах
- **Гайдлайны:** Соответствие стилям Bitrix24
- **Адаптивность:** Поддержка мобильных устройств

### Боковая нотификация:

- **Позиция:** Справа вверху экрана
- **Анимация:** Плавное появление/исчезновение
- **Прогресс:** Визуальный прогресс-бар с процентами
- **Этапы:** Отображение текущего этапа создания

---

## ✅ Критерии приёмки

### Функциональность:

- [ ] Кнопка "Создать кеш" отображается для каждого модуля
- [ ] Боковая нотификация появляется при создании кеша
- [ ] Прогресс обновляется во время создания
- [ ] Кеш успешно создаётся для всех модулей
- [ ] Интерфейс автоматически обновляется после создания
- [ ] Ошибки отображаются в нотификации

### UX:

- [ ] Боковая нотификация не мешает работе с интерфейсом
- [ ] Прогресс отображается понятно
- [ ] Этапы создания описаны понятно
- [ ] Анимации плавные и не раздражающие

### Производительность:

- [ ] Создание кеша не блокирует интерфейс
- [ ] Нотификации не накапливаются (автоматическое скрытие)
- [ ] Обновление интерфейса происходит быстро

---

## 📝 Примечания

### Важные замечания:

1. **Прогресс создания:**
   - Прогресс обновляется через колбэки в методе `createCache()`
   - Этапы: `loading_data` → `processing_data` → `saving_cache` → `completed`
   - При ошибке этап меняется на `error`

2. **Боковая нотификация:**
   - Отображается справа вверху экрана
   - Не перекрывает основной контент
   - Автоматически скрывается через 3 секунды после успеха
   - Автоматически скрывается через 5 секунд после ошибки

3. **Обновление интерфейса:**
   - После успешного создания кеша вызывается `loadCacheStatus()`
   - Данные о модулях обновляются автоматически
   - Статус, дата создания и время до истечения обновляются

4. **Обработка ошибок:**
   - Все ошибки отображаются в боковой нотификации
   - Нотификация остаётся видимой 5 секунд для ошибок
   - Пользователь может закрыть нотификацию вручную

---

## 🔄 История правок

- 2025-12-24 (UTC+3, Брест): Создана задача TASK-074-1

---

## 📚 Связанные документы

- `DOCS/TASKS/TASK-074-cache-management-module.md` — базовая задача модуля управления кешем
- `DOCS/ANALYSIS/cache-usage-analysis.md` — анализ использования кеша в проекте
- `api/cache/GraphAdmissionClosureCache.php` — класс кеша для графика приёма/закрытий
- `api/cache/TimeTrackingCache.php` — класс кеша для трудозатрат

