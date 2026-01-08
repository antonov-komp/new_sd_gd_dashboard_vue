#!/bin/bash
# Скрипт для проверки всех кешей в системе
# Использование: ./scripts/check-cache.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$PROJECT_ROOT/api/cache"

echo "=========================================="
echo "  ПРОВЕРКА ВСЕХ КЕШЕЙ В СИСТЕМЕ"
echo "=========================================="
echo ""

# Функция для подсчёта файлов в директории
count_files() {
    local dir="$1"
    if [ -d "$dir" ]; then
        find "$dir" -maxdepth 1 -name "*.json" 2>/dev/null | wc -l
    else
        echo "0"
    fi
}

# Функция для подсчёта размера директории
get_size() {
    local dir="$1"
    if [ -d "$dir" ]; then
        du -sh "$dir" 2>/dev/null | cut -f1
    else
        echo "0"
    fi
}

echo "1. GraphAdmissionClosure - months:"
MONTHS_DIR="$CACHE_DIR/graph-admission-closure/months"
MONTHS_COUNT=$(count_files "$MONTHS_DIR")
MONTHS_SIZE=$(get_size "$MONTHS_DIR")
echo "   Файлов: $MONTHS_COUNT"
echo "   Размер: $MONTHS_SIZE"
if [ "$MONTHS_COUNT" -gt 0 ]; then
    echo "   Файлы:"
    ls -lh "$MONTHS_DIR"/*.json 2>/dev/null | awk '{printf "     %s (%s)\n", $9, $5}'
fi
echo ""

echo "2. GraphAdmissionClosure - weeks:"
WEEKS_DIR="$CACHE_DIR/graph-admission-closure/weeks"
WEEKS_COUNT=$(count_files "$WEEKS_DIR")
WEEKS_SIZE=$(get_size "$WEEKS_DIR")
echo "   Файлов: $WEEKS_COUNT"
echo "   Размер: $WEEKS_SIZE"
if [ "$WEEKS_COUNT" -gt 0 ]; then
    echo "   Файлы:"
    ls -lh "$WEEKS_DIR"/*.json 2>/dev/null | awk '{printf "     %s (%s)\n", $9, $5}'
fi
echo ""

echo "3. TimeTracking:"
TIME_DIR="$CACHE_DIR/time-tracking-sector-1c"
TIME_COUNT=$(find "$TIME_DIR" -name "*.json" 2>/dev/null | wc -l)
TIME_SIZE=$(get_size "$TIME_DIR")
echo "   Файлов: $TIME_COUNT"
echo "   Размер: $TIME_SIZE"
if [ "$TIME_COUNT" -gt 0 ]; then
    echo "   Файлы:"
    find "$TIME_DIR" -name "*.json" 2>/dev/null | while read f; do
        echo "     $f ($(du -h "$f" 2>/dev/null | cut -f1))"
    done
fi
echo ""

echo "4. Статусы задач создания кеша:"
TASK_DIR="$CACHE_DIR/task-status"
TASK_COUNT=$(count_files "$TASK_DIR")
TASK_SIZE=$(get_size "$TASK_DIR")
echo "   Файлов: $TASK_COUNT"
echo "   Размер: $TASK_SIZE"
if [ "$TASK_COUNT" -gt 0 ]; then
    echo "   Файлы:"
    ls -lh "$TASK_DIR"/*.json 2>/dev/null | awk '{printf "     %s (%s)\n", $9, $5}'
fi
echo ""

echo "=========================================="
echo "  ИТОГО"
echo "=========================================="
TOTAL_FILES=$(find "$CACHE_DIR" -name "*.json" 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1)
echo "Всего файлов кеша: $TOTAL_FILES"
echo "Общий размер: $TOTAL_SIZE"
echo ""

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "✅ Кеш пуст - можно начинать тестирование с чистого листа"
else
    echo "⚠️  Найдены файлы кеша. Для очистки используйте:"
    echo "   ./scripts/clear-cache.sh"
fi
echo ""

