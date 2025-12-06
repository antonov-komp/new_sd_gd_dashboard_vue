# TASK-014: Внедрение службы логирования для дашборда сектора 1С

**Дата создания:** 2025-12-06 17:56 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)

## Описание

Внедрение централизованной службы логирования для дашборда сектора 1С с возможностью включения/отключения логирования в консоль. Служба должна заменить все прямые вызовы `console.log`, `console.error`, `console.warn` на единый интерфейс с управлением уровнем детализации.

## Контекст

В текущей реализации дашборда сектора 1С используется множество прямых вызовов `console.*` для отладки и логирования:
- `console.log` — для информационных сообщений
- `console.error` — для ошибок
- `console.warn` — для предупреждений

Это создаёт проблемы:
1. Нет единого управления логированием
2. Невозможно отключить логирование в production
3. Сложно контролировать уровень детализации
4. Логи разбросаны по всему коду

**Цель:** Создать централизованную службу логирования с возможностью включения/отключения через UI или конфигурацию.

## Модули и компоненты

### Новые файлы:
- `vue-app/src/services/dashboard-sector-1c/utils/logger.js` — служба логирования
- `vue-app/src/services/dashboard-sector-1c/utils/logger-config.js` — конфигурация логирования
- `vue-app/src/composables/useLogger.js` — композабл для использования в компонентах

### Изменяемые файлы:
- `vue-app/src/services/dashboard-sector-1c/index.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/data/employee-repository.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/mappers/employee-mapper.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/utils/error-handler.js` — замена console.* на logger
- `vue-app/src/services/dashboard-sector-1c/services/ticket-details-service.js` — замена console.* на logger
- `vue-app/src/composables/useDashboardActions.js` — замена console.* на logger (если есть)
- `vue-app/src/composables/useDragAndDrop.js` — замена console.* на logger
- `vue-app/src/composables/useNotifications.js` — замена console.* на logger
- `vue-app/src/components/dashboard/DashboardStage.vue` — замена console.* на logger
- `vue-app/src/components/dashboard/EmployeeColumn.vue` — замена console.* на logger

### UI компоненты (опционально):
- `vue-app/src/components/dashboard/LoggerControl.vue` — компонент для управления логированием (переключатель включения/отключения)

## Зависимости

- Использует существующую структуру сервисов дашборда
- Может использовать localStorage для сохранения настроек логирования
- Не зависит от внешних библиотек

## Ступенчатые подзадачи

### STEP-01: Аудит текущего логирования

**Цель:** Найти и задокументировать все места использования `console.*` в дашборде сектора 1С.

**Задачи:**
1. Выполнить поиск всех `console.log`, `console.error`, `console.warn`, `console.info`, `console.debug` в коде
2. Создать документ с перечнем всех найденных использований
3. Классифицировать логи по типам:
   - Информационные (debug/info)
   - Предупреждения (warnings)
   - Ошибки (errors)
   - Отладочные (debug)
4. Определить, какие логи критичны для production, а какие только для разработки

**Результат:**
- Документ `DOCS/LOGGING/console-usage-audit.md` с полным списком использований
- Классификация логов по типам и важности

**Критерии приёмки:**
- [x] Найдены все использования `console.*` в дашборде сектора 1С
- [x] Создан документ с перечнем и классификацией
- [x] Определены критичные и некритичные логи

**Результат:**
- ✅ Создан документ `DOCS/LOGGING/console-usage-audit.md`
- ✅ Найдено 23 использования `console.*` в 11 файлах
- ✅ Классифицированы по типам: ERROR (14), WARN (4), DEBUG/INFO (5)

---

### STEP-02: Создание службы логирования

**Цель:** Создать централизованную службу логирования с возможностью управления уровнем детализации.

**Задачи:**
1. Создать файл `vue-app/src/services/dashboard-sector-1c/utils/logger.js`:
   - Класс `Logger` с методами: `log()`, `error()`, `warn()`, `info()`, `debug()`
   - Поддержка уровней логирования: `NONE`, `ERROR`, `WARN`, `INFO`, `DEBUG`
   - Проверка уровня перед выводом в консоль
   - Форматирование сообщений с контекстом (модуль, время, уровень)
   
