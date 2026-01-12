# TASK-091-02-06: Интеграция, тестирование и миграция

**Дата создания:** 2026-01-12 19:25 (UTC+3, Брест)
**Оценка трудозатрат:** 14 часов

---

## 🎯 Цель задачи

Полная интеграция рефакторингового модуля "График состояния" с системой секторов TASK-091, всестороннее тестирование и миграция существующих данных.

---

## 📋 Основные активности

### Интеграция
- [ ] Интеграция с `SectorContainer.vue`
- [ ] Подключение к системе конфигурации секторов
- [ ] Обновление маршрутизации

### Тестирование
- [ ] Unit тесты всех компонентов
- [ ] Integration тесты для всех секторов
- [ ] E2E тесты пользовательских сценариев
- [ ] Performance тесты

### Миграция
- [ ] Миграция существующих слепков
- [ ] Валидация данных после миграции
- [ ] Резервное копирование

---

## 🔗 Детальные спецификации

### 1. Интеграция с SectorContainer.vue

**Обновление SectorContainer.vue:**
```vue
<template>
  <div class="sector-container" :class="`sector-${sectorConfig.id}`">
    <!-- Заголовок сектора -->
    <div class="sector-header">
      <div class="sector-icon">{{ sectorConfig.icon }}</div>
      <div class="sector-title">
        <h2>{{ sectorConfig.name }}</h2>
        <p>{{ sectorConfig.description }}</p>
      </div>
      <div class="sector-actions">
        <button @click="toggleExpanded" class="btn-toggle-sector">
          {{ expanded ? 'Свернуть' : 'Развернуть' }}
        </button>
      </div>
    </div>

    <!-- Контент сектора -->
    <div v-if="expanded" class="sector-content">
      <!-- Прелоадер -->
      <div v-if="loading" class="sector-loading">
        <div class="loading-spinner"></div>
        <p>Загрузка сектора {{ sectorConfig.name }}...</p>
      </div>

      <!-- Модули сектора -->
      <div v-else-if="sectorModules.length" class="sector-modules-grid">
        <!-- Модуль "График состояния" -->
        <SectorModuleCard
          v-if="hasGraphStateModule"
          :module-config="graphStateModuleConfig"
          :sector-id="sectorConfig.id"
          @module-ready="onModuleReady"
          @module-error="onModuleError"
        />

        <!-- Другие модули сектора -->
        <SectorModuleCard
          v-for="module in otherModules"
          :key="module.id"
          :module-config="module"
          :sector-id="sectorConfig.id"
          @module-ready="onModuleReady"
          @module-error="onModuleError"
        />
      </div>

      <!-- Сообщение об отсутствии модулей -->
      <div v-else class="no-modules">
        <p>Модули для сектора "{{ sectorConfig.name }}" находятся в разработке</p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import SectorModuleCard from './SectorModuleCard.vue';

export default {
  name: 'SectorContainer',
  components: { SectorModuleCard },

  props: {
    sectorConfig: {
      type: Object,
      required: true
    }
  },

  setup(props) {
    const expanded = ref(false);
    const loading = ref(false);
    const sectorModules = ref([]);

    // Проверка наличия модуля "График состояния"
    const hasGraphStateModule = computed(() => {
      return props.sectorConfig.modules?.includes('GraphState') ||
             props.sectorConfig.modules?.includes('StateChart');
    });

    // Конфигурация модуля "График состояния"
    const graphStateModuleConfig = computed(() => ({
      id: 'graph-state',
      title: 'График состояния',
      description: 'Визуализация состояния сектора с возможностью создания слепков',
      icon: '📊',
      component: 'GraphStateDashboard',
      props: {
        sectorId: props.sectorConfig.id,
        sectorConfig: props.sectorConfig
      },
      canExpand: true,
      category: 'analytics'
    }));

    // Остальные модули сектора
    const otherModules = computed(() => {
      if (!props.sectorConfig.modules) return [];

      return props.sectorConfig.modules
        .filter(moduleId => !['GraphState', 'StateChart'].includes(moduleId))
        .map(moduleId => ({
          id: moduleId.toLowerCase(),
          title: getModuleTitle(moduleId),
          description: getModuleDescription(moduleId),
          icon: getModuleIcon(moduleId),
          component: getModuleComponent(moduleId),
          props: { sectorId: props.sectorConfig.id },
          canExpand: true,
          category: 'sector-specific'
        }));
    });

    // Загрузка модулей при монтировании
    onMounted(async () => {
      await loadSectorModules();
    });

    const loadSectorModules = async () => {
      loading.value = true;
      try {
        // Модули регистрируются в массиве для отображения
        const modules = [];
        if (hasGraphStateModule.value) {
          modules.push(graphStateModuleConfig.value);
        }
        modules.push(...otherModules.value);

        sectorModules.value = modules;
      } catch (error) {
        console.error(`Failed to load modules for sector ${props.sectorConfig.id}:`, error);
      } finally {
        loading.value = false;
      }
    };

    const toggleExpanded = () => {
      expanded.value = !expanded.value;
    };

    const onModuleReady = (event) => {
      console.log(`Module ${event.moduleId} ready:`, event.data);
      this.$emit('module-ready', event);
    };

    const onModuleError = (event) => {
      console.error(`Module ${event.moduleId} error:`, event.error);
      this.$emit('module-error', event);
    };

    // Вспомогательные функции
    function getModuleTitle(moduleId) {
      const titles = {
        'DashboardSector1C': 'Дашборд сектора',
        'TicketsManagementSector1C': 'Управление тикетами',
        'StateChart': 'График состояния',
        'ChangesVisualization': 'Визуализация изменений'
      };
      return titles[moduleId] || moduleId;
    }

    function getModuleDescription(moduleId) {
      const descriptions = {
        'DashboardSector1C': 'Основной дашборд с обзором состояния сектора',
        'TicketsManagementSector1C': 'Управление заявками и задачами сектора',
        'StateChart': 'График состояния с историей изменений',
        'ChangesVisualization': 'Визуализация изменений в секторе'
      };
      return descriptions[moduleId] || 'Модуль сектора';
    }

    function getModuleIcon(moduleId) {
      const icons = {
        'DashboardSector1C': '📋',
        'TicketsManagementSector1C': '🎫',
        'StateChart': '📊',
        'ChangesVisualization': '📈'
      };
      return icons[moduleId] || '📦';
    }

    function getModuleComponent(moduleId) {
      const componentMap = {
        'DashboardSector1C': 'DashboardSector1C',
        'TicketsManagementSector1C': 'TicketsManagementSector1C',
        'StateChart': 'GraphStateDashboard',
        'ChangesVisualization': 'ChangesVisualization'
      };
      return componentMap[moduleId] || moduleId;
    }

    return {
      expanded,
      loading,
      sectorModules,
      hasGraphStateModule,
      graphStateModuleConfig,
      otherModules,
      toggleExpanded,
      onModuleReady,
      onModuleError
    };
  }
};
</script>
```

