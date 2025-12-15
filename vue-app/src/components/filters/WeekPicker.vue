<template>
  <div class="week-picker">
    <div class="week-picker-label">
      <span class="section-icon">📅</span>
      <span>Неделя</span>
    </div>
    
    <div class="week-picker-wheel" ref="wheelContainer" @scroll="handleScroll">
      <div class="week-picker-items">
        <div
          v-for="(week, index) in weeks"
          :key="week.weekNumber"
          :class="['week-picker-item', { active: week.weekNumber === selectedWeek?.weekNumber }]"
          :data-week-number="week.weekNumber"
          @click="selectWeek(week)"
        >
          <div class="week-item-content">
            <div class="week-number">Неделя {{ week.weekNumber }}</div>
            <div class="week-dates">
              {{ formatDate(week.startUtc) }} — {{ formatDate(week.endUtc) }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="week-picker-selected" v-if="selectedWeek">
      <div class="selected-week-info">
        <strong>Неделя {{ selectedWeek.weekNumber }}</strong>
        <span class="selected-week-dates">
          {{ formatDate(selectedWeek.startUtc) }} — {{ formatDate(selectedWeek.endUtc) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps({
  /**
   * Выбранная неделя (объект с weekNumber, startUtc, endUtc)
   */
  selectedWeek: {
    type: Object,
    default: null
  },
  /**
   * Количество недель для отображения (по умолчанию 52)
   */
  weeksCount: {
    type: Number,
    default: 52
  }
});

const emit = defineEmits(['update:selectedWeek', 'change']);

const wheelContainer = ref(null);
const weeks = ref([]);
const isScrolling = ref(false);

/**
 * Генерация списка недель (от текущей назад)
 */
function generateWeeks(count = 52) {
  const weeksList = [];
  const now = new Date();
  const tz = 'UTC';
  
  // Получаем текущую неделю
  const currentWeek = getWeekBounds(now);
  
  for (let i = 0; i < count; i++) {
    const weekDate = new Date(currentWeek.start);
    weekDate.setDate(weekDate.getUTCDate() - (i * 7));
    
    const weekBounds = getWeekBounds(weekDate);
    const weekNumber = getWeekNumber(weekDate);
    
    weeksList.push({
      weekNumber,
      startUtc: weekBounds.start.toISOString(),
      endUtc: weekBounds.end.toISOString(),
      start: weekBounds.start,
      end: weekBounds.end
    });
  }
  
  return weeksList;
}

/**
 * Получение границ недели (пн 00:00:00 — вс 23:59:59 UTC)
 */
function getWeekBounds(date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Понедельник
  
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff, 0, 0, 0));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  end.setUTCHours(23, 59, 59, 999);
  
  return { start, end };
}

/**
 * Получение номера недели по ISO-8601
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
}

/**
 * Форматирование даты для отображения
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Выбор недели
 */
function selectWeek(week) {
  emit('update:selectedWeek', week);
  emit('change', week);
  
  // Прокрутка к выбранной неделе
  nextTick(() => {
    scrollToWeek(week.weekNumber);
  });
}

/**
 * Прокрутка к указанной неделе
 */
function scrollToWeek(weekNumber) {
  if (!wheelContainer.value) return;
  
  const item = wheelContainer.value.querySelector(`[data-week-number="${weekNumber}"]`);
  if (item) {
    const container = wheelContainer.value;
    const itemTop = item.offsetTop;
    const containerHeight = container.clientHeight;
    const itemHeight = item.clientHeight;
    const scrollTop = itemTop - (containerHeight / 2) + (itemHeight / 2);
    
    container.scrollTo({
      top: scrollTop,
      behavior: 'smooth'
    });
  }
}

/**
 * Обработка прокрутки (автоматический выбор недели в центре)
 */
function handleScroll() {
  if (isScrolling.value) return;
  
  isScrolling.value = true;
  clearTimeout(window.weekPickerScrollTimeout);
  
  window.weekPickerScrollTimeout = setTimeout(() => {
    if (!wheelContainer.value) {
      isScrolling.value = false;
      return;
    }
    
    const container = wheelContainer.value;
    const containerRect = container.getBoundingClientRect();
    const centerY = containerRect.top + containerRect.height / 2;
    
    // Находим элемент, ближайший к центру
    const items = container.querySelectorAll('.week-picker-item');
    let closestItem = null;
    let closestDistance = Infinity;
    
    items.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      const itemCenterY = itemRect.top + itemRect.height / 2;
      const distance = Math.abs(itemCenterY - centerY);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = item;
      }
    });
    
    if (closestItem) {
      const weekNumber = parseInt(closestItem.dataset.weekNumber);
      const week = weeks.value.find(w => w.weekNumber === weekNumber);
      if (week && (!props.selectedWeek || week.weekNumber !== props.selectedWeek.weekNumber)) {
        emit('update:selectedWeek', week);
        emit('change', week);
      }
    }
    
    isScrolling.value = false;
  }, 150);
}

