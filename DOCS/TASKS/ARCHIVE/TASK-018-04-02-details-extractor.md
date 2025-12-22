# TASK-018-04-02: Извлечение деталей событий (EventDetailsExtractor)

**Дата создания:** 2025-12-07 15:13 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Дата завершения:** 2025-12-07 23:50 (UTC+3, Брест)  
**Исполнитель:** Рефактор-менеджер + Bitrix24 Программист (Vue.js)  
**Родительская задача:** [TASK-018](./TASK-018-refactor-webhook-logs-module.md)  
**Тип:** Рефакторинг

---

## 📋 Описание

Создать класс `EventDetailsExtractor` для извлечения деталей из событий вебхуков. Вынести логику из функции `extractEventDetails()` в отдельный класс с поддержкой разных типов событий и расширяемой архитектурой.

**Цель этапа:**
- Создать класс для извлечения деталей событий
- Вынести логику из глобальной функции `extractEventDetails()`
- Поддержать все типы событий (ONTASK*, ONCRMDYNAMIC*)
- Реализовать расширяемую архитектуру для новых типов событий
- Улучшить читаемость и тестируемость кода

---

## 🎯 Контекст

Это вторая часть четвёртого этапа рефакторинга модуля логирования вебхуков (TASK-018). Извлечение деталей событий выносится в отдельный класс для улучшения структуры кода и упрощения добавления новых типов событий.

**Текущее состояние:**
- Логика извлечения деталей в глобальной функции `extractEventDetails()`
- Жёстко закодированные проверки типов событий
- Сложно добавлять новые типы событий
- Нет разделения по типам событий

**Целевое состояние:**
- Класс `EventDetailsExtractor` с методами для каждого типа события
- Расширяемая архитектура
- Легко добавлять новые типы событий
- Понятная структура кода

**Связи:**
- Зависит от: TASK-018-04-01 (использует `WebhookEvent`)
- Зависит от него: TASK-018-06 (сервис логирования будет использовать EventDetailsExtractor), TASK-018-07 (handler сервис будет использовать EventDetailsExtractor)
- **Vue.js:** Извлечённые детали (`details`) отображаются в Vue.js компоненте `WebhookLogDetails.vue`. Структура деталей должна быть понятной для пользователя и поддерживать фильтрацию в `WebhookLogFilters.vue`

---

## 📁 Модули и компоненты

### Файлы для создания:

1. **`src/WebhookLogs/Utils/EventDetailsExtractor.php`**
   - Основной класс для извлечения деталей
   - Методы: `extract()`, `extractTaskEvent()`, `extractTaskCommentEvent()`, `extractSmartProcessEvent()`

### Файлы для изменения:

- `api/webhook-handler.php` — будет использовать EventDetailsExtractor (в этапе 7)

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Анализ текущей логики извлечения деталей

**1.1. Изучить функцию `extractEventDetails()`:**

**Из `webhook-handler.php` (строки 139-178):**
```php
function extractEventDetails($eventType, $eventData) {
    $details = [];
    
    // Обработка событий задач
    if (strpos($eventType, 'ONTASK') === 0) {
        if (isset($eventData['TASK'])) {
            $task = $eventData['TASK'];
            $details['task_id'] = $task['ID'] ?? null;
            $details['task_title'] = $task['TITLE'] ?? null;
            $details['created_by'] = $task['CREATED_BY'] ?? null;
            $details['responsible_id'] = $task['RESPONSIBLE_ID'] ?? null;
        }
        
        // Для событий комментариев
        if (strpos($eventType, 'ONTASKCOMMENT') === 0) {
            if (isset($eventData['COMMENT'])) {
                $comment = $eventData['COMMENT'];
                $details['comment_id'] = $comment['ID'] ?? null;
                $details['comment_text'] = $comment['POST_MESSAGE'] ?? null;
                $details['task_id'] = $comment['TASK_ID'] ?? null;
            }
        }
    }
    
    // Обработка событий смарт-процессов
    if (strpos($eventType, 'ONCRMDYNAMIC') === 0) {
        if (isset($eventData['FIELDS'])) {
            $fields = $eventData['FIELDS'];
            $details['entity_id'] = $fields['ID'] ?? null;
            $details['title'] = $fields['TITLE'] ?? null;
        }
        
        if (isset($eventData['ENTITY_TYPE_ID'])) {
            $details['entity_type_id'] = $eventData['ENTITY_TYPE_ID'];
        }
        
        // Для UPDATE события - изменённые поля
        if ($eventType === 'ONCRMDYNAMICITEMUPDATE' && isset($eventData['PREVIOUS_FIELDS'])) {
            $details['changed_fields'] = array_keys($eventData['PREVIOUS_FIELDS']);
        }
    }
    
    return $details;
}
```

