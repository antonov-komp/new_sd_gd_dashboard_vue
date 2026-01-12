<template>
  <div
    class="unified-user-card"
    :class="{
      selected: isSelected,
      'activity-high': activityScore >= 80,
      'activity-medium': activityScore >= 50 && activityScore < 80,
      'activity-low': activityScore < 50,
      'status-online': userStatus === 'online',
      'status-away': userStatus === 'away',
      'status-offline': userStatus === 'offline',
      'has-departments': visibleDepartments.length > 0,
      'is-admin': isAdmin,
      'is-new': isNew,
      'is-hidden': isHidden,
      'compact-view': compactView
    }"
    @click="handleSelect"
    @dblclick="viewProfile"
    @keydown.enter="handleSelect"
    @keydown.space="handleSelect"
    @contextmenu.prevent="showContextMenu"
    tabindex="0"
    role="button"
    :aria-label="`Выбрать пользователя ${userName}`"
    :aria-selected="isSelected"
    :aria-describedby="`user-card-${user.id}-description`"
  >
    <!-- Аватар и статус -->
    <div class="user-avatar-section">
      <div class="avatar-container">
        <img
          v-if="userAvatar"
          :src="userAvatar"
          :alt="`Аватар ${userName}`"
          class="user-avatar"
          @error="handleAvatarError"
        />
        <div
          v-else
          class="avatar-placeholder"
          :style="{ backgroundColor: avatarColor }"
        >
          {{ userInitials }}
        </div>
        <div
          class="status-indicator"
          :class="userStatus"
          :title="`Статус: ${getStatusText(userStatus)}`"
        ></div>
        <div
          v-if="isNew"
          class="new-indicator"
          title="Новый пользователь"
        >
          NEW
        </div>
      </div>
    </div>

    <!-- Основная информация -->
    <div class="user-info-section">
      <div class="user-header">
        <h4 class="user-name">{{ userName }}</h4>
        <div class="user-badges">
          <span
            v-if="isAdmin"
            class="badge admin"
            title="Администратор"
          >
            Админ
          </span>
          <span
            v-if="isHidden"
            class="badge hidden"
            title="Скрытый пользователь"
          >
            Скрыт
          </span>
        </div>
      </div>

      <p class="user-email">{{ userEmail }}</p>

      <div
        v-if="visibleDepartments.length > 0"
        class="user-departments"
      >
        <span
          v-for="dept in visibleDepartments"
          :key="dept.id"
          class="dept-tag"
          :style="{ backgroundColor: dept.color }"
          :title="dept.name"
        >
          {{ dept.shortName || dept.name }}
        </span>
        <span
          v-if="hiddenDepartmentsCount > 0"
          class="dept-more"
          :title="`Ещё ${hiddenDepartmentsCount} отделов`"
        >
          +{{ hiddenDepartmentsCount }}
        </span>
      </div>
    </div>

    <!-- Метрики активности -->
    <div class="user-metrics-section">
      <div class="metric primary">
        <div class="metric-value">{{ totalActionsFormatted }}</div>
        <div class="metric-label">действий</div>
        <div
          v-if="actionsChange !== 0"
          class="metric-change"
          :class="{ positive: actionsChange > 0, negative: actionsChange < 0 }"
          :title="`Изменение: ${actionsChange > 0 ? '+' : ''}${actionsChange}%`"
        >
          {{ actionsChange > 0 ? '+' : '' }}{{ actionsChange }}%
        </div>
      </div>

      <div class="metric secondary">
        <div class="metric-value">{{ lastActivityFormatted }}</div>
        <div class="metric-label">активность</div>
      </div>

      <div
        v-if="!compactView"
        class="activity-score"
      >
        <div class="score-bar">
          <div
            class="score-fill"
            :style="{ width: `${activityScore}%` }"
            :class="{
              'high-score': activityScore >= 80,
              'medium-score': activityScore >= 50 && activityScore < 80,
              'low-score': activityScore < 50
            }"
          ></div>
        </div>
        <div
          class="score-label"
          :title="`Уровень активности: ${activityScore}/100`"
        >
          {{ activityScore }}/100
        </div>
      </div>

      <!-- Мини-метрики для компактного вида -->
      <div v-if="compactView" class="mini-metrics">
        <span class="mini-metric">{{ totalSessionsFormatted }} сессий</span>
        <span class="mini-metric">{{ avgSessionDurationFormatted }}</span>
      </div>
    </div>

    <!-- Быстрые действия -->
    <div class="user-actions-section">
      <button
        @click.stop="viewProfile"
        class="action-btn primary"
        :aria-label="`Просмотреть профиль ${userName}`"
        :title="`Просмотреть профиль ${userName}`"
      >
        👁️
      </button>

      <button
        v-if="canEditPermissions"
        @click.stop="editPermissions"
        class="action-btn secondary"
        :aria-label="`Изменить права ${userName}`"
        :title="`Изменить права ${userName}`"
      >
        ⚙️
      </button>

      <button
        @click.stop="toggleHidden"
        class="action-btn tertiary"
        :class="{ active: isHidden }"
        :aria-label="`${isHidden ? 'Показать' : 'Скрыть'} пользователя ${userName}`"
        :title="`${isHidden ? 'Показать' : 'Скрыть'} пользователя ${userName}`"
      >
        {{ isHidden ? '👁️‍🗨️' : '🙈' }}
      </button>

      <button
        @click.stop="showContextMenu"
        class="action-btn menu"
        :aria-label="`Меню действий для ${userName}`"
        title="Дополнительные действия"
      >
        ⋮
      </button>
    </div>

    <!-- Контекстное меню -->
    <div
      v-if="showContextMenuFlag"
      class="context-menu"
      ref="contextMenu"
      role="menu"
      :aria-label="`Меню действий для ${userName}`"
    >
      <button
        @click="viewDetailedAnalytics"
        class="menu-item"
        role="menuitem"
        :aria-label="`Детальная аналитика для ${userName}`"
      >
        📊 Детальная аналитика
      </button>
      <button
        @click="exportUserData"
        class="menu-item"
        role="menuitem"
        :aria-label="`Экспорт данных ${userName}`"
      >
        📥 Экспорт данных
      </button>
      <button
        @click="sendNotification"
        class="menu-item"
        role="menuitem"
        :aria-label="`Отправить уведомление ${userName}`"
      >
        📧 Уведомление
      </button>
      <button
        @click="viewAuditLog"
        class="menu-item"
        role="menuitem"
        :aria-label="`Журнал аудита для ${userName}`"
      >
        📋 Журнал аудита
      </button>
      <hr class="menu-divider" role="separator">
      <button
        v-if="canDelete"
        @click="deleteUser"
        class="menu-item danger"
        role="menuitem"
        :aria-label="`Удалить пользователя ${userName}`"
      >
        🗑️ Удалить пользователя
      </button>
    </div>

    <!-- Скрытое описание для screen readers -->
    <div
      :id="`user-card-${user.id}-description`"
      class="sr-only"
    >
      Пользователь {{ userName }}, email {{ userEmail }},
      статус {{ getStatusText(userStatus) }},
      {{ totalActionsFormatted }} действий,
      последняя активность {{ lastActivityFormatted }},
      уровень активности {{ activityScore }} из 100.
      {{ isAdmin ? 'Администратор.' : '' }}
      {{ isHidden ? 'Скрытый пользователь.' : '' }}
      {{ visibleDepartments.length > 0 ? `Отделы: ${visibleDepartments.map(d => d.name).join(', ')}.` : '' }}
    </div>

    <!-- Индикатор выбора -->
    <div
      v-if="isSelected"
      class="selection-indicator"
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
    </div>
  </div>
