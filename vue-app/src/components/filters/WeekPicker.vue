<template>
  <div class="week-picker" ref="pickerContainer">
    <div class="week-picker-label">
      <span class="section-icon">📅</span>
      <span>Период</span>
    </div>
    
    <!-- Кнопка открытия выпадающего списка -->
    <div
      class="week-picker-trigger"
      @click="toggleDropdown"
      :class="{ 'is-open': isDropdownOpen }"
    >
      <span class="trigger-text">
        <template v-if="selectedWeek">
          Неделя {{ selectedWeek.weekNumber }} · {{ formatDate(selectedWeek.startUtc) }} — {{ formatDate(selectedWeek.endUtc) }}
        </template>
        <template v-else>
          Выберите неделю
        </template>
      </span>
      <span class="trigger-icon" :class="{ 'is-open': isDropdownOpen }">▼</span>
    </div>
    
    <!-- Выпадающий список с барабаном -->
    <Transition name="dropdown-fade">
      <div
        v-if="isDropdownOpen"
        class="week-picker-dropdown"
        @click.stop
      >
        <div class="week-picker-wheel" ref="wheelContainer" @scroll="handleScroll">
          <div class="week-picker-items">
            <div
              v-for="(week, index) in weeks"
              :key="week.weekNumber"
              :class="['week-picker-item', { active: week.weekNumber === currentSelectedWeek?.weekNumber }]"
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
        
        <div class="week-picker-actions">
          <button class="btn-cancel" @click="cancelSelection">Отмена</button>
          <button class="btn-apply" @click="applySelection" :disabled="!currentSelectedWeek">Применить</button>
        </div>
      </div>
    </Transition>
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

const pickerContainer = ref(null);
const wheelContainer = ref(null);
const weeks = ref([]);
const isScrolling = ref(false);
const isDropdownOpen = ref(false);
const currentSelectedWeek = ref(null); // Временный выбор при прокрутке

/**
 * Генерация списка недель (от текущей назад и вперед)
 * @param {number} countBack - количество недель назад от текущей
 * @param {number} countForward - количество недель вперед от текущей
 */
function generateWeeks(countBack = 52, countForward = 4) {
  const weeksList = [];
  const now = new Date();
  
  // Получаем текущую неделю
  const currentWeek = getWeekBounds(now);
  const currentWeekNumber = getWeekNumber(now);
  
  // Генерируем недели назад (от текущей к прошлому)
  for (let i = 0; i < countBack; i++) {
    const weekDate = new Date(currentWeek.start);
    weekDate.setUTCDate(weekDate.getUTCDate() - (i * 7));
    
    const weekBounds = getWeekBounds(weekDate);
    const weekNumber = getWeekNumber(weekDate);
    
    weeksList.unshift({
      weekNumber,
      startUtc: weekBounds.start.toISOString(),
      endUtc: weekBounds.end.toISOString(),
      start: weekBounds.start,
      end: weekBounds.end
    });
  }
  
  // Добавляем текущую неделю (если еще не добавлена)
  if (weeksList.length === 0 || weeksList[weeksList.length - 1].weekNumber !== currentWeekNumber) {
    weeksList.push({
      weekNumber: currentWeekNumber,
      startUtc: currentWeek.start.toISOString(),
      endUtc: currentWeek.end.toISOString(),
      start: currentWeek.start,
      end: currentWeek.end
    });
  }
  
  // Генерируем недели вперед (от следующей к будущему)
  for (let i = 1; i <= countForward; i++) {
    const weekDate = new Date(currentWeek.start);
    weekDate.setUTCDate(weekDate.getUTCDate() + (i * 7));
    
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
  
  // Сортируем по дате начала недели (гарантирует правильный порядок даже при переходе через год)
  weeksList.sort((a, b) => a.start - b.start);
  
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
 * Открытие/закрытие выпадающего списка
 */
function toggleDropdown() {
  isDropdownOpen.value = !isDropdownOpen.value;
  
  if (isDropdownOpen.value) {
    // Обновляем список недель при открытии, чтобы всегда были актуальные недели
    weeks.value = generateWeeks(props.weeksCount, 4);
    
    // Инициализируем временный выбор текущей выбранной неделей
    currentSelectedWeek.value = props.selectedWeek || weeks.value.find(w => {
      const now = new Date();
      const currentWeekNumber = getWeekNumber(now);
      return w.weekNumber === currentWeekNumber;
    }) || weeks.value[0];
    
    // Прокручиваем к выбранной неделе
    nextTick(() => {
      if (currentSelectedWeek.value) {
        scrollToWeek(currentSelectedWeek.value.weekNumber);
      }
    });
  }
}

/**
 * Временный выбор недели (при клике на элемент)
 */
function selectWeek(week) {
  currentSelectedWeek.value = week;
  scrollToWeek(week.weekNumber);
}

/**
 * Применить выбор недели
 */
function applySelection() {
  if (currentSelectedWeek.value) {
    emit('update:selectedWeek', currentSelectedWeek.value);
    emit('change', currentSelectedWeek.value);
    isDropdownOpen.value = false;
  }
}

/**
 * Отменить выбор и закрыть выпадающий список
 */
function cancelSelection() {
  currentSelectedWeek.value = props.selectedWeek || null;
  isDropdownOpen.value = false;
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
 * Обработка прокрутки (обновление временного выбора недели в центре)
 */
function handleScroll() {
  if (isScrolling.value || !isDropdownOpen.value) return;
  
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
      if (week && (!currentSelectedWeek.value || week.weekNumber !== currentSelectedWeek.value.weekNumber)) {
        currentSelectedWeek.value = week;
      }
    }
    
    isScrolling.value = false;
  }, 150);
}