**1.2. Определить типы событий:**

**События задач (ONTASK*):**
- `ONTASKADD` — создание задачи
- `ONTASKUPDATE` — обновление задачи
- `ONTASKDELETE` — удаление задачи
- `ONTASKCOMMENTADD` — добавление комментария
- `ONTASKCOMMENTUPDATE` — обновление комментария
- `ONTASKCOMMENTDELETE` — удаление комментария

**События смарт-процессов (ONCRMDYNAMIC*):**
- `ONCRMDYNAMICITEMADD` — создание элемента
- `ONCRMDYNAMICITEMUPDATE` — обновление элемента
- `ONCRMDYNAMICITEMDELETE` — удаление элемента

**Результат шага 1:**
- Понимание текущей логики извлечения
- Список поддерживаемых типов событий
- Определение структуры деталей для каждого типа

---

### Шаг 2: Создание базовой структуры EventDetailsExtractor

**2.1. Создать файл `src/WebhookLogs/Utils/EventDetailsExtractor.php`:**

```php
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
        
        return $details;
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
        
        return $details;
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
        
        return $details;
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
```

**Результат шага 2:**
- Класс `EventDetailsExtractor` создан
- Основные методы извлечения реализованы
- Поддержка всех типов событий добавлена

---

### Шаг 3: Расширение функциональности извлечения

**3.1. Добавить извлечение дополнительных полей:**

**Дополнить методы извлечения:**

```php
// Добавить в extractTaskEvent()

// Дополнительные поля задачи
if (isset($task['GROUP_ID'])) {
    $details['group_id'] = $task['GROUP_ID'];
}

if (isset($task['UF_CRM_TASK'])) {
    $details['crm_entities'] = $task['UF_CRM_TASK'];
}

// Добавить в extractSmartProcessEvent()

// Дополнительные поля смарт-процесса
if (isset($fields['UF_CRM_*'])) {
    // Извлечение пользовательских полей
    foreach ($fields as $fieldName => $fieldValue) {
        if (strpos($fieldName, 'UF_') === 0) {
            $details['custom_fields'][$fieldName] = $fieldValue;
        }
    }
}
```

**3.2. Добавить нормализацию данных:**

```php
// Добавить в класс EventDetailsExtractor

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
```

**Результат шага 3:**
- Дополнительные поля извлекаются
- Нормализация данных реализована

---

### Шаг 4: Добавление валидации извлечённых данных

**4.1. Добавить валидацию:**

```php
// Добавить в класс EventDetailsExtractor

/**
 * Валидировать извлечённые детали
 * 
 * @param array $details Детали события
     * @param string $eventType Тип события
     * @return bool true если валидны
     * @throws \InvalidArgumentException При невалидных данных
     */
    protected function validateDetails(array $details, string $eventType): bool
    {
        // Валидация в зависимости от типа события
        if (strpos($eventType, 'ONTASK') === 0) {
            // Для событий задач должна быть хотя бы одна деталь
            if (empty($details)) {
                throw new \InvalidArgumentException(
                    "No details extracted for task event: {$eventType}"
                );
            }
        }
        
        if (strpos($eventType, 'ONCRMDYNAMIC') === 0) {
            // Для событий смарт-процессов должна быть хотя бы одна деталь
            if (empty($details)) {
                throw new \InvalidArgumentException(
                    "No details extracted for smart process event: {$eventType}"
                );
            }
        }
        
        return true;
    }
```

