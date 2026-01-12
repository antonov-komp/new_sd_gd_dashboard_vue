<template>
  <div class="user-profile-analysis">
    <div class="analysis-header">
      <h1>Анализ профиля пользователя</h1>
      <p class="analysis-subtitle">Детальный анализ профиля и активности пользователя</p>
    </div>

    <!-- Форма выбора пользователя -->
    <div class="user-selector">
      <div class="selector-group">
        <label for="user-search">Поиск пользователя:</label>
        <input
          id="user-search"
          type="text"
          v-model="userSearchQuery"
          @input="debouncedUserSearch"
          placeholder="Введите имя, email или должность..."
          class="search-input"
        />
      </div>

      <div class="selector-group" v-if="searchResults.length > 0">
        <label>Выберите пользователя:</label>
        <select
          v-model="selectedUserId"
          @change="loadUserAnalysis"
          class="user-select"
        >
          <option value="">-- Выберите пользователя --</option>
          <option
            v-for="user in searchResults"
            :key="user.ID"
            :value="user.ID"
          >
            {{ user.fullName || user.NAME }} ({{ user.EMAIL }})
          </option>
        </select>
      </div>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>Анализ профиля пользователя...</p>
    </div>

    <!-- Анализ профиля -->
    <div v-else-if="userAnalysis" class="analysis-content">
      <!-- Основная информация -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            <img
              v-if="userAnalysis.photoUrl"
              :src="userAnalysis.photoUrl"
              :alt="userAnalysis.fullName"
            />
            <div v-else class="avatar-placeholder">
              {{ getInitials(userAnalysis.fullName) }}
            </div>
          </div>

          <div class="profile-info">
            <h2>{{ userAnalysis.fullName }}</h2>
            <p class="profile-position">{{ userAnalysis.WORK_POSITION || 'Должность не указана' }}</p>
            <p class="profile-email">{{ userAnalysis.EMAIL }}</p>
            <div class="profile-status">
              <span
                :class="{
                  'status-badge': true,
                  'status-active': userAnalysis.ACTIVE === 'Y',
                  'status-inactive': userAnalysis.ACTIVE !== 'Y'
                }"
              >
                {{ userAnalysis.ACTIVE === 'Y' ? 'Активен' : 'Неактивен' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Профильные данные -->
        <div class="profile-details">
          <div class="detail-section">
            <h3>Основная информация</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>ID пользователя:</label>
                <span>{{ userAnalysis.ID }}</span>
              </div>
              <div class="detail-item">
                <label>Дата регистрации:</label>
                <span>{{ formatDate(userAnalysis.DATE_REGISTER) }}</span>
              </div>
              <div class="detail-item">
                <label>Последнее обновление:</label>
                <span>{{ formatDate(userAnalysis.TIMESTAMP_X) }}</span>
              </div>
              <div class="detail-item">
                <label>Возраст аккаунта:</label>
                <span>{{ getAccountAge(userAnalysis.DATE_REGISTER) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Контактная информация</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Email:</label>
                <span>{{ userAnalysis.EMAIL || 'Не указан' }}</span>
              </div>
              <div class="detail-item">
                <label>Рабочий телефон:</label>
                <span>{{ userAnalysis.WORK_PHONE || 'Не указан' }}</span>
              </div>
              <div class="detail-item">
                <label>Личный телефон:</label>
                <span>{{ userAnalysis.PERSONAL_PHONE || 'Не указан' }}</span>
              </div>
              <div class="detail-item">
                <label>Skype:</label>
                <span>{{ userAnalysis.UF_SKYPE || 'Не указан' }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Рабочая информация</h3>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Должность:</label>
                <span>{{ userAnalysis.WORK_POSITION || 'Не указана' }}</span>
              </div>
              <div class="detail-item">
                <label>Компания:</label>
                <span>{{ userAnalysis.WORK_COMPANY || 'Не указана' }}</span>
              </div>
              <div class="detail-item">
                <label>Отдел:</label>
                <span>{{ getDepartmentName(userAnalysis.UF_DEPARTMENT) || 'Не указан' }}</span>
              </div>
              <div class="detail-item">
                <label>Руководитель отдела:</label>
                <span>{{ departmentHead || 'Не определен' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Метрики профиля -->
      <div class="metrics-section">
        <h3>Метрики профиля</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">{{ profileCompleteness }}%</div>
            <div class="metric-label">Заполненность профиля</div>
            <div class="metric-bar">
              <div
                class="metric-fill"
                :style="{ width: profileCompleteness + '%' }"
                :class="getCompletenessClass(profileCompleteness)"
              ></div>
            </div>
          </div>

          <div class="metric-card">
            <div class="metric-value">{{ getAccountAge(userAnalysis.DATE_REGISTER) }}</div>
            <div class="metric-label">Возраст аккаунта</div>
            <div class="metric-desc">дней с регистрации</div>
          </div>

          <div class="metric-card">
            <div class="metric-value">{{ userAnalysis.isRecentUser ? 'Да' : 'Нет' }}</div>
            <div class="metric-label">Новый пользователь</div>
            <div class="metric-desc">менее 30 дней</div>
          </div>

          <div class="metric-card">
            <div class="metric-value">{{ getActivityLevel() }}</div>
            <div class="metric-label">Уровень активности</div>
            <div class="metric-desc">на основе данных</div>
          </div>
        </div>
      </div>

      <!-- Анализ активности -->
      <div class="activity-analysis">
        <h3>Анализ активности</h3>

        <div class="activity-summary">
          <div class="summary-item">
            <div class="summary-icon">📅</div>
            <div class="summary-content">
              <div class="summary-value">{{ getDaysSinceLastActivity() }}</div>
              <div class="summary-label">Дней с последнего обновления</div>
            </div>
          </div>

          <div class="summary-item">
            <div class="summary-icon">🏢</div>
            <div class="summary-content">
              <div class="summary-value">{{ getDepartmentUsersCount() }}</div>
              <div class="summary-label">Коллеги в отделе</div>
            </div>
          </div>

          <div class="summary-item">
            <div class="summary-icon">👥</div>
            <div class="summary-content">
              <div class="summary-value">{{ getSimilarUsersCount() }}</div>
              <div class="summary-label">Пользователи с похожим профилем</div>
            </div>
          </div>
        </div>

        <!-- Рекомендации по улучшению -->
        <div class="recommendations-section">
          <h4>Рекомендации по улучшению профиля</h4>
          <ul class="recommendations-list">
            <li
              v-for="rec in profileRecommendations"
              :key="rec.id"
              :class="{ 'completed': rec.completed }"
            >
              <span class="rec-icon">{{ rec.completed ? '✅' : '⚠️' }}</span>
              <span class="rec-text">{{ rec.text }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Сравнение с коллегами -->
      <div class="comparison-section">
        <h3>Сравнение с коллегами</h3>

        <div class="comparison-grid">
          <div class="comparison-item">
            <h4>Заполненность профиля</h4>
            <div class="comparison-chart">
              <div class="chart-bar">
                <div class="bar-fill user-bar" :style="{ height: profileCompleteness + '%' }"></div>
                <div class="bar-label">Вы</div>
              </div>
              <div class="chart-bar">
                <div class="bar-fill dept-bar" :style="{ height: departmentAvgCompleteness + '%' }"></div>
                <div class="bar-label">Отдел</div>
              </div>
              <div class="chart-bar">
                <div class="bar-fill company-bar" :style="{ height: companyAvgCompleteness + '%' }"></div>
                <div class="bar-label">Компания</div>
              </div>
            </div>
          </div>

          <div class="comparison-item">
            <h4>Статистика отдела</h4>
            <div class="dept-stats">
              <div class="stat-row">
                <span>Всего в отделе:</span>
                <span>{{ departmentStats.total }}</span>
              </div>
              <div class="stat-row">
                <span>Активных:</span>
                <span>{{ departmentStats.active }}</span>
              </div>
              <div class="stat-row">
                <span>Новых (30 дней):</span>
                <span>{{ departmentStats.new }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Сообщение, если пользователь не выбран -->
    <div v-else-if="!loading" class="no-user-message">
      <div class="message-icon">👤</div>
      <h3>Выберите пользователя для анализа</h3>
      <p>Используйте поиск выше, чтобы найти пользователя системы</p>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { ActivityBitrix24Facade } from '@/services/facades/ActivityBitrix24Facade.js';

export default {
  name: 'UserProfileAnalysis',

  setup() {
    // Реактивные данные
    const loading = ref(false);
    const userSearchQuery = ref('');
    const searchResults = ref([]);
    const selectedUserId = ref('');
    const userAnalysis = ref(null);
    const departmentHead = ref('');
    const departmentStats = ref({ total: 0, active: 0, new: 0 });
    const departmentAvgCompleteness = ref(0);
    const companyAvgCompleteness = ref(0);

    // Вычисляемые свойства
    const profileCompleteness = computed(() => {
      if (!userAnalysis.value) return 0;

      const fields = [
        'NAME', 'LAST_NAME', 'EMAIL', 'WORK_POSITION',
        'WORK_PHONE', 'PERSONAL_PHONE', 'WORK_COMPANY'
      ];

      const completedFields = fields.filter(field => userAnalysis.value[field]).length;
      return Math.round((completedFields / fields.length) * 100);
    });

    const profileRecommendations = computed(() => {
      if (!userAnalysis.value) return [];

      const recommendations = [
        {
          id: 'email',
          text: 'Добавить email адрес',
          completed: !!userAnalysis.value.EMAIL
        },
        {
          id: 'position',
          text: 'Указать должность',
          completed: !!userAnalysis.value.WORK_POSITION
        },
        {
          id: 'phone',
          text: 'Добавить контактный телефон',
          completed: !!(userAnalysis.value.WORK_PHONE || userAnalysis.value.PERSONAL_PHONE)
        },
        {
          id: 'company',
          text: 'Указать компанию',
          completed: !!userAnalysis.value.WORK_COMPANY
        },
        {
          id: 'photo',
          text: 'Добавить фото профиля',
          completed: !!userAnalysis.value.PERSONAL_PHOTO
        }
      ];

      return recommendations;
    });

    // Методы
    const searchUsers = async () => {
      if (!userSearchQuery.value || userSearchQuery.value.length < 2) {
        searchResults.value = [];
        return;
      }

      try {
        const facade = new ActivityBitrix24Facade();
        const results = await facade.searchUsers(userSearchQuery.value, 10);
        searchResults.value = results;
      } catch (error) {
        console.error('Error searching users:', error);
        searchResults.value = [];
      }
    };

    const loadUserAnalysis = async () => {
      if (!selectedUserId.value) {
        userAnalysis.value = null;
        return;
      }

      loading.value = true;

      try {
        const facade = new ActivityBitrix24Facade();

        // Загружаем детальную информацию о пользователе
        const userDetails = await facade.getUserDetails(selectedUserId.value);

        if (userDetails) {
          // Добавляем дополнительные поля для анализа
          userDetails.fullName = [userDetails.NAME, userDetails.SECOND_NAME, userDetails.LAST_NAME]
            .filter(Boolean)
            .join(' ');

          userDetails.photoUrl = userDetails.PERSONAL_PHOTO?.showUrl || null;
          userDetails.isRecentUser = facade.isNewUser(userDetails.DATE_REGISTER);

          userAnalysis.value = userDetails;

          // Загружаем дополнительную информацию
          await loadAdditionalData(userDetails);
        } else {
          userAnalysis.value = null;
        }

      } catch (error) {
        console.error('Error loading user analysis:', error);
        userAnalysis.value = null;
      } finally {
        loading.value = false;
      }
    };

    const loadAdditionalData = async (user) => {
      try {
        const facade = new ActivityBitrix24Facade();

        // Получаем информацию об отделе
        if (user.UF_DEPARTMENT && user.UF_DEPARTMENT.length > 0) {
          const departments = await facade.getDepartments();
          const userDept = departments.find(d => d.ID == user.UF_DEPARTMENT[0]);

          if (userDept && userDept.UF_HEAD) {
            // Получаем информацию о руководителе отдела
            const headDetails = await facade.getUserDetails(userDept.UF_HEAD);
            departmentHead.value = headDetails ?
              `${headDetails.NAME} ${headDetails.LAST_NAME || ''}`.trim() :
              'Не определен';
          }

          // Получаем статистику отдела
          const deptUsers = await facade.getDepartmentUsers(user.UF_DEPARTMENT[0]);
          departmentStats.value = {
            total: deptUsers.length,
            active: deptUsers.filter(u => u.ACTIVE === 'Y').length,
            new: deptUsers.filter(u => facade.isNewUser(u.DATE_REGISTER)).length
          };

          // Средняя заполненность профиля в отделе
          const deptCompleteness = deptUsers.map(u => calculateUserCompleteness(u));
          departmentAvgCompleteness.value = deptCompleteness.length > 0
            ? Math.round(deptCompleteness.reduce((a, b) => a + b, 0) / deptCompleteness.length)
            : 0;
        }

        // Общая статистика компании
        const companyStats = await facade.getUserSummaryStats();
        const totalUsers = companyStats.total;
        // Примерная оценка - в реальном приложении нужно получить больше данных
        companyAvgCompleteness.value = Math.round(65 + Math.random() * 20); // Заглушка

      } catch (error) {
        console.error('Error loading additional data:', error);
      }
    };

    const calculateUserCompleteness = (user) => {
      const fields = ['NAME', 'EMAIL', 'WORK_POSITION', 'WORK_PHONE'];
      const completedFields = fields.filter(field => user[field]).length;
      return Math.round((completedFields / fields.length) * 100);
    };

    const getInitials = (fullName) => {
      if (!fullName) return '?';
      return fullName
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'Не указана';
      return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const getAccountAge = (registrationDate) => {
      if (!registrationDate) return 0;

      const regDate = new Date(registrationDate);
      const now = new Date();
      const diffTime = Math.abs(now - regDate);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const getDepartmentName = (departmentIds) => {
      // В реальном приложении здесь должен быть маппинг ID отделов на названия
      // Пока возвращаем первый ID как строку
      if (Array.isArray(departmentIds) && departmentIds.length > 0) {
        return `Отдел ${departmentIds[0]}`;
      }
      return null;
    };

    const getDaysSinceLastActivity = () => {
      if (!userAnalysis.value?.TIMESTAMP_X) return 'Неизвестно';
      return getAccountAge(userAnalysis.value.TIMESTAMP_X);
    };

    const getDepartmentUsersCount = () => {
      return departmentStats.value.total - 1; // Минус сам пользователь
    };

    const getSimilarUsersCount = () => {
      // Заглушка - в реальном приложении нужно анализировать похожие профили
      return Math.floor(Math.random() * 10) + 1;
    };

    const getActivityLevel = () => {
      const daysSinceActivity = getDaysSinceLastActivity();
      if (daysSinceActivity === 'Неизвестно' || isNaN(daysSinceActivity)) return 'Неизвестно';

      if (daysSinceActivity < 7) return 'Высокий';
      if (daysSinceActivity < 30) return 'Средний';
      return 'Низкий';
    };

    const getCompletenessClass = (percentage) => {
      if (percentage >= 80) return 'excellent';
      if (percentage >= 60) return 'good';
      if (percentage >= 40) return 'average';
      return 'poor';
    };

    // Дебаунс для поиска
    let searchTimeout;
    const debouncedUserSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(searchUsers, 300);
    };

    return {
      // Реактивные данные
      loading,
      userSearchQuery,
      searchResults,
      selectedUserId,
      userAnalysis,
      departmentHead,
      departmentStats,
      departmentAvgCompleteness,
      companyAvgCompleteness,

      // Вычисляемые свойства
      profileCompleteness,
      profileRecommendations,

      // Методы
      loadUserAnalysis,
      debouncedUserSearch,
      getInitials,
      formatDate,
      getAccountAge,
      getDepartmentName,
      getDaysSinceLastActivity,
      getDepartmentUsersCount,
      getSimilarUsersCount,
      getActivityLevel,
      getCompletenessClass
    };
  }
};
</script>

<style scoped>
.user-profile-analysis {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.analysis-header {
  margin-bottom: 30px;
}

.analysis-header h1 {
  color: #333;
  margin-bottom: 8px;
  font-size: 2rem;
}

.analysis-subtitle {
  color: #666;
  font-size: 1.1rem;
}

.user-selector {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.selector-group {
  margin-bottom: 15px;
}

.selector-group:last-child {
  margin-bottom: 0;
}

.selector-group label {
  display: block;
  font-weight: 600;
  color: #555;
  margin-bottom: 8px;
}

.search-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.user-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background: white;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.analysis-content {
  display: grid;
  gap: 30px;
}

.profile-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.profile-header {
  display: flex;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.profile-avatar {
  margin-right: 30px;
}

.profile-avatar img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid white;
  object-fit: cover;
}

.avatar-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  border: 3px solid white;
}

.profile-info h2 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
}

.profile-position {
  margin: 0 0 10px 0;
  opacity: 0.9;
  font-size: 1.1rem;
}

.profile-email {
  margin: 0 0 15px 0;
  opacity: 0.8;
}

.profile-status {
  margin-top: 10px;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  display: inline-block;
}

.status-active {
  background: rgba(40, 167, 69, 0.2);
  color: #28a745;
}

.status-inactive {
  background: rgba(220, 53, 69, 0.2);
  color: #dc3545;
}

.profile-details {
  padding: 30px;
}

.detail-section {
  margin-bottom: 30px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h3 {
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #007bff;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-item label {
  font-weight: 600;
  color: #555;
  flex: 1;
}

.detail-item span {
  color: #333;
  text-align: right;
  flex: 1;
}

.metrics-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.metrics-section h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 20px;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.metric-card {
  text-align: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.metric-value {
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.metric-label {
  font-weight: 600;
  color: #555;
  margin-bottom: 10px;
}

.metric-desc {
  font-size: 0.85rem;
  color: #777;
}

.metric-bar {
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metric-fill.excellent { background: #28a745; }
.metric-fill.good { background: #ffc107; }
.metric-fill.average { background: #fd7e14; }
.metric-fill.poor { background: #dc3545; }

.activity-analysis {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.activity-analysis h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 25px;
}

.activity-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.summary-item {
  display: flex;
  align-items: center;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.summary-icon {
  font-size: 2rem;
  margin-right: 15px;
}

.summary-content {
  flex: 1;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 2px;
}

.summary-label {
  font-size: 0.9rem;
  color: #666;
}

.recommendations-section h4 {
  color: #333;
  margin-bottom: 15px;
}

.recommendations-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.recommendations-list li {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
}

.recommendations-list li:last-child {
  border-bottom: none;
}

.recommendations-list li.completed {
  opacity: 0.6;
}

.rec-icon {
  margin-right: 10px;
  font-size: 1.1rem;
}

.rec-text {
  color: #555;
}

.comparison-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.comparison-section h3 {
  color: #333;
  margin-top: 0;
  margin-bottom: 25px;
}

.comparison-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
}

.comparison-item h4 {
  color: #555;
  margin-bottom: 20px;
}

.comparison-chart {
  display: flex;
  align-items: end;
  justify-content: space-around;
  height: 150px;
  padding: 20px 0;
}

.chart-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  margin: 0 10px;
}

.bar-fill {
  width: 40px;
  background: #007bff;
  border-radius: 4px 4px 0 0;
  margin-bottom: 10px;
  min-height: 20px;
}

.bar-fill.user-bar { background: #007bff; }
.bar-fill.dept-bar { background: #28a745; }
.bar-fill.company-bar { background: #ffc107; }

.bar-label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.dept-stats {
  display: grid;
  gap: 10px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-row:last-child {
  border-bottom: none;
}

.no-user-message {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.message-icon {
  font-size: 4rem;
  margin-bottom: 20px;
  opacity: 0.5;
}

.no-user-message h3 {
  color: #333;
  margin-bottom: 10px;
}

.no-user-message p {
  color: #666;
}

@media (max-width: 768px) {
  .profile-header {
    flex-direction: column;
    text-align: center;
  }

  .profile-avatar {
    margin-right: 0;
    margin-bottom: 20px;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
  }

  .activity-summary {
    grid-template-columns: 1fr;
  }

  .comparison-grid {
    grid-template-columns: 1fr;
  }

  .comparison-chart {
    flex-direction: column;
    height: auto;
  }

  .chart-bar {
    flex-direction: row;
    width: 100%;
    margin: 10px 0;
  }

  .bar-fill {
    width: 100px;
    height: 20px;
    margin-bottom: 0;
    margin-right: 10px;
  }
}
</style>