### 2. Система маршрутизации секторов

**Обновление router/index.js:**
```javascript
import { createRouter, createWebHistory } from 'vue-router';
import { sectorRoutes } from './sectors.js';

const routes = [
  // Существующие маршруты
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/Home.vue')
  },

  // Маршруты секторов
  ...sectorRoutes,

  // Fallback
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFound.vue')
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

**Файл router/sectors.js:**
```javascript
// Маршруты для секторов
export const sectorRoutes = [
  {
    path: '/sector/:sectorId',
    name: 'sector-dashboard',
    component: () => import('@/views/SectorDashboard.vue'),
    props: true,
    meta: {
      requiresAuth: true,
      sectorSpecific: true
    }
  },
  {
    path: '/sector/:sectorId/graph-state',
    name: 'sector-graph-state',
    component: () => import('@/components/graph-state/GraphStateDashboard.vue'),
    props: true,
    beforeEnter: async (to, from, next) => {
      try {
        // Валидация доступа к сектору
        const sectorId = to.params.sectorId;
        const sectorConfig = await SectorConfigFactory.getConfig(sectorId);

        if (!sectorConfig) {
          next('/404');
          return;
        }

        // Проверка прав доступа
        const hasAccess = await checkSectorAccess(sectorId);
        if (!hasAccess) {
          next('/403');
          return;
        }

        // Предзагрузка сервиса
        const service = new UniversalGraphStateService(sectorId);
        await service.getSectorData({ preload: true });

        next();
      } catch (error) {
        console.error('Sector route guard error:', error);
        next('/error');
      }
    },
    meta: {
      requiresAuth: true,
      sectorSpecific: true,
      module: 'graph-state'
    }
  }
];

