<template>
  <div class="sector-header-component" :class="`sector-${sectorId}-header`">
    <div class="sector-icon">{{ icon }}</div>
    <div class="sector-info">
      <h3 class="sector-name">{{ name }}</h3>
      <p class="sector-description">{{ description }}</p>
    </div>
    <div class="sector-badges">
      <span v-if="moduleCount > 0" class="badge badge-modules">
        {{ moduleCount }} модул{{ getModuleWord(moduleCount) }}
      </span>
      <span v-if="hasNewModules" class="badge badge-new">Новое</span>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SectorHeader',
  props: {
    sectorId: {
      type: String,
      required: true
    },
    icon: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    },
    moduleCount: {
      type: Number,
      default: 0
    },
    hasNewModules: {
      type: Boolean,
      default: false
    }
  },

  methods: {
    getModuleWord(count) {
      if (count === 1) return 'ь'
      if (count >= 2 && count <= 4) return 'я'
      return 'ей'
    }
  }
}
</script>

<style scoped>
.sector-header-component {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  margin-bottom: 16px;
}

.sector-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sector-bg-color, #f8f9fa);
  border: 1px solid var(--sector-border-color, #dee2e6);
  border-radius: 8px;
}

.sector-info {
  flex: 1;
}

.sector-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--sector-color, #007bff);
}

.sector-description {
  margin: 4px 0 0 0;
  font-size: 14px;
  color: #666;
  opacity: 0.8;
}

.sector-badges {
  display: flex;
  gap: 8px;
}

.badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.badge-modules {
  background: #e9ecef;
  color: #495057;
}

.badge-new {
  background: #d4edda;
  color: #155724;
}
</style>