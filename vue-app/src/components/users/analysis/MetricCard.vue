<template>
  <div class="metric-card" :class="trendClass" @click="handleClick">
    <div class="metric-header">
      <div class="metric-icon">
        <span>{{ icon }}</span>
      </div>
      <div class="metric-trend" v-if="showTrend && (change !== 0 || changePercent !== 0)">
        <span class="trend-icon">{{ trendIcon }}</span>
        <span class="trend-value">{{ formattedChange }}</span>
      </div>
    </div>

    <div class="metric-content">
      <div class="metric-value" :style="{ color: color }">
        {{ formattedValue }}
      </div>
      <div class="metric-title">{{ title }}</div>
      <div class="metric-subtitle" v-if="subtitle">{{ subtitle }}</div>
      <div class="metric-comparison" v-if="showComparison && previousValue !== undefined">
        <span class="comparison-label">vs предыдущий период:</span>
        <span class="comparison-value">{{ formattedPreviousValue }}</span>
      </div>
    </div>

    <div class="metric-actions" v-if="drillDown">
      <button class="drill-down-btn" @click.stop="handleDrillDown">
        Подробнее
      </button>
    </div>

    <!-- Hover эффект -->
    <div class="metric-hover-overlay" v-if="interactive">
      <div class="hover-content">
        <div class="hover-title">Нажмите для деталей</div>
        <div class="hover-subtitle" v-if="changePercent !== 0">
          Изменение: {{ formattedChangePercent }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MetricCard',
  props: {
    metric: {
      type: Object,
      required: true,
      validator: (metric) => {
        return metric.id && metric.title && typeof metric.value !== 'undefined';
      }
    },
    interactive: {
      type: Boolean,
      default: true
    },
    showTrend: {
      type: Boolean,
      default: true
    },
    showComparison: {
      type: Boolean,
      default: false
    },
    drillDown: {
      type: Boolean,
      default: false
    }
  },
  emits: ['click', 'drill-down'],
  computed: {
    // Вычисляемые свойства на основе props.metric
    title() {
      return this.metric.title || '';
    },

    value() {
      return this.metric.value || 0;
    },

    previousValue() {
      return this.metric.previousValue;
    },

    change() {
      return this.metric.change || 0;
    },

    changePercent() {
      return this.metric.changePercent || 0;
    },

    trend() {
      return this.metric.trend || 'neutral';
    },

    icon() {
      return this.metric.icon || '📊';
    },

    color() {
      return this.metric.color || '#2196F3';
    },

    drillDownRoute() {
      return this.metric.drillDownRoute;
    },

    subtitle() {
      return this.metric.subtitle;
    },

    // Форматированные значения
    formattedValue() {
      return this.formatValue(this.value);
    },

    formattedPreviousValue() {
      return this.formatValue(this.previousValue);
    },

    formattedChange() {
      const change = Math.abs(this.change);
      const percent = Math.abs(this.changePercent);

      if (percent !== 0) {
        return `${this.change >= 0 ? '+' : '-'}${percent.toFixed(1)}%`;
      } else if (change !== 0) {
        return this.formatValue(change, true);
      }
      return '';
    },

    formattedChangePercent() {
      return `${this.changePercent >= 0 ? '+' : ''}${this.changePercent.toFixed(1)}%`;
    },

    // Классы для стилизации
    trendClass() {
      return {
        'trend-up': this.trend === 'up',
        'trend-down': this.trend === 'down',
        'trend-neutral': this.trend === 'neutral',
        'interactive': this.interactive,
        'has-drill-down': this.drillDown
      };
    },

    // Иконка тренда
    trendIcon() {
      switch (this.trend) {
        case 'up': return '📈';
        case 'down': return '📉';
        default: return '➡️';
      }
    }
  },
  methods: {
    // Форматирование значения
    formatValue(value, isChange = false) {
      if (value === null || value === undefined) return '0';

      // Если это время/длительность
      if (typeof value === 'string' && (value.includes('м') || value.includes('с') || value.includes('ч'))) {
        return value;
      }

      // Если это число
      if (typeof value === 'number') {
        if (value >= 1000000) {
          return (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
          return (value / 1000).toFixed(1) + 'K';
        } else if (Number.isInteger(value)) {
          return value.toLocaleString('ru-RU');
        } else {
          return value.toFixed(1);
        }
      }

      return String(value);
    },

    // Обработчик клика
    handleClick() {
      if (this.interactive) {
        this.$emit('click', this.metric);
      }
    },

    // Обработчик drill-down
    handleDrillDown() {
      this.$emit('drill-down', this.metric);
    }
  }
};
</script>

<style scoped>
.metric-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
  position: relative;
  transition: all 0.3s ease;
  cursor: default;
  overflow: hidden;
}

.metric-card.interactive {
  cursor: pointer;
}

.metric-card.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  border-color: #2196F3;
}

.metric-card.has-drill-down {
  border-bottom: 3px solid #2196F3;
}

.metric-card.trend-up {
  border-left: 4px solid #4CAF50;
}

.metric-card.trend-down {
  border-left: 4px solid #F44336;
}

.metric-card.trend-neutral {
  border-left: 4px solid #9E9E9E;
}

.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.metric-icon {
  font-size: 24px;
  opacity: 0.8;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
}

.metric-card.trend-up .metric-trend {
  color: #4CAF50;
  background: rgba(76, 175, 80, 0.1);
}

.metric-card.trend-down .metric-trend {
  color: #F44336;
  background: rgba(244, 67, 54, 0.1);
}

.metric-card.trend-neutral .metric-trend {
  color: #9E9E9E;
  background: rgba(158, 158, 158, 0.1);
}

.trend-icon {
  font-size: 14px;
}

.trend-value {
  white-space: nowrap;
}

.metric-content {
  text-align: left;
}

.metric-value {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 4px;
  line-height: 1.2;
}

.metric-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 2px;
  font-weight: 500;
}

.metric-subtitle {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
  font-style: italic;
}

.metric-comparison {
  font-size: 11px;
  color: #888;
  margin-top: 8px;
}

.comparison-label {
  margin-right: 4px;
}

.comparison-value {
  font-weight: 500;
  color: #666;
}

.metric-actions {
  margin-top: 16px;
  text-align: center;
}

.drill-down-btn {
  background: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.drill-down-btn:hover {
  background: #1976D2;
}

.metric-hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(33, 150, 243, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.metric-card:hover .metric-hover-overlay {
  opacity: 1;
}

.hover-content {
  text-align: center;
  color: white;
}

.hover-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.hover-subtitle {
  font-size: 12px;
  opacity: 0.9;
}

/* Анимации */
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.02); }
  100% { transform: scale(1); }
}

.metric-card.trend-up {
  animation: pulse 2s infinite;
}

.metric-card.trend-down {
  animation: pulse 2s infinite;
}

/* Responsive */
@media (max-width: 768px) {
  .metric-card {
    padding: 16px;
  }

  .metric-value {
    font-size: 28px;
  }

  .metric-header {
    margin-bottom: 12px;
  }

  .metric-icon {
    font-size: 20px;
  }

  .metric-trend {
    font-size: 11px;
    padding: 3px 6px;
  }

  .drill-down-btn {
    padding: 6px 12px;
    font-size: 11px;
  }
}

@media (max-width: 480px) {
  .metric-card {
    padding: 12px;
  }

  .metric-value {
    font-size: 24px;
  }

  .metric-title {
    font-size: 13px;
  }

  .metric-subtitle {
    font-size: 11px;
  }
}
</style>