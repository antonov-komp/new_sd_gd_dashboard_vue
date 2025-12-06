# TASK-010-STEP-05: Рефакторинг `index.js` (DashboardSector1CService) — упрощение колбэков прогресса

**Дата создания:** 2025-12-06 18:30 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Рефактор-менеджер  
**Родительская задача:** TASK-010  
**Связанные задачи:** TASK-007, TASK-010-STEP-03

---

## Описание

Рефакторить файл `index.js` (DashboardSector1CService), упростив структуру колбэков прогресса и убрав избыточные `console.log`, используя утилиты из `progress-utils.js`, созданные в STEP-03.

**Цель:** Упростить код сервиса, используя централизованные утилиты для работы с прогрессом, и улучшить читаемость без нарушения существующей логики.

---

## Контекст

**Текущее состояние:**
- В `index.js` логика формирования объектов прогресса дублируется
- Сложная структура колбэков прогресса с множественными вызовами `onProgress`
- Множественные `console.log` для отладки остались в коде
- Дублирование логики формирования `details` для колбэков прогресса

**После STEP-03:**
- Созданы утилиты `createProgressDetails()`, `normalizeProgressData()`, `calculateProgress()` в `progress-utils.js`

**Цель STEP-05:**
- Заменить дублирующуюся логику на использование утилит
- Упростить структуру колбэков прогресса
- Убрать избыточные `console.log` (оставить только критичные)
- Сохранить существующую функциональность

---

## Модули и компоненты

### Файлы для обновления:

1. **`vue-app/src/services/dashboard-sector-1c/index.js`**
   - Импортировать утилиты из `progress-utils.js`
   - Заменить логику формирования `details` на вызовы утилит
   - Упростить структуру колбэков прогресса
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
- Использует репозитории, мапперы, фильтры, групперы

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
} from './utils/progress-utils.js';
```

### 2. Обновить функцию `getSectorData()` — упростить колбэки прогресса

**Текущий код:**
```javascript
static async getSectorData(useCache = true, onProgress = null) {
  // ...
  if (onProgress) {
    onProgress({ step: 'cache_check', progress: 0, details: { description: 'Инициализация загрузки...' } });
  }
  
  // ...
  if (onProgress) {
    onProgress({ 
      step: 'loading_tickets', 
      progress: 10,
      details: { description: 'Начало загрузки тикетов из Bitrix24...' }
    });
  }
  
  const allTickets = await TicketRepository.getAllTickets(targetStages, (stageProgress) => {
    if (onProgress) {
      console.log('TicketRepository progress callback:', stageProgress);
      
      const baseProgress = 10;
      const ticketsProgressRange = 40; // 10-50%
      const stageProgressPercent = stageProgress.percent || 0;
      const totalProgress = baseProgress + (stageProgressPercent * ticketsProgressRange / 100);
      
      const step = stageProgress.step || 'loading_tickets';
      
      const progressData = {
        step: step,
        progress: Math.min(50, totalProgress),
        details: {
          stage: stageProgress.stageName || stageProgress.stage,
          stageIndex: stageProgress.stageIndex,
          totalStages: stageProgress.totalStages,
          count: stageProgress.count,
          total: stageProgress.total,
          description: stageProgress.details?.description || `Загрузка тикетов стадии "${stageProgress.stageName || stageProgress.stage}"${stageProgress.stageIndex && stageProgress.totalStages ? ` (${stageProgress.stageIndex}/${stageProgress.totalStages})` : ''}${stageProgress.count !== undefined ? `. Загружено: ${stageProgress.count}` : ''}...`,
          warning: stageProgress.warning
        }
      };
      
      console.log('Calling onProgress from TicketRepository:', progressData);
      onProgress(progressData);
    }
  });
  console.log('Total tickets loaded:', allTickets.length);
  
  // ...
  if (onProgress) {
    onProgress({ 
      step: 'filtering', 
      progress: 50,
      details: {
        totalTickets: allTickets.length,
        description: `Фильтрация ${allTickets.length} тикетов по сектору 1С...`
      }
    });
  }
  // ... и так далее для каждого этапа
}
```

**Обновлённый код:**
```javascript
static async getSectorData(useCache = true, onProgress = null) {
  // ...
  if (onProgress) {
    onProgress(createProgressDetails('cache_check', 0, {
      description: 'Инициализация загрузки...'
    }));
  }
  
  // ...
  if (onProgress) {
    onProgress(createProgressDetails('loading_tickets', 10, {
      description: 'Начало загрузки тикетов из Bitrix24...'
    }));
  }
  
  const allTickets = await TicketRepository.getAllTickets(targetStages, (stageProgress) => {
    if (onProgress) {
      // Нормализуем данные прогресса из репозитория
      const normalized = normalizeProgressData(stageProgress);
      
      // Рассчитываем общий прогресс: 10-50% для загрузки тикетов
      const totalProgress = calculateProgress(10, 40, normalized.progress);
      
      // Формируем объект прогресса с деталями
      onProgress(createProgressDetails(
        normalized.step || 'loading_tickets',
        totalProgress,
        {
          ...normalized.details,
          warning: normalized.details.warning
        }
      ));
    }
  });
  
  // ...
  if (onProgress) {
    onProgress(createProgressDetails('filtering', 50, {
      totalTickets: allTickets.length,
      filteredTickets: filteredTickets.length,
      description: `Отфильтровано ${filteredTickets.length} тикетов из ${allTickets.length}`
    }));
  }
  // ... и так далее для каждого этапа
}
```

**Критерии:**
- [ ] Используется `createProgressDetails()` для формирования объектов прогресса
- [ ] Используется `normalizeProgressData()` для нормализации данных из репозитория
- [ ] Используется `calculateProgress()` для расчёта прогресса в диапазоне
- [ ] Структура колбэков упрощена
- [ ] Логика работы не нарушена (прелоадер отображает корректную информацию)

### 3. Убрать избыточные `console.log`

**Правила:**
- Удалить все `console.log`, которые использовались для отладки
- Оставить только критичные логи (например, ошибки)
- Заменить `console.log` на `console.warn` или `console.error`, если это важно

**Примеры удаления:**
```javascript
// Удалить:
console.log('TicketRepository progress callback:', stageProgress);
console.log('Calling onProgress from TicketRepository:', progressData);
console.log('Total tickets loaded:', allTickets.length);
console.log(`Filtered ${filteredTickets.length} tickets from ${allTickets.length} (sector tag: 1C)`);
console.log('Unique employee IDs:', uniqueEmployeeIds);
console.log('Loaded employees:', employees.length);
console.log('Cache hit for sector data');