/**
 * Обработка клика вне компонента для закрытия dropdown
 */
function handleClickOutside(event) {
  if (pickerContainer.value && !pickerContainer.value.contains(event.target)) {
    if (isDropdownOpen.value) {
      cancelSelection();
    }
  }
}

// Инициализация
onMounted(() => {
  // Генерируем недели: countBack недель назад + 4 недели вперед
  weeks.value = generateWeeks(props.weeksCount, 4);
  
  // Инициализируем currentSelectedWeek
  if (props.selectedWeek) {
    currentSelectedWeek.value = props.selectedWeek;
  } else {
    // Если нет выбранной недели, выбираем текущую для отображения
    const now = new Date();
    const currentWeekNumber = getWeekNumber(now);
    const currentWeek = weeks.value.find(w => w.weekNumber === currentWeekNumber);
    
    if (currentWeek) {
      currentSelectedWeek.value = currentWeek;
    } else {
      // Fallback на первую неделю в списке
      currentSelectedWeek.value = weeks.value[0];
    }
  }
  
  // Добавляем обработчик клика вне компонента
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  if (window.weekPickerScrollTimeout) {
    clearTimeout(window.weekPickerScrollTimeout);
  }
  document.removeEventListener('click', handleClickOutside);
});

// Отслеживание изменений выбранной недели извне
watch(() => props.selectedWeek, (newWeek) => {
  if (newWeek) {
    currentSelectedWeek.value = newWeek;
    if (isDropdownOpen.value && !isScrolling.value) {
      nextTick(() => {
        scrollToWeek(newWeek.weekNumber);
      });
    }
  }
}, { deep: true });
</script>

<style scoped>
.week-picker {
  position: relative;
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

.week-picker-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  border: 1px solid var(--b24-border-medium, #d1d5db);
  border-radius: var(--radius-sm, 4px);
  background-color: var(--b24-bg-white, #ffffff);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
  font-size: var(--font-size-sm, 14px);
  color: var(--b24-text-primary, #111827);
}

.week-picker-trigger:hover {
  border-color: var(--b24-primary, #007bff);
  background-color: var(--b24-bg-light, #f3f4f6);
}

.week-picker-trigger.is-open {
  border-color: var(--b24-primary, #007bff);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.trigger-text {
  flex: 1;
  text-align: left;
}

.trigger-icon {
  margin-left: var(--spacing-sm, 8px);
  font-size: 10px;
  color: var(--b24-text-secondary, #6b7280);
  transition: transform var(--transition-base, 0.2s);
}

.trigger-icon.is-open {
  transform: rotate(180deg);
}

.week-picker-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: var(--spacing-xs, 4px);
  background-color: var(--b24-bg-white, #ffffff);
  border: 1px solid var(--b24-border-medium, #d1d5db);
  border-radius: var(--radius-md, 8px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  overflow: hidden;
}

.week-picker-wheel {
  position: relative;
  height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
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

.week-picker-actions {
  display: flex;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-sm, 8px);
  border-top: 1px solid var(--b24-border-light, #e5e7eb);
  background-color: var(--b24-bg-light, #f3f4f6);
}

.btn-cancel,
.btn-apply {
  flex: 1;
  padding: var(--spacing-sm, 8px) var(--spacing-md, 12px);
  border: 1px solid var(--b24-border-medium, #d1d5db);
  border-radius: var(--radius-sm, 4px);
  font-size: var(--font-size-sm, 14px);
  cursor: pointer;
  transition: all var(--transition-base, 0.2s);
}

.btn-cancel {
  background-color: var(--b24-bg-white, #ffffff);
  color: var(--b24-text-primary, #111827);
}

.btn-cancel:hover {
  background-color: var(--b24-bg-light, #f3f4f6);
  border-color: var(--b24-text-secondary, #6b7280);
}

.btn-apply {
  background-color: var(--b24-primary, #007bff);
  color: var(--b24-text-inverse, #ffffff);
  border-color: var(--b24-primary, #007bff);
}

.btn-apply:hover:not(:disabled) {
  background-color: var(--b24-primary-dark, #0056b3);
  border-color: var(--b24-primary-dark, #0056b3);
}

.btn-apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Анимация выпадающего списка */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity var(--transition-base, 0.2s), transform var(--transition-base, 0.2s);
}

.dropdown-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>

