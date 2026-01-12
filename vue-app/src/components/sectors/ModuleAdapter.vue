<template>
  <div class="sector-module-adapter" :class="`module-${moduleConfig.id}`">
    <!-- Заголовок модуля -->
    <div class="module-header">
      <div class="module-icon">{{ moduleConfig.icon }}</div>
      <div class="module-info">
        <h3>{{ moduleConfig.title }}</h3>
        <p>{{ moduleConfig.description }}</p>
      </div>
      <div class="module-actions">
        <!-- Кнопка открытия в полном экране -->
        <button
          @click="openFullView"
          class="btn-module-fullscreen"
          title="Открыть в полном размере"
          :aria-label="`Открыть ${moduleConfig.title} в полном размере`"
        >
          ⛶
        </button>
      </div>
    </div>

    <!-- Содержимое модуля -->
    <div class="module-content">
      <!-- Прелоадер для модуля -->
      <div v-if="isLoading" class="module-loading">
        <div class="loading-spinner"></div>
        <p>Загрузка {{ moduleConfig.title }}...</p>
      </div>

      <!-- Ошибка загрузки модуля -->
      <div v-else-if="error" class="module-error">
        <div class="error-icon">⚠️</div>
        <p>Ошибка загрузки модуля</p>
        <button @click="retryLoad" class="btn-retry">Повторить</button>
      </div>

      <!-- Основной контент модуля -->
      <div v-else class="module-body">
        <!-- ВРЕМЕННАЯ ЗАГЛУШКА -->
        <div class="module-placeholder">
          <div class="placeholder-icon">{{ moduleConfig.icon }}</div>
          <h4>{{ moduleConfig.title }}</h4>
          <p>{{ moduleConfig.description }}</p>
          <div class="placeholder-status">
            <span class="status-badge">В разработке</span>
            <small>Модуль готовится к интеграции</small>
          </div>
          <button @click="openFullView" class="btn-open-full">
            Открыть в полном размере
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// Импортируем компоненты статически для надежности
import SectorDashboard from '@/components/SectorDashboard.vue'
import TicketsTimeTrackingDashboard from '@/components/tickets-time-tracking/TicketsTimeTrackingDashboard.vue'
import GraphStateDashboard from '@/components/graph-state/GraphStateDashboard.vue'
import GraphAdmissionClosureDashboard from '@/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue'
import DashboardSector1C from '@/components/dashboard/DashboardSector1C.vue'

export default {
  name: 'ModuleAdapter',
  props: {
    moduleConfig: {
      type: Object,
      required: true,
      validator: (config) => {
        return config.id && config.title && config.component
      }
    },
    sectorId: {
      type: String,
      required: true
    },
    isCompact: {
      type: Boolean,
      default: true // В секторах модули отображаются в компактном виде
    }
  },

  emits: ['module-ready', 'module-error', 'module-navigate'],

  setup(props, { emit }) {
    const router = useRouter()
    const isLoading = ref(false) // Начинаем с false, так как компоненты уже импортированы
    const error = ref(null)
    const moduleComponent = ref(null)
    const moduleInstance = ref(null)

    // Маппинг компонентов по именам
    const componentMap = {
      'SectorDashboard': SectorDashboard,
      'TicketsTimeTrackingDashboard': TicketsTimeTrackingDashboard,
      'GraphStateDashboard': GraphStateDashboard,
      'GraphAdmissionClosureDashboard': GraphAdmissionClosureDashboard,
      'DashboardSector1C': DashboardSector1C
    }

    // Создаем пропсы для модуля
    const moduleProps = computed(() => {
      const baseProps = {
        isCompact: props.isCompact,
        sectorId: props.sectorId,
        moduleId: props.moduleConfig.id
      }

      // Добавляем специфичные пропсы в зависимости от типа модуля
      switch (props.moduleConfig.component) {
        case 'SectorDashboard':
          return {
            sectorId: props.sectorId // Для универсального дашборда передаем только sectorId
          }

        case 'DashboardSector1C':
          return {
            ...baseProps,
            // Специфичные пропсы для дашборда 1С
            showBreadcrumbs: false, // В секторе не показываем хлебные крошки
            compactMode: true
          }

        case 'GraphStateDashboard':
          return {
            ...baseProps,
            // Специфичные пропсы для графика состояния
            showBreadcrumbs: false,
            compactMode: true,
            autoLoad: false // Не загружаем автоматически в секторе
          }

        case 'TicketsTimeTrackingDashboard':
          return {
            ...baseProps,
            showBreadcrumbs: false,
            compactMode: true
          }

        case 'GraphAdmissionClosureDashboard':
          return {
            ...baseProps,
            showBreadcrumbs: false,
            compactMode: true
          }

        default:
          return baseProps
      }
    })

    // Загружаем компонент модуля
    const loadModuleComponent = async () => {
      try {
        isLoading.value = true
        error.value = null

        // Определяем, какой компонент использовать
        const componentName = props.moduleConfig.component

        if (componentMap[componentName]) {
          // Используем реальный компонент из componentMap
          moduleComponent.value = componentMap[componentName]
          console.log(`[ModuleAdapter] ✅ Loading real component ${componentName} for module ${props.moduleConfig.id} in sector ${props.sectorId}`);
          console.log(`[ModuleAdapter] Component loaded:`, moduleComponent.value);
        } else {
          // Используем placeholder для неизвестных компонентов
          moduleComponent.value = 'div'
          console.log(`[ModuleAdapter] ⚠️ Loading module ${props.moduleConfig.id} for sector ${props.sectorId} - using placeholder (component ${componentName} not found)`);
        }

        emit('module-ready', {
          moduleId: props.moduleConfig.id,
          sectorId: props.sectorId
        })

      } catch (err) {
        console.error(`Failed to load module ${props.moduleConfig.id}:`, err)
        error.value = err.message

        emit('module-error', {
          moduleId: props.moduleConfig.id,
          sectorId: props.sectorId,
          error: err
        })
      } finally {
        isLoading.value = false
      }
    }

    // Открываем модуль в полном размере
    const openFullView = () => {
      if (props.moduleConfig.route) {
        router.push(props.moduleConfig.route)
      } else {
        console.warn(`No route defined for module ${props.moduleConfig.id}`)
      }
    }

    // Повторная попытка загрузки
    const retryLoad = () => {
      loadModuleComponent()
    }

    // Обработчики событий от модуля
    const onModuleReady = (data) => {
      emit('module-navigate', {
        type: 'ready',
        moduleId: props.moduleConfig.id,
        sectorId: props.sectorId,
        data
      })
    }

    const onModuleError = (errorData) => {
      emit('module-navigate', {
        type: 'error',
        moduleId: props.moduleConfig.id,
        sectorId: props.sectorId,
        error: errorData
      })
    }

    const onModuleNavigate = (navigationData) => {
      emit('module-navigate', {
        type: 'navigate',
        moduleId: props.moduleConfig.id,
        sectorId: props.sectorId,
        navigation: navigationData
      })
    }

    // Загружаем компонент при монтировании
    onMounted(() => {
      loadModuleComponent()
    })

    return {
      isLoading,
      error,
      moduleComponent,
      moduleInstance,
      moduleProps,
      openFullView,
      retryLoad,
      onModuleReady,
      onModuleError,
      onModuleNavigate
    }
  }
}
</script>

