<template>
  <div class="cache-stats">
    <h2 class="stats-title">📊 Статистика кеша по категориям</h2>

    <div class="stats-overview">
      <div class="overview-grid">
        <div class="overview-card primary">
          <div class="overview-icon">🏆</div>
          <div class="overview-content">
            <div class="overview-value">{{ primaryModulesCount }}</div>
            <div class="overview-label">Основных модулей</div>
            <div class="overview-desc">Приоритетные</div>
          </div>
        </div>

        <div class="overview-card secondary">
          <div class="overview-icon">🔧</div>
          <div class="overview-content">
            <div class="overview-value">{{ secondaryModulesCount }}</div>
            <div class="overview-label">Побочных модулей</div>
            <div class="overview-desc">Служебные</div>
          </div>
        </div>

        <div class="overview-card total">
          <div class="overview-icon">📦</div>
          <div class="overview-content">
            <div class="overview-value">{{ totalModules }}</div>
            <div class="overview-label">Всего модулей</div>
            <div class="overview-desc">Активных</div>
          </div>
        </div>
      </div>
    </div>

    <div class="detailed-stats">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">📄</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalFiles }}</div>
            <div class="stat-label">Всего файлов</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">💾</div>
          <div class="stat-content">
            <div class="stat-value">{{ totalSizeFormatted }}</div>
            <div class="stat-label">Общий размер</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⏱️</div>
          <div class="stat-content">
            <div class="stat-value">{{ avgTTL }}</div>
            <div class="stat-label">Средний TTL</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-value">{{ activeModules }}</div>
            <div class="stat-label">Активных кешей</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Распределение по группам -->
    <div v-if="secondaryModulesCount > 0" class="group-distribution">
      <h3 class="distribution-title">Распределение побочных модулей</h3>
      <div class="distribution-grid">
        <div
          v-for="group in groupStats"
          :key="group.type"
          class="distribution-item"
        >
          <div class="group-icon">{{ group.icon }}</div>
          <div class="group-info">
            <div class="group-name">{{ group.title }}</div>
            <div class="group-count">{{ group.count }} модулей</div>
          </div>
          <div class="group-percentage">{{ group.percentage }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';
import { sortModuleGroups } from '@/utils/cache-helpers.js';

export default {
  name: 'CacheStats',
  props: {
    modules: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const primaryModules = computed(() => {
      return props.modules.filter(module =>
        CacheManagementService.PRIMARY_MODULE_IDS.includes(module.id)
      );
    });

    const secondaryModules = computed(() => {
      return props.modules.filter(module =>
        !CacheManagementService.PRIMARY_MODULE_IDS.includes(module.id)
      );
    });

    const primaryModulesCount = computed(() => primaryModules.value.length);
    const secondaryModulesCount = computed(() => secondaryModules.value.length);
    const totalModules = computed(() => props.modules.length);

    const totalFiles = computed(() => {
      return props.modules.reduce((sum, module) => {
        return sum + (module.file_count || 0);
      }, 0);
    });

    const totalSize = computed(() => {
      return props.modules.reduce((sum, module) => {
        return sum + (module.total_size || 0);
      }, 0);
    });

    const totalSizeFormatted = computed(() => {
      return CacheManagementService.formatCacheSize(totalSize.value);
    });

    const avgTTL = computed(() => {
      if (props.modules.length === 0) {
        return '0 мин';
      }

      const totalTTL = props.modules.reduce((sum, module) => {
        return sum + (module.ttl || 0);
      }, 0);

      const avg = Math.round(totalTTL / props.modules.length);
      return CacheManagementService.formatTTL(avg);
    });

    const activeModules = computed(() => {
      return props.modules.filter(module => module.status === 'active').length;
    });

    const groupStats = computed(() => {
      if (secondaryModulesCount.value === 0) return [];

      const groups = {};
      secondaryModules.value.forEach(module => {
        const type = CacheManagementService.getModuleType(module.id);
        if (!groups[type]) {
          const config = CacheManagementService.getModuleTypeConfig(type);
          groups[type] = {
            type,
            title: config.title || 'Неизвестная группа',
            icon: getGroupIcon(type),
            count: 0
          };
        }
        groups[type].count++;
      });

      const totalSecondary = secondaryModulesCount.value;
      return Object.values(groups)
        .map(group => ({
          ...group,
          percentage: Math.round((group.count / totalSecondary) * 100)
        }))
        .sort((a, b) => b.count - a.count);
    });

    const getGroupIcon = (type) => {
      const icons = {
        users: '👥',
        activity: '📊',
        webhooks: '🔗',
        other: '🔧'
      };
      return icons[type] || icons.other;
    };

    return {
      primaryModulesCount,
      secondaryModulesCount,
      totalModules,
      totalFiles,
      totalSizeFormatted,
      avgTTL,
      activeModules,
      groupStats
    };
  }
};
</script>

<style scoped>
.cache-stats {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.stats-title {
  margin: 0 0 25px 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.stats-overview {
  margin-bottom: 30px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.overview-card.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.overview-card.secondary {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
}

.overview-card.total {
  background: linear-gradient(135deg, #28a745, #1e7e34);
  color: white;
}

.overview-icon {
  font-size: 36px;
  line-height: 1;
}

.overview-content {
  flex: 1;
}

.overview-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}

.overview-desc {
  font-size: 12px;
  opacity: 0.8;
}

.detailed-stats {
  margin-bottom: 30px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-1px);
}

.stat-icon {
  font-size: 28px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
  margin-bottom: 2px;
}

.stat-label {
  font-size: 11px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.group-distribution {
  border-top: 1px solid #e0e0e0;
  padding-top: 25px;
}

.distribution-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
}

.distribution-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.group-icon {
  font-size: 24px;
  line-height: 1;
}

.group-info {
  flex: 1;
}

.group-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 2px;
}

.group-count {
  font-size: 12px;
  color: #666;
}

.group-percentage {
  font-size: 16px;
  font-weight: 700;
  color: #007bff;
}

@media (max-width: 768px) {
  .cache-stats {
    padding: 20px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card {
    flex-direction: column;
    text-align: center;
  }

  .distribution-grid {
    grid-template-columns: 1fr;
  }

  .distribution-item {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .overview-value {
    font-size: 24px;
  }

  .stat-value {
    font-size: 18px;
  }
}
</style>

