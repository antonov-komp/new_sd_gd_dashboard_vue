<template>
  <div class="activity-dashboard">
    <div class="dashboard-header">
      <h1>Анализ активности пользователей</h1>
      <p class="dashboard-subtitle">Мониторинг и анализ активности пользователей системы</p>
    </div>

    <div class="dashboard-controls">
      <div class="control-group">
        <label for="department-filter">Отдел:</label>
        <select
          id="department-filter"
          v-model="selectedDepartment"
          @change="handleDepartmentChange"
          class="filter-select"
        >
          <option value="">Все отделы</option>
          <option
            v-for="dept in departments"
            :key="dept.ID"
            :value="dept.ID"
          >
            {{ dept.NAME }}
          </option>
        </select>
      </div>

      <div class="control-group">
        <label for="period-filter">Период:</label>
        <select
          id="period-filter"
          v-model="selectedPeriod"
          @change="handlePeriodChange"
          class="filter-select"
        >
          <option value="week">Последняя неделя</option>
          <option value="month">Последний месяц</option>
          <option value="quarter">Последний квартал</option>
        </select>
      </div>

      <button
        @click="refreshData"
        :disabled="loading"
        class="refresh-btn"
      >
        {{ loading ? 'Загрузка...' : 'Обновить' }}
      </button>
    </div>

    <!-- Статистика -->
    <div class="stats-grid" v-if="stats">
      <div class="stat-card">
        <h3>Всего пользователей</h3>
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-subtext">
          {{ stats.active }} активных, {{ stats.inactive }} неактивных
        </div>
      </div>

      <div class="stat-card">
        <h3>Новые пользователи</h3>
        <div class="stat-value">{{ stats.newUsers }}</div>
        <div class="stat-subtext">За выбранный период</div>
      </div>

      <div class="stat-card">
        <h3>Отделы</h3>
        <div class="stat-value">{{ stats.departmentsCount }}</div>
        <div class="stat-subtext">Всего отделов</div>
      </div>

      <div class="stat-card">
        <h3>Заполненность профилей</h3>
        <div class="stat-value">{{ profileCompletionRate }}%</div>
        <div class="stat-subtext">Средний показатель</div>
      </div>
    </div>

    <!-- Таблица пользователей -->
    <div class="users-table-container">
      <h2>Пользователи</h2>

      <div class="table-controls">
        <input
          type="text"
          v-model="searchQuery"
          @input="debouncedSearch"
          placeholder="Поиск по имени..."
          class="search-input"
        />

        <div class="table-info">
          Показано {{ visibleUsers.length }} из {{ allUsers.length }} пользователей
        </div>
      </div>

      <div class="table-responsive">
        <table class="users-table">
          <thead>
            <tr>
              <th @click="sortBy('fullName')" :class="{ sortable: true, 'sort-asc': sortField === 'fullName' && sortDirection === 'asc', 'sort-desc': sortField === 'fullName' && sortDirection === 'desc' }">
                Имя
                <span class="sort-indicator">↕</span>
              </th>
              <th @click="sortBy('EMAIL')" :class="{ sortable: true, 'sort-asc': sortField === 'EMAIL' && sortDirection === 'asc', 'sort-desc': sortField === 'EMAIL' && sortDirection === 'desc' }">
                Email
                <span class="sort-indicator">↕</span>
              </th>
              <th @click="sortBy('WORK_POSITION')" :class="{ sortable: true, 'sort-asc': sortField === 'WORK_POSITION' && sortDirection === 'asc', 'sort-desc': sortField === 'WORK_POSITION' && sortDirection === 'desc' }">
                Должность
                <span class="sort-indicator">↕</span>
              </th>
              <th @click="sortBy('DATE_REGISTER')" :class="{ sortable: true, 'sort-asc': sortField === 'DATE_REGISTER' && sortDirection === 'asc', 'sort-desc': sortField === 'DATE_REGISTER' && sortDirection === 'desc' }">
                Дата регистрации
                <span class="sort-indicator">↕</span>
              </th>
              <th @click="sortBy('ACTIVE')" :class="{ sortable: true, 'sort-asc': sortField === 'ACTIVE' && sortDirection === 'asc', 'sort-desc': sortField === 'ACTIVE' && sortDirection === 'desc' }">
                Статус
                <span class="sort-indicator">↕</span>
              </th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in visibleUsers"
              :key="user.ID"
              @click="selectUser(user)"
              :class="{ selected: selectedUser && selectedUser.ID === user.ID }"
            >
              <td>{{ user.fullName || user.NAME }}</td>
              <td>{{ user.EMAIL }}</td>
              <td>{{ user.WORK_POSITION || 'Не указана' }}</td>
              <td>{{ formatDate(user.DATE_REGISTER) }}</td>
              <td>
                <span
                  :class="{
                    'status-badge': true,
                    'status-active': user.ACTIVE === 'Y',
                    'status-inactive': user.ACTIVE !== 'Y'
                  }"
                >
                  {{ user.ACTIVE === 'Y' ? 'Активен' : 'Неактивен' }}
                </span>
              </td>
              <td>
                <button
                  @click.stop="viewUserDetails(user)"
                  class="action-btn"
                  title="Просмотр деталей"
                >
                  👁
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Пагинация -->
      <div class="pagination" v-if="totalPages > 1">
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

    <!-- Диаграмма активности -->
    <div class="activity-chart-container" v-if="activityChartData.length > 0">
      <h2>Активность по периодам</h2>
      <canvas ref="activityChart" width="400" height="200"></canvas>
    </div>

    <!-- Модальное окно с деталями пользователя -->
    <div
      v-if="showUserModal && selectedUser"
      class="modal-overlay"
      @click="closeUserModal"
    >
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedUser.fullName }}</h3>
          <button @click="closeUserModal" class="close-btn">×</button>
        </div>

        <div class="modal-body">
          <div class="user-details-grid">
            <div class="detail-item">
              <label>ID:</label>
              <span>{{ selectedUser.ID }}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>{{ selectedUser.EMAIL }}</span>
            </div>
            <div class="detail-item">
              <label>Должность:</label>
              <span>{{ selectedUser.WORK_POSITION || 'Не указана' }}</span>
            </div>
            <div class="detail-item">
              <label>Дата регистрации:</label>
              <span>{{ formatDate(selectedUser.DATE_REGISTER) }}</span>
            </div>
            <div class="detail-item">
              <label>Статус:</label>
              <span :class="{ 'status-active': selectedUser.ACTIVE === 'Y', 'status-inactive': selectedUser.ACTIVE !== 'Y' }">
                {{ selectedUser.ACTIVE === 'Y' ? 'Активен' : 'Неактивен' }}
              </span>
            </div>
            <div class="detail-item">
              <label>Отдел:</label>
              <span>{{ getDepartmentName(selectedUser.UF_DEPARTMENT) || 'Не указан' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import { ActivityBitrix24Facade } from '@/services/facades/ActivityBitrix24Facade.js';
import Chart from 'chart.js/auto';

export default {
  name: 'ActivityDashboard',

  setup() {
    // Реактивные данные
    const loading = ref(false);
    const allUsers = ref([]);
    const departments = ref([]);
    const stats = ref(null);
    const activityChartData = ref([]);
    const selectedDepartment = ref('');
    const selectedPeriod = ref('month');
    const searchQuery = ref('');
    const sortField = ref('fullName');
    const sortDirection = ref('asc');
    const currentPage = ref(1);
    const pageSize = ref(20);
    const selectedUser = ref(null);
    const showUserModal = ref(false);
    const activityChart = ref(null);

    // Вычисляемые свойства
    const visibleUsers = computed(() => {
      let filtered = [...allUsers.value];

      // Фильтр по поиску
      if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(user =>
          (user.fullName || user.NAME || '').toLowerCase().includes(query) ||
          (user.EMAIL || '').toLowerCase().includes(query) ||
          (user.WORK_POSITION || '').toLowerCase().includes(query)
        );
      }

      // Сортировка
      filtered.sort((a, b) => {
        let aValue = a[sortField.value] || '';
        let bValue = b[sortField.value] || '';

        if (sortField.value === 'fullName') {
          aValue = a.fullName || a.NAME || '';
          bValue = b.fullName || b.NAME || '';
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (sortDirection.value === 'asc') {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });

      // Пагинация
      const start = (currentPage.value - 1) * pageSize.value;
      const end = start + pageSize.value;

      return filtered.slice(start, end);
    });

    const totalPages = computed(() => {
      const filtered = allUsers.value.filter(user => {
        if (!searchQuery.value) return true;
        const query = searchQuery.value.toLowerCase();
        return (user.fullName || user.NAME || '').toLowerCase().includes(query) ||
               (user.EMAIL || '').toLowerCase().includes(query) ||
               (user.WORK_POSITION || '').toLowerCase().includes(query);
      });
      return Math.ceil(filtered.length / pageSize.value);
    });

    const profileCompletionRate = computed(() => {
      if (!allUsers.value.length) return 0;
      const completeProfiles = allUsers.value.filter(user =>
        user.EMAIL && user.WORK_POSITION && user.NAME
      ).length;
      return Math.round((completeProfiles / allUsers.value.length) * 100);
    });

    // Методы
    const loadData = async () => {
      loading.value = true;
      try {
        const facade = new ActivityBitrix24Facade();

        // Загружаем данные параллельно
        const [users, depts, statsData, chartData] = await Promise.all([
          facade.getUsersForAnalytics({
            activeOnly: true,
            limit: 500
          }),
          facade.getDepartments(),
          facade.getUserSummaryStats(),
          facade.getActivityChartData({
            period: selectedPeriod.value,
            limit: 12
          })
        ]);

        allUsers.value = users;
        departments.value = depts;
        stats.value = statsData;
        activityChartData.value = chartData;

        console.log('Activity dashboard data loaded:', {
          users: users.length,
          departments: depts.length,
          stats: statsData,
          chartData: chartData.length
        });

      } catch (error) {
        console.error('Error loading activity dashboard data:', error);
      } finally {
        loading.value = false;
      }
    };

    const refreshData = () => {
      loadData();
    };

    const handleDepartmentChange = () => {
      currentPage.value = 1;
      loadData();
    };

    const handlePeriodChange = () => {
      loadData();
    };

    const sortBy = (field) => {
      if (sortField.value === field) {
        sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortField.value = field;
        sortDirection.value = 'asc';
      }
    };

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages.value) {
        currentPage.value = page;
      }
    };

    const selectUser = (user) => {
      selectedUser.value = user;
    };

    const viewUserDetails = (user) => {
      selectedUser.value = user;
      showUserModal.value = true;
    };

    const closeUserModal = () => {
      showUserModal.value = false;
      selectedUser.value = null;
    };

    const formatDate = (dateString) => {
      if (!dateString) return 'Не указана';
      return new Date(dateString).toLocaleDateString('ru-RU');
    };

    const getDepartmentName = (departmentIds) => {
      if (!departmentIds) return null;
      const ids = Array.isArray(departmentIds) ? departmentIds : [departmentIds];
      const dept = departments.value.find(d => ids.includes(parseInt(d.ID)));
      return dept ? dept.NAME : null;
    };

    // Дебаунс для поиска
    let searchTimeout;
    const debouncedSearch = () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        currentPage.value = 1;
      }, 300);
    };

    // Создание диаграммы
    const createActivityChart = () => {
      if (!activityChart.value || !activityChartData.value.length) return;

      const ctx = activityChart.value.getContext('2d');

      new Chart(ctx, {
        type: 'line',
        data: {
          labels: activityChartData.value.map(item => item.date),
          datasets: [{
            label: 'Количество пользователей',
            data: activityChartData.value.map(item => item.count),
            borderColor: '#007bff',
            backgroundColor: 'rgba(0, 123, 255, 0.1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Динамика регистрации пользователей'
            }
          }
        }
      });
    };

    // Жизненный цикл
    onMounted(async () => {
      await loadData();
      // Создаем диаграмму после загрузки данных
      setTimeout(createActivityChart, 100);
    });

    onUnmounted(() => {
      clearTimeout(searchTimeout);
    });

    // Слежение за изменениями данных для обновления диаграммы
    watch(activityChartData, () => {
      setTimeout(createActivityChart, 100);
    });

    return {
      // Реактивные данные
      loading,
      allUsers,
      departments,
      stats,
      activityChartData,
      selectedDepartment,
      selectedPeriod,
      searchQuery,
      sortField,
      sortDirection,
      currentPage,
      selectedUser,
      showUserModal,
      activityChart,

      // Вычисляемые свойства
      visibleUsers,
      totalPages,
      profileCompletionRate,

      // Методы
      refreshData,
      handleDepartmentChange,
      handlePeriodChange,
      sortBy,
      goToPage,
      selectUser,
      viewUserDetails,
      closeUserModal,
      formatDate,
      getDepartmentName,
      debouncedSearch
    };
  }
};
</script>

