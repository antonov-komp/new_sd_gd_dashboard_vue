# TASK-010-STEP-03: Создание утилиты для работы с прогрессом загрузки

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Vue.js Программист  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-007, TASK-010-STEP-04, TASK-010-STEP-05

---

## Описание

Создать утилиту для работы с прогрессом загрузки данных, чтобы устранить дублирование логики формирования объектов прогресса в разных местах кода.

**Цель:** Централизовать логику работы с прогрессом загрузки в одном месте для упрощения поддержки и устранения дублирования кода.

---

## Контекст

**Проблема:**
В текущем коде логика формирования объектов прогресса дублируется в нескольких местах:
- `ticket-repository.js` — в функции `getAllTickets()` и `getTicketsByStage()`
- `index.js` (DashboardSector1CService) — в функции `getSectorData()`
- Сложная вложенная структура колбэков прогресса (onProgress внутри onProgress)
- Дублирование логики формирования `details` для колбэков прогресса

**Текущая логика:**
```javascript
// В разных местах используется разная логика формирования details:
onProgress({
  step: 'loading_tickets',
  progress: 50,
  details: {
    stage: stageId,
    stageName: stageName,
    stageIndex: i + 1,
    totalStages: totalStages,
    description: `Загрузка тикетов стадии "${stageName}" (${i + 1}/${totalStages})...`
  }
});
```

**Решение:**
Создать единую утилиту `progress-utils.js` с функциями для работы с прогрессом загрузки.

---

## Модули и компоненты

### Новый файл для создания:

1. **`vue-app/src/services/dashboard-sector-1c/utils/progress-utils.js`**
   - Утилита для формирования объекта деталей прогресса
   - Утилита для нормализации данных прогресса
   - Утилита для расчёта прогресса

### Файлы для обновления (в следующих шагах):

- `vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js` — будет обновлён в STEP-04
- `vue-app/src/services/dashboard-sector-1c/index.js` — будет обновлён в STEP-05

---

## Зависимости

### От других задач:
- **TASK-007** — должна быть завершена (прелоадер реализован)

### От модулей:
- Используется в репозиториях и сервисах для формирования прогресса

---

## Ступенчатые подзадачи

### 1. Создать файл `progress-utils.js`

**Расположение:** `vue-app/src/services/dashboard-sector-1c/utils/progress-utils.js`

**Структура файла:**
```javascript
/**
 * Утилиты для работы с прогрессом загрузки данных
 * 
 * Централизованная логика для формирования объектов прогресса,
 * нормализации данных и расчёта процента выполнения
 */

/**
 * Формирование объекта деталей прогресса
 * 
 * Создаёт стандартизированный объект details для колбэков прогресса
 * с поддержкой различных сценариев (загрузка тикетов, фильтрация, группировка и т.д.)
 * 
 * @param {string} step - Название этапа (например, 'loading_tickets')
 * @param {number} progress - Процент выполнения (0-100)
 * @param {object} details - Дополнительные детали этапа
 * @param {string} [details.description] - Описание этапа
 * @param {string} [details.stage] - ID стадии
 * @param {string} [details.stageName] - Название стадии
 * @param {number} [details.stageIndex] - Индекс стадии (1-based)
 * @param {number} [details.totalStages] - Общее количество стадий
 * @param {number} [details.count] - Количество загруженных элементов
 * @param {number} [details.total] - Общее количество элементов
 * @param {number} [details.filteredTickets] - Количество отфильтрованных тикетов
 * @param {number} [details.totalTickets] - Общее количество тикетов
 * @param {number} [details.employeeCount] - Количество сотрудников
 * @param {string} [details.warning] - Предупреждение (если есть)
 * @returns {object} Объект с полями step, progress, details
 * 
 * @example
 * createProgressDetails('loading_tickets', 50, {
 *   stage: 'DT140_12:UC_0VHWE2',
 *   stageName: 'Сформировано обращение',
 *   stageIndex: 1,
 *   totalStages: 3,
 *   description: 'Загрузка тикетов стадии "Сформировано обращение" (1/3)...'
 * });
 */
export function createProgressDetails(step, progress, details = {}) {
  // Реализация
}

/**
 * Нормализация данных прогресса
 * 
 * Приводит объект прогресса к стандартному формату:
 * - step (обязательно)
 * - progress (0-100)
 * - details (объект с деталями)
 * 
 * Поддерживает различные варианты входных данных:
 * - { step, progress, details }
 * - { step, percent, details } (percent вместо progress)
 * - { step, stage, stageName, ... } (плоская структура)
 * 
 * @param {object} progressInfo - Объект с данными прогресса
 * @returns {object} Нормализованный объект прогресса
 * 
 * @example
 * normalizeProgressData({
 *   step: 'loading_tickets',
 *   percent: 50,
 *   stage: 'DT140_12:UC_0VHWE2'
 * });
 * // { step: 'loading_tickets', progress: 50, details: { stage: 'DT140_12:UC_0VHWE2' } }
 */
export function normalizeProgressData(progressInfo) {
  // Реализация
}

/**
 * Расчёт прогресса в заданном диапазоне
 * 
 * Вычисляет процент выполнения в заданном диапазоне на основе базового прогресса
 * и процента выполнения текущего этапа.
 * 
 * @param {number} baseProgress - Базовый процент (начало диапазона, 0-100)
 * @param {number} range - Размер диапазона (0-100)
 * @param {number} percent - Процент выполнения текущего этапа (0-100)
 * @returns {number} Итоговый процент выполнения (0-100)
 * 
 * @example
 * // Прогресс загрузки тикетов: 10-50% (базовый 10%, диапазон 40%)
 * // Текущий этап выполнен на 50%
 * calculateProgress(10, 40, 50); // 30 (10 + 40 * 0.5)
 * 
 * @example
 * // Прогресс фильтрации: 50-60% (базовый 50%, диапазон 10%)
 * // Фильтрация завершена
 * calculateProgress(50, 10, 100); // 60
 */
export function calculateProgress(baseProgress, range, percent) {
  // Реализация
}
```

