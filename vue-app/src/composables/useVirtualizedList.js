/**
 * Composable для виртуализации больших списков
 * 
 * Расположение: vue-app/src/composables/useVirtualizedList.js
 * 
 * Реализует виртуализацию для оптимизации рендеринга больших списков
 * Показывает только видимые элементы + небольшой буфер
 */

import { ref, computed, onMounted, onUnmounted } from 'vue';

/**
 * Composable для виртуализации списка
 * 
 * @param {Object} options Опции
 * @param {number} options.itemHeight Высота одного элемента (px)
 * @param {number} options.containerHeight Высота контейнера (px)
 * @param {number} options.bufferSize Количество элементов в буфере
 * @param {number} options.totalItems Общее количество элементов
 * @returns {Object} API для работы с виртуализацией
 */
export function useVirtualizedList(options = {}) {
  const {
    itemHeight = 50,
    containerHeight = 600,
    bufferSize = 5,
    totalItems = 0
  } = options;

  // Состояние
  const scrollTop = ref(0);
  const containerRef = ref(null);

  // Вычисляемые свойства
  const visibleCount = computed(() => {
    return Math.ceil(containerHeight / itemHeight);
  });

  const startIndex = computed(() => {
    const index = Math.floor(scrollTop.value / itemHeight);
    return Math.max(0, index - bufferSize);
  });

  const endIndex = computed(() => {
    const index = startIndex.value + visibleCount.value + bufferSize * 2;
    return Math.min(totalItems, index);
  });

  const visibleItems = computed(() => {
    return {
      start: startIndex.value,
      end: endIndex.value,
      count: endIndex.value - startIndex.value
    };
  });

  const offsetY = computed(() => {
    return startIndex.value * itemHeight;
  });

  const totalHeight = computed(() => {
    return totalItems * itemHeight;
  });

  // Обработка скролла
  const handleScroll = (event) => {
    if (containerRef.value) {
      scrollTop.value = containerRef.value.scrollTop;
    } else if (event && event.target) {
      scrollTop.value = event.target.scrollTop;
    }
  };

  // Прокрутка к элементу
  const scrollToItem = (index) => {
    if (containerRef.value && index >= 0 && index < totalItems) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTop = targetScrollTop;
      scrollTop.value = targetScrollTop;
    }
  };

  // Прокрутка в начало
  const scrollToTop = () => {
    scrollToItem(0);
  };

  // Прокрутка в конец
  const scrollToBottom = () => {
    scrollToItem(totalItems - 1);
  };

  // Установка контейнера
  const setContainer = (element) => {
    containerRef.value = element;
    if (element) {
      element.addEventListener('scroll', handleScroll, { passive: true });
    }
  };

  // Очистка при размонтировании
  onUnmounted(() => {
    if (containerRef.value) {
      containerRef.value.removeEventListener('scroll', handleScroll);
    }
  });

  return {
    // Состояние
    scrollTop,
    containerRef,
    
    // Вычисляемые свойства
    visibleItems,
    offsetY,
    totalHeight,
    startIndex,
    endIndex,
    
    // Методы
    handleScroll,
    scrollToItem,
    scrollToTop,
    scrollToBottom,
    setContainer
  };
}







