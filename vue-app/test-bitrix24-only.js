/**
 * Тест только сектора Битрикс24 для диагностики
 */

import { UniversalSectorDashboardFactory } from './src/services/universal-sector-dashboard-service.js';

async function testBitrix24Sector() {
  console.log('🔍 ДИАГНОСТИКА СЕКТОРА БИТРИКС24');
  console.log('=================================');

  try {
    console.log('1. Получаем сервис сектора Битрикс24...');
    const service = UniversalSectorDashboardFactory.getService('bitrix24');
    console.log('✅ Сервис получен:', service.constructor.name);

    console.log('2. Очищаем кеш...');
    service.clearCache();
    console.log('✅ Кеш очищен');

    console.log('3. Получаем данные сектора...');
    const sectorData = await service.getSectorDashboardData({ forceRefresh: true });
    console.log('✅ Данные получены');

    console.log('\n📊 АНАЛИЗ ПОЛУЧЕННЫХ ДАННЫХ:');
    console.log('===========================');

    console.log(`Стадии: ${sectorData.stages?.length || 0}`);
    console.log(`Всего тикетов: ${sectorData.metadata?.totalTickets || 0}`);
    console.log(`Сотрудников: ${sectorData.employees?.length || 0}`);

    if (sectorData.stages && sectorData.stages.length > 0) {
      console.log('\nСТАДИИ:');
      sectorData.stages.forEach((stage, index) => {
        console.log(`${index + 1}. ${stage.name} (${stage.id}): ${stage.tickets?.length || 0} тикетов`);
        if (stage.tickets && stage.tickets.length > 0) {
          console.log(`   Тикеты:`, stage.tickets.map(t => `${t.id}: ${t.title}`).join(', '));
        }
      });

      // Проверяем маппинг
      console.log('\nМАППИНГ СТАДИЙ:');
      const formedCount = sectorData.stages.find(s => s.id === 'DT140_12:UC_0VHWE2')?.tickets?.length || 0;
      const reviewCount = sectorData.stages.find(s => s.id === 'DT140_12:PREPARATION')?.tickets?.length || 0;
      const executionCount = sectorData.stages.find(s => s.id === 'DT140_12:CLIENT')?.tickets?.length || 0;

      console.log(`DT140_12:UC_0VHWE2 (formed): ${formedCount}`);
      console.log(`DT140_12:PREPARATION (review): ${reviewCount}`);
      console.log(`DT140_12:CLIENT (execution): ${executionCount}`);
      console.log(`Распределение: ${formedCount}/${reviewCount}/${executionCount}`);

    } else {
      console.log('❌ СТАДИИ ОТСУТСТВУЮТ!');
    }

    console.log('\n🎯 ОЖИДАЕМЫЕ ДАННЫЕ:');
    console.log('===================');
    console.log('Распределение: 1/0/0');
    console.log('Всего тикетов: 1');
    console.log('Сотрудников: 1');

    console.log('\n✅ ТЕСТ ЗАВЕРШЕН');

  } catch (error) {
    console.error('❌ ОШИБКА ПРИ ТЕСТИРОВАНИИ:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск теста
testBitrix24Sector().catch(console.error);