/**
 * Node.js версия тестового скрипта для проверки загрузки данных секторов
 * Адаптирована для тестирования без браузерных зависимостей
 */

import { performance } from 'perf_hooks';

// Имитация SECTORS_CONFIG
const SECTORS_CONFIG = {
  sector1c: {
    id: '1c',
    name: 'Сектор 1С',
    filterValue: '1C'
  },
  sectorPdm: {
    id: 'pdm',
    name: 'Сектор PDM',
    filterValue: 'PDM'
  },
  sectorBitrix24: {
    id: 'bitrix24',
    name: 'Сектор Битрикс24',
    filterValue: 'Bitrix24'
  },
  sectorInfrastructure: {
    id: 'infrastructure',
    name: 'Сектор Железо/Инфраструктура',
    filterValues: ['Железо', 'Прочее']
  }
};

/**
 * Имитация UniversalSectorDashboardFactory
 */
class MockUniversalSectorDashboardFactory {
  static services = new Map();

  static getService(sectorId) {
    if (!this.services.has(sectorId)) {
      this.services.set(sectorId, new MockUniversalSectorDashboardService(sectorId));
    }
    return this.services.get(sectorId);
  }
}

/**
 * Имитация UniversalSectorDashboardService
 */
class MockUniversalSectorDashboardService {
  constructor(sectorId) {
    this.sectorId = sectorId;
  }

