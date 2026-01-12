# TASK-086: Улучшение системы тестирования

**Дата создания:** 2026-01-12 07:00 (UTC+3, Брест)
**Статус:** В работе
**Приоритет:** Высокий
**Исполнитель:** Full-Stack инженер
**Зависимости:** TASK-085 (опционально)

## Цель

Улучшить систему тестирования проекта путем создания единой инфраструктуры для запуска, категоризации и автоматизации тестов с учетом ограничений sandbox среды.

## Контекст

После организации тестовых файлов в папку `tests/` выявлены следующие проблемы:
- Разные тесты требуют разных условий запуска (API, файловая система, веб-сервер)
- Отсутствует единая система запуска и категоризации тестов
- Нет автоматизации и отчетности результатов тестирования
- Тесты не адаптированы для разных сред (локальная разработка, CI/CD, sandbox)

## Требования

### Функциональные требования

#### 1. Категоризация тестов
- **Unit тесты**: Тестирование логики без внешних зависимостей
- **Integration тесты**: Тестирование взаимодействия компонентов
- **E2E тесты**: Полное тестирование с внешними API
- **Performance тесты**: Тестирование производительности

#### 2. Система запуска тестов
- **Единый скрипт запуска**: `tests/run-tests.sh`
- **Выборочная запуск**: По категориям, по файлам, по паттернам
- **Параллельное выполнение**: Для независимых тестов
- **Отчетность**: JSON/HTML отчеты о результатах

#### 3. Адаптация для сред
- **Sandbox режим**: Для ограниченной среды без API
- **Local режим**: Для полной локальной разработки
- **CI/CD режим**: Для автоматизированных сборок

#### 4. Mock и фикстуры
- **Mock данные**: Для тестирования без реальных API
- **Тестовые фикстуры**: Предустановленные данные для повторяемых тестов
- **Конфигурация сред**: Разные настройки для разных окружений

### Нефункциональные требования

#### 1. Производительность
- Время выполнения полного набора тестов: ≤ 5 минут
- Память: ≤ 256MB для unit тестов
- Параллельное выполнение: до 4 потоков

#### 2. Надежность
- Стабильность результатов: ≥ 95%
- Логирование ошибок: Подробные логи для отладки
- Graceful degradation: Продолжение работы при падении отдельных тестов

#### 3. Удобство использования
- Простой запуск: `./tests/run-tests.sh`
- Четкие сообщения об ошибках
- Поддержка интерактивного режима

## Подзадачи

### 1. Создание структуры тестирования

#### 1.1 Категоризация существующих тестов
```
tests/
├── unit/                    # Тесты логики без зависимостей
│   ├── test-duration-category.php     # ✓ (уже есть)
│   ├── test-carryover-categories.php  # ✓ (уже есть)
│   ├── test-cache-logic.js           # ✓ (уже есть)
│   └── test-time-filters-validation.php # NEW
├── integration/             # Тесты взаимодействия компонентов
│   ├── test-api-duration.php         # ⚠️ (требует API)
│   ├── test-cache-082.php            # ⚠️ (кеширование)
│   ├── test-final.php                # ⚠️ (CRest + сервисы)
│   └── test-graph-state-dependencies.php # ⚠️ (зависимости)
├── e2e/                     # Полные сценарии с API
│   ├── test-webhook-endpoint.sh      # ❌ (требует веб-сервер)
│   ├── test-realtime-endpoint.sh     # ❌ (требует веб-сервер)
│   └── test-full-workflow.php        # NEW (полный сценарий)
├── fixtures/                # Тестовые данные
│   ├── bitrix24-responses/
│   │   ├── tasks-sample.json
│   │   ├── deals-sample.json
│   │   └── webhooks-sample.json
│   └── database/
│       └── test-database.sql
├── mocks/                   # Mock объекты и данные
│   ├── Bitrix24ApiMock.php
│   ├── CacheMock.php
│   └── WebhookMock.php
├── config/                  # Конфигурация тестов
│   ├── test-config.php
│   └── environments.json
├── utils/                   # Вспомогательные скрипты
│   ├── TestHelper.php
│   ├── TestRunner.php
│   └── ReportGenerator.php
└── reports/                 # Генерируемые отчеты
    ├── latest.json
    └── latest.html
```

#### 1.2 Перемещение и рефакторинг тестов

##### Текущие тесты по категориям:
- **Unit (sandbox-compatible)**:
  - `test-duration-category.php` - логика категоризации без API
  - `test-carryover-categories.php` - расчет carryover без API
  - `test-cache-logic.js` - JavaScript логика категоризации

- **Integration (local environment)**:
  - `test-cache-082.php` - тестирование кеш-менеджеров
  - `test-graph-state-dependencies.php` - зависимости сервисов
  - `test-final.php` - загрузка CRest и сервисов

- **E2E (full stack)**:
  - `test-webhook-endpoint.sh` - тестирование webhook API
  - `test-realtime-endpoint.sh` - тестирование SSE endpoint

##### План рефакторинга:
1. **Создать базовые классы для тестирования**
2. **Добавить mock данные для всех API зависимостей**
3. **Реорганизовать существующие тесты по категориям**
4. **Создать новые unit тесты для критичной логики**

### 2. Система запуска тестов

#### 2.1 Скрипт run-tests.sh

