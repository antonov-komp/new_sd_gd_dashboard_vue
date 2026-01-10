<template>
  <div class="cache-management">
    <!-- Заголовок с описанием -->
    <div v-if="!loading && !error" class="header-section">
      <h1>🗑️ Ручное управление кешем</h1>
      <p class="description">
        Управление кешем системы сгруппировано по важности для удобства администрирования
      </p>
      <div class="stats-bar">
        <span class="stat-item">
          <strong>{{ totalModules }}</strong> всего модулей
        </span>
        <span class="stat-item">
          <strong>{{ logicalPrimaryCount }}</strong> основных
        </span>
        <span class="stat-item">
          <strong>{{ (secondaryModules || []).length }}</strong> дополнительных
        </span>
      </div>
    </div>

    <!-- Детальная статистика кеша (временно отключена для отладки) -->
    <!-- <CacheStats v-if="totalModules > 0" :modules="(primaryModules || []).concat(secondaryModules || [])" /> -->

    <!-- Основные модули с расширенной информацией -->
    <div v-if="!loading && !error" class="cache-section primary-modules" :class="{ 'empty': (primaryModules || []).length === 0 }">
      <div class="section-header">
        <h2>🏆 Основные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count">{{ logicalPrimaryCount }}</span>
          <span class="section-badge primary">Приоритет</span>
        </div>
      </div>
      <p class="section-description">
        5 основных модулей для оперативного анализа и мониторинга системы: дашборд сектора 1С, график состояния, графики приема-закрытия и трудозатраты на тикеты сектора 1С.
      </p>

      <div v-if="(primaryModules || []).length > 0" class="modules-container">
        <!-- Debug info -->
        <div style="background: #f0f8ff; padding: 10px; margin: 10px 0; border: 1px solid #007bff; border-radius: 4px;">
          <strong>DEBUG: Primary modules loaded: {{ primaryModules.length }}</strong><br>
          <strong>Individual modules: {{ individualPrimaryModules.length }}</strong><br>
          <strong>Time tracking modules: {{ timeTrackingModules.length }}</strong><br>
          <strong>IDs:</strong> {{ primaryModules.map(m => m.id).join(', ') }}
        </div>

        <!-- Отдельные основные модули -->
        <div class="modules-grid" v-if="individualPrimaryModules.length > 0">
          <h4>Индивидуальные основные модули ({{ individualPrimaryModules.length }})</h4>
          <div v-for="module in individualPrimaryModules" :key="module.id" style="border: 2px solid #007bff; margin: 5px; padding: 10px;">
            <strong>{{ module.name }}</strong> ({{ module.id }}) - Priority: {{ module.priority }}
            <button @click="handleCreateMock(module)" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
              ➕ Создать кеш ({{ module.name }})
            </button>
            <button @click="handleClearMock(module)" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
              🗑️ Очистить кеш ({{ module.name }})
            </button>
          </div>
        </div>

        <!-- Группа трудозатрат -->
        <div v-if="(timeTrackingModules || []).length > 0" class="time-tracking-group">
          <h3 class="group-title">⏱️ Трудозатраты на тикеты сектора 1С</h3>
          <p class="group-description">Анализ времени работы с задачами в разных режимах отображения</p>
          <div class="modules-grid">
            <h4>Модули трудозатрат ({{ timeTrackingModules.length }})</h4>
            <div v-for="module in timeTrackingModules" :key="module.id" style="border: 2px solid #28a745; margin: 5px; padding: 10px;">
              <strong>{{ module.name }}</strong> ({{ module.id }}) - Priority: {{ module.priority }}
              <button @click="handleCreateMock(module)" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                ➕ Создать кеш ({{ module.name }})
              </button>
              <button @click="handleClearMock(module)" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-left: 10px;">
                🗑️ Очистить кеш ({{ module.name }})
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>⚠️ Основные модули кеша не найдены</p>
        <button @click="refreshModules" class="refresh-btn">Обновить список</button>
      </div>
    </div>

    <!-- Стильный разделитель с анимацией -->
    <div v-if="!loading && !error && (secondaryModules || []).length > 0" class="section-divider">
      <div class="divider-line"></div>
      <div class="divider-content">
        <span class="divider-icon">🔧</span>
        <span class="divider-text">Дополнительные модули</span>
        <span class="divider-subtitle">Вспомогательные функции системы</span>
      </div>
      <div class="divider-line"></div>
    </div>

    <!-- Побочные модули с группировкой -->
    <div v-if="!loading && !error && (secondaryModules || []).length > 0" class="cache-section secondary-modules">
      <div class="section-header">
        <h2>🔧 Побочные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count">{{ (secondaryModules || []).length }}</span>
          <span class="section-badge secondary">Служебные</span>
        </div>
      </div>
      <p class="section-description">
        Модули для администрирования и детального мониторинга системы.
      </p>

      <!-- Группировка по типам -->
      <div class="grouped-modules">
        <div
          v-for="group in groupedSecondaryModules"
          :key="group.type"
          class="module-group"
        >
          <h3 class="group-title">{{ group.title }}</h3>
          <div class="modules-grid">
            <CacheModuleCard
              v-for="module in group.modules"
              :key="module.id"
              :module="module"
              :is-primary="false"
              :group-type="group.type"
              @clear="handleModuleClear"
              @refresh="refreshModules"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщение об ошибке -->
    <div v-if="error" class="error-message">
      <h3>❌ Ошибка загрузки модулей кеша</h3>
      <p>{{ error }}</p>
      <button @click="loadModules" class="retry-btn">Повторить попытку</button>
    </div>

    <!-- Общий статус загрузки -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>Загрузка модулей кеша...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';
