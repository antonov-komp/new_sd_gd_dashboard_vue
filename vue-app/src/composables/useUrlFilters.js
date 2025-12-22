import { ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

/**
 * Composable для синхронизации фильтров с URL
 * 
 * @returns {Object} { filters, updateFilters, clearFilters }
 */
export function useUrlFilters() {
  const route = useRoute();
  const router = useRouter();
  
  const today = new Date().toISOString().split('T')[0];
  
  // Реактивные фильтры
  const filters = ref({
    category: null,
    event: null,
    dateFrom: today,
    dateTo: null,
    hour: null,
    ip: null,
    search: null,
    status: null
  });
  
  // Восстановление фильтров из URL при загрузке
  const loadFiltersFromUrl = () => {
    const query = route.query;
    
    filters.value = {
      category: query.category || null,
      event: query.event || null,
      dateFrom: query.dateFrom || (query.date || today),
      dateTo: query.dateTo || null,
      hour: query.hour ? parseInt(query.hour) : null,
      ip: query.ip || null,
      search: query.search || null,
      status: query.status || null
    };
  };
  
  // Обновление URL при изменении фильтров
  const updateUrl = (newFilters) => {
    // Предотвращаем циклические обновления
    if (isUpdating) {
      return;
    }
    
    const query = { ...route.query };
    
    // Удаляем пустые значения
    Object.keys(newFilters).forEach(key => {
      const value = newFilters[key];
      if (value !== null && value !== '' && value !== undefined) {
        query[key] = value.toString();
      } else {
        delete query[key];
      }
    });
    
    // Проверяем, действительно ли изменился query
    const queryChanged = JSON.stringify(query) !== JSON.stringify(route.query);
    if (!queryChanged) {
      return; // Не обновляем, если ничего не изменилось
    }
    
    isUpdating = true;
    
    // Используем replace для избежания добавления в историю
    router.replace({ 
      path: route.path,
      query 
    }).finally(() => {
      // Сбрасываем флаг после небольшой задержки
      setTimeout(() => {
        isUpdating = false;
      }, 100);
    });
  };
  
  // Обновление фильтров
  const updateFilters = (newFilters) => {
    // Проверяем, действительно ли изменились фильтры
    const mergedFilters = { ...filters.value, ...newFilters };
    const filtersChanged = JSON.stringify(filters.value) !== JSON.stringify(mergedFilters);
    
    if (!filtersChanged) {
      return; // Фильтры не изменились, ничего не делаем
    }
    
    filters.value = mergedFilters;
    updateUrl(filters.value);
  };
  
  // Очистка фильтров
  const clearFilters = () => {
    filters.value = {
      category: null,
      event: null,
      dateFrom: today,
      dateTo: null,
      hour: null,
      ip: null,
      search: null,
      status: null
    };
    updateUrl(filters.value);
  };
  
  // Загрузка при монтировании
  onMounted(() => {
    loadFiltersFromUrl();
  });
  
  // Флаг для предотвращения циклических обновлений
  let isUpdating = false;
  
  // Синхронизация при изменении route.query (например, при использовании браузерной кнопки "Назад")
  watch(() => route.query, (newQuery, oldQuery) => {
    // Пропускаем обновление, если мы сами обновляем URL
    if (isUpdating) {
      return;
    }
    
    // Проверяем, действительно ли изменились фильтры
    const queryChanged = JSON.stringify(newQuery) !== JSON.stringify(oldQuery);
    if (queryChanged) {
      loadFiltersFromUrl();
    }
  }, { deep: true });
  
  return {
    filters,
    updateFilters,
    clearFilters,
    loadFiltersFromUrl
  };
}

