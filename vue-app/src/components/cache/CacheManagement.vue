<template>
  <div class="cache-management">
    <!-- Заголовок с описанием -->
    <div v-if="!loading && !error" class="header-section">
      <h1>🗑️ Ручное управление кешем</h1>
      <p class="description">
        Управление кешем системы сгруппировано по важности для удобства администрирования
      </p>
      <div class="stats-bar">
        <span class="stat-item">
          <strong>{{ totalModules }}</strong> всего модулей
        </span>
        <span class="stat-item">
          <strong>{{ logicalPrimaryCount }}</strong> основных
        </span>
        <span class="stat-item">
          <strong>{{ (secondaryModules || []).length }}</strong> дополнительных
        </span>
      </div>

      <!-- Кнопки управления всем кешем -->
      <div class="global-actions" v-if="!loading && !error">
        <button
          @click="handleClearAllCache"
          :disabled="clearingAll"
          class="btn-clear-all"
          :class="{ 'btn-disabled': clearingAll }"
        >
          <span v-if="clearingAll">🧹 Очистка всего кеша...</span>
          <span v-else>🗑️ Очистить весь кеш</span>
        </button>
      </div>
    </div>

    <!-- Детальная статистика кеша (временно отключена для отладки) -->
    <!-- <CacheStats v-if="totalModules > 0" :modules="(primaryModules || []).concat(secondaryModules || [])" /> -->

    <!-- Основные модули с расширенной информацией -->
    <section v-if="!loading && !error" class="cache-section primary-modules" :class="{ 'empty': (primaryModules || []).length === 0 }" aria-labelledby="primary-modules-heading">
      <div class="section-header">
        <h2 id="primary-modules-heading">🏆 Основные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count" aria-label="{{ logicalPrimaryCount }} основных модулей">{{ logicalPrimaryCount }}</span>
          <span class="section-badge primary" role="status" aria-label="Приоритетные модули">Приоритет</span>
        </div>
      </div>
      <p class="section-description">
        5 основных модулей для оперативного анализа и мониторинга системы: дашборд сектора 1С, график состояния, графики приема-закрытия и трудозатраты на тикеты сектора 1С.
      </p>

      <div v-if="(primaryModules || []).length > 0" class="modules-container">
        <!-- Отдельные основные модули с новой визуальной иерархией -->
        <div class="modules-grid" v-if="individualPrimaryModules.length > 0">
          <div v-for="module in individualPrimaryModules" :key="module.id" class="module-wrapper">
            <CacheModuleCard
              :module="module"
              :is-primary="true"
              :priority="module.priority"
              @clear="handleModuleClear"
              @refresh="refreshModules"
            />
          </div>
        </div>

        <!-- Группа трудозатрат с новой визуальной иерархией -->
        <div v-if="(timeTrackingModules || []).length > 0" class="time-tracking-group">
          <div class="group-header">
            <h3 class="group-title">⏱️ Трудозатраты на тикеты сектора 1С</h3>
            <span class="group-badge">Основная группа</span>
          </div>
          <p class="group-description">Анализ времени работы с задачами в разных режимах отображения</p>
          <div class="modules-grid">
            <div v-for="module in timeTrackingModules" :key="module.id" class="module-wrapper">
              <CacheModuleCard
                :module="module"
                :is-primary="true"
                :priority="module.priority"
                @clear="handleModuleClear"
                @refresh="refreshModules"
              />
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <p>⚠️ Основные модули кеша не найдены</p>
        <button @click="refreshModules" class="refresh-btn">Обновить список</button>
      </div>
    </section>

    <!-- Стильный разделитель с анимацией -->
    <div v-if="!loading && !error && (secondaryModules || []).length > 0" class="section-divider">
      <div class="divider-line"></div>
      <div class="divider-content">
        <span class="divider-icon">🔧</span>
        <span class="divider-text">Дополнительные модули</span>
        <span class="divider-subtitle">Вспомогательные функции системы</span>
      </div>
      <div class="divider-line"></div>
    </div>

    <!-- Побочные модули с группировкой -->
    <section v-if="!loading && !error && (secondaryModules || []).length > 0" class="cache-section secondary-modules" aria-labelledby="secondary-modules-heading">
      <div class="section-header">
        <h2 id="secondary-modules-heading">🔧 Побочные модули кеша</h2>
        <div class="section-meta">
          <span class="module-count" aria-label="{{ (secondaryModules || []).length }} второстепенных модулей">{{ (secondaryModules || []).length }}</span>
          <span class="section-badge secondary" role="status" aria-label="Служебные модули">Служебные</span>
        </div>
      </div>
      <p class="section-description">
        Модули для администрирования и детального мониторинга системы.
      </p>

      <!-- Группировка по типам с улучшенной визуализацией -->
      <div class="grouped-modules">
        <div
          v-for="group in groupedSecondaryModules"
          :key="group.type"
          class="module-group"
          :class="`group-${group.type}`"
        >
          <div class="group-header">
            <h3 class="group-title">{{ group.title }}</h3>
            <span class="group-badge secondary">{{ group.modules.length }}</span>
          </div>
          <div class="modules-grid">
            <div v-for="module in group.modules" :key="module.id" class="module-wrapper">
              <CacheModuleCard
                :module="module"
                :is-primary="false"
                :group-type="group.type"
                @clear="handleModuleClear"
                @refresh="refreshModules"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Сообщение об ошибке -->
    <div v-if="error" class="error-message" role="alert" aria-live="assertive">
      <h3>❌ Ошибка загрузки модулей кеша</h3>
      <p>{{ error }}</p>
      <button @click="loadModules" class="retry-btn" aria-label="Повторить загрузку модулей кеша">Повторить попытку</button>
    </div>

    <!-- Общий статус загрузки -->
    <div v-if="loading" class="loading-overlay" role="status" aria-live="polite" aria-label="Загрузка модулей кеша">
      <div class="loading-spinner" aria-hidden="true"></div>
      <p>Загрузка модулей кеша...</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { CacheManagementService } from '@/services/cache-management-service.js';
