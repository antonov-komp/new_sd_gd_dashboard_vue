/**
 * Композабл для управления состоянием дашборда сектора 1С
 * 
 * Управляет состоянием: stages, employees, zeroPointTickets, isLoading, error
 */

import { ref } from 'vue';

/**
 * Композабл для состояния дашборда
 * 
 * @returns {object} Объект с реактивным состоянием дашборда
 */
export function useDashboardState() {
  // Состояние загрузки
  const isLoading = ref(true);
  const error = ref(null);

  // Данные сектора
  const stages = ref([
    {
      id: 'formed',
      name: 'Сформировано обращение',
      color: '#007bff',
      employees: []
    },
    {
      id: 'review',
      name: 'Рассмотрение ТЗ',
      color: '#ffc107',
      employees: []
    },
    {
      id: 'execution',
      name: 'Исполнение',
      color: '#28a745',
      employees: []
    }
  ]);

  // Нулевая точка (входящие тикеты для каждого этапа)
  const zeroPointTickets = ref({
    formed: [],
    review: [],
    execution: []
  });

  // Список сотрудников
  const employees = ref([]);

  // Перетаскиваемый тикет
  const draggedTicket = ref(null);

  /**
   * Обновление состояния данными сектора
   * 
   * @param {object} data - Данные сектора (stages, employees, zeroPointTickets)
   */
  const updateState = (data) => {
    if (data.stages) {
      stages.value = data.stages;
    }
    if (data.employees) {
      employees.value = data.employees;
    }
    if (data.zeroPointTickets) {
      zeroPointTickets.value = data.zeroPointTickets;
    }
  };

  /**
   * Сброс состояния
   */
  const resetState = () => {
    isLoading.value = false;
    error.value = null;
    stages.value = [
      {
        id: 'formed',
        name: 'Сформировано обращение',
        color: '#007bff',
        employees: []
      },
      {
        id: 'review',
        name: 'Рассмотрение ТЗ',
        color: '#ffc107',
        employees: []
      },
      {
        id: 'execution',
        name: 'Исполнение',
        color: '#28a745',
        employees: []
      }
    ];
    zeroPointTickets.value = {
      formed: [],
      review: [],
      execution: []
    };
    employees.value = [];
    draggedTicket.value = null;
  };

  /**
   * Обновление локального состояния после перемещения тикета
   * 
   * @param {object} ticket - Тикет
   * @param {number} newEmployeeId - ID нового сотрудника
   * @param {string} newStageId - ID нового этапа
   */
  const updateLocalStateAfterMove = (ticket, newEmployeeId, newStageId) => {
    // Находим старую позицию тикета
    const oldStage = stages.value.find(s => 
      s.employees.some(e => 
        e.tickets.some(t => t.id === ticket.id)
      )
    );
    
    if (oldStage) {
      const oldEmployee = oldStage.employees.find(e =>
        e.tickets.some(t => t.id === ticket.id)
      );
      
      if (oldEmployee) {
        // Удаляем тикет из старой позиции
        oldEmployee.tickets = oldEmployee.tickets.filter(t => t.id !== ticket.id);
      }
    }
    
    // Добавляем тикет в новую позицию
    const newStage = stages.value.find(s => s.id === newStageId);
    if (newStage) {
      const newEmployee = newStage.employees.find(e => e.id === newEmployeeId);
      if (newEmployee) {
        // Обновляем данные тикета
        const updatedTicket = {
          ...ticket,
          assigneeId: newEmployeeId,
          stageId: newStageId
        };
        
        newEmployee.tickets.push(updatedTicket);
      }
    }
    
    // Обновляем нулевую точку (если тикет был там)
    Object.keys(zeroPointTickets.value).forEach(stageId => {
      zeroPointTickets.value[stageId] = zeroPointTickets.value[stageId].filter(
        t => t.id !== ticket.id
      );
    });
  };

  /**
   * Получение тикетов сотрудника для этапа
   * 
   * @param {number} employeeId - ID сотрудника
   * @param {string} stageId - ID этапа
   * @returns {Array} Массив тикетов
   */
  const getEmployeeTickets = (employeeId, stageId) => {
    const stage = stages.value.find(s => s.id === stageId);
    if (!stage) return [];

    const employee = stage.employees.find(e => e.id === employeeId);
    if (!employee) return [];

    return employee.tickets || [];
  };

  return {
    // Состояние
    isLoading,
    error,
    stages,
    zeroPointTickets,
    employees,
    draggedTicket,
    
    // Методы
    updateState,
    resetState,
    updateLocalStateAfterMove,
    getEmployeeTickets
  };
}

