<template>
  <div class="cache-module-card"
       :class="{
         'primary-module': isPrimary,
         'secondary-module': !isPrimary,
         'high-priority': isHighPriority,
         'expiring-soon': isExpiringSoon,
         'empty-cache': isEmpty
       }">

    <!-- Индикатор категории и приоритета -->
    <div class="module-indicator">
      <span v-if="isPrimary" class="priority-badge" :class="priorityClass">
        {{ priority }}
      </span>
      <span v-if="groupType" class="group-indicator" :class="groupType">
        {{ groupIcon }}
      </span>
    </div>

    <div class="card-header">
      <div class="title-section">
        <h3 class="module-name">
          <span v-if="isPrimary" class="primary-indicator">⭐</span>
          {{ module.name }}
        </h3>
        <span v-if="isPrimary" class="module-type">Основной модуль</span>
        <span v-else-if="groupType" class="module-type">{{ groupTitle }}</span>
      </div>

      <div class="status-section">
        <span class="module-status" :class="statusClass">
          {{ statusText }}
        </span>
      </div>
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
          <span class="info-value cache-dir" :title="module.cache_dir">
            {{ shortCacheDir }}
          </span>
        </div>

        <!-- Дополнительная информация для основных модулей -->
        <div v-if="isPrimary" class="info-row usage-hint">
          <span class="info-label">Частота:</span>
          <span class="info-value">{{ usageFrequency }}</span>
        </div>
      </div>
    </div>
    
    <div class="card-footer">
      <CacheCreateButton
        :module="module"
        @created="handleCacheCreated"
      />
      <!-- Кнопка очистки -->
      <button
        @click="handleClear"
        :disabled="clearing || isEmpty"
        class="btn-clear"
        :class="{
          'btn-disabled': clearing || isEmpty,
          'btn-primary-action': isPrimary
        }"
      >
        <span v-if="clearing">🧹 Очистка...</span>
        <span v-else-if="isEmpty">📁 Кеш пуст</span>
        <span v-else>🗑️ Очистить кеш</span>
      </button>

      <!-- Дополнительные действия для основных модулей -->
      <button
        v-if="isPrimary && !isEmpty"
        @click="showDetails"
        class="btn-details"
        title="Показать детали кеша"
      >
        📊
      </button>
    </div>

    <!-- Модальное окно с деталями (опционально) -->
    <div v-if="showDetailModal" class="detail-modal" @click.self="closeDetails">
      <div class="modal-content">
        <h4>Детали кеша: {{ module.name }}</h4>
        <pre>{{ JSON.stringify(module, null, 2) }}</pre>
        <button @click="closeDetails" class="btn-close">Закрыть</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';
