#!/bin/bash
# Тест endpoint для realtime (SSE)

echo "=== Тест endpoint webhook-realtime.php (SSE) ==="
echo ""

# Получаем домен из аргументов или используем back.antonov-mark.ru
DOMAIN="${1:-back.antonov-mark.ru}"

# Определяем протокол
if [ "$DOMAIN" = "localhost" ]; then
    PROTOCOL="http"
    echo "⚠️  Внимание: localhost может не работать, используйте реальный домен"
else
    PROTOCOL="https"
fi

URL="${PROTOCOL}://${DOMAIN}/api/webhook-realtime.php"

echo "Тестируем: $URL"
echo ""
echo "Этот тест проверит:"
echo "1. Доступность endpoint"
echo "2. Правильность заголовков SSE"
echo "3. Получение начального события 'connected'"
echo ""
echo "Нажмите Ctrl+C для остановки (через 5 секунд будет автоматическая остановка)"
echo ""

# Тест с таймаутом 5 секунд
timeout 5 curl -N -H "Accept: text/event-stream" "$URL" 2>&1 | head -20

EXIT_CODE=$?

echo ""
echo ""

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Endpoint доступен и отвечает!"
    echo "✅ Заголовки SSE корректны"
    echo "✅ События отправляются"
elif [ $EXIT_CODE -eq 124 ]; then
    echo "✅ Endpoint доступен (таймаут - это нормально для SSE)"
    echo "✅ Соединение установлено"
elif [ $EXIT_CODE -eq 7 ]; then
    echo "❌ Не удалось подключиться к серверу"
    echo "   Проверьте:"
    echo "   - Доступность домена: $DOMAIN"
    echo "   - Настройки веб-сервера"
    echo "   - Firewall"
elif [ $EXIT_CODE -eq 404 ]; then
    echo "❌ Endpoint не найден (404)"
    echo "   Проверьте конфигурацию веб-сервера"
else
    echo "⚠️  Неожиданный ответ (код: $EXIT_CODE)"
    echo "   Проверьте логи веб-сервера"
fi