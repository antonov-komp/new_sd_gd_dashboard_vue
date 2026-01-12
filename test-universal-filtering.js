#!/usr/bin/env node

/**
 * Тест универсальной фильтрации секторов
 *
 * Проверяет работу filterTicketsBySector для всех секторов
 */

console.log('🧪 Тестирование универсальной фильтрации секторов...\n');

// Импортируем функции
import { filterTicketsBySector } from './vue-app/src/services/dashboard/filters/sector-filter.js';

// Тестовые данные
const testTickets = [
  // Тикеты сектора 1C
  { id: 1001, UF_CRM_7_TYPE_PRODUCT: '1C', title: 'Обновление 1С' },
  { id: 1002, UF_CRM_7_TYPE_PRODUCT: '1С', title: 'Миграция 1С' },

  // Тикеты сектора PDM
  { id: 2001, UF_CRM_7_TYPE_PRODUCT: 'PDM', title: 'Разработка PDM' },
  { id: 2002, UF_CRM_7_TYPE_PRODUCT: 'pdm', title: 'Интеграция PDM' },

  // Тикеты сектора Bitrix24
  { id: 3001, UF_CRM_7_TYPE_PRODUCT: 'Bitrix24', title: 'Настройка B24' },
  { id: 3002, UF_CRM_7_TYPE_PRODUCT: 'BITRIX24', title: 'Интеграция B24' },

  // Тикеты сектора Infrastructure
  { id: 4001, UF_CRM_7_TYPE_PRODUCT: 'Железо', title: 'Замена сервера' },
  { id: 4002, UF_CRM_7_TYPE_PRODUCT: 'Прочее', title: 'Настройка сети' },
  { id: 4003, UF_CRM_7_TYPE_PRODUCT: 'железо', title: 'Обновление оборудования' }
];

// Конфигурации секторов
const sectorConfigs = {
  '1c': { id: '1c', name: '1C', filterValue: '1C' },
  'pdm': { id: 'pdm', name: 'PDM', filterValue: 'PDM' },
  'bitrix24': { id: 'bitrix24', name: 'Bitrix24', filterValue: 'Bitrix24' },
  'infrastructure': { id: 'infrastructure', name: 'Infrastructure', filterValue: ['Железо', 'Прочее'] }
};

// Ожидаемые результаты
const expectedResults = {
  '1c': [1001, 1002],
  'pdm': [2001, 2002],
  'bitrix24': [3001, 3002],
  'infrastructure': [4001, 4002, 4003]
};

let allTestsPassed = true;

console.log('📊 Тестовые данные:');
console.log(`   Всего тикетов: ${testTickets.length}`);
testTickets.forEach(ticket => {
  console.log(`   ${ticket.id}: ${ticket.UF_CRM_7_TYPE_PRODUCT} - ${ticket.title}`);
});

console.log('\n🔍 Тестирование фильтрации по секторам:\n');

for (const [sectorId, config] of Object.entries(sectorConfigs)) {
  console.log(`📋 Сектор ${config.name} (${config.id})`);

  try {
    const result = filterTicketsBySector(testTickets, config);
    const resultIds = result.map(t => t.id).sort();
    const expectedIds = expectedResults[sectorId].sort();

    const passed = JSON.stringify(resultIds) === JSON.stringify(expectedIds);

    console.log(`   Фильтр: ${JSON.stringify(config.filterValue)}`);
    console.log(`   Ожидаемые ID: [${expectedIds.join(', ')}]`);
    console.log(`   Полученные ID: [${resultIds.join(', ')}]`);
    console.log(`   ✅ ${passed ? 'Пройден' : 'Провален'}`);

    if (!passed) {
      allTestsPassed = false;
      console.log(`   ❌ Несоответствие: ожидалось ${expectedIds.length}, получено ${resultIds.length}`);
    } else {
      console.log(`   ✅ Отфильтровано ${resultIds.length} тикетов`);
    }

  } catch (error) {
    console.error(`   ❌ Ошибка при тестировании ${config.name}:`, error.message);
    allTestsPassed = false;
  }

  console.log('');
}

console.log('🎯 Итоговый результат:', allTestsPassed ? '✅ Все тесты пройдены' : '❌ Есть ошибки');

if (allTestsPassed) {
  console.log('\n🎉 Универсальная фильтрация работает корректно!');
  console.log('🚀 Сектора PDM, Bitrix24 и Infrastructure теперь должны загружаться.');
} else {
  console.log('\n⚠️ Требуется исправить ошибки в фильтрации');
  process.exit(1);
}