```bash
#!/bin/bash
# Главный скрипт запуска тестов
# Использование: ./tests/run-tests.sh [опции]

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"
LOGS_DIR="$SCRIPT_DIR/logs"

# Параметры по умолчанию
ENVIRONMENT="${ENVIRONMENT:-sandbox}"
CATEGORY="${CATEGORY:-all}"
PARALLEL="${PARALLEL:-true}"
VERBOSE="${VERBOSE:-false}"
REPORT_FORMAT="${REPORT_FORMAT:-json}"
RETRY_FAILED="${RETRY_FAILED:-false}"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функции логирования
log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" >&2; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Определение доступных тестов по среде
get_available_categories() {
    local env="$1"
    case "$env" in
        sandbox)
            echo "unit"
            ;;
        local)
            echo "unit integration"
            ;;
        full|ci)
            echo "unit integration e2e"
            ;;
        *)
            log_error "Неизвестная среда: $env"
            echo "unit"
            ;;
    esac
}

# Поиск тестовых файлов
find_test_files() {
    local category="$1"
    local env="$2"

    case "$category" in
        unit)
            find "$SCRIPT_DIR/unit" -name "*.php" -o -name "*.js" | sort
            ;;
        integration)
            find "$SCRIPT_DIR/integration" -name "*.php" -o -name "*.sh" | sort
            ;;
        e2e)
            find "$SCRIPT_DIR/e2e" -name "*.php" -o -name "*.sh" | sort
            ;;
        all)
            for cat in $(get_available_categories "$env"); do
                find_test_files "$cat" "$env"
            done
            ;;
        *)
            log_error "Неизвестная категория: $category"
            return 1
            ;;
    esac
}

# Запуск одного теста
run_single_test() {
    local test_file="$1"
    local test_name="$(basename "$test_file" .php)"
    test_name="$(basename "$test_name" .sh)"
    test_name="$(basename "$test_name" .js)"

    local start_time=$(date +%s.%3N)

    log_info "Запуск теста: $test_name"

    # Определение типа файла и способа запуска
    case "$test_file" in
        *.php)
            if command -v php >/dev/null 2>&1; then
                if [ "$VERBOSE" = "true" ]; then
                    php "$test_file"
                else
                    php "$test_file" >/dev/null 2>&1
                fi
            else
                log_error "PHP не найден"
                return 1
            fi
            ;;
        *.js)
            if command -v node >/dev/null 2>&1; then
                if [ "$VERBOSE" = "true" ]; then
                    node "$test_file"
                else
                    node "$test_file" >/dev/null 2>&1
                fi
            else
                log_error "Node.js не найден"
                return 1
            fi
            ;;
        *.sh)
            if [ "$VERBOSE" = "true" ]; then
                bash "$test_file"
            else
                bash "$test_file" >/dev/null 2>&1
            fi
            ;;
        *)
            log_error "Неизвестный тип файла: $test_file"
            return 1
            ;;
    esac

    local exit_code=$?
    local end_time=$(date +%s.%3N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")

    if [ $exit_code -eq 0 ]; then
        log_success "✓ $test_name прошел ($duration сек)"
        echo "{\"name\":\"$test_name\",\"status\":\"passed\",\"duration\":$duration}"
    else
        log_error "✗ $test_name провалился ($duration сек)"
        echo "{\"name\":\"$test_name\",\"status\":\"failed\",\"duration\":$duration,\"exit_code\":$exit_code}"
    fi

    return $exit_code
}

# Основная функция запуска тестов
run_tests() {
    local category="$1"
    local environment="$2"
    local parallel="$3"

    log_info "Запуск тестов в среде: $environment"
    log_info "Категория: $category"
    log_info "Параллельное выполнение: $parallel"

    # Создание директорий
    mkdir -p "$REPORTS_DIR" "$LOGS_DIR"

    # Получение списка тестов
    local test_files
    test_files=$(find_test_files "$category" "$environment")

    if [ -z "$test_files" ]; then
        log_warning "Тесты не найдены для категории '$category' в среде '$environment'"
        return 0
    fi

    local total_tests=$(echo "$test_files" | wc -l)
    log_info "Найдено тестов: $total_tests"

    # Запуск тестов
    local results=""
    local passed=0
    local failed=0
    local start_time=$(date +%s)

    if [ "$parallel" = "true" ] && [ $total_tests -gt 1 ]; then
        # Параллельное выполнение
        log_info "Запуск в параллельном режиме..."
        echo "$test_files" | xargs -n 1 -P 4 -I {} bash -c '
            result=$(run_single_test "$1")
            echo "$result"
        ' _ {} | while IFS= read -r result; do
            results="$results$result\n"
            if echo "$result" | grep -q '"status":"passed"'; then
                ((passed++))
            else
                ((failed++))
            fi
        done
    else
        # Последовательное выполнение
        log_info "Запуск в последовательном режиме..."
        echo "$test_files" | while IFS= read -r test_file; do
            if [ -n "$test_file" ]; then
                result=$(run_single_test "$test_file")
                results="$results$result\n"
                if echo "$result" | grep -q '"status":"passed"'; then
                    ((passed++))
                else
                    ((failed++))
                fi
            fi
        done
    fi

    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))

    # Генерация отчета
    generate_report "$results" "$total_tests" "$passed" "$failed" "$total_duration" "$environment" "$category"

    # Итоговый результат
    log_info "Результаты: $passed пройдено, $failed провалено из $total_tests тестов"
    log_info "Время выполнения: ${total_duration} сек"

    return $((failed > 0 ? 1 : 0))
}

# Генерация отчета
generate_report() {
    local results="$1"
    local total="$2"
    local passed="$3"
    local failed="$4"
    local duration="$5"
    local environment="$6"
    local category="$7"

    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local report_file="$REPORTS_DIR/$(date +%Y%m%d_%H%M%S)_${environment}_${category}.json"

    # JSON отчет
    cat > "$report_file" << EOF
{
    "timestamp": "$timestamp",
    "environment": "$environment",
    "category": "$category",
    "summary": {
        "total": $total,
        "passed": $passed,
        "failed": $failed,
        "skipped": 0,
        "duration": $duration
    },
    "results": [
$(echo -e "$results" | sed 's/$/,/' | sed '$ s/,$//' | sed 's/^/        /')
    ]
}
EOF

    log_success "Отчет сохранен: $report_file"

    # HTML отчет (опционально)
    if [ "$REPORT_FORMAT" = "html" ]; then
        generate_html_report "$report_file"
    fi
}

# Генерация HTML отчета
generate_html_report() {
    local json_file="$1"
    local html_file="${json_file%.json}.html"

    # Простой HTML отчет
    cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Результаты тестирования</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .summary { background: #f0f0f0; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .test { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .duration { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <h1>Результаты тестирования</h1>
    <div id="content">Загрузка...</div>

    <script>
        fetch('./$(basename "$json_file")')
            .then(response => response.json())
            .then(data => {
                document.getElementById('content').innerHTML = `
                    <div class="summary">
                        <h2>Сводка</h2>
                        <p>Среда: ${data.environment}</p>
                        <p>Категория: ${data.category}</p>
                        <p>Всего тестов: ${data.summary.total}</p>
                        <p>Пройдено: ${data.summary.passed}</p>
                        <p>Провалено: ${data.summary.failed}</p>
                        <p>Время: ${data.summary.duration} сек</p>
                    </div>

                    <h2>Детали</h2>
                    ${data.results.map(test => `
                        <div class="test ${test.status}">
                            <strong>${test.name}</strong>
                            <span class="duration">(${test.duration} сек)</span>
                        </div>
                    `).join('')}
                `;
            });
    </script>
</body>
</html>
EOF
}

# Парсинг аргументов командной строки
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --category|-c)
            CATEGORY="$2"
            shift 2
            ;;
        --no-parallel)
            PARALLEL=false
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --report-format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        --retry-failed)
            RETRY_FAILED=true
            shift
            ;;
        --help|-h)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  -e, --environment ENV    Среда тестирования (sandbox, local, full, ci)"
            echo "  -c, --category CAT        Категория тестов (unit, integration, e2e, all)"
            echo "  --no-parallel             Отключить параллельное выполнение"
            echo "  -v, --verbose             Подробный вывод"
            echo "  --report-format FORMAT    Формат отчета (json, html)"
            echo "  --retry-failed            Повторять проваленные тесты"
            echo "  -h, --help                Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  $0 --environment sandbox --category unit"
            echo "  $0 -e local -c integration --verbose"
            echo "  $0 --no-parallel --report-format html"
            exit 0
            ;;
        *)
            log_error "Неизвестная опция: $1"
            exit 1
            ;;
    esac
done

# Запуск тестов
run_tests "$CATEGORY" "$ENVIRONMENT" "$PARALLEL"
```

