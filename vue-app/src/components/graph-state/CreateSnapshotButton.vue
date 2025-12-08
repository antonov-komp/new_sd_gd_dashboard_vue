<template>
  <div v-if="isUserAdmin" class="create-snapshot-button-container">
    <!-- Кнопка создания слепка -->
    <button
      class="create-snapshot-btn"
      @click="openModal"
      :disabled="isLoading"
      title="Создать слепок состояния сектора"
    >
      <span class="btn-icon">📸</span>
      <span class="btn-text">Создать слепок</span>
    </button>

    <!-- Модальное окно подтверждения -->
    <Teleport to="body">
      <Transition name="modal">
          <div
            v-if="isModalOpen"
            class="modal-overlay"
            @click.self="!isLoading && closeModal()"
          >
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Создать слепок состояния сектора</h3>
              <button
                class="modal-close"
                @click="closeModal"
                :disabled="isLoading"
                aria-label="Закрыть"
              >
                ✕
              </button>
            </div>

            <div class="modal-body">
              <!-- Индикатор прогресса -->
              <div v-if="loadingStep !== 'idle'" class="progress-container">
                <div class="progress-bar-wrapper">
                  <div
                    class="progress-bar"
                    :style="{ width: `${loadingProgress}%` }"
                  ></div>
                </div>
                <div class="progress-text">
                  <span class="progress-percent">{{ Math.round(loadingProgress) }}%</span>
                  <span class="progress-description">{{ loadingDescription }}</span>
                </div>
              </div>

              <!-- Описание (показывается только когда нет загрузки) -->
              <div v-else>
                <p class="modal-description">
                  Будет создан слепок текущего состояния сектора 1С.
                  Слепок будет сохранён с типом "manual" (ручной).
                </p>
                <p class="modal-warning">
                  ⚠️ Процесс создания слепка может занять некоторое время.
                </p>
              </div>
            </div>

            <div class="modal-footer">
              <button
                class="btn btn-secondary"
                @click="closeModal"
                :disabled="isLoading"
              >
                Отмена
              </button>
              <button
                class="btn btn-primary"
                @click="handleCreate"
                :disabled="isLoading"
              >
                <span v-if="isLoading">
                  <span v-if="loadingStep === 'loading_data'">Загрузка данных...</span>
                  <span v-else-if="loadingStep === 'creating_snapshot'">Создание...</span>
                  <span v-else>Обработка...</span>
                </span>
                <span v-else>Создать</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { isAdmin } from '@/config/access-config.js';
import { AccessControlService } from '@/services/access-control-service.js';
import { useNotifications } from '@/composables/useNotifications.js';
import SectorDataAdapter from '@/services/graph-state/SectorDataAdapter.js';
import SnapshotService from '@/services/graph-state/SnapshotService.js';

/**
 * Props компонента
 */
const props = defineProps({
  /**
   * Объект текущего пользователя (опционально)
   * Если не передан, будет получен через AccessControlService
   */
  user: {
    type: Object,
    default: null
  }
});

/**
 * Emits компонента
 */
const emit = defineEmits(['snapshot-created']);

/**
 * Состояние компонента
 */
const currentUser = ref(props.user);
const isModalOpen = ref(false);
const isLoading = ref(false);
const loadingProgress = ref(0); // 0-100
const loadingStep = ref('idle'); // idle, loading_data, creating_snapshot, success, error
const loadingDescription = ref('');

/**
 * Композаблы
 */
const notifications = useNotifications();

/**
 * Проверка, является ли пользователь администратором
 */
const isUserAdmin = computed(() => {
  if (!currentUser.value) {
    return false;
  }
  return isAdmin(currentUser.value);
});

/**
 * Загрузка пользователя при монтировании (если не передан через props)
 */
