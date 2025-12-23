<?php

/**
 * TASK-065: Контроллер для нового модуля графика приёма/закрытий.
 * Задача — парсинг входа и делегирование в сервисный слой.
 */
class GraphAdmissionClosureController
{
    public function __construct(
        private readonly GraphAdmissionClosureService $service
    ) {
    }

    /**
     * Обработать запрос.
     *
     * @param array $payload входные данные (JSON body, уже декодирован)
     * @return array Ответ в формате контракта legacy эндпоинта
     */
    public function handle(array $payload): array
    {
        return $this->service->handle($payload);
    }
}