#### 2.2 Отчетность результатов
```json
{
    "timestamp": "2026-01-12T07:00:00Z",
    "environment": "sandbox",
    "summary": {
        "total": 15,
        "passed": 12,
        "failed": 2,
        "skipped": 1,
        "duration": 45.2
    },
    "categories": {
        "unit": {
            "total": 10,
            "passed": 10,
            "failed": 0,
            "duration": 25.1
        },
        "integration": {
            "total": 3,
            "passed": 2,
            "failed": 1,
            "duration": 15.8
        }
    },
    "failures": [...]
}
```

### 3. Mock система

#### 3.1 Mock для Bitrix24 API

```php
<?php
// tests/mocks/Bitrix24ApiMock.php

class Bitrix24ApiMock
{
    // Mock данные для задач
    private static $mockTasks = [
        [
            'ID' => '123',
            'TITLE' => 'Test Task 1',
            'CREATED_DATE' => '2026-01-01T10:00:00Z',
            'STAGE_ID' => 'DT140_12:UC_0VHWE2',
            'ASSIGNED_BY_ID' => '1'
        ],
        [
            'ID' => '124',
            'TITLE' => 'Test Task 2',
            'CREATED_DATE' => '2026-01-02T10:00:00Z',
            'STAGE_ID' => 'DT140_12:PREPARATION',
            'ASSIGNED_BY_ID' => '2'
        ]
    ];

    // Mock данные для сделок
    private static $mockDeals = [
        [
            'ID' => '1001',
            'TITLE' => 'Test Deal 1',
            'STAGE_ID' => 'NEW',
            'ASSIGNED_BY_ID' => '1'
        ]
    ];

    // Mock данные для пользователей
    private static $mockUsers = [
        [
            'ID' => '1',
            'NAME' => 'John Doe',
            'DEPARTMENT' => 'IT'
        ],
        [
            'ID' => '2',
            'NAME' => 'Jane Smith',
            'DEPARTMENT' => 'Sales'
        ]
    ];

    /**
     * Mock для метода tasks.task.list
     */
    public static function mockTasksList(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $select = $params['select'] ?? ['ID', 'TITLE', 'CREATED_DATE'];
        $start = $params['start'] ?? 0;

        $filteredTasks = self::filterTasks(self::$mockTasks, $filter);

        return [
            'result' => array_slice($filteredTasks, $start, 50),
            'total' => count($filteredTasks),
            'next' => count($filteredTasks) > $start + 50 ? $start + 50 : null
        ];
    }

    /**
     * Mock для метода crm.deal.list
     */
    public static function mockDealsList(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $select = $params['select'] ?? ['ID', 'TITLE'];

        $filteredDeals = self::filterDeals(self::$mockDeals, $filter);

        return [
            'result' => $filteredDeals,
            'total' => count($filteredDeals)
        ];
    }

    /**
     * Mock для метода user.get
     */
    public static function mockUserGet(array $params = []): array
    {
        $filter = $params['filter'] ?? [];
        $id = $params['ID'] ?? null;

        if ($id) {
            $user = array_filter(self::$mockUsers, fn($u) => $u['ID'] == $id);
            return ['result' => array_values($user)];
        }

        return ['result' => self::$mockUsers];
    }

    /**
     * Универсальный mock метод для CRest
     */
    public static function call(string $method, array $params = []): array
    {
        // Имитация задержки API
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
            default:
                throw new Exception("Mock not implemented for method: $method");
        }
    }

    /**
     * Фильтрация задач
     */
    private static function filterTasks(array $tasks, array $filter): array
    {
        if (empty($filter)) {
            return $tasks;
        }

        return array_filter($tasks, function($task) use ($filter) {
            foreach ($filter as $key => $value) {
                if (!isset($task[$key]) || $task[$key] != $value) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Фильтрация сделок
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
     * Mock для статусов
     */
    private static function mockStatusList(array $params = []): array
    {
        return [
            'result' => [
                ['ID' => 'NEW', 'NAME' => 'Новая'],
                ['ID' => 'PREPARATION', 'NAME' => 'Подготовка'],
                ['ID' => 'SUCCESS', 'NAME' => 'Успешна']
            ]
        ];
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
                'ASSIGNED_BY_ID' => (string)rand(1, 10)
            ];
        }

        return $tasks;
    }
}
```

