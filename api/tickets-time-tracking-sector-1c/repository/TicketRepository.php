<?php

namespace TimeTracking\Repository;

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Config\TimeTrackingConfig;

/**
 * Репозиторий для работы с тикетами (CRM items)
 * 
 * @package TimeTracking\Repository
 */
class TicketRepository
{
    protected Bitrix24Client $client;
    
    public function __construct(Bitrix24Client $client)
    {
        $this->client = $client;
    }
    
    /**
     * Получение тикетов по ID
     * 
     * @param array $ticketIds Массив ID тикетов
     * @param array $filter Дополнительный фильтр
     * @return array Ассоциативный массив [ticketId => ticketData]
     */
    public function getTicketsByIds(array $ticketIds, array $filter = []): array
    {
        if (empty($ticketIds)) {
            return [];
        }
        
        $filter = array_merge($filter, [
            'UF_CRM_7_TYPE_PRODUCT' => TimeTrackingConfig::getSector1CTag()
        ]);
        
        return $this->client->getTicketsBatch(
            TimeTrackingConfig::getEntityTypeId(),
            $ticketIds,
            $filter,
            [
                'id',
                'title',
                'createdTime',
                'UF_CRM_7_TYPE_PRODUCT',
                'stageId',
                'ufSubject',
                'ufSlaBlockStr',
                'ufSlaServiceStr',
                'ufActionStr',
                'ufCrm7UfPriority'
            ],
            TimeTrackingConfig::getDefaultBatchSize()
        );
    }
}

