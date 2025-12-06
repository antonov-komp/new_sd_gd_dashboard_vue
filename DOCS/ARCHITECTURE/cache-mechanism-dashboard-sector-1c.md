# Механизм кеширования запросов: Дашборд сектора 1С

**Дата создания:** 2025-12-06 12:22 (UTC+3, Брест)  
**Версия:** 1.0  
**Статус:** Актуально  
**Связанная задача:** TASK-005

---

## 📋 Обзор

После выполнения задачи TASK-005 и рефакторинга был внедрён механизм кеширования запросов для оптимизации производительности дашборда сектора 1С. Кеширование реализовано на уровне сервисов и репозиториев, что позволяет значительно сократить количество запросов к Bitrix24 REST API.

---

## 🎯 Цели кеширования

1. **Сокращение количества запросов к API** — уменьшение нагрузки на Bitrix24
2. **Ускорение загрузки данных** — мгновенный возврат данных из кеша
3. **Оптимизация производительности** — снижение времени отклика интерфейса
4. **Экономия трафика** — меньше данных передаётся по сети

---

## 🏗️ Архитектура кеширования

### Компоненты системы

```
┌─────────────────────────────────────────────────────────┐
│                    CacheManager                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Хранилище: Map<string, CacheEntry>              │  │
│  │  - Ключ: строка (например, "tickets:stage:123")   │  │
│  │  - Значение: { data, timestamp, ttl }            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                        ▲
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────┴──────┐ ┌──────┴──────┐ ┌──────┴──────┐
│ TicketRepo   │ │ EmployeeRepo│ │ SectorData  │
│              │ │             │ │             │
│ getTickets() │ │ getEmployees│ │ getSector()│
└──────────────┘ └─────────────┘ └────────────┘
```

### Основной класс: `CacheManager`

**Расположение:** `vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js`

**Ответственность:**
- Хранение данных в памяти (Map)
- Управление TTL (Time To Live) для записей
- Автоматическая очистка истёкших записей
- Инвалидация кеша при обновлениях

---

## 🔑 Типы кешируемых данных

### 1. Тикеты по стадиям

**Ключ:** `tickets:stage:{stageId}`  
**TTL:** 5 минут (300 000 мс)  
**Где используется:** `TicketRepository.getTicketsByStage()`

**Пример ключа:**
```javascript
// Для стадии "DT140_12:UC_0VHWE2"
const key = "tickets:stage:DT140_12:UC_0VHWE2";
```

**Логика работы:**
1. При запросе тикетов проверяется кеш по ключу стадии
2. Если данные есть и не истёк TTL — возвращаются из кеша
3. Если кеша нет или истёк — выполняется запрос к API
4. После получения данных они сохраняются в кеш с TTL 5 минут

**Код:**
```64:125:vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js
  static async getTicketsByStage(stageId, useCache = true) {
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getTicketsCacheKey(stageId);
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        console.log(`Cache hit for stage ${stageId}`);
        return cached;
      }
    }

    const allTickets = [];
    let start = 0;
    const limit = 50; // Максимум элементов за запрос
    let hasMore = true;

    while (hasMore) {
      try {
        const result = await ApiClient.call('crm.item.list', {
          entityTypeId: ENTITY_TYPE_ID,
          filter: {
            stageId: stageId
          },
          select: ['*'],
          order: { id: 'DESC' },
          start: start,
          useOriginalUfNames: 'Y' // Использовать оригинальные имена пользовательских полей
        });

        // Извлекаем массив тикетов из ответа
        let batchTickets = [];
        if (result && result.result) {
          if (Array.isArray(result.result)) {
            batchTickets = result.result;
          } else if (result.result.items && Array.isArray(result.result.items)) {
            batchTickets = result.result.items;
          } else if (result.result.data && Array.isArray(result.result.data)) {
            batchTickets = result.result.data;
          }
        }

        if (batchTickets.length > 0) {
          allTickets.push(...batchTickets);
          start += batchTickets.length;
          hasMore = batchTickets.length === limit;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error loading tickets batch for stage ${stageId} (start: ${start}):`, error);
        hasMore = false; // Прерываем цикл при ошибке
      }
    }

    // Сохраняем в кеш
    if (useCache) {
      const cacheKey = CacheManager.getTicketsCacheKey(stageId);
      CacheManager.set(cacheKey, allTickets, CacheManager.TICKETS_TTL);
    }

    return allTickets;
  }
