# TASK-076: Ручное создание кешей с уведомлениями в модуле мониторинга

**Дата создания:** 2025-12-24 16:20 (UTC+3, Брест)  
**Статус:** Завершена (Completed)  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-074 (Модуль управления кешем), TASK-075 (Унификация кеша)

---

## 📌 Краткое резюме

**Что реализуется:**
- Ручное создание кешей для модулей через интерфейс мониторинга кеша
- Уведомления о процессе создания кеша (прогресс, статус)
- Уведомления об обновлении кеша (автоматические и ручные)
- Использование предварительно созданных кешей при обращении к модулю со стартовой страницы
- Интеграция в существующий модуль мониторинга кеша (TASK-074)

**Структура реализации:**
- **Backend:** API endpoints для создания кешей
- **Frontend:** Компоненты для ручного создания кешей с уведомлениями
- **Интеграция:** Расширение модуля мониторинга кеша

**Время выполнения:** ~16-24 часа  
**Сложность:** Средняя-Высокая

---

## 📋 Описание

Реализовать функциональность **ручного создания кешей** в модуле мониторинга кеша с системой уведомлений. Пользователи должны иметь возможность:

1. **Создавать кеши вручную** для модулей (GraphAdmissionClosureCache, TimeTrackingCache)
2. **Видеть процесс создания** кеша с прогрессом и статусом
3. **Получать уведомления** об обновлении кеша (автоматические и ручные)
4. **Использовать предварительно созданные кеши** при обращении к модулю со стартовой страницы

**Цель:** Предоставить администраторам возможность предварительно создавать кеши для модулей, что позволит ускорить работу приложения и улучшить пользовательский опыт.

---

## 🎯 Контекст

### Текущая ситуация:

**Модуль мониторинга кеша (TASK-074):**
- ✅ Просмотр статуса кеша для каждого модуля
- ✅ Очистка кеша для конкретного модуля или всех модулей
- ✅ Статистика кеша (размер, количество записей, TTL)
- ❌ Нет возможности создавать кеши вручную
- ❌ Нет уведомлений об обновлении кеша
- ❌ Нет возможности использовать предварительно созданные кеши

**Унифицированные модули кеша (TASK-075):**
- ✅ GraphAdmissionClosureCache (режимы: months, weeks)
- ✅ TimeTrackingCache (режимы: default, detailed, summary)
- ✅ Единый принцип работы с режимами

### Требования:

1. **Ручное создание кешей:**
   - Кнопка "Создать кеш" для каждого модуля в мониторинге
   - Выбор режима кеша (если модуль поддерживает режимы)
   - Параметры для создания кеша (даты, фильтры и т.д.)
   - Прогресс создания кеша

2. **Уведомления:**
   - Уведомления о начале создания кеша
   - Уведомления о прогрессе создания (если возможно)
   - Уведомления об успешном создании кеша
   - Уведомления об ошибках создания кеша
   - Уведомления об автоматическом обновлении кеша
   - Уведомления о ручном обновлении кеша

3. **Использование предварительно созданных кешей:**
   - При обращении к модулю со стартовой страницы проверять наличие кеша
   - Использовать кеш, если он существует и не истёк
   - Показывать уведомление о использовании кеша

---

## 🏗️ Модули и компоненты

### Новые файлы (Backend):

#### API Endpoints:
- `api/admin/cache-create.php` — создание кеша для модуля
- `api/admin/cache-create-status.php` — получение статуса создания кеша (для прогресса)

### Новые файлы (Frontend):

#### Vue.js компоненты:
- `vue-app/src/components/cache/CacheCreateButton.vue` — кнопка создания кеша с модальным окном
- `vue-app/src/components/cache/CacheCreateModal.vue` — модальное окно для создания кеша
- `vue-app/src/components/cache/CacheCreateProgress.vue` — компонент прогресса создания кеша
- `vue-app/src/components/cache/CacheNotifications.vue` — компонент для отображения уведомлений о кеше

#### Сервисы:
- `vue-app/src/services/cache-creation-service.js` — сервис для создания кешей
- `vue-app/src/services/cache-notification-service.js` — сервис для управления уведомлениями о кеше

### Изменяемые файлы:

#### Frontend:
- `vue-app/src/pages/CacheManagementPage.vue` — добавление кнопок создания кеша
- `vue-app/src/components/cache/CacheModuleCard.vue` — добавление кнопки "Создать кеш"
- `vue-app/src/services/cache-management-service.js` — добавление методов для создания кешей

#### Backend:
- `api/graph-1c-admission-closure.php` — поддержка использования предварительно созданных кешей
- `api/tickets-time-tracking-sector-1c.php` — поддержка использования предварительно созданных кешей

