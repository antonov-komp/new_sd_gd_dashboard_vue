<template>
  <div
    class="metric-card"
    :class="{
      [`size-${size}`]: true,
      'has-trend': trend !== null,
      'trend-up': trend > 0,
      'trend-down': trend < 0,
      'trend-neutral': trend === 0,
      'interactive': interactive
    }"
    @click="interactive ? $emit('click', metric) : null"
  >
    <div class="metric-header">
      <div class="metric-icon" v-if="icon" v-html="icon"></div>
      <div class="metric-title">{{ title }}</div>
    </div>

    <div class="metric-value-section">
      <div class="metric-value">{{ formattedValue }}</div>
      <div v-if="unit" class="metric-unit">{{ unit }}</div>
    </div>

    <div v-if="subtitle" class="metric-subtitle">{{ subtitle }}</div>

    <div v-if="trend !== null" class="metric-trend">
      <div class="trend-indicator">
        <svg
          v-if="trend > 0"
          viewBox="0 0 24 24"
          width="12"
          height="12"
        >
          <path d="M7 14l5-5 5 5z" fill="currentColor"/>
        </svg>
        <svg
          v-else-if="trend < 0"
          viewBox="0 0 24 24"
          width="12"
          height="12"
        >
          <path d="M7 10l5 5 5-5z" fill="currentColor"/>
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          width="12"
          height="12"
        >
          <path d="M7 12h10v-2H7z" fill="currentColor"/>
        </svg>
      </div>
      <span class="trend-value">{{ Math.abs(trend) }}%</span>
      <span class="trend-period">{{ trendPeriod || 'vs prev' }}</span>
    </div>

    <div v-if="progress !== null" class="metric-progress">
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: `${Math.min(progress, 100)}%` }"
        ></div>
      </div>
      <span class="progress-text">{{ progress }}%</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MetricCard',
  emits: ['click'],
  props: {
    metric: {
      type: Object,
      default: () => ({})
    },
    title: {
      type: String,
      required: true
    },
    value: {
      type: [Number, String],
      required: true
    },
    unit: {
      type: String,
      default: ''
    },
    subtitle: {
      type: String,
      default: ''
    },
    icon: {
      type: String,
      default: ''
    },
    trend: {
      type: Number,
      default: null
    },
    trendPeriod: {
      type: String,
      default: ''
    },
    progress: {
      type: Number,
      default: null
    },
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large', 'compact'].includes(value)
    },
    interactive: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    formattedValue() {
      if (typeof this.value === 'number') {
        if (this.value >= 1000000) {
          return `${(this.value / 1000000).toFixed(1)}M`;
        } else if (this.value >= 1000) {
          return `${(this.value / 1000).toFixed(1)}K`;
        }
        return this.value.toLocaleString();
      }
      return this.value;
    }
  }
};
</script>

<style scoped>
.metric-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  transition: all 0.2s ease;
  cursor: default;
}

.metric-card.interactive {
  cursor: pointer;
}

.metric-card.interactive:hover {
  border-color: #007bff;
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  transform: translateY(-1px);
}

.metric-card.size-compact {
  padding: 12px;
}

.metric-card.size-small {
  padding: 12px;
}

.metric-card.size-small .metric-value {
  font-size: 18px;
}

.metric-card.size-large {
  padding: 20px;
}

.metric-card.size-large .metric-value {
  font-size: 28px;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.metric-icon {
  width: 20px;
  height: 20px;
  color: #6c757d;
}

.metric-title {
  font-size: 12px;
  font-weight: 600;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value-section {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.metric-unit {
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
}

.metric-subtitle {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.metric-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
}

.trend-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.metric-card.trend-up .trend-indicator {
  color: #28a745;
}

.metric-card.trend-down .trend-indicator {
  color: #dc3545;
}

.metric-card.trend-neutral .trend-indicator {
  color: #6c757d;
}

.trend-value {
  color: inherit;
}

.trend-period {
  color: #6c757d;
}

.metric-progress {
  margin-top: 8px;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #e9ecef;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff 0%, #28a745 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: #6c757d;
  text-align: right;
  display: block;
}

/* Responsive */
@media (max-width: 768px) {
  .metric-card {
    padding: 12px;
  }

  .metric-card.size-large {
    padding: 16px;
  }

  .metric-value {
    font-size: 20px;
  }

  .metric-card.size-large .metric-value {
    font-size: 24px;
  }
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
  .metric-card {
    background: #2d3748;
    border-color: #4a5568;
  }

  .metric-title {
    color: #a0aec0;
  }

  .metric-value {
    color: #ffffff;
  }

  .metric-unit {
    color: #a0aec0;
  }

  .metric-subtitle {
    color: #cbd5e0;
  }

  .trend-period {
    color: #a0aec0;
  }

  .progress-bar {
    background: #4a5568;
  }

  .progress-text {
    color: #a0aec0;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  .metric-card {
    border-width: 2px;
  }

  .metric-card.interactive:hover {
    border-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .metric-card,
  .progress-fill {
    transition: none;
  }

  .metric-card.interactive:hover {
    transform: none;
  }
}
</style>