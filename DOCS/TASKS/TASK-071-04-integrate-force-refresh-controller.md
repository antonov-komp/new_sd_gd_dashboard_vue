# TASK-071-04: Интеграция параметра forceRefresh в TimeTrackingController

**Дата создания:** 2025-12-23 18:03 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Backend Developer (PHP)  
**Родительская задача:** [TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"](./TASK-071-cache-time-tracking-sector-1c.md)  
**Подзадача:** Этап 4 из TASK-071

---

## 📋 Описание

Добавить обработку параметра `forceRefresh` в `TimeTrackingController` для принудительного обновления кеша. Параметр должен позволять клиентам запрашивать свежие данные, пропуская проверку кеша.

**Цель:** Добавить поддержку параметра `forceRefresh` в контроллере для управления кешированием.

---

## 🎯 Контекст

### Текущее состояние:

- `TimeTrackingService` поддерживает параметр `forceRefresh` (TASK-071-03)
- `TimeTrackingController` не обрабатывает параметр `forceRefresh`
- Клиенты не могут принудительно обновить кеш

### Требуется:

- Добавить обработку параметра `forceRefresh` в `TimeTrackingController`
- Добавить валидацию параметра `forceRefresh`
- Передать параметр в `TimeTrackingService`

---

## 🏗️ Модули и компоненты

### Изменяемые файлы:

- `api/tickets-time-tracking-sector-1c/controller/TimeTrackingController.php` — обработка параметра `forceRefresh`

---

## 📦 Зависимости

- **От задач:** 
  - TASK-071-03: Интеграция кеша в TimeTrackingService (должна быть завершена)
  - TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"
- **От модулей:** 
  - Класс: `TimeTrackingController` в `api/tickets-time-tracking-sector-1c/controller/TimeTrackingController.php`
  - Класс: `TimeTrackingService` в `api/tickets-time-tracking-sector-1c/service/TimeTrackingService.php`
- **От библиотек:** 
  - PHP 8.4+

---

## 🎯 Ступенчатые подзадачи

### Подзадача 4.1: Добавление обработки параметра forceRefresh в handleRequest()

**Цель:** Добавить обработку параметра `forceRefresh` в методе `handleRequest()`.

**Шаги:**

1. **Добавить обработку параметра `forceRefresh` после парсинга тела запроса**
   ```php
   // Парсинг тела запроса
   $params = ResponseHelper::parseJsonBody();
   
   // TASK-071-04: Обработка параметра forceRefresh
   if (isset($params['forceRefresh'])) {
       $params['forceRefresh'] = (bool)$params['forceRefresh'];
   }
   ```

2. **Разместить обработку перед валидацией**
   - Обработка должна быть после парсинга тела запроса
   - Обработка должна быть перед валидацией параметров

**Критерии приёмки:**
- [ ] Параметр `forceRefresh` обрабатывается в `handleRequest()`
- [ ] Параметр преобразуется в boolean
- [ ] Обработка размещена в правильном месте

---

### Подзадача 4.2: Добавление валидации параметра forceRefresh

**Цель:** Добавить валидацию параметра `forceRefresh` в методе `validateRequest()`.

**Шаги:**

1. **Добавить валидацию `forceRefresh` в метод `validateRequest()`**
   ```php
   protected function validateRequest(array $params): void
   {
       // ... существующая валидация ...
       
       // TASK-071-04: Валидация forceRefresh
       if (isset($params['forceRefresh']) && !is_bool($params['forceRefresh'])) {
           throw new \InvalidArgumentException('forceRefresh must be a boolean');
       }
   }
   ```

2. **Разместить валидацию после существующей валидации**
   - Валидация должна быть в конце метода `validateRequest()`
   - Валидация должна выбрасывать `InvalidArgumentException` при неверном типе

**Критерии приёмки:**
- [ ] Валидация `forceRefresh` добавлена
- [ ] Валидация работает корректно (проверка типа boolean)
- [ ] Валидация выбрасывает исключение при неверном типе

---

## 🔧 Технические требования

### Изменения в TimeTrackingController:

1. **Обновить метод `handleRequest()`:**
   ```php
   public function handleRequest(): void
   {
       try {
           // Парсинг тела запроса
           $params = ResponseHelper::parseJsonBody();
           
           // TASK-071-04: Обработка параметра forceRefresh
           if (isset($params['forceRefresh'])) {
               $params['forceRefresh'] = (bool)$params['forceRefresh'];
           }
           
           // Валидация параметров
           $this->validateRequest($params);
           
           // Получение данных через сервис
           $result = $this->service->getTimeTrackingData($params);
           
           // Отправка успешного ответа
           ResponseHelper::jsonResponse($result);
           
       } catch (\Exception $e) {
           // ... обработка ошибок ...
       }
   }
   ```

2. **Обновить метод `validateRequest()`:**
   ```php
   protected function validateRequest(array $params): void
   {
       // ... существующая валидация ...
       
       // TASK-071-04: Валидация forceRefresh
       if (isset($params['forceRefresh']) && !is_bool($params['forceRefresh'])) {
           throw new \InvalidArgumentException('forceRefresh must be a boolean');
       }
   }
   ```

### Формат параметра forceRefresh:

- **Тип:** boolean
- **Обязательность:** опционально
- **По умолчанию:** false
- **Примеры:**
  ```json
  {
    "product": "1C",
    "forceRefresh": true
  }
  ```

---

## ✅ Критерии приёмки

### Общие критерии:
- [ ] Параметр `forceRefresh` обрабатывается в контроллере
- [ ] Валидация параметра работает корректно
- [ ] Параметр передаётся в сервис
- [ ] Код соответствует стандартам PSR-12
- [ ] Комментарии добавлены с ссылкой на TASK-071-04

### Детальная проверка:

**Проверка обработки в handleRequest():**
```php
// Должна быть обработка параметра forceRefresh
if (isset($params['forceRefresh'])) {
    $params['forceRefresh'] = (bool)$params['forceRefresh'];
}
```

**Проверка валидации:**
```php
// Должна быть валидация параметра forceRefresh
if (isset($params['forceRefresh']) && !is_bool($params['forceRefresh'])) {
    throw new \InvalidArgumentException('forceRefresh must be a boolean');
}
```

---

## 🧪 Тестирование

### Функциональное тестирование:

1. **Тест обработки forceRefresh = true:**
   ```php
   // Запрос с forceRefresh = true
   $requestBody = json_encode([
       'product' => '1C',
       'forceRefresh' => true
   ]);
   
   // Вызвать контроллер
   $controller->handleRequest();
   
   // Проверить, что параметр передан в сервис
   // (проверка через логи или моки)
   ```

2. **Тест обработки forceRefresh = false:**
   ```php
   // Запрос с forceRefresh = false
   $requestBody = json_encode([
       'product' => '1C',
       'forceRefresh' => false
   ]);
   
   // Вызвать контроллер
   $controller->handleRequest();
   
   // Проверить, что параметр передан в сервис
   ```

3. **Тест валидации неверного типа:**
   ```php
   // Запрос с forceRefresh = "true" (строка вместо boolean)
   $requestBody = json_encode([
       'product' => '1C',
       'forceRefresh' => 'true'
   ]);
   
   // Вызвать контроллер
   // Должно быть исключение InvalidArgumentException
   ```

4. **Тест отсутствия параметра:**
   ```php
   // Запрос без forceRefresh
   $requestBody = json_encode([
       'product' => '1C'
   ]);
   
   // Вызвать контроллер
   // Должно работать без ошибок (forceRefresh = false по умолчанию)
   ```

---

## 📝 Примеры кода

### Полный пример изменений в TimeTrackingController:

```php
<?php

namespace TimeTracking\Controller;

use TimeTracking\Service\TimeTrackingService;
use TimeTracking\Util\ResponseHelper;

/**
 * Контроллер для обработки HTTP-запросов учёта времени
 * 
 * @package TimeTracking\Controller
 */
class TimeTrackingController
{
    protected TimeTrackingService $service;
    
    public function __construct(TimeTrackingService $service)
    {
        $this->service = $service;
    }
    
    /**
     * Обработка HTTP-запроса
     * 
     * @return void (отправляет ответ и завершает выполнение)
     */
    public function handleRequest(): void
    {
        try {
            // Парсинг тела запроса
            $params = ResponseHelper::parseJsonBody();
            
            // TASK-071-04: Обработка параметра forceRefresh
            if (isset($params['forceRefresh'])) {
                $params['forceRefresh'] = (bool)$params['forceRefresh'];
            }
            
            // Валидация параметров
            $this->validateRequest($params);
            
            // Получение данных через сервис
            $result = $this->service->getTimeTrackingData($params);
            
            // Отправка успешного ответа
            ResponseHelper::jsonResponse($result);
            
        } catch (\InvalidArgumentException $e) {
            // Ошибка валидации
            error_log("[TimeTrackingController] Validation error: " . $e->getMessage());
            ResponseHelper::errorResponse('invalid_request', $e->getMessage(), 400);
            
        } catch (\Exception $e) {
            // Внутренняя ошибка
            error_log("Exception in TimeTrackingController: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            ResponseHelper::errorResponse(
                'internal_error',
                'An internal error occurred',
                500
            );
        }
    }
    
    /**
     * Валидация параметров запроса
     * 
     * @param array $params Параметры запроса
     * @throws \InvalidArgumentException При невалидных параметрах
     */
    protected function validateRequest(array $params): void
    {
        // Проверка product (обязательно должен быть '1C')
        $product = $params['product'] ?? '1C';
        if ($product !== '1C') {
            throw new \InvalidArgumentException('Only product=1C is supported');
        }
        
        // Валидация weekStartUtc и weekEndUtc (если переданы)
        if (isset($params['weekStartUtc'])) {
            if (!is_string($params['weekStartUtc']) || empty($params['weekStartUtc'])) {
                throw new \InvalidArgumentException('weekStartUtc must be a non-empty string');
            }
            // Проверка формата даты
            if (strtotime($params['weekStartUtc']) === false) {
                throw new \InvalidArgumentException('weekStartUtc must be a valid date string');
            }
        }
        
        if (isset($params['weekEndUtc'])) {
            if (!is_string($params['weekEndUtc']) || empty($params['weekEndUtc'])) {
                throw new \InvalidArgumentException('weekEndUtc must be a non-empty string');
            }
            // Проверка формата даты
            if (strtotime($params['weekEndUtc']) === false) {
                throw new \InvalidArgumentException('weekEndUtc must be a valid date string');
            }
        }
        
        // Если переданы обе даты, проверяем, что start <= end
        if (isset($params['weekStartUtc']) && isset($params['weekEndUtc'])) {
            $start = strtotime($params['weekStartUtc']);
            $end = strtotime($params['weekEndUtc']);
            if ($start > $end) {
                throw new \InvalidArgumentException('weekStartUtc must be less than or equal to weekEndUtc');
            }
        }
        
        // TASK-071-04: Валидация forceRefresh
        if (isset($params['forceRefresh']) && !is_bool($params['forceRefresh'])) {
            throw new \InvalidArgumentException('forceRefresh must be a boolean');
        }
    }
}
```

---

## ⚠️ Потенциальные проблемы и решения

### Проблема 1: Преобразование строки "true"/"false" в boolean

**Проблема:** JSON может содержать строку `"true"` или `"false"` вместо boolean.

**Решение:**
- Использовать `(bool)$params['forceRefresh']` для преобразования
- Это преобразует строку `"true"` в `true`, а строку `"false"` в `false`
- Валидация проверяет, что после преобразования значение является boolean

### Проблема 2: Валидация до преобразования

**Проблема:** Валидация должна проверять тип после преобразования.

**Решение:**
- Преобразование выполняется в `handleRequest()` перед валидацией
- Валидация проверяет тип после преобразования
- Если преобразование не дало boolean, валидация выбросит исключение

---

## 🔗 Связанные документы

- [TASK-071: Реализация кеширования данных для модуля "Трудозатраты на Тикеты сектора 1С"](./TASK-071-cache-time-tracking-sector-1c.md)
- [TASK-071-03: Интеграция кеша в TimeTrackingService](./TASK-071-03-integrate-cache-service.md)

---

## 📊 История правок

- **2025-12-23 18:03 (UTC+3, Брест):** Создана подзадача TASK-071-04 для интеграции параметра forceRefresh в TimeTrackingController

---

**Автор:** Технический писатель  
**Версия документа:** 1.0


