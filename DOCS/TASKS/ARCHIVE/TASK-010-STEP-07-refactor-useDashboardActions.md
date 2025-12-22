# TASK-010-STEP-07: Рефакторинг `useDashboardActions.js` — упрощение логики прогресса

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Vue.js Программист  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-007, TASK-010-STEP-03

---

## Описание

Рефакторить файл `useDashboardActions.js`, упростив логику обработки колбэков прогресса и убрав избыточные `console.log`, используя утилиты из `progress-utils.js`, созданные в STEP-03.

**Цель:** Упростить код композабла, вынеся логику обработки колбэков прогресса в отдельную функцию, и улучшить читаемость без нарушения существующей логики.

---

## Контекст

**Текущее состояние:**
- В `useDashboardActions.js` сложная логика обработки колбэков прогресса в функции `loadSectorData()`
- Множественные `console.log` для отладки остались в коде
- Логика обновления прогресса дублируется и может быть упрощена

**После STEP-03:**
- Созданы утилиты `createProgressDetails()`, `normalizeProgressData()`, `calculateProgress()` в `progress-utils.js`

**Цель STEP-07:**
- Вынести логику обработки колбэков прогресса в отдельную функцию
- Упростить логику обновления прогресса
- Убрать избыточные `console.log` (оставить только критичные)
- Сохранить существующую функциональность

---

## Модули и компоненты

### Файлы для обновления:

1. **`vue-app/src/composables/useDashboardActions.js`**
   - Импортировать утилиты из `progress-utils.js`
   - Вынести логику обработки колбэков прогресса в отдельную функцию
   - Упростить логику обновления прогресса
   - Убрать избыточные `console.log`

### Зависимости:

- **TASK-010-STEP-03** — должна быть завершена (утилиты `progress-utils.js` созданы)

---

## Зависимости

### От других задач:
- **TASK-010-STEP-03** — должна быть завершена (утилиты `progress-utils.js` созданы)
- **TASK-007** — должна быть завершена (прелоадер реализован)

### От модулей:
- Использует утилиты из `progress-utils.js`
- Использует `useLoadingProgress` композабл
- Использует `DashboardSector1CService`

---

## Ступенчатые подзадачи

### 1. Импортировать утилиты из `progress-utils.js`

**Изменения в начале файла:**
```javascript
// Добавить импорты после существующих импортов
import { 
  normalizeProgressData 
} from '@/services/dashboard-sector-1c/utils/progress-utils.js';
```

### 2. Создать функцию `handleProgressCallback()`

**Новая функция:**
```javascript
/**
 * Обработка колбэка прогресса из сервиса
 * 
 * Нормализует данные прогресса и обновляет состояние загрузки
 * 
 * @param {object} progressInfo - Объект с данными прогресса из сервиса
 * @param {object} loadingProgress - Объект композабла useLoadingProgress
 * 
 * @example
 * handleProgressCallback(
 *   { step: 'loading_tickets', progress: 50, details: { description: 'Загрузка...' } },
 *   loadingProgress
 * );
 */
function handleProgressCallback(progressInfo, loadingProgress) {
  // Нормализуем данные прогресса
  const normalized = normalizeProgressData(progressInfo);
  
  // Обновляем этап (step) - это обязательно должно быть
  if (normalized.step) {
    loadingProgress.updateStep(normalized.step, normalized.details || {});
  }
  
  // Обновляем прогресс
  if (normalized.progress !== undefined && normalized.progress !== null) {
    loadingProgress.updateProgress(normalized.progress);
    // Если прогресс обновляется, значит загрузка продолжается - очищаем временную ошибку
    loadingProgress.clearTemporaryError();
  }
  
  // НЕ показываем ошибки из колбэка прогресса во время загрузки
  // Ошибки будут показаны только в catch блоке, если загрузка действительно завершилась с ошибкой
  // Это предотвращает показ временных ошибок, которые могут исчезнуть при успешной загрузке
}
```

