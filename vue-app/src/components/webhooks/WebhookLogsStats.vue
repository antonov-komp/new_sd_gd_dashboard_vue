<template>
  <div class="webhook-stats">
    <h3 class="stats-title">Статистика</h3>
    <div class="stats-grid">
      <!-- Общее количество событий -->
      <div class="stat-card stat-card-primary">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-label">Всего событий</div>
          <div class="stat-value">{{ totalEvents }}</div>
          <div class="stat-change" v-if="previousPeriodStats">
            <span :class="getChangeClass(totalEventsChange)">
              {{ formatChange(totalEventsChange) }}
            </span>
            <span class="stat-period">vs предыдущий период</span>
          </div>
        </div>
      </div>

      <!-- Задачи -->
      <div class="stat-card stat-card-info">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-label">Задачи</div>
          <div class="stat-value">{{ tasksCount }}</div>
          <div class="stat-percentage">
            {{ getPercentage(tasksCount, totalEvents) }}% от общего
          </div>
        </div>
      </div>

      <!-- Смарт-процессы -->
      <div class="stat-card stat-card-success">
        <div class="stat-icon">⚙️</div>
        <div class="stat-content">
          <div class="stat-label">Смарт-процессы</div>
          <div class="stat-value">{{ smartProcessesCount }}</div>
          <div class="stat-percentage">
            {{ getPercentage(smartProcessesCount, totalEvents) }}% от общего
          </div>
        </div>
      </div>

      <!-- Ошибки -->
      <div class="stat-card stat-card-danger">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
          <div class="stat-label">Ошибки</div>
          <div class="stat-value">{{ errorsCount }}</div>
          <div class="stat-percentage" v-if="errorsCount > 0">
            {{ getPercentage(errorsCount, totalEvents) }}% от общего
          </div>
          <div class="stat-percentage success" v-else>
            Ошибок нет
          </div>
        </div>
      </div>

      <!-- Средний размер payload -->
      <div class="stat-card stat-card-warning">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
          <div class="stat-label">Средний размер payload</div>
          <div class="stat-value">{{ formatBytes(averagePayloadSize) }}</div>
          <div class="stat-unit">байт</div>
        </div>
      </div>

      <!-- Уникальные IP -->
      <div class="stat-card stat-card-secondary">
        <div class="stat-icon">🌐</div>
        <div class="stat-content">
          <div class="stat-label">Уникальных IP</div>
          <div class="stat-value">{{ uniqueIpsCount }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';

export default {
  name: 'WebhookLogsStats',
  props: {
    logs: {
      type: Array,
      required: true,
      default: () => []
    },
    previousPeriodStats: {
      type: Object,
      default: null
    }
  },
  setup(props) {
    // Основные метрики
    const totalEvents = computed(() => props.logs.length);
    
    const tasksCount = computed(() => 
      props.logs.filter(log => log.category === 'tasks').length
    );
    
    const smartProcessesCount = computed(() => 
      props.logs.filter(log => log.category === 'smart-processes').length
    );
    
    const errorsCount = computed(() => 
      props.logs.filter(log => log.category === 'errors').length
    );
    
    // Средний размер payload
    const averagePayloadSize = computed(() => {
      if (props.logs.length === 0) return 0;
      
      const totalSize = props.logs.reduce((sum, log) => {
        try {
          const payloadSize = JSON.stringify(log.payload || {}).length;
          return sum + payloadSize;
        } catch {
          return sum;
        }
      }, 0);
      
      return Math.round(totalSize / props.logs.length);
    });
    
    // Уникальные IP
    const uniqueIpsCount = computed(() => {
      const ips = new Set();
      props.logs.forEach(log => {
        if (log.ip) {
          ips.add(log.ip);
        }
      });
      return ips.size;
    });
    
    // Процент от общего
    const getPercentage = (value, total) => {
      if (total === 0) return 0;
      return Math.round((value / total) * 100);
    };
    
    // Форматирование байт
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0';
      if (bytes < 1024) return bytes.toString();
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    
    // Изменение по сравнению с предыдущим периодом
    const totalEventsChange = computed(() => {
      if (!props.previousPeriodStats) return null;
      const previous = props.previousPeriodStats.totalEvents || 0;
      const current = totalEvents.value;
      return current - previous;
    });
    
    const getChangeClass = (change) => {
      if (change === null) return '';
      if (change > 0) return 'change-positive';
      if (change < 0) return 'change-negative';
      return 'change-neutral';
    };
    
    const formatChange = (change) => {
      if (change === null) return '';
      const sign = change > 0 ? '+' : '';
      return `${sign}${change}`;
    };
    
    return {
      totalEvents,
      tasksCount,
      smartProcessesCount,
      errorsCount,
      averagePayloadSize,
      uniqueIpsCount,
      getPercentage,
      formatBytes,
      totalEventsChange,
      getChangeClass,
      formatChange
    };
  }
};
</script>

<style scoped>
.webhook-stats {
  margin-bottom: 30px;
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
  gap: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: flex-start;
  gap: 15px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.stat-card-primary {
  border-left: 4px solid #007bff;
}

.stat-card-info {
  border-left: 4px solid #17a2b8;
}

.stat-card-success {
  border-left: 4px solid #28a745;
}

.stat-card-danger {
  border-left: 4px solid #dc3545;
}

.stat-card-warning {
  border-left: 4px solid #ffc107;
}

.stat-card-secondary {
  border-left: 4px solid #6c757d;
}

.stat-icon {
  font-size: 32px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-label {
  font-size: 13px;
  color: #6c757d;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.stat-card-danger .stat-value {
  color: #dc3545;
}

.stat-percentage {
  font-size: 12px;
  color: #6c757d;
}

.stat-percentage.success {
  color: #28a745;
  font-weight: 500;
}

.stat-unit {
  font-size: 12px;
  color: #6c757d;
  margin-top: 4px;
}

.stat-change {
  margin-top: 8px;
  font-size: 12px;
}

.change-positive {
  color: #28a745;
  font-weight: 600;
}

.change-negative {
  color: #dc3545;
  font-weight: 600;
}

.change-neutral {
  color: #6c757d;
}

.stat-period {
  display: block;
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