#### 3.2 Конфигурация тестовых сред

```php
<?php
// tests/config/test-config.php

return [
    'environments' => [
        'sandbox' => [
            'name' => 'Sandbox Environment',
            'description' => 'Ограниченная среда без внешних зависимостей',
            'use_mocks' => true,
            'api_timeout' => 1,
            'cache_enabled' => false,
            'log_level' => 'error',
            'database' => [
                'use_mock' => true,
                'fixtures_path' => __DIR__ . '/../fixtures/database/test-data.sql'
            ],
            'bitrix24' => [
                'use_mock' => true,
                'mock_class' => 'Bitrix24ApiMock'
            ],
            'webhooks' => [
                'enabled' => false,
                'mock_responses' => true
            ]
        ],

        'local' => [
            'name' => 'Local Development',
            'description' => 'Локальная среда с реальными API',
            'use_mocks' => false,
            'api_timeout' => 30,
            'cache_enabled' => true,
            'log_level' => 'debug',
            'database' => [
                'use_mock' => false,
                'host' => 'localhost',
                'database' => 'test_db'
            ],
            'bitrix24' => [
                'use_mock' => false,
                'webhook_url' => getenv('BITRIX24_WEBHOOK_URL') ?: null
            ],
            'webhooks' => [
                'enabled' => true,
                'endpoint_url' => 'http://localhost/api/webhook-handler.php'
            ]
        ],

        'ci' => [
            'name' => 'CI/CD Pipeline',
            'description' => 'Автоматизированное тестирование',
            'use_mocks' => true,
            'api_timeout' => 5,
            'cache_enabled' => false,
            'log_level' => 'info',
            'database' => [
                'use_mock' => true,
                'fixtures_path' => '/tmp/test-data.sql'
            ],
            'bitrix24' => [
                'use_mock' => true,
                'mock_class' => 'Bitrix24ApiMock'
            ],
            'webhooks' => [
                'enabled' => false,
                'mock_responses' => true
            ],
            'reporting' => [
                'junit_output' => true,
                'coverage_report' => true,
                'performance_metrics' => true
            ]
        ]
    ],

    'test_categories' => [
        'unit' => [
            'description' => 'Модульные тесты логики',
            'timeout' => 30, // секунды
            'parallel' => true,
            'max_workers' => 4
        ],
        'integration' => [
            'description' => 'Тесты взаимодействия компонентов',
            'timeout' => 120,
            'parallel' => false,
            'max_workers' => 2
        ],
        'e2e' => [
            'description' => 'Полные сценарии с API',
            'timeout' => 300,
            'parallel' => false,
            'max_workers' => 1
        ]
    ],

    'global_settings' => [
        'retry_failed_tests' => 2, // количество повторов
        'retry_delay' => 1, // секунды между повторами
        'cleanup_after_test' => true,
        'generate_coverage' => false, // пока отключено
        'performance_monitoring' => true,
        'memory_limit' => '256M',
        'time_limit' => 0 // без ограничения
    ]
];
```

#### 3.3 Mock для кеширования