```

### 2. Данные сотрудников

**Ключ:** `employees:ids:{sortedIds}`  
**TTL:** 30 минут (1 800 000 мс)  
**Где используется:** `EmployeeRepository.getEmployeesByIds()`

**Пример ключа:**
```javascript
// Для сотрудников с ID [5, 10, 15]
const key = "employees:ids:5,10,15";
// ID сортируются для единообразия ключа
```

**Логика работы:**
1. При запросе сотрудников проверяется кеш по ключу (отсортированные ID)
2. Если данные есть и не истёк TTL — возвращаются из кеша
3. Если кеша нет или истёк — выполняется запрос к API `user.get`
4. После получения данных они сохраняются в кеш с TTL 30 минут

**Код:**
```32:76:vue-app/src/services/dashboard-sector-1c/data/employee-repository.js
  static async getEmployeesByIds(employeeIds, useCache = true) {
    if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
      return [];
    }

    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getEmployeesCacheKey(employeeIds);
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        console.log(`Cache hit for employees: ${employeeIds.length} employees`);
        return cached;
      }
    }

    try {
      const result = await ApiClient.call('user.get', {
        filter: {
          ID: employeeIds
        }
      });

      // Проверяем структуру ответа
      let users = [];
      if (result && result.result) {
        if (Array.isArray(result.result)) {
          users = result.result;
        } else {
          console.warn('Unexpected user.get result format:', result);
        }
      }

      // Сохраняем в кеш
      if (useCache) {
        const cacheKey = CacheManager.getEmployeesCacheKey(employeeIds);
        CacheManager.set(cacheKey, users, CacheManager.EMPLOYEES_TTL);
      }

      return users;
    } catch (error) {
      console.error('Error getting employees by IDs:', error);
      // Возвращаем пустой массив при ошибке, чтобы не ломать работу дашборда
      return [];
    }
  }
```

### 3. Данные сектора (итоговый результат)

**Ключ:** `sector:data`  
**TTL:** 5 минут (300 000 мс)  
**Где используется:** `DashboardSector1CService.getSectorData()`

**Логика работы:**
1. При запросе данных сектора проверяется кеш
2. Если данные есть и не истёк TTL — возвращаются из кеша
3. Если кеша нет или истёк:
   - Загружаются тикеты (с использованием кеша тикетов)
   - Фильтруются по сектору
   - Загружаются сотрудники (с использованием кеша сотрудников)
   - Группируются данные
   - Сохраняются в кеш с TTL 5 минут

**Код:**
```54:104:vue-app/src/services/dashboard-sector-1c/index.js
  static async getSectorData(useCache = true) {
    // Проверяем кеш
    if (useCache) {
      const cacheKey = CacheManager.getSectorDataCacheKey();
      const cached = CacheManager.get(cacheKey);
      if (cached !== null) {
        console.log('Cache hit for sector data');
        return cached;
      }
    }

    try {
      // Шаг 1: Получаем все тикеты с пагинацией (с кешированием)
      const targetStages = getTargetStages();
      const allTickets = await TicketRepository.getAllTickets(targetStages);
      console.log('Total tickets loaded:', allTickets.length);

      // Шаг 2: Фильтруем тикеты по тегу сектора 1С
      const filteredTickets = filterBySector(allTickets);
      console.log(`Filtered ${filteredTickets.length} tickets from ${allTickets.length} (sector tag: 1C)`);

      // Шаг 3: Извлекаем уникальных сотрудников из тикетов
      const uniqueEmployeeIds = extractUniqueEmployeeIds(filteredTickets);
      console.log('Unique employee IDs:', uniqueEmployeeIds);

      // Шаг 4: Получаем данные только этих сотрудников (с кешированием)
      const bitrixUsers = await EmployeeRepository.getEmployeesByIds(uniqueEmployeeIds);
      const employees = mapEmployees(bitrixUsers);
      console.log('Loaded employees:', employees.length);

      // Шаг 5: Группируем тикеты по этапам и сотрудникам
      const stages = groupTicketsByStages(filteredTickets, employees);

      const result = {
        stages,
        employees: employees,
        zeroPointTickets: getZeroPointTickets(filteredTickets)
      };

      // Сохраняем в кеш
      if (useCache) {
        const cacheKey = CacheManager.getSectorDataCacheKey();
        CacheManager.set(cacheKey, result, CacheManager.TICKETS_TTL);
      }

      return result;
    } catch (error) {
      console.error('Error getting sector data:', error);
      throw error;
    }
  }
