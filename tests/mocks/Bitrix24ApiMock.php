<?php
/**
 * Mock класс для имитации Bitrix24 REST API
 *
 * Этот класс предоставляет mock реализации основных методов Bitrix24 API
 * для тестирования без реального подключения к Bitrix24.
 *
 * Используется в sandbox и CI средах для изоляции тестов.
 *
 * @created 2026-01-12
 * @author Full-Stack инженер
 */

class Bitrix24ApiMock
{
    // Mock данные для задач
    private static $mockTasks = [
        [
            'ID' => '123',
            'TITLE' => 'Test Task 1',
            'CREATED_DATE' => '2026-01-01T10:00:00Z',
            'STAGE_ID' => 'DT140_12:UC_0VHWE2',
            'ASSIGNED_BY_ID' => '1',
            'RESPONSIBLE_ID' => '2',
            'STATUS' => '2',
            'CLOSED_DATE' => null,
            'COMMENTS_COUNT' => '0'
        ],
        [
            'ID' => '124',
            'TITLE' => 'Test Task 2',
            'CREATED_DATE' => '2026-01-02T10:00:00Z',
            'STAGE_ID' => 'DT140_12:PREPARATION',
            'ASSIGNED_BY_ID' => '2',
            'RESPONSIBLE_ID' => '1',
            'STATUS' => '3',
            'CLOSED_DATE' => null,
            'COMMENTS_COUNT' => '2'
        ],
        [
            'ID' => '125',
            'TITLE' => 'Test Task 3 - Long Running',
            'CREATED_DATE' => '2025-01-01T10:00:00Z',
            'STAGE_ID' => 'DT140_12:CLIENT',
            'ASSIGNED_BY_ID' => '1',
            'RESPONSIBLE_ID' => '3',
            'STATUS' => '5',
            'CLOSED_DATE' => '2026-01-10T15:30:00Z',
            'COMMENTS_COUNT' => '5'
        ],
        [
            'ID' => '126',
            'TITLE' => 'Test Task 4 - Carryover',
            'CREATED_DATE' => '2025-06-15T09:00:00Z',
            'STAGE_ID' => 'DT140_12:UC_0VHWE2',
            'ASSIGNED_BY_ID' => '3',
            'RESPONSIBLE_ID' => '2',
            'STATUS' => '2',
            'CLOSED_DATE' => null,
            'COMMENTS_COUNT' => '1'
        ]
    ];

    // Mock данные для сделок
    private static $mockDeals = [
        [
            'ID' => '1001',
            'TITLE' => 'Test Deal 1',
            'STAGE_ID' => 'NEW',
            'ASSIGNED_BY_ID' => '1',
            'OPPORTUNITY' => '150000.00',
            'CURRENCY_ID' => 'RUB',
            'COMPANY_ID' => '201',
            'CONTACT_ID' => '301',
            'DATE_CREATE' => '2026-01-01T10:00:00Z',
            'DATE_MODIFY' => '2026-01-05T14:30:00Z',
            'PROBABILITY' => '30'
        ],
        [
            'ID' => '1002',
            'TITLE' => 'Test Deal 2 - In Progress',
            'STAGE_ID' => 'PREPARATION',
            'ASSIGNED_BY_ID' => '2',
            'OPPORTUNITY' => '250000.00',
            'CURRENCY_ID' => 'RUB',
            'COMPANY_ID' => '202',
            'CONTACT_ID' => '302',
            'DATE_CREATE' => '2025-12-15T11:20:00Z',
            'DATE_MODIFY' => '2026-01-08T16:45:00Z',
            'PROBABILITY' => '60'
        ],
        [
            'ID' => '1003',
            'TITLE' => 'Test Deal 3 - Won',
            'STAGE_ID' => 'WON',
            'ASSIGNED_BY_ID' => '1',
            'OPPORTUNITY' => '180000.00',
            'CURRENCY_ID' => 'RUB',
            'COMPANY_ID' => '203',
            'CONTACT_ID' => '303',
            'DATE_CREATE' => '2025-11-20T09:15:00Z',
            'DATE_MODIFY' => '2026-01-12T10:00:00Z',
            'DATE_CLOSED' => '2026-01-12T10:00:00Z',
            'PROBABILITY' => '100'
        ]
    ];

    // Mock данные для пользователей
    private static $mockUsers = [
        [
            'ID' => '1',
            'NAME' => 'John Doe',
            'DEPARTMENT' => 'IT',
            'ACTIVE' => true
        ],
        [
            'ID' => '2',
            'NAME' => 'Jane Smith',
            'DEPARTMENT' => 'Sales',
            'ACTIVE' => true
        ],
        [
            'ID' => '3',
            'NAME' => 'Bob Johnson',
            'DEPARTMENT' => 'HR',
            'ACTIVE' => true
        ]
    ];

