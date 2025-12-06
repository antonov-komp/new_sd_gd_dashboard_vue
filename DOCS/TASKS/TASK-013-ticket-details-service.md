# TASK-013: Внедрение сервиса получения данных по тикету

**Дата создания:** 2025-12-06 17:32 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)

---

## Описание

Создать отдельный сервис для получения полных данных по тикету из смарт-процесса 140. Сервис должен получать все поля тикета, включая дополнительные пользовательские поля (UF_*), и быть расширяемым для будущих полей.

**Цель:** Выделить логику получения детальных данных тикета в отдельный сервис, чтобы упростить поддержку и расширение функциональности при добавлении новых полей в смарт-процесс.

---

## Контекст

**Текущее состояние:**
- В `TicketRepository.getTicket()` есть базовый метод получения тикета через `crm.item.get`
- В `DashboardSector1CService.getTicket()` есть метод, который получает тикет и маппит его
- Смарт-процесс 140 содержит дополнительные пользовательские поля (UF_*)
- Количество полей может увеличиваться в будущем

**Проблема:**
- Логика получения детальных данных тикета разбросана между репозиторием и сервисом
- Нет единого места для обработки всех дополнительных полей
- Сложно расширять функциональность при добавлении новых полей

**Решение:**
- Создать отдельный сервис `TicketDetailsService` для получения полных данных тикета
- Сервис будет получать все поля тикета, включая дополнительные
- Сервис будет расширяемым для будущих полей
- Сервис будет использовать `TicketRepository` для базовых операций

---

## Модули и компоненты

### Новые файлы для создания:

1. **`vue-app/src/services/dashboard-sector-1c/services/ticket-details-service.js`**
   - Сервис для получения полных данных по тикету
   - Обработка всех полей тикета, включая дополнительные (UF_*)
   - Расширяемая структура для будущих полей

### Файлы для обновления:

1. **`vue-app/src/services/dashboard-sector-1c/index.js`**
   - Обновить метод `getTicket()` для использования нового сервиса (опционально)
   - Или оставить существующий метод и добавить новый метод `getTicketDetails()`

### Зависимости:

- **`TicketRepository`** — для получения базовых данных тикета через `crm.item.get`
- **`mapTicket`** — для маппинга базовых полей (опционально)
- **`ApiClient`** — для работы с Bitrix24 REST API

---

## Зависимости

### От других задач:
- Нет зависимостей от других задач

### От модулей:
- Использует `TicketRepository` из `data/ticket-repository.js`
- Использует `ApiClient` из `data/api-client.js`
- Может использовать `mapTicket` из `mappers/ticket-mapper.js` (опционально)

---

## Ступенчатые подзадачи

### 1. Создать структуру сервиса `TicketDetailsService`

**Создать файл:** `vue-app/src/services/dashboard-sector-1c/services/ticket-details-service.js`

**Структура сервиса:**
```javascript
/**
 * Сервис для получения полных данных по тикету
 * 
 * Получает все поля тикета из смарт-процесса 140, включая дополнительные
 * пользовательские поля (UF_*). Сервис расширяем для будущих полей.
 * 
 * Используемые методы Bitrix24:
 * - crm.item.get - получение элемента смарт-процесса
 * 
 * Документация:
 * - https://context7.com/bitrix24/rest/crm.item.get
 */

import { TicketRepository } from '../data/ticket-repository.js';

/**
 * ID смарт-процесса сектора 1С
 */
const ENTITY_TYPE_ID = 140;

/**
 * Сервис для получения детальных данных по тикету
 */
export class TicketDetailsService {
  /**
   * Получение полных данных по тикету
   * 
   * Получает все поля тикета, включая дополнительные пользовательские поля (UF_*).
   * Возвращает структурированные данные с разделением на базовые и дополнительные поля.
   * 
   * @param {number} ticketId - ID тикета
   * @param {object} options - Опции получения данных
   * @param {Array<string>} options.select - Список полей для получения (по умолчанию ['*'] - все поля)
   * @param {boolean} options.useOriginalUfNames - Использовать оригинальные имена пользовательских полей (по умолчанию true)
   * @returns {Promise<object>} Полные данные тикета
   */
  static async getTicketDetails(ticketId, options = {}) {
    // Реализация
  }

  /**
   * Обработка дополнительных полей тикета
   * 
   * Извлекает и структурирует дополнительные пользовательские поля (UF_*)
   * из данных тикета.
   * 
   * @param {object} ticketData - Данные тикета из Bitrix24
   * @returns {object} Структурированные дополнительные поля
   */
  static processAdditionalFields(ticketData) {
    // Реализация
  }

  /**
   * Получение списка всех дополнительных полей
   * 
   * Извлекает все поля, начинающиеся с UF_ (пользовательские поля).
   * 
   * @param {object} ticketData - Данные тикета из Bitrix24
   * @returns {object} Объект с дополнительными полями
   */
  static extractUserFields(ticketData) {
    // Реализация
  }
}
```

