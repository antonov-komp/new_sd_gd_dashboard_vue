# Руководство по использованию службы логирования дашборда сектора 1С

**Дата создания:** 2025-12-06 18:16 (UTC+3, Брест)  
**Версия:** 1.0  
**Задача:** TASK-014

---

## Описание

Служба логирования дашборда сектора 1С предоставляет централизованное управление логированием с поддержкой уровней детализации. Служба заменяет все прямые вызовы `console.*` на единый интерфейс с возможностью управления уровнем логирования через UI или конфигурацию.

---

## Уровни логирования

Служба поддерживает следующие уровни логирования (от наименьшего к наибольшему):

### NONE (0) - Отключено
- Логирование полностью отключено
- Никакие логи не выводятся в консоль
- Используется для production-окружений, где логирование не требуется

### ERROR (1) - Только ошибки
- Выводятся только критические ошибки
- Рекомендуется для production-окружений
- Уровень по умолчанию для production

### WARN (2) - Предупреждения и ошибки
- Выводятся предупреждения и ошибки
- Используется для диагностики проблем в production
- Включает все логи уровня ERROR

### INFO (3) - Информация, предупреждения и ошибки
- Выводятся информационные сообщения, предупреждения и ошибки
- Используется для мониторинга работы приложения
- Включает все логи уровней WARN и ERROR

### DEBUG (4) - Все логи (отладка)
- Выводятся все логи, включая отладочные сообщения
- Используется только в режиме разработки
- Уровень по умолчанию для development

---

## Использование в сервисах

### Импорт Logger

```javascript
import { Logger } from '@/services/dashboard-sector-1c/utils/logger.js';
```

### Методы логирования

#### Logger.error()
Логирование ошибок (критичные проблемы)

```javascript
try {
  // Код, который может выбросить ошибку
  await someOperation();
} catch (error) {
  Logger.error('Error performing operation', 'ServiceName', error);
}
```

**Параметры:**
- `message` (string) - Сообщение об ошибке
- `context` (string) - Контекст (имя модуля/сервиса)
- `error` (object) - Объект ошибки или дополнительные данные

#### Logger.warn()
Логирование предупреждений (некритичные проблемы)

```javascript
if (!Array.isArray(data)) {
  Logger.warn('Data is not an array', 'ServiceName', data);
  data = [];
}
```

**Параметры:**
- `message` (string) - Сообщение-предупреждение
- `context` (string) - Контекст (имя модуля/сервиса)
- `data` (object) - Дополнительные данные

#### Logger.info()
Логирование информационных сообщений

```javascript
Logger.info('Operation completed successfully', 'ServiceName', { count: 10 });
```

**Параметры:**
- `message` (string) - Информационное сообщение
- `context` (string) - Контекст (имя модуля/сервиса)
- `data` (object) - Дополнительные данные

#### Logger.debug()
Логирование отладочных сообщений (только для разработки)

```javascript
Logger.debug('Cache hit for employees', 'EmployeeRepository', { count: 5 });
```

**Параметры:**
- `message` (string) - Отладочное сообщение
- `context` (string) - Контекст (имя модуля/сервиса)
- `data` (object) - Дополнительные данные

---

## Использование в компонентах Vue

### Импорт композабла useLogger

```javascript
import { useLogger } from '@/composables/useLogger.js';
```

### Использование в setup()

```vue
<script>
import { useLogger } from '@/composables/useLogger.js';

export default {
  name: 'MyComponent',
  setup() {
    const logger = useLogger('MyComponent');
    
    const handleClick = () => {
      logger.debug('Button clicked', { buttonId: 'submit' });
    };
    
    return {
      handleClick
    };
  }
};
</script>
```

### Методы композабла

Композабл `useLogger` предоставляет те же методы, что и `Logger`:
- `logger.error(message, error)`
- `logger.warn(message, data)`
- `logger.info(message, data)`
- `logger.debug(message, data)`

**Преимущества композабла:**
- Автоматическое определение контекста (имя компонента)
- Удобный API для использования в компонентах
- Не нужно передавать контекст вручную

---

## Управление уровнем логирования

### Программное управление

#### Получение текущего уровня

