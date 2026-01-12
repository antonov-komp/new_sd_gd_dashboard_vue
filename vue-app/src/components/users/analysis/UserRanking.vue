<template>
  <div class="user-ranking-container">
    <div class="ranking-header">
      <h3 class="ranking-title">{{ title }}</h3>
      <div class="ranking-controls">
        <select v-model="sortBy" @change="updateRanking" class="sort-select">
          <option value="count">По количеству действий</option>
          <option value="sessions">По количеству сессий</option>
          <option value="recent">По последней активности</option>
        </select>
        <button @click="toggleView" class="view-toggle-btn">
          {{ showAsList ? 'Карточки' : 'Список' }}
        </button>
      </div>
    </div>

    <div class="ranking-content" :class="{ 'loading': loading }">
      <div v-if="loading" class="ranking-loading">
        Загрузка рейтинга...
      </div>

      <div v-else-if="error" class="ranking-error">
        {{ error }}
      </div>

      <div v-else-if="users.length === 0" class="ranking-empty">
        Нет данных о пользователях
      </div>

      <!-- Вид списка -->
      <div v-else-if="showAsList" class="ranking-list">
        <div class="ranking-item" v-for="user in displayedUsers" :key="user.id">
          <div class="rank-badge" :class="getRankClass(user.rank)">
            {{ user.rank }}
          </div>

          <div class="user-avatar" :style="{ backgroundColor: getAvatarColor(user.id) }">
            {{ getUserInitials(user.name) }}
          </div>

          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-stats">
              <span class="stat-item">
                <i class="stat-icon">📊</i>
                {{ user.count }} действий
              </span>
              <span class="stat-item">
                <i class="stat-icon">⏰</i>
                {{ formatLastActivity(user.lastActivityFormatted) }}
              </span>
            </div>
          </div>

          <div class="user-actions">
            <button @click="viewUserProfile(user)" class="profile-btn" title="Просмотреть профиль">
              👤
            </button>
          </div>
        </div>
      </div>

      <!-- Вид карточек -->
      <div v-else class="ranking-cards">
        <div class="ranking-card" v-for="user in displayedUsers" :key="user.id">
          <div class="card-header">
            <div class="rank-badge-large" :class="getRankClass(user.rank)">
              #{{ user.rank }}
            </div>
            <div class="user-avatar-large" :style="{ backgroundColor: getAvatarColor(user.id) }">
              {{ getUserInitials(user.name) }}
            </div>
          </div>

          <div class="card-content">
            <h4 class="user-name-large">{{ user.name }}</h4>
            <div class="user-stats-large">
              <div class="stat-large">
                <div class="stat-value">{{ user.count }}</div>
                <div class="stat-label">действий</div>
              </div>
              <div class="stat-large">
                <div class="stat-value">{{ user.sessions || 0 }}</div>
                <div class="stat-label">сессий</div>
              </div>
            </div>
            <div class="last-activity">
              Последняя активность: {{ formatLastActivity(user.lastActivityFormatted) }}
            </div>
          </div>

          <div class="card-actions">
            <button @click="viewUserProfile(user)" class="profile-btn-large">
              Просмотреть профиль
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showPagination && totalPages > 1" class="ranking-pagination">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="page-btn"
      >
        ‹ Предыдущая
      </button>

      <span class="page-info">
        Страница {{ currentPage }} из {{ totalPages }}
      </span>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="page-btn"
      >
        Следующая ›
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { VisualizationHelpers } from '@/utils/visualization-helpers.js';

