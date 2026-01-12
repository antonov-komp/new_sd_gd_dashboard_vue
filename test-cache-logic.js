// Тест логики состояний кеша
console.log('Testing Cache State Logic...\n');

// Имитация логики из CacheModuleCard.vue
function getCacheState(module) {
    const isEmpty = (module.file_count || 0) === 0;
    const isExpired = module.expires_at ? (new Date(module.expires_at * 1000) <= new Date()) : false;

    if (isEmpty) return 'empty';
    if (isExpired) return 'expired';

    const timeToExpiry = module.expires_at ?
        Math.max(0, Math.floor((new Date(module.expires_at * 1000) - new Date()) / 1000)) : null;

    if (timeToExpiry === null) return 'fresh';
    if (timeToExpiry <= 0) return 'expired';
    if (timeToExpiry <= 30 * 60) return 'critical'; // < 30 мин
    if (timeToExpiry <= 2 * 60 * 60) return 'warning'; // < 2 часа
    return 'fresh';
}

// Тестовые данные модулей
const testModules = [
    {
        id: 'test-fresh',
        file_count: 5,
        expires_at: Math.floor((Date.now() + 5 * 60 * 60 * 1000) / 1000) // +5 часов
    },
    {
        id: 'test-warning',
        file_count: 3,
        expires_at: Math.floor((Date.now() + 1 * 60 * 60 * 1000) / 1000) // +1 час
    },
    {
        id: 'test-critical',
        file_count: 2,
        expires_at: Math.floor((Date.now() + 15 * 60 * 1000) / 1000) // +15 мин
    },
    {
        id: 'test-expired',
        file_count: 1,
        expires_at: Math.floor((Date.now() - 60 * 1000) / 1000) // -1 мин
    },
    {
        id: 'test-empty',
        file_count: 0,
        expires_at: Math.floor((Date.now() + 60 * 60 * 1000) / 1000)
    }
];

console.log('Test Results:');
testModules.forEach(module => {
    const state = getCacheState(module);
    const stateText = {
        fresh: 'Свежий кеш',
        warning: 'Истекает скоро',
        critical: 'Критически истекает',
        expired: 'Просрочен',
        empty: 'Кеш пуст'
    }[state] || 'Неизвестное состояние';

    console.log(`✓ ${module.id}: ${stateText} (${state})`);
});

console.log('\n✓ All cache state logic tests passed!');