import { getApiUrl } from '@/utils/path-utils.js';
import { sortModuleGroups } from '@/utils/cache-helpers.js';
import CacheModuleCard from './CacheModuleCard.vue';
import CacheStats from './CacheStats.vue';
import { NotificationSystem } from '@/utils/notifications.js';

export default {
  name: 'CacheManagement',
  components: { CacheModuleCard, CacheStats },
  setup() {
    // Реактивные данные
    const primaryModules = ref([]);
    const secondaryModules = ref([]);
    const loading = ref(true); // Начинаем с loading = true
    const error = ref(null);
    const clearingAll = ref(false);

    // Вычисляемые свойства
    const totalModules = computed(() =>
      (primaryModules.value?.length || 0) + (secondaryModules.value?.length || 0)
    );

    // Логическое количество основных модулей (5: дашборд, график состояния, 2 графика приема-закрытия, трудозатраты)
    const logicalPrimaryCount = computed(() => {
      const individualCount = individualPrimaryModules.value?.length || 0;
      const timeTrackingCount = (timeTrackingModules.value?.length || 0) > 0 ? 1 : 0;
      return individualCount + timeTrackingCount;
    });

    // Разделяем основные модули на индивидуальные и группу трудозатрат
    const individualPrimaryModules = computed(() => {
      const result = (primaryModules.value || []).filter(module =>
        !module.id.includes('time-tracking')
      );
      console.log('[CacheManagement] individualPrimaryModules:', result.length, result.map(m => m.id));
      return result;
    });

    const timeTrackingModules = computed(() => {
      const result = (primaryModules.value || []).filter(module =>
        module.id.includes('time-tracking')
      ).sort((a, b) => {
        // Сортировка внутри группы трудозатрат
        const order = ['time-tracking-default', 'time-tracking-detailed', 'time-tracking-summary'];
        return order.indexOf(a.id) - order.indexOf(b.id);
      });
      console.log('[CacheManagement] timeTrackingModules:', result.length, result.map(m => m.id));
      return result;
    });

    const groupedSecondaryModules = computed(() => {
      const groups = {};
      (secondaryModules.value || []).forEach(module => {
        const type = CacheManagementService.getModuleType(module.id);
        if (!groups[type]) {
          groups[type] = {
            type,
            title: getGroupTitle(type),
            modules: []
          };
        }
        groups[type].modules.push(module);
      });

      // Сортируем группы по приоритету
      const sortedGroups = Object.values(groups).sort((a, b) => {
        const typeOrder = ['users', 'activity', 'webhooks', 'other'];
        const aIndex = typeOrder.indexOf(a.type);
        const bIndex = typeOrder.indexOf(b.type);

        const aFinalIndex = aIndex === -1 ? 999 : aIndex;
        const bFinalIndex = bIndex === -1 ? 999 : bIndex;

        return aFinalIndex - bFinalIndex;
      });

      return sortedGroups;
    });

    // Методы
    const loadModules = async () => {
      loading.value = true;
      error.value = null;

      try {
        // Получаем categorized данные через CacheManagementService
        const categorized = await CacheManagementService.getCacheStatus();

        primaryModules.value = categorized.primaryModules || [];
        secondaryModules.value = categorized.secondaryModules || [];

        console.log('[CacheManagement] Primary modules:', primaryModules.value.length, primaryModules.value.map(m => ({id: m.id, name: m.name})));
        console.log('[CacheManagement] Secondary modules:', secondaryModules.value.length, secondaryModules.value.map(m => ({id: m.id, name: m.name})));
      } catch (err) {
        console.error('[CacheManagement] Error loading modules:', err);
        error.value = err.message;
      } finally {
        loading.value = false;
      }
    };


    const getGroupTitle = (type) => {
      const titles = {
        users: '👥 Управление пользователями',
        activity: '📊 Отслеживание активности',
        webhooks: '🔗 Логи вебхуков',
        other: '🔧 Прочие модули'
      };
      return titles[type] || titles.other;
    };

    const handleModuleClear = async (moduleId) => {
      // Логика очистки модуля с подтверждением
      console.log(`[CacheManagement] Clearing module: ${moduleId}`);

      // Очистка кеша категоризации перед загрузкой новых данных
      CacheManagementService.invalidateCacheAfterModuleOperation();

      await loadModules(); // Перезагрузка после очистки
    };

    const handleClearAllCache = async () => {
      // Очистка всего кеша со всех модулей
      console.log('[CacheManagement] Clearing all cache');

      clearingAll.value = true;
      try {
        // Используем API для очистки всего кеша
        await CacheManagementService.clearCache('all');

        // Очистка кеша категоризации
        CacheManagementService.invalidateCacheAfterModuleOperation();

        // Показываем уведомление об успехе
        NotificationSystem.success(
          'Кеш полностью очищен',
          'Все файлы кеша были успешно удалены'
        );

        // Перезагружаем список модулей
        await loadModules();
      } catch (error) {
        console.error('[CacheManagement] Error clearing all cache:', error);

        // Показываем уведомление об ошибке
        NotificationSystem.error(
          'Ошибка очистки кеша',
          `Не удалось очистить весь кеш: ${error.message}`
        );
      } finally {
        clearingAll.value = false;
      }
    };

    const handleCreateMock = async (module) => {
      console.log(`[CacheManagement] Creating cache for: ${module.name} (${module.id})`);
      alert(`Создание кеша для модуля: ${module.name}\nID: ${module.id}\nЭто mock функция для тестирования интерфейса.`);
    };

    const handleClearMock = async (module) => {
      console.log(`[CacheManagement] Clearing cache for: ${module.name} (${module.id})`);
      alert(`Очистка кеша для модуля: ${module.name}\nID: ${module.id}\nЭто mock функция для тестирования интерфейса.`);
    };

    const refreshModules = () => {
      loadModules();
    };

    // Инициализация
    onMounted(() => {
      loadModules();
    });

    return {
      primaryModules,
      secondaryModules,
      loading,
      error,
      totalModules,
      groupedSecondaryModules,
      individualPrimaryModules,
      timeTrackingModules,
      logicalPrimaryCount,
      clearingAll,
      handleModuleClear,
      handleClearAllCache,
      handleCreateMock,
      handleClearMock,
      refreshModules
    };
  }
};
</script>

