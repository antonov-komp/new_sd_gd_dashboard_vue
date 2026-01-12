<template>
  <div class="user-activity-stats">
    <div v-if="loading" class="loading">
      Загрузка статистики...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_entries }}</div>
          <div class="stat-label">Всего записей</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats.unique_users_count }}</div>
          <div class="stat-label">Уникальных пользователей</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_app_entries }}</div>
          <div class="stat-label">Открытий приложения</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ stats.total_page_visits }}</div>
          <div class="stat-label">Переходов по страницам</div>
        </div>
      </div>
      
      <div v-if="Object.keys(stats.pages_visited).length > 0" class="pages-stats">
        <h3>Популярные страницы:</h3>
        <ul>
          <li v-for="(count, page) in sortedPages" :key="page">
            {{ page }}: <strong>{{ count }}</strong> посещений
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
import { filterHiddenUsers } from '@/utils/hidden-users-manager.js';

export default {
  name: 'UserActivityStats',
  props: {
    filters: {
      type: Object,
      default: () => ({})
    }
  },
  setup(props) {
    const rawStats = ref({
      total_entries: 0,
      unique_users_count: 0,
      total_app_entries: 0,
      total_page_visits: 0,
      pages_visited: {}
    });
    const loading = ref(false);
    const error = ref(null);
    
    // Фильтрованная статистика (без скрытых пользователей)
    const stats = computed(() => {
      // Для статистики нужно пересчитать на основе отфильтрованных данных
      // Но так как getActivityStats уже возвращает агрегированные данные,
      // нам нужно получить сырые данные и пересчитать статистику
      return rawStats.value;
    });
    
    const loadStats = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        // Получаем сырые данные активности
        const activity = await UserActivityService.getActivity({
          ...props.filters,
          limit: 10000 // Большой лимит для точной статистики
        });
        
        // Фильтруем скрытых пользователей
        const filteredActivity = filterHiddenUsers(activity);
        
        // Пересчитываем статистику на основе отфильтрованных данных
        rawStats.value = await UserActivityService.getActivityStats({
          ...props.filters
        });
        
        // Пересчитываем статистику вручную на основе отфильтрованных данных
        const filteredStats = {
          total_entries: filteredActivity.length,
          unique_users_count: new Set(filteredActivity.filter(e => e && e.user_id).map(e => e.user_id)).size,
          total_app_entries: filteredActivity.filter(e => e && e.type === 'app_entry').length,
          total_page_visits: filteredActivity.filter(e => e && e.type === 'page_visit').length,
          pages_visited: {}
        };

        // Подсчитываем популярные страницы
        filteredActivity
          .filter(e => e && e.type === 'page_visit' && e.route_path)
          .forEach(e => {
            const page = e.route_title || e.route_path || e.route_name || 'Неизвестная страница';
            filteredStats.pages_visited[page] = (filteredStats.pages_visited[page] || 0) + 1;
          });
        
        rawStats.value = filteredStats;
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки статистики';
        console.error('[UserActivityStats] Error loading stats:', err);
      } finally {
        loading.value = false;
      }
    };
    
    const sortedPages = computed(() => {
      const pages = stats.value.pages_visited || {};
      return Object.entries(pages)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .reduce((acc, [page, count]) => {
          acc[page] = count;
          return acc;
        }, {});
    });
    
    // Обработчик события изменения скрытых пользователей
    const handleHiddenUsersChange = () => {
      loadStats();
    };
    
    onMounted(() => {
      loadStats();
      
      // Подписываемся на событие изменения скрытых пользователей
      window.addEventListener('hidden-users-changed', handleHiddenUsersChange);
    });
    
    onUnmounted(() => {
      // Отписываемся от события
      window.removeEventListener('hidden-users-changed', handleHiddenUsersChange);
    });
    
    watch(() => props.filters, () => {
      loadStats();
    }, { deep: true });
    
    return {
      stats,
      loading,
      error,
      sortedPages
    };
  }
};
</script>

<style scoped>
.user-activity-stats {
  margin-bottom: 20px;
}

.loading,
.error {
  padding: 20px;
  text-align: center;
  color: #666;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 600;
  color: #2196F3;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.pages-stats {
  padding: 20px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.pages-stats h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
}

.pages-stats ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.pages-stats li {
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 14px;
  color: #555;
}

.pages-stats li:last-child {
  border-bottom: none;
}

.pages-stats strong {
  color: #2196F3;
  font-weight: 600;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>

