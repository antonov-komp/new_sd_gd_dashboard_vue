<?php
/**
 * Исключение логирования вебхука
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookLoggingException.php
 */
namespace WebhookLogs\Exception;

class WebhookLoggingException extends WebhookException
{
    /**
     * Тип ошибки логирования
     * 
     * @var string
     */
    protected $loggingType;
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param string $loggingType Тип ошибки (write, read, parse, directory)
     * @param array $context Контекст ошибки
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     */
    public function __construct(
        string $message = "",
        string $loggingType = 'unknown',
        array $context = [],
        int $code = 500,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous, $context);
        $this->loggingType = $loggingType;
    }
    
    /**
     * Получить тип ошибки логирования
     * 
     * @return string Тип ошибки
     */
    public function getLoggingType(): string
    {
        return $this->loggingType;
    }
}