```javascript
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

const currentLevel = LoggerConfig.getLevel();
console.log('Current log level:', currentLevel); // 'ERROR', 'WARN', 'INFO', 'DEBUG', 'NONE'
```

#### Установка уровня

```javascript
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

// Установить уровень DEBUG
LoggerConfig.setLevel('DEBUG');

// Отключить логирование
LoggerConfig.setLevel('NONE');
```

#### Проверка, включено ли логирование для уровня

```javascript
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

if (LoggerConfig.isEnabled('DEBUG')) {
  // Логирование уровня DEBUG включено
}
```

#### Сброс к значению по умолчанию

```javascript
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

LoggerConfig.reset(); // Сбрасывает настройки и использует значение по умолчанию
```

### Управление через UI

Компонент `LoggerControl` предоставляет графический интерфейс для управления логированием.

#### Отображение компонента

Компонент автоматически показывается в режиме разработки. В production можно включить через localStorage:

```javascript
localStorage.setItem('dashboard-sector-1c-show-logger-control', 'true');
```

#### Использование компонента

Компонент интегрирован в `DashboardSector1C.vue` и отображается в правом верхнем углу экрана.

**Функции компонента:**
- Переключатель включения/отключения логирования
- Выбор уровня логирования из выпадающего списка
- Отображение текущего уровня с описанием
- Кнопка сброса к значению по умолчанию
- Сворачивание/разворачивание панели управления

---

## Форматирование сообщений

Все логи форматируются в едином формате:

```
[2025-12-06T18:16:23.456Z] [ERROR] [ServiceName] Error message
```

**Формат:**
- `[timestamp]` - ISO-формат времени (UTC)
- `[level]` - Уровень логирования (ERROR, WARN, INFO, DEBUG)
- `[context]` - Контекст (имя модуля/компонента)
- `message` - Сообщение
- `data` - Дополнительные данные (если переданы)

**Примеры:**

```
[2025-12-06T18:16:23.456Z] [ERROR] [DashboardSector1CService] Error getting sector data
[2025-12-06T18:16:23.456Z] [WARN] [TicketGrouper] Tickets is not an array
[2025-12-06T18:16:23.456Z] [INFO] [useNotifications] [SUCCESS] Operation completed
[2025-12-06T18:16:23.456Z] [DEBUG] [EmployeeRepository] Cache hit for employees: 5 employees
```

---

## Уровни по умолчанию

### Development режим
- Уровень по умолчанию: `DEBUG`
- Все логи выводятся в консоль
- Компонент `LoggerControl` показывается автоматически

### Production режим
- Уровень по умолчанию: `ERROR`
- Выводятся только критические ошибки
- Компонент `LoggerControl` скрыт (можно включить через localStorage)

---

## Примеры использования

### Пример 1: Логирование ошибок в сервисе

```javascript
// vue-app/src/services/dashboard-sector-1c/index.js
import { Logger } from './utils/logger.js';

export class DashboardSector1CService {
  static async getSectorData() {
    try {
      // Код получения данных
      const result = await fetchData();
      return result;
    } catch (error) {
      Logger.error('Error getting sector data', 'DashboardSector1CService', error);
      throw error;
    }
  }
}
```

### Пример 2: Логирование предупреждений в утилите

```javascript
// vue-app/src/services/dashboard-sector-1c/groupers/ticket-grouper.js
import { Logger } from '../utils/logger.js';

export function groupTicketsByStages(tickets, employees) {
  if (!Array.isArray(tickets)) {
    Logger.warn('Tickets is not an array', 'TicketGrouper', tickets);
    tickets = [];
  }
  
  // Дальнейшая обработка
}
```

### Пример 3: Логирование в компоненте Vue

```vue
<script>
import { useLogger } from '@/composables/useLogger.js';

export default {
  name: 'DashboardStage',
  setup() {
    const logger = useLogger('DashboardStage');
    
    const handleTicketClicked = (ticket) => {
      logger.debug('Ticket clicked', ticket);
      // Обработка клика
    };
    
    return {
      handleTicketClicked
    };
  }
};
</script>
```

### Пример 4: Условное логирование

