<?php

namespace TimeTracking\Domain;

/**
 * Сервис для построения summary по сотрудникам
 * 
 * @package TimeTracking\Domain
 */
class EmployeeSummaryBuilder
{
    /**
     * Создание summary по сотрудникам
     * 
     * @param array $weeksData Агрегированные данные по неделям
     * @return array Summary по сотрудникам
     */
    public function createEmployeesSummary(array $weeksData): array
    {
        $summary = [];
        
        foreach ($weeksData as $week) {
            foreach ($week['employees'] as $employee) {
                $employeeId = $employee['id'];
                
                if (!isset($summary[$employeeId])) {
                    $summary[$employeeId] = [
                        'id' => $employeeId,
                        'name' => $employee['name'],
                        'totalElapsedTime' => 0,
                        'totalRecordsCount' => 0,
                        'totalTasksCount' => 0,
                        'totalTicketsCount' => 0
                    ];
                }
                
                $summary[$employeeId]['totalElapsedTime'] += $employee['elapsedTime'];
                $summary[$employeeId]['totalRecordsCount'] += $employee['recordsCount'];
                $summary[$employeeId]['totalTasksCount'] += $employee['tasksCount'];
                $summary[$employeeId]['totalTicketsCount'] += $employee['ticketsCount'];
            }
        }
        
        // Округление значений
        foreach ($summary as &$emp) {
            $emp['totalElapsedTime'] = round($emp['totalElapsedTime'], 2);
        }
        unset($emp);
        
        return array_values($summary);
    }
}

