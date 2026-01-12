/**
 * Тестовый скрипт для проверки загрузки данных секторов
 *
 * Запустите этот код в консоли браузера (F12) на странице приложения
 * для диагностики проблем с загрузкой секторов PDM, Bitrix24, Infrastructure
 */

// Импортируем необходимые модули (если они доступны глобально)
async function testSectorLoading() {
  console.log('🔍 Начинаем тестирование загрузки секторов...');

  try {
    // Тестируем загрузку сервисов секторов
    const sectorsToTest = ['pdm', 'bitrix24', 'infrastructure'];

    for (const sectorId of sectorsToTest) {
      console.log(`\n📋 Тестируем сектор: ${sectorId}`);

      try {
        // Имитируем загрузку через универсальный сервис
        const { UniversalSectorDashboardFactory } = await import('./src/services/universal-sector-dashboard-service.js');
        const service = UniversalSectorDashboardFactory.getService(sectorId);

        console.log(`✅ Сервис создан для сектора ${sectorId}`);

        // Пытаемся загрузить данные
        const data = await service.getSectorDashboardData();
        console.log(`✅ Данные загружены для сектора ${sectorId}:`, {
          stages: data.stages?.length || 0,
          employees: data.employees?.length || 0,
          totalTickets: data.metadata?.totalTickets || 0,
          stages: data.stages?.map(s => `${s.name} (${s.tickets?.length || 0} тикетов)`)
        });

      } catch (error) {
        console.error(`❌ Ошибка при тестировании сектора ${sectorId}:`, error);
      }
    }

    console.log('\n🎉 Тестирование завершено!');

  } catch (error) {
    console.error('❌ Ошибка импорта модулей:', error);
    console.log('💡 Попробуйте запустить этот код на главной странице приложения');
  }
}

// Функция для быстрого тестирования в консоли
function quickSectorTest() {
  console.log('🚀 Быстрое тестирование секторов...');

  // Проверяем доступность основных модулей
  if (typeof window !== 'undefined' && window.Vue) {
    console.log('✅ Vue.js загружен');
  } else {
    console.log('❌ Vue.js не найден');
  }

  // Проверяем конфигурацию секторов
  try {
    const sectorsConfig = window.sectorsConfig || {};
    console.log('✅ Конфигурация секторов доступна:', Object.keys(sectorsConfig));
  } catch (e) {
    console.log('❌ Конфигурация секторов недоступна');
  }

  console.log('💡 Для полного тестирования запустите: testSectorLoading()');
}

// Экспортируем функции для использования в консоли
if (typeof window !== 'undefined') {
  window.testSectorLoading = testSectorLoading;
  window.quickSectorTest = quickSectorTest;

  console.log('📋 Тестовые функции загружены!');
  console.log('🔧 Запустите: quickSectorTest() для быстрой проверки');
  console.log('🔧 Запустите: testSectorLoading() для полного тестирования');
}

// Автоматически запускаем быструю проверку
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('\n🔍 Автоматическая проверка:');
    quickSectorTest();
  }, 1000);
}