<style scoped>
.cache-management {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header-section {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-section h1 {
  margin: 0 0 10px 0;
  font-size: 28px;
  font-weight: 700;
  color: #333;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.description {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #666;
  line-height: 1.5;
}

.stats-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  flex-wrap: wrap;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-size: 14px;
  color: #555;
}

.cache-section {
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.cache-section:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.primary-modules {
  border: 3px solid #007bff;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
}

.secondary-modules {
  border: 2px solid #dee2e6;
  background: #f8f9fa;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.section-header h2 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #333;
}

.section-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.module-count {
  font-size: 18px;
  font-weight: bold;
  color: #555;
}

.section-badge {
  padding: 6px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-badge.primary {
  background: linear-gradient(135deg, #007bff, #0056b3);
  color: white;
}

.section-badge.secondary {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
}

.section-description {
  padding: 0 25px 20px;
  margin: 0;
  font-size: 15px;
  color: #666;
  line-height: 1.5;
}

.modules-container {
  padding: 25px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 30px;
}

.module-wrapper {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.module-wrapper:hover {
  transform: translateY(-4px);
}

.time-tracking-group {
  border: 3px solid #007bff;
  border-radius: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  margin-bottom: 30px;
  box-shadow: 0 4px 15px rgba(0, 123, 255, 0.15);
  position: relative;
}

.time-tracking-group::before {
  content: '🏆';
  position: absolute;
  top: -12px;
  left: 20px;
  background: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #007bff;
  font-size: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-left: 40px; /* Учитываем иконку */
}

.group-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #007bff;
  text-shadow: 0 1px 2px rgba(0, 123, 255, 0.2);
}

.group-description {
  margin: 0 0 20px 40px;
  font-size: 15px;
  color: #666;
  font-style: italic;
  line-height: 1.5;
}

.group-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-badge.secondary {
  background: linear-gradient(135deg, #6c757d, #495057);
  color: white;
}

.section-divider {
  display: flex;
  align-items: center;
  margin: 40px 0;
  opacity: 0;
  /* animation: fadeInDivider 1s ease-out 0.5s forwards; - убрана анимация появления */
}

/* @keyframes fadeInDivider - удалено по требованию пользователя */

/* Анимации для карточек */
.modules-container .module-wrapper {
  /* animation: slideInUp 0.6s ease-out both; - убрана анимация появления */
}

.modules-container .module-wrapper:nth-child(1) { /* animation-delay: 0.1s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(2) { /* animation-delay: 0.2s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(3) { /* animation-delay: 0.3s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(4) { /* animation-delay: 0.4s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(5) { /* animation-delay: 0.5s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(6) { /* animation-delay: 0.6s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(7) { /* animation-delay: 0.7s; - убрана задержка */ }
.modules-container .module-wrapper:nth-child(8) { /* animation-delay: 0.8s; - убрана задержка */ }

/* @keyframes slideInUp - удалено по требованию пользователя */

/* Анимации для групповых модулей */
.module-group {
  /* animation: fadeInScale 0.5s ease-out both; - убрана анимация появления */
}

.module-group:nth-child(1) { /* animation-delay: 0.1s; - убрана задержка */ }
.module-group:nth-child(2) { /* animation-delay: 0.2s; - убрана задержка */ }
.module-group:nth-child(3) { /* animation-delay: 0.3s; - убрана задержка */ }

/* @keyframes fadeInScale - удалено по требованию пользователя */

/* @keyframes pulse - удалено по требованию пользователя */

.expiring-soon {
  /* animation: pulse 2s infinite; - убрана анимация дыхания */
}

.divider-line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, transparent, #dee2e6, transparent);
}

.divider-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 30px;
  text-align: center;
}

.divider-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.divider-text {
  font-size: 18px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 4px;
}

.divider-subtitle {
  font-size: 14px;
  color: #6c757d;
}

.grouped-modules {
  padding: 25px;
}

.module-group {
  margin-bottom: 40px;
  border-radius: 12px;
  overflow: hidden;
  background: #f8f9fa;
  border: 2px solid #dee2e6;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.module-group:hover {
  border-color: #adb5bd;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-group:last-child {
  margin-bottom: 0;
}

.group-users {
  border-color: #17a2b8;
  background: linear-gradient(135deg, #f8ffff 0%, #f8f9fa 100%);
}

.group-activity {
  border-color: #ffc107;
  background: linear-gradient(135deg, #fffef8 0%, #f8f9fa 100%);
}

.group-webhooks {
  border-color: #6f42c1;
  background: linear-gradient(135deg, #fbf8ff 0%, #f8f9fa 100%);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.group-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.group-users .group-title::before { content: '👥'; }
.group-activity .group-title::before { content: '📊'; }
.group-webhooks .group-title::before { content: '🔗'; }
.group-other .group-title::before { content: '🔧'; }

.empty-state {
  text-align: center;
  padding: 40px 25px;
  color: #666;
}

.empty-state p {
  font-size: 16px;
  margin-bottom: 20px;
}

.refresh-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.3s ease;
}

.refresh-btn:hover {
  background: #0056b3;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-overlay p {
  font-size: 16px;
  color: #666;
  margin: 0;
}

/* Адаптивность */
@media (max-width: 768px) {
  .cache-management {
    padding: 15px;
  }

  .header-section {
    padding: 20px;
    margin-bottom: 30px;
  }

  .header-section h1 {
    font-size: 24px;
  }

  .stats-bar {
    gap: 15px;
  }

  .stat-item {
    padding: 6px 12px;
    font-size: 13px;
  }

  .section-header {
    padding: 15px 20px;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .section-header h2 {
    font-size: 20px;
  }

  .modules-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 20px;
  }

  .section-divider {
    flex-direction: column;
    gap: 15px;
    margin: 30px 0;
  }

  .divider-line {
    width: 100%;
    height: 1px;
  }

  .divider-content {
    padding: 0;
  }
}

.error-message {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  color: #721c24;
}

.error-message h3 {
  margin: 0 0 10px 0;
  color: #721c24;
}

.error-message p {
  margin: 0 0 15px 0;
}

.retry-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.retry-btn:hover {
  background: #c82333;
}

@media (max-width: 480px) {
  .header-section h1 {
    font-size: 20px;
  }

  .description {
    font-size: 14px;
  }

  .section-header h2 {
    font-size: 18px;
  }

  .modules-grid {
    padding: 15px;
  }
}
</style>