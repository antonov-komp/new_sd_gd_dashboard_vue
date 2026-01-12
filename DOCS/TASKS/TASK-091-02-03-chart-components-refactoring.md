# TASK-091-02-03: Рефакторинг компонентов графиков (разделение монолита)

**Дата создания:** 2026-01-12 19:10 (UTC+3, Брест)
**Статус:** Ожидает разработки ⏳
**Оценка трудозатрат:** 16 часов

---

## 🎯 Цель задачи

Разбить монолитный компонент `GraphStateChart.vue` (2000+ строк) на 15+ модульных компонентов с поддержкой ленивой загрузки и системы плагинов.

---

## 📋 План декомпозиции

### Компоненты charts/
- [ ] `LineChart.vue` - линейный график
- [ ] `BarChart.vue` - столбчатый график
- [ ] `DoughnutChart.vue` - кольцевой график
- [ ] `ComboChart.vue` - комбинированный график

### Компоненты controls/
- [ ] `ChartTypeSelector.vue` - переключатель типов
- [ ] `ComparisonSelector.vue` - тип сравнения
- [ ] `TimeRangeSelector.vue` - период времени

### 🎨 Компоненты ui/ (пользовательский интерфейс)

**ChartContainer.vue** - умный контейнер графика (35 строк)
```vue
<template>
  <div class="chart-container-wrapper" :class="{ 'is-loading': loading, 'has-error': error }">
    <!-- Заголовок с управлением -->
    <div class="chart-header">
      <h3 class="chart-title">{{ title }}</h3>
      <div class="chart-actions">
        <button @click="$emit('fullscreen')" title="Полноэкранный режим">⛶</button>
        <button @click="$emit('export')" title="Экспорт">💾</button>
        <button @click="$emit('settings')" title="Настройки">⚙️</button>
      </div>
    </div>

    <!-- Область графика -->
    <div class="chart-canvas-area" :style="{ height: canvasHeight + 'px' }">
      <slot name="chart" />

      <!-- Оверлеи состояния -->
      <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>{{ loadingText || 'Загрузка графика...' }}</p>
      </div>

      <div v-if="error" class="error-overlay">
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <p>{{ error }}</p>
          <button @click="$emit('retry')" class="retry-btn">Повторить</button>
        </div>
      </div>
    </div>

    <!-- Слоты для дополнительных элементов -->
    <slot name="legend" />
    <slot name="controls" />
    <slot name="footer" />
  </div>
</template>

<script>
export default {
  name: 'ChartContainer',
  props: {
    title: { type: String, required: true },
    loading: { type: Boolean, default: false },
    error: { type: String, default: '' },
    height: { type: Number, default: 400 },
    loadingText: { type: String, default: '' }
  },

  emits: ['fullscreen', 'export', 'settings', 'retry'],

  computed: {
    canvasHeight() {
      return Math.max(this.height, 200);
    }
  }
};
</script>

<style scoped>
.chart-container-wrapper {
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}

.chart-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.chart-actions {
  display: flex;
  gap: 8px;
}

.chart-actions button {
  padding: 6px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.chart-actions button:hover {
  border-color: #007bff;
  color: #007bff;
}

.chart-canvas-area {
  position: relative;
  width: 100%;
}

.loading-overlay, .error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 10;
}

.error-message {
  text-align: center;
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.retry-btn {
  margin-top: 12px;
  padding: 8px 16px;
  border: 1px solid #007bff;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
}

.retry-btn:hover {
  background: #0056b3;
}
</style>
```

**ChartTooltip.vue** - расширенные подсказки (25 строк)
```vue
<template>
  <div
    v-if="visible"
    class="chart-tooltip"
    :style="tooltipStyle"
    v-bind="$attrs"
  >
    <div class="tooltip-header" v-if="title">
      <strong>{{ title }}</strong>
    </div>

    <div class="tooltip-body">
      <div
        v-for="item in items"
        :key="item.key"
        class="tooltip-item"
      >
        <div class="item-indicator" :style="{ backgroundColor: item.color }"></div>
        <span class="item-label">{{ item.label }}</span>
        <span class="item-value">{{ item.value }}</span>
      </div>
    </div>

    <div class="tooltip-footer" v-if="footer">
      <small>{{ footer }}</small>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChartTooltip',
  props: {
    visible: { type: Boolean, default: false },
    position: { type: Object, default: () => ({ x: 0, y: 0 }) },
    title: { type: String, default: '' },
    items: { type: Array, default: () => [] },
    footer: { type: String, default: '' }
  },

  computed: {
    tooltipStyle() {
      return {
        left: `${this.position.x}px`,
        top: `${this.position.y}px`,
        transform: this.calculateTransform()
      };
    },

    calculateTransform() {
      // Автоматическое позиционирование чтобы не выходить за границы экрана
      const margin = 10;
      let transform = '';

      if (this.position.x > window.innerWidth / 2) {
        transform += 'translateX(-100%)';
      }

      if (this.position.y > window.innerHeight / 2) {
        transform += ' translateY(-100%)';
      }

      return transform.trim() || 'none';
    }
  }
};
</script>

<style scoped>
.chart-tooltip {
  position: fixed;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 12px 16px;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  pointer-events: none;
  z-index: 1000;
  max-width: 300px;
  font-size: 14px;
}

.tooltip-header {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255,255,255,0.2);
}

.tooltip-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.item-label {
  flex: 1;
}

.item-value {
  font-weight: 600;
  margin-left: auto;
}

.tooltip-footer {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255,255,255,0.2);
  opacity: 0.8;
}
</style>
```