2. Создать файл `vue-app/src/services/dashboard-sector-1c/utils/logger-config.js`:
   - Конфигурация уровней логирования
   - Управление через localStorage (ключ: `dashboard-sector-1c-logger-level`)
   - Методы: `getLevel()`, `setLevel()`, `isEnabled()`
   - Значение по умолчанию: `ERROR` (только ошибки) для production, `DEBUG` для разработки

3. Создать композабл `vue-app/src/composables/useLogger.js`:
   - Обёртка над `Logger` для использования в компонентах Vue
   - Методы: `log()`, `error()`, `warn()`, `info()`, `debug()`
   - Автоматическое определение контекста (имя компонента)

**Пример структуры:**

```javascript
// logger.js
export class Logger {
  static log(level, message, context = '', data = null) {
    const config = LoggerConfig.getLevel();
    if (!LoggerConfig.isEnabled(level, config)) {
      return;
    }
    
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] [${context}] ${message}`;
    
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage, data || '');
        break;
      case 'WARN':
        console.warn(formattedMessage, data || '');
        break;
      case 'INFO':
        console.info(formattedMessage, data || '');
        break;
      case 'DEBUG':
        console.log(formattedMessage, data || '');
        break;
      default:
        console.log(formattedMessage, data || '');
    }
  }
  
  static error(message, context = '', data = null) {
    this.log('ERROR', message, context, data);
  }
  
  static warn(message, context = '', data = null) {
    this.log('WARN', message, context, data);
  }
  
  static info(message, context = '', data = null) {
    this.log('INFO', message, context, data);
  }
  
  static debug(message, context = '', data = null) {
    this.log('DEBUG', message, context, data);
  }
}
```

```javascript
// logger-config.js
const STORAGE_KEY = 'dashboard-sector-1c-logger-level';
const LEVELS = {
  NONE: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

export class LoggerConfig {
  static getLevel() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && LEVELS[stored] !== undefined) {
      return stored;
    }
    
    // По умолчанию: ERROR для production, DEBUG для разработки
    return process.env.NODE_ENV === 'production' ? 'ERROR' : 'DEBUG';
  }
  
  static setLevel(level) {
    if (LEVELS[level] !== undefined) {
      localStorage.setItem(STORAGE_KEY, level);
    }
  }
  
  static isEnabled(level, currentLevel = null) {
    const current = currentLevel || this.getLevel();
    return LEVELS[level] <= LEVELS[current];
  }
}
```

**Критерии приёмки:**
- [x] Создан класс `Logger` с методами для всех уровней
- [x] Создан `LoggerConfig` для управления уровнем логирования
- [x] Создан композабл `useLogger` для использования в компонентах
- [x] Логирование работает через localStorage
- [x] Уровень по умолчанию: `ERROR` для production, `DEBUG` для разработки
- [x] Форматирование сообщений включает timestamp, уровень, контекст

**Результат:**
- ✅ Создан файл `vue-app/src/services/dashboard-sector-1c/utils/logger-config.js`
- ✅ Создан файл `vue-app/src/services/dashboard-sector-1c/utils/logger.js`
- ✅ Создан файл `vue-app/src/composables/useLogger.js`
- ✅ Реализована поддержка уровней: NONE, ERROR, WARN, INFO, DEBUG
- ✅ Реализовано управление через localStorage
- ✅ Реализовано автоматическое определение production/development режима

---

### STEP-03: Замена console.* на службу логирования

**Цель:** Заменить все прямые вызовы `console.*` на использование службы логирования.

**Задачи:**
1. Заменить в сервисах (`index.js`, `ticket-repository.js`, `employee-repository.js`):
   - `console.error()` → `Logger.error()`
   - `console.warn()` → `Logger.warn()`
   - `console.log()` → `Logger.debug()` или `Logger.info()` (в зависимости от контекста)
   
2. Заменить в утилитах (`error-handler.js`, `employee-mapper.js`, `ticket-grouper.js`):
   - Аналогично сервисам
   
3. Заменить в компонентах (`DashboardStage.vue`, `EmployeeColumn.vue`):
   - Использовать композабл `useLogger()` вместо прямых вызовов `console.*`
   
4. Заменить в композаблах (`useDashboardActions.js`, `useDragAndDrop.js`, `useNotifications.js`):
   - Использовать `Logger` напрямую или через композабл

**Правила замены:**
- `console.error()` → `Logger.error(message, context, error)`
- `console.warn()` → `Logger.warn(message, context, data)`
- `console.log()` (отладочные) → `Logger.debug(message, context, data)`
- `console.log()` (информационные) → `Logger.info(message, context, data)`

**Примеры замены:**

```javascript
// Было:
console.error('Error getting sector data:', error);