</template>

<script>
import { computed, ref, onMounted, onUnmounted } from 'vue';
// Вспомогательные функции для работы с датами (замена date-fns для избежания зависимостей)
const parseISO = (dateString) => new Date(dateString);
const format = (date, formatString, options = {}) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return formatString
    .replace('yyyy', year)
    .replace('MM', month)
    .replace('dd', day);
};

/**
 * UnifiedUserCard - единая карточка пользователя для списка
 *
 * Отображает всю ключевую информацию о пользователе в компактном,
 * но информативном виде с поддержкой различных режимов отображения.
 *
 * @version 1.0.0
 * @since TASK-089
 */
export default {
  name: 'UnifiedUserCard',

  props: {
    /**
     * Данные пользователя
     */
    user: {
      type: Object,
      required: true,
      validator: (value) => {
        return value &&
               typeof value === 'object' &&
               value.id &&
               value.name &&
               value.email;
      }
    },

    /**
     * Выбран ли пользователь
     */
    isSelected: {
      type: Boolean,
      default: false
    },

    /**
     * Расширенные метрики (для детального вида)
     */
    showExtendedMetrics: {
      type: Boolean,
      default: false
    },

    /**
     * Компактный вид (меньше информации)
     */
    compactView: {
      type: Boolean,
      default: false
    },

    /**
     * Разрешение на редактирование прав
     */
    canEditPermissions: {
      type: Boolean,
      default: false
    },

    /**
     * Разрешение на удаление
     */
    canDelete: {
      type: Boolean,
      default: false
    },

    /**
     * Максимальное количество отображаемых отделов
     */
    maxDepartments: {
      type: Number,
      default: 2
    }
  },

  emits: [
    'select',           // Выбор пользователя
    'view-profile',     // Просмотр профиля
    'edit-permissions', // Редактирование прав
    'toggle-hidden',    // Переключение видимости
    'view-analytics',   // Просмотр аналитики
    'export-data',      // Экспорт данных
    'send-notification', // Отправка уведомления
    'view-audit',       // Просмотр аудита
    'delete-user'       // Удаление пользователя
  ],

  setup(props, { emit }) {
    // Реактивные данные
    const showContextMenuFlag = ref(false);
    const contextMenuRef = ref(null);

    // Вычисляемые свойства
    const userInitials = computed(() => {
      const [first, last] = props.user.name.split(' ');
      return `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
    });

    const avatarColor = computed(() => {
      // Генерация цвета на основе ID пользователя
      const colors = [
        '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
        '#00BCD4', '#8BC34A', '#FFC107', '#E91E63', '#3F51B5'
      ];
      return colors[Math.abs(props.user.id) % colors.length];
    });

    const visibleDepartments = computed(() => {
      const depts = props.user.departments || [];
      return depts.slice(0, props.maxDepartments).map(dept => ({
        ...dept,
        shortName: dept.name.length > 10 ? dept.name.substring(0, 8) + '...' : dept.name
      }));
    });

    const hiddenDepartmentsCount = computed(() => {
      const depts = props.user.departments || [];
      return Math.max(0, depts.length - props.maxDepartments);
    });

    const totalActionsFormatted = computed(() => {
      const count = props.user.activity_stats?.total_actions || 0;
      if (count >= 1000000) {
        return `${(count / 1000000).toFixed(1)}M`;
      } else if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
      }
      return count.toLocaleString();
    });

    const totalSessionsFormatted = computed(() => {
      const count = props.user.activity_stats?.total_sessions || 0;
      if (count >= 1000) {
        return `${(count / 1000).toFixed(1)}K`;
      }
      return count.toString();
    });

    const avgSessionDurationFormatted = computed(() => {
      const duration = props.user.activity_stats?.avg_session_duration || 0;
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    const lastActivityFormatted = computed(() => {
      const lastActivity = props.user.activity_stats?.last_activity;
      if (!lastActivity) return 'Никогда';

      let date;
      try {
        date = typeof lastActivity === 'string' ? parseISO(lastActivity) : new Date(lastActivity);
      } catch {
        return 'Неизвестно';
      }

      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMins = Math.floor(diffMs / (1000 * 60));

      if (diffMins < 1) return 'только что';
      if (diffMins < 60) return `${diffMins} мин`;
      if (diffHours < 24) return `${diffHours} ч`;
      if (diffDays < 7) return `${diffDays} д`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} нед`;
      return format(date, 'dd.MM.yyyy');
    });

    const activityScore = computed(() => {
      return Math.min(100, Math.max(0, props.user.activity_stats?.activity_score || 0));
    });

    const actionsChange = computed(() => {
      return props.user.activity_stats?.actions_change_percent || 0;
    });

    const userStatus = computed(() => {
      return props.user.status || 'offline';
    });

    const isAdmin = computed(() => {
      return Boolean(props.user.is_admin);
    });

    const isNew = computed(() => {
      if (!props.user.created_at) return false;
      try {
        const created = typeof props.user.created_at === 'string'
          ? parseISO(props.user.created_at)
          : new Date(props.user.created_at);
        const now = new Date();
        const diffDays = Math.floor((now - created) / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      } catch {
        return false;
      }
    });

    const isHidden = computed(() => {
      return Boolean(props.user.is_hidden);
    });

    const userName = computed(() => {
      return props.user.name || 'Неизвестный пользователь';
    });

    const userEmail = computed(() => {
      return props.user.email || '';
    });

    const userAvatar = computed(() => {
      return props.user.avatar || null;
    });

    // Методы
    const handleSelect = () => {
      emit('select', props.user);
    };

    const viewProfile = () => {
      emit('view-profile', props.user);
    };

    const editPermissions = () => {
      emit('edit-permissions', props.user);
    };

    const toggleHidden = () => {
      emit('toggle-hidden', props.user);
    };

    const showContextMenu = () => {
      showContextMenuFlag.value = true;
      // Закрываем меню при клике вне его
      const closeMenu = (e) => {
        if (contextMenuRef.value && !contextMenuRef.value.contains(e.target)) {
          showContextMenuFlag.value = false;
          document.removeEventListener('click', closeMenu);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', closeMenu);
      }, 0);
    };

    const viewDetailedAnalytics = () => {
      showContextMenuFlag.value = false;
      emit('view-analytics', props.user);
    };

    const exportUserData = () => {
      showContextMenuFlag.value = false;
      emit('export-data', props.user);
    };

    const sendNotification = () => {
      showContextMenuFlag.value = false;
      emit('send-notification', props.user);
    };

    const viewAuditLog = () => {
      showContextMenuFlag.value = false;
      emit('view-audit', props.user);
    };

    const deleteUser = () => {
      showContextMenuFlag.value = false;
      if (confirm(`Вы уверены, что хотите удалить пользователя ${props.user.name}?`)) {
        emit('delete-user', props.user);
      }
    };

    const handleAvatarError = () => {
      // Обработка ошибки загрузки аватара
      console.warn(`Failed to load avatar for user ${props.user.id}`);
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'online': return 'онлайн';
        case 'away': return 'отошёл';
        case 'offline': return 'оффлайн';
        default: return 'неизвестен';
      }
    };

    // Обработчики клавиатуры
    const handleKeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextCard = e.target.nextElementSibling;
        if (nextCard) nextCard.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevCard = e.target.previousElementSibling;
        if (prevCard) prevCard.focus();
      }
    };

    onMounted(() => {
      // Добавляем обработчик клавиатуры
      const cardElement = document.querySelector(`[data-user-id="${props.user.id}"]`);
      if (cardElement) {
        cardElement.addEventListener('keydown', handleKeydown);
      }
    });

    onUnmounted(() => {
      // Убираем обработчик клавиатуры
      const cardElement = document.querySelector(`[data-user-id="${props.user.id}"]`);
      if (cardElement) {
        cardElement.removeEventListener('keydown', handleKeydown);
      }
    });

    return {
      showContextMenuFlag,
      contextMenuRef,
      userInitials,
      avatarColor,
      visibleDepartments,
      hiddenDepartmentsCount,
      totalActionsFormatted,
      totalSessionsFormatted,
      avgSessionDurationFormatted,
      lastActivityFormatted,
      activityScore,
      actionsChange,
      userStatus,
      isAdmin,
      isNew,
      isHidden,
      userName,
      userEmail,
      userAvatar,
      handleSelect,
      viewProfile,
      editPermissions,
      toggleHidden,
      showContextMenu,
      viewDetailedAnalytics,
      exportUserData,
      sendNotification,
      viewAuditLog,
      deleteUser,
      handleAvatarError,
      getStatusText
    };
  }
};
</script>