**Критерии:**
- [ ] Функция `handleProgressCallback()` создана
- [ ] Функция нормализует данные прогресса через `normalizeProgressData()`
- [ ] Функция обновляет этап и прогресс через `loadingProgress`
- [ ] Функция очищает временную ошибку при обновлении прогресса

### 3. Обновить функцию `loadSectorData()` — использовать новую функцию

**Текущий код:**
```javascript
const loadSectorData = async (useCache = true) => {
  // ...
  try {
    const data = await DashboardSector1CService.getSectorData(
      useCache,
      (progressInfo) => {
        console.log('Progress callback received:', progressInfo);
        
        // Обновляем этап (step) - это обязательно должно быть
        if (progressInfo.step) {
          console.log('Updating step to:', progressInfo.step);
          loadingProgress.updateStep(progressInfo.step, progressInfo.details || {});
        } else {
          console.warn('Progress info without step:', progressInfo);
        }
        
        // Обновляем прогресс
        if (progressInfo.progress !== undefined && progressInfo.progress !== null) {
          console.log('Updating progress to:', progressInfo.progress);
          loadingProgress.updateProgress(progressInfo.progress);
          // Если прогресс обновляется, значит загрузка продолжается - очищаем временную ошибку
          loadingProgress.clearTemporaryError();
        } else if (progressInfo.percent !== undefined && progressInfo.percent !== null) {
          // Если передан percent вместо progress, используем его
          console.log('Updating progress from percent to:', progressInfo.percent);
          loadingProgress.updateProgress(progressInfo.percent);
          loadingProgress.clearTemporaryError();
        }
        
        // НЕ показываем ошибки из колбэка прогресса во время загрузки
        // Ошибки будут показаны только в catch блоке, если загрузка действительно завершилась с ошибкой
        // Это предотвращает показ временных ошибок, которые могут исчезнуть при успешной загрузке
      }
    );
    // ...
  } catch (err) {
    // ...
  }
};
```

**Обновлённый код:**
```javascript
const loadSectorData = async (useCache = true) => {
  // ...
  try {
    const data = await DashboardSector1CService.getSectorData(
      useCache,
      (progressInfo) => {
        handleProgressCallback(progressInfo, loadingProgress);
      }
    );
    // ...
  } catch (err) {
    // ...
  }
};
```

**Критерии:**
- [ ] Используется функция `handleProgressCallback()` вместо сложной логики
- [ ] Код стал значительно проще и читаемее
- [ ] Логика работы не нарушена (прелоадер обновляется корректно)

### 4. Убрать избыточные `console.log`

**Правила:**
- Удалить все `console.log`, которые использовались для отладки
- Оставить только критичные логи (например, ошибки)
- Заменить `console.log` на `console.warn` или `console.error`, если это важно

**Примеры удаления:**
```javascript
// Удалить:
console.log('Progress callback received:', progressInfo);
console.log('Updating step to:', progressInfo.step);
console.log('Updating progress to:', progressInfo.progress);
console.log('Updating progress from percent to:', progressInfo.percent);
console.warn('Progress info without step:', progressInfo);

// Оставить:
// (ошибки обрабатываются через handleErrorWithNotification)
```

**Критерии:**
- [ ] Избыточные `console.log` удалены
- [ ] Критичные логи оставлены (если есть)
- [ ] Код стал чище

---

## Технические требования

### Принципы рефакторинга:

1. **Не нарушать логику работы**
   - Все существующие тесты должны проходить
   - Функциональность должна работать идентично
   - Прелоадер должен обновляться корректно

2. **Выносить логику в отдельные функции**
   - Сложная логика обработки колбэков вынесена в отдельную функцию
   - Код стал более модульным и тестируемым

3. **Упрощать структуру**
   - Упростить логику обновления прогресса
   - Сделать код более читаемым

4. **Убирать отладочный код**
   - Удалить избыточные `console.log`
   - Оставить только критичные логи

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Импорты:** Named imports из утилит
- **Логирование:** Минимум логов, только критичные
- **Комментарии:** JSDoc для новой функции

