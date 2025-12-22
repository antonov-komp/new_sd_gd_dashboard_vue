/**
 * Утилита для сравнения слепков состояния сектора
 * 
 * Предоставляет функции для вычисления разницы (дельта) между слепками
 * по этапам, сотрудникам и нулевой точке, а также для визуализации изменений
 * 
 * @class CompareSnapshots
 */
class CompareSnapshots {
  /**
   * Сравнить два слепка состояния сектора
   * 
   * @param {Object} snapshot1 - Первый слепок (базовый, для сравнения)
   * @param {Object} snapshot2 - Второй слепок (новый, с которым сравниваем)
   * @param {Object} options - Опции сравнения
   * @param {boolean} options.includeTickets - Включать сравнение тикетов (по умолчанию false)
   * @param {boolean} options.includeEmployees - Включать сравнение сотрудников (по умолчанию true)
   * @returns {Object} Результат сравнения
   * 
   * @example
   * const comparison = CompareSnapshots.compareTwoSnapshots(
   *   weekStartSnapshot,
   *   weekEndSnapshot,
   *   { includeTickets: true }
   * );
   * 
   * @example
   * // Сравнение только этапов (без сотрудников и тикетов)
   * const comparison = CompareSnapshots.compareTwoSnapshots(
   *   snapshot1,
   *   snapshot2,
   *   { includeEmployees: false, includeTickets: false }
   * );
   */
  static compareTwoSnapshots(snapshot1, snapshot2, options = {}) {
    const {
      includeTickets = false,
      includeEmployees = true
    } = options;

    // Валидация входных данных
    const validation1 = this.validateSnapshot(snapshot1);
    const validation2 = this.validateSnapshot(snapshot2);

    if (!validation1.valid || !validation2.valid) {
      throw new Error('Invalid snapshot structure: ' + 
        [...validation1.errors, ...validation2.errors].join(', '));
    }

    // Метаданные сравнения
    const metadata = this.buildComparisonMetadata(snapshot1, snapshot2);

    // Сравнение этапов
    const stages = this.compareStages(
      snapshot1.statistics.stages,
      snapshot2.statistics.stages
    );

    // Сравнение сотрудников (если включено)
    const employees = includeEmployees
      ? this.compareEmployees(
          snapshot1.statistics.employees || [],
          snapshot2.statistics.employees || []
        )
      : [];

    // Сравнение нулевой точки
    const zeroPoint = this.compareZeroPoint(
      snapshot1.statistics.zeroPoint || {},
      snapshot2.statistics.zeroPoint || {}
    );

    // Сравнение тикетов (если включено)
    const tickets = includeTickets
      ? this.compareTickets(
          snapshot1.ticketIds || [],
          snapshot2.ticketIds || [],
          snapshot1.tickets || [],
          snapshot2.tickets || []
        )
      : null;

    // Формирование summary
    const summary = this.buildSummary(stages, employees, zeroPoint, tickets);

    return {
      metadata,
      stages,
      employees,
      zeroPoint,
      tickets,
      summary
    };
  }

  /**
   * Вычислить дельту между двумя значениями
   * 
   * @param {number|null|undefined} value1 - Первое значение (базовое)
   * @param {number|null|undefined} value2 - Второе значение (новое)
   * @returns {Object} Объект с дельтой, процентом и трендом
   * 
   * @example
   * const delta = CompareSnapshots.calculateDelta(5, 3);
   * // { value1: 5, value2: 3, delta: -2, deltaPercent: -40, trend: "decrease" }
   */
  static calculateDelta(value1, value2) {
    const normalized1 = this.normalizeValue(value1);
    const normalized2 = this.normalizeValue(value2);
    const delta = normalized2 - normalized1;

    // Вычисление процента изменения
    let deltaPercent = 0;
    if (normalized1 !== 0) {
      deltaPercent = (delta / normalized1) * 100;
    } else if (normalized2 !== 0) {
      // Если базовое значение 0, а новое не 0, то изменение = 100%
      deltaPercent = normalized2 > 0 ? Infinity : -Infinity;
    }

    // Определение тренда
    const trend = this.getTrend(delta);

    return {
      value1: normalized1,
      value2: normalized2,
      delta,
      deltaPercent: Math.round(deltaPercent * 100) / 100, // Округление до 2 знаков
      trend
    };
  }

  /**
   * Нормализовать значение (null/undefined → 0)
   * 
   * @param {number|null|undefined} value - Значение для нормализации
   * @returns {number} Нормализованное значение
   */
  static normalizeValue(value) {
    if (value === null || value === undefined || isNaN(value)) {
      return 0;
    }
    return Number(value);
  }

