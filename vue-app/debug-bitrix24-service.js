/**
 * Прямой тест сервиса сектора Битрикс24
 */

import { SectorStubFactory } from './src/services/sectors/stubs/index.js';

async function debugBitrix24Service() {
  console.log('🔧 ПРЯМОЙ ТЕСТ SectorBitrix24Service');
  console.log('=====================================');

  try {
    console.log('1. Создаем сервис через фабрику...');
    const service = SectorStubFactory.create('bitrix24');
    console.log('✅ Сервис создан:', service.constructor.name);

    console.log('2. Вызываем getSectorData()...');
    const rawData = await service.getSectorData({ forceRefresh: true });
    console.log('✅ Метод выполнен');

    console.log('\n📊 СЫРЫЕ ДАННЫЕ:');
    console.log('================');
    console.log('Stages:', rawData.stages?.length || 0);
    console.log('Total tickets:', rawData.stages?.reduce((sum, s) => sum + (s.tickets?.length || 0), 0) || 0);

    if (rawData.stages) {
      rawData.stages.forEach((stage, i) => {
        console.log(`${i+1}. ${stage.id}: ${stage.tickets?.length || 0} тикетов`);
      });
    }

    console.log('\n🎯 ОЖИДАЕМ: 1 тикет в стадии DT140_12:UC_0VHWE2');

  } catch (error) {
    console.error('❌ ОШИБКА:', error);
    console.error('Stack:', error.stack);
  }
}

// Запуск
debugBitrix24Service().catch(console.error);