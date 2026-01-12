<template>
  <div class="virtual-list" ref="container">
    <div
      class="virtual-list-wrapper"
      :style="{ height: totalHeight + 'px' }"
    >
      <div
        class="virtual-list-items"
        :style="{ transform: 'translateY(' + offsetY + 'px)' }"
      >
        <div
          v-for="item in visibleItems"
          :key="getItemKey(item)"
          class="virtual-item"
          :style="{ height: itemHeight + 'px' }"
        >
          <slot :item="item" :index="getItemIndex(item)"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue';

export default {
  name: 'VirtualList',
  props: {
    items: {
      type: Array,
      default: () => []
    },
    itemHeight: {
      type: Number,
      default: 50
    },
    containerHeight: {
      type: Number,
      default: 400
    },
    buffer: {
      type: Number,
      default: 5 // Количество дополнительных элементов для рендеринга
    }
  },
  emits: ['item-visible'],
  setup(props, { emit }) {
    const container = ref(null);
    const scrollTop = ref(0);

    // Общее количество элементов
    const totalCount = computed(() => props.items.length);

    // Общая высота списка
    const totalHeight = computed(() => totalCount.value * props.itemHeight);

    // Начальный индекс видимых элементов
    const startIndex = computed(() => {
      const index = Math.floor(scrollTop.value / props.itemHeight);
      return Math.max(0, index - props.buffer);
    });

    // Конечный индекс видимых элементов
    const endIndex = computed(() => {
      const index = Math.floor((scrollTop.value + props.containerHeight) / props.itemHeight);
      return Math.min(totalCount.value - 1, index + props.buffer);
    });

    // Видимые элементы
    const visibleItems = computed(() => {
      return props.items.slice(startIndex.value, endIndex.value + 1);
    });

    // Смещение по Y для видимых элементов
    const offsetY = computed(() => startIndex.value * props.itemHeight);

    // Обработчик скролла
    const handleScroll = () => {
      if (container.value) {
        scrollTop.value = container.value.scrollTop;
      }
    };

    // Получение ключа элемента
    const getItemKey = (item) => {
      return item.id || item._id || props.items.indexOf(item);
    };

    // Получение индекса элемента в общем массиве
    const getItemIndex = (item) => {
      return props.items.indexOf(item);
    };

    onMounted(() => {
      if (container.value) {
        container.value.addEventListener('scroll', handleScroll);
      }
    });

    onUnmounted(() => {
      if (container.value) {
        container.value.removeEventListener('scroll', handleScroll);
      }
    });

    return {
      container,
      totalHeight,
      offsetY,
      visibleItems,
      getItemKey,
      getItemIndex
    };
  }
};
</script>

<style scoped>
.virtual-list {
  height: 400px;
  overflow-y: auto;
  overflow-x: hidden;
}

.virtual-list-wrapper {
  position: relative;
}

.virtual-list-items {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.virtual-item {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
}
</style>