<template>
  <div class="virtual-list-container" ref="container">
    <div
      class="virtual-list"
      :style="{ height: `${listHeight}px` }"
      @scroll="handleScroll"
    >
      <div
        class="virtual-spacer top"
        :style="{ height: `${offsetTop}px` }"
      ></div>

      <div
        v-for="(item, index) in visibleItems"
        :key="getItemKey(item, startIndex + index)"
        class="virtual-item"
      >
        <slot
          name="item"
          :item="item"
          :index="startIndex + index"
        />
      </div>

      <div
        class="virtual-spacer bottom"
        :style="{ height: `${offsetBottom}px` }"
      ></div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'VirtualList',
  emits: ['item-click'],
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
    bufferSize: {
      type: Number,
      default: 5
    }
  },
  data() {
    return {
      scrollTop: 0
    };
  },
  computed: {
    totalItems() {
      return this.items.length;
    },

    totalHeight() {
      return this.totalItems * this.itemHeight;
    },

    visibleCount() {
      return Math.ceil(this.containerHeight / this.itemHeight) + (this.bufferSize * 2);
    },

    startIndex() {
      const rawStart = Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize;
      return Math.max(0, rawStart);
    },

    endIndex() {
      const rawEnd = this.startIndex + this.visibleCount;
      return Math.min(this.totalItems, rawEnd);
    },

    visibleItems() {
      return this.items.slice(this.startIndex, this.endIndex);
    },

    offsetTop() {
      return this.startIndex * this.itemHeight;
    },

    offsetBottom() {
      return Math.max(0, this.totalHeight - this.offsetTop - (this.visibleItems.length * this.itemHeight));
    },

    listHeight() {
      return Math.min(this.totalHeight, this.containerHeight);
    }
  },
  methods: {
    handleScroll(event) {
      this.scrollTop = event.target.scrollTop;
    },

    getItemKey(item, index) {
      return item.id || item.key || index;
    },

    scrollToIndex(index) {
      const scrollTop = Math.max(0, (index * this.itemHeight) - (this.containerHeight / 2));
      this.$refs.container?.scrollTo({ top: scrollTop, behavior: 'smooth' });
    },

    scrollToTop() {
      this.$refs.container?.scrollTo({ top: 0, behavior: 'smooth' });
    },

    scrollToBottom() {
      const scrollTop = this.totalHeight - this.containerHeight;
      this.$refs.container?.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }
};
</script>

<style scoped>
.virtual-list-container {
  position: relative;
  overflow: hidden;
  width: 100%;
}

.virtual-list {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.virtual-list::-webkit-scrollbar {
  width: 6px;
}

.virtual-list::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.virtual-list::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.virtual-list::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.virtual-spacer {
  pointer-events: none;
}

.virtual-item {
  position: relative;
}

/* Smooth scrolling for better UX */
.virtual-list {
  scroll-behavior: smooth;
}

/* Focus management */
.virtual-item:focus-within {
  outline: 2px solid #007bff;
  outline-offset: -2px;
}

/* Loading state styles can be added here if needed */
.virtual-list.loading {
  opacity: 0.7;
  pointer-events: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .virtual-list {
    scrollbar-width: none;
  }

  .virtual-list::-webkit-scrollbar {
    display: none;
  }
}
</style>