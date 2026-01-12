#!/bin/bash
# Тест endpoint для вебхуков

echo "=== Тест endpoint webhook-handler.php ==="
echo ""

# Получаем домен из настроек или используем localhost
DOMAIN="${1:-localhost}"

echo "Тестируем: http://$DOMAIN/api/webhook-handler.php"
echo ""

# Тестовый payload
PAYLOAD='{"event":"ONTASKADD","data":{"TASK":{"ID":"123","TITLE":"Тестовая задача"}}}'

echo "Отправка тестового запроса..."
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "http://$DOMAIN/api/webhook-handler.php" \
  -H "Content-Type: application/json" \
  -H "X-Bitrix-Signature: test" \
  -d "$PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "HTTP код: $HTTP_CODE"
echo "Ответ:"
echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Endpoint работает!"
elif [ "$HTTP_CODE" = "401" ]; then
    echo "⚠️  Endpoint работает, но подпись невалидна (это нормально для теста)"
elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ Endpoint не найден. Проверьте конфигурацию веб-сервера"
else
    echo "⚠️  Неожиданный ответ"
fi