```php
<?php
// tests/mocks/CacheMock.php

class CacheMock
{
    private static $cache = [];

    public static function set(string $key, $value, int $ttl = 3600): bool
    {
        self::$cache[$key] = [
            'value' => $value,
            'expires' => time() + $ttl
        ];
        return true;
    }

    public static function get(string $key)
    {
        if (!isset(self::$cache[$key])) {
            return null;
        }

        if (time() > self::$cache[$key]['expires']) {
            unset(self::$cache[$key]);
            return null;
        }

        return self::$cache[$key]['value'];
    }

    public static function delete(string $key): bool
    {
        if (isset(self::$cache[$key])) {
            unset(self::$cache[$key]);
            return true;
        }
        return false;
    }

    public static function clear(): bool
    {
        self::$cache = [];
        return true;
    }

    public static function getStats(): array
    {
        return [
            'items_count' => count(self::$cache),
            'memory_usage' => strlen(serialize(self::$cache))
        ];
    }
}
```

### 4. Улучшения отдельных тестов

#### 4.1 Модификация существующих тестов

##### Задачи по рефакторингу:
1. **Добавить проверки среды во все тесты**
   ```php
   // В начале каждого теста
   require_once '../config/test-config.php';
   $config = getTestConfig();
   $useMocks = $config['use_mocks'] ?? false;
   ```

2. **Улучшить обработку ошибок**
   ```php
   try {
       // тестовая логика
       logTestResult($testName, 'passed', $duration);
   } catch (Exception $e) {
       logTestResult($testName, 'failed', $duration, $e->getMessage());
       // graceful degradation - продолжить другие тесты
   }
   ```

3. **Добавить подробные логи**
   - Время начала/окончания каждого теста
   - Использование памяти
   - API вызовы и их результаты
   - Предупреждения о потенциальных проблемах

##### Существующие тесты для модификации:
- `test-api-duration.php` - добавить mock режим
- `test-cache-082.php` - улучшить изоляцию кеша
- `test-final.php` - добавить проверки конфигурации
- `test-webhook-endpoint.sh` - добавить mock HTTP responses

#### 4.2 Новые вспомогательные функции