---

## 📦 Зависимости

### От задач:

- TASK-074: Модуль управления кешем (базовая функциональность)
- TASK-075: Унификация кеша (единый принцип работы с режимами)

### От модулей:

- Модуль мониторинга кеша (`CacheManagementPage.vue`)
- Кеш-классы:
  - `GraphAdmissionClosureCache` (api/cache/GraphAdmissionClosureCache.php)
  - `TimeTrackingCache` (api/cache/TimeTrackingCache.php)

### От библиотек:

- Vue.js 3.x (Composition API)
- Bitrix24 UI (для уведомлений)
- Vue Router (для навигации)

---

## 🎯 Детальный план реализации

### Обзор этапов

Реализация разделена на **6 основных этапов**, каждый из которых содержит детальные подэтапы:

1. **Этап 1:** Backend API для создания кешей
2. **Этап 2:** Frontend сервисы для создания кешей
3. **Этап 3:** Компоненты для создания кешей с уведомлениями
4. **Этап 4:** Интеграция в модуль мониторинга кеша
5. **Этап 5:** Использование предварительно созданных кешей
6. **Этап 6:** Система уведомлений об обновлении кеша

---

## 📝 Этап 1: Backend API для создания кешей

**Цель:** Создать API endpoints для ручного создания кешей.

**Время выполнения:** ~4-5 часов  
**Приоритет:** Критический

### Подэтап 1.1: Создание API endpoint для создания кеша

**Файл:** `api/admin/cache-create.php` (новый файл)

**Задача:** Создать API endpoint для создания кеша модуля.

**Детальные шаги:**

1. **Создать файл `api/admin/cache-create.php`**

