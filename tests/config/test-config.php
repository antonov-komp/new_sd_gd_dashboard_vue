<?php
/**
 * Конфигурация тестовой системы
 *
 * Этот файл содержит настройки для разных тестовых сред и глобальные параметры тестирования.
 * Используется всеми компонентами системы тестирования.
 *
 * @created 2026-01-12
 * @author Full-Stack инженер
 */

return [
    'environments' => [
        'sandbox' => [
            'name' => 'Sandbox Environment',
            'description' => 'Ограниченная среда без внешних зависимостей',
            'use_mocks' => true,
            'api_timeout' => 1,
            'cache_enabled' => false,
            'log_level' => 'error',
            'database' => [
                'use_mock' => true,
                'fixtures_path' => __DIR__ . '/../fixtures/database/test-data.sql'
            ],
            'bitrix24' => [
                'use_mock' => true,
                'mock_class' => 'Bitrix24ApiMock'
            ],
            'webhooks' => [
                'enabled' => false,
                'mock_responses' => true
            ]
        ],

        'local' => [
            'name' => 'Local Development',
            'description' => 'Локальная среда с реальными API',
            'use_mocks' => false,
            'api_timeout' => 30,
            'cache_enabled' => true,
            'log_level' => 'debug',
            'database' => [
                'use_mock' => false,
                'host' => 'localhost',
                'database' => 'test_db'
            ],
            'bitrix24' => [
                'use_mock' => false,
                'webhook_url' => getenv('BITRIX24_WEBHOOK_URL') ?: null
            ],
            'webhooks' => [
                'enabled' => true,
                'endpoint_url' => 'http://localhost/api/webhook-handler.php'
            ]
        ],

        'ci' => [
            'name' => 'CI/CD Pipeline',
            'description' => 'Автоматизированное тестирование',
            'use_mocks' => true,
            'api_timeout' => 5,
            'cache_enabled' => false,
            'log_level' => 'info',
            'database' => [
                'use_mock' => true,
                'fixtures_path' => '/tmp/test-data.sql'
            ],
            'bitrix24' => [
                'use_mock' => true,
                'mock_class' => 'Bitrix24ApiMock'
            ],
            'webhooks' => [
                'enabled' => false,
                'mock_responses' => true
            ],
            'reporting' => [
                'junit_output' => true,
                'coverage_report' => true,
                'performance_metrics' => true
            ]
        ]
    ],

    'test_categories' => [
        'unit' => [
            'description' => 'Модульные тесты логики',
            'timeout' => 30, // секунды
            'parallel' => true,
            'max_workers' => 4
        ],
        'integration' => [
            'description' => 'Тесты взаимодействия компонентов',
            'timeout' => 120,
            'parallel' => false,
            'max_workers' => 2
        ],
        'e2e' => [
            'description' => 'Полные сценарии с API',
            'timeout' => 300,
            'parallel' => false,
            'max_workers' => 1
        ]
    ],

    'global_settings' => [
        'retry_failed_tests' => 2, // количество повторов
        'retry_delay' => 1, // секунды между повторами
        'cleanup_after_test' => true,
        'generate_coverage' => false, // пока отключено
        'performance_monitoring' => true,
        'memory_limit' => '256M',
        'time_limit' => 0 // без ограничения
    ]
];