import { getApiUrl } from '@/utils/path-utils.js';
import { sortModuleGroups } from '@/utils/cache-helpers.js';
import CacheModuleCard from './CacheModuleCard.vue';
import CacheStats from './CacheStats.vue';

export default {
  name: 'CacheManagement',
  components: { CacheModuleCard, CacheStats },
  setup() {
    // Реактивные данные
    const primaryModules = ref([]);
    const secondaryModules = ref([]);
    const loading = ref(true); // Начинаем с loading = true
    const error = ref(null);

    // Вычисляемые свойства
    const totalModules = computed(() =>
      (primaryModules.value?.length || 0) + (secondaryModules.value?.length || 0)
    );

    // Логическое количество основных модулей (5: дашборд, график состояния, 2 графика приема-закрытия, трудозатраты)
    const logicalPrimaryCount = computed(() => {
      const individualCount = individualPrimaryModules.value?.length || 0;
      const timeTrackingCount = (timeTrackingModules.value?.length || 0) > 0 ? 1 : 0;
      return individualCount + timeTrackingCount;
    });

    // Разделяем основные модули на индивидуальные и группу трудозатрат
    const individualPrimaryModules = computed(() => {
      const result = (primaryModules.value || []).filter(module =>
        !module.id.includes('time-tracking')
      );
      console.log('[CacheManagement] individualPrimaryModules:', result.length, result.map(m => m.id));
      return result;
    });

    const timeTrackingModules = computed(() => {
      const result = (primaryModules.value || []).filter(module =>
        module.id.includes('time-tracking')
      ).sort((a, b) => {
        // Сортировка внутри группы трудозатрат
        const order = ['time-tracking-default', 'time-tracking-detailed', 'time-tracking-summary'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
      console.log('[CacheManagement] timeTrackingModules:', result.length, result.map(m => m.id));
      return result;
    });

    const groupedSecondaryModules = computed(() => {
      const groups = {};
      (secondaryModules.value || []).forEach(module => {
        const type = CacheManagementService.getModuleType(module.id);
        if (!groups[type]) {
          groups[type] = {
            type,
            title: getGroupTitle(type),
            modules: []
          };
        }
        groups[type].modules.push(module);
      });

      // Сортируем группы по приоритету
      const sortedGroups = Object.values(groups).sort((a, b) => {
        const typeOrder = ['users', 'activity', 'webhooks', 'other'];
        const aIndex = typeOrder.indexOf(a.type);
        const bIndex = typeOrder.indexOf(b.type);

        const aFinalIndex = aIndex === -1 ? 999 : aIndex;
        const bFinalIndex = bIndex === -1 ? 999 : bIndex;

        return aFinalIndex - bFinalIndex;
      });

      return sortedGroups;
    });

    // Методы
    const loadModules = async () => {
      loading.value = true;
      error.value = null;

      try {
        // Временно используем mock данные для тестирования UI
        const mockModules = [
          // Основные модули (5 логических)
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
            id: 'graph-admission-closure-months',
            name: 'График приёма/закрытий 1С (3 месяца)',
            status: 'active',
            file_count: 12,
            total_size: 3072000,
            ttl: 300
          },
          // Трудозатраты на тикеты сектора 1С (3 режима - одна логическая группа)
          {
            id: 'time-tracking-default',
            name: 'Трудозатраты (режим по умолчанию)',
            status: 'active',
            file_count: 4,
            total_size: 768000,
            ttl: 300
          },
          {
            id: 'time-tracking-detailed',
            name: 'Трудозатраты (детальный режим)',
            status: 'active',
            file_count: 6,
            total_size: 1536000,
            ttl: 120
          },
          {
            id: 'time-tracking-summary',
            name: 'Трудозатраты (сводный режим)',
            status: 'active',
            file_count: 2,
            total_size: 384000,
            ttl: 600
          },
          // Побочные модули
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

        const categorized = CacheManagementService.categorizeAndSortModules(mockModules);

        primaryModules.value = categorized.primaryModules || [];
        secondaryModules.value = categorized.secondaryModules || [];

        console.log('[CacheManagement] Primary modules:', primaryModules.value.length, primaryModules.value.map(m => ({id: m.id, name: m.name})));
        console.log('[CacheManagement] Secondary modules:', secondaryModules.value.length, secondaryModules.value.map(m => ({id: m.id, name: m.name})));
      } catch (err) {
        console.error('[CacheManagement] Error loading modules:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };


    const getGroupTitle = (type) => {
      const titles = {
        users: '👥 Управление пользователями',
        activity: '📊 Отслеживание активности',
        webhooks: '🔗 Логи вебхуков',
        other: '🔧 Прочие модули'
      };
      return titles[type] || titles.other;
    };

    const handleModuleClear = async (moduleId) => {
      // Логика очистки модуля с подтверждением
      console.log(`[CacheManagement] Clearing module: ${moduleId}`);
      await loadModules(); // Перезагрузка после очистки
    };

    const handleCreateMock = async (module) => {
      console.log(`[CacheManagement] Creating cache for: ${module.name} (${module.id})`);
      alert(`Создание кеша для модуля: ${module.name}\nID: ${module.id}\nЭто mock функция для тестирования интерфейса.`);
    };

    const handleClearMock = async (module) => {
      console.log(`[CacheManagement] Clearing cache for: ${module.name} (${module.id})`);
      alert(`Очистка кеша для модуля: ${module.name}\nID: ${module.id}\nЭто mock функция для тестирования интерфейса.`);
    };

    const refreshModules = () => {
      loadModules();
    };

    // Инициализация
    onMounted(() => {
      loadModules();
    });

    return {
      primaryModules,
      secondaryModules,
      loading,
      error,
      totalModules,
      groupedSecondaryModules,
      individualPrimaryModules,
      timeTrackingModules,
      logicalPrimaryCount,
      handleModuleClear,
      handleCreateMock,
      handleClearMock,
      refreshModules
    };
  }
};
</script>

<style scoped>
.cache-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header-section {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-section h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.description {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #555;
}

.cache-section {
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cache-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.primary-modules {
  border: 3px solid #007bff;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.secondary-modules {
  border: 2px solid #dee2e6;
  background: #f8f9fa;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.section-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.section-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-count {
  font-size: 18px;
  font-weight: bold;
  color: #555;
}

.section-badge {
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-badge.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.section-badge.secondary {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
}

.section-description {
  padding: 0 25px 20px;
  margin: 0;
  font-size: 15px;
  color: #666;
  line-height: 1.5;
}

.modules-container {
  padding: 25px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.time-tracking-group {
  border: 2px solid #007bff;
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(135deg, #f0f8ff 0%, #ffffff 100%);
  margin-bottom: 20px;
}

.group-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #007bff;
}

.group-description {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 40px 0;
  opacity: 0;
  animation: fadeInDivider 1s ease-out 0.5s forwards;
}

@keyframes fadeInDivider {
  to {
    opacity: 1;
  }
}

.divider-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, #dee2e6, transparent);
}

.divider-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 30px;
  text-align: center;
}

.divider-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.divider-text {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
}

.divider-subtitle {
  font-size: 14px;
  color: #6c757d;
}

.grouped-modules {
  padding: 25px;
}

.module-group {
  margin-bottom: 30px;
}

.module-group:last-child {
  margin-bottom: 0;
}

.group-title {
  margin: 0 0 15px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding-left: 10px;
  border-left: 4px solid #dee2e6;
}

.empty-state {
  text-align: center;
  padding: 40px 25px;
  color: #666;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 20px;
}

.refresh-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.refresh-btn:hover {
  background: #0056b3;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .cache-management {
    padding: 15px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
  }

  .header-section h1 {
    font-size: 24px;
  }

  .stats-bar {
    gap: 15px;
  }

  .stat-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .section-header {
    padding: 15px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .section-header h2 {
    font-size: 20px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 20px;
  }

  .section-divider {
    flex-direction: column;
    gap: 15px;
    margin: 30px 0;
  }

  .divider-line {
    width: 100%;
    height: 1px;
  }

  .divider-content {
    padding: 0;
  }
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: #721c24;
}

.error-message h3 {
  margin: 0 0 10px 0;
  color: #721c24;
}

.error-message p {
  margin: 0 0 15px 0;
}

.retry-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #c82333;
}

@media (max-width: 480px) {
  .header-section h1 {
    font-size: 20px;
  }

  .description {
    font-size: 14px;
  }

  .section-header h2 {
    font-size: 18px;
  }

  .modules-grid {
    padding: 15px;
  }
}
</style>