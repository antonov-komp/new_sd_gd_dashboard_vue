<template>
  <div class="user-activity-card" :class="cardClass">
    <div class="activity-icon">
      <span v-if="entry.type === 'app_entry'">🚪</span>
      <span v-else-if="entry.type === 'page_visit'">📄</span>
    </div>
    
    <div class="activity-content">
      <div class="activity-header">
        <span class="user-name">{{ entry.user_name || `User #${entry.user_id}` }}</span>
        <span class="activity-time">{{ formatTime(entry.timestamp) }}</span>
      </div>
      
      <div class="activity-details">
        <span v-if="entry.type === 'app_entry'" class="activity-type">
          Открыл приложение
        </span>
        <span v-else-if="entry.type === 'page_visit'" class="activity-type">
          Открыл страницу: {{ entry.route_title || entry.route_path || entry.route_name || 'Неизвестная страница' }}
        </span>
      </div>
      
      <div v-if="entry.type === 'page_visit' && entry.from_path" class="activity-from">
        С: {{ entry.from_name || entry.from_path }}
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
      required: true
    }
  },
  computed: {
    cardClass() {
      return {
        'activity-entry': this.entry.type === 'app_entry',
        'activity-visit': this.entry.type === 'page_visit'
      };
    }
  },
  methods: {
    formatTime(timestamp) {
      if (!timestamp) return 'Неизвестно';
      
      const date = new Date(timestamp);
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
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