// Вспомогательные функции
async function checkSectorAccess(sectorId) {
  // Проверка прав доступа к сектору
  try {
    const user = await AccessControlService.getCurrentUser();
    const sectorConfig = await SectorConfigFactory.getConfig(sectorId);

    if (sectorConfig.accessValidator) {
      return sectorConfig.accessValidator(user);
    }

    return true; // По умолчанию доступ открыт
  } catch (error) {
    console.error('Access check failed:', error);
    return false;
  }
}
```

### 3. Система тестирования

**Unit тесты:**
```javascript
// UniversalGraphStateService.test.js
describe('UniversalGraphStateService', () => {
  let service;
  const mockSectorId = '1c';

  beforeEach(() => {
    service = new UniversalGraphStateService(mockSectorId);
  });

  test('should initialize with correct sector id', () => {
    expect(service.sectorId).toBe(mockSectorId);
    expect(service.initialized).toBe(true);
  });

  test('should create snapshots with sector metadata', async () => {
    const mockData = { stages: [], employees: [] };
    const metadata = { createdBy: { id: 1, name: 'Test' } };

    service.getSectorData = jest.fn().mockResolvedValue(mockData);
    service._getSnapshotService = jest.fn().mockReturnValue({
      createSnapshot: jest.fn().mockResolvedValue({ id: 'test-snap' })
    });

    const result = await service.createSnapshot('week_start', metadata);

    expect(result.id).toBe('test-snap');
  });

  test('should handle errors gracefully', async () => {
    service.getSectorData = jest.fn().mockRejectedValue(new Error('API Error'));

    await expect(service.createSnapshot('manual')).rejects.toThrow('API Error');
  });
});
```

**Integration тесты:**
```javascript
// GraphStateIntegration.test.js
describe('Graph State Integration', () => {
  test('should load and display graph for different sectors', async () => {
    const sectors = ['1c', 'pdm', 'bitrix24', 'infrastructure'];

    for (const sectorId of sectors) {
      const service = new UniversalGraphStateService(sectorId);
      const data = await service.getSectorData();

      expect(data).toHaveProperty('stages');
      expect(data).toHaveProperty('employees');
      expect(data).toHaveProperty('metrics');
      expect(data.metadata.sectorId).toBe(sectorId);
    }
  });

  test('should create and load snapshots across sectors', async () => {
    const sectors = ['1c', 'pdm'];
    const createdSnapshots = [];

    // Создание слепков для разных секторов
    for (const sectorId of sectors) {
      const service = new UniversalGraphStateService(sectorId);
      const snapshot = await service.createSnapshot('test', {
        createdBy: { id: 1, name: 'Test User' }
      });

      expect(snapshot.meta.sectorId).toBe(sectorId);
      createdSnapshots.push(snapshot);
    }

    // Загрузка слепков
    for (const snapshot of createdSnapshots) {
      const service = new UniversalGraphStateService(snapshot.meta.sectorId);
      const loaded = await service._getSnapshotService().getSnapshotById(snapshot.id);

      expect(loaded.id).toBe(snapshot.id);
      expect(loaded.meta.sectorId).toBe(snapshot.meta.sectorId);
    }
  });
});
```

### 4. Миграция данных

**Миграционный скрипт:**
```javascript
// Migration script
class GraphStateMigration {
  static async migrate() {
    console.log('Starting Graph State migration...');

    try {
      // 1. Создание резервной копии
      await SnapshotMigrationManager.createBackup();

      // 2. Миграция слепков
      const migrationResult = await SnapshotMigrationManager.migrateExistingSnapshots();

      // 3. Валидация миграции
      await this.validateMigration(migrationResult);

      // 4. Очистка старых данных (опционально)
      await this.cleanupOldData();

      console.log('Graph State migration completed successfully');
      return true;

    } catch (error) {
      console.error('Graph State migration failed:', error);

      // Откат миграции
      await this.rollbackMigration();
      return false;
    }
  }

  static async validateMigration(result) {
    const { migratedCount, errorCount } = result;

    if (errorCount > 0) {
      console.warn(`Migration completed with ${errorCount} errors`);
    }

    // Проверка ключевых слепков
    const testSectors = ['1c'];
    for (const sectorId of testSectors) {
      const service = new UniversalGraphStateService(sectorId);
      const snapshots = await service.getSnapshotsForChart(['week_start', 'week_end']);

      if (snapshots.length === 0) {
        throw new Error(`No snapshots found for sector ${sectorId} after migration`);
      }

      console.log(`Validated ${snapshots.length} snapshots for sector ${sectorId}`);
    }
  }

  static async cleanupOldData() {
    // Очистка старых файлов кеша (опционально)
    console.log('Cleaning up old cache files...');
    // Реализация очистки
  }

  static async rollbackMigration() {
    console.log('Rolling back migration...');
    // Восстановление из резервной копии
    const backupId = await this.getLatestBackupId();
    await SnapshotMigrationManager.restoreFromBackup(backupId);
  }
}

// Запуск миграции
if (require.main === module) {
  GraphStateMigration.migrate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
```

---

## 🔗 Зависимости

- [ ] Все предыдущие TASK-091-02-* (01-05)
- [ ] TASK-091: Система секторов