<style scoped>
.activity-dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.dashboard-header {
  margin-bottom: 30px;
}

.dashboard-header h1 {
  color: #333;
  margin-bottom: 8px;
  font-size: 2rem;
}

.dashboard-subtitle {
  color: #666;
  font-size: 1.1rem;
}

.dashboard-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  align-items: end;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.control-group label {
  font-weight: 500;
  color: #555;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 150px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
}

.refresh-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card h3 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 1rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.stat-subtext {
  color: #666;
  font-size: 0.9rem;
}

.users-table-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 40px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.users-table-container h2 {
  margin-top: 0;
  color: #333;
}

.table-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 10px;
}

.search-input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  min-width: 200px;
}

.table-info {
  color: #666;
  font-size: 0.9rem;
}

.table-responsive {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
}

.users-table th,
.users-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.users-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #333;
  position: relative;
}

.users-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.users-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 5px;
  opacity: 0.5;
}

.users-table th.sort-asc .sort-indicator,
.users-table th.sort-desc .sort-indicator {
  opacity: 1;
  color: #007bff;
}

.users-table th.sort-desc .sort-indicator {
  transform: rotate(180deg);
}

.users-table tr:hover {
  background: #f8f9fa;
}

.users-table tr.selected {
  background: #e3f2fd;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-active {
  background: #d4edda;
  color: #155724;
}

.status-inactive {
  background: #f8d7da;
  color: #721c24;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  font-size: 1.2rem;
}

.action-btn:hover {
  background: #f0f0f0;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.page-btn {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background: #0056b3;
}

.page-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}

.activity-chart-container {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.activity-chart-container h2 {
  margin-top: 0;
  color: #333;
  margin-bottom: 20px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-btn:hover {
  background: #f0f0f0;
}

.modal-body {
  padding: 20px;
}

.user-details-grid {
  display: grid;
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
  min-width: 120px;
}

.detail-item span {
  color: #333;
  text-align: right;
}

@media (max-width: 768px) {
  .dashboard-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .control-group {
    width: 100%;
  }

  .filter-select {
    width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .table-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .pagination {
    flex-direction: column;
    gap: 10px;
  }

  .users-table {
    font-size: 0.9rem;
  }

  .users-table th,
  .users-table td {
    padding: 8px;
  }

  .user-details-grid {
    grid-template-columns: 1fr;
  }

  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }

  .detail-item span {
    text-align: left;
  }
}
</style>