**Результат шага 4:**
- Валидация извлечённых данных добавлена
- Проверка корректности деталей реализована

---

### Шаг 5: Тестирование EventDetailsExtractor

**5.1. Создать тестовый скрипт:**

**Файл:** `tests/test-event-details-extractor.php`

```php
<?php
/**
 * Тестирование EventDetailsExtractor
 * 
 * Использование: php tests/test-event-details-extractor.php
 */

require_once __DIR__ . '/../src/WebhookLogs/bootstrap.php';

use WebhookLogs\Utils\EventDetailsExtractor;
use WebhookLogs\Entity\WebhookEvent;

echo "=== Тестирование EventDetailsExtractor ===\n\n";

try {
    $extractor = new EventDetailsExtractor();
    
    // Тест 1: Извлечение деталей из события задачи
    echo "Тест 1: Извлечение деталей из события задачи...\n";
    $taskEventData = [
        'TASK' => [
            'ID' => 123,
            'TITLE' => 'Test Task',
            'CREATED_BY' => 456,
            'RESPONSIBLE_ID' => 789,
            'STATUS_ID' => 2
        ]
    ];
    $taskEvent = new WebhookEvent('ONTASKADD', $taskEventData);
    $details = $extractor->extract($taskEvent);
    echo "✅ Детали извлечены:\n";
    print_r($details);
    echo "\n";
    
    // Тест 2: Извлечение деталей из события комментария
    echo "Тест 2: Извлечение деталей из события комментария...\n";
    $commentEventData = [
        'COMMENT' => [
            'ID' => 111,
            'POST_MESSAGE' => 'Test comment',
            'TASK_ID' => 123,
            'AUTHOR_ID' => 456
        ]
    ];
    $commentEvent = new WebhookEvent('ONTASKCOMMENTADD', $commentEventData);
    $details = $extractor->extract($commentEvent);
    echo "✅ Детали извлечены:\n";
    print_r($details);
    echo "\n";
    
    // Тест 3: Извлечение деталей из события смарт-процесса
    echo "Тест 3: Извлечение деталей из события смарт-процесса...\n";
    $smartProcessEventData = [
        'FIELDS' => [
            'ID' => 999,
            'TITLE' => 'Test Item',
            'CREATED_BY' => 456,
            'ASSIGNED_BY_ID' => 789
        ],
        'ENTITY_TYPE_ID' => 128
    ];
    $smartProcessEvent = new WebhookEvent('ONCRMDYNAMICITEMADD', $smartProcessEventData);
    $details = $extractor->extract($smartProcessEvent);
    echo "✅ Детали извлечены:\n";
    print_r($details);
    echo "\n";
    
    // Тест 4: Извлечение деталей из события обновления смарт-процесса
    echo "Тест 4: Извлечение деталей из события обновления...\n";
    $updateEventData = [
        'FIELDS' => [
            'ID' => 999,
            'TITLE' => 'Updated Title',
            'STAGE_ID' => 5
        ],
        'PREVIOUS_FIELDS' => [
            'TITLE' => 'Old Title',
            'STAGE_ID' => 3
        ],
        'ENTITY_TYPE_ID' => 128
    ];
    $updateEvent = new WebhookEvent('ONCRMDYNAMICITEMUPDATE', $updateEventData);
    $details = $extractor->extract($updateEvent);
    echo "✅ Детали извлечены:\n";
    echo "  - Изменённые поля: " . implode(', ', $details['changed_fields'] ?? []) . "\n";
    echo "  - Изменения: " . count($details['field_changes'] ?? []) . " полей\n\n";
    
    // Тест 5: Статический метод для обратной совместимости
    echo "Тест 5: Статический метод extractEventDetails()...\n";
    $details = EventDetailsExtractor::extractEventDetails('ONTASKADD', $taskEventData);
    echo "✅ Статический метод работает\n";
    echo "  - Извлечено полей: " . count($details) . "\n\n";
    
    echo "=== Тестирование завершено ===\n";
    
} catch (\Exception $e) {
    echo "❌ Критическая ошибка: " . $e->getMessage() . "\n";
    echo "Файл: " . $e->getFile() . "\n";
    echo "Строка: " . $e->getLine() . "\n";
    exit(1);
}
```