// Оставить:
console.error('Error getting sector data:', error);
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
   - Упростить структуру колбэков прогресса
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
- [ ] Функция `getSectorData()` использует утилиты для формирования прогресса
- [ ] Все этапы загрузки используют `createProgressDetails()` для формирования прогресса
- [ ] Колбэки прогресса из репозитория нормализуются через `normalizeProgressData()`
- [ ] Расчёт прогресса в диапазонах использует `calculateProgress()`
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
   - Все этапы загрузки отображаются корректно:
     - [ ] Проверка кеша
     - [ ] Загрузка тикетов
     - [ ] Фильтрация тикетов
     - [ ] Определение сотрудников
     - [ ] Загрузка данных сотрудников
     - [ ] Группировка данных
     - [ ] Сохранение в кеш
   - Прогресс-бар обновляется корректно
   - Детали этапа отображаются корректно

2. **Проверка загрузки данных:**
   - Данные загружаются корректно
   - Кеш работает корректно
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
  progress: 10,
  details: { description: 'Начало загрузки тикетов из Bitrix24...' }
});

// Сложный расчёт прогресса
const baseProgress = 10;
const ticketsProgressRange = 40;
const stageProgressPercent = stageProgress.percent || 0;
const totalProgress = baseProgress + (stageProgressPercent * ticketsProgressRange / 100);

const progressData = {
  step: step,
  progress: Math.min(50, totalProgress),
  details: {
    stage: stageProgress.stageName || stageProgress.stage,
    stageIndex: stageProgress.stageIndex,
    totalStages: stageProgress.totalStages,
    count: stageProgress.count,
    total: stageProgress.total,
    description: stageProgress.details?.description || `Загрузка тикетов стадии "${stageProgress.stageName || stageProgress.stage}"...`,
    warning: stageProgress.warning
  }
};

console.log('Calling onProgress from TicketRepository:', progressData);
onProgress(progressData);
```

### После рефакторинга:

```javascript
// Простая и понятная логика с утилитами
onProgress(createProgressDetails('loading_tickets', 10, {
  description: 'Начало загрузки тикетов из Bitrix24...'
}));

// Упрощённый расчёт прогресса
const normalized = normalizeProgressData(stageProgress);
const totalProgress = calculateProgress(10, 40, normalized.progress);

onProgress(createProgressDetails(
  normalized.step || 'loading_tickets',
  totalProgress,
  {
    ...normalized.details,
    warning: normalized.details.warning
  }
));

// Логи только для ошибок
// (console.log удалены)
```

---

## История правок

- **2025-12-06 18:30 (UTC+3, Брест):** Создана подзадача STEP-05 для рефакторинга `index.js`

---

**Автор:** Технический писатель  
**Статус:** Новая

