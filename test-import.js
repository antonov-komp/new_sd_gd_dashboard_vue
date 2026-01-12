// Тест импорта сервисов
console.log('Testing imports...');

try {
  // Имитируем импорт
  const { UniversalSectorDashboardFactory } = require('./vue-app/src/services/universal-sector-dashboard-service.js');
  console.log('✅ UniversalSectorDashboardFactory imported successfully');
  console.log('getService method:', typeof UniversalSectorDashboardFactory.getService);
} catch (error) {
  console.error('❌ Import failed:', error.message);
}