### 2. Реализовать функцию `createProgressDetails()`

**Логика:**
1. Принимать step, progress и details
2. Формировать стандартизированный объект с полями step, progress, details
3. Автоматически генерировать description, если не передан
4. Валидировать входные данные

**Пример реализации:**
```javascript
export function createProgressDetails(step, progress, details = {}) {
  // Валидация
  if (!step || typeof step !== 'string') {
    throw new Error('Step must be a non-empty string');
  }
  
  const progressValue = typeof progress === 'number' && !isNaN(progress)
    ? Math.max(0, Math.min(100, progress))
    : 0;
  
  // Автоматическая генерация description, если не передан
  let description = details.description;
  if (!description) {
    description = generateDescription(step, details);
  }
  
  return {
    step,
    progress: progressValue,
    details: {
      ...details,
      description
    }
  };
}

/**
 * Генерация описания этапа на основе данных
 */
function generateDescription(step, details) {
  // Логика генерации описания
  // Например, для 'loading_tickets' с stageName и stageIndex
  if (step === 'loading_tickets' && details.stageName && details.stageIndex) {
    return `Загрузка тикетов стадии "${details.stageName}" (${details.stageIndex}/${details.totalStages || 1})...`;
  }
  // ... другие варианты
  return 'Загрузка данных...';
}
```

### 3. Реализовать функцию `normalizeProgressData()`

**Логика:**
1. Проверять наличие обязательного поля step
2. Нормализовать progress/percent (привести к progress)
3. Нормализовать details (выделить из плоской структуры, если нужно)
4. Возвращать стандартизированный объект

**Пример реализации:**
```javascript
export function normalizeProgressData(progressInfo) {
  if (!progressInfo || typeof progressInfo !== 'object') {
    throw new Error('Progress info must be an object');
  }
  
  const step = progressInfo.step || null;
  if (!step) {
    throw new Error('Step is required in progress info');
  }
  
  // Нормализация progress (может быть progress или percent)
  const progress = progressInfo.progress !== undefined 
    ? progressInfo.progress 
    : (progressInfo.percent !== undefined ? progressInfo.percent : 0);
  
  // Нормализация details
  const details = progressInfo.details || {};
  
  // Если данные в плоской структуре, извлекаем их в details
  if (progressInfo.stage) details.stage = progressInfo.stage;
  if (progressInfo.stageName) details.stageName = progressInfo.stageName;
  if (progressInfo.stageIndex !== undefined) details.stageIndex = progressInfo.stageIndex;
  if (progressInfo.totalStages !== undefined) details.totalStages = progressInfo.totalStages;
  if (progressInfo.count !== undefined) details.count = progressInfo.count;
  if (progressInfo.total !== undefined) details.total = progressInfo.total;
  if (progressInfo.warning) details.warning = progressInfo.warning;
  
  return {
    step,
    progress: Math.max(0, Math.min(100, progress)),
    details
  };
}
```

### 4. Реализовать функцию `calculateProgress()`

**Логика:**
1. Принимать базовый прогресс, диапазон и процент выполнения этапа
2. Вычислять итоговый прогресс: baseProgress + (range * percent / 100)
3. Ограничивать результат диапазоном 0-100

**Пример реализации:**
```javascript
export function calculateProgress(baseProgress, range, percent) {
  const base = typeof baseProgress === 'number' && !isNaN(baseProgress)
    ? Math.max(0, Math.min(100, baseProgress))
    : 0;
  
  const rangeValue = typeof range === 'number' && !isNaN(range)
    ? Math.max(0, Math.min(100, range))
    : 0;
  
  const percentValue = typeof percent === 'number' && !isNaN(percent)
    ? Math.max(0, Math.min(100, percent))
    : 0;
  
  const calculated = base + (rangeValue * percentValue / 100);
  return Math.max(0, Math.min(100, calculated));
}
```

