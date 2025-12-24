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
import { ref, onMounted, watch } from 'vue';
import { UserActivityService } from '@/services/user-activity-service.js';
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
    const activity = ref([]);
    const loading = ref(false);
    const error = ref(null);
    
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
        
        activity.value = await UserActivityService.getActivity(options);
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
    
    onMounted(() => {
      loadActivity();
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

