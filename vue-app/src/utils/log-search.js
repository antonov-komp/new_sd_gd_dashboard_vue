/**
 * Поиск по логам вебхуков
 * 
 * @param {Array} logs - Массив логов для поиска
 * @param {string} query - Поисковый запрос
 * @param {Object} options - Опции поиска
 * @returns {Array} Отфильтрованные логи
 */
export function searchInLogs(logs, query, options = {}) {
  if (!query || !query.trim()) {
    return logs;
  }
  
  const {
    caseSensitive = false,
    searchInEvent = true,
    searchInPayload = true,
    searchInDetails = true,
    searchInIp = true,
    searchInTimestamp = false
  } = options;
  
  const searchQuery = caseSensitive ? query.trim() : query.trim().toLowerCase();
  
  return logs.filter(log => {
    // Поиск в event
    if (searchInEvent && log.event) {
      const eventText = caseSensitive ? log.event : log.event.toLowerCase();
      if (eventText.includes(searchQuery)) {
        return true;
      }
    }
    
    // Поиск в payload (JSON stringify)
    if (searchInPayload && log.payload) {
      try {
        const payloadText = JSON.stringify(log.payload);
        const searchText = caseSensitive ? payloadText : payloadText.toLowerCase();
        if (searchText.includes(searchQuery)) {
          return true;
        }
      } catch (error) {
        console.warn('Error searching in payload:', error);
      }
    }
    
    // Поиск в details
    if (searchInDetails && log.details) {
      try {
        const detailsText = JSON.stringify(log.details);
        const searchText = caseSensitive ? detailsText : detailsText.toLowerCase();
        if (searchText.includes(searchQuery)) {
          return true;
        }
      } catch (error) {
        console.warn('Error searching in details:', error);
      }
    }
    
    // Поиск в IP (точное совпадение или частичное)
    if (searchInIp && log.ip) {
      const ipText = caseSensitive ? log.ip : log.ip.toLowerCase();
      if (ipText.includes(searchQuery)) {
        return true;
      }
    }
    
    // Поиск в timestamp
    if (searchInTimestamp && log.timestamp) {
      const timestampText = caseSensitive ? log.timestamp : log.timestamp.toLowerCase();
      if (timestampText.includes(searchQuery)) {
        return true;
      }
    }
    
    return false;
  });
}

/**
 * Подсветка найденных совпадений в тексте
 * 
 * @param {string} text - Текст для подсветки
 * @param {string} query - Поисковый запрос
 * @returns {string} HTML с подсветкой
 */
export function highlightSearchMatches(text, query) {
  if (!query || !text) {
    return text;
  }
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Расширенный поиск с поддержкой операторов
 * 
 * Поддерживаемые операторы:
 * - "текст" - точная фраза
 * - AND, OR, NOT - логические операторы
 * 
 * @param {Array} logs - Массив логов
 * @param {string} query - Поисковый запрос
 * @returns {Array} Отфильтрованные логи
 */
export function advancedSearchInLogs(logs, query) {
  if (!query || !query.trim()) {
    return logs;
  }
  
  // Простой поиск (без операторов)
  if (!query.includes('"') && !query.includes(' AND ') && !query.includes(' OR ') && !query.includes(' NOT ')) {
    return searchInLogs(logs, query);
  }
  
  // Поиск с операторами (упрощённая реализация)
  const parts = query.split(/\s+(AND|OR|NOT)\s+/i);
  let results = [];
  
  for (let i = 0; i < parts.length; i += 2) {
    const searchTerm = parts[i].replace(/"/g, '').trim();
    const operator = parts[i + 1]?.toUpperCase();
    
    if (searchTerm) {
      const found = searchInLogs(logs, searchTerm);
      
      if (i === 0) {
        results = [...found];
      } else if (operator === 'AND') {
        // Пересечение результатов
        results = results.filter(log => found.some(f => getLogId(f) === getLogId(log)));
      } else if (operator === 'OR') {
        // Объединение результатов
        const foundIds = new Set(results.map(getLogId));
        results.push(...found.filter(log => !foundIds.has(getLogId(log))));
      } else if (operator === 'NOT') {
        // Исключение результатов
        const foundIds = new Set(found.map(getLogId));
        results = results.filter(log => !foundIds.has(getLogId(log)));
      }
    }
  }
  
  return results;
}

/**
 * Получить уникальный ID лога для сравнения
 */
function getLogId(log) {
  return `${log.timestamp}_${log.event}_${log.ip || 'unknown'}`;
}