    // Mock данные для статусов
    private static $mockStatuses = [
        'tasks' => [
            ['ID' => 'DT140_12:UC_0VHWE2', 'NAME' => 'Новая задача'],
            ['ID' => 'DT140_12:PREPARATION', 'NAME' => 'Подготовка'],
            ['ID' => 'DT140_12:CLIENT', 'NAME' => 'У клиента'],
            ['ID' => 'DT140_12:SUCCESS', 'NAME' => 'Завершена успешно']
        ],
        'deals' => [
            ['ID' => 'NEW', 'NAME' => 'Новая'],
            ['ID' => 'PREPARATION', 'NAME' => 'Подготовка'],
            ['ID' => 'IN_PROGRESS', 'NAME' => 'В работе'],
            ['ID' => 'WON', 'NAME' => 'Выиграна'],
            ['ID' => 'LOSE', 'NAME' => 'Проиграна']
        ]
    ];

    /**
     * Mock для метода tasks.task.list
     *
     * Имитирует получение списка задач из Bitrix24
     * @link https://context7.com/bitrix24/rest/tasks.task.list
     */
    public static function mockTasksList(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $select = $params['select'] ?? ['ID', 'TITLE', 'CREATED_DATE', 'STAGE_ID', 'ASSIGNED_BY_ID'];
        $start = $params['start'] ?? 0;
        $order = $params['order'] ?? ['ID' => 'DESC'];

        // Имитация задержки API
        usleep(rand(100000, 300000)); // 0.1-0.3 сек

        $filteredTasks = self::filterTasks(self::$mockTasks, $filter);

        // Применение сортировки
        if (isset($order['CREATED_DATE'])) {
            usort($filteredTasks, function($a, $b) use ($order) {
                $direction = $order['CREATED_DATE'] === 'DESC' ? -1 : 1;
                return strcmp($a['CREATED_DATE'], $b['CREATED_DATE']) * $direction;
            });
        }

        $result = array_slice($filteredTasks, $start, 50);

        return [
            'result' => $result,
            'total' => count($filteredTasks),
            'next' => count($filteredTasks) > $start + 50 ? $start + 50 : null
        ];
    }

    /**
     * Mock для метода crm.deal.list
     *
     * Имитирует получение списка сделок из Bitrix24
     * @link https://context7.com/bitrix24/rest/crm.deal.list
     */
    public static function mockDealsList(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $select = $params['select'] ?? ['ID', 'TITLE', 'STAGE_ID', 'ASSIGNED_BY_ID'];
        $start = $params['start'] ?? 0;

        // Имитация задержки API
        usleep(rand(150000, 400000)); // 0.15-0.4 сек

        $filteredDeals = self::filterDeals(self::$mockDeals, $filter);
        $result = array_slice($filteredDeals, $start, 50);

        return [
            'result' => $result,
            'total' => count($filteredDeals),
            'next' => count($filteredDeals) > $start + 50 ? $start + 50 : null
        ];
    }

    /**
     * Mock для метода user.get
     *
     * Имитирует получение пользователей из Bitrix24
     * @link https://context7.com/bitrix24/rest/user.get
     */
    public static function mockUserGet(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $id = $params['ID'] ?? null;

        // Имитация задержки API
        usleep(rand(80000, 200000)); // 0.08-0.2 сек

        if ($id) {
            $user = array_filter(self::$mockUsers, fn($u) => $u['ID'] == $id);
            return ['result' => array_values($user)];
        }

        $filteredUsers = self::filterUsers(self::$mockUsers, $filter);
        return ['result' => $filteredUsers];
    }

    /**
     * Mock для метода crm.status.list
     *
     * Имитирует получение статусов из Bitrix24
     */
    public static function mockStatusList(array $params = []): array
    {
        $entityId = $params['entityId'] ?? 'tasks';

        // Имитация задержки API
        usleep(rand(50000, 150000)); // 0.05-0.15 сек

        $statuses = self::$mockStatuses[$entityId] ?? [];
        return ['result' => $statuses];
    }

    /**
     * Mock для метода tasks.task.add
     *
     * Имитирует создание новой задачи
     */
    public static function mockTaskAdd(array $params = []): array
    {
        $fields = $params['fields'] ?? [];

        // Имитация задержки API
        usleep(rand(200000, 500000)); // 0.2-0.5 сек

        $newId = (string)(max(array_column(self::$mockTasks, 'ID')) + 1);

        $newTask = array_merge([
            'ID' => $newId,
            'CREATED_DATE' => date('Y-m-d\TH:i:s\Z'),
            'STATUS' => '2'
        ], $fields);

        self::$mockTasks[] = $newTask;

        return ['result' => $newId];
    }