**Критерии:**
- [ ] Файл создан в правильной директории
- [ ] Импортированы необходимые зависимости
- [ ] Структура сервиса соответствует описанию

### 2. Реализовать метод `getTicketDetails()`

**Логика метода:**
1. Получить данные тикета через `TicketRepository.getTicket()`
2. Обработать дополнительные поля через `processAdditionalFields()`
3. Вернуть структурированные данные

**Пример реализации:**
```javascript
static async getTicketDetails(ticketId, options = {}) {
  const {
    select = ['*'],
    useOriginalUfNames = true
  } = options;

  try {
    // Получаем базовые данные тикета через репозиторий
    const ticketData = await TicketRepository.getTicket(ticketId);

    if (!ticketData) {
      throw new Error(`Тикет с ID ${ticketId} не найден`);
    }

    // Обрабатываем дополнительные поля
    const additionalFields = this.processAdditionalFields(ticketData);

    // Формируем структурированный ответ
    return {
      // Базовые поля
      id: ticketData.id || ticketData.ID,
      title: ticketData.title || ticketData.TITLE,
      stageId: ticketData.stageId || ticketData.STAGE_ID,
      assignedById: ticketData.assignedById || ticketData.ASSIGNED_BY_ID,
      createdAt: ticketData.createdTime || ticketData.CREATED_TIME || ticketData.CREATED_DATE,
      updatedAt: ticketData.updatedTime || ticketData.UPDATED_TIME || ticketData.MODIFY_DATE,
      priority: ticketData.priority || ticketData.PRIORITY,
      opportunity: ticketData.opportunity || ticketData.OPPORTUNITY,
      currencyId: ticketData.currencyId || ticketData.CURRENCY_ID,
      comments: ticketData.comments || ticketData.COMMENTS,
      
      // Дополнительные пользовательские поля
      additionalFields: additionalFields,
      
      // Все исходные данные (для расширяемости)
      rawData: ticketData
    };
  } catch (error) {
    console.error('Error getting ticket details:', error);
    throw error;
  }
}
```

**Критерии:**
- [ ] Метод получает данные через `TicketRepository.getTicket()`
- [ ] Метод обрабатывает дополнительные поля
- [ ] Метод возвращает структурированные данные
- [ ] Обработка ошибок реализована

### 3. Реализовать метод `processAdditionalFields()`

**Логика метода:**
1. Извлечь все поля, начинающиеся с `UF_`
2. Структурировать их в отдельный объект
3. Вернуть структурированные дополнительные поля

**Пример реализации:**
```javascript
static processAdditionalFields(ticketData) {
  const userFields = this.extractUserFields(ticketData);
  
  // Структурируем дополнительные поля
  const additionalFields = {
    // Пример: поле типа продукта
    typeProduct: userFields.UF_CRM_7_TYPE_PRODUCT || 
                 userFields.uf_crm_7_type_product || 
                 userFields.ufCrm7TypeProduct || 
                 null,
    
    // Добавьте здесь другие дополнительные поля по мере необходимости
    // ...
    
    // Все пользовательские поля (для расширяемости)
    all: userFields
  };

  return additionalFields;
}
```

**Критерии:**
- [ ] Метод извлекает все поля, начинающиеся с `UF_`
- [ ] Метод структурирует дополнительные поля
- [ ] Метод поддерживает разные варианты именования полей (верхний/нижний регистр, camelCase)