  /**
   * Определить тренд по дельте
   * 
   * @param {number} delta - Дельта (разница)
   * @returns {string} "increase" | "decrease" | "stable"
   */
  static getTrend(delta) {
    if (delta > 0) return 'increase';
    if (delta < 0) return 'decrease';
    return 'stable';
  }

  /**
   * Сравнить этапы между двумя слепками
   * 
   * @private
   * @param {Object} stages1 - Этапы из первого слепка
   * @param {Object} stages2 - Этапы из второго слепка
   * @returns {Object} Результат сравнения этапов
   */
  static compareStages(stages1, stages2) {
    const stageKeys = ['formed', 'review', 'execution'];
    const result = {};

    // Сравнение каждого этапа
    for (const key of stageKeys) {
      const count1 = stages1[key]?.count || 0;
      const count2 = stages2[key]?.count || 0;
      result[key] = this.calculateDelta(count1, count2);
    }

    // Сравнение общего количества
    const total1 = stages1.total || 0;
    const total2 = stages2.total || 0;
    result.total = this.calculateDelta(total1, total2);

    return result;
  }

  /**
   * Сравнить сотрудников между двумя слепками
   * 
   * @private
   * @param {Array} employees1 - Сотрудники из первого слепка
   * @param {Array} employees2 - Сотрудники из второго слепка
   * @returns {Array} Результат сравнения сотрудников
   */
  static compareEmployees(employees1, employees2) {
    const employeesMap1 = new Map(employees1.map(emp => [emp.id, emp]));
    const employeesMap2 = new Map(employees2.map(emp => [emp.id, emp]));
    
    const allEmployeeIds = new Set([
      ...employeesMap1.keys(),
      ...employeesMap2.keys()
    ]);

    const result = [];

    for (const employeeId of allEmployeeIds) {
      const emp1 = employeesMap1.get(employeeId) || null;
      const emp2 = employeesMap2.get(employeeId) || null;

      // Если сотрудник есть только в одном из слепков
      if (!emp1 || !emp2) {
        result.push({
          id: employeeId,
          name: emp1?.name || emp2?.name || 'Неизвестный',
          snapshot1: emp1 ? {
            ticketsByStage: emp1.ticketsByStage || {},
            totalTickets: emp1.totalTickets || 0
          } : null,
          snapshot2: emp2 ? {
            ticketsByStage: emp2.ticketsByStage || {},
            totalTickets: emp2.totalTickets || 0
          } : null,
          delta: this.calculateEmployeeDelta(emp1, emp2),
          trend: emp1 ? 'removed' : 'new'
        });
        continue;
      }

      // Сравнение тикетов по этапам
      const ticketsByStageDelta = {};
      const stageKeys = ['formed', 'review', 'execution'];
      for (const stageKey of stageKeys) {
        const count1 = emp1.ticketsByStage?.[stageKey] || 0;
        const count2 = emp2.ticketsByStage?.[stageKey] || 0;
        ticketsByStageDelta[stageKey] = this.calculateDelta(count1, count2);
      }

      // Сравнение общего количества тикетов
      const totalDelta = this.calculateDelta(
        emp1.totalTickets || 0,
        emp2.totalTickets || 0
      );

      result.push({
        id: employeeId,
        name: emp1.name,
        snapshot1: {
          ticketsByStage: emp1.ticketsByStage || {},
          totalTickets: emp1.totalTickets || 0
        },
        snapshot2: {
          ticketsByStage: emp2.ticketsByStage || {},
          totalTickets: emp2.totalTickets || 0
        },
        delta: {
          ticketsByStage: ticketsByStageDelta,
          totalTickets: totalDelta
        },
        trend: totalDelta.trend
      });
    }

    return result;
  }

  /**
   * Вычислить дельту для сотрудника (вспомогательная функция)
   * 
   * @private
   * @param {Object|null} emp1 - Сотрудник из первого слепка
   * @param {Object|null} emp2 - Сотрудник из второго слепка
   * @returns {Object} Дельта для сотрудника
   */
  static calculateEmployeeDelta(emp1, emp2) {
    if (!emp1 && !emp2) {
      return { 
        ticketsByStage: {}, 
        totalTickets: { delta: 0, trend: 'stable' } 
      };
    }

    const ticketsByStageDelta = {};
    const stageKeys = ['formed', 'review', 'execution'];
    for (const stageKey of stageKeys) {
      const count1 = emp1?.ticketsByStage?.[stageKey] || 0;
      const count2 = emp2?.ticketsByStage?.[stageKey] || 0;
      ticketsByStageDelta[stageKey] = this.calculateDelta(count1, count2);
    }

    const totalDelta = this.calculateDelta(
      emp1?.totalTickets || 0,
      emp2?.totalTickets || 0
    );

    return {
      ticketsByStage: ticketsByStageDelta,
      totalTickets: totalDelta
    };
  }

