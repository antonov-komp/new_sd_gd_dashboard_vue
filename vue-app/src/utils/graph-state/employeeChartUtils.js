/**
 * Утилиты для работы с данными сотрудников в графиках состояния сектора 1С
 * 
 * Используется для интеграции детализации по сотрудникам в графики
 * (линейный, столбчатый, круговая диаграмма)
 * 
 * Дата создания: 2025-12-11 (UTC+3, Брест)
 * Задача: TASK-031-02
 */

/**
 * Максимальное количество отображаемых сотрудников глобально
 */
const MAX_EMPLOYEES = 10;

/**
 * Получить список сотрудников для этапа из конкретного слепка
 * 
 * @param {string} stageId - ID этапа ('formed', 'review', 'execution')
 * @param {Object} snapshot - Слепок с данными
 * @returns {Array} Массив сотрудников с количеством тикетов
 */
function getEmployeesForStageFromSnapshot(stageId, snapshot) {
  if (!snapshot || !snapshot.statistics) {
    return [];
  }
  
  const employees = [];
  
  // Обычные сотрудники
  if (snapshot.statistics.employees && Array.isArray(snapshot.statistics.employees)) {
    snapshot.statistics.employees
      .filter(emp => emp.ticketsByStage && emp.ticketsByStage[stageId] > 0)
      .forEach(emp => {
        employees.push({
          id: emp.id,
          name: emp.name,
          count: emp.ticketsByStage[stageId] || 0
        });
      });
  }
  
  // Тикеты из "Неразобранного" (Хранитель объектов, ID: 1051)
  const keeperCount = getKeeperTicketsCountForStageFromSnapshot(stageId, snapshot);
  if (keeperCount > 0) {
    employees.push({
      id: 1051,
      name: 'Хранитель объектов (Неразобранное)',
      count: keeperCount,
      isKeeper: true
    });
  }
  
  return employees.sort((a, b) => b.count - a.count); // Сортировка по убыванию
}

/**
 * Получить количество тикетов хранителя объектов для этапа из конкретного слепка
 * 
 * @param {string} stageId - ID этапа
 * @param {Object} snapshot - Слепок с данными
 * @returns {number} Количество тикетов хранителя
 */
function getKeeperTicketsCountForStageFromSnapshot(stageId, snapshot) {
  if (!snapshot || !snapshot.statistics) {
    return 0;
  }
  
  // Используем новое поле zeroPointByStage из статистики (если доступно)
  if (snapshot.statistics.zeroPointByStage && snapshot.statistics.zeroPointByStage[stageId]) {
    return snapshot.statistics.zeroPointByStage[stageId].keeper || 0;
  }
  
  // Fallback: если zeroPointByStage нет, используем общую статистику
  if (snapshot.statistics.zeroPoint) {
    const totalKeeper = snapshot.statistics.zeroPoint.keeper || 0;
    // Приблизительное распределение поровну по этапам
    return Math.floor(totalKeeper / 3);
  }
  
  return 0;
}

/**
 * Получить общее количество тикетов этапа из конкретного слепка
 * 
 * @param {string} stageId - ID этапа
 * @param {Object} snapshot - Слепок с данными
 * @returns {number} Общее количество тикетов
 */
function getStageTotalCountFromSnapshot(stageId, snapshot) {
  if (!snapshot || !snapshot.statistics || !snapshot.statistics.stages) {
    return 0;
  }
  
  return snapshot.statistics.stages[stageId]?.count || 0;
}

/**
 * Группировка сотрудников при превышении максимального количества
 * 
 * @param {Array} employees - Массив сотрудников
 * @param {number} maxVisible - Максимальное количество видимых сотрудников (по умолчанию 10)
 * @returns {Object} Объект с видимыми сотрудниками и группой "Другие"
 */