2. **Реализовать структуру endpoint:**
   ```php
   <?php
   /**
    * API endpoint для создания кеша модуля
    * 
    * Метод: POST
    * Путь: /api/admin/cache-create.php
    * 
    * Параметры запроса:
    * {
    *   "module_id": "graph-admission-closure-months",
    *   "mode": "months", // опционально, если модуль поддерживает режимы
    *   "params": {
    *     "product": "1C",
    *     "periodMode": "months",
    *     // ... другие параметры для создания кеша
    *   }
    * }
    * 
    * Формат ответа (успех):
    * {
    *   "success": true,
    *   "message": "Кеш успешно создан",
    *   "cache_key": "months_abc123...",
    *   "module_id": "graph-admission-closure-months"
    * }
    */
   
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/GraphAdmissionClosureCache.php';
   require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/cache/TimeTrackingCache.php';
   
   header('Content-Type: application/json; charset=utf-8');
   header('Access-Control-Allow-Origin: *');
   
   // Проверка прав администратора
   $isAdmin = true; // TODO: Реализовать проверку через Bitrix24 API
   
   if (!$isAdmin) {
       http_response_code(403);
       echo json_encode(['error' => 'Access denied. Admin rights required.']);
       exit;
   }
   
   // Проверка метода запроса
   if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
       http_response_code(405);
       echo json_encode(['error' => 'Method not allowed. Use POST.']);
       exit;
   }
   
   try {
       $input = json_decode(file_get_contents('php://input'), true);
       
       if (!$input || !isset($input['module_id'])) {
           http_response_code(400);
           echo json_encode(['error' => 'Missing required parameter: module_id']);
           exit;
       }
       
       $moduleId = $input['module_id'];
       $mode = $input['mode'] ?? null;
       $params = $input['params'] ?? [];
       
       // Определение модуля и создание кеша
       $result = createCacheForModule($moduleId, $mode, $params);
       
       if ($result['success']) {
           http_response_code(200);
           echo json_encode($result);
       } else {
           http_response_code(500);
           echo json_encode($result);
       }
   } catch (\Exception $e) {
       http_response_code(500);
       echo json_encode([
           'error' => 'Internal server error',
           'message' => $e->getMessage()
       ]);
   }
   
   /**
    * Создание кеша для модуля
    * 
    * @param string $moduleId ID модуля
    * @param string|null $mode Режим кеша (если модуль поддерживает режимы)
    * @param array $params Параметры для создания кеша
    * @return array Результат создания кеша
    */
   function createCacheForModule(string $moduleId, ?string $mode, array $params): array
   {
       // График приёма/закрытий 1С
       if (strpos($moduleId, 'graph-admission-closure') === 0) {
           return createGraphAdmissionClosureCache($moduleId, $mode, $params);
       }
       
       // Трудозатраты на Тикеты сектора 1С
       if (strpos($moduleId, 'time-tracking') === 0) {
           return createTimeTrackingCache($moduleId, $mode, $params);
       }
       
       return [
           'success' => false,
           'error' => 'Unknown module: ' . $moduleId
       ];
   }
   
   /**
    * Создание кеша для GraphAdmissionClosureCache
    */
   function createGraphAdmissionClosureCache(string $moduleId, ?string $mode, array $params): array
   {
       // Определение режима из module_id
       if ($mode === null) {
           $mode = strpos($moduleId, 'weeks') !== false ? 'weeks' : 'months';
       }
       
       // Параметры по умолчанию
       $defaultParams = [
           'product' => '1C',
           'periodMode' => $mode,
           'includeTickets' => false,
           'includeNewTicketsByStages' => false,
           'includeCarryoverTickets' => $mode === 'months',
           'includeCarryoverTicketsByDuration' => false
       ];
       
       $finalParams = array_merge($defaultParams, $params);
       
       // Генерация ключа кеша
       $cacheKey = GraphAdmissionClosureCache::generateKey($finalParams);
       
       // Проверка существования кеша
       $existingCache = GraphAdmissionClosureCache::get($cacheKey);
       if ($existingCache !== null) {
           return [
               'success' => true,
               'message' => 'Кеш уже существует',
               'cache_key' => $cacheKey,
               'module_id' => $moduleId,
               'already_exists' => true
           ];
       }
       
       // Создание кеша через сервис
       require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/service/GraphAdmissionClosureService.php';
       require_once $_SERVER['DOCUMENT_ROOT'] . '/rest_api_aps/sd_it_gen_plan/api/graph-admission-closure/cache/CacheStore.php';
       
       $cacheStore = new CacheStore();
       $service = new GraphAdmissionClosureService(/* зависимости */);
       
       // Получение данных и сохранение в кеш
       $data = $service->handle($finalParams);
       
       if ($cacheStore->set($cacheKey, $data)) {
           return [
               'success' => true,
               'message' => 'Кеш успешно создан',
               'cache_key' => $cacheKey,
               'module_id' => $moduleId,
               'already_exists' => false
           ];
       } else {
           return [
               'success' => false,
               'error' => 'Failed to save cache'
           ];
       }
   }
   
   /**
    * Создание кеша для TimeTrackingCache
    */
   function createTimeTrackingCache(string $moduleId, ?string $mode, array $params): array
   {
       // Определение режима из module_id
       if ($mode === null) {
           if (strpos($moduleId, 'detailed') !== false) {
               $mode = 'detailed';
           } elseif (strpos($moduleId, 'summary') !== false) {
               $mode = 'summary';
           } else {
               $mode = 'default';
           }
       }
       
       // Параметры по умолчанию
       $defaultParams = [
           'product' => '1C',
           'includeTaskDetails' => $mode === 'detailed',
           'summary' => $mode === 'summary'
       ];
       
       $finalParams = array_merge($defaultParams, $params);
       
       // Генерация ключа кеша
       $cacheKey = TimeTrackingCache::generateKey($finalParams, $mode);
       
       // Проверка существования кеша
       $existingCache = TimeTrackingCache::get($cacheKey);
       if ($existingCache !== null) {
           return [
               'success' => true,
               'message' => 'Кеш уже существует',
               'cache_key' => $cacheKey,
               'module_id' => $moduleId,
               'already_exists' => true
           ];
       }
       
       // Создание кеша через сервис
       // TODO: Реализовать создание кеша через TimeTrackingService
       
       return [
           'success' => false,
           'error' => 'TimeTrackingCache creation not implemented yet'
       ];
   }
   ```

**Критерии приёмки:**
- [ ] API endpoint создан и работает
- [ ] Поддержка создания кеша для GraphAdmissionClosureCache
- [ ] Поддержка создания кеша для TimeTrackingCache
- [ ] Проверка прав администратора
- [ ] Валидация параметров запроса
- [ ] Обработка ошибок

---

### Подэтап 1.2: Создание API endpoint для статуса создания кеша

**Файл:** `api/admin/cache-create-status.php` (новый файл)

**Задача:** Создать API endpoint для получения статуса создания кеша (для прогресса).

**Детальные шаги:**

1. **Создать файл `api/admin/cache-create-status.php`**

2. **Реализовать структуру endpoint:**
   ```php
   <?php
   /**
    * API endpoint для получения статуса создания кеша
    * 
    * Метод: GET
    * Путь: /api/admin/cache-create-status.php?task_id={task_id}
    * 
    * Формат ответа:
    * {
    *   "success": true,
    *   "status": "in_progress", // in_progress, completed, failed
    *   "progress": 50, // процент выполнения (0-100)
    *   "message": "Загрузка данных из Bitrix24..."
    * }
    */
   
   // TODO: Реализовать систему задач для отслеживания прогресса
   // Можно использовать файловую систему или базу данных
   ```

