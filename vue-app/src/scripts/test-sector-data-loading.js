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
    console.log('ℹ️  Получение реальных данных из системы...');

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

    console.log(`[TEST] Начинаем тестирование сектора: ${sectorId}`);

    try {
      // Получаем сервис сектора
      const service = UniversalSectorDashboardFactory.getService(sectorId);
      console.log(`[TEST] Сервис сектора ${sectorId} получен:`, service.constructor.name);

      // Ждем инициализации сервиса
      await this.waitForServiceInitialization(service);

      // Очищаем кеш перед получением свежих данных
      service.clearCache();
      console.log(`[TEST] Кеш очищен для сектора ${sectorId}`);

      // Получаем данные сектора с параметрами пагинации и отключенным кешем
      const options = this.getSectorOptions(sectorId);
      console.log(`[TEST] Опции для сектора ${sectorId}:`, options);

      const sectorData = await service.getSectorDashboardData(options);
      console.log(`[TEST] Получены данные сектора ${sectorId}:`, {
        stagesCount: sectorData.stages?.length || 0,
        totalTickets: sectorData.metadata?.totalTickets || 0,
        stages: sectorData.stages?.map(s => ({ id: s.id, name: s.name, tickets: s.tickets?.length || 0 })) || []
      });

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
   * Маппинг ID стадий сектора на ID дашборда
   *
   * @param {string} stageId - ID этапа сектора
   * @returns {string} ID этапа дашборда
   */
  mapStageIdToDashboardId(stageId) {
    // Маппинг для всех секторов (DT140_12:...)
    const stageMappings = {
      // Сектор 1С
      'DT140_12:UC_0VHWE2': 'formed',    // Сформировано обращение
      'DT140_12:PREPARATION': 'review',   // Рассмотрение ТЗ
      'DT140_12:CLIENT': 'execution',     // Исполнение

      // Общие маппинги (если сектора используют похожие ID)
      'formed': 'formed',
      'review': 'review',
      'execution': 'execution',
      'request': 'formed',
      'assessment': 'review',
      'deployment': 'execution',

      // Для сектора PDM (заглушка)
      'design': 'formed',
      'review': 'review',
      'implementation': 'execution'
    };

    return stageMappings[stageId] || stageId;
  }

  /**
   * Получение параметров для тестирования сектора
   *
   * @param {string} sectorId - ID сектора
   * @returns {object} Параметры тестирования
   */
  getSectorOptions(sectorId) {
    const baseOptions = {
      forceRefresh: true, // Всегда свежие данные для тестирования
      pagination: {
        enabled: false // По умолчанию пагинация отключена
      }
    };

    // Специфические параметры для каждого сектора
    switch (sectorId) {
      case '1c':
        // Сектор 1С имеет большое количество данных (60/13/13 = 86 тикетов)
        // Включаем пагинацию для оптимизации загрузки
        return {
          ...baseOptions,
          pagination: {
            enabled: true,
            pageSize: 50, // Загружаем по 50 элементов за раз
            stages: ['formed', 'review', 'execution'] // Четко определяем три стадии
          },
          // Параметры для сектора 1С
          useCache: false, // Отключаем кеш для точного тестирования
          useBackendCache: false
        };

      case 'pdm':
        return {
          ...baseOptions,
          pagination: {
            enabled: false // Маленький объем данных
          }
        };

      case 'bitrix24':
        // Сектор Битрикс24 теперь использует те же стадии DT140_12 что и 1С
        return {
          ...baseOptions,
          pagination: {
            enabled: false // Маленький объем данных (заглушка)
          }
        };

      case 'infrastructure':
        return {
          ...baseOptions,
          pagination: {
            enabled: false // Маленький объем данных
          }
        };

      default:
        return baseOptions;
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

    // Специфическая проверка для сектора 1С (ожидаем 60/13/13)
    if (sectorId === '1c') {
      const stageMetrics = {};
      sectorData.stages.forEach(stage => {
        stageMetrics[stage.id] = stage.tickets?.length || 0;
      });

      // Проверяем ожидаемые метрики для сектора 1С
      const expectedMetrics = {
        formed: 60,    // Первая стадия: 60 элементов
        review: 13,    // Вторая стадия: 13 элементов
        execution: 13  // Третья стадия: 13 элементов
      };

      Object.entries(expectedMetrics).forEach(([stageId, expectedCount]) => {
        const actualCount = stageMetrics[stageId] || 0;
        if (actualCount !== expectedCount) {
          warnings.push(`Стадия ${stageId}: ожидалось ${expectedCount} элементов, получено ${actualCount}`);
        }
      });
    }

      // Специфическая проверка для сектора PDM (ожидаем 0/27/3 с едиными стадиями DT140_12)
    if (sectorId === 'pdm') {
      const stageMetrics = {};
      sectorData.stages.forEach(stage => {
        const dashboardStageId = this.mapStageIdToDashboardId(stage.id);
        stageMetrics[dashboardStageId] = stage.tickets?.length || 0;
      });

      // Проверяем ожидаемые метрики для сектора PDM
      const expectedMetrics = {
        formed: 0,     // DT140_12:UC_0VHWE2 → formed: 0 элементов
        review: 27,    // DT140_12:PREPARATION → review: 27 элементов
        execution: 3   // DT140_12:CLIENT → execution: 3 элементов
      };

      Object.entries(expectedMetrics).forEach(([stageId, expectedCount]) => {
        const actualCount = stageMetrics[stageId] || 0;
        if (actualCount !== expectedCount) {
          warnings.push(`Стадия ${stageId}: ожидалось ${expectedCount} элементов, получено ${actualCount}`);
        }
      });
    }

    // Специфическая проверка для сектора Битрикс24 (ожидаем 1/0/0 с едиными стадиями DT140_12)
    if (sectorId === 'bitrix24') {
      console.log('[TEST] Проверяем данные сектора Битрикс24:', {
        stagesCount: sectorData.stages?.length || 0,
        stages: sectorData.stages?.map(s => ({ id: s.id, ticketsCount: s.tickets?.length || 0 })) || []
      });

      const stageMetrics = {};
      sectorData.stages.forEach(stage => {
        const dashboardStageId = this.mapStageIdToDashboardId(stage.id);
        stageMetrics[dashboardStageId] = stage.tickets?.length || 0;
        console.log(`[TEST] Стадия ${stage.id} (${dashboardStageId}): ${stage.tickets?.length || 0} тикетов`);
      });

      // Проверяем ожидаемые метрики для сектора Битрикс24
      const expectedMetrics = {
        formed: 1,     // DT140_12:UC_0VHWE2 → formed: 1 элемент
        review: 0,     // DT140_12:PREPARATION → review: 0 элементов
        execution: 0   // DT140_12:CLIENT → execution: 0 элементов
      };

      console.log('[TEST] Ожидаемые метрики:', expectedMetrics);
      console.log('[TEST] Фактические метрики:', stageMetrics);

      Object.entries(expectedMetrics).forEach(([stageId, expectedCount]) => {
        const actualCount = stageMetrics[stageId] || 0;
        if (actualCount !== expectedCount) {
          warnings.push(`Стадия ${stageId}: ожидалось ${expectedCount} элементов, получено ${actualCount}`);
        }
      });
    }

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

    // Специфическая информация для секторов с известным распределением
    if (result.sectorId === '1c' || result.sectorId === 'pdm' || result.sectorId === 'bitrix24') {
      const stageCounts = Object.values(result.metrics.stages).map(s => s.ticketCount);
      console.log(`   📊 Распределение: ${stageCounts.join('/')}`);

      // Проверяем соответствие ожидаемым данным
      if (result.sectorId === '1c') {
        const expected = [60, 13, 13];
        const actual = stageCounts;
        const matches = expected.every((exp, i) => exp === actual[i]);
        if (!matches) {
          console.warn(`   ⚠️  Несоответствие ожидаемым данным 1С: ожидалось ${expected.join('/')}, получено ${actual.join('/')}`);
        }
      } else if (result.sectorId === 'pdm') {
        const expected = [0, 27, 3];
        const actual = stageCounts;
        const matches = expected.every((exp, i) => exp === actual[i]);
        if (!matches) {
          console.warn(`   ⚠️  Несоответствие ожидаемым данным PDM: ожидалось ${expected.join('/')}, получено ${actual.join('/')}`);
        }
      } else if (result.sectorId === 'bitrix24') {
        const expected = [1, 0, 0];
        const actual = stageCounts;
        const matches = expected.every((exp, i) => exp === actual[i]);
        if (!matches) {
          console.warn(`   ⚠️  Несоответствие ожидаемым данным Битрикс24: ожидалось ${expected.join('/')}, получено ${actual.join('/')}`);
        }
      }
    }

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