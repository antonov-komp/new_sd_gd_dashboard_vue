<?php

/**
 * TASK-065: Централизованная конфигурация для модуля графика.
 * Значения скопированы из legacy `graph-1c-admission-closure.php`
 * без изменения поведения.
 */
class Config
{
    public function getEntityTypeId(): int
    {
        return 140;
    }

    public function getPageSize(): int
    {
        return 50;
    }

    public function getKeeperId(): int
    {
        return 1051;
    }

    public function getTargetStages(): array
    {
        return [
            'DT140_12:UC_0VHWE2',   // formed
            'DT140_12:PREPARATION', // review
            'DT140_12:CLIENT'       // execution
        ];
    }

    public function getClosingStages(): array
    {
        return [
            'DT140_12:SUCCESS',
            'DT140_12:FAIL',
            'DT140_12:UC_0GBU8Z'
        ];
    }

    public function getStagesWithMeta(): array
    {
        return [
            'DT140_12:UC_0VHWE2' => ['name' => 'Сформировано обращение', 'color' => '#007bff'],
            'DT140_12:PREPARATION' => ['name' => 'Рассмотрение ТЗ', 'color' => '#ffc107'],
            'DT140_12:CLIENT' => ['name' => 'Исполнение', 'color' => '#28a745'],
            'DT140_12:SUCCESS' => ['name' => 'Успешное закрытие', 'color' => '#28a745'],
            'DT140_12:FAIL' => ['name' => 'Отклонено', 'color' => '#dc3545'],
            'DT140_12:UC_0GBU8Z' => ['name' => 'Закрыли без задачи', 'color' => '#6c757d']
        ];
    }

    public function getDurationCategories(): array
    {
        return [
            'up_to_month' => [
                'label' => 'До 1 месяца',
                'color' => '#28a745'
            ],
            'less_than_month' => [
                'label' => 'Менее 1 месяца',
                'color' => '#6cbd45'
            ],
            'more_than_month' => [
                'label' => 'Более 1 месяца',
                'color' => '#ffc107'
            ],
            'more_than_2_months' => [
                'label' => 'Более 2 месяцев',
                'color' => '#ff9800'
            ],
            'more_than_half_year' => [
                'label' => 'Более полугода',
                'color' => '#dc3545'
            ],
            'more_than_year' => [
                'label' => 'Более года',
                'color' => '#c82333'
            ]
        ];
    }
}