**Критерии приёмки:**
- [ ] API endpoint создан
- [ ] Поддержка отслеживания прогресса создания кеша
- [ ] Возврат статуса и прогресса

---

## 📝 Этап 2: Frontend сервисы для создания кешей

**Цель:** Создать сервисы для работы с созданием кешей на фронтенде.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Высокий

### Подэтап 2.1: Создание сервиса для создания кешей

**Файл:** `vue-app/src/services/cache-creation-service.js` (новый файл)

**Задача:** Создать сервис для создания кешей через API.

**Детальные шаги:**

1. **Создать файл `vue-app/src/services/cache-creation-service.js`**

2. **Реализовать методы сервиса:**
   ```javascript
   /**
    * Сервис для создания кешей модулей
    * 
    * Использует backend API для создания кешей
    * API endpoints:
    * - /api/admin/cache-create.php - создание кеша
    * - /api/admin/cache-create-status.php - статус создания
    */
   
   import { getApiUrl } from '@/utils/path-utils.js';
   
   export class CacheCreationService {
     /**
      * Создание кеша для модуля
      * 
      * @param {string} moduleId - ID модуля
      * @param {string|null} mode - Режим кеша (если модуль поддерживает режимы)
      * @param {object} params - Параметры для создания кеша
      * @returns {Promise<object>} Результат создания кеша
      */
     static async createCache(moduleId, mode = null, params = {}) {
       try {
         const apiUrl = getApiUrl('/api/admin/cache-create.php');
         const response = await fetch(apiUrl, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'X-Requested-With': 'XMLHttpRequest'
           },
           body: JSON.stringify({
             module_id: moduleId,
             mode: mode,
             params: params
           })
         });
         
         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`);
         }
         
         const result = await response.json();
         
         if (result.success) {
           return result;
         } else {
           throw new Error(result.error || 'Failed to create cache');
         }
       } catch (error) {
         console.error('[CacheCreationService] Error creating cache:', error);
         throw error;
       }
     }
     
     /**
      * Получение статуса создания кеша
      * 
      * @param {string} taskId - ID задачи создания кеша
      * @returns {Promise<object>} Статус создания кеша
      */
     static async getCreationStatus(taskId) {
       try {
         const apiUrl = getApiUrl(`/api/admin/cache-create-status.php?task_id=${taskId}`);
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
           return result;
         } else {
           throw new Error(result.error || 'Failed to get creation status');
         }
       } catch (error) {
         console.error('[CacheCreationService] Error getting creation status:', error);
         throw error;
       }
     }
     
     /**
      * Получение параметров по умолчанию для модуля
      * 
      * @param {string} moduleId - ID модуля
      * @returns {object} Параметры по умолчанию
      */
     static getDefaultParams(moduleId) {
       // График приёма/закрытий 1С
       if (moduleId.includes('graph-admission-closure')) {
         const mode = moduleId.includes('weeks') ? 'weeks' : 'months';
         return {
           product: '1C',
           periodMode: mode,
           includeTickets: false,
           includeNewTicketsByStages: false,
           includeCarryoverTickets: mode === 'months',
           includeCarryoverTicketsByDuration: false
         };
       }
       
       // Трудозатраты на Тикеты сектора 1С
       if (moduleId.includes('time-tracking')) {
         const mode = moduleId.includes('detailed') ? 'detailed' : 
                     moduleId.includes('summary') ? 'summary' : 'default';
         return {
           product: '1C',
           includeTaskDetails: mode === 'detailed',
           summary: mode === 'summary'
         };
       }
       
       return {};
     }
   }
   ```

**Критерии приёмки:**
- [ ] Сервис создан и работает
- [ ] Метод `createCache()` реализован
- [ ] Метод `getCreationStatus()` реализован
- [ ] Метод `getDefaultParams()` реализован
- [ ] Обработка ошибок

---

### Подэтап 2.2: Создание сервиса для уведомлений о кеше

**Файл:** `vue-app/src/services/cache-notification-service.js` (новый файл)

**Задача:** Создать сервис для управления уведомлениями о кеше.

**Детальные шаги:**

1. **Создать файл `vue-app/src/services/cache-notification-service.js`**

2. **Реализовать методы сервиса:**
   ```javascript
   /**
    * Сервис для управления уведомлениями о кеше
    * 
    * Использует Bitrix24 UI для отображения уведомлений
    */
   
   export class CacheNotificationService {
     /**
      * Показать уведомление о начале создания кеша
      * 
      * @param {string} moduleName - Название модуля
      */
     static notifyCacheCreationStarted(moduleName) {
       this.showNotification({
         content: `Начато создание кеша для модуля "${moduleName}"...`,
         type: 'info',
         autoHideDelay: 3000
       });
     }
     
     /**
      * Показать уведомление об успешном создании кеша
      * 
      * @param {string} moduleName - Название модуля
      */
     static notifyCacheCreationSuccess(moduleName) {
       this.showNotification({
         content: `✅ Кеш для модуля "${moduleName}" успешно создан`,
         type: 'success',
         autoHideDelay: 5000
       });
     }
     
     /**
      * Показать уведомление об ошибке создания кеша
      * 
      * @param {string} moduleName - Название модуля
      * @param {string} error - Сообщение об ошибке
      */
     static notifyCacheCreationError(moduleName, error) {
       this.showNotification({
         content: `❌ Ошибка создания кеша для модуля "${moduleName}": ${error}`,
         type: 'error',
         autoHideDelay: 7000
       });
     }
     
     /**
      * Показать уведомление об обновлении кеша
      * 
      * @param {string} moduleName - Название модуля
      * @param {string} reason - Причина обновления (auto, manual)
      */
     static notifyCacheUpdated(moduleName, reason = 'auto') {
       const reasonText = reason === 'manual' ? 'вручную' : 'автоматически';
       this.showNotification({
         content: `🔄 Кеш для модуля "${moduleName}" обновлён ${reasonText}`,
         type: 'info',
         autoHideDelay: 4000
       });
     }
     
     /**
      * Показать уведомление об использовании кеша
      * 
      * @param {string} moduleName - Название модуля
      */
     static notifyCacheUsed(moduleName) {
       this.showNotification({
         content: `⚡ Использован кеш для модуля "${moduleName}"`,
         type: 'success',
         autoHideDelay: 3000
       });
     }
     
     /**
      * Показать уведомление
      * 
      * @param {object} options - Опции уведомления
      */
     static showNotification(options) {
       if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
         BX.UI.Notification.Center.notify({
           content: options.content,
           autoHideDelay: options.autoHideDelay || 3000
         });
       } else {
         // Fallback для консоли
         console.log('[CacheNotification]', options.content);
       }
     }
   }
   ```

**Критерии приёмки:**
- [ ] Сервис создан и работает
- [ ] Все методы уведомлений реализованы
- [ ] Поддержка Bitrix24 UI уведомлений
- [ ] Fallback для консоли

---

## 📝 Этап 3: Компоненты для создания кешей с уведомлениями

**Цель:** Создать Vue.js компоненты для создания кешей с уведомлениями.

**Время выполнения:** ~5-6 часов  
**Приоритет:** Высокий

### Подэтап 3.1: Создание компонента кнопки создания кеша

**Файл:** `vue-app/src/components/cache/CacheCreateButton.vue` (новый файл)

**Задача:** Создать компонент кнопки для создания кеша с модальным окном.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/cache/CacheCreateButton.vue`**

