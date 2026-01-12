<template>
  <div class="sector-container" :class="`sector-${sectorConfig.id}`">
    <!-- Заголовок сектора -->
    <div class="sector-header">
      <div class="sector-header-left">
        <div class="sector-icon">{{ sectorConfig.icon }}</div>
        <div class="sector-title">
          <h2>{{ sectorConfig.name }}</h2>
          <p>{{ sectorConfig.description }}</p>
        </div>
      </div>

      <div class="sector-actions">
        <button
          @click="toggleExpanded"
          class="btn-toggle-sector"
        >
          {{ expanded ? 'Свернуть' : 'Развернуть' }}
        </button>
      </div>
    </div>

    <!-- Контент сектора -->
    <div v-if="expanded" class="sector-content">
      <!-- Прелоадер загрузки сектора -->
      <div v-if="loading" class="sector-loading">
        <div class="loading-spinner"></div>
        <p>Загрузка сектора {{ sectorConfig.name }}...</p>
      </div>

      <!-- Модули сектора -->
      <div v-else-if="sectorModules.length > 0" class="sector-modules-grid">
        <ModuleAdapter
          v-for="module in sectorModules"
          :key="module.id"
          :module-config="module"
          :sector-id="sectorConfig.id"
          :is-compact="true"
          @module-ready="onModuleReady"
          @module-error="onModuleError"
          @module-navigate="onModuleNavigate"
        />
      </div>

      <!-- Сообщение об отсутствии модулей -->
      <div v-else class="no-modules">
        <p>Модули для сектора "{{ sectorConfig.name }}" находятся в разработке</p>
        <button
          v-if="canNavigateToDashboard"
          @click="navigateToSectorDashboard"
          class="btn-sector-dashboard"
        >
          <span class="icon">📊</span>
          Открыть полный дашборд сектора
        </button>
      </div>

      <!-- Кнопка перехода к полному дашборду (если есть модули) -->
      <div v-if="sectorModules.length > 0 && canNavigateToDashboard" class="sector-dashboard-link">
        <button
          @click="navigateToSectorDashboard"
          class="btn-sector-dashboard"
        >
          <span class="icon">📊</span>
          Открыть полный дашборд сектора
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import ModuleAdapter from './sectors/ModuleAdapter.vue'

export default {
  name: 'SectorContainer',
  components: {
    ModuleAdapter
  },
  props: {
    sectorConfig: {
      type: Object,
      required: true,
      validator: (config) => {
        return config.id && config.name && config.icon
      }
    }
  },

  emits: ['module-ready', 'module-error', 'module-event', 'sector-expanded', 'sector-collapsed'],

  setup(props, { emit }) {
    const router = useRouter()
    const expanded = ref(false)
    const loading = ref(false)
    const sectorModules = ref([])

    // Определяем, есть ли модули в секторе
    const hasModules = computed(() => {
      return props.sectorConfig.modules && props.sectorConfig.modules.length > 0
    })

    // Можно ли перейти к полному дашборду сектора
    const canNavigateToDashboard = computed(() => {
      // Пока возвращаем false, так как полные дашборды еще не реализованы
      return false
    })

    // Загружаем модули при монтировании
    onMounted(async () => {
      if (hasModules.value) {
        await loadSectorModules()
      }
    })

    // Загрузка модулей сектора
    const loadSectorModules = async () => {
      loading.value = true

      try {
        // Используем модули из конфигурации сектора
        sectorModules.value = props.sectorConfig.modules || []

        emit('module-ready', {
          sectorId: props.sectorConfig.id,
          modulesCount: sectorModules.value.length
        })

      } catch (error) {
        console.error(`Failed to load modules for sector ${props.sectorConfig.id}:`, error)
        emit('module-error', {
          sectorId: props.sectorConfig.id,
          error: error.message
        })
      } finally {
        loading.value = false
      }
    }

    // Переключение развертывания сектора
    const toggleExpanded = () => {
      expanded.value = !expanded.value

      if (expanded.value) {
        emit('sector-expanded', { sectorId: props.sectorConfig.id })
      } else {
        emit('sector-collapsed', { sectorId: props.sectorConfig.id })
      }
    }

    // Обработчики событий от ModuleAdapter
    const onModuleReady = (event) => {
      emit('module-ready', {
        sectorId: props.sectorConfig.id,
        moduleId: event.moduleId,
        data: event
      })
    }

    const onModuleError = (event) => {
      emit('module-error', {
        sectorId: props.sectorConfig.id,
        moduleId: event.moduleId,
        error: event.error
      })
    }

    const onModuleNavigate = (event) => {
      emit('module-event', {
        sectorId: props.sectorConfig.id,
        moduleId: event.moduleId,
        event: event
      })
    }

    // Навигация к полному дашборду сектора
    const navigateToSectorDashboard = () => {
      // Пока просто логируем - в будущем будет навигация
      console.log(`Navigate to dashboard for sector: ${props.sectorConfig.id}`)
      // router.push(`/sector/${props.sectorConfig.id}`)
    }

    return {
      expanded,
      loading,
      sectorModules,
      hasModules,
      canNavigateToDashboard,
      toggleExpanded,
      onModuleReady,
      onModuleError,
      onModuleNavigate,
      navigateToSectorDashboard
    }
  }
}
</script>

<style scoped>
/* Стили уже определены в sectors.css */
</style>