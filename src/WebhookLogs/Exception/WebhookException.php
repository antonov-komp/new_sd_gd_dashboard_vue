<?php
/**
 * Базовый класс исключений модуля логирования вебхуков
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookException.php
 */
namespace WebhookLogs\Exception;

class WebhookException extends \Exception
{
    /**
     * Контекст ошибки (дополнительные данные)
     * 
     * @var array
     */
    protected $context = [];
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     * @param array $context Контекст ошибки
     */
    public function __construct(
        string $message = "",
        int $code = 0,
        ?\Throwable $previous = null,
        array $context = []
    ) {
        parent::__construct($message, $code, $previous);
        $this->context = $context;
    }
    
    /**
     * Получить контекст ошибки
     * 
     * @return array Контекст
     */
    public function getContext(): array
    {
        return $this->context;
    }
    
    /**
     * Получить контекст как JSON строку
     * 
     * @return string JSON строка
     */
    public function getContextAsJson(): string
    {
        return json_encode($this->context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    
    /**
     * Получить детальную информацию об ошибке для логирования
     * 
     * @return array Массив с детальной информацией
     */
    public function getErrorDetails(): array
    {
        return [
            'message' => $this->getMessage(),
            'code' => $this->getCode(),
            'file' => $this->getFile(),
            'line' => $this->getLine(),
            'context' => $this->context,
            'trace' => $this->getTraceAsString()
        ];
    }
    
    /**
     * Получить HTTP статус код для ответа
     * 
     * @return int HTTP статус код
     */
    public function getHttpStatusCode(): int
    {
        $code = $this->getCode();
        
        // Если код в диапазоне HTTP статусов (100-599)
        if ($code >= 100 && $code < 600) {
            return $code;
        }
        
        // По умолчанию 500
        return 500;
    }
    
    /**
     * Логировать исключение
     * 
     * @param string|null $logFile Путь к файлу лога (null = error_log)
     */
    public function log(?string $logFile = null): void
    {
        $details = $this->getErrorDetails();
        $message = json_encode($details, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        
        if ($logFile !== null) {
            error_log($message, 3, $logFile);
        } else {
            error_log($message);
        }
    }
}