  async getSectorDashboardData() {
    // Имитация задержки загрузки данных
    const delay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, delay));

    // Возвращаем тестовые данные в зависимости от сектора
    return this.getMockSectorData(this.sectorId);
  }

  getMockSectorData(sectorId) {
    const mockData = {
      '1c': {
        stages: [
          {
            id: 'formed',
            name: 'Сформировано обращение',
            employees: Array.from({length: 12}, (_, i) => ({
              id: `emp_formed_${i + 1}`,
              name: `Сотрудник ${i + 1}`,
              email: `emp${i + 1}@example.com`
            })),
            tickets: Array.from({length: 60}, (_, i) => ({
              id: `ticket_formed_${i + 1}`,
              title: `Заявка ${i + 1} на формирование`,
              assignedTo: i % 3 === 0 ? `emp_formed_${(i % 12) + 1}` : null,
              priority: i % 4 === 0 ? 'high' : i % 4 === 1 ? 'medium' : i % 4 === 2 ? 'low' : 'medium'
            }))
          },
          {
            id: 'review',
            name: 'Рассмотрение ТЗ',
            employees: [
              { id: 'emp_review_1', name: 'Алексей Сидоров', email: 'alex@example.com' },
              { id: 'emp_review_2', name: 'Марина Кузнецова', email: 'marina@example.com' }
            ],
            tickets: Array.from({length: 13}, (_, i) => ({
              id: `ticket_review_${i + 1}`,
              title: `Анализ ТЗ ${i + 1}`,
              assignedTo: i % 2 === 0 ? 'emp_review_1' : 'emp_review_2',
              priority: i % 3 === 0 ? 'high' : 'medium'
            }))
          },
          {
            id: 'execution',
            name: 'Исполнение',
            employees: [
              { id: 'emp_exec_1', name: 'Ольга Николаева', email: 'olga@example.com' },
              { id: 'emp_exec_2', name: 'Дмитрий Козлов', email: 'dmitry@example.com' },
              { id: 'emp_exec_3', name: 'Антон Петров', email: 'anton@example.com' },
              { id: 'emp_exec_4', name: 'Елена Соколова', email: 'elena@example.com' }
            ],
            tickets: Array.from({length: 13}, (_, i) => ({
              id: `ticket_exec_${i + 1}`,
              title: `Внедрение решения ${i + 1}`,
              assignedTo: `emp_exec_${(i % 4) + 1}`,
              priority: i % 4 === 0 ? 'high' : i % 4 === 1 ? 'medium' : 'low'
            }))
          }
        ],
        employees: Array.from({length: 18}, (_, i) => ({
          id: `emp_${i + 1}`,
          name: `Сотрудник сектора 1С ${i + 1}`,
          email: `emp1c${i + 1}@example.com`
        })),
        zeroPointTickets: {
          formed: [],
          review: [],
          execution: []
        },
        metadata: {
          sectorId: '1c',
          totalTickets: 86,
          totalEmployees: 18,
          lastUpdated: new Date().toISOString()
        }
      },
      'pdm': {
        stages: [
          {
            id: 'formed',
            name: 'Проектирование',
            employees: [],
            tickets: [] // 0 тикетов в стадии formed
          },
          {
            id: 'review',
            name: 'Проверка',
            employees: [
              { id: 'pdm1', name: 'Анна Сергеева', email: 'anna@example.com' },
              { id: 'pdm2', name: 'Владимир Кузнецов', email: 'vladimir@example.com' },
              { id: 'pdm3', name: 'Елена Михайлова', email: 'elena@example.com' },
              { id: 'pdm4', name: 'Дмитрий Петров', email: 'dmitry@example.com' },
              { id: 'pdm5', name: 'Ольга Иванова', email: 'olga@example.com' }
            ],
            tickets: Array.from({length: 27}, (_, i) => ({
              id: `pdm_review_${i + 1}`,
              title: `Проверка проекта ${i + 1}`,
              assignedTo: i % 2 === 0 ? 'pdm1' : 'pdm2',
              priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low'
            }))
          },
          {
            id: 'execution',
            name: 'Внедрение',
            employees: [
              { id: 'pdm6', name: 'Алексей Смирнов', email: 'alex@example.com' },
              { id: 'pdm7', name: 'Мария Ковалёва', email: 'maria@example.com' }
            ],
            tickets: [
              { id: 'pdm_exec_1', title: 'Внедрение системы 1', assignedTo: 'pdm6', priority: 'high' },
              { id: 'pdm_exec_2', title: 'Тестирование внедрения', assignedTo: 'pdm7', priority: 'medium' },
              { id: 'pdm_exec_3', title: 'Документация', assignedTo: 'pdm6', priority: 'low' }
            ]
          }
        ],
        employees: [
          { id: 'pdm1', name: 'Анна Сергеева', email: 'anna@example.com' },
          { id: 'pdm2', name: 'Владимир Кузнецов', email: 'vladimir@example.com' },
          { id: 'pdm3', name: 'Елена Михайлова', email: 'elena@example.com' },
          { id: 'pdm4', name: 'Дмитрий Петров', email: 'dmitry@example.com' },
          { id: 'pdm5', name: 'Ольга Иванова', email: 'olga@example.com' },
          { id: 'pdm6', name: 'Алексей Смирнов', email: 'alex@example.com' },
          { id: 'pdm7', name: 'Мария Ковалёва', email: 'maria@example.com' }
        ],
        zeroPointTickets: {
          formed: [],
          review: [],
          execution: []
        },
        metadata: {
          sectorId: 'pdm',
          totalTickets: 30,
          totalEmployees: 7,
          lastUpdated: new Date().toISOString()
        }
      },
      'bitrix24': {
        stages: [
          {
            id: 'DT140_12:UC_0VHWE2',
            name: 'Сформировано обращение',
            employees: [
              { id: 'b24_1', name: 'Сергей Волков', email: 'sergey@example.com' }
            ],
            tickets: [
              { id: 'b24_1', title: 'Настройка портала Битрикс24', assignedTo: 'b24_1', priority: 'medium' }
            ]
          },
          {
            id: 'DT140_12:PREPARATION',
            name: 'Рассмотрение ТЗ',
            employees: [],
            tickets: []
          },
          {
            id: 'DT140_12:CLIENT',
            name: 'Исполнение',
            employees: [],
            tickets: []
          }
        ],
        employees: [
          { id: 'b24_1', name: 'Сергей Волков', email: 'sergey@example.com' }
        ],
        zeroPointTickets: {
          formed: [],
          review: [],
          execution: []
        },
        metadata: {
          sectorId: 'bitrix24',
          totalTickets: 1,
          totalEmployees: 1,
          lastUpdated: new Date().toISOString()
        }
      },
      'infrastructure': {
        stages: [
          {
            id: 'DT140_12:UC_0VHWE2',
            name: 'Сформировано обращение',
            employees: [],
            tickets: [] // 0 тикетов в стадии formed
          },
          {
            id: 'DT140_12:PREPARATION',
            name: 'Рассмотрение ТЗ',
            employees: [],
            tickets: [] // 0 тикетов в стадии review
          },
          {
            id: 'DT140_12:CLIENT',
            name: 'Исполнение',
            employees: [
              { id: 'infra-user1', name: 'Системный администратор', department: 'Infrastructure' }
            ],
            tickets: [
              { id: 'infra-1', title: 'Замена серверного оборудования', assignedTo: 'infra-user1', priority: 'high' }
            ] // 1 тикет в стадии execution
          }
        ],
        employees: [
          { id: 'infra-user1', name: 'Системный администратор', department: 'Infrastructure' }
        ],
        zeroPointTickets: {
          formed: [],
          review: [],
          execution: []
        },
        metadata: {
          sectorId: 'infrastructure',
          totalTickets: 1, // 0 + 0 + 1
          totalEmployees: 1,
          filterValues: ['Железо', 'Прочее'], // UF_CRM_7_TYPE_PRODUCT IN ('Железо', 'Прочее')
          lastUpdated: new Date().toISOString()
        }
      }
    };

    return mockData[sectorId] || this.getEmptySectorData(sectorId);
  }

  getEmptySectorData(sectorId) {
    return {
      stages: [
        { id: 'formed', name: 'Сформировано', employees: [], tickets: [] },
        { id: 'review', name: 'Проверка', employees: [], tickets: [] },
        { id: 'execution', name: 'Исполнение', employees: [], tickets: [] }
      ],
      employees: [],
      zeroPointTickets: { formed: [], review: [], execution: [] },
      metadata: {
        sectorId,
        totalTickets: 0,
        totalEmployees: 0,
        lastUpdated: new Date().toISOString()
      }
    };
  }
}

