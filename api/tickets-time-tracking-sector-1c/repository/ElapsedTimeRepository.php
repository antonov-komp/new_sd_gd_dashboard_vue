<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use DateTimeImmutable;

/**
 * Репозиторий для работы с записями трудозатрат
 * 
 * @package TimeTracking\Repository
 */
class ElapsedTimeRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение записей трудозатрат за период
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @param DateTimeImmutable $periodStart Начало периода
     * @param DateTimeImmutable $periodEnd Конец периода
     * @param array $tasks Массив задач (для получения детальных записей)
     * @return array Массив записей трудозатрат
     */
    public function getElapsedTimeRecords(
        array $employeeIds,
        DateTimeImmutable $periodStart,
        DateTimeImmutable $periodEnd,
        array $tasks = []
    ): array {
        if (empty($employeeIds)) {
            return [];
        }
        
        $records = [];
        
        // Если задачи переданы, получаем детальные записи трудозатрат
        if (!empty($tasks)) {
            foreach ($tasks as $task) {
                $taskId = (int)($task['id'] ?? $task['ID'] ?? 0);
                if (!$taskId) {
                    continue;
                }
                
                $elapsedItems = $this->client->getElapsedItems($taskId);
                
                foreach ($elapsedItems as $item) {
                    $createdDate = $item['CREATED_DATE'] ?? $item['createdDate'] ?? null;
                    if (!$createdDate) {
                        continue;
                    }
                    
                    // Фильтрация по периоду
                    $createdDateTime = new DateTimeImmutable($createdDate);
                    if ($createdDateTime < $periodStart || $createdDateTime > $periodEnd) {
                        continue;
                    }
                    
                    // Фильтрация по сотрудникам
                    $itemUserId = (int)($item['USER_ID'] ?? $item['userId'] ?? 0);
                    if ($itemUserId && !in_array($itemUserId, $employeeIds, true)) {
                        continue;
                    }
                    
                    // Получение времени в секундах
                    $seconds = $this->extractSeconds($item);
                    if ($seconds <= 0) {
                        continue;
                    }
                    
                    $userId = $itemUserId ?: (int)($task['responsibleId'] ?? $task['createdBy'] ?? 0);
                    
                    $records[] = [
                        'ID' => $item['ID'] ?? $item['id'] ?? null,
                        'TASK_ID' => $taskId,
                        'USER_ID' => $userId,
                        'CREATED_DATE' => $createdDate,
                        'SECONDS' => $seconds,
                        'MINUTES' => round($seconds / 60, 2),
                        'HOURS' => round($seconds / 3600, 2),
                        'COMMENT_TEXT' => $item['COMMENT_TEXT'] ?? $item['commentText'] ?? '',
                        '_task' => $task,
                        '_ufCrmTask' => $task['ufCrmTask'] ?? null
                    ];
                }
            }
        }
        
        // Fallback: если нет детальных записей, используем агрегированные данные
        if (empty($records) && !empty($tasks)) {
            foreach ($tasks as $task) {
                $timeSpent = (int)($task['timeSpentInLogs'] ?? 0);
                if ($timeSpent <= 0) {
                    continue;
                }
                
                $dateForWeek = $task['changedDate'] ?? $task['createdDate'] ?? $task['CHANGED_DATE'] ?? $task['CREATED_DATE'] ?? null;
                if (!$dateForWeek) {
                    continue;
                }
                
                $records[] = [
                    'ID' => $task['id'] ?? $task['ID'] ?? null,
                    'TASK_ID' => (int)($task['id'] ?? $task['ID'] ?? 0),
                    'USER_ID' => (int)($task['responsibleId'] ?? $task['RESPONSIBLE_ID'] ?? $task['createdBy'] ?? $task['CREATED_BY'] ?? 0),
                    'CREATED_DATE' => $dateForWeek,
                    'SECONDS' => $timeSpent,
                    'MINUTES' => round($timeSpent / 60, 2),
                    'HOURS' => round($timeSpent / 3600, 2),
                    'COMMENT_TEXT' => '',
                    '_task' => $task,
                    '_ufCrmTask' => $task['ufCrmTask'] ?? null
                ];
            }
        }
        
        return $records;
    }
    
    /**
     * Извлечение времени в секундах из записи трудозатраты
     * 
     * @param array $item Запись трудозатраты
     * @return int Время в секундах
     */
    protected function extractSeconds(array $item): int
    {
        // Пробуем SECONDS
        $seconds = (int)($item['SECONDS'] ?? 0);
        if ($seconds > 0) {
            return $seconds;
        }
        
        // Пробуем MINUTES
        $minutes = (int)($item['MINUTES'] ?? 0);
        if ($minutes > 0) {
            return $minutes * 60;
        }
        
        // Пробуем HOURS
        $hours = (float)($item['HOURS'] ?? 0);
        if ($hours > 0) {
            return (int)($hours * 3600);
        }
        
        return 0;
    }
}