export default {
  name: 'UserRanking',
  props: {
    data: {
      type: Array,
      default: () => []
    },
    limit: {
      type: Number,
      default: 10
    },
    title: {
      type: String,
      default: 'Топ пользователей'
    },
    showPagination: {
      type: Boolean,
      default: false
    },
    itemsPerPage: {
      type: Number,
      default: 10
    }
  },
  emits: ['user-select'],
  setup(props, { emit }) {
    const sortBy = ref('count');
    const showAsList = ref(true);
    const loading = ref(false);
    const error = ref(null);
    const currentPage = ref(1);

    // Подготовка данных рейтинга
    const users = computed(() => {
      try {
        if (!Array.isArray(props.data) || props.data.length === 0) {
          return [];
        }

        // Фильтруем валидные данные с дополнительными проверками
        const validData = props.data.filter(entry => {
          if (!entry || typeof entry !== 'object' || entry === null) {
            return false;
          }

          // Обязательные поля для рейтинга
          if (!entry.user_id || !entry.timestamp) {
            return false;
          }

          if (typeof entry.type !== 'string' || !entry.type.trim()) {
            return false;
          }

          return true;
        });

        if (validData.length === 0) {
          return [];
        }

        let rankingData = VisualizationHelpers.prepareUserRankingData(validData, props.limit * 3); // Берем больше для сортировки

        // Сортировка
        rankingData.sort((a, b) => {
          switch (sortBy.value) {
            case 'sessions':
              return (b.sessions || 0) - (a.sessions || 0);
            case 'recent':
              return new Date(b.lastActivityFormatted) - new Date(a.lastActivityFormatted);
            case 'count':
            default:
              return b.count - a.count;
          }
        });

        return rankingData.slice(0, props.limit);
      } catch (err) {
        console.error('[UserRanking] Error preparing ranking data:', err);
        error.value = 'Ошибка подготовки данных рейтинга';
        return [];
      }
    });

    // Пагинация
    const totalPages = computed(() => {
      return Math.ceil(users.value.length / props.itemsPerPage);
    });

    const displayedUsers = computed(() => {
      if (!props.showPagination) {
        return users.value;
      }

      const start = (currentPage.value - 1) * props.itemsPerPage;
      const end = start + props.itemsPerPage;
      return users.value.slice(start, end);
    });

    // Переход к странице
    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    // Переключение вида
    const toggleView = () => {
      showAsList.value = !showAsList.value;
    };

    // Обновление рейтинга
    const updateRanking = () => {
      currentPage.value = 1; // Сбрасываем пагинацию при изменении сортировки
    };

    // Просмотр профиля пользователя
    const viewUserProfile = (user) => {
      emit('user-select', user);
    };

    // Получение класса для ранга
    const getRankClass = (rank) => {
      if (rank === 1) return 'rank-gold';
      if (rank === 2) return 'rank-silver';
      if (rank === 3) return 'rank-bronze';
      return 'rank-normal';
    };

    // Получение цвета аватара
    const getAvatarColor = (userId) => {
      const colors = [
        '#2196F3', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
        '#00BCD4', '#8BC34A', '#FFC107', '#795548', '#607D8B'
      ];
      const index = Math.abs(userId) % colors.length;
      return colors[index];
    };

    // Получение инициалов пользователя
    const getUserInitials = (name) => {
      if (!name) return '?';

      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    // Форматирование последней активности
    const formatLastActivity = (activity) => {
      if (!activity || activity === 'Неизвестно') {
        return 'Неизвестно';
      }

      try {
        const date = new Date(activity);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          return 'Сегодня';
        } else if (diffDays === 1) {
          return 'Вчера';
        } else if (diffDays < 7) {
          return `${diffDays} дней назад`;
        } else {
          return date.toLocaleDateString('ru-RU');
        }
      } catch {
        return activity;
      }
    };

    // Наблюдатели
    watch(() => props.data, () => {
      currentPage.value = 1; // Сбрасываем пагинацию при изменении данных
    }, { deep: true });

    return {
      sortBy,
      showAsList,
      loading,
      error,
      currentPage,
      users,
      displayedUsers,
      totalPages,
      goToPage,
      toggleView,
      updateRanking,
      viewUserProfile,
      getRankClass,
      getAvatarColor,
      getUserInitials,
      formatLastActivity
    };
  }
};
</script>

<style scoped>
.user-ranking-container {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.ranking-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.ranking-controls {
  display: flex;
  gap: 10px;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
  cursor: pointer;
}

.sort-select:focus {
  outline: none;
  border-color: #2196F3;
}

.view-toggle-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.view-toggle-btn:hover {
  background: #e9ecef;
}

.ranking-content {
  min-height: 200px;
}

.ranking-content.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.ranking-loading,
.ranking-error,
.ranking-empty {
  text-align: center;
  color: #666;
  font-size: 14px;
  padding: 40px 20px;
}

.ranking-error {
  color: #dc3545;
}

.ranking-empty {
  color: #999;
  font-style: italic;
}

/* Список */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 6px;
  transition: background 0.2s;
}

.ranking-item:hover {
  background: #e9ecef;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 14px;
  color: white;
}

.rank-gold { background: #FFD700; color: #333; }
.rank-silver { background: #C0C0C0; color: #333; }
.rank-bronze { background: #CD7F32; color: #333; }
.rank-normal { background: #6c757d; }

.user-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: white;
  font-weight: bold;
  font-size: 14px;
}

.user-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #666;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-icon {
  font-size: 10px;
}

.user-actions {
  flex-shrink: 0;
}

.profile-btn {
  padding: 6px 12px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.profile-btn:hover {
  background: #1976D2;
}

/* Карточки */
.ranking-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.ranking-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  transition: transform 0.2s, box-shadow 0.2s;
}

.ranking-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  position: relative;
  margin-bottom: 12px;
}

.rank-badge-large {
  position: absolute;
  top: -8px;
  left: -8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 12px;
  color: white;
  border: 2px solid white;
}

.user-avatar-large {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 18px;
}

.card-content {
  margin-bottom: 16px;
}

.user-name-large {
  margin: 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.user-stats-large {
  display: flex;
  justify-content: space-around;
  margin: 12px 0;
}

.stat-large {
  text-align: center;
}

.stat-value {
  font-size: 20px;
  font-weight: bold;
  color: #2196F3;
}

.stat-label {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.last-activity {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.card-actions {
  text-align: center;
}

.profile-btn-large {
  padding: 8px 16px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.profile-btn-large:hover {
  background: #1976D2;
}

/* Пагинация */
.ranking-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.page-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 14px;
  color: #666;
}

/* Responsive */
@media (max-width: 768px) {
  .user-ranking-container {
    padding: 15px;
  }

  .ranking-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .ranking-controls {
    width: 100%;
    justify-content: space-between;
  }

  .ranking-cards {
    grid-template-columns: 1fr;
  }

  .ranking-list .ranking-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .user-stats {
    flex-direction: column;
    gap: 4px;
  }

  .ranking-pagination {
    flex-direction: column;
    gap: 10px;
  }

  .page-btn {
    width: 100%;
  }
}
</style>