```php
<?php
// tests/utils/TestHelper.php

class TestHelper
{
    private static $testEnvironment = null;
    private static $startTime = null;
    private static $memoryStart = null;

    /**
     * Инициализация тестовой среды
     */
    public static function initializeTestEnvironment(string $env = 'sandbox'): array
    {
        self::$testEnvironment = $env;
        self::$startTime = microtime(true);
        self::$memoryStart = memory_get_usage(true);

        // Загрузка конфигурации
        $config = require __DIR__ . '/../config/test-config.php';
        $envConfig = $config['environments'][$env] ?? $config['environments']['sandbox'];

        // Настройка mock систем
        if ($envConfig['use_mocks']) {
            self::setupMocks($envConfig);
        }

        // Настройка логирования
        self::setupLogging($envConfig['log_level']);

        return $envConfig;
    }

    /**
     * Настройка mock систем
     */
    private static function setupMocks(array $config): void
    {
        if ($config['bitrix24']['use_mock']) {
            // Подмена CRest класса
            require_once __DIR__ . '/../mocks/Bitrix24ApiMock.php';
            // Здесь логика подмены глобальных функций/классов
        }

        if ($config['database']['use_mock']) {
            // Настройка mock базы данных
            require_once __DIR__ . '/../mocks/DatabaseMock.php';
        }
    }

    /**
     * Настройка логирования
     */
    private static function setupLogging(string $level): void
    {
        // Настройка уровня логирования для тестов
        error_reporting($level === 'debug' ? E_ALL : E_ERROR);
        ini_set('display_errors', $level === 'debug' ? '1' : '0');
    }

    /**
     * Очистка тестовых данных
     */
    public static function cleanupTestData(): void
    {
        // Очистка файлов кеша
        $cacheDirs = [
            __DIR__ . '/../../api/cache/dashboard-sector-1c',
            __DIR__ . '/../../api/cache/graph-state'
        ];

        foreach ($cacheDirs as $dir) {
            if (is_dir($dir)) {
                $files = glob($dir . '/*');
                foreach ($files as $file) {
                    if (is_file($file)) {
                        unlink($file);
                    }
                }
            }
        }

        // Очистка mock данных
        if (class_exists('CacheMock')) {
            CacheMock::clear();
        }

        // Очистка глобальных переменных
        self::cleanupGlobalState();
    }

    /**
     * Очистка глобального состояния
     */
    private static function cleanupGlobalState(): void
    {
        // Сброс статических переменных
        // Очистка singleton объектов
        // Сброс глобальных массивов
    }

    /**
     * Умные проверки API ответов
     */
    public static function assertApiResponse(array $response, array $expected): array
    {
        $errors = [];

        // Проверка обязательных полей
        if (isset($expected['required_fields'])) {
            foreach ($expected['required_fields'] as $field) {
                if (!isset($response[$field])) {
                    $errors[] = "Missing required field: $field";
                }
            }
        }

        // Проверка типов данных
        if (isset($expected['field_types'])) {
            foreach ($expected['field_types'] as $field => $type) {
                if (isset($response[$field])) {
                    $actualType = gettype($response[$field]);
                    if ($actualType !== $type) {
                        $errors[] = "Field '$field' has wrong type. Expected: $type, Actual: $actualType";
                    }
                }
            }
        }

        // Проверка значений
        if (isset($expected['exact_values'])) {
            foreach ($expected['exact_values'] as $field => $expectedValue) {
                if (isset($response[$field]) && $response[$field] !== $expectedValue) {
                    $errors[] = "Field '$field' has wrong value. Expected: $expectedValue, Actual: " . $response[$field];
                }
            }
        }

        // Проверка структуры массивов
        if (isset($expected['array_structure'])) {
            foreach ($expected['array_structure'] as $arrayField => $structure) {
                if (isset($response[$arrayField]) && is_array($response[$arrayField])) {
                    $arrayErrors = self::validateArrayStructure($response[$arrayField], $structure);
                    $errors = array_merge($errors, $arrayErrors);
                }
            }
        }

        return [
            'valid' => empty($errors),
            'errors' => $errors,
            'warnings' => []
        ];
    }

    /**
     * Валидация структуры массива
     */
    private static function validateArrayStructure(array $array, array $structure): array
    {
        $errors = [];

        if (isset($structure['min_items']) && count($array) < $structure['min_items']) {
            $errors[] = "Array has too few items. Minimum: {$structure['min_items']}, Actual: " . count($array);
        }

        if (isset($structure['max_items']) && count($array) > $structure['max_items']) {
            $errors[] = "Array has too many items. Maximum: {$structure['max_items']}, Actual: " . count($array);
        }

        if (isset($structure['item_structure']) && !empty($array)) {
            foreach ($array as $index => $item) {
                if (is_array($item)) {
                    $itemErrors = self::validateArrayStructure($item, $structure['item_structure']);
                    foreach ($itemErrors as $error) {
                        $errors[] = "Item $index: $error";
                    }
                }
            }
        }

        return $errors;
    }

    /**
     * Измерение производительности теста
     */
    public static function getPerformanceMetrics(): array
    {
        $endTime = microtime(true);
        $endMemory = memory_get_usage(true);

        return [
            'duration' => $endTime - self::$startTime,
            'memory_used' => $endMemory - self::$memoryStart,
            'memory_peak' => memory_get_peak_usage(true),
            'environment' => self::$testEnvironment
        ];
    }

    /**
     * Генерация тестовых данных
     */
    public static function generateTestData(string $type, int $count = 1): array
    {
        switch ($type) {
            case 'tasks':
                return self::generateTestTasks($count);
            case 'deals':
                return self::generateTestDeals($count);
            case 'users':
                return self::generateTestUsers($count);
            default:
                throw new InvalidArgumentException("Unknown data type: $type");
        }
    }

    /**
     * Генерация тестовых задач
     */
    private static function generateTestTasks(int $count): array
    {
        $tasks = [];
        $stages = ['DT140_12:UC_0VHWE2', 'DT140_12:PREPARATION', 'DT140_12:CLIENT'];
        $titles = ['Задача', 'Тикет', 'Обращение'];

        for ($i = 0; $i < $count; $i++) {
            $daysAgo = rand(1, 365);
            $tasks[] = [
                'ID' => (string)rand(1000, 9999),
                'TITLE' => $titles[array_rand($titles)] . ' ' . ($i + 1),
                'CREATED_DATE' => date('Y-m-d\TH:i:s\Z', strtotime("-{$daysAgo} days")),
                'STAGE_ID' => $stages[array_rand($stages)],
                'ASSIGNED_BY_ID' => (string)rand(1, 10)
            ];
        }

        return $tasks;
    }

    /**
     * Генерация тестовых сделок
     */
    private static function generateTestDeals(int $count): array
    {
        $deals = [];
        $stages = ['NEW', 'PREPARATION', 'SUCCESS'];

        for ($i = 0; $i < $count; $i++) {
            $deals[] = [
                'ID' => (string)rand(1000, 9999),
                'TITLE' => 'Сделка ' . ($i + 1),
                'STAGE_ID' => $stages[array_rand($stages)],
                'ASSIGNED_BY_ID' => (string)rand(1, 10)
            ];
        }

        return $deals;
    }

    /**
     * Генерация тестовых пользователей
     */
    private static function generateTestUsers(int $count): array
    {
        $users = [];
        $departments = ['IT', 'Sales', 'HR', 'Finance'];
        $firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie'];
        $lastNames = ['Doe', 'Smith', 'Johnson', 'Brown', 'Wilson'];

        for ($i = 0; $i < $count; $i++) {
            $users[] = [
                'ID' => (string)($i + 1),
                'NAME' => $firstNames[array_rand($firstNames)] . ' ' . $lastNames[array_rand($lastNames)],
                'DEPARTMENT' => $departments[array_rand($departments)]
            ];
        }

        return $users;
    }
}
```

## API методы и интеграции

### Bitrix24 REST API
- `crm.deal.list` - получение сделок (mock данные)
- `tasks.task.list` - получение задач (mock данные)
- `crm.status.list` - получение статусов (кеширование)

### Внутренние API
- `/api/admin/cache-status.php` - статус кеша (mock режим)
- `/api/webhook-handler.php` - обработчик вебхуков (тестовый режим)
- `/api/webhook-realtime.php` - SSE endpoint (имитация)

## Технические требования

### PHP
- Версия: 8.0+
- Расширения: curl, json, mbstring
- Composer зависимости: phpunit/phpunit (для будущих unit тестов)

