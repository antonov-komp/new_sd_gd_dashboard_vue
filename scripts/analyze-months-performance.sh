#!/bin/bash
# Скрипт для анализа производительности режима "3 месяца" из логов приложения
# 
# Использование:
#   ./scripts/analyze-months-performance.sh
#   ./scripts/analyze-months-performance.sh logs/app/graph-admission-closure-2025-12-18.log
#   ./scripts/analyze-months-performance.sh /var/log/nginx/back-antonov-mark-error.log (старый лог)
#
# TASK-059: Анализ производительности оптимизаций

# По умолчанию используем локальный лог приложения (сегодняшний день)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEFAULT_LOG_FILE="$PROJECT_ROOT/logs/app/graph-admission-closure-$(date +%Y-%m-%d).log"

LOG_FILE="${1:-$DEFAULT_LOG_FILE}"

echo "=========================================="
echo "Анализ производительности режима '3 месяца'"
echo "=========================================="
echo "Лог-файл: $LOG_FILE"
echo ""

if [ ! -f "$LOG_FILE" ]; then
    echo "⚠️  Внимание: Файл лога не найден: $LOG_FILE"
    echo ""
    # Показываем доступные лог-файлы
    if [ -d "$PROJECT_ROOT/logs/app" ]; then
        available_logs=$(ls -1 "$PROJECT_ROOT/logs/app/"*.log 2>/dev/null | wc -l)
        if [ "$available_logs" -gt 0 ]; then
            echo "Доступные лог-файлы:"
            ls -lh "$PROJECT_ROOT/logs/app/"*.log | tail -5
            echo ""
            echo "Используйте один из них:"
            echo "  ./scripts/analyze-months-performance.sh logs/app/graph-admission-closure-YYYY-MM-DD.log"
        else
            echo "Лог-файлы ещё не созданы. Логи будут созданы автоматически при первом запросе."
            echo "Путь: $PROJECT_ROOT/logs/app/graph-admission-closure-YYYY-MM-DD.log"
        fi
    fi
    echo ""
    echo "Для анализа старых логов из nginx используйте:"
    echo "  ./scripts/analyze-months-performance.sh /var/log/nginx/back-antonov-mark-error.log"
    echo ""
    exit 1
fi
echo ""

# Извлечение метрик из логов
echo "=== Общее время выполнения ==="
grep -E "\[MONTHS-PERFORMANCE\]" "$LOG_FILE" | tail -20 | sed 's/.*\[MONTHS-PERFORMANCE\] //' | while read line; do
    echo "  $line"
done

echo ""
echo "=== Время выполнения запросов ==="
echo "Запрос 1 (Created tickets):"
grep -E "\[MONTHS-QUERY1\]" "$LOG_FILE" | tail -10 | grep -oE "time: [0-9.]+s" | sed 's/time: //' | awk '{sum+=$1; count++} END {if(count>0) printf "  Среднее: %.2f сек\n  Количество: %d\n", sum/count, count}'

echo ""
echo "Запрос 2 (Closed tickets):"
grep -E "\[MONTHS-QUERY2\]" "$LOG_FILE" | tail -10 | grep -oE "time: [0-9.]+s" | sed 's/time: //' | awk '{sum+=$1; count++} END {if(count>0) printf "  Среднее: %.2f сек\n  Количество: %d\n", sum/count, count}'

echo ""
echo "Запрос 3 (Carryover tickets):"
grep -E "\[MONTHS-QUERY3\].*completed in" "$LOG_FILE" | tail -10 | grep -oE "[0-9.]+ seconds" | sed 's/ seconds//' | awk '{sum+=$1; count++} END {if(count>0) printf "  Среднее: %.2f сек\n  Количество: %d\n", sum/count, count}'

echo ""
echo "=== Время агрегации ==="
grep -E "\[MONTHS-AGGREGATION\].*completed in" "$LOG_FILE" | tail -10 | grep -oE "[0-9.]+ seconds" | sed 's/ seconds//' | awk '{sum+=$1; count++} END {if(count>0) printf "  Среднее: %.3f сек\n  Количество: %d\n", sum/count, count}'

echo ""
echo "=== Использование кеша ==="
cache_hits=$(grep -c "\[Cache\] Cache hit" "$LOG_FILE" 2>/dev/null)
cache_misses=$(grep -c "\[Cache\] Cache miss" "$LOG_FILE" 2>/dev/null)
cache_hits=${cache_hits:-0}
cache_misses=${cache_misses:-0}
total_cache=$((cache_hits + cache_misses))
if [ "$total_cache" -gt 0 ]; then
    if command -v bc >/dev/null 2>&1; then
        hit_rate=$(echo "scale=2; $cache_hits * 100 / $total_cache" | bc)
    else
        hit_rate=$(awk "BEGIN {printf \"%.2f\", $cache_hits * 100 / $total_cache}")
    fi
    echo "  Попаданий в кеш: $cache_hits"
    echo "  Промахов кеша: $cache_misses"
    echo "  Процент попаданий: ${hit_rate}%"
else
    echo "  Данные о кеше не найдены"
fi

echo ""
echo "=== Время ответа из кеша ==="
grep -E "\[MONTHS-PERFORMANCE\].*from cache" "$LOG_FILE" | tail -10 | grep -oE "[0-9.]+ seconds" | sed 's/ seconds//' | awk '{sum+=$1; count++} END {if(count>0) printf "  Среднее: %.3f сек\n  Количество: %d\n", sum/count, count}'

echo ""
echo "=== Параллельные запросы ==="
parallel_success=$(grep -c "\[MONTHS-PARALLEL\] Parallel queries successful" "$LOG_FILE" 2>/dev/null || echo "0")
parallel_failed=$(grep -c "\[MONTHS-PARALLEL\] Parallel queries failed" "$LOG_FILE" 2>/dev/null || echo "0")
echo "  Успешных параллельных запросов: $parallel_success"
echo "  Неудачных параллельных запросов: $parallel_failed"

echo ""
echo "=========================================="