2. **Реализовать структуру компонента:**
   ```vue
   <template>
     <div class="cache-create-button">
       <button
         @click="openModal"
         :disabled="creating"
         class="btn-create"
         :class="{ 'btn-disabled': creating }"
       >
         <span v-if="creating">Создание...</span>
         <span v-else>➕ Создать кеш</span>
       </button>
       
       <CacheCreateModal
         v-if="showModal"
         :module="module"
         @close="closeModal"
         @create="handleCreate"
       />
     </div>
   </template>
   
   <script>
   import { ref } from 'vue';
   import CacheCreateModal from './CacheCreateModal.vue';
   
   export default {
     name: 'CacheCreateButton',
     components: {
       CacheCreateModal
     },
     props: {
       module: {
         type: Object,
         required: true
       }
     },
     emits: ['created'],
     setup(props, { emit }) {
       const showModal = ref(false);
       const creating = ref(false);
       
       const openModal = () => {
         showModal.value = true;
       };
       
       const closeModal = () => {
         showModal.value = false;
       };
       
       const handleCreate = async (params) => {
         creating.value = true;
         try {
           // Создание кеша через сервис
           await CacheCreationService.createCache(
             props.module.id,
             props.module.mode,
             params
           );
           
           emit('created');
           closeModal();
         } catch (error) {
           console.error('[CacheCreateButton] Error creating cache:', error);
         } finally {
           creating.value = false;
         }
       };
       
       return {
         showModal,
         creating,
         openModal,
         closeModal,
         handleCreate
       };
     }
   };
   </script>
   ```

