<template>
  <div class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>Создание кеша: {{ module.name }}</h2>
        <button @click="close" class="btn-close">×</button>
      </div>
      
      <div class="modal-body">
        <CacheCreateProgress
          v-if="creating"
          :progress="progress"
          :message="progressMessage"
        />
        
        <div v-else class="create-form">
          <div v-if="supportsModes" class="form-group">
            <label>Режим кеша:</label>
            <select v-model="selectedMode" class="form-control">
              <option v-for="mode in availableModes" :key="mode" :value="mode">
                {{ mode }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Параметры (JSON):</label>
            <textarea
              v-model="paramsJson"
              placeholder='{"product": "1C", ...}'
              rows="5"
              class="form-control"
            ></textarea>
            <small class="form-text">Оставьте пустым для использования параметров по умолчанию</small>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-cancel" :disabled="creating">Отмена</button>
        <button
          @click="handleCreate"
          :disabled="creating"
          class="btn-create"
        >
          <span v-if="creating">Создание...</span>
          <span v-else>Создать кеш</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { CacheCreationService } from '@/services/cache-creation-service.js';
import { CacheNotificationService } from '@/services/cache-notification-service.js';
import CacheCreateProgress from './CacheCreateProgress.vue';

export default {
  name: 'CacheCreateModal',
  components: {
    CacheCreateProgress
  },
  props: {
    module: {
      type: Object,
      required: true
    }
  },
  emits: ['close', 'create'],
  setup(props, { emit }) {
    const creating = ref(false);
    const progress = ref(0);
    const progressMessage = ref('');
    const selectedMode = ref(null);
    const paramsJson = ref('');
    
    const supportsModes = computed(() => {
      return props.module.id.includes('graph-admission-closure') ||
             props.module.id.includes('time-tracking');
    });
    
    const availableModes = computed(() => {
      if (props.module.id.includes('graph-admission-closure')) {
        return ['months', 'weeks'];
      }
      if (props.module.id.includes('time-tracking')) {
        return ['default', 'detailed', 'summary'];
      }
      return [];
    });
    
    const close = () => {
      emit('close');
    };
    
    const handleOverlayClick = (event) => {
      if (event.target === event.currentTarget) {
        close();
      }
    };
    
    const handleCreate = async () => {
      creating.value = true;
      progress.value = 0;
      progressMessage.value = 'Начало создания кеша...';
      
      try {
        // Парсинг параметров
        let params = {};
        if (paramsJson.value.trim()) {
          try {
            params = JSON.parse(paramsJson.value);
          } catch (e) {
            throw new Error('Неверный формат JSON параметров');
          }
        } else {
          // Использование параметров по умолчанию
          params = CacheCreationService.getDefaultParams(props.module.id);
        }
        
        // Уведомление о начале создания
        CacheNotificationService.notifyCacheCreationStarted(props.module.name);
        
        // Создание кеша
        progress.value = 25;
        progressMessage.value = 'Загрузка данных из Bitrix24...';
        
        const result = await CacheCreationService.createCache(
          props.module.id,
          selectedMode.value,
          params
        );
        
        progress.value = 75;
        progressMessage.value = 'Сохранение кеша...';
        
        // Небольшая задержка для визуализации прогресса
        await new Promise(resolve => setTimeout(resolve, 500));
        
        progress.value = 100;
        progressMessage.value = 'Кеш успешно создан!';
        
        // Уведомление об успехе
        CacheNotificationService.notifyCacheCreationSuccess(props.module.name);
        
        // Закрытие модального окна через 1 секунду
        setTimeout(() => {
          emit('create', result);
          close();
        }, 1000);
      } catch (error) {
        console.error('[CacheCreateModal] Error creating cache:', error);
        
        // Уведомление об ошибке
        CacheNotificationService.notifyCacheCreationError(
          props.module.name,
          error.message
        );
        
        creating.value = false;
      }
    };
    
    onMounted(() => {
      // Установка режима по умолчанию
      if (availableModes.value.length > 0) {
        selectedMode.value = availableModes.value[0];
      }
      
      // Установка параметров по умолчанию
      const defaultParams = CacheCreationService.getDefaultParams(props.module.id);
      paramsJson.value = JSON.stringify(defaultParams, null, 2);
    });
    
    return {
      creating,
      progress,
      progressMessage,
      selectedMode,
      paramsJson,
      supportsModes,
      availableModes,
      close,
      handleOverlayClick,
      handleCreate
    };
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-close:hover {
  background-color: #f0f0f0;
}

.modal-body {
  padding: 20px;
}

.create-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-control {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: monospace;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
}

.form-text {
  font-size: 12px;
  color: #666;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn-cancel,
.btn-create {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.btn-cancel {
  background-color: #6c757d;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #5a6268;
}

.btn-create {
  background-color: #007bff;
  color: white;
}

.btn-create:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-cancel:disabled,
.btn-create:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

