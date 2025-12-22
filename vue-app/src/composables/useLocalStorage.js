import { ref, watch } from 'vue';

/**
 * Composable для работы с localStorage
 * 
 * @param {string} key - Ключ в localStorage
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {Object} { value, save, load, clear }
 */
export function useLocalStorage(key, defaultValue = null) {
  // Загрузка из localStorage
  const load = () => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return defaultValue;
    }
  };
  
  // Сохранение в localStorage
  const save = (value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  };
  
  // Очистка
  const clear = () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error clearing ${key} from localStorage:`, error);
    }
  };
  
  // Реактивное значение
  const value = ref(load());
  
  // Автоматическое сохранение при изменении
  watch(value, (newValue) => {
    save(newValue);
  }, { deep: true });
  
  return {
    value,
    save,
    load,
    clear
  };
}

