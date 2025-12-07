/**
 * JSDoc типы для тикетов дашборда сектора 1С
 * 
 * Определяет структуру данных тикетов для улучшения типизации и документации.
 */

/**
 * Базовые поля тикета
 * 
 * @typedef {Object} TicketBase
 * @property {number} id - ID тикета
 * @property {string} title - Название тикета
 * @property {string} stageId - ID стадии
 * @property {number} assignedById - ID ответственного
 * @property {string} createdAt - Дата создания
 * @property {string} updatedAt - Дата обновления
 * @property {string} priority - Приоритет
 * @property {number} opportunity - Сумма
 * @property {string} currencyId - ID валюты
 * @property {string} comments - Комментарии
 */

/**
 * Дополнительные поля тикета
 * 
 * Содержит структурированные пользовательские поля (UF_*) из Bitrix24.
 * 
 * @typedef {Object} TicketAdditionalFields
 * @property {string|null} typeProduct - Тип продукта (UF_CRM_7_TYPE_PRODUCT)
 * @property {Object} all - Все пользовательские поля (UF_*)
 */

/**
 * Полные данные тикета
 * 
 * Содержит базовые поля, дополнительные поля и исходные данные из Bitrix24.
 * 
 * @typedef {Object} TicketDetails
 * @property {number} id - ID тикета
 * @property {string} title - Название тикета
 * @property {string} stageId - ID стадии
 * @property {number} assignedById - ID ответственного
 * @property {string} createdAt - Дата создания
 * @property {string} updatedAt - Дата обновления
 * @property {string} priority - Приоритет
 * @property {number} opportunity - Сумма
 * @property {string} currencyId - ID валюты
 * @property {string} comments - Комментарии
 * @property {TicketAdditionalFields} additionalFields - Дополнительные поля
 * @property {Object} rawData - Исходные данные из Bitrix24
 */


