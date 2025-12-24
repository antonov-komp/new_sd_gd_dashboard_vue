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
          <span class="info-label">Статус:</span>
          <span class="info-value" :class="statusValueClass">
            {{ statusText }}
          </span>
        </div>
        
        <div v-if="module.created_at" class="info-row">
          <span class="info-label">Создан:</span>
          <span class="info-value">{{ formattedCreatedAt }}</span>
        </div>
        
        <div v-if="module.expires_at" class="info-row">
          <span class="info-label">Истекает:</span>
          <span class="info-value">{{ formattedExpiresAt }}</span>
        </div>
        
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
      <CacheCreateButton
        :module="module"
        @created="handleCacheCreated"
      />
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
import CacheCreateButton from './CacheCreateButton.vue';

export default {
  name: 'CacheModuleCard',
  components: {
    CacheCreateButton
  },
  props: {
    module: {
      type: Object,
      required: true,
      validator: (value) => {
        return value && typeof value.id === 'string' && typeof value.name === 'string';
      }
    }
  },
  emits: ['clear', 'refresh'],
  setup(props, { emit }) {
    const clearing = ref(false);
    
    const formattedSize = computed(() => {
      return CacheManagementService.formatCacheSize(props.module.total_size || 0);
    });
    
    const formattedTTL = computed(() => {
      return CacheManagementService.formatTTL(props.module.ttl || 0);
    });
    
    const statusClass = computed(() => {
      const status = props.module.status || 'empty';
      if (status === 'active') {
        return 'status-active';
      } else if (status === 'expired') {
        return 'status-expired';
      }
      return 'status-empty';
    });
    
    const statusValueClass = computed(() => {
      const status = props.module.status || 'empty';
      if (status === 'active') {
        return 'status-value-active';
      } else if (status === 'expired') {
        return 'status-value-expired';
      }
      return 'status-value-empty';
    });
    
    const statusText = computed(() => {
      return props.module.status_text || (props.module.file_count > 0 ? 'Активен' : 'Пуст');
    });
    
    const formattedCreatedAt = computed(() => {
      if (!props.module.created_at) {
        return '—';
      }
      const date = new Date(props.module.created_at * 1000);
      const now = new Date();
      const diff = now - date;
      
      // Если меньше минуты назад
      if (diff < 60000) {
        return 'Только что';
      }
      
      // Если меньше часа назад
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'} назад`;
      }
      
      // Если сегодня
      if (date.toDateString() === now.toDateString()) {
        return `Сегодня в ${date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      // Если вчера
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `Вчера в ${date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}`;
      }
      
      // Иначе полная дата
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    });
    
    const formattedExpiresAt = computed(() => {
      if (!props.module.expires_at) {
        return '—';
      }
      const date = new Date(props.module.expires_at * 1000);
      const now = new Date();
      const diff = date - now;
      
      if (diff < 0) {
        return `Просрочен (${date.toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        })})`;
      }
      
      // Показываем относительное время до истечения
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      
      if (hours > 0) {
        return `${hours} ч ${minutes % 60} мин`;
      } else if (minutes > 0) {
        return `${minutes} мин`;
      } else {
        return 'Менее минуты';
      }
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
    
    const handleCacheCreated = () => {
      // Перезагрузка статуса кеша
      emit('refresh');
    };
    
      return {
        clearing,
        formattedSize,
        formattedTTL,
        statusClass,
        statusValueClass,
        statusText,
        formattedCreatedAt,
        formattedExpiresAt,
        handleClear,
        handleCacheCreated
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

.status-expired {
  background-color: #fff3cd;
  color: #856404;
}

.status-empty {
  background-color: #f8d7da;
  color: #721c24;
}

.status-value-active {
  color: #28a745;
  font-weight: 600;
}

.status-value-expired {
  color: #ffc107;
  font-weight: 600;
}

.status-value-empty {
  color: #6c757d;
  font-weight: 600;
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
  justify-content: space-between;
  align-items: center;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
  gap: 10px;
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

