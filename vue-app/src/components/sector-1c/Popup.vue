<template>
  <div class="sector-popup">
    <div class="popup-header">
      <h3 class="popup-title">Тикеты сектора 1С</h3>
      <button class="close-btn" @click="$emit('close')" aria-label="Закрыть">
        ✕
      </button>
    </div>

    <div class="sort-controls">
      <button
        v-for="mode in sortModes"
        :key="mode.key"
        :class="['sort-btn', { active: sortMode === mode.key }]"
        @click="handleSortChange(mode.key)"
      >
        {{ mode.label }}
        <span class="count">({{ mode.count }})</span>
      </button>
    </div>

    <div class="tickets-container">
      <div v-if="filteredTickets.length === 0" class="no-data">
        <div class="no-data-icon">📋</div>
        <p>Нет данных за выбранный период</p>
      </div>
      <TicketSticker
        v-else
        v-for="ticket in filteredTickets"
        :key="ticket.id"
        :ticket="ticket"
      />
    </div>

    <div class="popup-footer">
      <button class="btn btn-secondary" @click="$emit('close')">Закрыть</button>
    </div>
  </div>
</template>

<script>
import { filterTicketsByTimePeriod, TIME_FILTER_LABELS } from '@/utils/time-filters.js';
import TicketSticker from '@/components/common/TicketSticker.vue';

/**
 * Компонент попапа с сортировкой по времени для сектора 1С
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 */
export default {
  name: 'SectorPopup',
  components: {
    TicketSticker
  },
  props: {
    tickets: {
      type: Array,
      required: true,
      validator(tickets) {
        return Array.isArray(tickets);
      }
    },
    initialSortMode: {
      type: String,
      default: 'one_month'
    }
  },
  emits: ['close', 'sort-change'],
  data() {
    return {
      sortMode: this.initialSortMode
    };
  },
  computed: {
    sortModes() {
      return Object.keys(TIME_FILTER_LABELS).map(key => ({
        key,
        label: TIME_FILTER_LABELS[key],
        count: this.getTicketsCount(key)
      }));
    },
    filteredTickets() {
      try {
        const startTime = performance.now();
        const filtered = filterTicketsByTimePeriod(this.tickets, this.sortMode);
        const endTime = performance.now();

        console.log(`[SectorPopup] Filtering took ${(endTime - startTime).toFixed(2)}ms, results: ${filtered.length}`);

        return filtered;
      } catch (error) {
        console.error('[SectorPopup] Error filtering tickets:', error);
        return [];
      }
    }
  },
  methods: {
    handleSortChange(newMode) {
      console.log(`[SectorPopup] Sort mode changed: ${this.sortMode} -> ${newMode}`);

      const startTime = performance.now();
      this.sortMode = newMode;

      // Даем Vue время на реактивное обновление
      this.$nextTick(() => {
        const filtered = this.filteredTickets;
        const endTime = performance.now();

        console.log(`[SectorPopup] Filtering completed in ${(endTime - startTime).toFixed(2)}ms, ${filtered.length} tickets shown`);

        this.$emit('sort-change', newMode);
      });
    },
    getTicketsCount(mode) {
      try {
        return filterTicketsByTimePeriod(this.tickets, mode).length;
      } catch (error) {
        console.error(`[SectorPopup] Error getting count for mode ${mode}:`, error);
        return 0;
      }
    }
  }
};
</script>

<style scoped>
.sector-popup {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.popup-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.sort-controls {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 2px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.sort-btn:hover {
  border-color: #d1d5db;
  background-color: #f9fafb;
}

.sort-btn.active {
  border-color: #3b82f6;
  background-color: #eff6ff;
  color: #1d4ed8;
}

.count {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}

.sort-btn.active .count {
  color: #1d4ed8;
}

.tickets-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  max-height: 400px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: #6b7280;
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-data p {
  margin: 0;
  font-size: 16px;
}

.popup-footer {
  padding: 16px 24px 20px;
  border-top: 1px solid #e5e7eb;
  text-align: right;
}

.btn {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:hover {
  border-color: #9ca3af;
  background-color: #f9fafb;
}

.btn-secondary {
  border-color: #6b7280;
  color: #6b7280;
}

.btn-secondary:hover {
  border-color: #4b5563;
  background-color: #f3f4f6;
}

/* Адаптивность */
@media (max-width: 640px) {
  .sector-popup {
    max-width: 95vw;
    max-height: 90vh;
  }

  .popup-header,
  .sort-controls,
  .tickets-container,
  .popup-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .sort-controls {
    gap: 6px;
  }

  .sort-btn {
    padding: 6px 10px;
    font-size: 13px;
  }
}
</style>