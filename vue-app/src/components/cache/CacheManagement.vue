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
    <section v-if="!loading && !error" class="cache-section primary-modules" :class="{ 'empty': (primaryModules || []).length === 0 }" aria-labelledby="primary-modules-heading">
      <div class="section-header">
        <h2 id="primary-modules-heading">🏆 Основные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count" aria-label="{{ logicalPrimaryCount }} основных модулей">{{ logicalPrimaryCount }}</span>
          <span class="section-badge primary" role="status" aria-label="Приоритетные модули">Приоритет</span>
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

        <!-- Отдельные основные модули с новой визуальной иерархией -->
        <div class="modules-grid" v-if="individualPrimaryModules.length > 0">
          <div v-for="module in individualPrimaryModules" :key="module.id" class="module-wrapper">
            <CacheModuleCard
              :module="module"
              :is-primary="true"
              :priority="module.priority"
              @clear="handleModuleClear"
              @refresh="refreshModules"
            />
          </div>
        </div>

        <!-- Группа трудозатрат с новой визуальной иерархией -->
        <div v-if="(timeTrackingModules || []).length > 0" class="time-tracking-group">
          <div class="group-header">
            <h3 class="group-title">⏱️ Трудозатраты на тикеты сектора 1С</h3>
            <span class="group-badge">Основная группа</span>
          </div>
          <p class="group-description">Анализ времени работы с задачами в разных режимах отображения</p>
          <div class="modules-grid">
            <div v-for="module in timeTrackingModules" :key="module.id" class="module-wrapper">
              <CacheModuleCard
                :module="module"
                :is-primary="true"
                :priority="module.priority"
                @clear="handleModuleClear"
                @refresh="refreshModules"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>⚠️ Основные модули кеша не найдены</p>
        <button @click="refreshModules" class="refresh-btn">Обновить список</button>
      </div>
    </section>

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
    <section v-if="!loading && !error && (secondaryModules || []).length > 0" class="cache-section secondary-modules" aria-labelledby="secondary-modules-heading">
      <div class="section-header">
        <h2 id="secondary-modules-heading">🔧 Побочные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count" aria-label="{{ (secondaryModules || []).length }} второстепенных модулей">{{ (secondaryModules || []).length }}</span>
          <span class="section-badge secondary" role="status" aria-label="Служебные модули">Служебные</span>
        </div>
      </div>
      <p class="section-description">
        Модули для администрирования и детального мониторинга системы.
      </p>

      <!-- Группировка по типам с улучшенной визуализацией -->
      <div class="grouped-modules">
        <div
          v-for="group in groupedSecondaryModules"
          :key="group.type"
          class="module-group"
          :class="`group-${group.type}`"
        >
          <div class="group-header">
            <h3 class="group-title">{{ group.title }}</h3>
            <span class="group-badge secondary">{{ group.modules.length }}</span>
          </div>
          <div class="modules-grid">
            <div v-for="module in group.modules" :key="module.id" class="module-wrapper">
              <CacheModuleCard
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
    </section>

    <!-- Сообщение об ошибке -->
    <div v-if="error" class="error-message" role="alert" aria-live="assertive">
      <h3>❌ Ошибка загрузки модулей кеша</h3>
      <p>{{ error }}</p>
      <button @click="loadModules" class="retry-btn" aria-label="Повторить загрузку модулей кеша">Повторить попытку</button>
    </div>

    <!-- Общий статус загрузки -->
    <div v-if="loading" class="loading-overlay" role="status" aria-live="polite" aria-label="Загрузка модулей кеша">
      <div class="loading-spinner" aria-hidden="true"></div>
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
        // Временно используем mock данные для тестирования UI с расширенными метаданными
        const mockModules = [
          // Основные модули (5 логических) с полными метаданными
          {
            id: 'dashboard-sector-1c',
            name: 'Дашборд сектора 1С',
            status: 'active',
            file_count: 5,
            total_size: 1024000,
            ttl: 600,
            created_at: Math.floor(Date.now() / 1000) - 7200, // 2 часа назад
            expires_at: Math.floor(Date.now() / 1000) + 1800, // через 30 мин
            cache_dir: '/var/cache/dashboard/sector-1c',
            metadata: {
              version: '1.0',
              module_id: 'dashboard-sector-1c',
              module_name: 'Дашборд сектора 1С',
              created_at: Math.floor(Date.now() / 1000) - 7200,
              created_by: 'system',
              creation_time_ms: 1250,
              last_accessed_at: Math.floor(Date.now() / 1000) - 300,
              access_count: 45,
              expires_at: Math.floor(Date.now() / 1000) + 1800,
              ttl_seconds: 600,
              file_size_bytes: 1024000,
              compression_ratio: 0.75,
              data_version: '2026.01.12.v1',
              source_params: {
                period: 'weeks',
                sector_id: '1c',
                filters: ['active_only'],
                limit: 1000
              },
              performance_metrics: {
                avg_response_time_ms: 45,
                cache_hit_ratio: 0.92,
                data_freshness_score: 0.95
              }
            }
          },
          {
            id: 'graph-state',
            name: 'График состояния',
            status: 'active',
            file_count: 3,
            total_size: 512000,
            ttl: 3600,
            created_at: Math.floor(Date.now() / 1000) - 10800, // 3 часа назад
            expires_at: Math.floor(Date.now() / 1000) + 7200, // через 2 часа
            cache_dir: '/var/cache/graphs/state',
            metadata: {
              version: '1.0',
              module_id: 'graph-state',
              module_name: 'График состояния',
              created_at: Math.floor(Date.now() / 1000) - 10800,
              created_by: 'cron',
              creation_time_ms: 890,
              last_accessed_at: Math.floor(Date.now() / 1000) - 600,
              access_count: 23,
              expires_at: Math.floor(Date.now() / 1000) + 7200,
              ttl_seconds: 3600,
              file_size_bytes: 512000,
              compression_ratio: 0.82,
              data_version: '2026.01.12.v2',
              source_params: {
                period: 'months',
                sector_id: 'all',
                filters: [],
                limit: 500
              },
              performance_metrics: {
                avg_response_time_ms: 32,
                cache_hit_ratio: 0.88,
                data_freshness_score: 0.91
              }
            }
          },
          {
            id: 'graph-admission-closure-weeks',
            name: 'График приёма/закрытий 1С (4 недели)',
            status: 'active',
            file_count: 8,
            total_size: 2048000,
            ttl: 300,
            created_at: Math.floor(Date.now() / 1000) - 1800, // 30 мин назад
            expires_at: Math.floor(Date.now() / 1000) + 120, // через 2 мин
            cache_dir: '/var/cache/graphs/admission-closure/weeks',
            metadata: {
              version: '1.0',
              module_id: 'graph-admission-closure-weeks',
              module_name: 'График приёма/закрытий 1С (4 недели)',
              created_at: Math.floor(Date.now() / 1000) - 1800,
              created_by: 'system',
              creation_time_ms: 2100,
              last_accessed_at: Math.floor(Date.now() / 1000) - 60,
              access_count: 67,
              expires_at: Math.floor(Date.now() / 1000) + 120,
              ttl_seconds: 300,
              file_size_bytes: 2048000,
              compression_ratio: 0.68,
              data_version: '2026.01.12.v1',
              source_params: {
                period: 'weeks',
                sector_id: '1c',
                filters: ['active_only', 'resolved_only'],
                limit: 2000
              },
              performance_metrics: {
                avg_response_time_ms: 78,
                cache_hit_ratio: 0.95,
                data_freshness_score: 0.98
              }
            }
          },
          {
            id: 'graph-admission-closure-months',
            name: 'График приёма/закрытий 1С (3 месяца)',
            status: 'active',
            file_count: 12,
            total_size: 3072000,
            ttl: 300,
            created_at: Math.floor(Date.now() / 1000) - 3600, // 1 час назад
            expires_at: Math.floor(Date.now() / 1000) + 240, // через 4 мин
            cache_dir: '/var/cache/graphs/admission-closure/months',
            metadata: {
              version: '1.0',
              module_id: 'graph-admission-closure-months',
              module_name: 'График приёма/закрытий 1С (3 месяца)',
              created_at: Math.floor(Date.now() / 1000) - 3600,
              created_by: 'cron',
              creation_time_ms: 3400,
              last_accessed_at: Math.floor(Date.now() / 1000) - 120,
              access_count: 34,
              expires_at: Math.floor(Date.now() / 1000) + 240,
              ttl_seconds: 300,
              file_size_bytes: 3072000,
              compression_ratio: 0.71,
              data_version: '2026.01.12.v3',
              source_params: {
                period: 'months',
                sector_id: '1c',
                filters: ['active_only'],
                limit: 3000
              },
              performance_metrics: {
                avg_response_time_ms: 92,
                cache_hit_ratio: 0.89,
                data_freshness_score: 0.93
              }
            }
          },
          // Трудозатраты на тикеты сектора 1С (3 режима - одна логическая группа)
          {
            id: 'time-tracking-default',
            name: 'Трудозатраты (режим по умолчанию)',
            status: 'active',
            file_count: 4,
            total_size: 768000,
            ttl: 300,
            created_at: Math.floor(Date.now() / 1000) - 900, // 15 мин назад
            expires_at: Math.floor(Date.now() / 1000) + 2100, // через 35 мин
            cache_dir: '/var/cache/time-tracking/default',
            metadata: {
              version: '1.0',
              module_id: 'time-tracking-default',
              module_name: 'Трудозатраты (режим по умолчанию)',
              created_at: Math.floor(Date.now() / 1000) - 900,
              created_by: 'system',
              creation_time_ms: 560,
              last_accessed_at: Math.floor(Date.now() / 1000) - 180,
              access_count: 12,
              expires_at: Math.floor(Date.now() / 1000) + 2100,
              ttl_seconds: 300,
              file_size_bytes: 768000,
              compression_ratio: 0.79,
              data_version: '2026.01.12.v2',
              source_params: {
                period: 'weeks',
                sector_id: '1c',
                filters: ['active_only'],
                limit: 800
              },
              performance_metrics: {
                avg_response_time_ms: 28,
                cache_hit_ratio: 0.96,
                data_freshness_score: 0.97
              }
            }
          },
          {
            id: 'time-tracking-detailed',
            name: 'Трудозатраты (детальный режим)',
            status: 'active',
            file_count: 6,
            total_size: 1536000,
            ttl: 120,
            created_at: Math.floor(Date.now() / 1000) - 600, // 10 мин назад
            expires_at: Math.floor(Date.now() / 1000) + 3540, // через 59 мин
            cache_dir: '/var/cache/time-tracking/detailed',
            metadata: {
              version: '1.0',
              module_id: 'time-tracking-detailed',
              module_name: 'Трудозатраты (детальный режим)',
              created_at: Math.floor(Date.now() / 1000) - 600,
              created_by: 'user',
              creation_time_ms: 890,
              last_accessed_at: Math.floor(Date.now() / 1000) - 90,
              access_count: 8,
              expires_at: Math.floor(Date.now() / 1000) + 3540,
              ttl_seconds: 120,
              file_size_bytes: 1536000,
              compression_ratio: 0.74,
              data_version: '2026.01.12.v1',
              source_params: {
                period: 'weeks',
                sector_id: '1c',
                filters: ['active_only', 'detailed_view'],
                limit: 1500
              },
              performance_metrics: {
                avg_response_time_ms: 45,
                cache_hit_ratio: 0.91,
                data_freshness_score: 0.94
              }
            }
          },
          {
            id: 'time-tracking-summary',
            name: 'Трудозатраты (сводный режим)',
            status: 'active',
            file_count: 2,
            total_size: 384000,
            ttl: 600,
            created_at: Math.floor(Date.now() / 1000) - 1800, // 30 мин назад
            expires_at: Math.floor(Date.now() / 1000) + 4200, // через 70 мин
            cache_dir: '/var/cache/time-tracking/summary',
            metadata: {
              version: '1.0',
              module_id: 'time-tracking-summary',
              module_name: 'Трудозатраты (сводный режим)',
              created_at: Math.floor(Date.now() / 1000) - 1800,
              created_by: 'cron',
              creation_time_ms: 340,
              last_accessed_at: Math.floor(Date.now() / 1000) - 240,
              access_count: 19,
              expires_at: Math.floor(Date.now() / 1000) + 4200,
              ttl_seconds: 600,
              file_size_bytes: 384000,
              compression_ratio: 0.85,
              data_version: '2026.01.12.v3',
              source_params: {
                period: 'months',
                sector_id: '1c',
                filters: ['summary_view'],
                limit: 300
              },
              performance_metrics: {
                avg_response_time_ms: 18,
                cache_hit_ratio: 0.98,
                data_freshness_score: 0.99
              }
            }
          },
          // Побочные модули с базовыми метаданными
          {
            id: 'users-management-departments',
            name: 'Управление пользователями (отделы)',
            status: 'active',
            file_count: 2,
            total_size: 256000,
            ttl: 3600,
            created_at: Math.floor(Date.now() / 1000) - 7200, // 2 часа назад
            expires_at: Math.floor(Date.now() / 1000) + 28800, // через 8 часов
            cache_dir: '/var/cache/users/departments'
          },
          {
            id: 'webhook-logs-api',
            name: 'Логи вебхуков (API запросы)',
            status: 'active',
            file_count: 15,
            total_size: 5120000,
            ttl: 300,
            created_at: Math.floor(Date.now() / 1000) - 3600, // 1 час назад
            expires_at: Math.floor(Date.now() / 1000) + 2400, // через 40 мин
            cache_dir: '/var/cache/webhooks/api'
          }
        ];

        // Обогащаем модули метаданными
        const enrichedModules = CacheManagementService.enrichModulesWithMetadata(mockModules);
        const categorized = CacheManagementService.categorizeAndSortModules(enrichedModules);

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
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.module-wrapper {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-wrapper:hover {
  transform: translateY(-4px);
}

.time-tracking-group {
  border: 3px solid #007bff;
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.15);
  position: relative;
}