```javascript
import { Logger } from './utils/logger.js';
import { LoggerConfig } from './utils/logger-config.js';

// Логирование только в режиме разработки
if (LoggerConfig.isEnabled('DEBUG')) {
  Logger.debug('Detailed debug information', 'ServiceName', complexData);
}
```

---

## Хранение настроек

Настройки логирования сохраняются в `localStorage` с ключом:
```
dashboard-sector-1c-logger-level
```

**Значения:**
- `NONE` - Логирование отключено
- `ERROR` - Только ошибки
- `WARN` - Предупреждения и ошибки
- `INFO` - Информация, предупреждения и ошибки
- `DEBUG` - Все логи

**Примечание:** Настройки сохраняются автоматически при изменении через UI или программно.

---

## Производительность

Служба логирования оптимизирована для производительности:

1. **Проверка уровня перед выводом**
   - Логи не форматируются, если уровень логирования отключен
   - Минимальные накладные расходы при отключенном логировании

2. **Условная проверка**
   ```javascript
   if (!LoggerConfig.isEnabled(level)) {
     return; // Выход без форматирования
   }
   ```

3. **Безопасная работа с localStorage**
   - Проверка доступности localStorage перед использованием
   - Работает в окружениях без localStorage (SSR)

---

## Безопасность

**Важно:** Не логируйте чувствительные данные!

### Что НЕ нужно логировать:
- Пароли и токены доступа
- Персональные данные (ПДн)
- Кредитные карты и платежные данные
- Конфиденциальная бизнес-информация

### Что можно логировать:
- ID сущностей (тикетов, сотрудников)
- Статусы операций
- Количество элементов
- Ошибки без чувствительных данных

**Пример безопасного логирования:**

```javascript
// ✅ ХОРОШО
Logger.error('Error creating ticket', 'TicketService', { ticketId: 123 });

// ❌ ПЛОХО
Logger.error('Error creating ticket', 'TicketService', { 
  ticketId: 123,
  password: 'secret123' // НЕ ЛОГИРОВАТЬ!
});
```

---

## Отладка

### Включение логирования в production

Для отладки в production можно временно включить логирование:

1. **Через консоль браузера:**
   ```javascript
   localStorage.setItem('dashboard-sector-1c-logger-level', 'DEBUG');
   localStorage.setItem('dashboard-sector-1c-show-logger-control', 'true');
   location.reload();
   ```

2. **Через компонент LoggerControl:**
   - Включить показ компонента через localStorage
   - Использовать UI для изменения уровня логирования

### Проверка текущего уровня

```javascript
import { LoggerConfig } from '@/services/dashboard-sector-1c/utils/logger-config.js';

console.log('Current log level:', LoggerConfig.getLevel());
```

---

## Миграция с console.*

### Правила замены

| Старый код | Новый код |
|------------|-----------|
| `console.error('message', error)` | `Logger.error('message', 'Context', error)` |
| `console.warn('message', data)` | `Logger.warn('message', 'Context', data)` |
| `console.log('message', data)` | `Logger.debug('message', 'Context', data)` |
| `console.info('message', data)` | `Logger.info('message', 'Context', data)` |

### В компонентах Vue

| Старый код | Новый код |
|------------|-----------|
| `console.log('message', data)` | `logger.debug('message', data)` (через `useLogger()`) |

---

## Структура файлов

```
vue-app/src/
├── services/
│   └── dashboard-sector-1c/
│       └── utils/
│           ├── logger.js              # Класс Logger
│           └── logger-config.js       # Конфигурация уровней
├── composables/
│   └── useLogger.js                   # Композабл для компонентов
└── components/
    └── dashboard/
        └── LoggerControl.vue          # UI компонент управления
```

---

## История изменений

- 2025-12-06 18:16 (UTC+3, Брест): Создана документация

---

## Связанные документы

- [Аудит использования console.*](/DOCS/LOGGING/console-usage-audit.md)
- [Архитектура дашборда сектора 1С](/DOCS/ARCHITECTURE/dashboard-sector-1c.md)
- [Задача TASK-014](/DOCS/TASKS/TASK-014-logging-service-dashboard-sector-1c.md)