// Стало:
import { Logger } from './utils/logger.js';
Logger.error('Error getting sector data', 'DashboardSector1CService', error);
```

```javascript
// Было (в компоненте):
console.log('Ticket clicked:', ticket);

// Стало:
import { useLogger } from '@/composables/useLogger.js';
const logger = useLogger('DashboardStage');
logger.debug('Ticket clicked', ticket);
```

**Критерии приёмки:**
- [x] Все `console.*` заменены на `Logger.*` или `useLogger()`
- [x] Контекст указан для каждого лога (имя модуля/компонента)
- [x] Уровни логирования выбраны правильно (error/warn/info/debug)
- [x] Код компилируется без ошибок
- [x] Функциональность не нарушена

**Результат:**
- ✅ Заменено 23 использования `console.*` в 11 файлах
- ✅ Все сервисы используют `Logger.error()`, `Logger.warn()`, `Logger.debug()`, `Logger.info()`
- ✅ Все компоненты используют `useLogger()` композабл
- ✅ Все композаблы используют `Logger` напрямую
- ✅ Контекст указан для каждого лога
- ✅ Уровни логирования выбраны правильно согласно аудиту

---

### STEP-04: Добавление UI для управления логированием

**Цель:** Создать UI-компонент для управления уровнем логирования (включение/отключение).

**Задачи:**
1. Создать компонент `vue-app/src/components/dashboard/LoggerControl.vue`:
   - Переключатель включения/отключения логирования
   - Выбор уровня логирования (NONE, ERROR, WARN, INFO, DEBUG)
   - Сохранение настроек в localStorage
   - Отображение текущего уровня
   
2. Интегрировать компонент в дашборд:
   - Добавить в `DashboardSector1C.vue` (опционально, можно скрыть по умолчанию)
   - Или добавить в настройки/админ-панель

**Пример компонента:**

```vue
<template>
  <div class="logger-control" v-if="showControl">
    <label>
      <input 
        type="checkbox" 
        v-model="enabled"
        @change="handleToggle"
      />
      Включить логирование
    </label>
    
    <select 
      v-if="enabled" 
      v-model="level"
      @change="handleLevelChange"
    >
      <option value="NONE">Отключено</option>
      <option value="ERROR">Только ошибки</option>
      <option value="WARN">Предупреждения и ошибки</option>
      <option value="INFO">Информация, предупреждения и ошибки</option>
      <option value="DEBUG">Все логи (отладка)</option>
    </select>
    
    <span v-if="enabled">Текущий уровень: {{ level }}</span>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

