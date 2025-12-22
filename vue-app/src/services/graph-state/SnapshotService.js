/**
 * Сервис для работы со слепками состояния сектора
 * 
 * Предоставляет методы для создания, чтения и управления слепками состояния сектора 1С.
 * Работает через PHP API endpoints для сохранения/чтения JSON-файлов.
 * 
 * @class SnapshotService
 */

import snapshotConfig from '@/config/snapshot-config.js';

/**
 * Сервис для работы со слепками состояния сектора
 */
class SnapshotService {
  /**
   * Получить базовый URL API
   * Определяется автоматически на основе текущего пути
   * 
   * @private
   * @returns {string} Базовый URL для API запросов
   */
  static getApiBaseUrl() {
    if (snapshotConfig.apiBaseUrl) {
      return snapshotConfig.apiBaseUrl;
    }
    
    // Определяем базовый путь автоматически
    const path = window.location.pathname;
    const basePath = path.substring(0, path.lastIndexOf('/'));
    return basePath;
  }

  /**
   * Создать новый слепок состояния сектора
   * 
   * @param {Object} sectorData - Данные сектора из DashboardSector1CService
   * @param {String} type - Тип слепка: 'week_start' | 'week_end' | 'manual' | 'current'
   * @param {Object} metadata - Дополнительные метаданные
   * @param {Object} metadata.createdBy - Информация о создателе: { id: number, name: string }
   * @param {String} metadata.sectorId - Идентификатор сектора (по умолчанию: '1C')
   * @returns {Promise<Object>} Созданный слепок
   * 
   * @example
   * const sectorData = await DashboardSector1CService.getSectorData();
   * const snapshot = await SnapshotService.createSnapshot(
   *   sectorData,
   *   'week_start',
   *   {
   *     createdBy: { id: 123, name: 'Иван Иванов' }
   *   }
   * );
   */
  static async createSnapshot(sectorData, type, metadata = {}) {
    try {
      // Валидация входных данных
      if (!sectorData || typeof sectorData !== 'object') {
        throw new SnapshotError('sectorData должен быть объектом', 'VALIDATION_ERROR');
      }
      if (!type || !['week_start', 'week_end', 'manual', 'current'].includes(type)) {
        throw new SnapshotError('type должен быть одним из: week_start, week_end, manual, current', 'VALIDATION_ERROR');
      }

      // Валидация данных сектора
      const sectorValidation = this.validateSectorData(sectorData);
      if (!sectorValidation.isValid) {
        throw new SnapshotError(
          `Ошибка валидации данных сектора: ${sectorValidation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          { validation: sectorValidation }
        );
      }

      // Нормализация данных
      const normalizedData = this.normalizeSectorData(sectorData);
      
      // Генерация метаданных
      const snapshotMetadata = this.generateSnapshotMetadata(
        type,
        metadata.createdBy,
        metadata.sectorId || snapshotConfig.defaultSectorId
      );

      // Формирование структуры слепка
      const snapshot = {
        metadata: snapshotMetadata,
        statistics: normalizedData.statistics,
        ticketIds: normalizedData.ticketIds,
        tickets: normalizedData.tickets
      };

      // Валидация созданного слепка
      const snapshotValidation = this.validateSnapshot(snapshot);
      if (!snapshotValidation.isValid) {
        throw new SnapshotError(
          `Ошибка валидации слепка: ${snapshotValidation.errors.join(', ')}`,
          'VALIDATION_ERROR',
          { validation: snapshotValidation }
        );
      }

      if (snapshotValidation.warnings.length > 0) {
        console.warn('Предупреждения при валидации слепка:', snapshotValidation.warnings);
      }

      // Отправка запроса к PHP API
      const apiBaseUrl = this.getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}${snapshotConfig.snapshotsEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          action: 'create',
          snapshot,
          type,
          date: this.formatDate(new Date())
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Ошибка создания слепка');
      }

      return result.data.snapshot;
    } catch (error) {
      console.error('SnapshotService.createSnapshot error:', error);
      if (error instanceof SnapshotError) {
        throw error;
      }
      throw new SnapshotError(
        `Ошибка создания слепка: ${error.message}`,
        'API_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Получить конкретный слепок по дате и типу
   * 
   * @param {String|Date} date - Дата слепка в формате 'YYYY-MM-DD' или объект Date
   * @param {String} type - Тип слепка: 'week_start' | 'week_end' | 'manual' | 'current'
   * @returns {Promise<Object|null>} Слепок или null, если не найден
   * 
   * @example
   * const snapshot = await SnapshotService.getSnapshot('2025-12-01', 'week_start');
   */
  static async getSnapshot(date, type) {
    try {
      const dateStr = this.formatDate(date);
      const apiBaseUrl = this.getApiBaseUrl();
      const url = `${apiBaseUrl}${snapshotConfig.snapshotsEndpoint}?action=get&date=${dateStr}&type=${type}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (response.status === 404) {
        return null; // Слепок не найден
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        // Если слепок не найден, возвращаем null вместо ошибки
        if (result.message && result.message.includes('не найден')) {
          return null;
        }
        throw new Error(result.message || 'Ошибка получения слепка');
      }

      return result.data.snapshot;
    } catch (error) {
      console.error('SnapshotService.getSnapshot error:', error);
      throw error;
    }
  }

  /**
   * Получить все слепки за период
   * 
   * @param {Object} period - Период выборки
   * @param {String|Date} period.startDate - Начальная дата (включительно)
   * @param {String|Date} period.endDate - Конечная дата (включительно)
   * @param {String} period.type - Фильтр по типу слепка (опционально)
   * @param {String} period.sectorId - Фильтр по сектору (опционально, по умолчанию: '1C')
   * @returns {Promise<Array<Object>>} Массив слепков, отсортированных по дате создания
   * 
   * @example
   * const snapshots = await SnapshotService.getAllSnapshots({
   *   startDate: '2025-12-01',
   *   endDate: '2025-12-07',
   *   type: 'week_start'
   * });
   */
  static async getAllSnapshots(period = {}) {
    try {
      const params = new URLSearchParams();
      params.append('action', 'list');
      
      if (period.startDate) {
        params.append('startDate', this.formatDate(period.startDate));
      }
      if (period.endDate) {
        params.append('endDate', this.formatDate(period.endDate));
      }
      if (period.type) {
        params.append('type', period.type);
      }
      if (period.sectorId) {
        params.append('sectorId', period.sectorId);
      } else {
        params.append('sectorId', snapshotConfig.defaultSectorId);
      }

      const apiBaseUrl = this.getApiBaseUrl();
      const url = `${apiBaseUrl}${snapshotConfig.snapshotsEndpoint}?${params.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Ошибка получения списка слепков');
      }

      // Загрузить детали каждого слепка
      const snapshots = await Promise.all(
        result.data.snapshots.map(async (snapshotInfo) => {
          try {
            return await this.getSnapshot(snapshotInfo.date, snapshotInfo.type);
          } catch (error) {
            console.warn(`Ошибка загрузки слепка ${snapshotInfo.date}/${snapshotInfo.type}:`, error);
            return null;
          }
        })
      );

      // Отфильтровать null и отсортировать по дате
      return snapshots
        .filter(snapshot => snapshot !== null)
        .sort((a, b) => new Date(a.metadata.createdAt) - new Date(b.metadata.createdAt));
    } catch (error) {
      console.error('SnapshotService.getAllSnapshots error:', error);
      throw error;
    }
  }

  /**
   * Преобразовать данные сектора в формат слепка версии 1.0
   * 
   * @param {Object} sectorData - Данные из DashboardSector1CService.getSectorData()
   * @returns {Object} Нормализованные данные для слепка
   * @private
   */
  static normalizeSectorData(sectorData) {
    const { stages = [], employees = [], zeroPointTickets = {} } = sectorData;

    // Статистика по этапам
    const stagesStats = {
      formed: { count: 0, stageId: 'DT140_12:UC_0VHWE2', stageName: 'Сформировано обращение' },
      review: { count: 0, stageId: 'DT140_12:PREPARATION', stageName: 'Рассмотрение ТЗ' },
      execution: { count: 0, stageId: 'DT140_12:CLIENT', stageName: 'Исполнение' }
    };

    // Статистика по сотрудникам
    const employeesStats = [];

    // Собираем все тикеты и их ID
    const allTicketIds = [];
    const allTickets = [];

    // Обрабатываем этапы
    stages.forEach(stage => {
      const stageId = stage.id; // 'formed', 'review', 'execution'
      
      if (stagesStats[stageId]) {
        // Подсчитываем тикеты на этапе
        let stageTicketCount = 0;
        
        stage.employees.forEach(employee => {
          const employeeTickets = employee.tickets || [];
          stageTicketCount += employeeTickets.length;

          // Статистика по сотруднику
          let employeeStats = employeesStats.find(e => e.id === employee.id);
          if (!employeeStats) {
            employeeStats = {
              id: employee.id,
              name: employee.name,
              ticketsByStage: { formed: 0, review: 0, execution: 0 },
              totalTickets: 0
            };
            employeesStats.push(employeeStats);
          }

          employeeTickets.forEach(ticket => {
            allTicketIds.push(ticket.id);
            allTickets.push({
              id: ticket.id,
              title: ticket.title || 'Без названия',
              assignedTo: {
                id: employee.id,
                name: employee.name
              },
              createdAt: ticket.createdAt || '',
              updatedAt: ticket.modifiedAt || ticket.updatedAt || ''
            });

            // Обновляем статистику сотрудника
            employeeStats.ticketsByStage[stageId] = (employeeStats.ticketsByStage[stageId] || 0) + 1;
            employeeStats.totalTickets += 1;
          });
        });

        stagesStats[stageId].count = stageTicketCount;
      }
    });

    // Статистика нулевой точки
    const zeroPointStats = {
      unassigned: 0,
      keeper: 0,
      total: 0
    };

    Object.values(zeroPointTickets).forEach(tickets => {
      if (Array.isArray(tickets)) {
        tickets.forEach(ticket => {
          zeroPointStats.total += 1;
          // Проверяем, является ли тикет с ответственным "Хранитель объектов" (ID: 1051)
          if (ticket.assigneeId === 1051 || ticket.assignedById === 1051) {
            zeroPointStats.keeper += 1;
          } else {
            zeroPointStats.unassigned += 1;
          }

          // Добавляем тикет в общий список
          allTicketIds.push(ticket.id);
          allTickets.push({
            id: ticket.id,
            title: ticket.title || 'Без названия',
            assignedTo: ticket.assignedTo || ticket.assignedById ? {
              id: ticket.assignedById || ticket.assigneeId,
              name: 'Неизвестный'
            } : null,
            createdAt: ticket.createdAt || '',
            updatedAt: ticket.modifiedAt || ticket.updatedAt || ''
          });
        });
      }
    });

    // Общее количество тикетов
    const totalTickets = Object.values(stagesStats).reduce((sum, stage) => sum + stage.count, 0) + zeroPointStats.total;

    return {
      statistics: {
        stages: {
          ...stagesStats,
          total: totalTickets
        },
        employees: employeesStats,
        zeroPoint: zeroPointStats
      },
      ticketIds: [...new Set(allTicketIds)], // Уникальные ID
      tickets: allTickets
    };
  }

  /**
   * Сгенерировать метаданные слепка
   * 
   * @param {String} type - Тип слепка
   * @param {Object} createdBy - Информация о создателе: { id: number, name: string }
   * @param {String} sectorId - Идентификатор сектора
   * @returns {Object} Объект метаданных
   * @private
   */
  static generateSnapshotMetadata(type, createdBy, sectorId) {
    const now = new Date();
    
    // Форматируем дату в ISO 8601 с часовым поясом UTC+3 (Брест)
    const timezoneOffset = -now.getTimezoneOffset(); // минуты
    const hours = Math.floor(timezoneOffset / 60);
    const minutes = timezoneOffset % 60;
    const timezoneStr = `${hours >= 0 ? '+' : ''}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    
    const createdAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}${timezoneStr}`;

    return {
      version: snapshotConfig.snapshotVersion,
      createdAt,
      createdBy: createdBy || { id: 0, name: 'Система' },
      type,
      sectorId,
      sectorName: sectorId === '1C' ? 'Сектор 1С' : `Сектор ${sectorId}`
    };
  }

  /**
   * Нормализовать дату в формат YYYY-MM-DD
   * 
   * @param {String|Date} date - Дата
   * @returns {String} Дата в формате YYYY-MM-DD
   * @private
   */
  static formatDate(date) {
    if (!date) {
      date = new Date();
    }
    
    if (typeof date === 'string') {
      // Если уже в формате YYYY-MM-DD, вернуть как есть
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      date = new Date(date);
    }
    
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Некорректная дата');
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Построить путь к файлу слепка согласно архитектуре хранения
   * 
   * @param {String|Date} date - Дата слепка
   * @param {String} type - Тип слепка
   * @returns {String} Путь к файлу (например, '2025/week-49/week-start-2025-12-01.json')
   * @private
   */
  static buildFilePath(date, type) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const year = dateObj.getFullYear();
    
    // Определяем номер недели (ISO Week Number)
    const weekNumber = this.getWeekNumber(dateObj);
    
    // Форматируем дату
    const dateStr = this.formatDate(date);
    
    // Формируем имя файла
    let filename;
    if (type === 'current') {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      filename = `current-state-${dateStr}-${timeStr}.json`;
    } else if (type === 'manual') {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
      filename = `manual-${dateStr}-${timeStr}.json`;
    } else {
      filename = `${type}-${dateStr}.json`;
    }
    
    // Для типа 'current' используем папку current/
    if (type === 'current') {
      return `current/${filename}`;
    }
    
    return `${year}/week-${weekNumber}/${filename}`;
  }

  /**
   * Получить номер недели по ISO 8601
   * 
   * @param {Date} date - Дата
   * @returns {number} Номер недели (1-53)
   * @private
   */
  static getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  }

  // ==================== Валидация данных ====================

  /**
   * Валидировать структуру слепка перед сохранением
   * 
   * @param {Object} snapshot - Объект слепка для валидации
   * @returns {Object} Результат валидации: { isValid: boolean, errors: Array<string>, warnings: Array<string> }
   * 
   * @example
   * const validation = SnapshotService.validateSnapshot(snapshot);
   * if (!validation.isValid) {
   *   console.error('Ошибки валидации:', validation.errors);
   * }
   */
  static validateSnapshot(snapshot) {
    const errors = [];
    const warnings = [];

    // Валидация метаданных
    if (!snapshot.metadata) {
      errors.push('Отсутствуют метаданные слепка');
    } else {
      if (!snapshot.metadata.version || typeof snapshot.metadata.version !== 'string') {
        errors.push('Неверная версия формата данных');
      }
      if (!snapshot.metadata.createdAt || !this.isValidISODate(snapshot.metadata.createdAt)) {
        errors.push('Неверная дата создания');
      }
      if (!['week_start', 'week_end', 'manual', 'current'].includes(snapshot.metadata.type)) {
        errors.push('Неверный тип слепка');
      }
      if (!snapshot.metadata.sectorId || typeof snapshot.metadata.sectorId !== 'string') {
        errors.push('Неверный идентификатор сектора');
      }
      if (!snapshot.metadata.createdBy || !snapshot.metadata.createdBy.id || !snapshot.metadata.createdBy.name) {
        errors.push('Неверная информация о создателе');
      }
    }

    // Валидация статистики
    if (!snapshot.statistics) {
      errors.push('Отсутствует статистика');
    } else {
      if (!snapshot.statistics.stages) {
        errors.push('Отсутствует статистика по этапам');
      } else {
        const stages = snapshot.statistics.stages;
        const total = (stages.formed?.count || 0) + (stages.review?.count || 0) + (stages.execution?.count || 0);
        if (stages.total !== total) {
          warnings.push(`Несоответствие общего количества тикетов: ожидается ${total}, указано ${stages.total}`);
        }
      }
      if (!Array.isArray(snapshot.statistics.employees)) {
        errors.push('Статистика по сотрудникам должна быть массивом');
      }
      if (!snapshot.statistics.zeroPoint) {
        errors.push('Отсутствует статистика нулевой точки');
      } else {
        const zp = snapshot.statistics.zeroPoint;
        const zpTotal = (zp.unassigned || 0) + (zp.keeper || 0);
        if (zp.total !== zpTotal) {
          warnings.push(`Несоответствие статистики нулевой точки: ожидается ${zpTotal}, указано ${zp.total}`);
        }
      }
    }

    // Валидация тикетов
    if (!Array.isArray(snapshot.ticketIds)) {
      errors.push('ticketIds должен быть массивом');
    }
    if (!Array.isArray(snapshot.tickets)) {
      errors.push('tickets должен быть массивом');
    } else {
      // Проверка согласованности ID
      const ticketIds = new Set(snapshot.ticketIds);
      const ticketsIds = new Set(snapshot.tickets.map(t => t.id));
      
      if (ticketIds.size !== ticketsIds.size) {
        warnings.push('Количество ID в ticketIds не совпадает с количеством тикетов');
      }
      
      // Проверка минимальных полей тикетов
      snapshot.tickets.forEach((ticket, index) => {
        if (!ticket.id) {
          errors.push(`Тикет #${index}: отсутствует ID`);
        }
        if (!ticket.title) {
          errors.push(`Тикет #${index}: отсутствует заголовок`);
        }
        if (!ticket.assignedTo || !ticket.assignedTo.id) {
          warnings.push(`Тикет #${index}: отсутствует ответственный (может быть в нулевой точке)`);
        }
        if (!ticket.createdAt) {
          errors.push(`Тикет #${index}: отсутствует дата создания`);
        }
        if (!ticket.updatedAt) {
          errors.push(`Тикет #${index}: отсутствует дата обновления`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Валидировать данные сектора перед созданием слепка
   * 
   * @param {Object} sectorData - Данные сектора из DashboardSector1CService.getSectorData()
   * @returns {Object} Результат валидации: { isValid: boolean, errors: Array<string>, warnings: Array<string> }
   */
  static validateSectorData(sectorData) {
    const errors = [];
    const warnings = [];

    if (!sectorData || typeof sectorData !== 'object') {
      errors.push('sectorData должен быть объектом');
      return { isValid: false, errors, warnings };
    }

    if (!Array.isArray(sectorData.stages)) {
      errors.push('stages должен быть массивом');
    }
    if (!Array.isArray(sectorData.employees)) {
      errors.push('employees должен быть массивом');
    }
    if (!sectorData.zeroPointTickets || typeof sectorData.zeroPointTickets !== 'object') {
      errors.push('zeroPointTickets должен быть объектом');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Проверить, является ли строка валидной датой в формате ISO 8601
   * 
   * @param {String} dateStr - Строка с датой
   * @returns {boolean} true, если дата валидна
   * @private
   */
  static isValidISODate(dateStr) {
    if (typeof dateStr !== 'string') {
      return false;
    }
    const date = new Date(dateStr);
    return !isNaN(date.getTime()) && dateStr.includes('T');
  }

  // ==================== Удаление слепков ====================

  /**
   * Удалить конкретный слепок по дате и типу
   * 
   * @param {String|Date} date - Дата слепка
   * @param {String} type - Тип слепка
   * @returns {Promise<boolean>} true если удалён, false если не найден
   * 
   * @example
   * const deleted = await SnapshotService.deleteSnapshot('2025-12-01', 'week_start');
   */
  static async deleteSnapshot(date, type) {
    try {
      const dateStr = this.formatDate(date);
      const apiBaseUrl = this.getApiBaseUrl();
      const url = `${apiBaseUrl}${snapshotConfig.snapshotsEndpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          action: 'delete',
          date: dateStr,
          type: type
        })
      });

      if (response.status === 404) {
        return false; // Слепок не найден
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Ошибка удаления слепка');
      }

      return true;
    } catch (error) {
      console.error('SnapshotService.deleteSnapshot error:', error);
      throw error;
    }
  }

  /**
   * Удалить все слепки за указанный период
   * 
   * @param {Object} period - Период удаления
   * @param {String|Date} period.startDate - Начальная дата
   * @param {String|Date} period.endDate - Конечная дата
   * @param {String} period.type - Фильтр по типу (опционально)
   * @returns {Promise<number>} Количество удалённых слепков
   * 
   * @example
   * const deletedCount = await SnapshotService.deleteSnapshotsByPeriod({
   *   startDate: '2025-12-01',
   *   endDate: '2025-12-31'
   * });
   */
  static async deleteSnapshotsByPeriod(period) {
    try {
      const snapshots = await this.getAllSnapshots(period);
      let deletedCount = 0;

      for (const snapshot of snapshots) {
        try {
          const deleted = await this.deleteSnapshot(
            snapshot.metadata.createdAt.split('T')[0],
            snapshot.metadata.type
          );
          if (deleted) {
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Ошибка удаления слепка ${snapshot.metadata.createdAt}:`, error);
          // Продолжаем с остальными слепками
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('SnapshotService.deleteSnapshotsByPeriod error:', error);
      throw error;
    }
  }

  // ==================== Управление версиями ====================

  /**
   * Получить версию формата слепка
   * 
   * @param {Object} snapshot - Слепок
   * @returns {String} Версия формата (например, '1.0')
   */
  static getSnapshotVersion(snapshot) {
    return snapshot?.metadata?.version || 'unknown';
  }

  /**
   * Мигрировать слепок старой версии в новую версию формата
   * 
   * @param {Object} snapshot - Слепок для миграции
   * @param {String} targetVersion - Целевая версия (по умолчанию: текущая версия из конфига)
   * @returns {Promise<Object>} Мигрированный слепок
   * 
   * @example
   * const migratedSnapshot = await SnapshotService.migrateSnapshot(oldSnapshot, '2.0');
   */
  static async migrateSnapshot(snapshot, targetVersion = snapshotConfig.snapshotVersion) {
    const currentVersion = this.getSnapshotVersion(snapshot);

    // Если версия совпадает, возвращаем без изменений
    if (currentVersion === targetVersion) {
      return snapshot;
    }

    // На текущий момент (версия 1.0) миграция не требуется
    // Метод готов к будущим версиям
    if (currentVersion === '1.0' && targetVersion === '1.0') {
      return snapshot;
    }

    // В будущем здесь будут адаптеры миграции
    console.warn(`Миграция с версии ${currentVersion} на ${targetVersion} пока не реализована`);
    
    // Обновляем версию в метаданных
    const migratedSnapshot = {
      ...snapshot,
      metadata: {
        ...snapshot.metadata,
        version: targetVersion
      }
    };

    return migratedSnapshot;
  }

  // ==================== Утилиты для работы с датами ====================

  /**
   * Получить номер недели года по ISO 8601
   * 
   * @param {String|Date} date - Дата
   * @returns {Object} { year: number, week: number }
   * 
   * @example
   * const weekInfo = SnapshotService.getWeekNumberInfo('2025-12-08');
   * // { year: 2025, week: 50 }
   */
  static getWeekNumberInfo(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const week = this.getWeekNumber(dateObj);
    return {
      year: dateObj.getFullYear(),
      week: week
    };
  }

  /**
   * Получить дату начала недели (понедельник) для указанной даты
   * 
   * @param {String|Date} date - Дата
   * @returns {Date} Дата начала недели (понедельник 00:00)
   * 
   * @example
   * const weekStart = SnapshotService.getWeekStartDate('2025-12-08');
   */
  static getWeekStartDate(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeek = dateObj.getDay() || 7; // 1 = понедельник, 7 = воскресенье
    const diff = dayOfWeek - 1; // Количество дней до понедельника
    
    const weekStart = new Date(dateObj);
    weekStart.setDate(dateObj.getDate() - diff);
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
  }

  /**
   * Получить дату конца недели (воскресенье) для указанной даты
   * 
   * @param {String|Date} date - Дата
   * @returns {Date} Дата конца недели (воскресенье 23:59:59)
   * 
   * @example
   * const weekEnd = SnapshotService.getWeekEndDate('2025-12-08');
   */
  static getWeekEndDate(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const dayOfWeek = dateObj.getDay() || 7; // 1 = понедельник, 7 = воскресенье
    const diff = 7 - dayOfWeek; // Количество дней до воскресенья
    
    const weekEnd = new Date(dateObj);
    weekEnd.setDate(dateObj.getDate() + diff);
    weekEnd.setHours(23, 59, 59, 999);
    
    return weekEnd;
  }

  /**
   * Получить все слепки за указанную неделю
   * 
   * @param {String|Date} date - Любая дата недели
   * @returns {Promise<Object>} Объект с слепками недели
   * 
   * @example
   * const weekSnapshots = await SnapshotService.getSnapshotsForWeek('2025-12-08');
   */
  static async getSnapshotsForWeek(date) {
    try {
      const weekStart = this.getWeekStartDate(date);
      const weekEnd = this.getWeekEndDate(date);
      
      const weekInfo = this.getWeekNumberInfo(date);
      
      const allSnapshots = await this.getAllSnapshots({
        startDate: weekStart,
        endDate: weekEnd
      });

      const weekStartSnapshot = allSnapshots.find(s => s.metadata.type === 'week_start') || null;
      const weekEndSnapshot = allSnapshots.find(s => s.metadata.type === 'week_end') || null;
      const manualSnapshots = allSnapshots.filter(s => s.metadata.type === 'manual');

      return {
        weekStart: weekStartSnapshot,
        weekEnd: weekEndSnapshot,
        manual: manualSnapshots,
        weekInfo: weekInfo
      };
    } catch (error) {
      console.error('SnapshotService.getSnapshotsForWeek error:', error);
      throw error;
    }
  }

  // ==================== Обработка ошибок ====================

  /**
   * Обработать ошибку и вернуть понятное сообщение
   * 
   * @param {Error} error - Объект ошибки
   * @returns {Object} Обработанная ошибка: { message: string, code: string, details: object }
   */
  static handleError(error) {
    if (error instanceof SnapshotError) {
      return {
        message: error.message,
        code: error.code,
        details: error.details
      };
    }

    // Определяем тип ошибки по сообщению
    let code = 'UNKNOWN_ERROR';
    if (error.message.includes('валидац')) {
      code = 'VALIDATION_ERROR';
    } else if (error.message.includes('404') || error.message.includes('не найден')) {
      code = 'NOT_FOUND';
    } else if (error.message.includes('HTTP') || error.message.includes('API')) {
      code = 'API_ERROR';
    } else if (error.message.includes('версия') || error.message.includes('version')) {
      code = 'VERSION_MISMATCH';
    } else if (error.message.includes('доступ') || error.message.includes('permission')) {
      code = 'PERMISSION_DENIED';
    }

    return {
      message: error.message || 'Неизвестная ошибка',
      code: code,
      details: {
        originalError: error
      }
    };
  }

  // ==================== Статистика ====================

  /**
   * Получить статистику по слепкам за период
   * 
   * @param {Object} period - Период анализа (опционально)
   * @returns {Promise<Object>} Статистика по слепкам
   * 
   * @example
   * const stats = await SnapshotService.getSnapshotsStatistics();
   */
  static async getSnapshotsStatistics(period = {}) {
    try {
      const snapshots = await this.getAllSnapshots(period);

      const byType = {
        week_start: 0,
        week_end: 0,
        manual: 0,
        current: 0
      };

      const byWeekMap = new Map();

      let oldest = null;
      let newest = null;

      snapshots.forEach(snapshot => {
        // Подсчёт по типам
        const type = snapshot.metadata.type;
        if (byType.hasOwnProperty(type)) {
          byType[type]++;
        }

        // Подсчёт по неделям
        const weekInfo = this.getWeekNumberInfo(snapshot.metadata.createdAt);
        const weekKey = `${weekInfo.year}-W${weekInfo.week}`;
        byWeekMap.set(weekKey, (byWeekMap.get(weekKey) || 0) + 1);

        // Поиск самого старого и нового
        const createdAt = new Date(snapshot.metadata.createdAt);
        if (!oldest || createdAt < new Date(oldest.metadata.createdAt)) {
          oldest = snapshot;
        }
        if (!newest || createdAt > new Date(newest.metadata.createdAt)) {
          newest = snapshot;
        }
      });

      const byWeek = Array.from(byWeekMap.entries()).map(([key, count]) => {
        const [year, week] = key.split('-W');
        return {
          year: parseInt(year),
          week: parseInt(week),
          count: count
        };
      }).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.week - b.week;
      });

      return {
        total: snapshots.length,
        byType: byType,
        byWeek: byWeek,
        oldest: oldest,
        newest: newest
      };
    } catch (error) {
      console.error('SnapshotService.getSnapshotsStatistics error:', error);
      throw error;
    }
  }
}

/**
 * Класс ошибок для работы со слепками
 * 
 * @class SnapshotError
 */
export class SnapshotError extends Error {
  /**
   * @param {String} message - Сообщение об ошибке
   * @param {String} code - Код ошибки: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'API_ERROR' | 'VERSION_MISMATCH' | 'PERMISSION_DENIED'
   * @param {Object} details - Дополнительные детали ошибки
   */
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'SnapshotError';
    this.code = code;
    this.details = details;
  }
}

export default SnapshotService;