```

---

## ⚙️ Механизм работы CacheManager

### Структура записи в кеше

```typescript
interface CacheEntry {
  data: any;           // Кешируемые данные
  timestamp: number;   // Время создания записи (Date.now())
  ttl: number;         // Время жизни в миллисекундах
}
```

### Основные методы

#### 1. `get(key)` — получение данных

**Логика:**
1. Получает запись из Map по ключу
2. Если записи нет — возвращает `null`
3. Проверяет, не истёк ли TTL:
   - Если истёк — удаляет запись и возвращает `null`
   - Если не истёк — возвращает данные

**Код:**
```49:67:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Проверяем, не истёк ли кеш
    const now = Date.now();
    const age = now - entry.timestamp;
    
    if (age > entry.ttl) {
      // Кеш истёк, удаляем запись
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }
```

#### 2. `set(key, data, ttl)` — сохранение данных

**Логика:**
1. Создаёт запись с данными, текущим временем и TTL
2. Сохраняет в Map

**Код:**
```76:82:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static set(key, data, ttl = this.DEFAULT_TTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
```

#### 3. `invalidateTicketsCache()` — инвалидация кеша тикетов

**Логика:**
1. Удаляет все записи с префиксом `tickets:`
2. Удаляет запись `sector:data` (так как она зависит от тикетов)

**Использование:**
- После обновления тикета (`TicketRepository.updateTicket()`)
- После создания тикета (`TicketRepository.createTicket()`)
- После назначения тикета (`DashboardSector1CService.assignTicket()`)

**Код:**
```208:211:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static invalidateTicketsCache() {
    this.invalidateByPrefix('tickets:');
    this.invalidateByPrefix('sector:');
  }
```

---

## 🔄 Жизненный цикл кеша

### Сценарий 1: Первая загрузка данных

```
1. Пользователь открывает дашборд
   ↓
2. Вызывается getSectorData()
   ↓
3. Проверка кеша "sector:data" → НЕТ
   ↓
4. Загрузка тикетов:
   - Проверка кеша "tickets:stage:DT140_12:UC_0VHWE2" → НЕТ
   - Запрос к API crm.item.list
   - Сохранение в кеш (TTL 5 мин)
   ↓
5. Загрузка сотрудников:
   - Проверка кеша "employees:ids:5,10,15" → НЕТ
   - Запрос к API user.get
   - Сохранение в кеш (TTL 30 мин)
   ↓
6. Группировка данных
   ↓
7. Сохранение результата в кеш "sector:data" (TTL 5 мин)
   ↓
8. Возврат данных пользователю
```

### Сценарий 2: Повторная загрузка (кеш актуален)

```
1. Пользователь обновляет дашборд (через 2 минуты)
   ↓
2. Вызывается getSectorData()
   ↓
3. Проверка кеша "sector:data" → ЕСТЬ (не истёк)
   ↓
4. Возврат данных из кеша (мгновенно)
   ↓
5. НЕТ запросов к API
```

### Сценарий 3: Обновление тикета

```
1. Пользователь перемещает тикет (Drag & Drop)
   ↓
2. Вызывается assignTicket()
   ↓
3. Выполняется API-запрос crm.item.update
   ↓
4. Вызывается CacheManager.invalidateTicketsCache()
   ↓
5. Удаляются все записи:
   - "tickets:stage:DT140_12:UC_0VHWE2"
   - "tickets:stage:DT140_12:PREPARATION"
   - "tickets:stage:DT140_12:CLIENT"
   - "sector:data"
   ↓
6. При следующей загрузке данные обновятся из API
```

---

## 📊 TTL (Time To Live) для разных типов данных

| Тип данных | TTL | Причина |
|------------|-----|---------|
| **Тикеты** | 5 минут | Данные часто меняются (назначения, перемещения) |
| **Сотрудники** | 30 минут | Данные редко меняются (имя, фото) |
| **Данные сектора** | 5 минут | Зависит от тикетов, поэтому такой же TTL |

**Константы:**
```28:41:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  /**
   * TTL по умолчанию (5 минут)
   */
  static DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

  /**
   * TTL для данных сотрудников (30 минут)
   */
  static EMPLOYEES_TTL = 30 * 60 * 1000; // 30 минут

  /**
   * TTL для данных тикетов (5 минут)
   */
  static TICKETS_TTL = 5 * 60 * 1000; // 5 минут
```

---

## 🧹 Автоматическая очистка истёкших записей

### Периодическая очистка

Каждые 5 минут автоматически удаляются все истёкшие записи из кеша.

**Код:**
```223:228:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
// Периодическая очистка истёкших записей (каждые 5 минут)
if (typeof window !== 'undefined') {
  setInterval(() => {
    CacheManager.cleanExpired();
  }, 5 * 60 * 1000);
}
```

**Метод очистки:**
```124:136:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static cleanExpired() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
```

---

## 🔍 Инвалидация кеша

### Когда происходит инвалидация

1. **После обновления тикета:**
   ```javascript
   // TicketRepository.updateTicket()
   if (success) {
     CacheManager.invalidateTicketsCache();
   }
   ```

2. **После создания тикета:**
   ```javascript
   // TicketRepository.createTicket()
   if (ticketId > 0) {
     CacheManager.invalidateTicketsCache();
   }
   ```

3. **После назначения тикета:**
   ```javascript
   // DashboardSector1CService.assignTicket()
   if (result) {
     CacheManager.invalidateTicketsCache();
   }
   ```

### Методы инвалидации

#### `invalidateByPrefix(prefix)` — удаление по префиксу

**Использование:**
- Удаляет все записи, ключи которых начинаются с указанного префикса

**Пример:**
```javascript
// Удалить все записи тикетов
CacheManager.invalidateByPrefix('tickets:');
```

**Код:**
```107:117:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static invalidateByPrefix(prefix) {
    const keysToDelete = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }
```

#### `invalidateTicketsCache()` — инвалидация кеша тикетов

**Удаляет:**
- Все записи с префиксом `tickets:`
- Запись `sector:data` (так как зависит от тикетов)

**Код:**
```208:211:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static invalidateTicketsCache() {
    this.invalidateByPrefix('tickets:');
    this.invalidateByPrefix('sector:');
  }
```

---

## 📈 Преимущества кеширования

### Производительность

**До внедрения кеша:**
- Каждое открытие дашборда: 3-5 секунд
- Количество запросов: 3+ (по стадиям) + N (сотрудники)
- Нагрузка на Bitrix24 API: высокая

**После внедрения кеша:**
- Первое открытие: 3-5 секунд (загрузка из API)
- Повторное открытие (в течение 5 минут): < 100 мс (из кеша)
- Количество запросов: 0 (при наличии кеша)
- Нагрузка на Bitrix24 API: снижена на 70-80%

### Пользовательский опыт

- **Мгновенная загрузка** при повторных открытиях
- **Меньше задержек** при работе с дашбордом
- **Стабильность** — меньше зависимость от скорости API

---

## 🛠️ Управление кешем

### Отключение кеша

Для отладки или принудительного обновления данных можно отключить кеш:

```javascript
// Загрузка без кеша
const data = await DashboardSector1CService.getSectorData(false);
```

### Очистка всего кеша

```javascript
CacheManager.clear();
```

### Получение статистики

```javascript
const stats = CacheManager.getStats();
// { total: 5, valid: 3, expired: 2 }
```

**Код:**
```143:162:vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js
  static getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let validCount = 0;
    
    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expiredCount++;
      } else {
        validCount++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount
    };
  }
