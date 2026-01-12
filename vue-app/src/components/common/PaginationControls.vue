<template>
  <div class="pagination-controls" v-if="totalPages > 1">
    <div class="pagination-info">
      <span class="pagination-text">
        {{ startItem }}-{{ endItem }} из {{ totalItems.toLocaleString() }}
      </span>
    </div>

    <div class="pagination-nav">
      <!-- First page -->
      <button
        @click="$emit('page-change', 1)"
        :disabled="currentPage === 1"
        class="page-btn first"
        :aria-label="'Перейти на первую страницу'"
        :title="'Первая страница'"
      >
        ««
      </button>

      <!-- Previous page -->
      <button
        @click="$emit('page-change', currentPage - 1)"
        :disabled="currentPage === 1"
        class="page-btn prev"
        :aria-label="'Перейти на предыдущую страницу'"
        :title="'Предыдущая страница'"
      >
        ‹
      </button>

      <!-- Page numbers -->
      <template v-for="page in visiblePages" :key="page">
        <button
          v-if="page === '...'"
          class="page-btn ellipsis"
          disabled
          aria-hidden="true"
        >
          {{ page }}
        </button>
        <button
          v-else
          @click="$emit('page-change', page)"
          :class="{
            'page-btn': true,
            'current': page === currentPage
          }"
          :aria-label="`Перейти на страницу ${page}`"
          :aria-current="page === currentPage ? 'page' : null"
        >
          {{ page }}
        </button>
      </template>

      <!-- Next page -->
      <button
        @click="$emit('page-change', currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="page-btn next"
        :aria-label="'Перейти на следующую страницу'"
        :title="'Следующая страница'"
      >
        ›
      </button>

      <!-- Last page -->
      <button
        @click="$emit('page-change', totalPages)"
        :disabled="currentPage === totalPages"
        class="page-btn last"
        :aria-label="'Перейти на последнюю страницу'"
        :title="'Последняя страница'"
      >
        »»
      </button>
    </div>

    <!-- Per page selector -->
    <div class="per-page-selector" v-if="showPerPageSelector">
      <label for="per-page-select" class="per-page-label">Показывать:</label>
      <select
        id="per-page-select"
        :value="perPage"
        @change="$emit('per-page-change', parseInt($event.target.value))"
        class="per-page-select"
        :aria-label="'Количество элементов на странице'"
      >
        <option v-for="option in perPageOptions" :key="option" :value="option">
          {{ option }}
        </option>
      </select>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PaginationControls',
  emits: ['page-change', 'per-page-change'],
  props: {
    currentPage: {
      type: Number,
      required: true
    },
    totalPages: {
      type: Number,
      required: true
    },
    totalItems: {
      type: Number,
      required: true
    },
    perPage: {
      type: Number,
      default: 50
    },
    showPerPageSelector: {
      type: Boolean,
      default: true
    },
    perPageOptions: {
      type: Array,
      default: () => [10, 25, 50, 100]
    },
    maxVisiblePages: {
      type: Number,
      default: 7
    }
  },
  computed: {
    startItem() {
      return (this.currentPage - 1) * this.perPage + 1;
    },

    endItem() {
      return Math.min(this.currentPage * this.perPage, this.totalItems);
    },

    visiblePages() {
      const pages = [];
      const total = this.totalPages;
      const current = this.currentPage;
      const maxVisible = this.maxVisiblePages;

      if (total <= maxVisible) {
        // Show all pages
        for (let i = 1; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // Smart pagination with ellipsis
        const start = Math.max(1, current - Math.floor(maxVisible / 2));
        const end = Math.min(total, start + maxVisible - 1);

        // Adjust start if we're near the end
        const adjustedStart = Math.max(1, end - maxVisible + 1);

        // Add first page and ellipsis if needed
        if (adjustedStart > 1) {
          pages.push(1);
          if (adjustedStart > 2) {
            pages.push('...');
          }
        }

        // Add visible pages
        for (let i = adjustedStart; i <= end; i++) {
          pages.push(i);
        }

        // Add ellipsis and last page if needed
        if (end < total) {
          if (end < total - 1) {
            pages.push('...');
          }
          pages.push(total);
        }
      }

      return pages;
    }
  }
};
</script>

<style scoped>
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid #e9ecef;
  margin-top: 16px;
}

.pagination-info {
  flex-shrink: 0;
}

.pagination-text {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.pagination-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  justify-content: center;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  color: #007bff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  user-select: none;
}

.page-btn:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #007bff;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 123, 255, 0.2);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.page-btn.current {
  background: #007bff;
  color: white;
  border-color: #007bff;
  font-weight: 700;
}

.page-btn.current:hover {
  background: #0056b3;
  border-color: #0056b3;
}

.page-btn.ellipsis {
  cursor: default;
  color: #6c757d;
  border-color: transparent;
  background: transparent;
}

.page-btn.ellipsis:hover {
  transform: none;
  box-shadow: none;
  background: transparent;
}

.page-btn.first,
.page-btn.last {
  font-size: 12px;
  min-width: 32px;
}

.per-page-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.per-page-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.per-page-select {
  padding: 4px 8px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
}

.per-page-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

/* Responsive */
@media (max-width: 768px) {
  .pagination-controls {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .pagination-nav {
    order: -1;
    justify-content: space-between;
  }

  .pagination-info {
    text-align: center;
  }

  .per-page-selector {
    justify-content: center;
  }

  .page-btn {
    min-width: 32px;
    height: 32px;
    font-size: 13px;
  }

  .page-btn.first,
  .page-btn.last {
    display: none;
  }
}

@media (max-width: 480px) {
  .pagination-nav {
    gap: 2px;
  }

  .page-btn {
    min-width: 28px;
    height: 28px;
    font-size: 12px;
    padding: 0 4px;
  }

  .per-page-selector {
    flex-direction: column;
    gap: 4px;
  }

  .per-page-label {
    font-size: 13px;
  }
}

/* Dark theme */
@media (prefers-color-scheme: dark) {
  .pagination-text,
  .per-page-label {
    color: #adb5bd;
  }

  .page-btn {
    background: #343a40;
    border-color: #495057;
    color: #adb5bd;
  }

  .page-btn:hover:not(:disabled) {
    background: #495057;
    border-color: #6c757d;
  }

  .page-btn.current {
    background: #007bff;
    border-color: #007bff;
  }

  .per-page-select {
    background: #343a40;
    border-color: #495057;
    color: #adb5bd;
  }
}

/* High contrast */
@media (prefers-contrast: high) {
  .page-btn,
  .per-page-select {
    border-width: 2px;
  }

  .page-btn.current {
    border-width: 3px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .page-btn,
  .per-page-select {
    transition: none;
  }

  .page-btn:hover {
    transform: none;
  }
}
</style>