---

## Критерии приёмки

- [ ] Импортированы утилиты из `progress-utils.js`
- [ ] Создана функция `handleProgressCallback()` с JSDoc комментариями
- [ ] Функция `loadSectorData()` использует `handleProgressCallback()` вместо сложной логики
- [ ] Логика обработки колбэков упрощена
- [ ] Избыточные `console.log` удалены (оставлены только критичные)
- [ ] Логика работы не нарушена:
  - [ ] Прелоадер обновляется корректно
  - [ ] Все этапы загрузки отображаются корректно
  - [ ] Прогресс-бар обновляется корректно
  - [ ] Детали этапа отображаются корректно
- [ ] Код стал более читаемым
- [ ] Код стал более модульным

---

## Тестирование

### Функциональное тестирование:

1. **Проверка обработки колбэков прогресса:**
   - Колбэки прогресса обрабатываются корректно
   - Этап обновляется корректно
   - Прогресс обновляется корректно
   - Временная ошибка очищается при обновлении прогресса

2. **Проверка прелоадера:**
   - Прелоадер отображается и обновляется корректно
   - Все этапы загрузки отображаются корректно
   - Прогресс-бар обновляется корректно

### Интеграционное тестирование:

1. Проверить работу дашборда в целом
2. Проверить, что прелоадер работает корректно
3. Проверить, что все этапы загрузки отображаются

---

## Примеры изменений

### До рефакторинга:

```javascript
const loadSectorData = async (useCache = true) => {
  // ...
  try {
    const data = await DashboardSector1CService.getSectorData(
      useCache,
      (progressInfo) => {
        console.log('Progress callback received:', progressInfo);
        
        if (progressInfo.step) {
          console.log('Updating step to:', progressInfo.step);
          loadingProgress.updateStep(progressInfo.step, progressInfo.details || {});
        } else {
          console.warn('Progress info without step:', progressInfo);
        }
        
        if (progressInfo.progress !== undefined && progressInfo.progress !== null) {
          console.log('Updating progress to:', progressInfo.progress);
          loadingProgress.updateProgress(progressInfo.progress);
          loadingProgress.clearTemporaryError();
        } else if (progressInfo.percent !== undefined && progressInfo.percent !== null) {
          console.log('Updating progress from percent to:', progressInfo.percent);
          loadingProgress.updateProgress(progressInfo.percent);
          loadingProgress.clearTemporaryError();
        }
      }
    );
  } catch (err) {
    // ...
  }
};
```

### После рефакторинга:

```javascript
/**
 * Обработка колбэка прогресса из сервиса
 */
function handleProgressCallback(progressInfo, loadingProgress) {
  const normalized = normalizeProgressData(progressInfo);
  
  if (normalized.step) {
    loadingProgress.updateStep(normalized.step, normalized.details || {});
  }
  
  if (normalized.progress !== undefined && normalized.progress !== null) {
    loadingProgress.updateProgress(normalized.progress);
    loadingProgress.clearTemporaryError();
  }
}

const loadSectorData = async (useCache = true) => {
  // ...
  try {
    const data = await DashboardSector1CService.getSectorData(
      useCache,
      (progressInfo) => {
        handleProgressCallback(progressInfo, loadingProgress);
      }
    );
  } catch (err) {
    // ...
  }
};
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-07 для рефакторинга `useDashboardActions.js`
- **2025-12-06 19:00 (UTC+3, Брест):** Выполнен рефакторинг:
  - Создан файл `progress-utils.js` с функцией `normalizeProgressData()`
  - Создана функция `handleProgressCallback()` для обработки колбэков прогресса
  - Упрощена функция `loadSectorData()` - убрана сложная логика обработки колбэков
  - Удалены все избыточные `console.log` (оставлены только критичные логи через error-handler)
  - Код стал более читаемым и модульным

---

**Автор:** Технический писатель  
**Статус:** Завершена