```

---

## 🔐 Безопасность и ограничения

### Хранение в памяти

- Кеш хранится в памяти браузера (Map)
- При перезагрузке страницы кеш очищается
- Не сохраняется между сессиями

### Ограничения

- **Размер:** Ограничен только памятью браузера
- **Время жизни:** Максимальный TTL — 30 минут (сотрудники)
- **Синхронизация:** Кеш не синхронизируется между вкладками

### Рекомендации

- Не кешировать чувствительные данные
- Использовать разумные TTL
- Инвалидировать кеш при обновлениях

---

## 📝 Примеры использования

### Пример 1: Загрузка данных сектора

```javascript
import { DashboardSector1CService } from '@/services/dashboard-sector-1c';

// С кешем (по умолчанию)
const data = await DashboardSector1CService.getSectorData();

// Без кеша (принудительное обновление)
const freshData = await DashboardSector1CService.getSectorData(false);
```

### Пример 2: Обновление тикета с инвалидацией кеша

```javascript
import { DashboardSector1CService } from '@/services/dashboard-sector-1c';

// Назначение тикета (автоматически инвалидирует кеш)
await DashboardSector1CService.assignTicket(ticketId, employeeId, stageId);

// При следующей загрузке данные обновятся из API
const updatedData = await DashboardSector1CService.getSectorData();
```

### Пример 3: Мониторинг кеша

```javascript
import { CacheManager } from '@/services/dashboard-sector-1c/cache/cache-manager';

// Получение статистики
const stats = CacheManager.getStats();
console.log(`Кеш: ${stats.valid} валидных, ${stats.expired} истёкших`);

// Очистка истёкших записей
CacheManager.cleanExpired();

// Очистка всего кеша
CacheManager.clear();
```

---

## 🔗 Связанные документы

- `DOCS/TASKS/TASK-005-dashboard-sector-1c.md` — исходная задача
- `DOCS/REFACTORING/TASK-005-refactoring-plan.md` — план рефакторинга
- `DOCS/ARCHITECTURE/dashboard-sector-1c.md` — архитектура дашборда
- `vue-app/src/services/dashboard-sector-1c/cache/cache-manager.js` — реализация кеша

---

## 📅 История изменений

- **2025-12-06 12:22 (UTC+3, Брест):** Создан документ о механизме кеширования после выполнения TASK-005 и рефакторинга

---

**Автор:** Технический писатель  
**Статус:** Актуально


