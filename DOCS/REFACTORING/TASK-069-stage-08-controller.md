# TASK-069: Этап 8 — Создание контроллера

**Дата создания:** 2025-12-23 18:18 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Планирование  
**Исполнители:** Рефактор-менеджер, Программист

---

## 📋 Цель этапа

Создать контроллер для обработки HTTP-запросов, валидации параметров и формирования ответов.

---

## 🔍 Задачи этапа

### 1. Создание TimeTrackingController

#### 1.1. Файл: `api/tickets-time-tracking-sector-1c/controller/TimeTrackingController.php`

**Контроллер для обработки HTTP-запросов:**

```php
<?php

namespace TimeTracking\Controller;

use TimeTracking\Service\TimeTrackingService;
use TimeTracking\Util\ResponseHelper;

/**
 * Контроллер для обработки HTTP-запросов учёта времени
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
            
            // Валидация параметров
            $this->validateRequest($params);
            
            // Получение данных через сервис
            $result = $this->service->getTimeTrackingData($params);
            
            // Отправка успешного ответа
            ResponseHelper::jsonResponse($result);
            
        } catch (\InvalidArgumentException $e) {
            // Ошибка валидации
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
        
        // Валидация includeTaskDetails
        if (isset($params['includeTaskDetails'])) {
            if (!is_bool($params['includeTaskDetails'])) {
                throw new \InvalidArgumentException('includeTaskDetails must be a boolean');
            }
        }
        
        // Валидация taskIds
        if (isset($params['taskIds'])) {
            if (!is_array($params['taskIds'])) {
                throw new \InvalidArgumentException('taskIds must be an array');
            }
            // Проверка, что все элементы - числа
            foreach ($params['taskIds'] as $taskId) {
                if (!is_numeric($taskId) || (int)$taskId <= 0) {
                    throw new \InvalidArgumentException('All taskIds must be positive integers');
                }
            }
        }
        
        // Валидация page
        if (isset($params['page'])) {
            if (!is_numeric($params['page']) || (int)$params['page'] < 1) {
                throw new \InvalidArgumentException('page must be a positive integer');
            }
        }
        
        // Валидация perPage
        if (isset($params['perPage'])) {
            if (!is_numeric($params['perPage']) || (int)$params['perPage'] < 1) {
                throw new \InvalidArgumentException('perPage must be a positive integer');
            }
        }
    }
}
```

---

## 📝 Структура файлов после этапа 8

```
api/
└── tickets-time-tracking-sector-1c/
    ├── controller/
    │   └── TimeTrackingController.php  # ✅ Реализовано
    └── ...
```

---

## ✅ Критерии приёмки этапа

- [ ] Класс `TimeTrackingController` создан
- [ ] Метод `handleRequest()` реализован
- [ ] Метод `validateRequest()` реализован
- [ ] Валидация всех параметров реализована:
  - [ ] `product` (обязательно '1C')
  - [ ] `weekStartUtc` (опционально, валидная дата)
  - [ ] `weekEndUtc` (опционально, валидная дата)
  - [ ] `includeTaskDetails` (опционально, boolean)
  - [ ] `taskIds` (опционально, массив положительных чисел)
  - [ ] `page` (опционально, положительное число)
  - [ ] `perPage` (опционально, положительное число)
- [ ] Обработка ошибок реализована
- [ ] Логирование ошибок добавлено
- [ ] Все методы протестированы
- [ ] Код соответствует стандартам PSR-12

---

## 🧪 Тестирование

### Unit-тесты для TimeTrackingController

```php
<?php
// tests/TimeTrackingControllerTest.php

use TimeTracking\Controller\TimeTrackingController;
use TimeTracking\Service\TimeTrackingService;
use TimeTracking\Util\ResponseHelper;

// Тест handleRequest() с валидными параметрами
// Тест handleRequest() с невалидным product
// Тест handleRequest() с невалидными датами
// Тест handleRequest() с ошибкой сервиса
// Тест validateRequest() с различными сценариями
```

**Примечание:** Тесты требуют мокирования `TimeTrackingService` и `ResponseHelper`

---

## 🔗 Связанные документы

- **Основной план:** `DOCS/REFACTORING/TASK-069-refactoring-plan-tickets-time-tracking.md`
- **Предыдущий этап:** `DOCS/REFACTORING/TASK-069-stage-07-service.md`
- **Следующий этап:** `DOCS/REFACTORING/TASK-069-stage-09-integration.md`

---

## ⏱️ Оценка времени

**2-3 часа**

- Создание контроллера: 1 час
- Реализация валидации: 1 час
- Написание тестов: 1 час
- Тестирование и проверка: 30 минут

---

**История правок:**
- 2025-12-23 18:18 (UTC+3, Брест): Создан документ этапа 8


