<?php

namespace TimeTracking\Domain;

use TimeTracking\Repository\TicketRepository;

/**
 * Сервис для матчинга задач с тикетами
 * 
 * Использует поле ufCrmTask из задачи (формат: ["T8c_3093"], 
 * где 8c = 140 в hex, 3093 = ID тикета)
 * 
 * @package TimeTracking\Domain
 */
class TaskTicketMatcher
{
    protected TicketRepository $ticketRepository;
    
    public function __construct(TicketRepository $ticketRepository)
    {
        $this->ticketRepository = $ticketRepository;
    }
    
    /**
     * Матчинг задач с тикетами
     * 
     * @param array $tasks Массив задач [taskId => taskData]
     * @return array Ассоциативный массив [taskId => ['ticketId' => int, 'ticket' => array]]
     */
    public function matchTasksWithTickets(array $tasks): array
    {
        $taskTicketMap = [];
        $ticketIdsToLoad = [];
        
        // Собираем ID тикетов из задач
        foreach ($tasks as $taskId => $task) {
            $ticketId = $this->extractTicketId($task);
            
            if ($ticketId) {
                $ticketIdsToLoad[$ticketId] = true;
                $taskTicketMap[$taskId] = ['ticketId' => $ticketId];
            }
        }
        
        if (empty($ticketIdsToLoad)) {
            error_log("[TaskTicketMatcher] No ticket IDs found in tasks");
            return [];
        }
        
        error_log(sprintf("[TaskTicketMatcher] Found %d unique ticket IDs to load", count($ticketIdsToLoad)));
        
        // Загружаем тикеты
        $ticketIds = array_keys($ticketIdsToLoad);
        $tickets = $this->ticketRepository->getTicketsByIds($ticketIds);
        
        error_log(sprintf("[TaskTicketMatcher] Loaded %d tickets", count($tickets)));
        
        // Связываем тикеты с задачами
        foreach ($tickets as $ticketId => $ticket) {
            foreach ($taskTicketMap as $taskId => &$data) {
                if (isset($data['ticketId']) && (int)$data['ticketId'] === $ticketId) {
                    $data['ticket'] = $ticket;
                    break;
                }
            }
        }
        
        $matchedCount = count(array_filter($taskTicketMap, function($data) {
            return isset($data['ticket']);
        }));
        error_log(sprintf("[TaskTicketMatcher] Matched %d tasks with tickets", $matchedCount));
        
        return $taskTicketMap;
    }
    
    /**
     * Извлечение ID тикета из задачи
     * 
     * @param array $task Данные задачи
     * @return int|null ID тикета или null
     */
    protected function extractTicketId(array $task): ?int
    {
        // Поле ufCrmTask содержит массив строк формата ["T8c_3093"]
        // где 8c = 140 (тип сущности) в hex, 3093 = ID тикета
        if (isset($task['ufCrmTask']) && is_array($task['ufCrmTask']) && !empty($task['ufCrmTask'])) {
            $ufCrmTaskValue = $task['ufCrmTask'][0] ?? null;
            if ($ufCrmTaskValue && preg_match('/T8c_(\d+)/', $ufCrmTaskValue, $matches)) {
                return (int)$matches[1];
            }
        }
        
        // Альтернативные варианты
        if (isset($task['ufCrmTicketId'])) {
            return (int)$task['ufCrmTicketId'];
        }
        
        if (isset($task['UF_CRM_TICKET_ID'])) {
            return (int)$task['UF_CRM_TICKET_ID'];
        }
        
        if (isset($task['UF_CRM_140_ID'])) {
            return (int)$task['UF_CRM_140_ID'];
        }
        
        return null;
    }
}

