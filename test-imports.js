// Тест импортов для проверки работоспособности
import { filterTicketsBySector } from './vue-app/src/services/dashboard/filters/sector-filter.js';
import { getSectorFilterValues } from './vue-app/src/services/dashboard/utils/sector-config-helper.js';

console.log('✅ Импорты работают корректно');
console.log('filterTicketsBySector:', typeof filterTicketsBySector);
console.log('getSectorFilterValues:', typeof getSectorFilterValues);

// Тестовые данные
const testTickets = [
  { id: 1, UF_CRM_7_TYPE_PRODUCT: '1C' },
  { id: 2, UF_CRM_7_TYPE_PRODUCT: 'PDM' }
];

const testConfig = {
  id: '1c',
  name: '1C',
  filterValue: '1C'
};

try {
  const result = filterTicketsBySector(testTickets, testConfig);
  console.log('✅ filterTicketsBySector работает, результат:', result.length, 'тикета');
} catch (error) {
  console.error('❌ Ошибка в filterTicketsBySector:', error.message);
}