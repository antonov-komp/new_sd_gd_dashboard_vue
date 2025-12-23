<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;
use DateTimeImmutable;

/**
 * Репозиторий для работы с задачами
 * 
 * @package TimeTracking\Repository
 */
class TaskRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение задач по ID
     * 
     * @param array $taskIds Массив ID задач
     * @return array Ассоциативный массив [taskId => taskData]
     */
    public function getTasksByIds(array $taskIds): array
    {
        if (empty($taskIds)) {
            return [];
        }
        
        return $this->client->getTasksBatch(
            $taskIds,
            ['*', 'UF_*'],
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
    
    /**
     * Получение задач с трудозатратами за период
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @param DateTimeImmutable $periodStart Начало периода
     * @param DateTimeImmutable $periodEnd Конец периода
     * @return array Массив задач
     */
    public function getTasksWithElapsedTime(
        array $employeeIds,
        DateTimeImmutable $periodStart,
        DateTimeImmutable $periodEnd
    ): array {
        if (empty($employeeIds)) {
            return [];
        }
        
        $allTasks = [];
        $start = 0;
        $pageSize = TimeTrackingConfig::getDefaultPageSize();
        
        do {
            $tasks = $this->client->getTasks([
                'RESPONSIBLE_ID' => $employeeIds,
                '>=CHANGED_DATE' => $periodStart->format('Y-m-d'),
                '<=CHANGED_DATE' => $periodEnd->format('Y-m-d'),
                '>timeSpentInLogs' => 0
            ], [
                'ID',
                'TITLE',
                'CREATED_DATE',
                'CHANGED_DATE',
                'CREATED_BY',
                'RESPONSIBLE_ID',
                'timeSpentInLogs',
                'ufCrmTask'
            ], $start);
            
            $allTasks = array_merge($allTasks, $tasks);
            $start += $pageSize;
        } while (count($tasks) === $pageSize);
        
        return $allTasks;
    }
    
    /**
     * Получение детальной информации о задачах
     * 
     * @param array $taskIds Массив ID задач
     * @param array $select Поля для выборки
     * @return array Массив задач с детальной информацией
     */
    public function getTasksDetails(array $taskIds, array $select = []): array
    {
        if (empty($taskIds)) {
            return [];
        }
        
        $defaultSelect = [
            'ID',
            'TITLE',
            'CREATED_DATE',
            'START_DATE_PLAN',
            'END_DATE_PLAN',
            'DEADLINE',
            'CLOSED_DATE',
            'STATUS',
            'STAGE_ID',
            'RESPONSIBLE_ID',
            'CREATED_BY',
            'timeSpentInLogs',
            'UF_CRM_TASK'
        ];
        
        $select = !empty($select) ? $select : $defaultSelect;
        
        return $this->client->getTasksBatch(
            $taskIds,
            $select,
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
}