### 🧩 Система плагинов (расширяемость)

**ChartFactory.js** - фабрика с поддержкой плагинов (45 строк)
```javascript
/**
 * Фабрика компонентов графиков с поддержкой плагинов
 */
export class ChartFactory {
  static componentCache = new Map();
  static pluginRegistry = new Map();

  /**
   * Регистрация компонента графика
   */
  static registerChart(type, componentLoader) {
    this.componentCache.set(type, componentLoader);
  }

  /**
   * Регистрация плагина для графика
   */
  static registerPlugin(chartType, plugin) {
    if (!this.pluginRegistry.has(chartType)) {
      this.pluginRegistry.set(chartType, []);
    }
    this.pluginRegistry.get(chartType).push(plugin);
  }

  /**
   * Создание компонента графика с применением плагинов
   */
  static async createChartComponent(type, props = {}, options = {}) {
    const componentLoader = this.componentCache.get(type);
    if (!componentLoader) {
      throw new Error(`Chart type "${type}" not registered`);
    }

    try {
      // Ленивая загрузка базового компонента
      let component = await componentLoader();

      // Применение плагинов
      const plugins = this.pluginRegistry.get(type) || [];
      for (const plugin of plugins) {
        component = await plugin.enhance(component, props, options);
      }

      return component.default || component;

    } catch (error) {
      console.error(`Failed to create chart component "${type}":`, error);
      throw error;
    }
  }

  /**
   * Предварительная загрузка компонента
   */
  static async preloadChart(type) {
    const componentLoader = this.componentCache.get(type);
    if (componentLoader) {
      try {
        await componentLoader();
        console.log(`Chart component "${type}" preloaded`);
      } catch (error) {
        console.warn(`Failed to preload chart "${type}":`, error);
      }
    }
  }

  /**
   * Предварительная загрузка нескольких компонентов
   */
  static async preloadCharts(types = ['line', 'bar', 'combo']) {
    const promises = types.map(type => this.preloadChart(type));
    await Promise.allSettled(promises);
  }

  /**
   * Получение списка зарегистрированных типов графиков
   */
  static getRegisteredTypes() {
    return Array.from(this.componentCache.keys());
  }

  /**
   * Проверка доступности типа графика
   */
  static isChartTypeAvailable(type) {
    return this.componentCache.has(type);
  }
}

// Регистрация стандартных компонентов
ChartFactory.registerChart('line', () => import('./charts/LineChart.vue'));
ChartFactory.registerChart('bar', () => import('./charts/BarChart.vue'));
ChartFactory.registerChart('doughnut', () => import('./charts/DoughnutChart.vue'));
ChartFactory.registerChart('combo', () => import('./charts/ComboChart.vue'));

// Регистрация плагинов
ChartFactory.registerPlugin('line', LineChartAnimationPlugin);
ChartFactory.registerPlugin('bar', BarChartInteractionPlugin);
ChartFactory.registerPlugin('combo', ComboChartThemePlugin);
```

**Пример плагина анимации:**
```javascript
// LineChartAnimationPlugin.js
export class LineChartAnimationPlugin {
  static async enhance(component, props, options) {
    // Добавление анимации к существующему компоненту
    const enhancedComponent = {
      ...component,
      props: {
        ...component.props,
        animationEnabled: {
          type: Boolean,
          default: options.animation !== false
        }
      }
    };

    // Возвращаем расширенный компонент
    return enhancedComponent;
  }
}
```

### 📋 План декомпозиции

#### Этап 1: Извлечение базовых компонентов (8 часов)
- [ ] Создание `BaseChart.vue` с общей логикой Chart.js
- [ ] Реализация `ChartContainer.vue` с управлением состоянием
- [ ] Создание `ChartTooltip.vue` с позиционированием

#### Этап 2: Специализированные компоненты графиков (8 часов)
- [ ] `LineChart.vue` - линейный график с анимацией
- [ ] `BarChart.vue` - столбчатый график с интерактивностью
- [ ] `DoughnutChart.vue` - кольцевой график с легендой
- [ ] `ComboChart.vue` - комбинированный график

#### Этап 3: Компоненты управления (4 часа)
- [ ] `ChartTypeSelector.vue` - переключатель типов
- [ ] `ComparisonSelector.vue` - типы сравнения
- [ ] `ChartSettings.vue` - настройки отображения

#### Этап 4: Система плагинов и тестирование (2 часа)
- [ ] `ChartFactory.js` с поддержкой плагинов
- [ ] Интеграционные тесты компонентов
- [ ] Тестирование ленивой загрузки

---

## 🔗 Зависимости

- [ ] TASK-091-02-02: Универсальный API (базовые абстракции)