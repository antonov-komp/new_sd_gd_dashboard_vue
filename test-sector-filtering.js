#!/usr/bin/env node

/**
 * Тест универсальной фильтрации секторов
 *
 * Проверяет работу filterTicketsBySector для всех секторов
 * Запускается как: node test-sector-filtering.js
 */

import { filterTicketsBySector } from './vue-app/src/services/dashboard/filters/sector-filter.js';

// Тестовые данные
const testTickets = [
  // Тикеты сектора 1C
  { id: 1001, UF_CRM_7_TYPE_PRODUCT: '1C', title: 'Обновление 1С:Предприятие' },
  { id: 1002, UF_CRM_7_TYPE_PRODUCT: '1С', title: 'Миграция базы 1С' }, // кириллица

  // Тикеты сектора PDM
  { id: 2001, UF_CRM_7_TYPE_PRODUCT: 'PDM', title: 'Разработка модели продукта' },
  { id: 2002, UF_CRM_7_TYPE_PRODUCT: 'pdm', title: 'Интеграция PDM системы' }, // нижний регистр

  // Тикеты сектора Bitrix24
  { id: 3001, UF_CRM_7_TYPE_PRODUCT: 'Bitrix24', title: 'Настройка портала' },
  { id: 3002, UF_CRM_7_TYPE_PRODUCT: 'BITRIX24', title: 'Интеграция с внешними системами' },

  // Тикеты сектора Infrastructure
  { id: 4001, UF_CRM_7_TYPE_PRODUCT: 'Железо', title: 'Замена сервера' },
  { id: 4002, UF_CRM_7_TYPE_PRODUCT: 'Прочее', title: 'Настройка сети' },
  { id: 4003, UF_CRM_7_TYPE_PRODUCT: 'железо', title: 'Обновление оборудования' }, // нижний регистр

  // Тикеты без фильтра или с другими значениями
  { id: 9999, UF_CRM_7_TYPE_PRODUCT: 'Другое', title: 'Неотфильтрованный тикет' },
  { id: 9998, title: 'Тикет без поля фильтра' }
];

// Конфигурации секторов
const sectorConfigs = {
  sector1c: {
    id: '1c',
    name: 'Сектор 1С',
    filterValue: '1C',
    filterField: 'UF_CRM_7_TYPE_PRODUCT'
  },
  sectorPdm: {
    id: 'pdm',
    name: 'Сектор PDM',
    filterValue: 'PDM',
    filterField: 'UF_CRM_7_TYPE_PRODUCT'
  },
  sectorBitrix24: {
    id: 'bitrix24',
    name: 'Сектор Битрикс24',
    filterValue: 'Bitrix24',
    filterField: 'UF_CRM_7_TYPE_PRODUCT'
  },
  sectorInfrastructure: {
    id: 'infrastructure',
    name: 'Сектор Infrastructure',
    filterValue: ['Железо', 'Прочее'],
    filterField: 'UF_CRM_7_TYPE_PRODUCT'
  }
};

// Ожидаемые результаты
const expectedResults = {
  sector1c: [1001, 1002], // Должен включать кириллицу '1С'
  sectorPdm: [2001, 2002], // Должен быть регистронезависимым
  sectorBitrix24: [3001, 3002], // Должен быть регистронезависимым
  sectorInfrastructure: [4001, 4002, 4003] // Должен включать оба значения фильтра
};

console.log('🚀 Запуск тестов универсальной фильтрации секторов\n');

let allTestsPassed = true;

for (const [sectorKey, config] of Object.entries(sectorConfigs)) {
  console.log(`\n📋 Тестирование ${config.name} (${config.id})`);

  try {
    const result = filterTicketsBySector(testTickets, config);
    const resultIds = result.map(t => t.id).sort();
    const expectedIds = expectedResults[sectorKey].sort();

    const passed = JSON.stringify(resultIds) === JSON.stringify(expectedIds);

    console.log(`   Фильтр: ${JSON.stringify(config.filterValue)}`);
    console.log(`   Ожидаемые ID: [${expectedIds.join(', ')}]`);
    console.log(`   Полученные ID: [${resultIds.join(', ')}]`);
    console.log(`   Результат: ${passed ? '✅ Пройден' : '❌ Провал'}`);

    if (!passed) {
      allTestsPassed = false;
      console.log(`   ❌ Ожидалось: ${expectedIds.length} тикетов, получено: ${resultIds.length}`);
    } else {
      console.log(`   ✅ Отфильтровано ${resultIds.length} тикетов из ${testTickets.length}`);
    }

  } catch (error) {
    console.error(`   ❌ Ошибка при тестировании ${config.name}:`, error.message);
    allTestsPassed = false;
  }
}

console.log('\n' + '='.repeat(50));
console.log(`🎯 Итоговый результат: ${allTestsPassed ? '✅ Все тесты пройдены' : '❌ Есть проваленные тесты'}`);

if (allTestsPassed) {
  console.log('\n🎉 Универсальная фильтрация работает корректно для всех секторов!');
} else {
  console.log('\n⚠️  Требуется исправить ошибки в фильтрации');
  process.exit(1);
}