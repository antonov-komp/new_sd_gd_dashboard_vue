<?php
/**
 * Извлечение деталей из событий вебхуков
 * 
 * Расположение: src/WebhookLogs/Utils/EventDetailsExtractor.php
 * 
 * Извлекает структурированные детали из событий Bitrix24
 * для последующего логирования и анализа
 */
namespace WebhookLogs\Utils;

use WebhookLogs\Entity\WebhookEvent;

class EventDetailsExtractor
{
    /**
     * Извлечь детали из события
     * 
     * @param WebhookEvent $event Событие вебхука
     * @return array Детали события
     */
    public function extract(WebhookEvent $event): array
    {
        $eventType = $event->getEventType();
        $eventData = $event->getEventData();
        
        // Обработка событий задач
        if (strpos($eventType, 'ONTASK') === 0) {
            return $this->extractTaskEvent($eventType, $eventData);
        }
        
        // Обработка событий смарт-процессов
        if (strpos($eventType, 'ONCRMDYNAMIC') === 0) {
            return $this->extractSmartProcessEvent($eventType, $eventData);
        }
        
        // Для неизвестных типов событий возвращаем пустой массив
        return [];
    }
    
    /**
     * Извлечь детали из события задачи
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @return array Детали события
     */
    protected function extractTaskEvent(string $eventType, array $eventData): array
    {
        $details = [];
        
        // Обработка событий комментариев
        if (strpos($eventType, 'ONTASKCOMMENT') === 0) {
            return $this->extractTaskCommentEvent($eventType, $eventData);
        }
        
        // Обработка обычных событий задач
        if (isset($eventData['TASK'])) {
            $task = $eventData['TASK'];
            $details['task_id'] = $task['ID'] ?? null;
            $details['task_title'] = $task['TITLE'] ?? null;
            $details['created_by'] = $task['CREATED_BY'] ?? null;
            $details['responsible_id'] = $task['RESPONSIBLE_ID'] ?? null;
            $details['status_id'] = $task['STATUS_ID'] ?? null;
            $details['priority'] = $task['PRIORITY'] ?? null;
            $details['deadline'] = $task['DEADLINE'] ?? null;
            
            // Дополнительные поля
            if (isset($task['GROUP_ID'])) {
                $details['group_id'] = $task['GROUP_ID'];
            }
            
            if (isset($task['UF_CRM_TASK'])) {
                $details['crm_entities'] = $task['UF_CRM_TASK'];
            }
        }
        
        // Дополнительные детали в зависимости от типа события
        switch ($eventType) {
            case 'ONTASKUPDATE':
                if (isset($eventData['PREVIOUS_FIELDS'])) {
                    $details['changed_fields'] = array_keys($eventData['PREVIOUS_FIELDS']);
                }
                break;
                
            case 'ONTASKDELETE':
                $details['deleted'] = true;
                break;
        }
        
        return $this->normalizeDetails($details);
    }
    
    /**
     * Извлечь детали из события комментария к задаче
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @return array Детали события
     */
    protected function extractTaskCommentEvent(string $eventType, array $eventData): array
    {
        $details = [];
        
        if (isset($eventData['COMMENT'])) {
            $comment = $eventData['COMMENT'];
            $details['comment_id'] = $comment['ID'] ?? null;
            $details['comment_text'] = $comment['POST_MESSAGE'] ?? null;
            $details['task_id'] = $comment['TASK_ID'] ?? null;
            $details['author_id'] = $comment['AUTHOR_ID'] ?? null;
            $details['created_date'] = $comment['POST_DATE'] ?? null;
        }
        
        // Дополнительные детали в зависимости от типа события
        switch ($eventType) {
            case 'ONTASKCOMMENTUPDATE':
                if (isset($eventData['PREVIOUS_FIELDS'])) {
                    $details['changed_fields'] = array_keys($eventData['PREVIOUS_FIELDS']);
                }
                break;
                
            case 'ONTASKCOMMENTDELETE':
                $details['deleted'] = true;
                break;
        }
        
        return $this->normalizeDetails($details);
    }
    
    /**
     * Извлечь детали из события смарт-процесса
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @return array Детали события
     */
    protected function extractSmartProcessEvent(string $eventType, array $eventData): array
    {
        $details = [];
        
        // Основные поля
        if (isset($eventData['FIELDS'])) {
            $fields = $eventData['FIELDS'];
            $details['entity_id'] = $fields['ID'] ?? null;
            $details['title'] = $fields['TITLE'] ?? null;
            $details['created_by'] = $fields['CREATED_BY'] ?? null;
            $details['assigned_by'] = $fields['ASSIGNED_BY_ID'] ?? null;
            $details['stage_id'] = $fields['STAGE_ID'] ?? null;
            
            // Извлечение пользовательских полей
            $customFields = [];
            foreach ($fields as $fieldName => $fieldValue) {
                if (strpos($fieldName, 'UF_') === 0) {
                    $customFields[$fieldName] = $fieldValue;
                }
            }
            if (!empty($customFields)) {
                $details['custom_fields'] = $customFields;
            }
        }
        
        // Тип сущности
        if (isset($eventData['ENTITY_TYPE_ID'])) {
            $details['entity_type_id'] = $eventData['ENTITY_TYPE_ID'];
        }
        
        // Дополнительные детали в зависимости от типа события
        switch ($eventType) {
            case 'ONCRMDYNAMICITEMUPDATE':
                if (isset($eventData['PREVIOUS_FIELDS'])) {
                    $details['changed_fields'] = array_keys($eventData['PREVIOUS_FIELDS']);
                    
                    // Детали изменений (старое и новое значение)
                    $details['field_changes'] = [];
                    foreach ($eventData['PREVIOUS_FIELDS'] as $fieldName => $oldValue) {
                        $newValue = $eventData['FIELDS'][$fieldName] ?? null;
                        $details['field_changes'][$fieldName] = [
                            'old' => $oldValue,
                            'new' => $newValue
                        ];
                    }
                }
                break;
                
            case 'ONCRMDYNAMICITEMDELETE':
                $details['deleted'] = true;
                break;
        }
        
        return $this->normalizeDetails($details);
    }
    
    /**
     * Нормализовать детали события
     * 
     * @param array $details Детали события
     * @return array Нормализованные детали
     */
    protected function normalizeDetails(array $details): array
    {
        // Удаление null значений (опционально)
        $normalized = array_filter($details, function($value) {
            return $value !== null;
        });
        
        // Сортировка по ключам для консистентности
        ksort($normalized);
        
        return $normalized;
    }
    
    /**
     * Извлечь детали из события (статический метод для обратной совместимости)
     * 
     * @param string $eventType Тип события
     * @param array $eventData Данные события
     * @return array Детали события
     */
    public static function extractEventDetails(string $eventType, array $eventData): array
    {
        $extractor = new self();
        
        // Создаём временный объект WebhookEvent для извлечения
        // В реальном использовании лучше передавать WebhookEvent напрямую
        $event = new \WebhookLogs\Entity\WebhookEvent($eventType, $eventData);
        
        return $extractor->extract($event);
    }
}

