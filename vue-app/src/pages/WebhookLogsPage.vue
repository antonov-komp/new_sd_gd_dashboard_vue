<template>
  <div class="webhook-logs-page">
    <div class="page-header">
      <!-- Кнопка "Назад" -->
      <div class="page-header-top">
        <button 
          @click="goBack" 
          class="back-button"
          title="Вернуться на главную страницу"
          aria-label="Вернуться на главную страницу"
        >
          <span class="back-icon" aria-hidden="true">←</span>
          <span class="back-text">Назад</span>
        </button>
      </div>
      <h1>Логи вебхуков Bitrix24</h1>
    </div>

    <!-- Проверка доступа -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="access-denied-content">
        <h2>Доступ запрещён</h2>
        <p>У вас нет доступа к просмотру логов вебхуков.</p>
        <p class="access-hint">
          Доступ разрешён только пользователям из отделов: 
          <strong>{{ allowedDepartmentsText }}</strong>
        </p>
        <p class="access-hint">
          Если вы считаете, что у вас должен быть доступ, обратитесь к администратору системы.
        </p>
        <details class="access-debug" v-if="accessDebugInfo">
          <summary>Отладочная информация</summary>
          <pre>{{ accessDebugInfo }}</pre>
        </details>
      </div>
    </div>

    <!-- Основной контент -->
    <div v-else class="page-content">
      <!-- Дашборд -->
      <WebhookLogsDashboard
        :logs="logs"
        :previous-period-stats="previousPeriodStats"
      />

      <!-- Экспорт и поиск -->
      <div class="actions-bar">
        <WebhookLogsExport
          :logs="filteredLogs"
          :selected-logs="selectedLogs"
          :filters="filters"
          :total-count="filteredLogs.length"
          @export-start="handleExportStart"
          @export-complete="handleExportComplete"
          @export-error="handleExportError"
        />
        <WebhookLogSearch
          v-model="searchQuery"
          @search="handleSearch"
          ref="searchComponent"
        />
      </div>

      <!-- Управление реальным временем -->
      <RealtimeControls
        :enabled="autoUpdateEnabled"
        :connection-state="connectionState"
        :error="realtimeError"
        @toggle="handleToggleAutoUpdate"
      />

      <!-- Индикатор новых событий -->
      <NewLogsIndicator
        :count="newLogsCount"
        @apply="handleApplyNewLogs"
        @dismiss="handleDismissNewLogs"
      />

      <!-- Фильтры -->
      <WebhookLogFilters
        :filters="filters"
        @update:filters="handleFiltersUpdate"
        @reset="handleFiltersReset"
      />

      <!-- Скелетоны при загрузке -->
      <Transition name="fade">
        <SkeletonLogList v-if="loading && logs.length === 0" :rows="5" />
      </Transition>

      <!-- Список логов с анимацией -->
      <Transition name="fade">
        <WebhookLogList
          v-if="!loading && filteredLogs.length > 0"
          :logs="filteredLogs"
          :loading="false"
          :error="null"
          :pagination="pagination"
          :selected-logs="selectedLogs"
          @select-log="handleLogSelect"
          @page-change="handlePageChange"
          @update:selectedLogs="handleSelectedLogsUpdate"
        />
      </Transition>

      <!-- Пустое состояние -->
      <Transition name="fade">
        <EmptyState
          v-if="!loading && filteredLogs.length === 0 && !error && logs.length === 0"
          icon="📭"
          title="Логи не найдены"
          description="Логи вебхуков пока отсутствуют. Они появятся здесь после получения событий от Bitrix24."
          :hints="[
            'Проверьте фильтры по категории и типу события',
            'Убедитесь, что выбран правильный период',
            'Попробуйте очистить все фильтры'
          ]"
          action-label="Очистить фильтры"
          @action="handleFiltersReset"
        />
      </Transition>

      <!-- Пустое состояние при поиске -->
      <Transition name="fade">
        <EmptyState
          v-if="!loading && filteredLogs.length === 0 && !error && logs.length > 0"
          icon="🔍"
          title="Ничего не найдено"
          description="По вашему запросу ничего не найдено. Попробуйте изменить параметры поиска или фильтры."
          :hints="[
            'Проверьте правильность написания поискового запроса',
            'Попробуйте использовать другие фильтры',
            'Очистите поиск и попробуйте снова'
          ]"
          action-label="Очистить поиск"
          @action="handleClearSearch"
        />
      </Transition>

      <!-- Ошибка с возможностью повтора -->
      <Transition name="fade">
        <ErrorDisplay
          v-if="error"
          title="Ошибка загрузки логов"
          :message="error"
          :retryable="true"
          @retry="loadLogs"
        />
      </Transition>

      <!-- Overlay для модального окна -->
      <div
        v-if="selectedLog"
        class="modal-overlay"
        @click="handleLogClose"
      ></div>

      <!-- Детальный просмотр -->
      <Transition name="modal">
        <WebhookLogDetails
          v-if="selectedLog"
          :log="selectedLog"
          @close="handleLogClose"
        />
      </Transition>
    </div>

    <!-- Контейнер уведомлений -->
    <NotificationContainer />
  </div>