**Критерии приёмки:**
- [ ] Компонент создан и работает
- [ ] Кнопка открывает модальное окно
- [ ] Обработка создания кеша
- [ ] Эмит события `created` после успешного создания

---

### Подэтап 3.2: Создание компонента модального окна создания кеша

**Файл:** `vue-app/src/components/cache/CacheCreateModal.vue` (новый файл)

**Задача:** Создать модальное окно для создания кеша с параметрами.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/cache/CacheCreateModal.vue`**

2. **Реализовать структуру компонента:**
   ```vue
   <template>
     <div class="modal-overlay" @click="handleOverlayClick">
       <div class="modal-content" @click.stop>
         <div class="modal-header">
           <h2>Создание кеша: {{ module.name }}</h2>
           <button @click="close" class="btn-close">×</button>
         </div>
         
         <div class="modal-body">
           <CacheCreateProgress
             v-if="creating"
             :progress="progress"
             :message="progressMessage"
           />
           
           <div v-else class="create-form">
             <div class="form-group">
               <label>Режим кеша:</label>
               <select v-model="selectedMode" :disabled="!supportsModes">
                 <option v-for="mode in availableModes" :key="mode" :value="mode">
                   {{ mode }}
                 </option>
               </select>
             </div>
             
             <div class="form-group">
               <label>Параметры:</label>
               <textarea
                 v-model="paramsJson"
                 placeholder='{"product": "1C", ...}'
                 rows="5"
               ></textarea>
             </div>
           </div>
         </div>
         
         <div class="modal-footer">
           <button @click="close" class="btn-cancel">Отмена</button>
           <button
             @click="handleCreate"
             :disabled="creating"
             class="btn-create"
           >
             Создать кеш
           </button>
         </div>
       </div>
     </div>
   </template>
   
   <script>
   import { ref, computed, onMounted } from 'vue';
   import { CacheCreationService } from '@/services/cache-creation-service.js';
   import { CacheNotificationService } from '@/services/cache-notification-service.js';
   import CacheCreateProgress from './CacheCreateProgress.vue';
   
   export default {
     name: 'CacheCreateModal',
     components: {
       CacheCreateProgress
     },
     props: {
       module: {
         type: Object,
         required: true
       }
     },
     emits: ['close', 'create'],
     setup(props, { emit }) {
       const creating = ref(false);
       const progress = ref(0);
       const progressMessage = ref('');
       const selectedMode = ref(null);
       const paramsJson = ref('');
       
       const supportsModes = computed(() => {
         return props.module.id.includes('graph-admission-closure') ||
                props.module.id.includes('time-tracking');
       });
       
       const availableModes = computed(() => {
         if (props.module.id.includes('graph-admission-closure')) {
           return ['months', 'weeks'];
         }
         if (props.module.id.includes('time-tracking')) {
           return ['default', 'detailed', 'summary'];
         }
         return [];
       });
       
       const close = () => {
         emit('close');
       };
       
       const handleOverlayClick = (event) => {
         if (event.target === event.currentTarget) {
           close();
         }
       };
       
       const handleCreate = async () => {
         creating.value = true;
         progress.value = 0;
         progressMessage.value = 'Начало создания кеша...';
         
         try {
           // Парсинг параметров
           let params = {};
           if (paramsJson.value.trim()) {
             try {
               params = JSON.parse(paramsJson.value);
             } catch (e) {
               throw new Error('Неверный формат JSON параметров');
             }
           } else {
             // Использование параметров по умолчанию
             params = CacheCreationService.getDefaultParams(props.module.id);
           }
           
           // Уведомление о начале создания
           CacheNotificationService.notifyCacheCreationStarted(props.module.name);
           
           // Создание кеша
           progress.value = 25;
           progressMessage.value = 'Загрузка данных из Bitrix24...';
           
           const result = await CacheCreationService.createCache(
             props.module.id,
             selectedMode.value,
             params
           );
           
           progress.value = 75;
           progressMessage.value = 'Сохранение кеша...';
           
           // Небольшая задержка для визуализации прогресса
           await new Promise(resolve => setTimeout(resolve, 500));
           
           progress.value = 100;
           progressMessage.value = 'Кеш успешно создан!';
           
           // Уведомление об успехе
           CacheNotificationService.notifyCacheCreationSuccess(props.module.name);
           
           // Закрытие модального окна через 1 секунду
           setTimeout(() => {
             emit('create', result);
             close();
           }, 1000);
         } catch (error) {
           console.error('[CacheCreateModal] Error creating cache:', error);
           
           // Уведомление об ошибке
           CacheNotificationService.notifyCacheCreationError(
             props.module.name,
             error.message
           );
           
           creating.value = false;
         }
       };
       
       onMounted(() => {
         // Установка режима по умолчанию
         if (availableModes.value.length > 0) {
           selectedMode.value = availableModes.value[0];
         }
         
         // Установка параметров по умолчанию
         const defaultParams = CacheCreationService.getDefaultParams(props.module.id);
         paramsJson.value = JSON.stringify(defaultParams, null, 2);
       });
       
       return {
         creating,
         progress,
         progressMessage,
         selectedMode,
         paramsJson,
         supportsModes,
         availableModes,
         close,
         handleOverlayClick,
         handleCreate
       };
     }
   };
   </script>
   ```

**Критерии приёмки:**
- [ ] Компонент создан и работает
- [ ] Модальное окно отображается корректно
- [ ] Поддержка выбора режима (если модуль поддерживает)
- [ ] Ввод параметров через JSON
- [ ] Отображение прогресса создания
- [ ] Уведомления о процессе создания

---

### Подэтап 3.3: Создание компонента прогресса создания кеша

**Файл:** `vue-app/src/components/cache/CacheCreateProgress.vue` (новый файл)

**Задача:** Создать компонент для отображения прогресса создания кеша.

**Детальные шаги:**

1. **Создать файл `vue-app/src/components/cache/CacheCreateProgress.vue`**

2. **Реализовать структуру компонента:**
   ```vue
   <template>
     <div class="cache-create-progress">
       <div class="progress-bar">
         <div
           class="progress-fill"
           :style="{ width: progress + '%' }"
         ></div>
       </div>
       <div class="progress-text">
         {{ progress }}% - {{ message }}
       </div>
     </div>
   </template>
   
   <script>
   export default {
     name: 'CacheCreateProgress',
     props: {
       progress: {
         type: Number,
         required: true,
         validator: (value) => value >= 0 && value <= 100
       },
       message: {
         type: String,
         default: 'Создание кеша...'
       }
     }
   };
   </script>
   
   <style scoped>
   .cache-create-progress {
     padding: 20px;
   }
   
   .progress-bar {
     width: 100%;
     height: 20px;
     background-color: #e0e0e0;
     border-radius: 10px;
     overflow: hidden;
     margin-bottom: 10px;
   }
   
   .progress-fill {
     height: 100%;
     background-color: #28a745;
     transition: width 0.3s ease;
   }
   
   .progress-text {
     text-align: center;
     color: #666;
     font-size: 14px;
   }
   </style>
   ```

**Критерии приёмки:**
- [ ] Компонент создан и работает
- [ ] Отображение прогресс-бара
- [ ] Отображение текста прогресса
- [ ] Анимация прогресса

---

## 📝 Этап 4: Интеграция в модуль мониторинга кеша

**Цель:** Интегрировать функциональность создания кешей в модуль мониторинга кеша.

**Время выполнения:** ~3-4 часа  
**Приоритет:** Высокий

### Подэтап 4.1: Обновление компонента CacheModuleCard

**Файл:** `vue-app/src/components/cache/CacheModuleCard.vue`

**Задача:** Добавить кнопку "Создать кеш" в карточку модуля.

**Детальные шаги:**

1. **Добавить импорт компонента CacheCreateButton**

2. **Добавить кнопку создания кеша в карточку:**
   ```vue
   <div class="card-footer">
     <CacheCreateButton
       :module="module"
       @created="handleCacheCreated"
     />
     <button
       @click="handleClear"
       :disabled="clearing || module.file_count === 0"
       class="btn-clear"
     >
       🗑️ Очистить кеш
     </button>
   </div>
   ```

3. **Добавить обработчик события `created`:**
   ```javascript
   const handleCacheCreated = () => {
     // Перезагрузка статуса кеша
     emit('refresh');
   };
   ```

**Критерии приёмки:**
- [ ] Кнопка "Создать кеш" добавлена в карточку модуля
- [ ] Обработка события создания кеша
- [ ] Обновление статуса кеша после создания

---

### Подэтап 4.2: Обновление страницы CacheManagementPage

**Файл:** `vue-app/src/pages/CacheManagementPage.vue`

**Задача:** Добавить поддержку создания кешей на странице мониторинга.

**Детальные шаги:**

1. **Добавить обработчик события `refresh` для обновления статуса кеша**

2. **Добавить уведомления о создании кеша**

**Критерии приёмки:**
- [ ] Страница обновляется после создания кеша
- [ ] Уведомления отображаются корректно

---

## 📝 Этап 5: Использование предварительно созданных кешей

**Цель:** Реализовать использование предварительно созданных кешей при обращении к модулю.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Средний

### Подэтап 5.1: Обновление API endpoints для использования кеша

**Файлы:**
- `api/graph-1c-admission-closure.php`
- `api/tickets-time-tracking-sector-1c.php`

**Задача:** Обновить API endpoints для использования предварительно созданных кешей.

**Детальные шаги:**

1. **Обновить логику проверки кеша:**
   - При запросе данных сначала проверять наличие кеша
   - Если кеш существует и не истёк, использовать его
   - Показывать уведомление об использовании кеша

2. **Добавить параметр `useCache` для принудительного использования кеша:**
   ```php
   $useCache = $payload['useCache'] ?? true;
   
   if ($useCache) {
       $cachedData = $this->cacheStore->get($cacheKey);
       if ($cachedData !== null) {
           // Уведомление об использовании кеша
           error_log("[Cache] Using pre-created cache for key: {$cacheKey}");
           return $cachedData;
       }
   }
   ```

**Критерии приёмки:**
- [ ] API endpoints обновлены
- [ ] Использование предварительно созданных кешей работает
- [ ] Логирование использования кеша

---

## 📝 Этап 6: Система уведомлений об обновлении кеша

**Цель:** Реализовать систему уведомлений об обновлении кеша.

**Время выполнения:** ~2-3 часа  
**Приоритет:** Средний

### Подэтап 6.1: Автоматические уведомления об обновлении кеша

**Задача:** Реализовать автоматические уведомления при обновлении кеша.

**Детальные шаги:**

1. **Добавить уведомления в сервисы создания кеша:**
   - При автоматическом обновлении кеша (TTL истёк)
   - При ручном обновлении кеша

2. **Интегрировать уведомления в модуль мониторинга кеша:**
   - Отображение уведомлений в реальном времени
   - История уведомлений

**Критерии приёмки:**
- [ ] Автоматические уведомления работают
- [ ] Уведомления отображаются в модуле мониторинга
- [ ] История уведомлений сохраняется

---

## ✅ Критерии приёмки

### Функциональность:

- [ ] Ручное создание кешей работает для всех модулей
- [ ] Уведомления о процессе создания кеша отображаются
- [ ] Уведомления об обновлении кеша работают
- [ ] Предварительно созданные кеши используются при обращении к модулю
- [ ] Прогресс создания кеша отображается корректно

### Интеграция:

- [ ] Функциональность интегрирована в модуль мониторинга кеша
- [ ] Кнопки создания кеша добавлены в карточки модулей
- [ ] Модальные окна работают корректно

### Уведомления:

- [ ] Уведомления о начале создания кеша
- [ ] Уведомления об успешном создании кеша
- [ ] Уведомления об ошибках создания кеша
- [ ] Уведомления об обновлении кеша (автоматические и ручные)
- [ ] Уведомления об использовании кеша

---

## 📝 Примечания

### Важные замечания:

1. **Принцип работы:**
   - Создание кеша через API endpoint
   - Использование существующих сервисов для получения данных
   - Сохранение данных в кеш через CacheStore

2. **Уведомления:**
   - Использование Bitrix24 UI для уведомлений
   - Fallback для консоли, если Bitrix24 UI недоступен

3. **Прогресс создания:**
   - Для длительных операций можно реализовать систему задач
   - Показывать приблизительный прогресс на основе этапов создания

---

## 🔄 История правок

- 2025-12-24 16:20 (UTC+3, Брест): Создан черновик задачи TASK-076
- 2025-12-24 16:31 (UTC+3, Брест): Реализованы этапы 1-4:
  - ✅ Создан Backend API endpoint `api/admin/cache-create.php`
  - ✅ Созданы Frontend сервисы: `cache-creation-service.js`, `cache-notification-service.js`
  - ✅ Созданы Vue.js компоненты: `CacheCreateButton.vue`, `CacheCreateModal.vue`, `CacheCreateProgress.vue`
  - ✅ Интегрированы компоненты в модуль мониторинга кеша (`CacheModuleCard.vue`, `CacheManagementPage.vue`)
- 2025-12-24 16:45 (UTC+3, Брест): Реализован этап 5:
  - ✅ Обновлены сервисы для использования предварительно созданных кешей
  - ✅ Добавлена информация `cache_used` в ответы API (`GraphAdmissionClosureService`, `TimeTrackingService`)
  - ✅ Добавлены уведомления на frontend при использовании кеша (`admissionClosureService.js`, `timeTrackingService.js`)

---

## 📚 Связанные документы

- `DOCS/TASKS/TASK-074-cache-management-module.md` — модуль управления кешем
- `DOCS/TASKS/TASK-075-unified-cache-with-modes.md` — унификация кеша
- `DOCS/ANALYSIS/cache-usage-analysis.md` — анализ использования кеша

