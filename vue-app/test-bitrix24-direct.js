/**
 * Прямой тест нового SectorBitrix24Service
 */

import { SectorStubFactory } from './src/services/sectors/stubs/index.js';

async function testNewBitrix24Service() {
  console.log('🆕 ТЕСТ НОВОГО SectorBitrix24Service');
  console.log('===================================');

  try {
    console.log('1. Создаем сервис...');
    const service = SectorStubFactory.create('bitrix24');
    console.log('✅ Сервис создан:', service.constructor.name);

    console.log('2. Проверяем конфигурацию...');
    console.log('   sectorId:', service.sectorId);
    console.log('   filterValue:', service.sectorConfig.filterValue);

    console.log('3. Вызываем getSectorData()...');
    const data = await service.getSectorData();
    console.log('✅ Метод выполнен');

    console.log('\n📊 РЕЗУЛЬТАТ:');
    console.log('=============');
    console.log('Стадии:', data.stages?.length || 0);
    console.log('Тикетов всего:', data.stages?.reduce((sum, s) => sum + (s.tickets?.length || 0), 0) || 0);

    if (data.stages) {
      data.stages.forEach((stage, i) => {
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
testNewBitrix24Service().catch(console.error);