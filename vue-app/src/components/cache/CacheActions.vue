<template>
  <div class="cache-actions">
    <div class="actions-header">
      <h3>⚡ Действия с кешем</h3>
    </div>
    
    <div class="actions-content">
      <div class="action-info">
        <p>
          Вы можете очистить весь кеш всех модулей одним действием.
          Это действие нельзя отменить.
        </p>
        <p class="warning-text">
          ⚠️ После очистки кеш будет автоматически пересоздан при следующем запросе к модулям.
        </p>
      </div>
      
      <div class="actions-buttons">
        <button
          @click="handleClearAll"
          :disabled="clearing || !hasCache"
          class="btn-clear-all"
          :class="{ 'btn-disabled': clearing || !hasCache }"
        >
          <span v-if="clearing">Очистка...</span>
          <span v-else>🗑️ Очистить весь кеш</span>
        </button>
        
        <button
          @click="handleRefresh"
          :disabled="refreshing"
          class="btn-refresh"
          :class="{ 'btn-disabled': refreshing }"
        >
          <span v-if="refreshing">Обновление...</span>
          <span v-else>🔄 Обновить статус</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';

export default {
  name: 'CacheActions',
  props: {
    modules: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  emits: ['clear-all', 'refresh'],
  setup(props, { emit }) {
    const clearing = ref(false);
    const refreshing = ref(false);
    
    const hasCache = computed(() => {
      return props.modules.some(module => (module.file_count || 0) > 0);
    });
    
    const handleClearAll = async () => {
      if (clearing.value || !hasCache.value) {
        return;
      }
      
      const totalFiles = props.modules.reduce((sum, module) => {
        return sum + (module.file_count || 0);
      }, 0);
      
      if (!confirm(
        `Вы уверены, что хотите очистить весь кеш?\n\n` +
        `Будет очищено ${totalFiles} файлов из ${props.modules.length} модулей.\n\n` +
        `Это действие нельзя отменить.`
      )) {
        return;
      }
      
      clearing.value = true;
      
      try {
        await CacheManagementService.clearCache('all');
        emit('clear-all');
        
        // Уведомление об успехе
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: 'Весь кеш успешно очищен',
            autoHideDelay: 3000
          });
        } else {
          alert('Весь кеш успешно очищен');
        }
      } catch (error) {
        console.error('[CacheActions] Error clearing all cache:', error);
        
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
    
    const handleRefresh = async () => {
      if (refreshing.value) {
        return;
      }
      
      refreshing.value = true;
      emit('refresh');
      
      // Сбрасываем состояние через небольшую задержку
      setTimeout(() => {
        refreshing.value = false;
      }, 1000);
    };
    
    return {
      clearing,
      refreshing,
      hasCache,
      handleClearAll,
      handleRefresh
    };
  }
};
</script>

<style scoped>
.cache-actions {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
}

.actions-header {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e0e0e0;
}

.actions-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.actions-content {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.action-info {
  color: #666;
  font-size: 14px;
  line-height: 1.6;
}

.action-info p {
  margin: 0 0 10px 0;
}

.warning-text {
  color: #856404;
  background-color: #fff3cd;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #ffc107;
}

.actions-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn-clear-all,
.btn-refresh {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.btn-clear-all {
  background-color: #dc3545;
  color: white;
}

.btn-clear-all:hover:not(.btn-disabled) {
  background-color: #c82333;
}

.btn-refresh {
  background-color: #007bff;
  color: white;
}

.btn-refresh:hover:not(.btn-disabled) {
  background-color: #0056b3;
}

.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .actions-buttons {
    flex-direction: column;
  }
  
  .btn-clear-all,
  .btn-refresh {
    width: 100%;
  }
}
</style>

