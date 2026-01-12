<template>
  <div class="user-activity-card" :class="cardClass" v-if="isValidEntry">
    <div class="activity-icon">
      <span v-if="safeEntry.type === 'app_entry'">🚪</span>
      <span v-else-if="safeEntry.type === 'page_visit'">📄</span>
      <span v-else>❓</span>
    </div>

    <div class="activity-content">
      <div class="activity-header">
        <span class="user-name">{{ safeEntry.user_name || `User #${safeEntry.user_id}` }}</span>
        <span class="activity-time">{{ formatTime(safeEntry.timestamp) }}</span>
      </div>

      <div class="activity-details">
        <span v-if="safeEntry.type === 'app_entry'" class="activity-type">
          Открыл приложение
        </span>
        <span v-else-if="safeEntry.type === 'page_visit'" class="activity-type">
          Открыл страницу: {{ safeEntry.route_title || safeEntry.route_path || safeEntry.route_name || 'Неизвестная страница' }}
        </span>
        <span v-else class="activity-type">
          Неизвестное действие
        </span>
      </div>

      <div v-if="safeEntry.type === 'page_visit' && safeEntry.from_path" class="activity-from">
        С: {{ safeEntry.from_name || safeEntry.from_path }}
      </div>
    </div>
  </div>
  <div v-else class="user-activity-card error-card">
    <div class="activity-icon">⚠️</div>
    <div class="activity-content">
      <div class="activity-details">
        <span class="activity-type error">Ошибка загрузки данных</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserActivityCard',
  props: {
    entry: {
      type: Object,
      required: true,
      validator: (value) => {
        return value &&
               typeof value === 'object' &&
               value !== null &&
               value.user_id &&
               value.timestamp &&
               typeof value.type === 'string';
      }
    }
  },
  computed: {
    isValidEntry() {
      return this.entry &&
             typeof this.entry === 'object' &&
             this.entry !== null &&
             this.entry.user_id &&
             this.entry.timestamp &&
             typeof this.entry.type === 'string' &&
             this.entry.type.trim() !== '';
    },

    safeEntry() {
      if (!this.isValidEntry) {
        return {
          user_id: 'unknown',
          user_name: 'Неизвестный пользователь',
          timestamp: new Date().toISOString(),
          type: 'unknown',
          route_title: null,
          route_path: null,
          route_name: null,
          from_path: null,
          from_name: null
        };
      }

      return {
        ...this.entry,
        user_id: this.entry.user_id || 'unknown',
        user_name: this.entry.user_name || `User #${this.entry.user_id}`,
        timestamp: this.entry.timestamp || new Date().toISOString(),
        type: this.entry.type || 'unknown',
        route_title: this.entry.route_title || null,
        route_path: this.entry.route_path || null,
        route_name: this.entry.route_name || null,
        from_path: this.entry.from_path || null,
        from_name: this.entry.from_name || null
      };
    },

    cardClass() {
      if (!this.isValidEntry) return {};
      return {
        'activity-entry': this.safeEntry.type === 'app_entry',
        'activity-visit': this.safeEntry.type === 'page_visit'
      };
    }
  },
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return 'Неизвестно';

      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return 'Неизвестно';

        return date.toLocaleString('ru-RU', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch {
        return 'Неизвестно';
      }
    }
  }
};
</script>

<style scoped>
.user-activity-card {
  display: flex;
  gap: 15px;
  padding: 15px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
}

.user-activity-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-color: #2196F3;
}

.activity-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 10px;
}

.user-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.activity-time {
  color: #666;
  font-size: 12px;
  white-space: nowrap;
}

.activity-details {
  margin-bottom: 5px;
}

.activity-type {
  color: #555;
  font-size: 14px;
}

.activity-from {
  color: #999;
  font-size: 12px;
  font-style: italic;
}

.activity-entry {
  border-left: 3px solid #4CAF50;
}

.activity-visit {
  border-left: 3px solid #2196F3;
}

@media (max-width: 768px) {
  .user-activity-card {
    padding: 12px;
    gap: 10px;
  }
  
  .activity-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .activity-time {
    font-size: 11px;
  }
}
</style>