<style scoped>
.sector-module-adapter {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sector-module-adapter:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  transform: translateY(-2px);
}

.module-header {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  gap: 12px;
}

.module-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.module-info {
  flex: 1;
}

.module-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
}

.module-info p {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #6c757d;
  line-height: 1.3;
}

.module-actions {
  flex-shrink: 0;
}

.btn-module-fullscreen {
  padding: 6px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  color: #6c757d;
  transition: all 0.2s ease;
}

.btn-module-fullscreen:hover {
  border-color: #007bff;
  color: #007bff;
  background: #f8f9ff;
}

.module-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.module-loading,
.module-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
}

.module-loading .loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.module-loading p,
.module-error p {
  margin: 8px 0 0 0;
  color: #6c757d;
  font-size: 14px;
}

.module-error .error-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.btn-retry {
  margin-top: 12px;
  padding: 6px 12px;
  border: 1px solid #007bff;
  border-radius: 4px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 12px;
}

.btn-retry:hover {
  background: #0056b3;
}

.module-body {
  flex: 1;
  overflow: hidden;
  /* Скрываем полосы прокрутки для компактного отображения в секторе */
  /* Каждый модуль сам должен управлять прокруткой если нужно */
}

/* Заглушка модуля */
.module-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  min-height: 200px;
}

.placeholder-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.6;
}

.module-placeholder h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #495057;
}

.module-placeholder p {
  margin: 0 0 16px 0;
  color: #6c757d;
  font-size: 14px;
  line-height: 1.4;
}

.placeholder-status {
  margin-bottom: 20px;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #fff3cd;
  color: #856404;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.placeholder-status small {
  display: block;
  margin-top: 4px;
  color: #6c757d;
  font-size: 11px;
}

.btn-open-full {
  padding: 8px 16px;
  border: 1px solid #007bff;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-open-full:hover {
  background: #0056b3;
  border-color: #0056b3;
}

/* Адаптивность */
@media (max-width: 768px) {
  .module-header {
    padding: 12px;
    gap: 8px;
  }

  .module-icon {
    width: 28px;
    height: 28px;
    font-size: 18px;
  }

  .module-info h3 {
    font-size: 13px;
  }

  .module-info p {
    font-size: 11px;
  }

  .module-content {
    min-height: 150px;
  }

  .module-placeholder {
    padding: 16px;
    min-height: 150px;
  }

  .placeholder-icon {
    font-size: 24px;
  }

  .module-placeholder h4 {
    font-size: 14px;
  }

  .module-placeholder p {
    font-size: 12px;
  }
}
</style>