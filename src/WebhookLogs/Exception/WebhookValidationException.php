<?php
/**
 * Исключение валидации вебхука
 * 
 * Расположение: src/WebhookLogs/Exception/WebhookValidationException.php
 */
namespace WebhookLogs\Exception;

class WebhookValidationException extends WebhookException
{
    /**
     * Тип ошибки валидации
     * 
     * @var string
     */
    protected $validationType;
    
    /**
     * Конструктор
     * 
     * @param string $message Сообщение об ошибке
     * @param string $validationType Тип ошибки (signature, payload, required_field)
     * @param array $context Контекст ошибки
     * @param int $code Код ошибки
     * @param \Throwable|null $previous Предыдущее исключение
     */
    public function __construct(
        string $message = "",
        string $validationType = 'unknown',
        array $context = [],
        int $code = 400,
        ?\Throwable $previous = null
    ) {
        parent::__construct($message, $code, $previous, $context);
        $this->validationType = $validationType;
    }
    
    /**
     * Получить тип ошибки валидации
     * 
     * @return string Тип ошибки
     */
    public function getValidationType(): string
    {
        return $this->validationType;
    }
}



