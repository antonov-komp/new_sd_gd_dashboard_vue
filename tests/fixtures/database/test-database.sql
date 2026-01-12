-- Тестовые данные для базы данных
-- Используется в sandbox режиме для mock базы данных
--
-- @created 2026-01-12
-- @author Full-Stack инженер

-- Вставка тестовых задач
INSERT INTO tasks (id, title, created_date, stage_id, assigned_by_id, responsible_id, status) VALUES
(123, 'Test Task 1', '2026-01-01 10:00:00', 'DT140_12:UC_0VHWE2', 1, 2, 2),
(124, 'Test Task 2', '2026-01-02 10:00:00', 'DT140_12:PREPARATION', 2, 1, 3),
(125, 'Test Task 3 - Long Running', '2025-01-01 10:00:00', 'DT140_12:CLIENT', 1, 3, 5);

-- Вставка тестовых сделок
INSERT INTO deals (id, title, stage_id, assigned_by_id, opportunity, currency_id, date_create) VALUES
(1001, 'Test Deal 1', 'NEW', 1, 150000.00, 'RUB', '2026-01-01 10:00:00'),
(1002, 'Test Deal 2 - In Progress', 'PREPARATION', 2, 250000.00, 'RUB', '2025-12-15 11:20:00'),
(1003, 'Test Deal 3 - Won', 'WON', 1, 180000.00, 'RUB', '2025-11-20 09:15:00');

-- Вставка тестовых пользователей
INSERT INTO users (id, name, department) VALUES
(1, 'John Doe', 'IT'),
(2, 'Jane Smith', 'Sales'),
(3, 'Bob Johnson', 'HR');

-- Вставка тестовых статусов задач
INSERT INTO task_statuses (id, name) VALUES
('DT140_12:UC_0VHWE2', 'Новая задача'),
('DT140_12:PREPARATION', 'Подготовка'),
('DT140_12:CLIENT', 'У клиента');

-- Вставка тестовых статусов сделок
INSERT INTO deal_statuses (id, name) VALUES
('NEW', 'Новая'),
('PREPARATION', 'Подготовка'),
('WON', 'Выиграна'),
('LOSE', 'Проиграна');