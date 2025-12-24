<template>
  <div class="cache-management-page">
    <div class="page-header">
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
      <h1>🗑️ Ручное управление кешем</h1>
    </div>
    
    <div v-if="loading" class="loading">
      Загрузка статуса кеша...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else class="cache-content">
      <CacheStats :modules="modules" />
      
      <div class="modules-list">
        <CacheModuleCard
          v-for="module in modules"
          :key="module.id"
          :module="module"
          @clear="handleClearCache"
          @refresh="loadCacheStatus"
        />
      </div>
      
      <CacheActions
        :modules="modules"
        @clear-all="handleClearAllCache"
        @refresh="loadCacheStatus"
      />
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CacheManagementService } from '@/services/cache-management-service.js';
import CacheStats from '@/components/cache/CacheStats.vue';
import CacheModuleCard from '@/components/cache/CacheModuleCard.vue';
import CacheActions from '@/components/cache/CacheActions.vue';

export default {
  name: 'CacheManagementPage',
  components: {
    CacheStats,
    CacheModuleCard,
    CacheActions
  },
  beforeCreate() {
    console.log('[CacheManagementPage] beforeCreate() called');
  },
  created() {
    console.log('[CacheManagementPage] created() called');
  },
  beforeMount() {
    console.log('[CacheManagementPage] beforeMount() called');
  },
  setup() {
    console.log('[CacheManagementPage] setup() called');
    const router = useRouter();
    const modules = ref([]);
    const loading = ref(false);
    const error = ref(null);
    
    const loadCacheStatus = async () => {
      console.log('[CacheManagementPage] loadCacheStatus() called');
      loading.value = true;
      error.value = null;
      
      try {
        console.log('[CacheManagementPage] Calling CacheManagementService.getCacheStatus()...');
        modules.value = await CacheManagementService.getCacheStatus();
        console.log('[CacheManagementPage] Cache status loaded:', modules.value.length, 'modules');
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки статуса кеша';
        console.error('[CacheManagementPage] Error:', err);
      } finally {
        loading.value = false;
        console.log('[CacheManagementPage] loadCacheStatus() completed, loading:', loading.value);
      }
    };
    
    const handleClearCache = async (moduleId) => {
      // Перезагружаем статус после очистки
      await loadCacheStatus();
    };
    
    const handleClearAllCache = async () => {
      // Перезагружаем статус после очистки
      await loadCacheStatus();
    };
    
    const goBack = () => {
      router.push({ name: 'index' });
    };
    
    onMounted(() => {
      console.log('[CacheManagementPage] onMounted() called');
      loadCacheStatus();
    });
    
    return {
      modules,
      loading,
      error,
      handleClearCache,
      handleClearAllCache,
      loadCacheStatus,
      goBack
    };
  }
};
</script>

<style scoped>
.cache-management-page {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
}

.page-header-top {
  margin-bottom: 15px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.back-button:hover {
  background-color: #5a6268;
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
  font-weight: 600;
  color: #333;
}

.loading,
.error {
  padding: 20px;
  text-align: center;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.error {
  color: #dc3545;
  background-color: #f8d7da;
  border-color: #f5c6cb;
}

.cache-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modules-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

@media (max-width: 768px) {
  .cache-management-page {
    padding: 15px;
  }
  
  .modules-list {
    grid-template-columns: 1fr;
  }
}
</style>

