#!/bin/bash
# Скрипт для полной очистки всех кешей
# Использование: ./scripts/clear-cache.sh [--force]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_DIR="$PROJECT_ROOT/api/cache"

FORCE=false
if [ "$1" == "--force" ]; then
    FORCE=true
fi

echo "=========================================="
echo "  ОЧИСТКА ВСЕХ КЕШЕЙ"
echo "=========================================="
echo ""

# Подсчёт файлов перед очисткой
TOTAL_FILES=$(find "$CACHE_DIR" -name "*.json" 2>/dev/null | wc -l)

if [ "$TOTAL_FILES" -eq 0 ]; then
    echo "✅ Кеш уже пуст, нечего очищать"
    exit 0
fi

echo "Найдено файлов кеша: $TOTAL_FILES"
echo ""

if [ "$FORCE" != "true" ]; then
    read -p "Вы уверены, что хотите удалить все кеши? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Очистка отменена"
        exit 0
    fi
fi

echo "Начинаю очистку..."
echo ""

# 1. GraphAdmissionClosure - months
echo "1. Очистка GraphAdmissionClosure - months..."
MONTHS_DIR="$CACHE_DIR/graph-admission-closure/months"
if [ -d "$MONTHS_DIR" ]; then
    rm -f "$MONTHS_DIR"/*.json 2>/dev/null
    echo "   ✅ Очищено"
else
    echo "   ⚠️  Директория не найдена"
fi

# 2. GraphAdmissionClosure - weeks
echo "2. Очистка GraphAdmissionClosure - weeks..."
WEEKS_DIR="$CACHE_DIR/graph-admission-closure/weeks"
if [ -d "$WEEKS_DIR" ]; then
    rm -f "$WEEKS_DIR"/*.json 2>/dev/null
    echo "   ✅ Очищено"
else
    echo "   ⚠️  Директория не найдена"
fi

# 3. TimeTracking
echo "3. Очистка TimeTracking..."
TIME_DIR="$CACHE_DIR/time-tracking-sector-1c"
if [ -d "$TIME_DIR" ]; then
    find "$TIME_DIR" -name "*.json" -delete 2>/dev/null
    echo "   ✅ Очищено"
else
    echo "   ⚠️  Директория не найдена"
fi

# 4. Статусы задач
echo "4. Очистка статусов задач..."
TASK_DIR="$CACHE_DIR/task-status"
if [ -d "$TASK_DIR" ]; then
    rm -f "$TASK_DIR"/*.json 2>/dev/null
    echo "   ✅ Очищено"
else
    echo "   ⚠️  Директория не найдена"
fi

# Проверка результата
REMAINING_FILES=$(find "$CACHE_DIR" -name "*.json" 2>/dev/null | wc -l)

echo ""
echo "=========================================="
echo "  РЕЗУЛЬТАТ"
echo "=========================================="
if [ "$REMAINING_FILES" -eq 0 ]; then
    echo "✅ Все кеши успешно очищены"
    echo "   Удалено файлов: $TOTAL_FILES"
else
    echo "⚠️  Осталось файлов: $REMAINING_FILES"
    echo "   Проверьте права доступа к файлам"
fi
echo ""