.time-tracking-group::before {
  content: '🏆';
  position: absolute;
  top: -12px;
  left: 20px;
  background: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #007bff;
  font-size: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-left: 40px; /* Учитываем иконку */
}

.group-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #007bff;
  text-shadow: 0 1px 2px rgba(0, 123, 255, 0.2);
}

.group-description {
  margin: 0 0 20px 40px;
  font-size: 15px;
  color: #666;
  font-style: italic;
  line-height: 1.5;
}

.group-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-badge.secondary {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
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

/* Анимации для карточек */
.modules-container .module-wrapper {
  animation: slideInUp 0.6s ease-out both;
}

.modules-container .module-wrapper:nth-child(1) { animation-delay: 0.1s; }
.modules-container .module-wrapper:nth-child(2) { animation-delay: 0.2s; }
.modules-container .module-wrapper:nth-child(3) { animation-delay: 0.3s; }
.modules-container .module-wrapper:nth-child(4) { animation-delay: 0.4s; }
.modules-container .module-wrapper:nth-child(5) { animation-delay: 0.5s; }
.modules-container .module-wrapper:nth-child(6) { animation-delay: 0.6s; }
.modules-container .module-wrapper:nth-child(7) { animation-delay: 0.7s; }
.modules-container .module-wrapper:nth-child(8) { animation-delay: 0.8s; }

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Анимации для групповых модулей */
.module-group {
  animation: fadeInScale 0.5s ease-out both;
}

.module-group:nth-child(1) { animation-delay: 0.1s; }
.module-group:nth-child(2) { animation-delay: 0.2s; }
.module-group:nth-child(3) { animation-delay: 0.3s; }

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Пульсирующая анимация для предупреждений */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.02);
    opacity: 0.9;
  }
}

.expiring-soon {
  animation: pulse 2s infinite;
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
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.module-group:hover {
  border-color: #adb5bd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-group:last-child {
  margin-bottom: 0;
}

.group-users {
  border-color: #17a2b8;
  background: linear-gradient(135deg, #f8ffff 0%, #f8f9fa 100%);
}

.group-activity {
  border-color: #ffc107;
  background: linear-gradient(135deg, #fffef8 0%, #f8f9fa 100%);
}

.group-webhooks {
  border-color: #6f42c1;
  background: linear-gradient(135deg, #fbf8ff 0%, #f8f9fa 100%);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.group-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-users .group-title::before { content: '👥'; }
.group-activity .group-title::before { content: '📊'; }
.group-webhooks .group-title::before { content: '🔗'; }
.group-other .group-title::before { content: '🔧'; }

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