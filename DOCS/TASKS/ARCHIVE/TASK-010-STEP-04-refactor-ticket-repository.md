# TASK-010-STEP-04: Рефакторинг `ticket-repository.js` — упрощение колбэков прогресса

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Vue.js Программист  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-007, TASK-010-STEP-03

---

## Описание

Рефакторить файл `ticket-repository.js`, упростив структуру колбэков прогресса и убрав избыточные `console.log`, используя утилиты из `progress-utils.js`, созданные в STEP-03.

**Цель:** Упростить код репозитория, используя централизованные утилиты для работы с прогрессом, и улучшить читаемость без нарушения существующей логики.

---

## Контекст

**Текущее состояние:**
- В `ticket-repository.js` логика формирования объектов прогресса дублируется
- Сложная вложенная структура колбэков прогресса (onProgress внутри onProgress)
- Множественные `console.log` для отладки остались в коде
- Дублирование логики формирования `details` для колбэков прогресса

**После STEP-03:**
- Созданы утилиты `createProgressDetails()`, `normalizeProgressData()`, `calculateProgress()` в `progress-utils.js`

**Цель STEP-04:**
- Заменить дублирующуюся логику на использование утилит
- Упростить структуру колбэков прогресса
- Убрать избыточные `console.log` (оставить только критичные)
- Сохранить существующую функциональность

---

## Модули и компоненты

### Файлы для обновления:

1. **`vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js`**
   - Импортировать утилиты из `progress-utils.js`
   - Заменить логику формирования `details` на вызовы утилит
   - Упростить вложенные колбэки прогресса
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
- Использует `ApiClient` и `CacheManager`

---

## Ступенчатые подзадачи

### 1. Импортировать утилиты из `progress-utils.js`

**Изменения в начале файла:**
```javascript
// Добавить импорты после существующих импортов
import { 
  createProgressDetails, 
  normalizeProgressData,
  calculateProgress 
} from '../utils/progress-utils.js';
```

### 2. Обновить функцию `getAllTickets()` — упростить колбэки прогресса

**Текущий код:**
```javascript
static async getAllTickets(stageIds, onProgress = null) {
  // ...
  if (onProgress) {
    onProgress({
      step: 'loading_tickets',
      stage: stageId,
      stageName: stageName,
      stageIndex: i + 1,
      totalStages: totalStages,
      percent: (i / totalStages) * 100,
      details: {
        stage: stageId,
        stageName: stageName,
        stageIndex: i + 1,
        totalStages: totalStages,
        description: `Загрузка тикетов стадии "${stageName}" (${i + 1}/${totalStages})...`
      }
    });
  }
  
  // Вложенный колбэк
  const stageTickets = await this.getTicketsByStage(stageId, true, onProgress ? (batchProgress) => {
    const stageProgress = (i / totalStages) + (batchProgress.percent / 100 / totalStages);
    onProgress({
      step: 'loading_tickets',
      stage: stageId,
      stageName: stageName,
      stageIndex: i + 1,
      totalStages: totalStages,
      percent: stageProgress * 100,
      count: batchProgress.count,
      total: batchProgress.total,
      details: {
        stage: stageId,
        stageName: stageName,
        stageIndex: i + 1,
        totalStages: totalStages,
        count: batchProgress.count,
        total: batchProgress.total,
        description: `Загрузка тикетов стадии "${stageName}" (${i + 1}/${totalStages}). Загружено: ${batchProgress.count}${batchProgress.total ? ` из ${batchProgress.total}` : ''}...`
      }
    });
  } : null);
}
```

**Обновлённый код:**
```javascript
static async getAllTickets(stageIds, onProgress = null) {
  // ...
  if (onProgress) {
    const baseProgress = (i / totalStages) * 100;
    onProgress(createProgressDetails('loading_tickets', baseProgress, {
      stage: stageId,
      stageName: stageName,
      stageIndex: i + 1,
      totalStages: totalStages
    }));
  }
  
  // Упрощённый вложенный колбэк
  const stageTickets = await this.getTicketsByStage(stageId, true, onProgress ? (batchProgress) => {
    const stageProgress = calculateProgress(
      (i / totalStages) * 100,  // базовый прогресс
      (1 / totalStages) * 100,   // диапазон для текущей стадии
      batchProgress.percent || 0 // процент выполнения батча
    );
    
    onProgress(createProgressDetails('loading_tickets', stageProgress, {
      stage: stageId,
      stageName: stageName,
      stageIndex: i + 1,
      totalStages: totalStages,
      count: batchProgress.count,
      total: batchProgress.total
    }));
  } : null);
}
```

**Критерии:**
- [ ] Используется `createProgressDetails()` для формирования объектов прогресса
- [ ] Используется `calculateProgress()` для расчёта прогресса в диапазоне
- [ ] Вложенные колбэки упрощены
- [ ] Логика работы не нарушена (прелоадер отображает корректную информацию)

### 3. Обновить функцию `getTicketsByStage()` — упростить колбэки прогресса

**Текущий код:**
```javascript
static async getTicketsByStage(stageId, useCache = true, onProgress = null) {
  // ...
  if (onProgress) {
    const percent = totalEstimated > 0 ? Math.min(100, (allTickets.length / totalEstimated) * 100) : 0;
    onProgress({
      percent: percent,
      count: allTickets.length,
      total: totalEstimated
    });
  }
}
```