### JavaScript/Node.js
- Node.js: 16+
- npm пакеты: для будущих JS тестов

### Shell скрипты
- Bash: 4.0+
- Утилиты: curl, jq, parallel (опционально)

## Критерии приемки

### Функциональные критерии

#### 1. Система запуска тестов
- [ ] Скрипт `tests/run-tests.sh` существует и запускается
- [ ] Поддержка всех параметров командной строки (`--environment`, `--category`, `--verbose`, etc.)
- [ ] Автоматическое определение доступных категорий по среде
- [ ] Корректная обработка ошибок и кодов выхода
- [ ] Параллельное выполнение unit тестов (минимум 2 потока)

#### 2. Категоризация и структура
- [ ] Все существующие тесты перемещены в соответствующие категории
- [ ] Созданы папки: `unit/`, `integration/`, `e2e/`, `fixtures/`, `mocks/`, `config/`, `utils/`
- [ ] Конфигурационный файл `tests/config/test-config.php` создан и загружается
- [ ] Тесты корректно определяют тип среды и используют соответствующие настройки

#### 3. Mock система
- [ ] Класс `Bitrix24ApiMock` реализует основные API методы
- [ ] Mock данные соответствуют реальным структурам Bitrix24 API
- [ ] Система автоматически переключается между mock и реальными API
- [ ] Генерация случайных тестовых данных работает корректно

#### 4. Отчетность
- [ ] JSON отчеты генерируются в `tests/reports/`
- [ ] HTML отчеты создаются при указании `--report-format html`
- [ ] Отчеты содержат полную статистику (пройдено/провалено/время)
- [ ] Детальная информация по каждому тесту в отчетах

### Нефункциональные критерии

#### 1. Производительность
- [ ] Unit тесты выполняются за ≤ 30 секунд
- [ ] Integration тесты выполняются за ≤ 2 минут
- [ ] E2E тесты выполняются за ≤ 5 минут
- [ ] Память: ≤ 256MB на процесс тестирования
- [ ] CPU: эффективное использование при параллельном запуске

#### 2. Надежность
- [ ] Стабильность результатов: ≥ 95% (тесты не должны быть flaky)
- [ ] Graceful degradation: система продолжает работу при падении отдельных тестов
- [ ] Правильная очистка ресурсов после тестирования
- [ ] Retry механизм для нестабильных тестов

#### 3. Качество кода
- [ ] Все PHP файлы соответствуют PSR-12
- [ ] Код покрыт базовыми комментариями
- [ ] Обработка ошибок в соответствии со стандартами проекта
- [ ] Модульная структура без монолитных функций

#### 4. Документация и удобство
- [ ] README.md в папке tests обновлен с новыми инструкциями
- [ ] Справка по командам (`--help`) работает корректно
- [ ] Четкие сообщения об ошибках для пользователей
- [ ] Примеры использования в документации

### Дополнительные критерии

#### 1. Интеграционные тесты
- [ ] Тесты корректно подключаются к mock системам
- [ ] Проверка взаимодействия между компонентами
- [ ] Валидация структур данных между модулями

#### 2. CI/CD интеграция
- [ ] Скрипт возвращает правильные exit codes для CI систем
- [ ] Поддержка JUnit XML формата отчетов (опционально)
- [ ] Возможность запуска в Docker контейнерах

#### 3. Мониторинг и метрики
- [ ] Сбор метрик производительности тестирования
- [ ] Отслеживание стабильности тестов со временем
- [ ] Анализ slowest/fastest тестов для оптимизации

## Тестирование

### Unit тестирование
```bash
# Запуск только unit тестов
./tests/run-tests.sh --category unit --environment sandbox

# С подробным выводом
./tests/run-tests.sh --category unit --verbose
```

### Integration тестирование
```bash
# Локальное тестирование с API
./tests/run-tests.sh --category integration --environment local

# С отчетом в HTML
./tests/run-tests.sh --report html
```

### Производительность
- Замер времени выполнения каждого теста
- Мониторинг использования памяти
- Отчет о slowest/fastest тестах

## Риски и ограничения

### Риски
1. **API зависимости**: Некоторые тесты требуют реального доступа к Bitrix24
2. **Производительность**: Параллельное выполнение может конфликтовать с общими ресурсами
3. **Совместимость**: Разные версии PHP/Node.js могут влиять на результаты

### Ограничения
1. **Sandbox среда**: Ограниченный доступ к внешним ресурсам
2. **Время выполнения**: Полный набор тестов может быть долгим
3. **Ресурсы**: Ограничения по памяти и CPU в CI/CD

## План реализации

### Этап 1: Базовая инфраструктура (1-2 дня)
1. Создать структуру папок `tests/`
2. Реализовать базовый `run-tests.sh` скрипт
3. Создать конфигурационный файл `test-config.php`
4. Настроить базовую отчетность

### Этап 2: Mock система (2-3 дня)
1. Реализовать `Bitrix24ApiMock` класс
2. Создать `CacheMock` для тестирования кеширования
3. Добавить генерацию тестовых данных
4. Интегрировать mock систему с существующими тестами

### Этап 3: Категоризация и рефакторинг (3-4 дня)
1. Переместить существующие тесты в соответствующие категории
2. Модифицировать тесты для работы с mock системами
3. Добавить `TestHelper` класс с вспомогательными функциями
4. Улучшить обработку ошибок и логирование

