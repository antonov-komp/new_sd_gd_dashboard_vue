<template>
  <article class="cache-module-card" :class="moduleClasses" role="article" :aria-labelledby="`module-${module.id}-title`" :aria-describedby="`module-${module.id}-status`">
    <!-- Заголовок с улучшенной иерархией -->
    <div class="card-header">
      <div class="module-identity">
        <div class="module-icon" :class="iconClass">
          {{ moduleIcon }}
        </div>
        <div class="module-info">
          <h3 class="module-name" :id="`module-${module.id}-title`">{{ module.name }}</h3>
          <span class="module-type">{{ moduleTypeText }}</span>
        </div>
      </div>

      <div class="header-meta">
        <!-- Бейдж приоритета (только для основных) -->
        <span v-if="isPrimary && priority" class="priority-badge" :class="priorityClass">
          {{ priority }}
        </span>

        <!-- Статус модуля -->
        <span class="status-badge" :class="statusClass" :id="`module-${module.id}-status`" role="status">
          {{ statusText }}
        </span>
      </div>
    </div>

    <!-- Улучшенное отображение данных -->
    <div class="card-content">
      <div class="data-grid">
        <!-- Статистика кеша -->
        <div class="data-section statistics">
          <div class="section-header">
            <span class="section-icon">📊</span>
            <h4 class="section-title">Статистика</h4>
          </div>
          <div class="data-items">
            <div class="data-item">
              <span class="data-label">Файлов:</span>
              <span class="data-value">{{ module.file_count || 0 }}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Размер:</span>
              <span class="data-value">{{ formattedSize }}</span>
            </div>
            <div v-if="module.cache_dir" class="data-item full-width">
              <span class="data-label">Директория:</span>
              <span class="data-value cache-dir" :title="module.cache_dir">
                {{ shortCacheDir }}
              </span>
            </div>
          </div>
        </div>

        <!-- Время жизни -->
        <div class="data-section lifetime">
          <div class="section-header">
            <span class="section-icon">⏰</span>
            <h4 class="section-title">Время жизни</h4>
          </div>
          <div class="data-items">
            <div class="data-item">
              <span class="data-label">TTL:</span>
              <span class="data-value">{{ formattedTTL }}</span>
            </div>
            <div v-if="module.created_at" class="data-item">
              <span class="data-label">Создан:</span>
              <span class="data-value">{{ formattedCreatedAt }}</span>
            </div>
            <div v-if="module.expires_at" class="data-item">
              <span class="data-label">Истекает:</span>
              <span class="data-value" :class="expiresClass">{{ formattedExpiresAt }}</span>
            </div>
          </div>
        </div>

        <!-- Технические метрики производительности (только для основных модулей с метаданными) -->
        <div v-if="isPrimary && module.metadata" class="data-section performance">
          <div class="section-header">
            <span class="section-icon">⚡</span>
            <h4 class="section-title">Производительность</h4>
          </div>
          <div class="data-items">
            <div class="data-item">
              <span class="data-label">Время создания:</span>
              <span class="data-value" :class="creationTimeClass">{{ formattedCreationTime }}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Последний доступ:</span>
              <span class="data-value">{{ formattedLastAccess }}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Обращений:</span>
              <span class="data-value">{{ accessCount }}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Эффективность:</span>
              <span class="data-value" :class="cacheEfficiencyClass">{{ cacheEfficiency }}</span>
            </div>
            <div class="data-item">
              <span class="data-label">Свежесть данных:</span>
              <span class="data-value" :class="dataFreshnessClass">{{ dataFreshness }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Улучшенные кнопки действий -->
    <div class="card-actions" :class="{ 'mobile-layout': isMobile }">
      <!-- Первичные действия (создание кеша) -->
      <div class="primary-actions">
        <CacheCreateButton
          :module="module"
          :disabled="creating"
          @created="handleCacheCreated"
          @creating="handleCreatingState"
          class="action-button create-button"
          :class="{ 'loading': creating }"
        />
      </div>

      <!-- Второстепенные действия -->
      <div class="secondary-actions">
        <button
          @click="handleClear"
          @keydown.enter="handleClear"
          @keydown.space.prevent="handleClear"
          :disabled="!canClear"
          class="action-button clear-button"
          :class="{
            'disabled': !canClear,
            'loading': clearing
          }"
          :aria-label="clearButtonLabel"
          tabindex="0"
        >
          <span v-if="clearing" class="button-content">
            <span class="spinner"></span>
            Очистка...
          </span>
          <span v-else-if="isEmpty" class="button-content">
            📁 Кеш пуст
          </span>
          <span v-else class="button-content">
            🗑️ Очистить
          </span>
        </button>

        <!-- Детали для основных модулей -->
        <button
          v-if="canShowDetails"
          @click="showDetails"
          @keydown.enter="showDetails"
          @keydown.space.prevent="showDetails"
          class="action-button details-button"
          :aria-label="`Показать детали кеша ${module.name}`"
          title="Показать детали кеша"
          tabindex="0"
        >
          📊
        </button>
      </div>
    </div>

    <!-- Модальное окно с деталями -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="detail-modal-overlay" @click.self="closeDetails" @keydown.escape="closeDetails">
        <div class="detail-modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h3>Детали кеша: {{ module.name }}</h3>
            <button @click="closeDetails" @keydown.enter="closeDetails" @keydown.escape="closeDetails" class="close-button" aria-label="Закрыть" tabindex="0">
              ✕
            </button>
          </div>
          <div class="modal-content">
            <pre class="json-data">{{ JSON.stringify(module, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
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
    const isMobile = ref(false);

    // Определение мобильного устройства
    onMounted(() => {
      const checkMobile = () => {
        isMobile.value = window.innerWidth < 768;
      };
      checkMobile();
      window.addEventListener('resize', checkMobile);
    });

    // Вычисляемые свойства для визуального состояния
    const moduleClasses = computed(() => ({
      'cache-module-card': true,
      'primary-module': props.isPrimary,
      'secondary-module': !props.isPrimary,
      'high-priority': props.priority <= 3,
      'expiring-soon': isExpiringSoon.value,
      'empty-cache': isEmpty.value,
      'loading': clearing.value || creating.value
    }));

    const moduleIcon = computed(() => {
      if (props.isPrimary) return '🏆'; // Основной модуль
      return {
        users: '👥',
        activity: '📊',
        webhooks: '🔗',
        other: '🔧'
      }[props.groupType] || '🔧';
    });

    const iconClass = computed(() => ({
      'primary-icon': props.isPrimary,
      'secondary-icon': !props.isPrimary
    }));

    const moduleTypeText = computed(() => {
      if (props.isPrimary) return 'Основной модуль';
      if (props.groupType) {
        const config = CacheManagementService.getModuleTypeConfig(props.groupType);
        return config.title || 'Неизвестная группа';
      }
      return '';
    });

    const priorityClass = computed(() => props.priority ? `priority-${props.priority}` : '');
    const statusClass = computed(() => {
      const status = props.module.status || 'empty';
      return `status-${status}`;
    });

    // Базовые вычисляемые свойства
    const isEmpty = computed(() => (props.module.file_count || 0) === 0);
    const isExpiringSoon = computed(() => {
      if (!props.module.expires_at) return false;
      const expiresAt = new Date(props.module.expires_at * 1000);
      const now = new Date();
      const hoursLeft = (expiresAt - now) / (1000 * 60 * 60);
      return hoursLeft > 0 && hoursLeft <= 2; // Менее 2 часов
    });

    const statusText = computed(() => {
      const status = props.module.status;
      if (status === 'active') return 'Активен';
      if (status === 'expired') return 'Просрочен';
      if (status === 'empty') return 'Пуст';
      return 'Неизвестен';
    });

    // Форматирование данных
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

    // Метаданные производительности
    const formattedCreationTime = computed(() => {
      if (!props.module.metadata?.creation_time_ms) return '—';
      return CacheManagementService.formatCreationTime(props.module.metadata.creation_time_ms);
    });

    const formattedLastAccess = computed(() => {
      if (!props.module.metadata?.last_accessed_at) return '—';
      const date = new Date(props.module.metadata.last_accessed_at * 1000);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'Только что';
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} мин назад`;
      }
      return date.toLocaleString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });

    const accessCount = computed(() => {
      return props.module.metadata?.access_count || 0;
    });

    const cacheEfficiency = computed(() => {
      if (!props.module.metadata?.performance_metrics?.cache_hit_ratio) return '—';
      return CacheManagementService.formatCacheHitRatio(
        props.module.metadata.performance_metrics.cache_hit_ratio
      );
    });

    const dataFreshness = computed(() => {
      if (!props.module.metadata?.performance_metrics?.data_freshness_score) return '—';
      return CacheManagementService.formatDataFreshness(
        props.module.metadata.performance_metrics.data_freshness_score
      );
    });

    // Цветовые классы для метрик
    const expiresClass = computed(() => {
      if (!props.module.expires_at) return '';
      const color = CacheManagementService.getExpiryColor(props.module.expires_at);
      return `metric-${color}`;
    });

    const creationTimeClass = computed(() => {
      if (!props.module.metadata?.creation_time_ms) return '';
      const color = CacheManagementService.getCreationTimeColor(props.module.metadata.creation_time_ms);
      return `metric-${color}`;
    });

    const cacheEfficiencyClass = computed(() => {
      if (!props.module.metadata?.performance_metrics?.cache_hit_ratio) return '';
      const color = CacheManagementService.getEfficiencyColor(
        props.module.metadata.performance_metrics.cache_hit_ratio
      );
      return `metric-${color}`;
    });

    const dataFreshnessClass = computed(() => {
      if (!props.module.metadata?.performance_metrics?.data_freshness_score) return '';
      const color = CacheManagementService.getFreshnessColor(
        props.module.metadata.performance_metrics.data_freshness_score
      );
      return `metric-${color}`;
    });

    // Управление состояниями кнопок
    const canClear = computed(() => !isEmpty.value && !clearing.value);
    const canShowDetails = computed(() => props.isPrimary && !isEmpty.value);
    const clearButtonLabel = computed(() => {
      if (isEmpty.value) return 'Кеш модуля пуст';
      return `Очистить кеш модуля ${props.module.name}`;
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
      if (!canClear.value) return;

      // Показываем модальное окно подтверждения
      const confirmed = await showConfirmationModal({
        title: 'Подтверждение очистки',
        message: `Вы уверены, что хотите очистить кеш модуля "${props.module.name}"?`,
        type: 'danger',
        confirmText: 'Очистить кеш',
        cancelText: 'Отмена'
      });

      if (!confirmed) return;

      clearing.value = true;
      try {
        await CacheManagementService.clearCache(props.module.id);
        emit('clear', props.module.id);

        // Уведомление об успехе
        showNotification({
          type: 'success',
          title: 'Кеш очищен',
          message: `Кеш модуля "${props.module.name}" успешно очищен`
        });
      } catch (error) {
        showNotification({
          type: 'error',
          title: 'Ошибка очистки',
          message: error.message
        });
      } finally {
        clearing.value = false;
      }
    };

    const handleCacheCreated = () => {
      emit('refresh');
    };

    const handleCreatingState = (isCreating) => {
      creating.value = isCreating;
    };

    const showDetails = () => {
      showDetailModal.value = true;
      emit('details', props.module);
    };

    const closeDetails = () => {
      showDetailModal.value = false;
    };

    // Вспомогательные функции для уведомлений
    const showNotification = ({ type, title, message }) => {
      if (typeof BX !== 'undefined' && BX.UI && BX.UI.Notification) {
        BX.UI.Notification.Center.notify({
          content: `${title}: ${message}`,
          autoHideDelay: type === 'error' ? 5000 : 3000
        });
      } else {
        alert(`${title}: ${message}`);
      }
    };

    const showConfirmationModal = async ({ title, message, type, confirmText, cancelText }) => {
      return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal-overlay';
        modal.innerHTML = `
          <div class="confirmation-modal" role="dialog" aria-modal="true">
            <div class="modal-header">
              <h3>${title}</h3>
            </div>
            <div class="modal-body">
              <p>${message}</p>
              <div class="warning-info">
                <p>Это действие:</p>
                <ul>
                  <li>Удалит все файлы кеша</li>
                  <li>Приведет к повторному созданию кеша при следующем запросе</li>
                  <li>Может временно замедлить работу модуля</li>
                </ul>
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel">${cancelText}</button>
              <button class="btn-confirm">${confirmText}</button>
            </div>
          </div>
        `;

        // Обработчики событий
        const cancelBtn = modal.querySelector('.btn-cancel');
        const confirmBtn = modal.querySelector('.btn-confirm');

        cancelBtn.addEventListener('click', () => {
          modal.remove();
          resolve(false);
        });

        confirmBtn.addEventListener('click', () => {
          modal.remove();
          resolve(true);
        });

        // Закрытие по Escape
        document.addEventListener('keydown', function handler(e) {
          if (e.key === 'Escape') {
            modal.remove();
            resolve(false);
            document.removeEventListener('keydown', handler);
          }
        });

        document.body.appendChild(modal);
      });
    };

    return {
      clearing,
      creating,
      showDetailModal,
      isMobile,
      moduleClasses,
      moduleIcon,
      iconClass,
      moduleTypeText,
      priorityClass,
      statusClass,
      isEmpty,
      isExpiringSoon,
      statusText,
      formattedSize,
      formattedTTL,
      shortCacheDir,
      formattedCreationTime,
      formattedLastAccess,
      accessCount,
      cacheEfficiency,
      dataFreshness,
      expiresClass,
      creationTimeClass,
      cacheEfficiencyClass,
      dataFreshnessClass,
      canClear,
      canShowDetails,
      clearButtonLabel,
      formattedCreatedAt,
      formattedExpiresAt,
      handleClear,
      handleCacheCreated,
      handleCreatingState,
      showDetails,
      closeDetails
    };
  }
};
</script>

<style scoped>
/* Переменные для консистентности */
:root {
  --cache-primary-color: #007bff;
  --cache-secondary-color: #6c757d;
  --cache-success-color: #28a745;
  --cache-danger-color: #dc3545;
  --cache-warning-color: #fd7e14;
  --cache-border-radius: 12px;
  --cache-border-radius-sm: 8px;
  --cache-transition: all 0.2s ease;
  --cache-shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.1);
  --cache-shadow-md: 0 4px 12px rgba(0, 123, 255, 0.15);
  --cache-shadow-lg: 0 8px 25px rgba(0, 123, 255, 0.2);
}

.cache-module-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: var(--cache-border-radius);
  overflow: hidden;
  transition: var(--cache-transition);
  position: relative;
  animation: cardFadeIn 0.4s ease-out;
  animation-fill-mode: both;
}

.cache-module-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--cache-shadow-lg);
}

.primary-module {
  border-color: var(--cache-primary-color);
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  box-shadow: var(--cache-shadow-md);
}

.primary-module:hover {
  border-color: #0056b3;
  box-shadow: 0 6px 20px rgba(0, 123, 255, 0.25);
}

.secondary-module {
  border-color: #dee2e6;
  background: #f8f9fa;
  box-shadow: var(--cache-shadow-sm);
}

.high-priority {
  border-width: 3px;
  box-shadow: 0 0 0 2px rgba(255, 193, 7, 0.2);
}

.expiring-soon {
  border-color: var(--cache-warning-color);
  box-shadow: 0 0 0 2px rgba(253, 126, 20, 0.2);
}

.expiring-soon .status-badge {
  animation: pulseWarning 2s infinite;
}

.empty-cache {
  opacity: 0.8;
}

.empty-cache .card-content {
  opacity: 0.6;
}

.loading {
  pointer-events: none;
}

.loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

/* Анимации */
@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulseWarning {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

/* Заголовок карточки */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
  gap: 16px;
}

.module-identity {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.module-icon {
  font-size: 32px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: white;
  border: 2px solid #e0e0e0;
}

.primary-icon {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
  border-color: #0056b3;
}

.secondary-icon {
  background: #6c757d;
  color: white;
  border-color: #5a6268;
}

.module-name {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  line-height: 1.2;
}

.module-type {
  font-size: 12px;
  color: #666;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.header-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.priority-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
}

.priority-1 { background: #dc3545; }
.priority-2 { background: #fd7e14; }
.priority-3 { background: #ffc107; color: #212529; }
.priority-4 { background: #20c997; }
.priority-5 { background: #007bff; }

.status-badge {
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-expired {
  background: #f8d7da;
  color: #721c24;
}

.status-empty {
  background: #e2e3e5;
  color: #383d41;
}

/* Содержимое карточки */
.card-content {
  padding: 20px;
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.data-section {
  .section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .section-icon {
    font-size: 16px;
  }

  .section-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
  }

  .data-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .data-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 6px;

    &.full-width {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
  }

  .data-label {
    font-weight: 500;
    color: #666;
    font-size: 13px;
  }

  .data-value {
    font-weight: 600;
    color: #333;
    font-size: 13px;

    &.cache-dir {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
      font-size: 11px;
      color: #666;
      word-break: break-all;
      max-width: 100%;
    }
  }
}

/* Цветовые индикаторы для метрик */
.metric-green { color: #28a745; font-weight: 700; }
.metric-yellow { color: #fd7e14; font-weight: 700; }
.metric-red { color: #dc3545; font-weight: 700; }
.metric-gray { color: #6c757d; font-weight: 500; }

/* Кнопки действий */
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  gap: 16px;

  &.mobile-layout {
    flex-direction: column;
    gap: 12px;
  }
}

.primary-actions {
  flex: 1;
}

.secondary-actions {
  display: flex;
  gap: 8px;

  .mobile-layout & {
    width: 100%;
    justify-content: space-between;
  }
}

.action-button {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--cache-transition);
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
  position: relative;

  &:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  &.loading {
    pointer-events: none;

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 8px;
    }
  }
}

.create-button {
  background: linear-gradient(135deg, #28a745, #20c997);
  color: white;
  box-shadow: 0 2px 4px rgba(40, 167, 69, 0.2);

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, #218838, #1aa085);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.clear-button {
  background: linear-gradient(135deg, #dc3545, #c82333);
  color: white;
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);

  &:hover:not(.disabled) {
    background: linear-gradient(135deg, #bd2130, #a02622);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);
  }

  &:active {
    transform: translateY(0);
  }
}

.details-button {
  background: #6c757d;
  color: white;
  min-width: 48px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  padding: 0;

  &:hover {
    background: #5a6268;
    transform: scale(1.05);
  }

  &:active {
    transform: scale(0.95);
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Модальные окна */
.detail-modal-overlay {
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
  animation: fadeIn 0.2s ease-out;
}

.detail-modal {
  background: white;
  border-radius: var(--cache-border-radius);
  box-shadow: var(--cache-shadow-lg);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;

  h3 {
    margin: 0;
    color: #333;
  }
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  color: #666;
  transition: background-color 0.2s ease;

  &:hover {
    background: #f8f9fa;
    color: #333;
  }
}

.modal-content {
  padding: 20px;
}

.json-data {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 12px;
  line-height: 1.4;
  max-height: 400px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Модальное окно подтверждения */
.confirmation-modal-overlay {
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

.confirmation-modal {
  background: white;
  border-radius: var(--cache-border-radius);
  box-shadow: var(--cache-shadow-lg);
  max-width: 400px;
  width: 90%;
  animation: modalSlideIn 0.3s ease-out;
}

.modal-body {
  padding: 20px;

  p {
    margin: 0 0 15px 0;
    color: #333;
  }
}

.warning-info {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
  padding: 12px;
  margin-top: 15px;

  p {
    margin: 0 0 8px 0;
    font-weight: 600;
    color: #856404;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      color: #856404;
      font-size: 14px;
      margin-bottom: 4px;
    }
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
}

.btn-cancel {
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s ease;

  &:hover {
    background: #5a6268;
  }
}

.btn-confirm {
  padding: 8px 16px;
  background: var(--cache-danger-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  transition: background-color 0.2s ease;

  &:hover {
    background: #c82333;
  }
}

/* Адаптивность */
@media (max-width: 768px) {
  .cache-module-card {
    border-radius: var(--cache-border-radius-sm);
  }

  .card-header {
    padding: 16px;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .module-identity {
    width: 100%;
  }

  .header-meta {
    flex-direction: row;
    width: 100%;
    justify-content: space-between;
  }

  .card-content {
    padding: 16px;
  }

  .data-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .card-actions {
    padding: 12px 16px;
  }

  .action-button {
    min-width: 0;
    flex: 1;
  }

  .detail-modal {
    margin: 20px;
  }
}
</style>

