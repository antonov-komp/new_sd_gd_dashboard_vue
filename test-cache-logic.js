// Простой тест логики категоризации кеша
console.log('Testing cache categorization logic...');

// Mock данные
const mockModules = [
  {
    id: 'dashboard-sector-1c',
    name: 'Дашборд сектора 1С',
    status: 'active',
    file_count: 5,
    total_size: 1024000,
    ttl: 600
  },
  {
    id: 'graph-state',
    name: 'График состояния',
    status: 'active',
    file_count: 3,
    total_size: 512000,
    ttl: 3600
  },
  {
    id: 'graph-admission-closure-weeks',
    name: 'График приёма/закрытий 1С (4 недели)',
    status: 'active',
    file_count: 8,
    total_size: 2048000,
    ttl: 300
  },
  {
    id: 'users-management-departments',
    name: 'Управление пользователями (отделы)',
    status: 'active',
    file_count: 2,
    total_size: 256000,
    ttl: 3600
  },
  {
    id: 'webhook-logs-api',
    name: 'Логи вебхуков (API запросы)',
    status: 'active',
    file_count: 15,
    total_size: 5120000,
    ttl: 300
  }
];

// Логика категоризации (как в CacheManagementService)
const PRIMARY_MODULE_IDS = [
  'dashboard-sector-1c',
  'graph-state',
  'graph-admission-closure-weeks',
  'graph-admission-closure-months',
  'time-tracking-default',
  'time-tracking-detailed',
  'time-tracking-summary'
];

function categorizeAndSortModules(modules) {
  const primaryModules = [];
  const secondaryModules = [];

  modules.forEach(module => {
    if (PRIMARY_MODULE_IDS.includes(module.id)) {
      primaryModules.push({
        ...module,
        category: 'primary',
        priority: getPriority(module.id)
      });
    } else {
      secondaryModules.push({
        ...module,
        category: 'secondary',
        groupType: getModuleType(module.id)
      });
    }
  });

  return {
    primaryModules: sortPrimaryModules(primaryModules),
    secondaryModules: sortSecondaryModules(secondaryModules),
    metadata: {
      totalModules: modules.length,
      primaryCount: primaryModules.length,
      secondaryCount: secondaryModules.length
    }
  };
}

function getPriority(moduleId) {
  const priorities = {
    'dashboard-sector-1c': 1,
    'graph-state': 2,
    'graph-admission-closure-weeks': 3,
    'graph-admission-closure-months': 4,
    'time-tracking-default': 5,
    'time-tracking-detailed': 6,
    'time-tracking-summary': 7
  };
  return priorities[moduleId] || 999;
}

function getModuleType(moduleId) {
  if (moduleId.startsWith('users-management')) return 'users';
  if (moduleId.startsWith('user-activity')) return 'activity';
  if (moduleId.startsWith('webhook-logs')) return 'webhooks';
  return 'other';
}

function sortPrimaryModules(modules) {
  return modules.sort((a, b) => (a.priority || 999) - (b.priority || 999));
}

function sortSecondaryModules(modules) {
  return modules.sort((a, b) => {
    const aType = a.groupType || 'other';
    const bType = b.groupType || 'other';
    if (aType !== bType) {
      return aType.localeCompare(bType);
    }
    return a.name.localeCompare(b.name);
  });
}

// Тестирование
const result = categorizeAndSortModules(mockModules);

console.log('Test Results:');
console.log('Total modules:', result.metadata.totalModules);
console.log('Primary modules:', result.metadata.primaryCount);
console.log('Secondary modules:', result.metadata.secondaryCount);

console.log('\nPrimary modules:');
result.primaryModules.forEach(module => {
  console.log(`  - ${module.name} (priority: ${module.priority})`);
});

console.log('\nSecondary modules:');
result.secondaryModules.forEach(module => {
  console.log(`  - ${module.name} (type: ${module.groupType})`);
});

console.log('\nTest completed successfully!');