**Обновлённый код:**
```javascript
static async getTicketsByStage(stageId, useCache = true, onProgress = null) {
  // ...
  if (onProgress) {
    const percent = totalEstimated > 0 ? Math.min(100, (allTickets.length / totalEstimated) * 100) : 0;
    onProgress(normalizeProgressData({
      percent: percent,
      count: allTickets.length,
      total: totalEstimated
    }));
  }
}
```

**Критерии:**
- [ ] Используется `normalizeProgressData()` для нормализации данных прогресса
- [ ] Логика работы не нарушена

### 4. Убрать избыточные `console.log`

**Правила:**
- Удалить все `console.log`, которые использовались для отладки
- Оставить только критичные логи (например, ошибки)
- Заменить `console.log` на `console.warn` или `console.error`, если это важно

**Примеры удаления:**
```javascript
// Удалить:
console.log(`Loading tickets for stage: ${stageId}`);
console.log(`Loaded ${stageTickets.length} tickets for stage ${stageId}`);
console.log(`Cache hit for stage ${stageId}`);

// Оставить:
console.error(`Error loading tickets for stage ${stageId}:`, stageError);
```

**Критерии:**
- [ ] Избыточные `console.log` удалены
- [ ] Критичные логи оставлены (ошибки)
- [ ] Код стал чище

---

## Технические требования

### Принципы рефакторинга:

1. **Не нарушать логику работы**
   - Все существующие тесты должны проходить
   - Функциональность должна работать идентично
   - Прелоадер должен отображать корректную информацию

2. **Использовать утилиты везде, где возможно**
   - Заменить всю дублирующуюся логику на вызовы утилит
   - Не оставлять старую логику "на всякий случай"

3. **Упрощать структуру**
   - Упростить вложенные колбэки прогресса
   - Сделать код более читаемым

4. **Убирать отладочный код**
   - Удалить избыточные `console.log`
   - Оставить только критичные логи

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Импорты:** Named imports из утилит
- **Логирование:** Минимум логов, только критичные

---

## Критерии приёмки

- [ ] Импортированы утилиты из `progress-utils.js`
- [ ] Функция `getAllTickets()` использует утилиты для формирования прогресса
- [ ] Функция `getTicketsByStage()` использует утилиты для нормализации прогресса
- [ ] Вложенные колбэки прогресса упрощены
- [ ] Избыточные `console.log` удалены (оставлены только критичные)
- [ ] Логика работы не нарушена:
  - [ ] Прелоадер отображается и обновляется корректно
  - [ ] Все этапы загрузки отображаются корректно
  - [ ] Прогресс-бар обновляется корректно
  - [ ] Детали этапа отображаются корректно
- [ ] Код стал более читаемым
- [ ] Дублирование кода устранено

---

## Тестирование

### Функциональное тестирование:

1. **Проверка прелоадера:**
   - Прелоадер отображается при загрузке
   - Все этапы загрузки отображаются корректно
   - Прогресс-бар обновляется корректно
   - Детали этапа отображаются корректно

2. **Проверка загрузки тикетов:**
   - Тикеты загружаются корректно
   - Прогресс обновляется для каждой стадии
   - Ошибки обрабатываются корректно

### Интеграционное тестирование:

1. Проверить работу дашборда в целом
2. Проверить, что прелоадер работает корректно
3. Проверить, что все этапы загрузки отображаются

---

## Примеры изменений

### До рефакторинга:

```javascript
// Сложная логика формирования details
onProgress({
  step: 'loading_tickets',
  stage: stageId,
  stageName: stageName,
  stageIndex: i + 1,
  totalStages: totalStages,
  percent: (i / totalStages) * 100,
  details: {
    stage: stageId,
    stageName: stageName,
    stageIndex: i + 1,
    totalStages: totalStages,
    description: `Загрузка тикетов стадии "${stageName}" (${i + 1}/${totalStages})...`
  }
});

// Множественные console.log
console.log(`Loading tickets for stage: ${stageId}`);
console.log(`Loaded ${stageTickets.length} tickets for stage ${stageId}`);
```

### После рефакторинга:

```javascript
// Простая и понятная логика с утилитами
onProgress(createProgressDetails('loading_tickets', (i / totalStages) * 100, {
  stage: stageId,
  stageName: stageName,
  stageIndex: i + 1,
  totalStages: totalStages
}));

// Логи только для ошибок
// (console.log удалены)
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-04 для рефакторинга `ticket-repository.js`
- **2025-12-06 19:30 (UTC+3, Брест):** Выполнен рефакторинг:
  - Импортированы утилиты из `progress-utils.js` (createProgressDetails, normalizeProgressData, calculateProgress)
  - Обновлена функция `getAllTickets()` - использует `createProgressDetails()` и `calculateProgress()`
  - Обновлена функция `getTicketsByStage()` - использует `normalizeProgressData()`
  - Упрощены вложенные колбэки прогресса
  - Удалены избыточные `console.log` (оставлены только критичные логи ошибок)
  - Код стал более читаемым и модульным
  - Логика работы не нарушена (прелоадер отображает корректную информацию)

---

**Автор:** Технический писатель  
**Статус:** Завершена

