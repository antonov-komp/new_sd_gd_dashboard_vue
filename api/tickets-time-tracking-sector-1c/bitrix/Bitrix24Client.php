<?php

namespace TimeTracking\Bitrix;

/**
 * Клиент для работы с Bitrix24 REST API
 * 
 * Обёртка над CRest с обработкой ошибок и логированием
 * 
 * Документация Bitrix24 REST API:
 * - https://context7.com/bitrix24/rest/
 * - https://apidocs.bitrix24.ru/
 * 
 * @package TimeTracking\Bitrix
 */
class Bitrix24Client
{
    /**
     * Вызов метода Bitrix24 REST API
     * 
     * @param string $method Метод API (например, 'user.get')
     * @param array $params Параметры запроса
     * @return array Ответ от Bitrix24
     * @throws \Exception При ошибке API
     */
    public function call(string $method, array $params = []): array
    {
        $result = \CRest::call($method, $params);
        
        if (isset($result['error'])) {
            $errorMsg = sprintf(
                "Bitrix24 API error (%s): %s",
                $method,
                $result['error_description'] ?? $result['error']
            );
            error_log("[Bitrix24Client] {$errorMsg}");
            throw new \Exception($errorMsg);
        }
        
        return $result;
    }

    /**
     * Батч-вызов методов Bitrix24 REST API
     * 
     * @param array $batchData Массив запросов ['key' => ['method' => '...', 'params' => [...]]]
     * @return array Ответ от Bitrix24
     * @throws \Exception При ошибке API
     */
    public function callBatch(array $batchData): array
    {
        $result = \CRest::callBatch($batchData);
        
        if (isset($result['error'])) {
            $errorMsg = sprintf(
                "Bitrix24 API batch error: %s",
                $result['error_description'] ?? $result['error']
            );
            error_log("[Bitrix24Client] {$errorMsg}");
            throw new \Exception($errorMsg);
        }
        
        return $result;
    }

    /**
     * Получение пользователей
     * 
     * Метод: user.get
     * Документация: https://context7.com/bitrix24/rest/user.get
     * 
     * @param array $filter Фильтр пользователей
     * @param array $select Поля для выборки
     * @param int $start Смещение для пагинации
     * @return array Массив пользователей
     */
    public function getUsers(array $filter = [], array $select = ['ID'], int $start = 0): array
    {
        $result = $this->call('user.get', [
            'filter' => $filter,
            'select' => $select,
            'start' => $start
        ]);
        
        return $result['result'] ?? [];
    }

    /**
     * Получение пользователей с пагинацией
     * 
     * @param array $filter Фильтр пользователей
     * @param array $select Поля для выборки
     * @param int $pageSize Размер страницы
     * @return array Все пользователи
     */
    public function getAllUsers(array $filter = [], array $select = ['ID'], int $pageSize = 50): array
    {
        $allUsers = [];
        $start = 0;
        
        do {
            $users = $this->getUsers($filter, $select, $start);
            $allUsers = array_merge($allUsers, $users);
            $start += $pageSize;
        } while (count($users) === $pageSize);
        
        return $allUsers;
    }

    /**
     * Получение списка задач
     * 
     * Метод: tasks.task.list
     * Документация: https://context7.com/bitrix24/rest/tasks.task.list
     * 
     * @param array $filter Фильтр задач
     * @param array $select Поля для выборки
     * @param int $start Смещение для пагинации
     * @return array Массив задач
     */
    public function getTasks(array $filter = [], array $select = [], int $start = 0): array
    {
        $result = $this->call('tasks.task.list', [
            'filter' => $filter,
            'select' => $select,
            'start' => $start
        ]);
        
        return $result['result']['tasks'] ?? [];
    }

    /**
     * Получение задачи по ID
     * 
     * Метод: tasks.task.get
     * Документация: https://context7.com/bitrix24/rest/tasks.task.get
     * 
     * @param int $taskId ID задачи
     * @param array $select Поля для выборки
     * @return array Данные задачи
     */
    public function getTask(int $taskId, array $select = ['*', 'UF_*']): array
    {
        $result = $this->call('tasks.task.get', [
            'taskId' => $taskId,
            'select' => $select
        ]);
        
        return $result['result']['task'] ?? [];
    }

