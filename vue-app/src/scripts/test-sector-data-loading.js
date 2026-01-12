/**
 * Тестовый скрипт для проверки загрузки данных секторов
 *
 * Проверяет загрузку данных всех 4 секторов (1C, PDM, Bitrix24, Infrastructure)
 * Выполняет прямые запросы к трем основным стадиям каждого сектора
 * Выводит результаты в браузерную консоль
 * Прерывает тестирование при первой ошибке
 *
 * @version 1.0
 * @since 2026-01-12
 */

import { UniversalSectorDashboardFactory } from '../services/universal-sector-dashboard-service.js';
import { SECTORS_CONFIG } from '../config/sectors.js';

/**
 * Класс для тестирования загрузки данных секторов
 */
export class SectorDataLoadingTester {
  constructor() {
    this.sectors = ['1c', 'pdm', 'bitrix24', 'infrastructure'];
    this.results = [];
    this.errors = [];
  }

  /**
   * Запуск тестирования всех секторов последовательно
   */
  async runAllSectorTests() {
    console.log('%c🎯 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ СЕКТОРОВ', 'font-size: 16px; font-weight: bold; color: #007bff');
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
   *
   * @param {string} sectorId - ID сектора для тестирования
   * @returns {Promise<object>} Результат тестирования сектора
   */
  async testSector(sectorId) {
    const startTime = performance.now();

    try {
      // Получаем сервис сектора
      const service = UniversalSectorDashboardFactory.getService(sectorId);

      // Ждем инициализации сервиса
      await this.waitForServiceInitialization(service);

      // Получаем данные сектора
      const sectorData = await service.getSectorDashboardData();

      // Проверяем корректность данных
      const validationResult = this.validateSectorData(sectorData, sectorId);

      const duration = performance.now() - startTime;

      return {
        sectorId,
        success: validationResult.valid,
        duration: Math.round(duration * 100) / 100, // Округляем до сотых
        data: sectorData,
        validation: validationResult,
        metrics: this.extractMetrics(sectorData)
      };

    } catch (error) {
      const duration = performance.now() - startTime;

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
   * Ожидание инициализации сервиса сектора
   *
   * @param {UniversalSectorDashboardService} service - Сервис сектора
   */
  async waitForServiceInitialization(service) {
    // Сервис инициализируется в конструкторе, но для надежности
    // ждем небольшую задержку
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Валидация данных сектора
   *
   * @param {object} sectorData - Данные сектора
   * @param {string} sectorId - ID сектора
   * @returns {object} Результат валидации
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
   *
   * @param {object} sectorData - Данные сектора
   * @returns {object} Метрики сектора
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
   *
   * @param {object} result - Результат тестирования
   */
  logSectorSuccess(result) {
    const sectorConfig = SECTORS_CONFIG[`sector${result.sectorId}`] || SECTORS_CONFIG[result.sectorId];
    const sectorName = sectorConfig?.name || result.sectorId;

    console.log(`%c✅ ${sectorName} (${result.duration} сек)`, 'color: #28a745; font-weight: bold');

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
   *
   * @param {object} result - Результат тестирования с ошибкой
   */
  logSectorError(result) {
    const sectorConfig = SECTORS_CONFIG[`sector${result.sectorId}`] || SECTORS_CONFIG[result.sectorId];
    const sectorName = sectorConfig?.name || result.sectorId;

    console.log(`%c❌ ${sectorName} (${result.duration} сек)`, 'color: #dc3545; font-weight: bold');
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
    console.log('%c📊 ИТОГИ ТЕСТИРОВАНИЯ', 'font-size: 14px; font-weight: bold; color: #6c757d');

    const successfulTests = this.results.length;
    const failedTests = this.errors.length;
    const totalTests = this.sectors.length;

    console.log(`Успешных тестов: ${successfulTests}/${totalTests}`);
    console.log(`Неудачных тестов: ${failedTests}/${totalTests}`);

    if (successfulTests === totalTests) {
      console.log('%c✅ Все сектора протестированы успешно!', 'color: #28a745; font-weight: bold');
    } else {
      console.log('%c❌ Тестирование прервано из-за ошибки в секторе:', 'color: #dc3545; font-weight: bold', this.errors[0]?.sectorId);
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

// Экспортируем класс для использования
export default SectorDataLoadingTester;