export function groupEmployeesByCount(employees, maxVisible = MAX_EMPLOYEES) {
  if (!employees || employees.length === 0) {
    return {
      visible: [],
      others: {
        employees: [],
        count: 0,
        employeeCount: 0
      }
    };
  }
  
  // Сортировка по убыванию количества тикетов
  const sorted = [...employees].sort((a, b) => b.count - a.count);
  
  // Разделение на видимых и остальных
  const visible = sorted.slice(0, maxVisible);
  const othersArray = sorted.slice(maxVisible);
  
  // Расчет суммы тикетов для группы "Другие"
  const othersCount = othersArray.reduce((sum, emp) => sum + emp.count, 0);
  
  return {
    visible,
    others: {
      employees: othersArray,
      count: othersCount,
      employeeCount: othersArray.length
    }
  };
}

/**
 * Расчет процентов для сотрудников от общего количества тикетов этапа
 * 
 * @param {Array} employees - Массив сотрудников с количеством тикетов
 * @param {number} totalCount - Общее количество тикетов этапа
 * @returns {Array} Массив сотрудников с добавленными процентами
 */
export function calculateEmployeePercentages(employees, totalCount) {
  if (!employees || employees.length === 0) {
    return [];
  }
  
  if (totalCount === 0) {
    return employees.map(emp => ({
      ...emp,
      percentage: 0
    }));
  }
  
  return employees.map(emp => ({
    ...emp,
    percentage: parseFloat(((emp.count / totalCount) * 100).toFixed(1))
  }));
}

/**
 * Форматирование данных сотрудников для прогресс-баров
 * 
 * @param {Array} employees - Массив сотрудников с количеством тикетов
 * @param {number} totalCount - Общее количество тикетов этапа
 * @param {string} stageColor - Цвет этапа (hex)
 * @param {number} maxVisible - Максимальное количество видимых сотрудников (по умолчанию 10)
 * @returns {Object} Отформатированные данные с прогресс-барами
 */
export function formatEmployeeProgressBarData(employees, totalCount, stageColor = '#007bff', maxVisible = MAX_EMPLOYEES) {
  if (!employees || employees.length === 0) {
    return {
      employees: [],
      others: null
    };
  }
  
  // Группировка сотрудников
  const { visible, others } = groupEmployeesByCount(employees, maxVisible);
  
  // Расчет процентов и ширины прогресс-бара
  const formattedEmployees = calculateEmployeePercentages(visible, totalCount).map(emp => ({
    ...emp,
    progressBarWidth: emp.percentage,
    progressBarColor: emp.isKeeper ? '#f59e0b' : stageColor // Специальный цвет для хранителя
  }));
  
  // Форматирование группы "Другие"
  let formattedOthers = null;
  if (others.count > 0) {
    const othersPercentage = parseFloat(((others.count / totalCount) * 100).toFixed(1));
    formattedOthers = {
      ...others,
      percentage: othersPercentage,
      progressBarWidth: othersPercentage,
      progressBarColor: '#6c757d' // Серый цвет для "Другие"
    };
  }
  
  return {
    employees: formattedEmployees,
    others: formattedOthers
  };
}

/**
 * Получение цвета для столбца сотрудника в столбчатом графике
 * 
 * @param {number} employeeId - ID сотрудника
 * @param {string} stageId - ID этапа
 * @param {number} index - Индекс сотрудника в списке (0-9)
 * @param {string} baseColor - Базовый цвет этапа (hex)
 * @returns {string} Цвет в формате hex или rgba
 */
