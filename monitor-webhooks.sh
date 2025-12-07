#!/bin/bash
# Скрипт для мониторинга логов вебхуков в реальном времени

LOG_DIR="/var/www/back/logs/webhooks"
CURRENT_FILE=$(date +"%Y-%m-%d-%H")

echo "=== Мониторинг логов вебхуков ==="
echo "Текущий файл: $CURRENT_FILE.json"
echo "Нажмите Ctrl+C для выхода"
echo ""

while true; do
    clear
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
    echo ""
    
    for category in tasks smart-processes errors; do
        category_dir="$LOG_DIR/$category"
        log_file="$category_dir/$CURRENT_FILE.json"
        
        echo "📁 $category:"
        if [ -f "$log_file" ]; then
            count=$(jq '. | length' "$log_file" 2>/dev/null || echo "0")
            echo "   ✅ Файл существует, записей: $count"
            
            if [ "$count" -gt 0 ]; then
                echo "   Последняя запись:"
                jq -r '.[-1] | "      Событие: \(.event // "N/A")\n      Время: \(.timestamp // "N/A")"' "$log_file" 2>/dev/null || echo "      (ошибка чтения)"
            fi
        else
            echo "   ⏳ Ожидание событий..."
        fi
        echo ""
    done
    
    echo "---"
    echo "Создайте событие в Bitrix24 (задачу или элемент смарт-процесса)"
    echo "Логи обновляются каждые 2 секунды..."
    
    sleep 2
done



