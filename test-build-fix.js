// Тест исправлений сборки
console.log('🧪 Проверка исправлений сборки...\n');

try {
  // Импорт сервиса
  const { UniversalSectorDashboardService } = await import('./vue-app/src/services/universal-sector-dashboard-service.js');
  console.log('✅ UniversalSectorDashboardService импортирован');

  // Проверка статических методов
  if (typeof UniversalSectorDashboardService.getService === 'function') {
    console.log('✅ Метод getService доступен');
  } else {
    console.error('❌ Метод getService не найден');
  }

  // Импорт actions
  const { useUniversalDashboardActions } = await import('./vue-app/src/composables/useUniversalDashboardActions.js');
  console.log('✅ useUniversalDashboardActions импортирован');

  console.log('\n🎉 Все импорты работают корректно!');
  console.log('🚀 Сборка должна пройти успешно.');

} catch (error) {
  console.error('❌ Ошибка импорта:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}