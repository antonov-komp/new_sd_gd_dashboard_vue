/**
 * Утилита для управления скрытыми пользователями
 * 
 * Скрытые пользователи не отображаются в интерфейсе активности,
 * но их события продолжают логироваться в системе.
 * 
 * Данные хранятся в localStorage для сохранения между сессиями.
 */

const STORAGE_KEY = 'hidden_users_list';

/**
 * Получить список скрытых пользователей
 * 
 * @returns {Array<number>} Массив ID скрытых пользователей
 */
export function getHiddenUsers() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.map(id => Number(id)) : [];
  } catch (error) {
    console.error('[HiddenUsersManager] Error reading hidden users:', error);
    return [];
  }
}

/**
 * Добавить пользователя в список скрытых
 * 
 * @param {number} userId ID пользователя
 */
export function hideUser(userId) {
  const hidden = getHiddenUsers();
  const userIdNum = Number(userId);
  
  if (!hidden.includes(userIdNum)) {
    hidden.push(userIdNum);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(hidden));
    } catch (error) {
      console.error('[HiddenUsersManager] Error saving hidden users:', error);
    }
  }
}

/**
 * Показать пользователя (удалить из списка скрытых)
 * 
 * @param {number} userId ID пользователя
 */
export function showUser(userId) {
  const hidden = getHiddenUsers();
  const userIdNum = Number(userId);
  
  const filtered = hidden.filter(id => id !== userIdNum);
  
  if (filtered.length !== hidden.length) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('[HiddenUsersManager] Error saving hidden users:', error);
    }
  }
}

/**
 * Проверить, скрыт ли пользователь
 * 
 * @param {number} userId ID пользователя
 * @returns {boolean} true, если пользователь скрыт
 */
export function isUserHidden(userId) {
  const hidden = getHiddenUsers();
  return hidden.includes(Number(userId));
}

/**
 * Очистить список скрытых пользователей
 */
export function clearHiddenUsers() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[HiddenUsersManager] Error clearing hidden users:', error);
  }
}

/**
 * Получить список пользователей из записей активности
 * 
 * @param {Array} activity Массив записей активности
 * @returns {Array<{id: number, name: string, count: number}>} Список уникальных пользователей с количеством записей
 */
export function getUsersFromActivity(activity) {
  const usersMap = new Map();
  
  activity.forEach(entry => {
    if (entry.user_id) {
      const userId = Number(entry.user_id);
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          name: entry.user_name || `User #${userId}`,
          count: 0
        });
      }
      usersMap.get(userId).count++;
    }
  });
  
  return Array.from(usersMap.values()).sort((a, b) => b.count - a.count);
}

/**
 * Отфильтровать активность, исключив скрытых пользователей
 * 
 * @param {Array} activity Массив записей активности
 * @returns {Array} Отфильтрованный массив без записей скрытых пользователей
 */
export function filterHiddenUsers(activity) {
  const hidden = getHiddenUsers();
  if (hidden.length === 0) {
    return activity;
  }
  
  return activity.filter(entry => {
    if (!entry.user_id) {
      return true; // Записи без user_id не фильтруем
    }
    return !hidden.includes(Number(entry.user_id));
  });
}

