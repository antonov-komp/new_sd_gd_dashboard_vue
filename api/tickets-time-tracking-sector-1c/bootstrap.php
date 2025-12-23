<?php
/**
 * Bootstrap для модуля учёта времени сектора 1С
 * 
 * Точка входа для нового модульного кода
 * 
 * @package TimeTracking
 */

// Подключение зависимостей
require_once __DIR__ . '/../../crest.php';

// Установка заголовков
header('Content-Type: application/json; charset=utf-8');

// Подключение классов модуля
require_once __DIR__ . '/config/TimeTrackingConfig.php';
require_once __DIR__ . '/util/WeekHelper.php';
require_once __DIR__ . '/util/DateHelper.php';
require_once __DIR__ . '/util/ResponseHelper.php';
require_once __DIR__ . '/bitrix/Bitrix24Client.php';
require_once __DIR__ . '/repository/EmployeeRepository.php';
require_once __DIR__ . '/repository/TaskRepository.php';
require_once __DIR__ . '/repository/ElapsedTimeRepository.php';
require_once __DIR__ . '/repository/TicketRepository.php';
require_once __DIR__ . '/domain/TaskTicketMatcher.php';
require_once __DIR__ . '/domain/TimeAggregator.php';
require_once __DIR__ . '/domain/EmployeeSummaryBuilder.php';
require_once __DIR__ . '/service/TimeTrackingService.php';
require_once __DIR__ . '/controller/TimeTrackingController.php';

use TimeTracking\Bitrix\Bitrix24Client;
use TimeTracking\Repository\EmployeeRepository;
use TimeTracking\Repository\TaskRepository;
use TimeTracking\Repository\ElapsedTimeRepository;
use TimeTracking\Repository\TicketRepository;
use TimeTracking\Domain\TaskTicketMatcher;
use TimeTracking\Domain\TimeAggregator;
use TimeTracking\Domain\EmployeeSummaryBuilder;
use TimeTracking\Service\TimeTrackingService;
use TimeTracking\Controller\TimeTrackingController;

try {
    // Инициализация зависимостей
    $bitrixClient = new Bitrix24Client();
    
    $employeeRepository = new EmployeeRepository($bitrixClient);
    $taskRepository = new TaskRepository($bitrixClient);
    $elapsedTimeRepository = new ElapsedTimeRepository($bitrixClient);
    $ticketRepository = new TicketRepository($bitrixClient);
    
    $taskTicketMatcher = new TaskTicketMatcher($ticketRepository);
    $timeAggregator = new TimeAggregator();
    $employeeSummaryBuilder = new EmployeeSummaryBuilder();
    
    $service = new TimeTrackingService(
        $employeeRepository,
        $taskRepository,
        $elapsedTimeRepository,
        $ticketRepository,
        $taskTicketMatcher,
        $timeAggregator,
        $employeeSummaryBuilder
    );
    
    $controller = new TimeTrackingController($service);
    
    // Обработка запроса
    $controller->handleRequest();
    
} catch (\Exception $e) {
    error_log("Fatal error in TimeTracking bootstrap: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'internal_error',
        'error_description' => 'An internal error occurred'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
