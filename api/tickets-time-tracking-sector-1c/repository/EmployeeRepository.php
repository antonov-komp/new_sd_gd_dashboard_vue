<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;

/**
 * Репозиторий для работы с сотрудниками
 * 
 * @package TimeTracking\Repository
 */
class EmployeeRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение списка сотрудников сектора 1С
     * 
     * @return array Массив ID сотрудников
     */
    public function getSector1CEmployees(): array
    {
        $employeeIds = [];
        
        $users = $this->client->getAllUsers([
            'ACTIVE' => 'Y',
            'UF_DEPARTMENT' => TimeTrackingConfig::getSector1CDepartmentId()
        ], ['ID']);
        
        foreach ($users as $user) {
            if (isset($user['ID'])) {
                $employeeIds[] = (int)$user['ID'];
            }
        }
        
        return array_unique($employeeIds);
    }
    
    /**
     * Получение данных сотрудников по ID
     * 
     * @param array $employeeIds Массив ID сотрудников
     * @return array Ассоциативный массив [employeeId => employeeData]
     */
    public function getEmployeesData(array $employeeIds): array
    {
        if (empty($employeeIds)) {
            return [];
        }
        
        $employees = [];
        $users = $this->client->getAllUsers([
            'ID' => $employeeIds
        ], ['ID', 'NAME', 'LAST_NAME', 'SECOND_NAME']);
        
        foreach ($users as $user) {
            $employeeId = (int)($user['ID'] ?? 0);
            if ($employeeId) {
                $name = trim(($user['LAST_NAME'] ?? '') . ' ' . 
                           ($user['NAME'] ?? '') . ' ' . 
                           ($user['SECOND_NAME'] ?? ''));
                $employees[$employeeId] = [
                    'id' => $employeeId,
                    'name' => $name ?: 'Неизвестный'
                ];
            }
        }
        
        return $employees;
    }
}

