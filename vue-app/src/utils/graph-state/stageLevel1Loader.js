/**
 * Загрузчик данных уровня 1 для переключения стадий в попапе
 * 
 * Приоритет источников: метаданные графиков/слепков → REST-фолбэк (если передан).
 * Возвращает нормализованную структуру для уровня 1: stageId, stageName, color, totalCount, employees, others, snapshot.
 * 
 * Документация: TASK-038-02 (https://context7.com/bitrix24/rest/)
 */

import { formatEmployeeProgressBarData } from '@/utils/graph-state/employeeChartUtils.js';

function getStageName(stageId, stageNameMap) {
  return stageNameMap?.[stageId] || stageId;
}

function getStageColor(stageId, stageColorMap) {
  return stageColorMap?.[stageId] || '#007bff';
}

function getSnapshotByPriority({ snapshots, graphType, timePoint, snapshotType }) {
  if (!snapshots) return null;
  if (graphType === 'line' && timePoint) {
    return snapshots[timePoint] || null;
  }
  if (graphType === 'bar' && snapshotType) {
    return snapshots[snapshotType] || null;
  }
  return snapshots.current || snapshots.weekEnd || snapshots.weekStart || null;
}

function getTotalCountFromSnapshot(stageId, snapshot) {
  return snapshot?.statistics?.stages?.[stageId]?.count || 0;
}

function tryFromLineMeta({ stageId, timePoint, meta, snapshots, stageColor, maxVisible }) {
  if (!meta?.employees || !timePoint) {
    return null;
  }
  const employees = meta.employees[timePoint];
  if (!employees || employees.length === 0) {
    return null;
  }
  const snapshot = snapshots?.[timePoint] || null;
  const totalCount = getTotalCountFromSnapshot(stageId, snapshot) || employees.reduce((sum, emp) => sum + (emp.count || 0), 0);
  const formatted = formatEmployeeProgressBarData(employees, totalCount, stageColor, maxVisible);
  return {
    stageId,
    totalCount,
    employees: formatted.employees,
    others: formatted.others,
    snapshot
  };
}

function tryFromDoughnutMeta({ stageId, meta, snapshots, stageColor, maxVisible }) {
  const metaEmployees = meta?.employees?.[stageId];
  if (!metaEmployees || !metaEmployees.employees || metaEmployees.employees.length === 0) {
    return null;
  }
  const snapshot = getSnapshotByPriority({ snapshots, graphType: 'doughnut' });
  const totalCount = metaEmployees.totalCount ?? getTotalCountFromSnapshot(stageId, snapshot) ?? metaEmployees.employees.reduce((sum, emp) => sum + (emp.count || 0), 0);
  const formatted = formatEmployeeProgressBarData(metaEmployees.employees, totalCount, stageColor, maxVisible);
  return {
    stageId,
    totalCount,
    employees: formatted.employees,
    others: formatted.others,
    snapshot
  };
}

function tryFromBarMeta({ stageId, meta, snapshots, stageColor, maxVisible, snapshotType }) {
  const employees = meta?.employeesByStage?.[stageId];
  if (!employees || employees.length === 0) {
    return null;
  }
  const snapshot = getSnapshotByPriority({ snapshots, graphType: 'bar', snapshotType });
  const totalCount = getTotalCountFromSnapshot(stageId, snapshot) || employees.reduce((sum, emp) => sum + (emp.count || 0), 0);
  const formatted = formatEmployeeProgressBarData(employees, totalCount, stageColor, maxVisible);
  return {
    stageId,
    totalCount,
    employees: formatted.employees,
    others: formatted.others,
    snapshot
  };
}

/**
 * Единый загрузчик уровня 1 по stageId
 */
export async function loadStageLevel1({
  stageId,
  graphType,
  timePoint = null,
  snapshotType = null,
  snapshots = null,
  meta = null,
  stageColorMap = null,
  stageNameMap = null,
  maxVisible = 10,
  restLoader = null
}) {
  if (!stageId) {
    throw new Error('stageId обязателен для загрузки данных уровня 1');
  }

  const stageName = getStageName(stageId, stageNameMap);
  const stageColor = getStageColor(stageId, stageColorMap);

  // 1) Попытка взять данные из метаданных графика/слепков
  let metaResult = null;
  if (graphType === 'line') {
    metaResult = tryFromLineMeta({ stageId, timePoint, meta: meta?.line, snapshots, stageColor, maxVisible });
  } else if (graphType === 'doughnut') {
    metaResult = tryFromDoughnutMeta({ stageId, meta: meta?.doughnut, snapshots, stageColor, maxVisible });
  } else if (graphType === 'bar') {
    metaResult = tryFromBarMeta({ stageId, meta: meta?.bar, snapshots, stageColor, maxVisible, snapshotType });
  }

  if (metaResult) {
    return {
      stageId,
      stageName,
      color: stageColor,
      totalCount: metaResult.totalCount,
      employees: metaResult.employees,
      others: metaResult.others,
      snapshot: metaResult.snapshot
    };
  }

  // 2) REST-фолбэк (если передан)
  if (typeof restLoader === 'function') {
    const restData = await restLoader({ stageId, graphType, timePoint, snapshotType, snapshots });
    if (restData && Array.isArray(restData.employees)) {
      const totalCount = restData.totalCount ?? restData.employees.reduce((sum, emp) => sum + (emp.count || 0), 0);
      const formatted = formatEmployeeProgressBarData(restData.employees, totalCount, stageColor, maxVisible);
      return {
        stageId,
        stageName,
        color: stageColor,
        totalCount: totalCount,
        employees: formatted.employees,
        others: formatted.others,
        snapshot: restData.snapshot || getSnapshotByPriority({ snapshots, graphType, timePoint, snapshotType })
      };
    }
  }

  throw new Error('Данные для выбранной стадии недоступны (meta/REST)');
}

