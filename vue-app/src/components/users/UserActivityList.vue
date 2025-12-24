<template>
  <div class="user-activity-list">
    <div v-if="loading" class="loading">
      Загрузка активности...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="activity.length === 0" class="empty">
      Активность не найдена
    </div>
    
    <div v-else class="activity-items">
      <UserActivityCard
        v-for="entry in activity"
        :key="getEntryKey(entry)"
        :entry="entry"
        @click="handleViewDetails(entry)"
      />
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
import { filterHiddenUsers } from '@/utils/hidden-users-manager.js';
import UserActivityCard from './UserActivityCard.vue';

export default {
  name: 'UserActivityList',
  components: {
    UserActivityCard
  },
  props: {
    userId: {
      type: Number,
      default: null
    },
    dateFrom: {
      type: String,
      default: null
    },
    dateTo: {
      type: String,
      default: null
    },
    type: {
      type: String,
      default: null
    }
  },
  emits: ['view-details'],
  setup(props, { emit }) {
    const rawActivity = ref([]);
    const loading = ref(false);
    const error = ref(null);
    
    // Фильтрованная активность (без скрытых пользователей)
    const activity = computed(() => {
      return filterHiddenUsers(rawActivity.value);
    });
    
    const loadActivity = async () => {
      loading.value = true;
      error.value = null;
      
      try {
        const options = {
          userId: props.userId,
          dateFrom: props.dateFrom,
          dateTo: props.dateTo,
          type: props.type
        };
        
        rawActivity.value = await UserActivityService.getActivity(options);
      } catch (err) {
        error.value = err.message || 'Ошибка загрузки активности';
        console.error('[UserActivityList] Error:', err);
      } finally {
        loading.value = false;
      }
    };
    
    const handleViewDetails = (entry) => {
      emit('view-details', entry);
    };
    
    const getEntryKey = (entry) => {
      return `${entry.timestamp}-${entry.user_id}-${entry.type}-${entry.route_path || ''}`;
    };
    
    // Обработчик события изменения скрытых пользователей
    const handleHiddenUsersChange = () => {
      // Перезагружаем активность для применения фильтрации
      loadActivity();
    };
    
    onMounted(() => {
      loadActivity();
      
      // Подписываемся на событие изменения скрытых пользователей
      window.addEventListener('hidden-users-changed', handleHiddenUsersChange);
    });
    
    onUnmounted(() => {
      // Отписываемся от события
      window.removeEventListener('hidden-users-changed', handleHiddenUsersChange);
    });
    
    watch(() => [props.userId, props.dateFrom, props.dateTo, props.type], () => {
      loadActivity();
    }, { deep: true });
    
    return {
      activity,
      loading,
      error,
      handleViewDetails,
      getEntryKey
    };
  }
};
</script>

<style scoped>
.user-activity-list {
  margin-top: 20px;
}

.loading,
.error,
.empty {
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

.empty {
  color: #999;
  font-style: italic;
}

.activity-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>

