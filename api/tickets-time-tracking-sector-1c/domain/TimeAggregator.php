<?php

namespace TimeTracking\Domain;

use TimeTracking\Util\WeekHelper;

/**
 * Сервис для агрегации трудозатрат по неделям и сотрудникам
 * 
 * @package TimeTracking\Domain
 */
class TimeAggregator
{
    /**
     * Агрегация трудозатрат по неделям и сотрудникам
     * 
     * @param array $records Записи трудозатрат
     * @param array $weeks Массив недель (из WeekHelper::getWeeksBounds)
     * @param array $tasks Задачи [taskId => taskData]
     * @param array $taskTicketMap Матчинг задач с тикетами [taskId => ticketData]
     * @param array $employees Данные сотрудников [employeeId => employeeData]
     * @return array Агрегированные данные
     */
    public function aggregateByWeeksAndEmployees(
        array $records,
        array $weeks,
        array $tasks,
        array $taskTicketMap,
        array $employees
    ): array {
        $aggregated = [];
        
        // Инициализация структуры
        foreach ($weeks as $week) {
            $aggregated[$week['weekNumber']] = [
                'weekNumber' => $week['weekNumber'],
                'weekStartUtc' => $week['weekStartUtc'],
                'weekEndUtc' => $week['weekEndUtc'],
                'totalElapsedTime' => 0,
                'recordsCount' => 0,
                'employees' => []
            ];
        }
        
        // Агрегация записей
        foreach ($records as $record) {
            $createdDate = $record['CREATED_DATE'] ?? $record['createdDate'] ?? null;
            if (!$createdDate) {
                continue;
            }
            
            // Определить неделю
            $weekNumber = WeekHelper::getWeekNumberByDate($createdDate, $weeks);
            if (!$weekNumber || !isset($aggregated[$weekNumber])) {
                continue;
            }
            
            $employeeId = (int)($record['USER_ID'] ?? $record['userId'] ?? 0);
            if (!$employeeId) {
                continue;
            }
            
            // Получить время в часах
            $elapsedTimeHours = $this->extractHours($record);
            if ($elapsedTimeHours <= 0) {
                continue;
            }
            
            $taskId = (int)($record['TASK_ID'] ?? $record['taskId'] ?? 0);
            
            // Инициализация сотрудника в неделе
            if (!isset($aggregated[$weekNumber]['employees'][$employeeId])) {
                $aggregated[$weekNumber]['employees'][$employeeId] = [
                    'id' => $employeeId,
                    'name' => $employees[$employeeId]['name'] ?? 'Неизвестный',
                    'elapsedTime' => 0,
                    'recordsCount' => 0,
                    'tasksCount' => 0,
                    'ticketsCount' => 0,
                    'tasks' => []
                ];
            }
            
            // Агрегация
            $aggregated[$weekNumber]['employees'][$employeeId]['elapsedTime'] += $elapsedTimeHours;
            $aggregated[$weekNumber]['employees'][$employeeId]['recordsCount']++;
            
            // Подсчёт уникальных задач и тикетов
            if ($taskId) {
                $this->processTask(
                    $aggregated[$weekNumber]['employees'][$employeeId],
                    $taskId,
                    $elapsedTimeHours,
                    $taskTicketMap,
                    $weeks
                );
            }
            
            $aggregated[$weekNumber]['totalElapsedTime'] += $elapsedTimeHours;
            $aggregated[$weekNumber]['recordsCount']++;
        }
        
        // Преобразование в формат ответа
        return $this->formatResult($aggregated);
    }
    
    /**
     * Обработка задачи в агрегации
     * 
     * @param array &$employee Данные сотрудника (по ссылке)
     * @param int $taskId ID задачи
     * @param float $elapsedTimeHours Трудозатрата в часах
     * @param array $taskTicketMap Матчинг задач с тикетами
     * @param array $weeks Массив недель
     */
    protected function processTask(
        array &$employee,
        int $taskId,
        float $elapsedTimeHours,
        array $taskTicketMap,
        array $weeks
    ): void {
        // Ищем задачу в массиве
        $taskIndex = null;
        foreach ($employee['tasks'] as $index => $task) {
            if (isset($task['id']) && $task['id'] === $taskId) {
                $taskIndex = $index;
                break;
            }
        }
        
        if ($taskIndex === null) {
            // Новая задача
            $taskData = [
                'id' => $taskId,
                'elapsedTime' => $elapsedTimeHours
            ];
            
            // Добавляем информацию о тикете
            if (isset($taskTicketMap[$taskId]['ticket'])) {
                $ticket = $taskTicketMap[$taskId]['ticket'];
                $taskData['ticket'] = [
                    'id' => (int)($ticket['id'] ?? $ticket['ID'] ?? 0),
                    'title' => $ticket['title'] ?? $ticket['name'] ?? null,
                    'createdWeek' => null
                ];
                
                // Определяем неделю создания тикета
                $ticketCreatedTime = $ticket['createdTime'] ?? $ticket['CREATED_TIME'] ?? null;
                if ($ticketCreatedTime) {
                    $ticketCreatedWeek = WeekHelper::getWeekNumberByDate($ticketCreatedTime, $weeks);
                    if ($ticketCreatedWeek) {
                        $taskData['ticket']['createdWeek'] = $ticketCreatedWeek;
                    }
                }
                
                $employee['ticketsCount']++;
            }
            
            $employee['tasks'][] = $taskData;
            $employee['tasksCount']++;
        } else {
            // Задача уже есть - добавляем трудозатрату
            $employee['tasks'][$taskIndex]['elapsedTime'] += $elapsedTimeHours;
        }
    }
    
    /**
     * Извлечение времени в часах из записи
     * 
     * @param array $record Запись трудозатраты
     * @return float Время в часах
     */
    protected function extractHours(array $record): float
    {
        $seconds = (float)($record['SECONDS'] ?? $record['seconds'] ?? 0);
        if ($seconds > 0) {
            return $seconds / 3600;
        }
        
        $minutes = (float)($record['MINUTES'] ?? $record['minutes'] ?? 0);
        if ($minutes > 0) {
            return ($minutes * 60) / 3600;
        }
        
        $hours = (float)($record['HOURS'] ?? $record['hours'] ?? 0);
        return $hours;
    }
    
    /**
     * Форматирование результата агрегации
     * 
     * @param array $aggregated Агрегированные данные
     * @return array Форматированный результат
     */
    protected function formatResult(array $aggregated): array
    {
        $result = [];
        
        foreach ($aggregated as $week) {
            // Округляем трудозатраты
            foreach ($week['employees'] as &$employee) {
                $employee['elapsedTime'] = round($employee['elapsedTime'], 2);
                
                if (isset($employee['tasks']) && is_array($employee['tasks'])) {
                    foreach ($employee['tasks'] as &$task) {
                        if (isset($task['elapsedTime'])) {
                            $task['elapsedTime'] = round($task['elapsedTime'], 2);
                        }
                    }
                    unset($task);
                }
            }
            unset($employee);
            
            $result[] = [
                'weekNumber' => $week['weekNumber'],
                'weekStartUtc' => $week['weekStartUtc'],
                'weekEndUtc' => $week['weekEndUtc'],
                'totalElapsedTime' => round($week['totalElapsedTime'], 2),
                'recordsCount' => $week['recordsCount'],
                'employees' => array_values($week['employees'])
            ];
        }
        
        return $result;
    }
}

