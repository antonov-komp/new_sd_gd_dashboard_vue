<template>
  <div v-if="isEnabled" class="diagnostics-panel">
    <div class="diagnostics-header">
      <h2>🔍 Диагностика дашборда</h2>
      <div class="header-actions">
        <button @click="downloadJSON" class="btn-download" title="Скачать JSON">
          📥 Скачать JSON
        </button>
        <button @click="toggleExpanded" class="btn-toggle" :title="isExpanded ? 'Свернуть' : 'Развернуть'">
          {{ isExpanded ? '▼' : '▶' }}
        </button>
      </div>
    </div>

    <div v-if="isExpanded" class="diagnostics-content">
      <!-- Сводка по стадиям -->
      <section class="diagnostics-section">
        <h3>📊 Загрузка тикетов</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Всего загружено</div>
            <div class="metric-value">{{ metrics.ticketsLoading.totalLoaded }}</div>
          </div>
          <div v-for="(stageData, stageId) in metrics.ticketsLoading.stages" :key="stageId" class="metric-card">
            <div class="metric-label">{{ getStageName(stageId) }}</div>
            <div class="metric-value">{{ stageData.total }}</div>
            <div class="metric-detail">Батчей: {{ stageData.batches.length }}</div>
          </div>
        </div>
      </section>

      <!-- Фильтрация -->
      <section class="diagnostics-section">
        <h3>🔍 Фильтрация по сектору 1С</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Всего тикетов</div>
            <div class="metric-value">{{ metrics.filtering.total }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Отфильтровано</div>
            <div class="metric-value">{{ metrics.filtering.filtered }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Отклонено</div>
            <div class="metric-value">{{ metrics.filtering.rejected.length }}</div>
          </div>
        </div>
        
        <div v-if="metrics.filtering.tagValueExamples.length > 0" class="examples-box">
          <h4>Примеры значений UF_CRM_7_TYPE_PRODUCT:</h4>
          <ul>
            <li v-for="(example, idx) in metrics.filtering.tagValueExamples.slice(0, 10)" :key="idx">
              <code>{{ JSON.stringify(example.value) }}</code>
              <span class="example-type">({{ example.type }}{{ example.isArray ? ', массив' : '' }})</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- Сотрудники -->
      <section class="diagnostics-section">
        <h3>👥 Сотрудники</h3>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Уникальных ID</div>
            <div class="metric-value">{{ metrics.employees.totalUnique }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Без assignedById</div>
            <div class="metric-value">{{ metrics.employees.ticketsWithoutAssignedById.length }}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">С assignedById=1051</div>
            <div class="metric-value">{{ metrics.employees.ticketsWithAssignedById1051.length }}</div>
          </div>
        </div>
      </section>

      <!-- Группировка -->
      <section class="diagnostics-section">
        <h3>📦 Группировка по стадиям</h3>
        <div v-for="(stageData, stageId) in metrics.grouping.distributionByStages" :key="stageId" class="stage-distribution">
          <h4>{{ getStageName(stageId) }}</h4>
          <div class="metric-card">
            <div class="metric-label">Всего тикетов в стадии</div>
            <div class="metric-value">{{ stageData.total }}</div>
          </div>
          <div v-if="Object.keys(stageData.employees).length > 0" class="employees-list">
            <div v-for="(count, empId) in stageData.employees" :key="empId" class="employee-item">
              Сотрудник #{{ empId }}: {{ count }} тикетов
            </div>
          </div>
        </div>
      </section>

      <!-- Нулевая точка -->
      <section class="diagnostics-section">
        <h3>🎯 Нулевая точка</h3>
        <div class="metrics-grid">
          <div v-for="(count, stageId) in metrics.zeroPoint.byStage" :key="stageId" class="metric-card">
            <div class="metric-label">{{ getStageName(stageId) }}</div>
            <div class="metric-value">{{ count }}</div>
          </div>
        </div>
      </section>

      <!-- Проблемные тикеты -->
      <section class="diagnostics-section problematic-tickets">
        <h3>⚠️ Проблемные тикеты</h3>
        
        <div v-if="problematicTickets.withoutAssignedById.length > 0" class="problem-group">
          <h4>Без assignedById ({{ problematicTickets.withoutAssignedById.length }})</h4>
          <div class="tickets-list">
            <div v-for="ticket in problematicTickets.withoutAssignedById.slice(0, 10)" :key="ticket.id" class="ticket-item">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-stage">{{ getStageName(ticket.stageId) }}</span>
            </div>
            <div v-if="problematicTickets.withoutAssignedById.length > 10" class="more-items">
              ... и ещё {{ problematicTickets.withoutAssignedById.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="problematicTickets.withAssignedById1051.length > 0" class="problem-group">
          <h4>С assignedById=1051 ({{ problematicTickets.withAssignedById1051.length }})</h4>
          <div class="tickets-list">
            <div v-for="ticket in problematicTickets.withAssignedById1051.slice(0, 10)" :key="ticket.id" class="ticket-item">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-stage">{{ getStageName(ticket.stageId) }}</span>
            </div>
            <div v-if="problematicTickets.withAssignedById1051.length > 10" class="more-items">
              ... и ещё {{ problematicTickets.withAssignedById1051.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="problematicTickets.withoutSectorTag.length > 0" class="problem-group">
          <h4>Без/неверный тег сектора ({{ problematicTickets.withoutSectorTag.length }})</h4>
          <div class="tickets-list">
            <div v-for="ticket in problematicTickets.withoutSectorTag.slice(0, 10)" :key="ticket.id || ticket.ID" class="ticket-item">
              <span class="ticket-id">#{{ ticket.id || ticket.ID }}</span>
              <span class="ticket-title">{{ ticket.title || ticket.TITLE || 'Без названия' }}</span>
              <span class="ticket-stage">{{ getStageName(ticket.stageId || ticket.STAGE_ID) }}</span>
            </div>
            <div v-if="problematicTickets.withoutSectorTag.length > 10" class="more-items">
              ... и ещё {{ problematicTickets.withoutSectorTag.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="problematicTickets.notInColumn.length > 0" class="problem-group">
          <h4>Не попали в колонку ({{ problematicTickets.notInColumn.length }})</h4>
          <div class="tickets-list">
            <div v-for="ticket in problematicTickets.notInColumn.slice(0, 10)" :key="ticket.id" class="ticket-item">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-stage">{{ getStageName(ticket.stageId) }}</span>
            </div>
            <div v-if="problematicTickets.notInColumn.length > 10" class="more-items">
              ... и ещё {{ problematicTickets.notInColumn.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="problematicTickets.unknownStage.length > 0" class="problem-group">
          <h4>Неизвестная стадия ({{ problematicTickets.unknownStage.length }})</h4>
          <div class="tickets-list">
            <div v-for="ticket in problematicTickets.unknownStage.slice(0, 10)" :key="ticket.id" class="ticket-item">
              <span class="ticket-id">#{{ ticket.id }}</span>
              <span class="ticket-title">{{ ticket.title }}</span>
              <span class="ticket-stage">Стадия: {{ ticket.stageId }}</span>
            </div>
            <div v-if="problematicTickets.unknownStage.length > 10" class="more-items">
              ... и ещё {{ problematicTickets.unknownStage.length - 10 }}
            </div>
          </div>
        </div>

        <div v-if="hasNoProblems" class="no-problems">
          ✅ Проблемных тикетов не обнаружено
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { getDiagnosticsService } from '@/services/dashboard-sector-1c/utils/diagnostics-service.js';
import { TicketRepository } from '@/services/dashboard-sector-1c/data/ticket-repository.js';

/**
 * Компонент панели диагностики для дашборда сектора 1С
 * 
 * Отображает метрики загрузки, фильтрации, группировки тикетов
 * и список проблемных тикетов
 * 
 * @component
 */
export default {
  name: 'DiagnosticsPanel',
  props: {
    isEnabled: {
      type: Boolean,
      default: false
    }
  },
  setup(props) {
    const isExpanded = ref(true);
    const diagnostics = getDiagnosticsService();
    
    const metrics = computed(() => {
      if (!props.isEnabled) {
        return {
          ticketsLoading: { stages: {}, totalLoaded: 0 },
          filtering: { total: 0, filtered: 0, rejected: [], tagValueExamples: [] },
          employees: { uniqueIds: [], totalUnique: 0, ticketsWithoutAssignedById: [], ticketsWithAssignedById1051: [] },
          grouping: { distributionByStages: {}, ticketsNotInColumn: [], unknownStages: [] },
          zeroPoint: { byStage: {} }
        };
      }
      
      if (!diagnostics) {
        console.warn('[DiagnosticsPanel] Diagnostics service not available');
        return {
          ticketsLoading: { stages: {}, totalLoaded: 0 },
          filtering: { total: 0, filtered: 0, rejected: [], tagValueExamples: [] },
          employees: { uniqueIds: [], totalUnique: 0, ticketsWithoutAssignedById: [], ticketsWithAssignedById1051: [] },
          grouping: { distributionByStages: {}, ticketsNotInColumn: [], unknownStages: [] },
          zeroPoint: { byStage: {} }
        };
      }
      
      return diagnostics.getMetrics();
    });
    
    const problematicTickets = computed(() => {
      if (!props.isEnabled || !diagnostics) {
        return {
          withoutAssignedById: [],
          withAssignedById1051: [],
          withoutSectorTag: [],
          notInColumn: [],
          unknownStage: []
        };
      }
      return diagnostics.getProblematicTickets();
    });
    
    const hasNoProblems = computed(() => {
      const problems = problematicTickets.value;
      return problems.withoutAssignedById.length === 0 &&
             problems.withAssignedById1051.length === 0 &&
             problems.withoutSectorTag.length === 0 &&
             problems.notInColumn.length === 0 &&
             problems.unknownStage.length === 0;
    });
    
    const toggleExpanded = () => {
      isExpanded.value = !isExpanded.value;
    };
    
    const downloadJSON = () => {
      if (!diagnostics) return;
      
      const json = diagnostics.exportToJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-diagnostics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    
    const getStageName = (stageId) => {
      return TicketRepository.getStageName(stageId) || stageId;
    };
    
    return {
      isExpanded,
      metrics,
      problematicTickets,
      hasNoProblems,
      toggleExpanded,
      downloadJSON,
      getStageName
    };
  }
};
</script>

<style scoped>
.diagnostics-panel {
  margin: 20px 0;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.diagnostics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 2px solid #007bff;
}

.diagnostics-header h2 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-download,
.btn-toggle {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.btn-download:hover,
.btn-toggle:hover {
  background: #f0f0f0;
}

.diagnostics-content {
  padding: 20px;
  max-height: 80vh;
  overflow-y: auto;
}

.diagnostics-section {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
}

.diagnostics-section:last-child {
  border-bottom: none;
}

.diagnostics-section h3 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #333;
}

.diagnostics-section h4 {
  margin: 15px 0 10px 0;
  font-size: 14px;
  color: #666;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
}

.metric-card {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #007bff;
}

.metric-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.metric-detail {
  font-size: 11px;
  color: #999;
  margin-top: 5px;
}

.examples-box {
  margin-top: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.examples-box ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.examples-box li {
  margin: 5px 0;
  font-size: 13px;
}

.examples-box code {
  background: #e9ecef;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.example-type {
  color: #666;
  font-size: 11px;
  margin-left: 8px;
}

.stage-distribution {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.employees-list {
  margin-top: 10px;
}

.employee-item {
  padding: 6px;
  font-size: 13px;
  color: #555;
}

.problematic-tickets {
  background: #fff3cd;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #ffc107;
}

.problem-group {
  margin-bottom: 20px;
}

.problem-group h4 {
  color: #856404;
  margin-bottom: 10px;
}

.tickets-list {
  max-height: 300px;
  overflow-y: auto;
}

.ticket-item {
  display: flex;
  gap: 10px;
  padding: 8px;
  margin: 5px 0;
  background: white;
  border-radius: 4px;
  font-size: 13px;
  align-items: center;
}

.ticket-id {
  font-weight: bold;
  color: #007bff;
  min-width: 60px;
}

.ticket-title {
  flex: 1;
  color: #333;
}

.ticket-stage {
  color: #666;
  font-size: 11px;
}

.more-items {
  padding: 8px;
  font-size: 12px;
  color: #666;
  font-style: italic;
}

.no-problems {
  padding: 15px;
  text-align: center;
  color: #28a745;
  font-weight: bold;
}

/* Адаптивность */
@media (max-width: 768px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .diagnostics-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
}
</style>