---

## Технические требования

### Принципы реализации:

1. **Единая точка истины**
   - Вся логика работы с прогрессом в одном месте
   - Изменения в логике требуют правки только в утилите

2. **Гибкость**
   - Поддержка различных форматов входных данных
   - Автоматическая генерация описаний, если не переданы

3. **Валидация данных**
   - Проверка типов входных данных
   - Обработка edge cases (null, undefined, невалидные значения)

4. **Документация**
   - JSDoc комментарии для всех функций
   - Примеры использования в комментариях

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Комментарии:** JSDoc для функций и типов
- **Именование:** camelCase для функций
- **Экспорт:** Named exports для всех функций

---

## Критерии приёмки

- [ ] Файл `progress-utils.js` создан в правильной директории
- [ ] Функция `createProgressDetails()` реализована и формирует корректные объекты
- [ ] Функция `normalizeProgressData()` реализована и нормализует различные форматы
- [ ] Функция `calculateProgress()` реализована и корректно вычисляет прогресс
- [ ] Все функции имеют JSDoc комментарии с примерами
- [ ] Функции протестированы вручную:
  - [ ] `createProgressDetails()` с различными вариантами details
  - [ ] `normalizeProgressData()` с различными форматами входных данных
  - [ ] `calculateProgress()` с различными значениями параметров
- [ ] Логика работы соответствует существующей (не нарушена)

---

## Тестирование

### Ручное тестирование функций:

1. **Тест `createProgressDetails()`:**
   ```javascript
   // Тест 1: Базовый случай
   const result1 = createProgressDetails('loading_tickets', 50, {
     stageName: 'Сформировано обращение',
     stageIndex: 1,
     totalStages: 3
   });
   console.assert(result1.step === 'loading_tickets');
   console.assert(result1.progress === 50);
   console.assert(result1.details.stageName === 'Сформировано обращение');
   
   // Тест 2: С автоматической генерацией description
   const result2 = createProgressDetails('filtering', 50, {
     totalTickets: 100,
     filteredTickets: 50
   });
   console.assert(result2.details.description !== undefined);
   ```

2. **Тест `normalizeProgressData()`:**
   ```javascript
   // Тест 1: С progress
   const result1 = normalizeProgressData({
     step: 'loading_tickets',
     progress: 50,
     stage: 'DT140_12:UC_0VHWE2'
   });
   console.assert(result1.step === 'loading_tickets');
   console.assert(result1.progress === 50);
   
   // Тест 2: С percent вместо progress
   const result2 = normalizeProgressData({
     step: 'loading_tickets',
     percent: 50
   });
   console.assert(result2.progress === 50);
   ```

3. **Тест `calculateProgress()`:**
   ```javascript
   // Тест 1: Базовый расчёт
   console.assert(calculateProgress(10, 40, 50) === 30); // 10 + 40 * 0.5
   
   // Тест 2: Полное выполнение
   console.assert(calculateProgress(50, 10, 100) === 60); // 50 + 10 * 1.0
   
   // Тест 3: Ограничение 100%
   console.assert(calculateProgress(90, 20, 100) === 100); // Ограничено 100%
   ```

---

## Примеры использования

### Пример 1: Формирование прогресса загрузки тикетов

```javascript
import { createProgressDetails } from '../utils/progress-utils.js';

// Вместо:
onProgress({
  step: 'loading_tickets',
  progress: 50,
  details: {
    stage: stageId,
    stageName: stageName,
    stageIndex: i + 1,
    totalStages: totalStages,
    description: `Загрузка тикетов стадии "${stageName}" (${i + 1}/${totalStages})...`
  }
});

// Используем:
onProgress(createProgressDetails('loading_tickets', 50, {
  stage: stageId,
  stageName: stageName,
  stageIndex: i + 1,
  totalStages: totalStages
}));
```

### Пример 2: Расчёт прогресса в диапазоне

```javascript
import { calculateProgress } from '../utils/progress-utils.js';

// Прогресс загрузки тикетов: 10-50% (базовый 10%, диапазон 40%)
// Текущий этап выполнен на 50%
const totalProgress = calculateProgress(10, 40, 50); // 30
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-03 для создания утилиты `progress-utils.js`
- **2025-12-06 19:00 (UTC+3, Брест):** Создана минимальная версия с `normalizeProgressData()` для STEP-07
- **2025-12-06 19:25 (UTC+3, Брест):** Дополнена полная версия утилиты:
  - Реализована функция `createProgressDetails()` с автоматической генерацией описаний
  - Реализована функция `calculateProgress()` для расчёта прогресса в диапазоне
  - Добавлена вспомогательная функция `generateDescription()` для генерации описаний
  - Все функции имеют JSDoc комментарии с примерами
  - Логика работы соответствует требованиям

---

**Автор:** Технический писатель  
**Статус:** Завершена