// Инициализация
onMounted(() => {
  weeks.value = generateWeeks(props.weeksCount);
  
  // Если выбрана неделя, прокручиваем к ней
  if (props.selectedWeek) {
    nextTick(() => {
      scrollToWeek(props.selectedWeek.weekNumber);
    });
  } else {
    // Иначе прокручиваем к текущей неделе
    const currentWeek = getWeekBounds(new Date());
    const currentWeekNumber = getWeekNumber(new Date());
    nextTick(() => {
      scrollToWeek(currentWeekNumber);
    });
  }
});

onUnmounted(() => {
  if (window.weekPickerScrollTimeout) {
    clearTimeout(window.weekPickerScrollTimeout);
  }
});

// Отслеживание изменений выбранной недели извне
watch(() => props.selectedWeek, (newWeek) => {
  if (newWeek && !isScrolling.value) {
    nextTick(() => {
      scrollToWeek(newWeek.weekNumber);
    });
  }
}, { deep: true });
</script>

<style scoped>
.week-picker {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm, 8px);
}

.week-picker-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs, 4px);
  font-size: var(--font-size-sm, 14px);
  font-weight: 600;
  color: var(--b24-text-primary, #111827);
}

.section-icon {
  font-size: 16px;
}

.week-picker-wheel {
  position: relative;
  height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
  border: 1px solid var(--b24-border-medium, #d1d5db);
  border-radius: var(--radius-md, 8px);
  background-color: var(--b24-bg-white, #ffffff);
  scroll-snap-type: y mandatory;
  scrollbar-width: thin;
}

.week-picker-wheel::-webkit-scrollbar {
  width: 6px;
}

.week-picker-wheel::-webkit-scrollbar-track {
  background: var(--b24-bg-light, #f3f4f6);
  border-radius: 3px;
}

.week-picker-wheel::-webkit-scrollbar-thumb {
  background: var(--b24-border-medium, #d1d5db);
  border-radius: 3px;
}

.week-picker-wheel::-webkit-scrollbar-thumb:hover {
  background: var(--b24-text-secondary, #6b7280);
}

.week-picker-items {
  padding: 80px 0;
}

.week-picker-item {
  padding: var(--spacing-md, 12px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  scroll-snap-align: center;
  border-left: 3px solid transparent;
}

.week-picker-item:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
}

.week-picker-item.active {
  background-color: var(--b24-primary-light, #e3f2fd);
  border-left-color: var(--b24-primary, #007bff);
  font-weight: 600;
}

.week-item-content {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
}

.week-number {
  font-size: var(--font-size-sm, 14px);
  color: var(--b24-text-primary, #111827);
  font-weight: 500;
}

.week-dates {
  font-size: var(--font-size-xs, 12px);
  color: var(--b24-text-secondary, #6b7280);
}

.week-picker-item.active .week-number {
  color: var(--b24-primary, #007bff);
}

.week-picker-item.active .week-dates {
  color: var(--b24-primary-dark, #0056b3);
}

.week-picker-selected {
  padding: var(--spacing-sm, 8px);
  background-color: var(--b24-bg-light, #f3f4f6);
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
}

.selected-week-info {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs, 4px);
  font-size: var(--font-size-sm, 14px);
}

.selected-week-info strong {
  color: var(--b24-text-primary, #111827);
}

.selected-week-dates {
  color: var(--b24-text-secondary, #6b7280);
  font-size: var(--font-size-xs, 12px);
}
</style>

