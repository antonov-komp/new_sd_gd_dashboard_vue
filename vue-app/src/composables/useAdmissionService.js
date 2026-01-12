/**
 * Composable для работы с admissionClosureService
 *
 * Обеспечивает lazy loading admissionClosureService с реактивным состоянием.
 *
 * TASK-085: Оптимизация системы сборки Vue.js приложения
 */

import { ref, readonly } from 'vue';
import { LazyServiceLoader } from '@/utils/lazy-services';

export function useAdmissionService() {
  const service = ref(null);
  const loading = ref(false);
  const error = ref(null);

  /**
   * Загружает admissionClosureService
   * @returns {Promise<Object>} Загруженный сервис
   */
  const loadService = async () => {
    if (service.value) return service.value;

    try {
      loading.value = true;
      error.value = null;

      const { fetchAdmissionClosureStats, ...otherFunctions } = await LazyServiceLoader.loadAdmissionClosureService();
      service.value = { fetchAdmissionClosureStats, ...otherFunctions };
    } catch (err) {
      error.value = err;
      console.error('Failed to load admission service:', err);
      throw err;
    } finally {
      loading.value = false;
    }

    return service.value;
  };

  /**
   * Выполняет fetchAdmissionClosureStats с lazy loading
   * @param {Object} params - Параметры запроса
   * @returns {Promise<*>} Результат выполнения
   */
  const fetchStats = async (params = {}) => {
    const svc = await loadService();
    return svc.fetchAdmissionClosureStats(params);
  };

  /**
   * Очищает загруженный сервис
   */
  const clearService = () => {
    service.value = null;
    error.value = null;
  };

  return {
    service: readonly(service),
    loading: readonly(loading),
    error: readonly(error),
    loadService,
    fetchStats,
    clearService
  };
}