<template>
  <div class="cache-stats">
    <h2 class="stats-title">📊 Общая статистика кеша</h2>
    
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-value">{{ totalModules }}</div>
          <div class="stat-label">Модулей с кешем</div>
        </div>
      </div>
      
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
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';

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
    const totalModules = computed(() => {
      return props.modules.length;
    });
    
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
    
    return {
      totalModules,
      totalFiles,
      totalSizeFormatted,
      avgTTL
    };
  }
};
</script>

<style scoped>
.cache-stats {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.stats-title {
  margin: 0 0 20px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
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
  border-radius: 6px;
  border: 1px solid #e0e0e0;
}

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card {
    flex-direction: column;
    text-align: center;
  }
}
</style>