### 4. Реализовать метод `extractUserFields()`

**Логика метода:**
1. Пройтись по всем ключам объекта `ticketData`
2. Найти все поля, начинающиеся с `UF_`
3. Вернуть объект с пользовательскими полями

**Пример реализации:**
```javascript
static extractUserFields(ticketData) {
  const userFields = {};

  // Проходим по всем ключам объекта
  for (const key in ticketData) {
    if (ticketData.hasOwnProperty(key)) {
      // Проверяем, начинается ли ключ с UF_
      if (key.startsWith('UF_') || 
          key.startsWith('uf_') || 
          key.toLowerCase().startsWith('uf_')) {
        userFields[key] = ticketData[key];
      }
    }
  }

  return userFields;
}
```

**Критерии:**
- [ ] Метод извлекает все поля, начинающиеся с `UF_`
- [ ] Метод поддерживает разные варианты именования (верхний/нижний регистр)
- [ ] Метод возвращает объект с пользовательскими полями

### 5. Обновить главный сервис (опционально)

**Вариант 1:** Добавить новый метод `getTicketDetails()` в `DashboardSector1CService`

**Вариант 2:** Оставить существующий метод `getTicket()` и добавить новый метод `getTicketDetails()`

**Рекомендация:** Добавить новый метод `getTicketDetails()` в `DashboardSector1CService`, который будет использовать `TicketDetailsService`

**Пример обновления `index.js`:**
```javascript
import { TicketDetailsService } from './services/ticket-details-service.js';

// В классе DashboardSector1CService добавить:

/**
 * Получение полных данных по тикету
 * 
 * Использует TicketDetailsService для получения всех полей тикета,
 * включая дополнительные пользовательские поля (UF_*).
 * 
 * @param {number} ticketId - ID тикета
 * @param {object} options - Опции получения данных
 * @returns {Promise<object>} Полные данные тикета
 */
static async getTicketDetails(ticketId, options = {}) {
  try {
    return await TicketDetailsService.getTicketDetails(ticketId, options);
  } catch (error) {
    console.error('Error getting ticket details:', error);
    throw error;
  }
}
```

**Критерии:**
- [ ] Новый метод добавлен в `DashboardSector1CService`
- [ ] Метод использует `TicketDetailsService`
- [ ] Обработка ошибок реализована

---

## API-методы Bitrix24

### Используемые методы:

1. **`crm.item.get`** — получение элемента смарт-процесса
   - Документация: https://context7.com/bitrix24/rest/crm.item.get
   - Параметры:
     - `entityTypeId` — ID типа сущности (140 для смарт-процесса сектора 1С)
     - `id` — ID элемента (тикета)
     - `select` — список полей для получения (по умолчанию `['*']` — все поля)
   - Используется: `TicketRepository.getTicket()` → `TicketDetailsService.getTicketDetails()`

### Дополнительные поля смарт-процесса 140:

- `UF_CRM_7_TYPE_PRODUCT` — тип продукта (например, '1C' для сектора 1С)
- Другие пользовательские поля (UF_*) могут быть добавлены в будущем

---

## Технические требования

### Принципы реализации:

1. **Расширяемость**
   - Сервис должен легко расширяться для новых полей
   - Новые поля добавляются в метод `processAdditionalFields()`
   - Все исходные данные сохраняются в `rawData` для будущего использования

2. **Совместимость**
   - Сервис должен работать с существующим кодом
   - Не должен нарушать существующую функциональность
   - Должен поддерживать разные варианты именования полей (верхний/нижний регистр, camelCase)

3. **Обработка ошибок**
   - Все ошибки должны логироваться
   - Понятные сообщения об ошибках для пользователя
   - Обработка случаев, когда тикет не найден

4. **Производительность**
   - Использование кеширования через `TicketRepository` (если применимо)
   - Минимизация запросов к API
   - Оптимизация обработки данных

### Стандарты кода:

- **JavaScript:** ES6+ синтаксис
- **Импорты:** Named imports из модулей
- **Документация:** JSDoc комментарии для всех методов
- **Обработка ошибок:** Try/catch блоки с логированием

---

## Критерии приёмки

