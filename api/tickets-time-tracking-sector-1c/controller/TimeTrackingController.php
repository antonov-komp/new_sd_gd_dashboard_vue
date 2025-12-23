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
        
        // TASK-071-04: Валидация forceRefresh
        if (isset($params['forceRefresh']) && !is_bool($params['forceRefresh'])) {
            throw new \InvalidArgumentException('forceRefresh must be a boolean');
        }
    }
}

