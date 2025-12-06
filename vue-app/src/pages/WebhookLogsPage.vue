<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <h1>Логи вебхуков Bitrix24</h1>
    </div>

    <!-- Проверка доступа -->
    <div v-if="!hasAccess" class="access-denied">
      <p>У вас нет доступа к просмотру логов вебхуков.</p>
    </div>

    <!-- Основной контент -->
    <div v-else class="page-content">
      <!-- Фильтры -->
      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />

      <!-- Список логов -->
      <WebhookLogList
        :logs="logs"
        :loading="loading"
        :error="error"
        :pagination="pagination"
        @select-log="handleLogSelect"
        @page-change="handlePageChange"
      />

      <!-- Overlay для модального окна -->
      <div
        v-if="selectedLog"
        class="modal-overlay"
        @click="handleLogClose"
      ></div>

      <!-- Детальный просмотр -->
      <WebhookLogDetails
        v-if="selectedLog"
        :log="selectedLog"
        @close="handleLogClose"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { isDepartmentAllowed } from '@/config/access-config.js';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import WebhookLogFilters from '@/components/webhooks/WebhookLogFilters.vue';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';
import WebhookLogDetails from '@/components/webhooks/WebhookLogDetails.vue';

export default {
  name: 'WebhookLogsPage',
  components: {
    WebhookLogFilters,
    WebhookLogList,
    WebhookLogDetails
  },
  setup() {
    const hasAccess = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const logs = ref([]);
    const selectedLog = ref(null);
    const filters = ref({
      category: null,
      event: null,
      date: new Date().toISOString().split('T')[0],
      hour: null
    });
    const pagination = ref({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    });

    // Проверка доступа
    const checkAccess = async () => {
      try {
        // Получение информации о текущем пользователе через BX24 API
        const user = await Bitrix24BxApi.getCurrentUser();
        const userDepartmentIds = user?.UF_DEPARTMENT || [];

        // Проверка доступа для каждого отдела пользователя
        if (userDepartmentIds.length > 0) {
          const hasAccessToAnyDepartment = userDepartmentIds.some(deptId => 
            isDepartmentAllowed(deptId)
          );
          hasAccess.value = hasAccessToAnyDepartment;
        } else {
          // Если у пользователя нет отделов, доступ запрещён
          hasAccess.value = false;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        hasAccess.value = false;
      }
    };

    // Загрузка логов
    const loadLogs = async () => {
      if (!hasAccess.value) return;

      loading.value = true;
      error.value = null;

      try {
        const result = await WebhookLogsApiService.getLogs(
          filters.value,
          pagination.value.page,
          pagination.value.limit
        );

        logs.value = result.logs || [];
        pagination.value = result.pagination || pagination.value;
      } catch (err) {
        console.error('Error loading logs:', err);
        error.value = err.message || 'Ошибка загрузки логов';
      } finally {
        loading.value = false;
      }
    };

    // Обработка обновления фильтров
    const handleFiltersUpdate = (newFilters) => {
      filters.value = { ...filters.value, ...newFilters };
      pagination.value.page = 1; // Сброс на первую страницу
      loadLogs();
    };

    // Обработка сброса фильтров
    const handleFiltersReset = () => {
      filters.value = {
        category: null,
        event: null,
        date: new Date().toISOString().split('T')[0],
        hour: null
      };
      pagination.value.page = 1;
      loadLogs();
    };

    // Обработка выбора лога
    const handleLogSelect = (log) => {
      selectedLog.value = log;
    };

    // Обработка закрытия детального просмотра
    const handleLogClose = () => {
      selectedLog.value = null;
    };

    // Обработка смены страницы
    const handlePageChange = (page) => {
      pagination.value.page = page;
      loadLogs();
    };

    onMounted(async () => {
      await checkAccess();
      if (hasAccess.value) {
        await loadLogs();
      }
    });

    return {
      hasAccess,
      loading,
      error,
      logs,
      selectedLog,
      filters,
      pagination,
      handleFiltersUpdate,
      handleFiltersReset,
      handleLogSelect,
      handleLogClose,
      handlePageChange
    };
  }
};
</script>

<style scoped>
.webhook-logs-page {
  padding: 20px;
  min-height: 100vh;
  background: #f5f5f5;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
  font-weight: 600;
}

.access-denied {
  padding: 40px;
  text-align: center;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.access-denied p {
  margin: 0;
  font-size: 16px;
  color: #dc3545;
  font-weight: 500;
}

.page-content {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

@media (max-width: 768px) {
  .webhook-logs-page {
    padding: 10px;
  }

  .page-content {
    padding: 15px;
  }
}
</style>

