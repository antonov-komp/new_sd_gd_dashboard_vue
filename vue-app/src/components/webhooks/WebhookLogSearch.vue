<template>
  <div class="webhook-search">
    <div class="search-wrapper">
      <span class="search-icon">🔍</span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Поиск по содержимому логов (событие, payload, IP, детали)..."
        class="search-input"
        @input="handleSearchInput"
        @keyup.enter="handleSearch"
        @keyup.esc="clearSearch"
      />
      <button
        v-if="searchQuery"
        @click="clearSearch"
        class="clear-button"
        title="Очистить поиск (Esc)"
        aria-label="Очистить поиск"
      >
        ✕
      </button>
    </div>
    
    <!-- Индикатор поиска -->
    <div v-if="isSearching" class="search-indicator">
      <span class="spinner"></span>
      Поиск...
    </div>
    
    <!-- Результаты поиска -->
    <div v-if="searchQuery && searchResultsCount !== null" class="search-results">
      Найдено: {{ searchResultsCount }} {{ getResultsText(searchResultsCount) }}
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { debounce } from '@/utils/debounce.js';
import { 
  isValidWebhookLogEntry,
  normalizeWebhookLogEntry 
} from '@/types/webhook-logs.js';
import { 
  formatEventType,
  formatCategory,
  formatEventDetails 
} from '@/utils/webhook-formatters.js';

export default {
  name: 'WebhookLogSearch',
  props: {
    modelValue: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'search'],
  setup(props, { emit }) {
    const searchQuery = ref(props.modelValue || '');
    const isSearching = ref(false);
    const searchResultsCount = ref(null);
    
    // Debounced функция поиска
    const debouncedSearch = debounce((value) => {
      isSearching.value = false;
      emit('search', value);
    }, 400);
    
    // Обработчик ввода
    const handleSearchInput = () => {
      isSearching.value = true;
      emit('update:modelValue', searchQuery.value);
      debouncedSearch(searchQuery.value);
    };
    
    // Немедленный поиск (при нажатии Enter)
    const handleSearch = () => {
      isSearching.value = false;
      emit('search', searchQuery.value);
    };
    
    // Очистка поиска
    const clearSearch = () => {
      searchQuery.value = '';
      isSearching.value = false;
      searchResultsCount.value = null;
      emit('update:modelValue', '');
      emit('search', '');
    };
    
    // Синхронизация с props
    watch(() => props.modelValue, (newValue) => {
      if (newValue !== searchQuery.value) {
        searchQuery.value = newValue;
      }
    });
    
    // Установка количества результатов (извне)
    const setResultsCount = (count) => {
      searchResultsCount.value = count;
    };
    
    // Получить правильную форму слова "запись"
    const getResultsText = (count) => {
      const lastDigit = count % 10;
      const lastTwoDigits = count % 100;
      
      if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'записей';
      }
      
      if (lastDigit === 1) {
        return 'запись';
      }
      
      if (lastDigit >= 2 && lastDigit <= 4) {
        return 'записи';
      }
      
      return 'записей';
    };
    
    // Функция поиска для работы с новой структурой данных
    const performSearch = (query, logs) => {
      if (!query || !logs || !Array.isArray(logs)) {
        return [];
      }
      
      const searchQuery = query.toLowerCase().trim();
      
      if (searchQuery.length === 0) {
        return logs;
      }
      
      // Нормализация и валидация логов перед поиском
      const normalizedLogs = logs
        .map(log => normalizeWebhookLogEntry(log))
        .filter(log => isValidWebhookLogEntry(log));
      
      return normalizedLogs.filter(log => {
        // Поиск по типу события
        if (log.event && log.event.toLowerCase().includes(searchQuery)) {
          return true;
        }
        
        // Поиск по категории
        if (log.category && log.category.toLowerCase().includes(searchQuery)) {
          return true;
        }
        
        // Поиск по IP адресу
        if (log.ip && log.ip.toLowerCase().includes(searchQuery)) {
          return true;
        }
        
        // Поиск по деталям события
        if (log.details && typeof log.details === 'object') {
          // Поиск по ID задачи
          if (log.details.task_id && String(log.details.task_id).includes(searchQuery)) {
            return true;
          }
          
          // Поиск по названию задачи
          if (log.details.task_title && log.details.task_title.toLowerCase().includes(searchQuery)) {
            return true;
          }
          
          // Поиск по ID сущности
          if (log.details.entity_id && String(log.details.entity_id).includes(searchQuery)) {
            return true;
          }
          
          // Поиск по названию сущности
          if (log.details.title && log.details.title.toLowerCase().includes(searchQuery)) {
            return true;
          }
          
          // Поиск по тексту комментария
          if (log.details.comment_text && log.details.comment_text.toLowerCase().includes(searchQuery)) {
            return true;
          }
        }
        
        // Поиск по payload (если он есть)
        if (log.payload && typeof log.payload === 'object') {
          try {
            const payloadString = JSON.stringify(log.payload).toLowerCase();
            if (payloadString.includes(searchQuery)) {
              return true;
            }
          } catch (e) {
            // Игнорируем ошибки сериализации
          }
        }
        
        return false;
      });
    };
    
    // Форматирование результатов поиска
    const formatSearchResult = (log) => {
      const parts = [];
      
      // Тип события
      if (log.event) {
        parts.push(formatEventType(log.event));
      }
      
      // Категория
      if (log.category) {
        parts.push(formatCategory(log.category));
      }
      
      // Детали
      if (log.details) {
        const detailsText = formatEventDetails(log.details);
        if (detailsText !== '—') {
          parts.push(detailsText);
        }
      }
      
      return parts.join(' • ');
    };
    
    // Экспорт метода для внешнего использования
    return {
      searchQuery,
      isSearching,
      searchResultsCount,
      handleSearchInput,
      handleSearch,
      clearSearch,
      setResultsCount,
      getResultsText,
      performSearch,
      formatSearchResult
    };
  }
};
</script>

<style scoped>
.webhook-search {
  margin-bottom: 20px;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  transition: border-color 0.2s;
}

.search-wrapper:focus-within {
  border-color: #2196F3;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.1);
}

.search-icon {
  font-size: 18px;
  margin-right: 8px;
  color: #666;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #333;
  background: transparent;
}

.search-input::placeholder {
  color: #999;
}

.clear-button {
  background: none;
  border: none;
  font-size: 18px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background 0.2s;
  margin-left: 8px;
}

.clear-button:hover {
  background: #f0f0f0;
  color: #333;
}

.search-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 14px;
  color: #666;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.search-results {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  padding: 8px;
  background: #e7f3ff;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .search-input {
    font-size: 16px; /* Предотвращает зум на iOS */
  }
}
</style>