import { getGroupIcon, getUsageFrequency, formatCacheCreatedAt, formatCacheExpiresAt } from '@/utils/cache-helpers.js';
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
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    priority: {
      type: Number,
      default: 999
    },
    groupType: {
      type: String,
      default: null
    }
  },
  emits: ['clear', 'refresh', 'details'],
  setup(props, { emit }) {
    const clearing = ref(false);
    const creating = ref(false);
    const showDetailModal = ref(false);

    // Вычисляемые свойства
    const isHighPriority = computed(() => props.priority <= 3);
    const isEmpty = computed(() => (props.module.file_count || 0) === 0);
    const isExpiringSoon = computed(() => {
      if (!props.module.expires_at) return false;
      const expiresAt = new Date(props.module.expires_at * 1000);
      const now = new Date();
      const hoursLeft = (expiresAt - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 24; // Менее 24 часов
    });

    const canCreateCache = computed(() => {
      // Логика определения возможности создания кеша
      return props.module.status === 'empty' || props.module.status === 'expired';
    });

    const formattedSize = computed(() => {
      return CacheManagementService.formatCacheSize(props.module.total_size || 0);
    });

    const formattedTTL = computed(() => {
      return CacheManagementService.formatTTL(props.module.ttl || 0);
    });

    const shortCacheDir = computed(() => {
      if (!props.module.cache_dir) return '';
      const parts = props.module.cache_dir.split('/');
      return parts.length > 2 ? '...' + parts.slice(-2).join('/') : props.module.cache_dir;
    });

    const priorityClass = computed(() => `priority-${props.priority}`);
    const statusClass = computed(() => {
      const status = props.module.status || 'empty';
      return `status-${status}`;
    });

    const statusValueClass = computed(() => {
      const status = props.module.status || 'empty';
      return `status-value-${status}`;
    });

    const statusText = computed(() => {
      return props.module.status_text || (isEmpty.value ? 'Пуст' : 'Активен');
    });

    const groupTitle = computed(() => {
      if (!props.groupType) return '';
      const config = CacheManagementService.getModuleTypeConfig(props.groupType);
      return config.title || 'Неизвестная группа';
    });

    const groupIcon = computed(() => {
      const icons = {
        users: '👥',
        activity: '📊',
        webhooks: '🔗',
        other: '🔧'
      };
      return icons[props.groupType] || icons.other;
    });

    const usageFrequency = computed(() => {
      const frequency = getUsageFrequency(props.priority);
      return frequency.text;
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
    
    // Методы
    const handleClear = async () => {
      if (clearing.value || isEmpty.value) return;

      const confirmMessage = props.isPrimary
        ? `Вы уверены, что хотите очистить кеш основного модуля "${props.module.name}"? Это может повлиять на производительность системы.`
        : `Вы уверены, что хотите очистить кеш модуля "${props.module.name}"?`;

      if (!confirm(confirmMessage)) return;

      clearing.value = true;

      try {
        await CacheManagementService.clearCache(props.module.id);
        emit('clear', props.module.id);

        // Уведомление
        if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
          BX.UI.Notification.Center.notify({
            content: `Кеш модуля "${props.module.name}" успешно очищен`,
            autoHideDelay: 3000
          });
        }
      } catch (error) {
        console.error('[CacheModuleCard] Error clearing cache:', error);

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
      emit('refresh');
    };

    const showDetails = () => {
      showDetailModal.value = true;
      emit('details', props.module);
    };

    const closeDetails = () => {
      showDetailModal.value = false;
    };

    return {
      clearing,
      creating,
      showDetailModal,
      isHighPriority,
      isEmpty,
      isExpiringSoon,
      canCreateCache,
      formattedSize,
      formattedTTL,
      shortCacheDir,
      priorityClass,
      statusClass,
      statusValueClass,
      statusText,
      groupTitle,
      groupIcon,
      usageFrequency,
      formattedCreatedAt,
      formattedExpiresAt,
      handleClear,
      handleCacheCreated,
      showDetails,
      closeDetails
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
  position: relative;
}

.cache-module-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* Стили для основных модулей */
.primary-module {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.2);
}

.primary-module:hover {
  box-shadow: 0 6px 12px rgba(0, 123, 255, 0.3);
}

/* Стили для побочных модулей */
.secondary-module {
  border-color: #dee2e6;
}

/* Индикаторы категорий */
.module-indicator {
  position: absolute;
  top: -8px;
  right: 16px;
  display: flex;
  gap: 8px;
}

.priority-badge {
  background: #007bff;
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
}

.priority-1 { background: #dc3545; }
.priority-2 { background: #fd7e14; }
.priority-3 { background: #ffc107; color: #212529; }
.priority-4 { background: #20c997; }
.priority-5 { background: #007bff; }
.priority-6 { background: #6c757d; }
.priority-7 { background: #28a745; }

.group-indicator {
  background: #f8f9fa;
  color: #495057;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  border: 1px solid #dee2e6;
}

.primary-indicator {
  color: #007bff;
  margin-right: 8px;
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

.module-type {
  font-size: 12px;
  color: #666;
  font-weight: normal;
  margin-top: 4px;
  display: block;
}

.title-section {
  flex: 1;
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

.usage-hint {
  background: #f8f9ff;
  padding: 8px 12px;
  border-radius: 4px;
  margin-top: 8px;
  border-left: 3px solid #007bff;
}

.usage-hint .info-label {
  color: #007bff;
  font-weight: 600;
}

.usage-hint .info-value {
  color: #0056b3;
  font-weight: 600;
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

.btn-primary-action {
  background-color: #007bff;
}

.btn-primary-action:hover:not(.btn-disabled) {
  background-color: #0056b3;
}

.btn-details {
  padding: 8px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
  transition: background-color 0.3s ease;
}

.btn-details:hover {
  background-color: #5a6268;
}

/* Модальное окно */
.detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
}

.modal-content h4 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.modal-content pre {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.4;
  margin-bottom: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.btn-close {
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.btn-close:hover {
  background: #5a6268;
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

