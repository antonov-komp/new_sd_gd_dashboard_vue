<template>
  <div
    v-if="isVisible"
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal">
      <header class="modal__header">
        <h3 class="modal__title">Ответственные за неделю</h3>
        <button class="modal__close" @click="$emit('close')" aria-label="Закрыть">
          ✕
        </button>
      </header>

      <section class="modal__body">
        <p v-if="!hasData" class="modal__empty">Нет данных по ответственным</p>

        <ul v-else class="responsible-list">
          <li
            v-for="person in responsible"
            :key="person.id || person.name"
            class="responsible-list__item"
          >
            <div class="responsible-list__name">
              <span class="responsible-list__avatar" aria-hidden="true">
                {{ getInitials(person.name) }}
              </span>
              <span>{{ person.name || 'Не назначен' }}</span>
            </div>
            <div class="responsible-list__count">
              {{ person.count ?? 0 }}
            </div>
          </li>
        </ul>
      </section>

      <footer class="modal__footer">
        <button class="btn" @click="$emit('close')">Закрыть</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  responsible: {
    type: Array,
    default: () => []
  }
});

const hasData = computed(() => (props.responsible || []).length > 0);

function getInitials(name) {
  if (!name) return '—';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal {
  background: var(--b24-bg-white, #fff);
  border-radius: var(--radius-lg, 12px);
  width: min(520px, 90vw);
  box-shadow: var(--shadow-lg, 0 10px 40px rgba(0, 0, 0, 0.15));
  display: flex;
  flex-direction: column;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--b24-border-light, #e5e7eb);
}

.modal__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--b24-text-primary, #1f2937);
}

.modal__close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: var(--b24-text-secondary, #6b7280);
}

.modal__body {
  padding: 16px 20px;
}

.modal__footer {
  padding: 12px 20px;
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
  display: flex;
  justify-content: flex-end;
}

.btn {
  padding: 10px 16px;
  border-radius: var(--radius-md, 8px);
  background: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #fff);
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.responsible-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.responsible-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border: 1px solid var(--b24-border-light, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  background: var(--b24-bg, #f9fafb);
}

.responsible-list__name {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.responsible-list__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.responsible-list__count {
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
}

.modal__empty {
  margin: 0;
  padding: 12px;
  border-radius: var(--radius-md, 8px);
  background: var(--b24-bg-light, #f5f7fb);
  color: var(--b24-text-secondary, #6b7280);
}
</style>

