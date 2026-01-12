/**
 * Универсальный композабл для управления состоянием дашборда сектора
 *
 * Работает с любым сектором (1С, PDM, Битрикс24, Инфраструктура)
 * Управляет состоянием: stages, employees, zeroPointTickets, isLoading, error
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { ref, computed } from 'vue';

/**
 * Универсальный композабл для состояния дашборда сектора
 *
 * @param {string} sectorId - ID сектора
 * @returns {object} Объект с реактивным состоянием дашборда
 */
export function useUniversalDashboardState(sectorId) {
  // Состояние загрузки
  const isLoading = ref(false);
  const error = ref(null);
  const currentStep = ref('');
  const stepDetails = ref({});

  // Данные сектора
  const stages = ref([]);
  const zeroPointTickets = ref({});
  const employees = ref([]);
  const sectorStats = ref({
    totalTickets: 0,
    totalEmployees: 0,
    activeStages: 0,
    lastUpdated: null
  });

  // Вычисляемые свойства
  const hasData = computed(() => {
    return stages.value.length > 0 || employees.value.length > 0;
  });

  const isEmpty = computed(() => {
    return !hasData.value && !isLoading.value && !error.value;
  });

  const totalTickets = computed(() => {
    const zeroPointCount = Object.values(zeroPointTickets.value)
      .reduce((sum, tickets) => sum + (tickets?.length || 0), 0);

    const stagesCount = stages.value
      .reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0);

    return zeroPointCount + stagesCount;
  });

  const completionRate = computed(() => {
    if (!totalTickets.value) return 0;

    // Подсчет завершенных тикетов (упрощенная логика)
    const allTickets = [
      ...Object.values(zeroPointTickets.value).flat(),
      ...stages.value.flatMap(stage => stage.tickets || [])
    ];

    const completedCount = allTickets.filter(ticket =>
      ticket.status === 'closed' ||
      ticket.status === 'completed' ||
      ticket.status === 'done'
    ).length;

    return Math.round((completedCount / totalTickets.value) * 100);
  });

  // Методы для обновления состояния
  const setLoading = (loading, step = '', details = {}) => {
    isLoading.value = loading;
    currentStep.value = step;
    stepDetails.value = details;
  };

  const setError = (errorMessage) => {
    error.value = errorMessage;
    isLoading.value = false;
  };

  const clearError = () => {
    error.value = null;
  };

  const updateStages = (newStages) => {
    stages.value = newStages;
  };

  const updateEmployees = (newEmployees) => {
    employees.value = newEmployees;
  };

  const updateZeroPointTickets = (newZeroPointTickets) => {
    zeroPointTickets.value = newZeroPointTickets;
  };

  const updateSectorStats = (stats) => {
    sectorStats.value = {
      ...sectorStats.value,
      ...stats,
      lastUpdated: new Date().toISOString()
    };
  };

  const resetState = () => {
    isLoading.value = false;
    error.value = null;
    currentStep.value = '';
    stepDetails.value = {};
    stages.value = [];
    zeroPointTickets.value = {};
    employees.value = [];
    sectorStats.value = {
      totalTickets: 0,
      totalEmployees: 0,
      activeStages: 0,
      lastUpdated: null
    };
  };

  // Метод для получения данных этапа по ID
  const getStageById = (stageId) => {
    return stages.value.find(stage => stage.id === stageId);
  };

  // Метод для получения сотрудника по ID
  const getEmployeeById = (employeeId) => {
    return employees.value.find(employee => employee.id === employeeId);
  };

  // Метод для получения тикетов этапа
  const getStageTickets = (stageId) => {
    const stage = getStageById(stageId);
    return stage ? stage.tickets || [] : [];
  };

  // Метод для получения тикетов нулевой точки этапа
  const getZeroPointTickets = (stageId) => {
    return zeroPointTickets.value[stageId] || [];
  };

  return {
    // Реактивное состояние
    isLoading,
    error,
    currentStep,
    stepDetails,
    stages,
    zeroPointTickets,
    employees,
    sectorStats,

    // Вычисляемые свойства
    hasData,
    isEmpty,
    totalTickets,
    completionRate,

    // Методы обновления
    setLoading,
    setError,
    clearError,
    updateStages,
    updateEmployees,
    updateZeroPointTickets,
    updateSectorStats,
    resetState,

    // Методы получения данных
    getStageById,
    getEmployeeById,
    getStageTickets,
    getZeroPointTickets
  };
}

export default useUniversalDashboardState;