<style scoped>
.unified-user-card {
  position: relative;
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 8px;
  background: var(--um-bg-primary, #ffffff);
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.unified-user-card:hover {
  border-color: var(--um-primary, #2196f3);
  box-shadow: 0 2px 8px rgba(33, 150, 243, 0.1);
  transform: translateY(-1px);
}

.unified-user-card:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.unified-user-card.selected {
  border-color: var(--um-primary, #2196f3);
  background: var(--um-bg-accent, #e3f2fd);
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

/* Статусы активности */
.activity-high {
  border-left: 4px solid #4caf50;
}

.activity-medium {
  border-left: 4px solid #ff9800;
}

.activity-low {
  border-left: 4px solid #f44336;
}

.status-online .status-indicator {
  background: #4caf50;
}

.status-away .status-indicator {
  background: #ff9800;
}

.status-offline .status-indicator {
  background: #9e9e9e;
}

/* Аватар */
.user-avatar-section {
  flex-shrink: 0;
  margin-right: 16px;
}

.avatar-container {
  position: relative;
  width: 48px;
  height: 48px;
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 16px;
}

.status-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.new-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #f44336;
  color: white;
  font-size: 8px;
  font-weight: bold;
  padding: 2px 4px;
  border-radius: 8px;
  border: 1px solid white;
}

/* Информация о пользователе */
.user-info-section {
  flex: 1;
  min-width: 0;
  margin-right: 16px;
}

.user-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.user-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--um-text-primary, #212121);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.badge {
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge.admin {
  background: #f44336;
  color: white;
}

.badge.hidden {
  background: #9e9e9e;
  color: white;
}

.user-email {
  margin: 4px 0;
  font-size: 14px;
  color: var(--um-text-secondary, #757575);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-departments {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 4px;
}

.dept-tag {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  color: white;
  background: #9e9e9e;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dept-more {
  padding: 2px 4px;
  background: #e0e0e0;
  color: #757575;
  border-radius: 4px;
  font-size: 11px;
}

/* Метрики */
.user-metrics-section {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-right: 16px;
  min-width: 100px;
}

.metric {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-bottom: 8px;
}

.metric.primary {
  margin-bottom: 12px;
}

.metric-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--um-text-primary, #212121);
  line-height: 1;
}

.metric.primary .metric-value {
  font-size: 20px;
}

.metric-label {
  font-size: 11px;
  color: var(--um-text-secondary, #757575);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}

.metric-change {
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}

.metric-change.positive {
  color: #4caf50;
}

.metric-change.negative {
  color: #f44336;
}

.activity-score {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
}

.score-bar {
  flex: 1;
  height: 4px;
  background: var(--um-bg-secondary, #e0e0e0);
  border-radius: 2px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.score-fill.high-score {
  background: linear-gradient(90deg, #4caf50 0%, #8bc34a 100%);
}

.score-fill.medium-score {
  background: linear-gradient(90deg, #ff9800 0%, #ffc107 100%);
}

.score-fill.low-score {
  background: linear-gradient(90deg, #f44336 0%, #ff5722 100%);
}

.score-label {
  font-size: 10px;
  color: var(--um-text-secondary, #757575);
  font-weight: 500;
  min-width: 35px;
  text-align: right;
}

.mini-metrics {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.mini-metric {
  font-size: 10px;
  color: var(--um-text-secondary, #757575);
  white-space: nowrap;
}

/* Действия */
.user-actions-section {
  display: flex;
  gap: 4px;
  align-self: flex-start;
  margin-top: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  background: transparent;
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn:focus {
  outline: 2px solid var(--um-primary, #2196f3);
  outline-offset: 2px;
}

.action-btn.primary {
  color: var(--um-primary, #2196f3);
}

.action-btn.primary:hover {
  background: rgba(33, 150, 243, 0.1);
}

.action-btn.secondary {
  color: var(--um-secondary, #757575);
}

.action-btn.secondary:hover {
  background: rgba(117, 117, 117, 0.1);
}

.action-btn.tertiary {
  color: var(--um-text-secondary, #757575);
}

.action-btn.tertiary:hover {
  background: rgba(117, 117, 117, 0.1);
}

.action-btn.tertiary.active {
  color: var(--um-primary, #2196f3);
  background: rgba(33, 150, 243, 0.1);
}

.action-btn.menu {
  color: var(--um-text-secondary, #757575);
  font-size: 16px;
  font-weight: bold;
}

.action-btn.menu:hover {
  background: rgba(117, 117, 117, 0.1);
}

/* Контекстное меню */
.context-menu {
  position: absolute;
  top: 100%;
  right: 8px;
  background: var(--um-bg-primary, #ffffff);
  border: 1px solid var(--um-border-color, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.menu-item {
  display: block;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: var(--um-text-primary, #212121);
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s ease;
}

.menu-item:hover {
  background: var(--um-hover, rgba(33, 150, 243, 0.1));
}

.menu-item.danger {
  color: #f44336;
}

.menu-item.danger:hover {
  background: rgba(244, 67, 54, 0.1);
}

.menu-divider {
  border: none;
  border-top: 1px solid var(--um-border-color, #e0e0e0);
  margin: 4px 0;
}

/* Индикатор выбора */
.selection-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--um-primary, #2196f3);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Скрытые элементы для screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Компактный вид */
.compact-view {
  padding: 12px;
}

.compact-view .user-avatar-section {
  margin-right: 12px;
}

.compact-view .avatar-container {
  width: 36px;
  height: 36px;
}

.compact-view .avatar-placeholder {
  font-size: 12px;
}

.compact-view .user-name {
  font-size: 14px;
}

.compact-view .user-email {
  font-size: 13px;
}

.compact-view .metric-value {
  font-size: 16px;
}

.compact-view .metric.primary .metric-value {
  font-size: 18px;
}

.compact-view .user-actions-section {
  margin-top: 0;
}

.compact-view .action-btn {
  width: 28px;
  height: 28px;
  font-size: 12px;
}

/* Адаптивность */
@media (max-width: 768px) {
  .unified-user-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px;
  }

  .user-avatar-section {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .user-info-section {
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }

  .user-metrics-section {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    margin-right: 0;
    margin-top: 12px;
    min-width: auto;
  }

  .user-actions-section {
    margin-top: 12px;
    align-self: flex-end;
  }

  .activity-score {
    order: -1;
    margin-top: 0;
    width: auto;
  }

  .context-menu {
    right: 0;
    left: 0;
    top: 100%;
  }
}

@media (max-width: 480px) {
  .unified-user-card {
    padding: 8px;
  }

  .user-metrics-section {
    flex-direction: column;
    gap: 8px;
  }

  .activity-score {
    justify-content: flex-start;
  }

  .action-btn {
    width: 24px;
    height: 24px;
    font-size: 10px;
  }

  .user-badges {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .badge {
    font-size: 8px;
    padding: 1px 4px;
  }
}

/* Темная тема */
@media (prefers-color-scheme: dark) {
  .unified-user-card {
    background: var(--um-bg-dark-primary, #1e1e1e);
    border-color: var(--um-border-dark-color, #424242);
  }

  .unified-user-card:hover {
    border-color: var(--um-primary, #2196f3);
  }

  .unified-user-card.selected {
    background: rgba(33, 150, 243, 0.1);
  }

  .user-name {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .user-email {
    color: var(--um-text-dark-secondary, #b0b0b0);
  }

  .metric-value {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .context-menu {
    background: var(--um-bg-dark-primary, #1e1e1e);
    border-color: var(--um-border-dark-color, #424242);
  }

  .menu-item {
    color: var(--um-text-dark-primary, #ffffff);
  }

  .menu-item:hover {
    background: rgba(33, 150, 243, 0.1);
  }
}

/* Высокий контраст */
@media (prefers-contrast: high) {
  .unified-user-card {
    border-width: 2px;
  }

  .unified-user-card.selected {
    border-width: 3px;
  }

  .action-btn:hover,
  .menu-item:hover {
    border: 1px solid var(--um-primary, #2196f3);
  }

  .badge {
    border: 1px solid;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .unified-user-card,
  .action-btn,
  .score-fill {
    transition: none;
  }

  .unified-user-card:hover {
    transform: none;
  }

  .action-btn:hover {
    transform: none;
  }
}
</style>