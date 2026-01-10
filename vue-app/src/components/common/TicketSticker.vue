<template>
  <div class="ticket-sticker" :class="statusClass">
    <div class="ticket-header">
      <span class="ticket-id">{{ ticket.id }}</span>
      <span class="ticket-date">{{ formatDate(ticket.created_at) }}</span>
    </div>
    <div class="ticket-content">
      <h4>{{ ticket.title || 'Без названия' }}</h4>
      <p>{{ ticket.description || 'Без описания' }}</p>
      <div class="ticket-meta">
        <span class="status">{{ ticket.status }}</span>
        <span class="priority" :class="priorityClass">{{ ticket.priority }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import { formatDate } from '@/utils/date-helpers.js';

/**
 * Компонент для отображения стикета тикета
 *
 * TASK-083: Исправление сортировки по времени в попапах графика сектора 1С
 */
export default {
  name: 'TicketSticker',
  props: {
    ticket: {
      type: Object,
      required: true,
      validator(ticket) {
        return ticket.id && ticket.created_at;
      }
    }
  },
  computed: {
    statusClass() {
      return `status-${this.ticket.status?.toLowerCase() || 'unknown'}`;
    },
    priorityClass() {
      return `priority-${this.ticket.priority?.toLowerCase() || 'unknown'}`;
    }
  },
  methods: {
    formatDate(dateString) {
      return formatDate(dateString);
    }
  }
};
</script>

<style scoped>
.ticket-sticker {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;
}

.ticket-sticker:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6b7280;
}

.ticket-id {
  font-weight: 600;
  color: #374151;
}

.ticket-date {
  font-size: 11px;
}

.ticket-content h4 {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  line-height: 1.3;
}

.ticket-content p {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.status, .priority {
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  text-transform: uppercase;
}

/* Статусы */
.status-open {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-closed {
  background-color: #d4edda;
  color: #155724;
}

.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-unknown {
  background-color: #e2e3e5;
  color: #383d41;
}

/* Приоритеты */
.priority-low {
  background-color: #f8f9fa;
  color: #6c757d;
}

.priority-normal {
  background-color: #e7f3ff;
  color: #0066cc;
}

.priority-high {
  background-color: #ffeaa7;
  color: #d63031;
}

.priority-urgent {
  background-color: #fab1a0;
  color: #e17055;
}

.priority-unknown {
  background-color: #e2e3e5;
  color: #383d41;
}
</style>