export default {
  name: 'LoggerControl',
  props: {
    showControl: {
      type: Boolean,
      default: false // По умолчанию скрыт (можно показывать только в режиме разработки)
    }
  },
  setup() {
    const enabled = ref(false);
    const level = ref('ERROR');
    
    onMounted(() => {
      level.value = LoggerConfig.getLevel();
      enabled.value = level.value !== 'NONE';
    });
    
    const handleToggle = () => {
      if (!enabled.value) {
        LoggerConfig.setLevel('NONE');
      } else {
        LoggerConfig.setLevel(level.value);
      }
    };
    
    const handleLevelChange = () => {
      LoggerConfig.setLevel(level.value);
    };
    
    return {
      enabled,
      level,
      handleToggle,
      handleLevelChange
    };
  }
};
</script>
```

**Критерии приёмки:**
- [x] Создан компонент `LoggerControl.vue`
- [x] Компонент позволяет включать/отключать логирование
- [x] Компонент позволяет выбирать уровень логирования
- [x] Настройки сохраняются в localStorage
- [x] Компонент интегрирован в дашборд (опционально, можно скрыть)

**Результат:**
- ✅ Создан компонент `vue-app/src/components/dashboard/LoggerControl.vue`
- ✅ Компонент имеет UI с переключателем включения/отключения
- ✅ Компонент имеет выпадающий список для выбора уровня логирования
- ✅ Компонент отображает текущий уровень логирования
- ✅ Компонент имеет кнопку сброса к значению по умолчанию
- ✅ Компонент интегрирован в `DashboardSector1C.vue`
- ✅ Компонент показывается только в режиме разработки (или через localStorage в production)
- ✅ Компонент имеет адаптивный дизайн для мобильных устройств

---

### STEP-05: Тестирование и документация

**Цель:** Протестировать работу службы логирования и создать документацию.

**Задачи:**
1. Тестирование:
   - Проверить работу всех уровней логирования
   - Проверить сохранение настроек в localStorage
   - Проверить работу в разных режимах (production/development)
   - Проверить, что логи не выводятся при уровне `NONE`
   - Проверить форматирование сообщений
   
2. Документация:
   - Создать `DOCS/GUIDES/logging-service.md` с описанием:
     - Как использовать службу логирования
     - Уровни логирования и их назначение
     - Примеры использования
     - Как управлять логированием через UI
   
3. Обновление существующей документации:
   - Обновить `DOCS/ARCHITECTURE/dashboard-sector-1c.md` (добавить раздел о логировании)

**Критерии приёмки:**
- [x] Все уровни логирования работают корректно
- [x] Настройки сохраняются и восстанавливаются из localStorage
- [x] Логи не выводятся при уровне `NONE`
- [x] Создана документация по использованию службы логирования
- [x] Обновлена архитектурная документация

**Результат:**
- ✅ Создана документация `DOCS/GUIDES/logging-service.md`
- ✅ Обновлена архитектурная документация `DOCS/ARCHITECTURE/dashboard-sector-1c.md`
- ✅ Добавлены описания модулей логирования в архитектуру
- ✅ Добавлены ссылки на документацию в архитектуре

---

## Технические требования

- **Версия Vue.js:** 3.x
- **Поддержка браузеров:** Все современные браузеры с поддержкой localStorage
- **Производительность:** Логирование не должно влиять на производительность (проверка уровня перед выводом)
- **Безопасность:** Не логировать чувствительные данные (пароли, токены)

## API-методы Bitrix24

Не используются (задача не связана с Bitrix24 API).

## Критерии приёмки (общие)

- [x] Все `console.*` заменены на службу логирования
- [x] Служба логирования работает корректно
- [x] Управление логированием через UI работает
- [x] Настройки сохраняются в localStorage
- [x] Документация создана и актуальна
- [x] Код соответствует стандартам проекта
- [x] Нет ошибок компиляции
- [x] Функциональность дашборда не нарушена

## Тестирование

### Ручное тестирование:

1. **Проверка уровней логирования:**
   - Установить уровень `NONE` → проверить, что логи не выводятся
   - Установить уровень `ERROR` → проверить, что выводятся только ошибки
   - Установить уровень `WARN` → проверить, что выводятся предупреждения и ошибки
   - Установить уровень `INFO` → проверить, что выводятся информационные сообщения, предупреждения и ошибки
   - Установить уровень `DEBUG` → проверить, что выводятся все логи

2. **Проверка сохранения настроек:**
   - Изменить уровень логирования
   - Перезагрузить страницу
   - Проверить, что уровень сохранился

3. **Проверка форматирования:**
   - Проверить, что логи содержат timestamp, уровень, контекст
   - Проверить, что данные логируются корректно

4. **Проверка работы в разных режимах:**
   - Проверить работу в production режиме (уровень по умолчанию: `ERROR`)
   - Проверить работу в development режиме (уровень по умолчанию: `DEBUG`)

## История правок

- 2025-12-06 17:56 (UTC+3, Брест): Создана задача
- 2025-12-06 17:57 (UTC+3, Брест): Завершён STEP-01 (аудит текущего логирования)
- 2025-12-06 18:00 (UTC+3, Брест): Завершён STEP-02 (создание службы логирования)
- 2025-12-06 18:05 (UTC+3, Брест): Завершён STEP-03 (замена console.* на службу логирования)
- 2025-12-06 18:10 (UTC+3, Брест): Завершён STEP-04 (добавление UI для управления логированием)
- 2025-12-06 18:16 (UTC+3, Брест): Завершён STEP-05 (тестирование и документация)
- 2025-12-06 18:27 (UTC+3, Брест): ✅ Задача успешно завершена и проверена. Служба логирования работает корректно, консоль пустая в production (только ошибки), что соответствует ожидаемому поведению.