### Этап 4: Продвинутые возможности (2-3 дня)
1. Реализовать параллельное выполнение
2. Добавить HTML отчеты
3. Внедрить retry механизм
4. Настроить производительность и метрики

### Этап 5: Документация и оптимизация (1-2 дня)
1. Обновить README.md с подробными инструкциями
2. Добавить примеры использования
3. Протестировать в разных средах
4. Оптимизировать производительность

## Примеры использования

### Базовое тестирование
```bash
# Запуск всех unit тестов в sandbox
./tests/run-tests.sh --environment sandbox --category unit

# Подробный вывод с HTML отчетом
./tests/run-tests.sh -e sandbox -c unit --verbose --report-format html
```

### Интеграционное тестирование
```bash
# Локальное тестирование с реальными API
./tests/run-tests.sh --environment local --category integration

# Только определенные тесты
./tests/run-tests.sh -e local -c integration --filter "*cache*"
```

### CI/CD интеграция
```bash
# В CI пайплайне
./tests/run-tests.sh --environment ci --category unit --no-parallel

# С дополнительными метриками
TEST_ENV=ci CATEGORY=unit ./tests/run-tests.sh --performance-metrics
```

## Мониторинг и поддержка

### Метрики для отслеживания
- **Стабильность**: процент успешных запусков по дням
- **Производительность**: среднее время выполнения тестов
- **Покрытие**: процент протестированных функций
- **Ресурсы**: использование CPU/памяти

### Регулярные задачи
- Еженедельный анализ результатов тестирования
- Обновление mock данных при изменении API
- Мониторинг производительности тестов
- Обновление документации

## Вопросы/Ответы

**Q: Почему не использовать PHPUnit сразу?**
A: PHPUnit требует строгой структуры классов и методов. Сначала создаем инфраструктуру для запуска и категоризации, затем интегрируем фреймворки тестирования.

**Q: Как обрабатывать flaky тесты?**
A: Внедряем retry механизм (повтор до 3 раз), статистику стабильности, изоляцию тестов, и помечаем нестабильные тесты для отдельного внимания.

**Q: Что делать с тестами, требующими реального API?**
A: Создаем отдельную категорию `e2e`, которая запускается только в full среде. В CI/CD такие тесты можно запускать в отдельных jobs с реальными credentials.

**Q: Как обеспечить совместимость с существующими тестами?**
A: Все существующие тесты остаются работоспособными. Новые возможности добавляются опционально через конфигурацию. Постепенная миграция без breaking changes.

**Q: Как масштабировать систему на большое количество тестов?**
A: Параллельное выполнение, шардинг по категориям, кеширование результатов, распределенное выполнение в CI/CD, оптимизация загрузки mock данных.

**Q: Как интегрировать с существующими CI/CD системами?**
A: Поддержка стандартных exit codes, JUnit XML отчетов, артефактов для публикации, webhook уведомлений, интеграция с coverage tools.

## Ссылки на документацию

- [Bitrix24 REST API](https://context7.com/bitrix24/rest/)
- [PHP Testing Best Practices](https://phpunit.readthedocs.io/)
- [Bash Testing Frameworks](https://github.com/bats-core/bats-core)

---

## Ресурсы и зависимости

### Внешние зависимости
- **curl/wget**: для HTTP запросов в тестах
- **jq**: для обработки JSON в shell скриптах
- **parallel**: для параллельного выполнения (опционально)
- **Docker**: для изолированного тестирования (рекомендуется)

### Внутренние зависимости
- Существующая структура проекта (`api/`, `crest.php`)
- Настройки Bitrix24 (`webhook-secret.php`)
- Логи вебхуков (`logs/webhooks/`)

### Рекомендуемое оборудование для CI/CD
- **CPU**: 2+ cores для параллельного выполнения
- **RAM**: 512MB+ для комфортной работы
- **Disk**: 1GB+ для хранения отчетов и fixtures
- **Network**: Стабильное подключение для API тестов

## Альтернативные подходы

### Вариант 1: Минималистичный (быстрый старт)
- Только базовый `run-tests.sh` без параллельности
- Mock данные в виде статических файлов
- Простые текстовые отчеты

### Вариант 2: Полнофункциональный (рекомендуемый)
- Полная инфраструктура с параллельностью
- Классы для mock систем
- Богатые отчеты и метрики

### Вариант 3: Фреймворк-based
- Интеграция с PHPUnit с самого начала
- Автоматическая генерация mock объектов
- Code coverage и продвинутые возможности

## Миграционная стратегия

### Фаза 1: Подготовка (Неделя 1)
- Создание базовой структуры
- Миграция существующих тестов без изменений
- Настройка CI/CD пайплайна

### Фаза 2: Базовые возможности (Неделя 2-3)
- Реализация mock систем
- Параллельное выполнение
- Базовая отчетность

### Фаза 3: Продвинутые возможности (Неделя 4-5)
- Полная категоризация
- Performance monitoring
- Интеграция с coverage tools

### Фаза 4: Оптимизация и поддержка (Неделя 6+)
- Анализ результатов
- Оптимизация производительности
- Документация и обучение команды

---

**История изменений:**
- 2026-01-12 07:00: Создан TASK-086 для улучшения системы тестирования
- 2026-01-12 07:30: Добавлены детальные примеры кода, расширенные критерии приемки, план реализации, примеры использования, и дополнительные разделы по мониторингу и поддержке