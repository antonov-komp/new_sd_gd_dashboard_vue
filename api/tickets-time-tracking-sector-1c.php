<?php
/**
 * API endpoint: Трудозатраты на Тикеты сектора 1С
 * 
 * Legacy endpoint - перенаправляет на новый модульный код
 * 
 * Реализует контракт из TASK-050-02:
 * - Неделя ISO-8601 (пн–вс), расчёт в UTC.
 * - product=1C фильтруется первым шагом.
 * - Получение записей из таблицы фактов "Трудозатрата".
 * - Матчинг с задачами и тикетами.
 * - Агрегация по неделям и сотрудникам.
 * 
 * @deprecated Используйте api/tickets-time-tracking-sector-1c/bootstrap.php напрямую
 * 
 * История:
 * - 2025-12-23: Рефакторинг - код перенесён в модульную структуру
 * - Старый код сохранён в tickets-time-tracking-sector-1c.php.legacy
 */

$bootstrapPath = __DIR__ . '/tickets-time-tracking-sector-1c/bootstrap.php';

if (file_exists($bootstrapPath)) {
    // Используем новый модуль
    require_once $bootstrapPath;
} else {
    // Fallback на старый код (если новый модуль ещё не готов)
    error_log("[TimeTracking] New module not found, using legacy code");
    
    http_response_code(503);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'service_unavailable',
        'error_description' => 'Module is under maintenance. Please contact administrator.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