</template>

<script>
import { ref, onMounted, computed, watch, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { isDepartmentAllowed, accessConfig } from '@/config/access-config.js';
import { Bitrix24BxApi } from '@/services/bitrix24-bx-api.js';
import { WebhookLogsApiService } from '@/services/webhook-logs-api.js';
import { useUrlFilters } from '@/composables/useUrlFilters.js';
import { searchInLogs } from '@/utils/log-search.js';
import { 
  normalizeWebhookLogEntries,
  isValidWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  validateFilters,
  validatePagination 
} from '@/utils/webhook-validators.js';
// Ленивая загрузка тяжёлых компонентов
const WebhookLogsDashboard = defineAsyncComponent(() => 
  import('@/components/webhooks/WebhookLogsDashboard.vue')
);
const WebhookLogDetails = defineAsyncComponent(() => 
  import('@/components/webhooks/WebhookLogDetails.vue')
);

import WebhookLogsExport from '@/components/webhooks/WebhookLogsExport.vue';
import WebhookLogSearch from '@/components/webhooks/WebhookLogSearch.vue';
import WebhookLogFilters from '@/components/webhooks/WebhookLogFilters.vue';
import WebhookLogList from '@/components/webhooks/WebhookLogList.vue';
import SkeletonLogList from '@/components/common/SkeletonLogList.vue';
import EmptyState from '@/components/common/EmptyState.vue';
import ErrorDisplay from '@/components/common/ErrorDisplay.vue';
import NotificationContainer from '@/components/common/NotificationContainer.vue';
import RealtimeControls from '@/components/webhooks/RealtimeControls.vue';
import NewLogsIndicator from '@/components/webhooks/NewLogsIndicator.vue';
import { useNotifications } from '@/composables/useNotifications.js';
import { useRealtime } from '@/composables/useRealtime.js';

export default {
  name: 'WebhookLogsPage',
  components: {
    WebhookLogsDashboard,
    WebhookLogsExport,
    WebhookLogSearch,
    WebhookLogFilters,
    WebhookLogList,
    WebhookLogDetails,
    SkeletonLogList,
    EmptyState,
    ErrorDisplay,
    NotificationContainer,
    RealtimeControls,
    NewLogsIndicator
  },
  setup() {
    const router = useRouter();
    const { success: showSuccess, error: showError } = useNotifications();
    const hasAccess = ref(false);
    const loading = ref(false);
    const error = ref(null);
    const accessDebugInfo = ref(null);
    const logs = ref([]);
    
    // Безопасный JSON.stringify с защитой от циклических ссылок и реактивных объектов
    const safeStringify = (obj, space = 2) => {
      if (obj === null || obj === undefined) {
        return String(obj);
      }
      
      // Если это уже строка, возвращаем как есть
      if (typeof obj === 'string') {
        return obj;
      }
      
      // Создаём простую копию объекта, извлекая только примитивные значения
      const toPlainObject = (val, depth = 0) => {
        if (depth > 10) return '[Max Depth]'; // Защита от глубокой вложенности
        
        if (val === null || val === undefined) {
          return val;
        }
        
        // Примитивные типы
        if (typeof val !== 'object') {
          return val;
        }
        
        // Массивы
        if (Array.isArray(val)) {
          return val.map(item => toPlainObject(item, depth + 1));
        }
        
        // Объекты - извлекаем только собственные свойства
        const plain = {};
        try {
          for (const key in val) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
              try {
                const propValue = val[key];
                // Пропускаем функции и undefined
                if (typeof propValue === 'function' || propValue === undefined) {
                  continue;
                }
                plain[key] = toPlainObject(propValue, depth + 1);
              } catch (e) {
                plain[key] = '[Error reading property]';
              }
            }
          }
        } catch (e) {
          return '[Error reading object]';
        }
        
        return plain;
      };
      
      try {
        const plainObj = toPlainObject(obj);
        const seen = new WeakSet();
        return JSON.stringify(plainObj, (key, value) => {
          if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
              return '[Circular]';
            }
            seen.add(value);
          }
          return value;
        }, space);
      } catch (e) {
        console.error('[WebhookLogsPage] Error in safeStringify:', e);
        return `[Error: ${e.message}]`;
      }
    };
    const selectedLog = ref(null);
    const selectedLogs = ref([]); // Выбранные записи для экспорта
    const searchQuery = ref('');
    const searchComponent = ref(null);
    const previousPeriodStats = ref(null); // Для сравнения периодов (пока не реализовано)
    const autoUpdateEnabled = ref(false); // Автообновление по умолчанию выключено
    
    // Инициализация реального времени
    const {
      connectionState,
      newLogsCount,
      error: realtimeError,
      connect,
      disconnect,
      applyNewLogs: applyRealtimeLogs,
      clearNewLogs
    } = useRealtime('/api/webhook-realtime.php', {
      autoConnect: false, // Ручное управление
      enableSound: true,
      validateLogs: true, // Включить валидацию новых логов
      onNewLogs: (newLogsData) => {
        console.log('[WebhookLogsPage] New logs received:', newLogsData.length);
        
        // Валидация новых логов уже выполнена в composable
        // Просто добавляем их в начало списка
        if (newLogsData.length > 0) {
          logs.value.unshift(...newLogsData);
          
          // Обновление пагинации
          pagination.value.total += newLogsData.length;
          
          // Уведомление
          showSuccess(`Получено ${newLogsData.length} новых событий`);
        }
      }
    });
    
    // Использование URL фильтров
    const { filters, updateFilters, clearFilters } = useUrlFilters();
    
    const pagination = ref({
      page: 1,
      limit: 50,
      total: 0,
      pages: 0
    });
    
    // Применение поиска и фильтров к логам
    const filteredLogs = computed(() => {
      let result = [...logs.value];
      
      // Поиск
      if (searchQuery.value && searchQuery.value.trim()) {
        result = searchInLogs(result, searchQuery.value, {
          caseSensitive: false,
          searchInEvent: true,
          searchInPayload: true,
          searchInDetails: true,
          searchInIp: true
        });
      }
      
      // Фильтр по категории
      if (filters.value.category) {
        result = result.filter(log => log.category === filters.value.category);
      }
      
      // Фильтр по событию
      if (filters.value.event) {
        result = result.filter(log => log.event === filters.value.event);
      }
      
      // Фильтр по IP
      if (filters.value.ip) {
        result = result.filter(log => log.ip && log.ip.includes(filters.value.ip));
      }
      
      // Фильтр по статусу
      if (filters.value.status) {
        result = result.filter(log => {
          if (filters.value.status === 'error') {
            return log.category === 'errors';
          }
          if (filters.value.status === 'success') {
            return log.category !== 'errors';
          }
          return true;
        });
      }
      
      // Фильтр по дате (от)
      if (filters.value.dateFrom) {
        result = result.filter(log => {
          if (!log.timestamp) return false;
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          return logDate >= filters.value.dateFrom;
        });
      }
      
      // Фильтр по дате (до)
      if (filters.value.dateTo) {
        result = result.filter(log => {
          if (!log.timestamp) return false;
          const logDate = new Date(log.timestamp).toISOString().split('T')[0];
          return logDate <= filters.value.dateTo;
        });
      }
      
      // Фильтр по часу
      if (filters.value.hour !== null) {
        result = result.filter(log => {
          if (!log.timestamp) return false;
          const logHour = new Date(log.timestamp).getHours();
          return logHour === filters.value.hour;
        });
      }
      
      return result;
    });
    
    // Обновление количества результатов поиска
    watch(filteredLogs, (newLogs) => {
      if (searchComponent.value && searchQuery.value) {
        searchComponent.value.setResultsCount(newLogs.length);
      }
    });

    // Проверка доступа
    const checkAccess = async () => {
      try {
        // Инициализация Bitrix24 API
        await Bitrix24BxApi.init();
        
        // Получение информации о текущем пользователе через BX24 API
        const user = await Bitrix24BxApi.getCurrentUser();
        
        console.log('[WebhookLogsPage] User data:', user);
        
        if (!user || !user.ID) {
          console.warn('[WebhookLogsPage] User not determined');
          accessDebugInfo.value = safeStringify({
            error: 'User not determined',
            userId: user?.ID || null,
            userName: user ? `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim() : null
          });
          hasAccess.value = false;
          return;
        }
        
        const userDepartmentIds = user?.UF_DEPARTMENT || [];
        console.log('[WebhookLogsPage] User departments:', userDepartmentIds);
        console.log('[WebhookLogsPage] Allowed departments:', accessConfig.allowedDepartmentIds);

        // Проверка доступа для каждого отдела пользователя
        if (userDepartmentIds.length > 0) {
          const hasAccessToAnyDepartment = userDepartmentIds.some(deptId => 
            isDepartmentAllowed(deptId)
          );
          console.log('[WebhookLogsPage] Has access:', hasAccessToAnyDepartment);
          hasAccess.value = hasAccessToAnyDepartment;
          
          if (!hasAccessToAnyDepartment) {
            accessDebugInfo.value = safeStringify({
              userId: user.ID,
              userName: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim(),
              userDepartments: userDepartmentIds,
              allowedDepartments: accessConfig.allowedDepartmentIds,
              message: 'User departments do not match allowed departments'
            });
          }
        } else {
          // Если у пользователя нет отделов, доступ запрещён
          console.warn('[WebhookLogsPage] User has no departments');
          accessDebugInfo.value = safeStringify({
            userId: user.ID,
            userName: `${user.NAME || ''} ${user.LAST_NAME || ''}`.trim(),
            userDepartments: [],
            allowedDepartments: accessConfig.allowedDepartmentIds,
            message: 'User has no departments assigned'
          });
          hasAccess.value = false;
        }
      } catch (error) {
        console.error('[WebhookLogsPage] Error checking access:', error);
        accessDebugInfo.value = safeStringify({
          error: error.message,
          stack: error.stack
        });
        hasAccess.value = false;
      }
    };
    
    // Текст с разрешёнными отделами
    const allowedDepartmentsText = computed(() => {
      return accessConfig.allowedDepartmentIds.join(', ');
    });

    // Загрузка логов
    const loadLogs = async (forceRefresh = false) => {
      if (!hasAccess.value) return;
      
      // Предотвращаем множественные одновременные запросы
      if (isLoadingLogs && !forceRefresh) {
        return;
      }
      
      isLoadingLogs = true;
      loading.value = true;
      error.value = null;

      try {
        // Подготовка фильтров для API (используем dateFrom как date для обратной совместимости)
        // Если dateFrom не указан, используем сегодняшнюю дату
        const defaultDate = new Date().toISOString().split('T')[0];
        const apiFilters = {
          category: filters.value.category || null,
          event: filters.value.event || null,
          date: filters.value.dateFrom || defaultDate,
          hour: filters.value.hour !== null && filters.value.hour !== undefined ? filters.value.hour : null,
          ip: filters.value.ip || null,
          status: filters.value.status || null,
          dateFrom: filters.value.dateFrom || defaultDate,
          dateTo: filters.value.dateTo || null
        };
        
        // Валидация фильтров перед запросом
        if (!validateFilters(apiFilters)) {
          throw new Error('Некорректные параметры фильтрации');
        }
        
        console.log('[WebhookLogsPage] Loading logs with filters:', apiFilters);
        
        // Использование обновлённого API сервиса
        const result = await WebhookLogsApiService.getLogs(
          apiFilters,
          pagination.value.page,
          pagination.value.limit,
          forceRefresh
        );

        console.log('[WebhookLogsPage] API result:', result);
        console.log('[WebhookLogsPage] Logs count:', result?.logs?.length || 0);
        console.log('[WebhookLogsPage] Pagination:', result?.pagination);

        // Валидация ответа
        if (!result.success) {
          throw new Error(result.error || 'Ошибка загрузки логов');
        }
        
        // Валидация пагинации
        if (!validatePagination(result.pagination)) {
          console.warn('[WebhookLogsPage] Invalid pagination format, using defaults');
          pagination.value = {
            page: pagination.value.page,
            limit: pagination.value.limit,
            total: result.logs.length,
            pages: Math.ceil(result.logs.length / pagination.value.limit)
          };
        } else {
          pagination.value = result.pagination;
        }
        
        // Нормализация и валидация логов
        const normalizedLogs = normalizeWebhookLogEntries(result.logs);
        
        // Фильтрация невалидных записей
        const validLogs = normalizedLogs.filter(log => isValidWebhookLogEntry(log));
        
        if (validLogs.length !== normalizedLogs.length) {
          console.warn(
            '[WebhookLogsPage] Filtered out invalid logs:',
            normalizedLogs.length - validLogs.length
          );
        }
        
        logs.value = validLogs;
        
        // Уведомление об успехе
        if (forceRefresh) {
          showSuccess('Логи обновлены');
        }
      } catch (err) {
        handleApiError(err);
      } finally {
        loading.value = false;
        isLoadingLogs = false;
      }
    };
    
    // Обработка ошибок API
    const handleApiError = (err) => {
      console.error('[WebhookLogsPage] API Error:', err);
      
      // Обработка разных типов ошибок
      if (err.status === 403) {
        error.value = 'Доступ запрещён';
        showError('У вас нет доступа к логам вебхуков');
      } else if (err.status === 404) {
        error.value = 'Логи не найдены';
        showError('Логи для указанных фильтров не найдены');
      } else if (err.status >= 500) {
        error.value = 'Ошибка сервера';
        showError('Произошла ошибка на сервере. Попробуйте позже.');
      } else {
        error.value = err.message || 'Неизвестная ошибка';
        showError(error.value);
      }
      
      // Очистка данных при критической ошибке
      if (err.status >= 500) {
        logs.value = [];
      }
    };
    
    // Обработка поиска
    const handleSearch = (query) => {
      searchQuery.value = query;
      updateFilters({ search: query || null });
    };

    // Флаг для предотвращения множественных вызовов loadLogs
    let isLoadingLogs = false;
    
    // Обработка обновления фильтров
    const handleFiltersUpdate = (newFilters) => {
      // Валидация новых фильтров
      if (!validateFilters(newFilters)) {
        showError('Некорректные параметры фильтрации');
        return;
      }
      
      // Создаём простые копии фильтров (избегаем реактивных объектов)
      const oldFilters = {
        category: filters.value.category,
        event: filters.value.event,
        dateFrom: filters.value.dateFrom,
        dateTo: filters.value.dateTo,
        hour: filters.value.hour,
        ip: filters.value.ip,
        status: filters.value.status
      };
      
      const newFiltersSimple = {
        category: newFilters?.category || null,
        event: newFilters?.event || null,
        dateFrom: newFilters?.dateFrom || null,
        dateTo: newFilters?.dateTo || null,
        hour: newFilters?.hour !== undefined ? newFilters.hour : null,
        ip: newFilters?.ip || null,
        status: newFilters?.status || null
      };
      
      // Проверяем, действительно ли изменились фильтры (простое сравнение примитивов)
      const filtersChanged = Object.keys(newFiltersSimple).some(key => {
        const oldValue = oldFilters[key];
        const newValue = newFiltersSimple[key];
        // Простое сравнение для примитивов
        return oldValue !== newValue;
      });
      
      if (!filtersChanged && !isLoadingLogs) {
        return; // Фильтры не изменились, ничего не делаем
      }
      
      // Обновление фильтров
      updateFilters(newFiltersSimple); // Обновляем URL и реактивные фильтры
      
      // Сброс пагинации на первую страницу
      pagination.value.page = 1;
      
      // Инвалидация кеша при изменении фильтров (только если фильтры действительно изменились)
      if (filtersChanged) {
        try {
          WebhookLogsApiService.invalidateCacheOnFilterChange(oldFilters, newFiltersSimple);
        } catch (e) {
          console.error('[WebhookLogsPage] Error invalidating cache:', e);
        }
      }
      
      // Загрузка логов с новыми фильтрами
      if (!isLoadingLogs) {
        isLoadingLogs = true;
        loadLogs(true).finally(() => {
          isLoadingLogs = false;
        });
      }
    };

    // Обработка сброса фильтров
    const handleFiltersReset = () => {
      clearFilters();
      searchQuery.value = '';
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

    // Навигация "Назад"
    const goBack = () => {
      try {
        router.push('/');
      } catch (error) {
        console.error('Navigation error:', error);
        // Fallback: использовать window.location
        window.location.hash = '#/';
      }
    };

    // Обработка обновления выбранных записей
    const handleSelectedLogsUpdate = (newSelectedLogs) => {
      selectedLogs.value = newSelectedLogs;
    };

    // Обработка начала экспорта
    const handleExportStart = (data) => {
      console.log('Экспорт начат:', data);
      // Можно показать уведомление
    };

    // Обработка завершения экспорта
    const handleExportComplete = (data) => {
      console.log('Экспорт завершён:', data);
      showSuccess(`Экспорт завершён: ${data.count} записей в файле ${data.filename}`);
    };

    // Обработка ошибки экспорта
    const handleExportError = (error) => {
      console.error('Ошибка экспорта:', error);
      showError(`Ошибка экспорта: ${error.message || 'Неизвестная ошибка'}`);
    };

    // Очистка поиска
    const handleClearSearch = () => {
      searchQuery.value = '';
      handleFiltersReset();
    };
    
    // Переключение автообновления
    const handleToggleAutoUpdate = (enabled) => {
      autoUpdateEnabled.value = enabled;
      if (enabled) {
        // Установка lastTimestamp на последний лог
        if (logs.value.length > 0) {
          const lastLog = logs.value[0];
          if (lastLog.timestamp) {
            // Обновление lastTimestamp в сервисе через опции
            // (это можно сделать через метод сервиса, если он есть)
          }
        }
        connect();
      } else {
        disconnect();
      }
    };
    
    // Применение новых логов
    const handleApplyNewLogs = () => {
      // Применяем новые логи к текущему списку
      applyRealtimeLogs(logs.value);
      // Обновляем фильтрованный список (если есть поиск/фильтры)
      // Перезагрузка не требуется, так как applyRealtimeLogs уже добавил логи
      showSuccess('Новые события применены');
    };
    
    // Отклонение новых логов
    const handleDismissNewLogs = () => {
      clearNewLogs();
    };

    onMounted(async () => {
      await checkAccess();
      if (hasAccess.value) {
        // Восстановление поиска из URL
        if (filters.value.search) {
          searchQuery.value = filters.value.search;
        }
        await loadLogs();
      }
    });

    return {
      hasAccess,
      loading,
      error,
      logs,
      filteredLogs,
      selectedLog,
      selectedLogs,
      filters,
      searchQuery,
      searchComponent,
      pagination,
      previousPeriodStats,
      handleFiltersUpdate,
      handleFiltersReset,
      handleSearch,
      handleLogSelect,
      handleLogClose,
      handlePageChange,
      handleSelectedLogsUpdate,
      handleExportStart,
      handleExportComplete,
      handleExportError,
      handleClearSearch,
      autoUpdateEnabled,
      connectionState,
      newLogsCount,
      realtimeError,
      handleToggleAutoUpdate,
      handleApplyNewLogs,
      handleDismissNewLogs,
      allowedDepartmentsText,
      accessDebugInfo,
      goBack
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

.page-header-top {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}

.back-button:hover {
  background: #f8f9fa;
  border-color: #007bff;
  color: #007bff;
}

.back-button:active {
  transform: translateY(1px);
}

.back-icon {
  font-size: 18px;
  line-height: 1;
}

.back-text {
  font-weight: 500;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
  font-weight: 600;
}

.access-denied {
  padding: 40px 20px;
  text-align: center;
  max-width: 800px;
  margin: 0 auto;
}

.access-denied-content {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.access-denied-content h2 {
  color: #dc3545;
  margin-bottom: 16px;
  font-size: 24px;
}

.access-denied-content p {
  margin-bottom: 12px;
  color: #333;
  font-size: 16px;
}

.access-hint {
  color: #666;
  font-size: 14px;
}

.access-hint strong {
  color: #333;
}

.access-debug {
  margin-top: 20px;
  text-align: left;
}

.access-debug summary {
  cursor: pointer;
  color: #2196F3;
  margin-bottom: 10px;
  font-size: 14px;
}

.access-debug pre {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  color: #333;
  border: 1px solid #ddd;
}

.page-content {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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

/* Анимации переходов */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .webhook-logs-page {
    padding: 10px;
  }

  .page-content {
    padding: 15px;
  }

  .back-button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .back-text {
    display: none; /* Скрыть текст на мобильных, оставить только иконку */
  }

  .page-header h1 {
    font-size: 20px;
  }
}
</style>

