<?php

namespace TimeTracking\Util;

/**
 * Утилиты для формирования HTTP-ответов
 * 
 * @package TimeTracking\Util
 */
class ResponseHelper
{
    /**
     * Отправить JSON-ответ и завершить выполнение
     * 
     * @param array $data Данные для ответа
     * @param int $httpCode HTTP-код ответа (по умолчанию 200)
     * @return void
     */
    public static function jsonResponse(array $data, int $httpCode = 200): void
    {
        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    /**
     * Парсинг JSON-тела запроса
     * 
     * @return array Массив данных из тела запроса или пустой массив
     */
    public static function parseJsonBody(): array
    {
        $input = file_get_contents('php://input');
        if (!$input) {
            return [];
        }
        $decoded = json_decode($input, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Отправить ответ об ошибке
     * 
     * @param string $error Код ошибки
     * @param string $description Описание ошибки
     * @param int $httpCode HTTP-код ответа
     * @return void
     */
    public static function errorResponse(string $error, string $description, int $httpCode = 400): void
    {
        self::jsonResponse([
            'error' => $error,
            'error_description' => $description
        ], $httpCode);
    }

    /**
     * Отправить успешный ответ
     * 
     * @param array $data Данные ответа
     * @param array $meta Метаданные (опционально)
     * @return void
     */
    public static function successResponse(array $data, array $meta = []): void
    {
        $response = [
            'success' => true,
            'data' => $data
        ];
        
        if (!empty($meta)) {
            $response['meta'] = $meta;
        }
        
        self::jsonResponse($response);
    }
}

