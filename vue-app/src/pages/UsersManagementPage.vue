<template>
  <div class="users-management-page">
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
      <h1>Управление пользователями</h1>
    </div>

    <!-- Основной контент -->
    <div class="page-content">
      <!-- Раздел: Активность пользователей -->
      <div class="activity-section">
        <h2>📊 Активность пользователей</h2>
        
        <UserActivityFilters
          :filters="activityFilters"
          :users="users"
          @update-filters="handleFiltersUpdate"
        />
        
        <HiddenUsersManager
          :filters="activityFilters"
          @hidden-users-changed="handleHiddenUsersChanged"
        />
        
        <UserActivityStats :filters="activityFilters" />
        
        <UserActivityList
          :userId="activityFilters.userId"
          :dateFrom="activityFilters.dateFrom"
          :dateTo="activityFilters.dateTo"
          :type="activityFilters.type"
          @view-details="handleViewActivityDetails"
        />
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import UserActivityList from '@/components/users/UserActivityList.vue';
import UserActivityFilters from '@/components/users/UserActivityFilters.vue';
import UserActivityStats from '@/components/users/UserActivityStats.vue';
import HiddenUsersManager from '@/components/users/HiddenUsersManager.vue';
import { AccessControlService } from '@/services/access-control-service.js';
import { ActivityBitrix24Facade } from '@/services/facades/ActivityBitrix24Facade.js';

export default {
  name: 'UsersManagementPage',
  components: {
    UserActivityList,
    UserActivityFilters,
    UserActivityStats,
    HiddenUsersManager
  },
  setup() {
    const router = useRouter();
    const users = ref([]);
    const activityFilters = ref({
      userId: null,
      type: null,
      dateFrom: null,
      dateTo: null
    });
    
    /**
     * Загрузка списка пользователей
     */
    const loadUsers = async () => {
      try {
        // Используем ActivityBitrix24Facade для получения пользователей
        const facade = new ActivityBitrix24Facade();
        const usersList = await facade.getUsersList();
        users.value = usersList;
      } catch (error) {
        console.error('[UsersManagementPage] Error loading users:', error);
      }
    };
    
    /**
     * Обработка обновления фильтров
     */
    const handleFiltersUpdate = (newFilters) => {
      activityFilters.value = { ...newFilters };
    };
    
    /**
     * Обработка просмотра деталей активности
     */
    const handleViewActivityDetails = (entry) => {
      console.log('View activity details:', entry);
      // Здесь можно добавить логику открытия модального окна с деталями
    };
    
    /**
     * Обработка изменения скрытых пользователей
     */
    const handleHiddenUsersChanged = () => {
      // Отправляем событие для обновления компонентов активности
      window.dispatchEvent(new CustomEvent('hidden-users-changed'));
    };
    
    /**
     * Возврат на главную страницу
     */
    const goBack = () => {
      router.push('/');
    };
    
    onMounted(async () => {
      // Проверка доступа администратора
      try {
        const accessResult = await AccessControlService.checkAccess();
        if (!accessResult.allowed) {
          router.push('/');
          return;
        }
        
        const currentUser = await AccessControlService.getCurrentUser();
        if (!currentUser) {
          router.push('/');
          return;
        }
        
        // Загрузка списка пользователей
        await loadUsers();
      } catch (error) {
        console.error('[UsersManagementPage] Error:', error);
        router.push('/');
      }
    });
    
    return {
      users,
      activityFilters,
      handleFiltersUpdate,
      handleViewActivityDetails,
      handleHiddenUsersChanged,
      goBack
    };
  }
};
</script>

<style scoped>
.users-management-page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f5f5;
}

.page-header {
  background: white;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header-top {
  margin-bottom: 15px;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.back-button:hover {
  background: #5a6268;
}

.back-icon {
  font-size: 18px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.page-content {
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.activity-section {
  margin-top: 20px;
}

.activity-section h2 {
  margin: 0 0 20px 0;
  font-size: 20px;
  color: #333;
}

@media (max-width: 768px) {
  .users-management-page {
    padding: 10px;
  }
  
  .page-header,
  .page-content {
    padding: 15px;
  }
}
</style>