export function getEmployeeColorForBarChart(employeeId, stageId, index, baseColor) {
  // Специальный случай: хранитель объектов
  if (employeeId === 1051) {
    return '#f59e0b'; // Оранжевый цвет для хранителя
  }
  
  // Определение базового цвета этапа
  const stageColors = {
    formed: '#007bff',   // Синий
    review: '#ffc107',    // Жёлтый
    execution: '#28a745'  // Зелёный
  };
  
  const stageColor = baseColor || stageColors[stageId] || '#007bff';
  
  // Создание оттенков для сотрудников
  // Используем фиксированную палитру оттенков (от более насыщенного к менее насыщенному)
  const opacityLevels = [
    'FF', // 100%
    'E6', // 90%
    'CC', // 80%
    'B3', // 70%
    '99', // 60%
    '80', // 50%
    '66', // 40%
    '4D', // 30%
    '33', // 20%
    '1A'  // 10%
  ];
  
  const opacity = opacityLevels[Math.min(index, opacityLevels.length - 1)] || '80';
  
  // Конвертация hex в rgba
  const hex = stageColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const a = parseInt(opacity, 16) / 255;
  
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Подготовка данных сотрудников для линейного графика
 * 
 * @param {string} stageId - ID этапа ('formed', 'review', 'execution')
 * @param {Object} snapshots - Объект с слепками { weekStart, weekEnd, current }
 * @returns {Object} Данные сотрудников для каждой точки графика
 */
export function prepareLineChartEmployeeData(stageId, snapshots) {
  const result = {
    weekStart: [],
    weekEnd: [],
    current: [],
    others: {
      weekStart: { count: 0, employeeCount: 0 },
      weekEnd: { count: 0, employeeCount: 0 },
      current: { count: 0, employeeCount: 0 }
    }
  };
  
  // Обработка каждой временной точки
  const snapshotTypes = ['weekStart', 'weekEnd', 'current'];
  
  snapshotTypes.forEach(snapshotType => {
    const snapshot = snapshots[snapshotType];
    
    if (!snapshot) {
      return;
    }
    
    // Получение сотрудников для этапа
    const employees = getEmployeesForStageFromSnapshot(stageId, snapshot);
    const totalCount = getStageTotalCountFromSnapshot(stageId, snapshot);
    
    if (employees.length === 0) {
      return;
    }
    
    // Группировка сотрудников (максимум 10)
    const { visible, others } = groupEmployeesByCount(employees, MAX_EMPLOYEES);
    
    // Расчет процентов для видимых сотрудников
    const formattedEmployees = calculateEmployeePercentages(visible, totalCount);
    
    result[snapshotType] = formattedEmployees;
    
    // Сохранение данных о группе "Другие"
    if (others.count > 0) {
      result.others[snapshotType] = {
        count: others.count,
        employeeCount: others.employeeCount,
        percentage: parseFloat(((others.count / totalCount) * 100).toFixed(1))
      };
    }
  });
  
  return result;
}

/**
 * Подготовка данных сотрудников для столбчатого графика
 * 
 * @param {Object} snapshots - Объект с слепками { weekStart, weekEnd, current }
 * @param {string} snapshotType - Тип слепка для отображения ('weekStart' | 'weekEnd' | 'current')
 * @param {Array} stages - Массив этапов с id, name, color
 * @returns {Object} Данные для Chart.js с группированными столбцами
 */
export function prepareBarChartEmployeeData(snapshots, snapshotType = 'current', stages = []) {
  const snapshot = snapshots[snapshotType];
  
  if (!snapshot) {
    return {
      labels: [],
      datasets: []
    };
  }
  
  // Сбор всех уникальных сотрудников из всех этапов
  const employeesMap = new Map();
  
  stages.forEach(stage => {
    const employees = getEmployeesForStageFromSnapshot(stage.id, snapshot);
    employees.forEach(emp => {
      if (!employeesMap.has(emp.id)) {
        employeesMap.set(emp.id, {
          id: emp.id,
          name: emp.name,
          isKeeper: emp.isKeeper || false,
          ticketsByStage: {}
        });
      }
      employeesMap.get(emp.id).ticketsByStage[stage.id] = emp.count;
    });
  });
  
  // Преобразование в массив и сортировка по общему количеству тикетов
  const allEmployees = Array.from(employeesMap.values()).map(emp => {
    const totalTickets = Object.values(emp.ticketsByStage).reduce((sum, count) => sum + count, 0);
    return {
      ...emp,
      totalTickets
    };
  });
  
  // Сортировка по убыванию общего количества тикетов
  allEmployees.sort((a, b) => b.totalTickets - a.totalTickets);
  
  // Ограничение до 10 сотрудников
  const { visible, others } = groupEmployeesByCount(allEmployees, MAX_EMPLOYEES);
  
  // Подготовка labels (пустые, так как названия стадий будут внизу через кастомную легенду)
  const labels = stages.map(() => '');
  
  // Подготовка метаданных для кастомной легенды (сотрудники по стадиям)
  const employeesByStage = {};
  stages.forEach(stage => {
    const employees = getEmployeesForStageFromSnapshot(stage.id, snapshot);
    const { visible: stageEmployees } = groupEmployeesByCount(employees, MAX_EMPLOYEES);
    employeesByStage[stage.id] = stageEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      count: emp.count
    }));
  });
  
  // Подготовка datasets для каждого сотрудника с разноцветными столбцами
  const datasets = visible.map((emp, index) => {
    // Данные для каждого этапа
    const data = stages.map(stage => emp.ticketsByStage[stage.id] || 0);
    
    // Создание разноцветных столбцов - каждый столбец имеет цвет соответствующего этапа
    const backgroundColor = stages.map((stage) => {
      const count = emp.ticketsByStage[stage.id] || 0;
      if (count === 0) {
        return 'transparent';
      }
      // Используем цвет этапа с небольшой вариацией для разных сотрудников
      const baseColor = stage.color;
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      // Разная прозрачность для разных сотрудников (создает эффект разноцветности)
      const opacity = 0.6 + (index * 0.05); // От 0.6 до 0.95
      return `rgba(${r}, ${g}, ${b}, ${Math.min(opacity, 0.95)})`;
    });
    
    return {
      label: emp.name,
      data,
      backgroundColor: backgroundColor, // Массив цветов для каждого столбца
      borderColor: stages.map(stage => {
        const hex = stage.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 0.8)`;
      }),
      borderWidth: 1,
      // Метаданные для кастомной легенды
      meta: {
        employeeId: emp.id,
        employeeName: emp.name
      }
    };
  });
  
  // Добавление dataset для "Другие" (если есть)
  if (others.count > 0) {
    const othersData = stages.map(stage => {
      return others.employees.reduce((sum, emp) => {
        return sum + (emp.ticketsByStage[stage.id] || 0);
      }, 0);
    });
    
    datasets.push({
      label: `Другие (${others.employeeCount})`,
      data: othersData,
      backgroundColor: 'rgba(108, 117, 125, 0.5)', // Серый цвет с прозрачностью
      borderColor: '#6c757d',
      borderWidth: 1
    });
  }
  
  return {
    labels,
    datasets,
    meta: {
      employeesByStage // Метаданные для кастомной легенды
    }
  };
}

/**
 * Подготовка данных сотрудников для круговой диаграммы
 * 
 * @param {string} stageId - ID этапа ('formed', 'review', 'execution')
 * @param {Object} snapshot - Слепок с данными (current, weekEnd или weekStart)
 * @param {Array} stages - Массив этапов с id, name, color
 * @returns {Object} Данные сотрудников для модального окна
 */
export function prepareDoughnutChartEmployeeData(stageId, snapshot, stages = []) {
  if (!snapshot) {
    return {
      stageName: '',
      totalCount: 0,
      employees: [],
      others: null
    };
  }
  
  // Получение названия этапа
  const stage = stages.find(s => s.id === stageId);
  const stageName = stage ? stage.name : '';
  const stageColor = stage ? stage.color : '#007bff';
  
  // Получение данных этапа
  const employees = getEmployeesForStageFromSnapshot(stageId, snapshot);
  const totalCount = getStageTotalCountFromSnapshot(stageId, snapshot);
  
  if (employees.length === 0) {
    return {
      stageName,
      totalCount: 0,
      employees: [],
      others: null
    };
  }
  
  // Форматирование данных с прогресс-барами
  const formatted = formatEmployeeProgressBarData(employees, totalCount, stageColor, MAX_EMPLOYEES);
  
  return {
    stageName,
    totalCount,
    employees: formatted.employees,
    others: formatted.others
  };
}