- [ ] Создан файл `ticket-details-service.js` в директории `services/`
- [ ] Реализован метод `getTicketDetails()` для получения полных данных тикета
- [ ] Реализован метод `processAdditionalFields()` для обработки дополнительных полей
- [ ] Реализован метод `extractUserFields()` для извлечения пользовательских полей
- [ ] Сервис получает данные через `TicketRepository.getTicket()`
- [ ] Сервис обрабатывает все дополнительные поля (UF_*)
- [ ] Сервис поддерживает разные варианты именования полей (верхний/нижний регистр, camelCase)
- [ ] Обработка ошибок реализована (try/catch, логирование)
- [ ] Добавлен метод `getTicketDetails()` в `DashboardSector1CService` (опционально)
- [ ] Документация JSDoc добавлена для всех методов
- [ ] Код соответствует стандартам проекта

---

## Тестирование

### Функциональное тестирование:

1. **Проверка получения данных тикета:**
   - Вызвать `TicketDetailsService.getTicketDetails(ticketId)`
   - Проверить, что возвращаются все базовые поля
   - Проверить, что возвращаются дополнительные поля (UF_*)
   - Проверить, что структура данных корректна

2. **Проверка обработки дополнительных полей:**
   - Проверить, что метод `processAdditionalFields()` корректно извлекает все UF_* поля
   - Проверить, что метод поддерживает разные варианты именования полей
   - Проверить, что структура дополнительных полей корректна

3. **Проверка обработки ошибок:**
   - Проверить обработку случая, когда тикет не найден
   - Проверить обработку ошибок API
   - Проверить логирование ошибок

### Интеграционное тестирование:

1. Проверить работу сервиса в контексте дашборда
2. Проверить, что сервис не нарушает существующую функциональность
3. Проверить производительность (время получения данных)

---

## Примеры использования

### Пример 1: Получение полных данных тикета

```javascript
import { TicketDetailsService } from '@/services/dashboard-sector-1c/services/ticket-details-service.js';

// Получение полных данных тикета
const ticketDetails = await TicketDetailsService.getTicketDetails(12345);

console.log(ticketDetails);
// {
//   id: 12345,
//   title: 'Название тикета',
//   stageId: 'DT140_12:CLIENT',
//   assignedById: 1051,
//   createdAt: '2025-12-06T10:00:00',
//   updatedAt: '2025-12-06T15:00:00',
//   priority: 'high',
//   opportunity: 100000,
//   currencyId: 'RUB',
//   comments: 'Комментарий',
//   additionalFields: {
//     typeProduct: '1C',
//     all: {
//       UF_CRM_7_TYPE_PRODUCT: '1C',
//       // ... другие UF_* поля
//     }
//   },
//   rawData: { /* все исходные данные */ }
// }
```

### Пример 2: Использование через главный сервис

```javascript
import { DashboardSector1CService } from '@/services/dashboard-sector-1c/index.js';

// Получение полных данных тикета через главный сервис
const ticketDetails = await DashboardSector1CService.getTicketDetails(12345);

// Использование данных
console.log(ticketDetails.additionalFields.typeProduct); // '1C'
```

### Пример 3: Расширение для новых полей

```javascript
// В методе processAdditionalFields() добавить новое поле:
static processAdditionalFields(ticketData) {
  const userFields = this.extractUserFields(ticketData);
  
  return {
    typeProduct: userFields.UF_CRM_7_TYPE_PRODUCT || null,
    
    // Новое поле (пример)
    newField: userFields.UF_CRM_7_NEW_FIELD || null,
    
    all: userFields
  };
}
```

---

## История правок

- **2025-12-06 17:32 (UTC+3, Брест):** Создана задача для внедрения сервиса получения данных по тикету
- **2025-12-06 18:00 (UTC+3, Брест):** Задача выполнена. Создан сервис `TicketDetailsService` с методами:
  - `getTicketDetails()` - получение полных данных тикета
  - `processAdditionalFields()` - обработка дополнительных полей
  - `extractUserFields()` - извлечение пользовательских полей
  - Добавлен метод `getTicketDetails()` в `DashboardSector1CService`

---

**Автор:** Технический писатель  
**Статус:** Завершена

