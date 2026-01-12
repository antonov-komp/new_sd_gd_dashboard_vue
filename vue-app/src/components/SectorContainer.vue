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
        <component
          v-for="module in sectorModules"
          :key="module.id"
          :is="getModuleComponent(module)"
          class="module-tile"
          v-bind="getModuleProps(module)"
          @module-event="handleModuleEvent"
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

export default {
  name: 'SectorContainer',
  props: {
    sectorConfig: {
      type: Object,
      required: true,
      validator: (config) => {
        return config.id && config.name && config.icon
      }
    }
  },

  emits: ['module-ready', 'module-error', 'sector-expanded', 'sector-collapsed'],

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
        // Имитируем загрузку модулей из конфигурации
        // В будущем здесь будет асинхронная загрузка компонентов
        sectorModules.value = props.sectorConfig.modules.map(moduleId => ({
          id: moduleId.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-'),
          componentId: moduleId,
          title: getModuleDisplayName(moduleId),
          description: getModuleDescription(moduleId),
          icon: getModuleIcon(moduleId)
        }))

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

    // Получение компонента для модуля
    const getModuleComponent = (module) => {
      // Пока возвращаем заглушку - в будущем здесь будет динамический импорт
      return 'div' // Placeholder component
    }

    // Получение пропсов для модуля
    const getModuleProps = (module) => {
      return {
        moduleConfig: module,
        sectorId: props.sectorConfig.id,
        sectorConfig: props.sectorConfig
      }
    }

    // Обработчик событий модулей
    const handleModuleEvent = (event) => {
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

    // Вспомогательные функции для отображения модулей
    const getModuleDisplayName = (moduleId) => {
      const nameMap = {
        'DashboardSector1C': 'Дашборд сектора 1С',
        'TicketsManagementSector1C': 'Управление тикетами сектора 1С',
        'StateChart': 'График состояния',
        'ChangesVisualization': 'Визуализация изменений'
      }
      return nameMap[moduleId] || moduleId
    }

    const getModuleDescription = (moduleId) => {
      const descMap = {
        'DashboardSector1C': 'Панель управления сектором 1С с основными метриками',
        'TicketsManagementSector1C': 'Управление заявками и задачами сектора 1С',
        'StateChart': 'Визуализация текущего состояния систем сектора 1С',
        'ChangesVisualization': 'Отображение изменений состояния в секторе 1С'
      }
      return descMap[moduleId] || 'Описание модуля'
    }

    const getModuleIcon = (moduleId) => {
      const iconMap = {
        'DashboardSector1C': '⚙️',
        'TicketsManagementSector1C': '📋',
        'StateChart': '📊',
        'ChangesVisualization': '📈'
      }
      return iconMap[moduleId] || '🔧'
    }

    return {
      expanded,
      loading,
      sectorModules,
      hasModules,
      canNavigateToDashboard,
      toggleExpanded,
      getModuleComponent,
      getModuleProps,
      handleModuleEvent,
      navigateToSectorDashboard
    }
  }
}
</script>

<style scoped>
/* Стили уже определены в sectors.css */
</style>