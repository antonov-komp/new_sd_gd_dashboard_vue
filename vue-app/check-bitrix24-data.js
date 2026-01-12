/**
 * Проверка данных сектора Битрикс24
 */

import { UniversalSectorDashboardFactory } from './src/services/universal-sector-dashboard-service.js';

async function checkBitrix24Data() {
  console.log('🔍 ПРОВЕРКА ДАННЫХ СЕКТОРА БИТРИКС24');
  console.log('=====================================');

  try {
    // Получаем сервис сектора Битрикс24
    const service = UniversalSectorDashboardFactory.getService('bitrix24');
    console.log('✅ Сервис сектора Битрикс24 получен');

    // Очищаем кеш
    service.clearCache();
    console.log('🧹 Кеш очищен');

    // Получаем данные
    const sectorData = await service.getSectorDashboardData({ forceRefresh: true });
    console.log('📊 Данные сектора получены');

    console.log('\n📋 РЕЗУЛЬТАТЫ:');
    console.log('===============');

    console.log(`Всего стадий: ${sectorData.stages?.length || 0}`);
    console.log(`Всего сотрудников: ${sectorData.employees?.length || 0}`);
    console.log(`Всего тикетов: ${sectorData.metadata?.totalTickets || 0}`);

    if (sectorData.stages && sectorData.stages.length > 0) {
      console.log('\nСТАДИИ:');
      sectorData.stages.forEach((stage, index) => {
        console.log(`  ${index + 1}. ${stage.name} (${stage.id}): ${stage.tickets?.length || 0} тикетов`);
      });

      // Подсчет по стандартным стадиям
      const formedCount = sectorData.stages.find(s => s.id === 'formed')?.tickets?.length || 0;
      const reviewCount = sectorData.stages.find(s => s.id === 'review')?.tickets?.length || 0;
      const executionCount = sectorData.stages.find(s => s.id === 'execution')?.tickets?.length || 0;

      console.log('\n📊 РАСПРЕДЕЛЕНИЕ ПО СТАДИЯМ:');
      console.log(`  Formed: ${formedCount}`);
      console.log(`  Review: ${reviewCount}`);
      console.log(`  Execution: ${executionCount}`);
      console.log(`  Формат: ${formedCount}/${reviewCount}/${executionCount}`);
    } else {
      console.log('\n❌ Стадии отсутствуют - сектор возвращает пустые данные');
    }

  } catch (error) {
    console.error('❌ Ошибка при получении данных сектора Битрикс24:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск проверки
checkBitrix24Data().catch(console.error);