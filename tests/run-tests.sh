#!/bin/bash
# Главный скрипт запуска тестов
# Использование: ./tests/run-tests.sh [опции]
#
# Этот скрипт предоставляет единый интерфейс для запуска всех тестов проекта.
# Поддерживает разные категории тестов и среды выполнения.
#
# @created 2026-01-12
# @author Full-Stack инженер

set -euo pipefail

# Конфигурация
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$SCRIPT_DIR/reports"
LOGS_DIR="$SCRIPT_DIR/logs"

# Параметры по умолчанию
ENVIRONMENT="${ENVIRONMENT:-sandbox}"
CATEGORY="${CATEGORY:-unit}"
PARALLEL="${PARALLEL:-false}"
VERBOSE="${VERBOSE:-false}"
REPORT_FORMAT="${REPORT_FORMAT:-json}"

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
            find "$SCRIPT_DIR/unit" -name "*.php" -o -name "*.js" 2>/dev/null | sort
            ;;
        integration)
            find "$SCRIPT_DIR/integration" -name "*.php" -o -name "*.sh" 2>/dev/null | sort
            ;;
        e2e)
            find "$SCRIPT_DIR/e2e" -name "*.php" -o -name "*.sh" 2>/dev/null | sort
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
                local test_dir="$(dirname "$test_file")"
                local base_file="$(basename "$test_file")"
                if [ "$VERBOSE" = "true" ]; then
                    (cd "$test_dir" && php "$base_file")
                else
                    (cd "$test_dir" && php "$base_file") >/dev/null 2>&1
                fi
            else
                log_error "PHP не найден"
                return 1
            fi
            ;;
        *.js)
            if command -v node >/dev/null 2>&1; then
                local test_dir="$(dirname "$test_file")"
                local base_file="$(basename "$test_file")"
                if [ "$VERBOSE" = "true" ]; then
                    (cd "$test_dir" && node "$base_file")
                else
                    (cd "$test_dir" && node "$base_file") >/dev/null 2>&1
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

    log_info "Запуск тестов в среде: $environment"
    log_info "Категория: $category"

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

    # Запуск тестов последовательно
    local results=""
    local passed=0
    local failed=0
    local start_time=$(date +%s)

    # Используем while с process substitution
    while IFS= read -r test_file; do
        if [ -n "$test_file" ]; then
            result=$(run_single_test "$test_file")
            results="$results$result\n"
            if echo "$result" | grep -q '"status":"passed"'; then
                passed=$((passed + 1))
            else
                failed=$((failed + 1))
            fi
        fi
    done <<< "$test_files"

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
    local base_name="$(date +%Y%m%d_%H%M%S)_${environment}_${category}"
    local json_file="$REPORTS_DIR/${base_name}.json"
    local html_file="$REPORTS_DIR/${base_name}.html"

    # JSON отчет
    cat > "$json_file" << EOF
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

    log_success "JSON отчет сохранен: $json_file"

    # HTML отчет
    generate_html_report "$json_file" "$html_file"
    log_success "HTML отчет сохранен: $html_file"
}

# Генерация HTML отчета
generate_html_report() {
    local json_file="$1"
    local html_file="$2"

    # Простой HTML отчет без зависимостей
    cat > "$html_file" << 'EOF'
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Результаты тестирования</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #e9ecef; padding-bottom: 20px; margin-bottom: 20px; }
        .summary { display: flex; justify-content: space-around; margin: 20px 0; }
        .metric { text-align: center; padding: 10px; }
        .metric h3 { margin: 0; font-size: 1.5em; }
        .results { margin-top: 20px; }
        .test-item { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .passed { background: #d4edda; border-left: 4px solid #28a745; }
        .failed { background: #f8d7da; border-left: 4px solid #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Результаты тестирования</h1>
            <p>Отчет сгенерирован системой тестирования</p>
        </div>
        <div class="summary">
            <div class="metric">
                <h3 id="total">-</h3>
                <p>Всего тестов</p>
            </div>
            <div class="metric">
                <h3 id="passed">-</h3>
                <p>Пройдено</p>
            </div>
            <div class="metric">
                <h3 id="failed">-</h3>
                <p>Провалено</p>
            </div>
        </div>
        <div class="results">
            <h2>Детальные результаты</h2>
            <div id="results-list">Загрузка...</div>
        </div>
    </div>

    <script>
        // Загружаем JSON данные
        fetch('./' + location.pathname.split('/').pop().replace('.html', '.json'))
            .then(response => response.json())
            .then(data => {
                document.getElementById('total').textContent = data.summary.total;
                document.getElementById('passed').textContent = data.summary.passed;
                document.getElementById('failed').textContent = data.summary.failed;

                const resultsList = document.getElementById('results-list');
                resultsList.innerHTML = '';

                if (data.results && data.results.length > 0) {
                    data.results.forEach(test => {
                        if (test && test.name) {
                            const div = document.createElement('div');
                            div.className = 'test-item ' + (test.status || 'unknown');
                            div.innerHTML = `<strong>${test.name}</strong> <span>(${test.duration || 0}s)</span>`;
                            resultsList.appendChild(div);
                        }
                    });
                } else {
                    resultsList.innerHTML = '<p>Результаты не найдены</p>';
                }
            })
            .catch(error => {
                console.error('Ошибка загрузки данных:', error);
                document.getElementById('results-list').innerHTML = '<p>Ошибка загрузки результатов</p>';
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
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --parallel|-p)
            PARALLEL=true
            shift
            ;;
        --no-parallel)
            PARALLEL=false
            shift
            ;;
        --report-format)
            REPORT_FORMAT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Использование: $0 [опции]"
            echo ""
            echo "Опции:"
            echo "  -e, --environment ENV    Среда тестирования (sandbox, local, full, ci)"
            echo "  -c, --category CAT        Категория тестов (unit, integration, e2e, all)"
            echo "  -p, --parallel            Параллельное выполнение тестов"
            echo "  --no-parallel             Последовательное выполнение тестов"
            echo "  -v, --verbose             Подробный вывод"
            echo "  --report-format FORMAT    Формат отчета (json)"
            echo "  -h, --help                Показать эту справку"
            echo ""
            echo "Примеры:"
            echo "  $0 --environment sandbox --category unit"
            echo "  $0 -e local -c integration --verbose"
            echo "  $0 --category all"
            exit 0
            ;;
        *)
            log_error "Неизвестная опция: $1"
            exit 1
            ;;
    esac
done

# Запуск тестов
run_tests "$CATEGORY" "$ENVIRONMENT"