  /**
   * Сравнить нулевую точку между двумя слепками
   * 
   * @private
   * @param {Object} zeroPoint1 - Нулевая точка из первого слепка
   * @param {Object} zeroPoint2 - Нулевая точка из второго слепка
   * @returns {Object} Результат сравнения нулевой точки
   */
  static compareZeroPoint(zeroPoint1, zeroPoint2) {
    return {
      unassigned: this.calculateDelta(
        zeroPoint1?.unassigned || 0,
        zeroPoint2?.unassigned || 0
      ),
      keeper: this.calculateDelta(
        zeroPoint1?.keeper || 0,
        zeroPoint2?.keeper || 0
      ),
      total: this.calculateDelta(
        zeroPoint1?.total || 0,
        zeroPoint2?.total || 0
      )
    };
  }

  /**
   * Сравнить тикеты между двумя слепками
   * 
   * @private
   * @param {Array<number>} ticketIds1 - ID тикетов из первого слепка
   * @param {Array<number>} ticketIds2 - ID тикетов из второго слепка
   * @param {Array<Object>} tickets1 - Тикеты из первого слепка
   * @param {Array<Object>} tickets2 - Тикеты из второго слепка
   * @returns {Object} Результат сравнения тикетов
   */
  static compareTickets(ticketIds1, ticketIds2, tickets1, tickets2) {
    const set1 = new Set(ticketIds1);
    const set2 = new Set(ticketIds2);

    // Новые тикеты (есть в snapshot2, нет в snapshot1)
    const newTickets = ticketIds2.filter(id => !set1.has(id));

    // Удалённые тикеты (есть в snapshot1, нет в snapshot2)
    const removedTickets = ticketIds1.filter(id => !set2.has(id));

    // Изменённые тикеты (есть в обоих, но изменились поля)
    const changedTickets = [];
    const unchangedTickets = [];

    // Создаём Map для быстрого поиска тикетов
    const ticketsMap1 = new Map(tickets1.map(t => [t.id, t]));
    const ticketsMap2 = new Map(tickets2.map(t => [t.id, t]));

    for (const ticketId of ticketIds1) {
      if (!set2.has(ticketId)) continue; // Уже обработан как removed

      const ticket1 = ticketsMap1.get(ticketId);
      const ticket2 = ticketsMap2.get(ticketId);

      if (!ticket1 || !ticket2) continue;

      // Проверка изменений (ответственный или этап)
      const assignedToChanged = 
        (ticket1.assignedTo?.id || null) !== (ticket2.assignedTo?.id || null);
      const stageChanged = 
        (ticket1.stageId || null) !== (ticket2.stageId || null);

      if (assignedToChanged || stageChanged) {
        changedTickets.push(ticketId);
      } else {
        unchangedTickets.push(ticketId);
      }
    }

    return {
      new: newTickets,
      removed: removedTickets,
      changed: changedTickets,
      unchanged: unchangedTickets
    };
  }

  /**
   * Построить метаданные сравнения
   * 
   * @private
   * @param {Object} snapshot1 - Первый слепок
   * @param {Object} snapshot2 - Второй слепок
   * @returns {Object} Метаданные сравнения
   */
  static buildComparisonMetadata(snapshot1, snapshot2) {
    const date1 = new Date(snapshot1.metadata.createdAt);
    const date2 = new Date(snapshot2.metadata.createdAt);
    const now = new Date();

    const timeDiff = date2.getTime() - date1.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return {
      snapshot1Date: snapshot1.metadata.createdAt,
      snapshot2Date: snapshot2.metadata.createdAt,
      comparisonDate: now.toISOString(),
      timeDiff: {
        days,
        hours,
        minutes,
        totalMinutes: Math.floor(timeDiff / (1000 * 60))
      }
    };
  }

  /**
   * Построить summary (общую статистику изменений)
   * 
   * @private
   * @param {Object} stages - Результат сравнения этапов
   * @param {Array} employees - Результат сравнения сотрудников
   * @param {Object} zeroPoint - Результат сравнения нулевой точки
   * @param {Object|null} tickets - Результат сравнения тикетов (может быть null)
   * @returns {Object} Общая статистика изменений
   */
  static buildSummary(stages, employees, zeroPoint, tickets) {
    const totalDelta = stages.total.delta;
    
    const stagesChanged = Object.keys(stages).filter(key => {
      if (key === 'total') return false;
      return stages[key].delta !== 0;
    }).length;

    const employeesChanged = employees.filter(emp => {
      if (emp.trend === 'new' || emp.trend === 'removed') return true;
      return emp.delta.totalTickets.delta !== 0;
    }).length;

    const hasChanges = totalDelta !== 0 || stagesChanged > 0 || employeesChanged > 0;

    return {
      totalDelta,
      stagesChanged,
      employeesChanged,
      hasChanges,
      newTicketsCount: tickets?.new?.length || 0,
      removedTicketsCount: tickets?.removed?.length || 0,
      changedTicketsCount: tickets?.changed?.length || 0
    };
  }