onMounted(async () => {
  if (!props.user) {
    try {
      const accessResult = await AccessControlService.checkAccess();
      if (accessResult.allowed) {
        currentUser.value = accessResult.user;
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }
});

/**
 * Открытие модального окна
 */
const openModal = () => {
  if (!isUserAdmin.value) {
    notifications.warning('Только администраторы могут создавать слепки');
    return;
  }
  isModalOpen.value = true;
};

/**
 * Закрытие модального окна
 */
const closeModal = () => {
  if (isLoading.value) {
    return; // Не закрывать во время создания
  }
  isModalOpen.value = false;
  // Сброс состояния прогресса
  loadingStep.value = 'idle';
  loadingProgress.value = 0;
  loadingDescription.value = '';
};

/**
 * Обработка создания слепка
 */
const handleCreate = async () => {
  if (isLoading.value) {
    return;
  }

  // Проверка прав администратора
  if (!isUserAdmin.value) {
    notifications.warning('Только администраторы могут создавать слепки');
    return;
  }

  isLoading.value = true;
  loadingStep.value = 'loading_data';
  loadingProgress.value = 0;
  loadingDescription.value = 'Инициализация загрузки данных...';

  try {
    // Шаг 1: Загрузка данных сектора
    loadingDescription.value = 'Загрузка данных сектора из Bitrix24...';
    
    const sectorData = await SectorDataAdapter.getSectorDataForSnapshot({
      useCache: true,
      normalize: true,
      onProgress: (progressInfo) => {
        // Нормализация прогресса: 0-80% для загрузки данных
        const normalizedProgress = Math.min(80, (progressInfo.progress || 0) * 0.8);
        loadingProgress.value = normalizedProgress;
        loadingStep.value = 'loading_data';
        loadingDescription.value = progressInfo.description || progressInfo.details?.description || 'Загрузка данных сектора...';
      }
    });

    // Шаг 2: Создание слепка
    loadingStep.value = 'creating_snapshot';
    loadingProgress.value = 85;
    loadingDescription.value = 'Создание слепка...';

    const user = currentUser.value;
    if (!user) {
      throw new Error('Пользователь не определён');
    }

    const snapshot = await SnapshotService.createSnapshot(
      sectorData,
      'manual',
      {
        createdBy: {
          id: user.ID,
          name: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim() || user.EMAIL || `User ${user.ID}`
        },
        sectorId: '1C'
      }
    );

    // Успех
    loadingStep.value = 'success';
    loadingProgress.value = 100;
    loadingDescription.value = 'Слепок успешно создан!';

    // Уведомление об успехе
    notifications.success('Слепок состояния сектора успешно создан');

    // Эмит события
    emit('snapshot-created', snapshot);

    // Закрытие модального окна через небольшую задержку
    setTimeout(() => {
      closeModal();
    }, 1500);

  } catch (error) {
    // Обработка ошибок
    loadingStep.value = 'error';
    loadingProgress.value = 0;
    loadingDescription.value = 'Ошибка создания слепка';

    console.error('Error creating snapshot:', error);

    // Детальное сообщение об ошибке
    let errorMessage = 'Ошибка создания слепка';
    
    if (error.message) {
      if (error.message.includes('загрузки данных') || error.message.includes('sector data')) {
        errorMessage = 'Не удалось загрузить данные сектора. Проверьте подключение к Bitrix24.';
      } else if (error.message.includes('создания слепка') || error.message.includes('snapshot')) {
        errorMessage = 'Не удалось создать слепок. Обратитесь в поддержку.';
      } else if (error.message.includes('валидац') || error.message.includes('validation')) {
        errorMessage = 'Ошибка валидации данных. Проверьте данные сектора.';
      } else {
        errorMessage = error.message;
      }
    }

    notifications.error(errorMessage);

    // Не закрываем модальное окно при ошибке, чтобы пользователь мог повторить попытку
  } finally {
    isLoading.value = false;
  }
};

/**
 * Закрытие модального окна по Escape
 */
const handleEscape = (event) => {
  if (event.key === 'Escape' && isModalOpen.value && !isLoading.value) {
    closeModal();
  }
};

// Добавление обработчика Escape при монтировании
onMounted(() => {
  window.addEventListener('keydown', handleEscape);
});

// Удаление обработчика при размонтировании
onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape);
});
</script>

<style scoped>
.create-snapshot-button-container {
  display: inline-block;
}

.create-snapshot-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.create-snapshot-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.create-snapshot-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 16px;
}

.btn-text {
  line-height: 1;
}

/* Модальное окно */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.modal-close:hover {
  background-color: #f5f5f5;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.modal-description {
  margin: 0 0 12px 0;
  color: #666;
  line-height: 1.5;
}

.modal-warning {
  margin: 0;
  padding: 12px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
  line-height: 1.5;
}

/* Индикатор прогресса */
.progress-container {
  margin: 20px 0;
}

.progress-bar-wrapper {
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 4px;
  transition: width 0.3s ease;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.progress-text {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.progress-percent {
  font-weight: 600;
  color: #007bff;
}

.progress-description {
  color: #666;
  flex: 1;
  text-align: right;
  margin-left: 12px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #e0e0e0;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #545b62;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Анимации модального окна */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9);
  opacity: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .modal-content {
    margin: 20px;
    max-width: calc(100% - 40px);
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }

  .create-snapshot-btn {
    padding: 8px 12px;
    font-size: 13px;
  }

  .btn-text {
    display: none; /* Скрыть текст на мобильных, оставить только иконку */
  }
}
</style>

