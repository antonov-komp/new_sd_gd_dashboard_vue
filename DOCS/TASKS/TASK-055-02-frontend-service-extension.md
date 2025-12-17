# TASK-055-02: Расширение frontend сервиса для загрузки детальной информации о задачах

**Дата создания:** 2025-12-17 17:04 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 2 из TASK-055  
**Зависимости:** TASK-055-01 (Backend API расширен)

---

## Цель этапа

Добавить метод `getTasksDetails()` в сервис `timeTrackingService.js` для загрузки детальной информации о задачах через расширенный backend API с поддержкой пагинации.

---

## Контекст

- **Текущее состояние:**
  - Сервис `timeTrackingService.js` не имеет метода для получения детальной информации о задачах
  - Frontend не может загрузить полную информацию о задачах для отображения в карточках

- **Требуется:**
  1. Добавить метод `getTasksDetails()` в сервис
  2. Определить интерфейс данных задачи
  3. Обработать ответ API с пагинацией
  4. Обработать ошибки запроса

---

## Задачи этапа

### 1) Расширение timeTrackingService.js

**Файл:** `vue-app/src/services/tickets-time-tracking/timeTrackingService.js`

**Задачи:**

1. **Добавить метод `getTasksDetails()`:**
   - Принимает параметры: `taskIds`, `employeeId`, `weekNumber`, `page`, `perPage`
   - Выполняет POST-запрос к `/api/tickets-time-tracking-sector-1c.php`
   - Обрабатывает ответ с пагинацией
   - Возвращает объект с `tasks` и `pagination`

2. **Обработка ошибок:**
   - Обрабатывать HTTP ошибки (4xx, 5xx)
   - Обрабатывать ошибки API (поле `error` в ответе)
   - Бросать понятные исключения

---

### 2) Определение интерфейса данных

**Структура данных задачи:**

```javascript
/**
 * @typedef {Object} TaskDetail
 * @property {number} id - ID задачи
 * @property {string} title - Название задачи
 * @property {string|null} startDate - Дата начала (ISO string или null)
 * @property {string|null} deadline - Дедлайн (ISO string или null)
 * @property {string|null} closedDate - Дата завершения (ISO string или null)
 * @property {number} status - Статус задачи (2-7, для будущего использования)
 * @property {number} stageId - ID стадии (для будущего использования)
 * @property {number} responsibleId - ID ответственного
 * @property {number} createdBy - ID создателя
 * @property {number} elapsedTime - Трудозатрата в часах
 */

/**
 * @typedef {Object} TasksPagination
 * @property {number} totalTasks - Общее количество задач
 * @property {number} currentPage - Текущая страница
 * @property {number} perPage - Количество задач на страницу
 * @property {number} totalPages - Общее количество страниц
 */

/**
 * @typedef {Object} TasksDetailsResponse
 * @property {TaskDetail[]} tasks - Массив задач
 * @property {TasksPagination} pagination - Метаданные пагинации
 */
```

---

## Реализация

### Полный код метода

```javascript
/**
 * Получение детальной информации о задачах с поддержкой пагинации
 * 
 * @param {Object} params Параметры запроса
 * @param {Array<number>} params.taskIds Массив ID задач
 * @param {number} [params.employeeId] ID сотрудника (опционально)
 * @param {number} [params.weekNumber] Номер недели (опционально)
 * @param {number} [params.page=1] Номер страницы (по умолчанию 1)
 * @param {number} [params.perPage=10] Количество задач на страницу (по умолчанию 10)
 * @returns {Promise<TasksDetailsResponse>} Объект с массивом задач и метаданными пагинации
 * @throws {Error} При ошибке запроса или API
 */
export async function getTasksDetails({ 
  taskIds, 
  employeeId, 
  weekNumber, 
  page = 1, 
  perPage = 10 
}) {
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    return {
      tasks: [],
      pagination: {
        totalTasks: 0,
        currentPage: 1,
        perPage: perPage,
        totalPages: 0
      }
    };
  }
  
  try {
    const response = await fetch('/api/tickets-time-tracking-sector-1c.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        product: '1C',
        includeTaskDetails: true,
        taskIds: taskIds,
        employeeId: employeeId || undefined,
        weekNumber: weekNumber || undefined,
        page: page,
        perPage: perPage
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Ошибка получения данных о задачах');
    }
    
    return {
      tasks: result.data.tasks || [],
      pagination: result.data.pagination || {
        totalTasks: 0,
        currentPage: 1,
        perPage: perPage,
        totalPages: 0
      }
    };
  } catch (error) {
    console.error('[timeTrackingService] Error loading tasks details:', error);
    throw error;
  }
}
```