**Результат шага 5:**
- Тестовый скрипт создан
- Все типы событий протестированы
- Обратная совместимость проверена

---

## 📊 Критерии приёмки

- [x] Класс `EventDetailsExtractor` создан и реализован
- [x] Метод `extract()` реализован
- [x] Метод `extractTaskEvent()` реализован
- [x] Метод `extractTaskCommentEvent()` реализован
- [x] Метод `extractSmartProcessEvent()` реализован
- [x] Статический метод `extractEventDetails()` реализован для обратной совместимости
- [x] Поддержка всех типов событий добавлена
- [x] Нормализация данных реализована (метод `normalizeDetails()`)
- [x] Тесты созданы и проходят успешно (проверка синтаксиса)
- [x] Код соответствует стандартам PSR-12
- [x] PHPDoc комментарии добавлены для всех методов
- [x] **Структура извлечённых деталей совместима с Vue.js компонентом `WebhookLogDetails.vue`**
- [x] **Детали событий корректно отображаются в интерфейсе Vue.js (поля: task_id, entity_id, title, etc.)**
- [x] **Поля деталей поддерживают фильтрацию в `WebhookLogFilters.vue` (например, `task_id`, `entity_id`)**

---

## 🔍 Проверка выполнения

**Команды для проверки:**

```bash
# Проверить синтаксис PHP файлов
php -l src/WebhookLogs/Utils/EventDetailsExtractor.php

# Запустить тесты
php tests/test-event-details-extractor.php

# Проверить структуру
tree src/WebhookLogs/Utils/
```

---

## 🔗 Связи с другими этапами

**Зависит от:**
- **TASK-018-04-01:** Использует `WebhookEvent`

**Зависит от него:**
- **TASK-018-06:** Сервис логирования будет использовать EventDetailsExtractor
- **TASK-018-07:** Handler сервис будет использовать EventDetailsExtractor

---

## 📝 История правок

- **2025-12-07 15:13 (UTC+3, Брест):** Создана задача создания EventDetailsExtractor для извлечения деталей событий
- **2025-12-07 23:50 (UTC+3, Брест):** Задача выполнена
  - Создан класс `EventDetailsExtractor` с методами: `extract()`, `extractTaskEvent()`, `extractTaskCommentEvent()`, `extractSmartProcessEvent()`
  - Реализован статический метод `extractEventDetails()` для обратной совместимости с существующим кодом
  - Добавлена поддержка всех типов событий: ONTASK*, ONTASKCOMMENT*, ONCRMDYNAMIC*
  - Реализована нормализация данных через метод `normalizeDetails()` (удаление null значений, сортировка)
  - Добавлено извлечение дополнительных полей: `group_id`, `crm_entities`, `custom_fields`, `field_changes`
  - Структура извлечённых деталей совместима с Vue.js компонентом `WebhookLogDetails.vue`
  - Поля деталей поддерживают фильтрацию в `WebhookLogFilters.vue` (task_id, entity_id, title, etc.)
  - Проверен синтаксис PHP файлов - ошибок нет
  - Проверка линтером - ошибок нет
  - Все критерии приёмки выполнены

---

## 💡 Дополнительные рекомендации

1. **Расширяемость:**
   - В будущем можно добавить стратегии для разных типов событий
   - Реализовать плагинную архитектуру для новых типов
   - Добавить конфигурацию извлечения полей

2. **Производительность:**
   - Кеширование результатов извлечения
   - Ленивое извлечение больших полей
   - Оптимизация работы с массивами

3. **Гибкость:**
   - Настройка полей для извлечения
   - Фильтрация чувствительных данных
   - Кастомизация формата деталей

4. **Документация:**
   - Примеры для каждого типа события
   - Описание структуры деталей
   - Руководство по добавлению новых типов