    /**
     * Получение задач батч-запросом
     * 
     * @param array $taskIds Массив ID задач
     * @param array $select Поля для выборки
     * @param int $batchSize Размер батча
     * @return array Ассоциативный массив [taskId => taskData]
     */
    public function getTasksBatch(array $taskIds, array $select = ['*', 'UF_*'], int $batchSize = 50): array
    {
        $allTasks = [];
        $uniqueTaskIds = array_unique($taskIds);
        $batches = array_chunk($uniqueTaskIds, $batchSize);
        
        foreach ($batches as $batch) {
            $batchData = [];
            foreach ($batch as $taskId) {
                $batchData["task_{$taskId}"] = [
                    'method' => 'tasks.task.get',
                    'params' => [
                        'taskId' => $taskId,
                        'select' => $select
                    ]
                ];
            }
            
            try {
                $result = $this->callBatch($batchData);
                
                if (isset($result['result']['result'])) {
                    foreach ($result['result']['result'] as $key => $taskData) {
                        if (isset($taskData['error'])) {
                            $taskId = str_replace('task_', '', $key);
                            error_log(sprintf(
                                "[Bitrix24Client] Error loading task %s: %s",
                                $taskId,
                                $taskData['error_description'] ?? 'Unknown error'
                            ));
                            continue;
                        }
                        
                        $taskId = (int)($taskData['id'] ?? $taskData['ID'] ?? 0);
                        if ($taskId) {
                            $allTasks[$taskId] = $taskData;
                        }
                    }
                }
            } catch (\Exception $e) {
                error_log(sprintf(
                    "[Bitrix24Client] Batch error for tasks: %s",
                    $e->getMessage()
                ));
                // Продолжаем обработку следующих батчей
                continue;
            }
        }
        
        return $allTasks;
    }

    /**
     * Получение записей трудозатрат для задачи
     * 
     * Примечание: В некоторых версиях Bitrix24 методы task.elapseditem.* могут отсутствовать.
     * В этом случае используется альтернативный подход через tasks.task.list с полем timeSpentInLogs.
     * 
     * Метод: task.elapseditem.getlist
     * Документация: https://context7.com/bitrix24/rest/task.elapseditem.getlist
     * 
     * @param int $taskId ID задачи
     * @param int $start Смещение для пагинации
     * @return array Массив записей трудозатрат
     */
    public function getElapsedItems(int $taskId, int $start = 0): array
    {
        try {
            $result = $this->call('task.elapseditem.getlist', [
                'taskId' => $taskId,
                'start' => $start
            ]);
            
            return $result['result'] ?? [];
        } catch (\Exception $e) {
            // Метод может не существовать в некоторых версиях Bitrix24
            error_log(sprintf(
                "[Bitrix24Client] Method task.elapseditem.getlist not available: %s",
                $e->getMessage()
            ));
            return [];
        }
    }

    /**
     * Получение списка тикетов (CRM items)
     * 
     * Метод: crm.item.list
     * Документация: https://context7.com/bitrix24/rest/crm.item.list
     * 
     * @param int $entityTypeId ID типа сущности (например, 140)
     * @param array $filter Фильтр тикетов
     * @param array $select Поля для выборки
     * @param int $start Смещение для пагинации
     * @return array Массив тикетов
     */
    public function getTickets(int $entityTypeId, array $filter = [], array $select = [], int $start = 0): array
    {
        $result = $this->call('crm.item.list', [
            'entityTypeId' => $entityTypeId,
            'filter' => $filter,
            'select' => $select,
            'start' => $start
        ]);
        
        return $result['result']['items'] ?? $result['result'] ?? [];
    }

    /**
     * Получение тикетов батч-запросом
     * 
     * @param int $entityTypeId ID типа сущности
     * @param array $ticketIds Массив ID тикетов
     * @param array $filter Дополнительный фильтр
     * @param array $select Поля для выборки
     * @param int $batchSize Размер батча
     * @return array Ассоциативный массив [ticketId => ticketData]
     */
    public function getTicketsBatch(
        int $entityTypeId,
        array $ticketIds,
        array $filter = [],
        array $select = [],
        int $batchSize = 50
    ): array {
        $allTickets = [];
        $uniqueTicketIds = array_unique($ticketIds);
        $batches = array_chunk($uniqueTicketIds, $batchSize);
        
        foreach ($batches as $batch) {
            $batchFilter = array_merge($filter, ['id' => $batch]);
            $tickets = $this->getTickets($entityTypeId, $batchFilter, $select);
            
            foreach ($tickets as $ticket) {
                $ticketId = (int)($ticket['id'] ?? $ticket['ID'] ?? 0);
                if ($ticketId) {
                    $allTickets[$ticketId] = $ticket;
                }
            }
        }
        
        return $allTickets;
    }
}