---

## Интеграция в сервис

**Файл:** `vue-app/src/services/tickets-time-tracking/timeTrackingService.js`

**Добавить метод в экспорт:**

```javascript
// В конце файла, перед export default или в экспорте

export {
  // ... существующие экспорты
  getTasksDetails
};
```

**Или добавить в объект сервиса (если используется):**

```javascript
export const timeTrackingService = {
  // ... существующие методы
  getTasksDetails
};
```

---

## Использование в компонентах

**Пример использования:**

```javascript
import { timeTrackingService } from '@/services/tickets-time-tracking/timeTrackingService.js';

// В компоненте
const loadTasksDetails = async () => {
  try {
    const response = await timeTrackingService.getTasksDetails({
      taskIds: [1001, 1002, 1003],
      employeeId: 123,
      weekNumber: 50,
      page: 1,
      perPage: 10
    });
    
    console.log('Tasks:', response.tasks);
    console.log('Pagination:', response.pagination);
  } catch (error) {
    console.error('Error:', error);
  }
};
```

---

## Обработка ошибок

**Типы ошибок:**

1. **HTTP ошибки (4xx, 5xx):**
   ```javascript
   if (!response.ok) {
     throw new Error(`HTTP error! status: ${response.status}`);
   }
   ```

2. **Ошибки API (поле `error` в ответе):**
   ```javascript
   if (!result.success) {
     throw new Error(result.error || 'Ошибка получения данных о задачах');
   }
   ```

3. **Ошибки сети:**
   - Обрабатываются автоматически через `catch`
   - Логируются в консоль

---

## Критерии приёмки

- [ ] Метод `getTasksDetails()` добавлен в сервис
- [ ] Метод корректно обрабатывает все параметры
- [ ] Метод возвращает данные в правильном формате
- [ ] Обработка ошибок реализована корректно
- [ ] JSDoc комментарии добавлены для типизации
- [ ] Метод экспортирован и доступен для использования
- [ ] Пример использования работает корректно

---

## Тестирование

### 1. Тестирование загрузки задач

**Тест 1: Загрузка задач с пагинацией**
```javascript
const response = await timeTrackingService.getTasksDetails({
  taskIds: [1001, 1002, 1003],
  page: 1,
  perPage: 10
});

console.assert(Array.isArray(response.tasks), 'Tasks should be an array');
console.assert(response.pagination.totalTasks >= 0, 'Total tasks should be >= 0');
```

**Ожидаемый результат:** Объект с `tasks` (массив) и `pagination` (объект).

---

### 2. Тестирование ошибок

**Тест 2: Обработка ошибки API**
```javascript
try {
  await timeTrackingService.getTasksDetails({
    taskIds: [999999] // Несуществующий ID
  });
} catch (error) {
  console.assert(error instanceof Error, 'Should throw Error');
}
```

**Ожидаемый результат:** Выбрасывается исключение с понятным сообщением.

---

### 3. Тестирование пустого массива

**Тест 3: Пустой массив taskIds**
```javascript
const response = await timeTrackingService.getTasksDetails({
  taskIds: []
});

console.assert(response.tasks.length === 0, 'Tasks should be empty');
console.assert(response.pagination.totalTasks === 0, 'Total tasks should be 0');
```

**Ожидаемый результат:** Пустой массив задач и нулевая пагинация.

---

## Примечания

- **Типизация:** Используем JSDoc комментарии для описания типов (TypeScript не используется)
- **Обработка ошибок:** Все ошибки логируются в консоль с префиксом `[timeTrackingService]`
- **Значения по умолчанию:** `page = 1`, `perPage = 10`
- **Валидация:** Проверяем, что `taskIds` — массив и не пустой

---

## Следующий этап

После завершения этого этапа переходим к **TASK-055-03: Модификация компонента попапа (Frontend)**.