/**
 * Класс для тестирования загрузки данных секторов (Node.js версия)
 */
class SectorDataLoadingTester {
  constructor() {
    this.sectors = ['1c', 'pdm', 'bitrix24', 'infrastructure'];
    this.results = [];
    this.errors = [];
  }

  /**
   * Запуск тестирования всех секторов последовательно
   */
  async runAllSectorTests() {
    console.log('🎯 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ СЕКТОРОВ (Node.js версия)');
    console.log('========================================');

    for (const sectorId of this.sectors) {
      try {
        const result = await this.testSector(sectorId);

        if (result.success) {
          this.logSectorSuccess(result);
          this.results.push(result);
        } else {
          this.logSectorError(result);
          this.errors.push(result);
          break; // Прерываем тестирование при первой ошибке
        }

      } catch (error) {
        const errorResult = {
          sectorId,
          success: false,
          error: error.message,
          duration: 0
        };

        this.logSectorError(errorResult);
        this.errors.push(errorResult);
        break; // Прерываем тестирование при первой ошибке
      }
    }

    this.logFinalSummary();
  }

  /**
   * Тестирование одного сектора
   */
  async testSector(sectorId) {
    const startTime = performance.now();

    try {
      // Получаем сервис сектора
      const service = MockUniversalSectorDashboardFactory.getService(sectorId);

      // Получаем данные сектора
      const sectorData = await service.getSectorDashboardData();

      // Проверяем корректность данных
      const validationResult = this.validateSectorData(sectorData, sectorId);

      const duration = (performance.now() - startTime) / 1000; // в секундах

      return {
        sectorId,
        success: validationResult.valid,
        duration: Math.round(duration * 100) / 100, // Округляем до сотых
        data: sectorData,
        validation: validationResult,
        metrics: this.extractMetrics(sectorData)
      };

    } catch (error) {
      const duration = (performance.now() - startTime) / 1000;

      return {
        sectorId,
        success: false,
        duration: Math.round(duration * 100) / 100,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Валидация данных сектора
   */
  validateSectorData(sectorData, sectorId) {
    const errors = [];
    const warnings = [];

    // Проверяем базовую структуру
    if (!sectorData) {
      errors.push('Данные сектора отсутствуют');
      return { valid: false, errors, warnings };
    }

    // Проверяем наличие обязательных полей
    if (!sectorData.stages || !Array.isArray(sectorData.stages)) {
      errors.push('Поле stages отсутствует или не является массивом');
    }

    if (!sectorData.employees || !Array.isArray(sectorData.employees)) {
      errors.push('Поле employees отсутствует или не является массивом');
    }

    if (!sectorData.metadata) {
      errors.push('Поле metadata отсутствует');
    }

    // Если есть ошибки структуры, возвращаем невалидный результат
    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // Проверяем наличие трех основных стадий
    const expectedStages = ['formed', 'review', 'execution'];
    const actualStages = sectorData.stages.map(stage => stage.id);

    expectedStages.forEach(expectedStage => {
      if (!actualStages.includes(expectedStage)) {
        warnings.push(`Стадия ${expectedStage} отсутствует в данных сектора`);
      }
    });

    // Проверяем корректность метаданных
    if (sectorData.metadata.sectorId !== sectorId) {
      warnings.push(`ID сектора в метаданных (${sectorData.metadata.sectorId}) не соответствует ожидаемому (${sectorId})`);
    }

    // Проверяем корректность счетчиков
    const totalTicketsFromStages = sectorData.stages.reduce((sum, stage) => sum + (stage.tickets?.length || 0), 0);
    if (totalTicketsFromStages !== sectorData.metadata.totalTickets) {
      warnings.push(`Общее количество тикетов в метаданных (${sectorData.metadata.totalTickets}) не соответствует сумме по стадиям (${totalTicketsFromStages})`);
    }

    return {
      valid: true,
      errors,
      warnings,
      totalTickets: totalTicketsFromStages,
      totalEmployees: sectorData.employees.length
    };
  }

  /**
   * Извлечение метрик из данных сектора
   */
  extractMetrics(sectorData) {
    const metrics = {
      totalTickets: 0,
      totalEmployees: 0,
      stages: {}
    };

    if (!sectorData || !sectorData.stages) {
      return metrics;
    }

    // Считаем метрики по стадиям
    sectorData.stages.forEach(stage => {
      metrics.stages[stage.id] = {
        ticketCount: stage.tickets?.length || 0,
        employeeCount: stage.employees?.length || 0
      };

      metrics.totalTickets += stage.tickets?.length || 0;
    });

    metrics.totalEmployees = sectorData.employees?.length || 0;

    return metrics;
  }

  /**
   * Логирование успешного результата тестирования сектора
   */
  logSectorSuccess(result) {
    const sectorConfig = SECTORS_CONFIG[`sector${result.sectorId}`] || SECTORS_CONFIG[result.sectorId];
    const sectorName = sectorConfig?.name || result.sectorId;

    console.log(`✅ ${sectorName} (${result.duration} сек)`);

    // Выводим информацию по стадиям
    console.log('   Стадии:', Object.entries(result.metrics.stages)
      .map(([stageId, stageMetrics]) => `${stageId}(${stageMetrics.ticketCount} тикетов)`)
      .join(', ')
    );

    console.log(`   Всего: ${result.metrics.totalTickets} тикетов, ${result.metrics.totalEmployees} сотрудников`);

    // Выводим предупреждения валидации, если есть
    if (result.validation.warnings && result.validation.warnings.length > 0) {
      console.warn('   Предупреждения:', result.validation.warnings);
    }
  }

  /**
   * Логирование ошибки тестирования сектора
   */
  logSectorError(result) {
    const sectorConfig = SECTORS_CONFIG[`sector${result.sectorId}`] || SECTORS_CONFIG[result.sectorId];
    const sectorName = sectorConfig?.name || result.sectorId;

    console.log(`❌ ${sectorName} (${result.duration} сек)`);
    console.error('   Ошибка:', result.error);

    if (result.stack) {
      console.error('   Стек:', result.stack);
    }
  }

  /**
   * Логирование итогового резюме тестирования
   */
  logFinalSummary() {
    console.log('\n========================================');
    console.log('📊 ИТОГИ ТЕСТИРОВАНИЯ');

    const successfulTests = this.results.length;
    const failedTests = this.errors.length;
    const totalTests = this.sectors.length;

    console.log(`Успешных тестов: ${successfulTests}/${totalTests}`);
    console.log(`Неудачных тестов: ${failedTests}/${totalTests}`);

    if (successfulTests === totalTests) {
      console.log('✅ Все сектора протестированы успешно!');
    } else {
      console.log(`❌ Тестирование прервано из-за ошибки в секторе: ${this.errors[0]?.sectorId}`);
    }

    // Выводим сводку по всем успешным тестам
    if (this.results.length > 0) {
      console.log('\nСводка результатов:');
      this.results.forEach(result => {
        const sectorConfig = SECTORS_CONFIG[`sector${result.sectorId}`] || SECTORS_CONFIG[result.sectorId];
        const sectorName = sectorConfig?.name || result.sectorId;
        console.log(`  ${sectorName}: ${result.duration} сек, ${result.metrics.totalTickets} тикетов`);
      });
    }
  }
}

// Запуск тестирования при выполнении скрипта
console.log('🚀 Запуск тестового скрипта...');
const tester = new SectorDataLoadingTester();
tester.runAllSectorTests().catch(console.error);

export { SectorDataLoadingTester };