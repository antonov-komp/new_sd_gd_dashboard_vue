<template>
  <div class="cache-module-card">
    <div class="card-header">
      <h3 class="module-name">{{ module.name }}</h3>
      <span class="module-status" :class="statusClass">
        {{ statusText }}
      </span>
    </div>
    
    <div class="card-body">
      <div class="cache-info">
        <div class="info-row">
          <span class="info-label">Файлов:</span>
          <span class="info-value">{{ module.file_count || 0 }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">Размер:</span>
          <span class="info-value">{{ formattedSize }}</span>
        </div>
        
        <div class="info-row">
          <span class="info-label">TTL:</span>
          <span class="info-value">{{ formattedTTL }}</span>
        </div>
        
        <div v-if="module.cache_dir" class="info-row">
          <span class="info-label">Директория:</span>
          <span class="info-value cache-dir">{{ module.cache_dir }}</span>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <button
        @click="handleClear"
        :disabled="clearing || module.file_count === 0"
        class="btn-clear"
        :class="{ 'btn-disabled': clearing || module.file_count === 0 }"
      >
        <span v-if="clearing">Очистка...</span>
        <span v-else>🗑️ Очистить кеш</span>
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';

export default {
  name: 'CacheModuleCard',
  props: {
    module: {
      type: Object,
      required: true,
      validator: (value) => {
        return value && typeof value.id === 'string' && typeof value.name === 'string';
      }
    }
  },
  emits: ['clear'],
  setup(props, { emit }) {
    const clearing = ref(false);
    
    const formattedSize = computed(() => {
      return CacheManagementService.formatCacheSize(props.module.total_size || 0);
    });
    
    const formattedTTL = computed(() => {
      return CacheManagementService.formatTTL(props.module.ttl || 0);
    });
    
    const statusClass = computed(() => {
      if (props.module.file_count > 0) {
        return 'status-active';
      }
      return 'status-empty';
    });
    
    const statusText = computed(() => {
      if (props.module.file_count > 0) {
        return 'Активен';
      }
      return 'Пуст';
    });
    
    const handleClear = async () => {
      if (clearing.value || props.module.file_count === 0) {
        return;
      }
      
      if (!confirm(`Вы уверены, что хотите очистить кеш модуля "${props.module.name}"?`)) {
        return;
      }
      
      clearing.value = true;
      
      try {
        await CacheManagementService.clearCache(props.module.id);
        emit('clear', props.module.id);
        
        // Уведомление об успехе
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: `Кеш модуля "${props.module.name}" успешно очищен`,
            autoHideDelay: 3000
          });
        }
      } catch (error) {
        console.error('[CacheModuleCard] Error clearing cache:', error);
        
        // Уведомление об ошибке
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: `Ошибка очистки кеша: ${error.message}`,
            autoHideDelay: 5000
          });
        } else {
          alert(`Ошибка очистки кеша: ${error.message}`);
        }
      } finally {
        clearing.value = false;
      }
    };
    
    return {
      clearing,
      formattedSize,
      formattedTTL,
      statusClass,
      statusText,
      handleClear
    };
  }
};
</script>

<style scoped>
.cache-module-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.cache-module-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.module-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.module-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background-color: #d4edda;
  color: #155724;
}

.status-empty {
  background-color: #f8d7da;
  color: #721c24;
}

.card-body {
  margin-bottom: 15px;
}

.cache-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-weight: 500;
  color: #666;
}

.info-value {
  color: #333;
  font-weight: 600;
}

.cache-dir {
  font-size: 12px;
  font-family: monospace;
  color: #999;
  word-break: break-all;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.btn-clear {
  padding: 8px 16px;
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn-clear:hover:not(.btn-disabled) {
  background-color: #c82333;
}

.btn-clear.btn-disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

@media (max-width: 768px) {
  .cache-module-card {
    padding: 15px;
  }
  
  .module-name {
    font-size: 16px;
  }
  
  .info-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>