    /**
     * Универсальный mock метод для CRest
     *
     * Основной метод для вызова mock API методов
     * Имитирует поведение CRest::call()
     */
    public static function call(string $method, array $params = []): array
    {
        // Имитация задержки сети/API
        usleep(rand(100000, 500000)); // 0.1-0.5 сек

        switch ($method) {
            case 'tasks.task.list':
                return self::mockTasksList($params);
            case 'crm.deal.list':
                return self::mockDealsList($params);
            case 'user.get':
                return self::mockUserGet($params);
            case 'crm.status.list':
                return self::mockStatusList($params);
            case 'tasks.task.add':
                return self::mockTaskAdd($params);
            case 'crm.deal.add':
                return self::mockDealAdd($params);
            case 'crm.lead.add':
                return self::mockLeadAdd($params);
            default:
                throw new Exception("Mock not implemented for method: $method");
        }
    }

    /**
     * Mock для создания сделки
     */
    private static function mockDealAdd(array $params = []): array
    {
        $fields = $params['fields'] ?? [];
        $newId = (string)(max(array_column(self::$mockDeals, 'ID')) + 1);

        $newDeal = array_merge([
            'ID' => $newId,
            'DATE_CREATE' => date('Y-m-d\TH:i:s\Z'),
            'DATE_MODIFY' => date('Y-m-d\TH:i:s\Z')
        ], $fields);

        self::$mockDeals[] = $newDeal;

        return ['result' => $newId];
    }

    /**
     * Mock для создания лида
     */
    private static function mockLeadAdd(array $params = []): array
    {
        $fields = $params['fields'] ?? [];
        $newId = (string)rand(10000, 99999);

        return ['result' => $newId];
    }

    /**
     * Фильтрация задач по параметрам
     */
    private static function filterTasks(array $tasks, array $filter): array
    {
        if (empty($filter)) {
            return $tasks;
        }

        return array_filter($tasks, function($task) use ($filter) {
            foreach ($filter as $key => $value) {
                if (!isset($task[$key])) {
                    return false;
                }

                // Обработка специальных операторов
                if (is_array($value)) {
                    // Операторы типа >=, <=, etc.
                    foreach ($value as $op => $val) {
                        switch ($op) {
                            case '>=':
                                if ($task[$key] < $val) return false;
                                break;
                            case '<=':
                                if ($task[$key] > $val) return false;
                                break;
                            case 'in':
                                if (!in_array($task[$key], $val)) return false;
                                break;
                        }
                    }
                } else {
                    // Простое равенство
                    if ($task[$key] != $value) {
                        return false;
                    }
                }
            }
            return true;
        });
    }

    /**
     * Фильтрация сделок по параметрам
     */
    private static function filterDeals(array $deals, array $filter): array
    {
        if (empty($filter)) {
            return $deals;
        }

        return array_filter($deals, function($deal) use ($filter) {
            foreach ($filter as $key => $value) {
                if (!isset($deal[$key]) || $deal[$key] != $value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Фильтрация пользователей по параметрам
     */
    private static function filterUsers(array $users, array $filter): array
    {
        if (empty($filter)) {
            return $users;
        }

        return array_filter($users, function($user) use ($filter) {
            foreach ($filter as $key => $value) {
                if (!isset($user[$key]) || $user[$key] != $value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Генерация случайных тестовых данных
     */
    public static function generateRandomTasks(int $count = 10): array
    {
        $tasks = [];
        $stages = ['DT140_12:UC_0VHWE2', 'DT140_12:PREPARATION', 'DT140_12:CLIENT'];
        $titles = ['Задача', 'Тикет', 'Обращение', 'Запрос'];

        for ($i = 0; $i < $count; $i++) {
            $createdDate = date('Y-m-d', strtotime("-" . rand(1, 365) . " days"));
            $tasks[] = [
                'ID' => (string)rand(1000, 9999),
                'TITLE' => $titles[array_rand($titles)] . " " . ($i + 1),
                'CREATED_DATE' => $createdDate . 'T' . rand(9, 17) . ':00:00Z',
                'STAGE_ID' => $stages[array_rand($stages)],
                'ASSIGNED_BY_ID' => (string)rand(1, 10),
                'RESPONSIBLE_ID' => (string)rand(1, 10),
                'STATUS' => (string)rand(1, 5)
            ];
        }

        return $tasks;
    }

    /**
     * Очистка mock данных (для тестирования)
     */
    public static function reset(): void
    {
        // Можно добавить логику сброса состояния mock данных
        // self::$mockTasks = self::getDefaultTasks();
    }
}