  /**
   * Валидировать структуру слепка
   * 
   * @param {Object} snapshot - Слепок для валидации
   * @returns {Object} Результат валидации
   */
  static validateSnapshot(snapshot) {
    const errors = [];
    const warnings = [];

    // Проверка наличия обязательных полей
    if (!snapshot) {
      errors.push('Snapshot is null or undefined');
      return { valid: false, errors, warnings };
    }

    if (!snapshot.metadata) {
      errors.push('Missing metadata field');
    } else {
      if (!snapshot.metadata.createdAt) {
        errors.push('Missing metadata.createdAt');
      }
      if (!snapshot.metadata.type) {
        errors.push('Missing metadata.type');
      }
    }

    if (!snapshot.statistics) {
      errors.push('Missing statistics field');
    } else {
      if (!snapshot.statistics.stages) {
        errors.push('Missing statistics.stages');
      } else {
        const requiredStages = ['formed', 'review', 'execution'];
        for (const stage of requiredStages) {
          if (!snapshot.statistics.stages[stage]) {
            warnings.push(`Missing stage: ${stage}`);
          }
        }
      }

      if (!snapshot.statistics.employees) {
        warnings.push('Missing statistics.employees (may be empty array)');
      }

      if (!snapshot.statistics.zeroPoint) {
        warnings.push('Missing statistics.zeroPoint');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Сравнить несколько слепков (для построения графика изменений во времени)
   * 
   * @param {Array<Object>} snapshots - Массив слепков (должны быть отсортированы по дате)
   * @param {Object} options - Опции сравнения
   * @param {boolean} options.includeTickets - Включать сравнение тикетов (по умолчанию false)
   * @param {boolean} options.includeEmployees - Включать сравнение сотрудников (по умолчанию true)
   * @returns {Object} Результат сравнения всех слепков
   * 
   * @example
   * const comparison = CompareSnapshots.compareMultipleSnapshots(
   *   [weekStartSnapshot, weekEndSnapshot, currentSnapshot],
   *   { includeTickets: true }
   * );
   */
  static compareMultipleSnapshots(snapshots, options = {}) {
    if (!Array.isArray(snapshots) || snapshots.length < 2) {
      throw new Error('At least 2 snapshots required for comparison');
    }

    // Валидация всех слепков
    for (const snapshot of snapshots) {
      const validation = this.validateSnapshot(snapshot);
      if (!validation.valid) {
        throw new Error('Invalid snapshot: ' + validation.errors.join(', '));
      }
    }

    // Сортировка по дате (если не отсортированы)
    const sortedSnapshots = [...snapshots].sort((a, b) => {
      const dateA = new Date(a.metadata.createdAt);
      const dateB = new Date(b.metadata.createdAt);
      return dateA - dateB;
    });

    // Сравнение между соседними слепками
    const comparisons = [];
    for (let i = 0; i < sortedSnapshots.length - 1; i++) {
      comparisons.push({
        from: i,
        to: i + 1,
        result: this.compareTwoSnapshots(
          sortedSnapshots[i],
          sortedSnapshots[i + 1],
          options
        )
      });
    }

    // Построение трендов (значения по каждому слепку)
    const trends = this.buildTrends(sortedSnapshots);

    return {
      snapshots: sortedSnapshots.map((snapshot, index) => ({
        index,
        date: snapshot.metadata.createdAt,
        type: snapshot.metadata.type,
        data: snapshot
      })),
      comparisons,
      trends
    };
  }

  /**
   * Построить тренды по всем слепкам
   * 
   * @private
   * @param {Array<Object>} snapshots - Массив слепков
   * @returns {Object} Тренды по этапам и нулевой точке
   */
  static buildTrends(snapshots) {
    const trends = {
      stages: {
        formed: [],
        review: [],
        execution: [],
        total: []
      },
      zeroPoint: {
        unassigned: [],
        keeper: [],
        total: []
      }
    };

    for (const snapshot of snapshots) {
      const stats = snapshot.statistics;

      // Этапы
      trends.stages.formed.push(stats.stages?.formed?.count || 0);
      trends.stages.review.push(stats.stages?.review?.count || 0);
      trends.stages.execution.push(stats.stages?.execution?.count || 0);
      trends.stages.total.push(stats.stages?.total || 0);

      // Нулевая точка
      trends.zeroPoint.unassigned.push(stats.zeroPoint?.unassigned || 0);
      trends.zeroPoint.keeper.push(stats.zeroPoint?.keeper || 0);
      trends.zeroPoint.total.push(stats.zeroPoint?.total || 0);
    }

    return trends;
  }
}

export default CompareSnapshots;




