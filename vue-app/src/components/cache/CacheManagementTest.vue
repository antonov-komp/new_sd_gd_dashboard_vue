<template>
  <div class="cache-management-test">
    <h1>🧪 Тест CacheManagement компонента</h1>

    <div class="test-section">
      <h2>Проверка рендеринга Vue компонента</h2>
      <p>Если вы видите этот текст, Vue работает корректно.</p>

      <div class="stats">
        <div class="stat-item">
          <div class="stat-value">{{ testModules.length }}</div>
          <div class="stat-label">Тестовых модулей</div>
        </div>
      </div>

      <div class="modules-list">
        <div v-for="module in testModules" :key="module.id" class="module-item">
          <strong>{{ module.name }}</strong> ({{ module.id }})
          <span class="status" :class="module.status === 'active' ? 'active' : 'inactive'">
            {{ module.status }}
          </span>
        </div>
      </div>

      <button @click="loadTestData" class="test-btn">Загрузить тестовые данные</button>
      <div v-if="testDataLoaded" class="success-message">
        ✅ Тестовые данные загружены успешно!
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'CacheManagementTest',
  setup() {
    const testModules = ref([
      {
        id: 'dashboard-sector-1c',
        name: 'Дашборд сектора 1С',
        status: 'active'
      },
      {
        id: 'graph-state',
        name: 'График состояния',
        status: 'active'
      },
      {
        id: 'users-management-departments',
        name: 'Управление пользователями (отделы)',
        status: 'active'
      }
    ]);

    const testDataLoaded = ref(false);

    const loadTestData = () => {
      console.log('Loading test data...');
      // Имитация загрузки данных
      setTimeout(() => {
        testDataLoaded.value = true;
        console.log('Test data loaded successfully');
      }, 1000);
    };

    return {
      testModules,
      testDataLoaded,
      loadTestData
    };
  }
};
</script>

<style scoped>
.cache-management-test {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.stats {
  display: flex;
  gap: 20px;
  margin: 20px 0;
}

.stat-item {
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e0e0e0;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #007bff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.modules-list {
  margin: 20px 0;
}

.module-item {
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #eee;
  border-radius: 4px;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
}

.status.active {
  background: #d4edda;
  color: #155724;
}

.status.inactive {
  background: #f8d7da;
  color: #721c24;
}

.test-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.test-btn:hover {
  background: #0056b3;
}

.success-message {
  margin-top: 15px;
  padding: 10px;
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
}
</style>