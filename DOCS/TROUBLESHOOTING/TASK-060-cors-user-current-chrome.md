# TASK-060: Анализ проблемы CORS с user.current.json в Google Chrome

**Дата создания:** 2025-12-18 16:10 (UTC+3, Брест)  
**Статус:** Реализация завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)

---

## Описание проблемы

### Симптомы

При открытии приложения в **Google Chrome** на домене `https://back.antonov-mark.ru` возникает ошибка CORS:

```
Access to XMLHttpRequest at 'https://bitrix24.kompo.by/rest/user.current.json' 
from origin 'https://back.antonov-mark.ru' has been blocked by CORS policy: 
Permission was denied for this request to access the `unknown` address space.

v1/:1039 Uncaught Query error!
/rest/user.current.json:1 Failed to load resource: net::ERR_FAILED
```

### Контекст

- **Домен приложения:** `https://back.antonov-mark.ru`
- **Домен Bitrix24:** `https://bitrix24.kompo.by`
- **Браузер:** Google Chrome (проблема проявляется только в Chrome)
- **Место возникновения:** При инициализации приложения, когда проверяются права доступа пользователя

---

## Анализ проблемы

### 1. Точка возникновения ошибки

Ошибка возникает в самом начале работы приложения, когда:

1. **Роутер Vue.js** проверяет права доступа через `AccessControlService.checkAccess()`
2. **AccessControlService** вызывает `Bitrix24BxApi.getCurrentUser()`
3. **Bitrix24BxApi** использует `BX24.callMethod('user.current')`
4. **BX24 API скрипт** (`//api.bitrix24.com/api/v1/`) пытается определить контекст Bitrix24
5. **Проблема:** BX24 API делает прямой запрос к `https://bitrix24.kompo.by/rest/user.current.json`

### 2. Почему это происходит

**Причина:** Приложение работает **вне Bitrix24 iframe** (на отдельном домене), но скрипт Bitrix24 API (`//api.bitrix24.com/api/v1/`) пытается автоматически определить контекст Bitrix24 и делает прямой HTTP-запрос к REST API.

**Цепочка вызовов:**

```
router.beforeEach() 
  → AccessControlService.checkAccess()
    → Bitrix24BxApi.init()
      → BX24.init()
        → [Внутренний код BX24 API]
          → Прямой запрос к https://bitrix24.kompo.by/rest/user.current.json ❌
```

### 3. Почему только в Chrome

Chrome имеет более строгую политику CORS и блокирует запросы к "unknown address space" (приватные IP-адреса или домены, которые не могут быть определены как публичные).

**Документация Chrome CORS:**
- Chrome блокирует запросы к приватным адресным пространствам
- Ошибка "unknown address space" означает, что Chrome не может определить, является ли домен публичным

### 4. Текущая реализация

**Файл:** `vue-app/src/services/bitrix24-bx-api.js`

```javascript
static async getCurrentUser() {
  return this.callMethod('user.current', {});
}
```

**Файл:** `vue-app/src/services/access-control-service.js`

```javascript
static async checkAccess() {
  try {
    // Инициализация Bitrix24 API
    await Bitrix24BxApi.init();
    
    // Получение информации о текущем пользователе
    const user = await Bitrix24BxApi.getCurrentUser();
    // ...
  }
}
```

**Файл:** `vue-app/src/router/index.js`

```javascript
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      const accessResult = await AccessControlService.checkAccess();
      // ...
    }
  }
});
```

---

## Решение проблемы

### Вариант 1: Определение контекста и использование прокси (Рекомендуется)

**Принцип:** Определить, работает ли приложение внутри Bitrix24 iframe или нет. Если нет — использовать прокси API через Laravel backend.

#### Шаг 1: Создать утилиту для определения контекста

**Файл:** `vue-app/src/utils/bitrix24-context.js`

```javascript
/**
 * Утилиты для определения контекста работы с Bitrix24
 * 
 * Определяет, работает ли приложение внутри Bitrix24 iframe или как standalone
 */

/**
 * Проверка, работает ли приложение внутри Bitrix24 iframe
 * 
 * @returns {boolean} true, если приложение работает внутри Bitrix24
 */
export function isInsideBitrix24() {
  try {
    // Проверка 1: Наличие BX24 API
    if (typeof BX24 === 'undefined') {
      return false;
    }
    
    // Проверка 2: Наличие window.parent (iframe)
    if (window.self === window.top) {
      // Не в iframe
      return false;
    }
    
    // Проверка 3: Попытка доступа к window.parent (может быть заблокирован CORS)
    try {
      // Если можем получить доступ к parent, скорее всего мы в iframe
      const parentOrigin = window.parent.location.origin;
      // Проверяем, что parent — это Bitrix24
      return parentOrigin.includes('bitrix24') || parentOrigin.includes('kompo.by');
    } catch (e) {
      // CORS блокирует доступ — значит мы не в iframe Bitrix24
      return false;
    }
  } catch (error) {
    console.warn('Error checking Bitrix24 context:', error);
    return false;
  }
}

/**
 * Проверка доступности BX24 API
 * 
 * @returns {boolean} true, если BX24 API доступен
 */
export function isBX24Available() {
  return typeof BX24 !== 'undefined';
}
```

#### Шаг 2: Обновить Bitrix24BxApi для поддержки fallback

**Файл:** `vue-app/src/services/bitrix24-bx-api.js`

```javascript
import { isInsideBitrix24, isBX24Available } from '@/utils/bitrix24-context.js';
import { Bitrix24ApiService } from './bitrix24-api.js';

export class Bitrix24BxApi {
  // ... существующий код ...

  /**
   * Получение информации о текущем пользователе
   * 
   * Метод: user.current
   * 
   * Использует BX24.callMethod если доступен, иначе прокси через Bitrix24ApiService
   * 
   * @returns {Promise<object>} Информация о пользователе
   */
  static async getCurrentUser() {
    // Проверяем, можем ли использовать BX24 API
    if (isInsideBitrix24() && isBX24Available()) {
      try {
        // Используем BX24 API (работает внутри Bitrix24)
        return await this.callMethod('user.current', {});
      } catch (error) {
        console.warn('BX24.callMethod failed, falling back to proxy:', error);
        // Fallback на прокси
        return await Bitrix24ApiService.call('user.current', {});
      }
    } else {
      // Используем прокси через Laravel backend
      return await Bitrix24ApiService.call('user.current', {});
    }
  }

  /**
   * Инициализация Bitrix24 API
   * 
   * @param {function} callback - Функция обратного вызова после инициализации
   * @returns {Promise<void>}
   */
  static init(callback) {
    return new Promise((resolve, reject) => {
      // Если мы не внутри Bitrix24, не пытаемся инициализировать BX24
      if (!isInsideBitrix24()) {
        console.log('Not inside Bitrix24, skipping BX24.init()');
        if (callback) {
          callback();
        }
        resolve();
        return;
      }

      if (typeof BX24 === 'undefined') {
        // Если BX24 недоступен, но мы думаем что внутри Bitrix24 — это ошибка
        reject(new Error('Bitrix24 API not loaded. Make sure script is included: //api.bitrix24.com/api/v1/'));
        return;
      }

      BX24.init(() => {
        if (callback) {
          callback();
        }
        resolve();
      });
    });
  }
}
```

#### Шаг 3: Обновить AccessControlService для обработки ошибок

**Файл:** `vue-app/src/services/access-control-service.js`

```javascript
import { isInsideBitrix24 } from '@/utils/bitrix24-context.js';

export class AccessControlService {
  /**
   * Проверка доступа текущего пользователя
   * 
   * @returns {Promise<AccessCheckResult>} Результат проверки доступа
   */
  static async checkAccess() {
    try {
      // Инициализация Bitrix24 API (только если внутри Bitrix24)
      if (isInsideBitrix24()) {
        await Bitrix24BxApi.init();
      }
      
      // Получение информации о текущем пользователе
      // Автоматически использует правильный метод (BX24 или прокси)
      const user = await Bitrix24BxApi.getCurrentUser();
      
      // ... остальной код проверки доступа ...
    } catch (error) {
      console.error('AccessControlService.checkAccess error:', error);
      
      // Обработка CORS ошибок
      if (error.message && (
        error.message.includes('CORS') || 
        error.message.includes('blocked') ||
        error.message.includes('ERR_FAILED')
      )) {
        // Пытаемся использовать прокси как fallback
        try {
          const { Bitrix24ApiService } = await import('./bitrix24-api.js');
          const user = await Bitrix24ApiService.call('user.current', {});
          
          if (!user || !user.ID) {
            return new AccessCheckResult(
              false,
              AccessErrorCodes.USER_NOT_DETERMINED,
              'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
            );
          }
          
          // Продолжаем проверку доступа с полученным пользователем
          const departmentIds = user.UF_DEPARTMENT || [];
          // ... остальная логика проверки ...
        } catch (fallbackError) {
          console.error('Fallback to proxy also failed:', fallbackError);
          return new AccessCheckResult(
            false,
            AccessErrorCodes.API_ERROR,
            'Ошибка при проверке доступа. Обратитесь в Поддержку приложения в ИТ отдел.'
          );
        }
      }
      
      // ... остальная обработка ошибок ...
    }
  }
}
```

### Вариант 2: Условная загрузка BX24 API скрипта

**Принцип:** Загружать скрипт Bitrix24 API только если приложение работает внутри Bitrix24.

**Файл:** `index.php`

```php
<?php
require_once(__DIR__ . '/crest.php');

// Определяем, работает ли приложение внутри Bitrix24
$isInsideBitrix24 = false;

// Проверка через Referer или другие заголовки
if (isset($_SERVER['HTTP_REFERER'])) {
    $referer = $_SERVER['HTTP_REFERER'];
    if (strpos($referer, 'bitrix24') !== false || strpos($referer, 'kompo.by') !== false) {
        $isInsideBitrix24 = true;
    }
}

// Проверка через query параметр (если передаётся из Bitrix24)
if (isset($_GET['DOMAIN']) || isset($_GET['AUTH_ID'])) {
    $isInsideBitrix24 = true;
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitrix24 REST Application</title>
    <?php if ($isInsideBitrix24): ?>
        <!-- Загружаем Bitrix24 API только если внутри Bitrix24 -->
        <script src="//api.bitrix24.com/api/v1/"></script>
    <?php endif; ?>
    <!-- ... остальной код ... -->
</head>
```

**Недостаток:** Не всегда можно определить контекст на сервере.

---

## Рекомендуемое решение

**Использовать Вариант 1** с определением контекста на клиенте и автоматическим fallback на прокси API.

### Преимущества:

1. ✅ Работает в любом контексте (внутри Bitrix24 и standalone)
2. ✅ Автоматический fallback при ошибках
3. ✅ Не требует изменений на сервере
4. ✅ Совместимо с существующим кодом

### Недостатки:

1. ⚠️ Требует создания утилиты для определения контекста
2. ⚠️ Нужно обновить несколько файлов

---

## План реализации

### Этап 1: Создание утилиты определения контекста

- [x] Создать файл `vue-app/src/utils/bitrix24-context.js`
- [x] Реализовать функцию `isInsideBitrix24()`
- [x] Реализовать функцию `isBX24Available()`
- [ ] Добавить тесты для проверки работы (опционально)

### Этап 2: Обновление Bitrix24BxApi

- [x] Добавить импорт утилиты контекста
- [x] Обновить метод `getCurrentUser()` с fallback на прокси
- [x] Обновить метод `init()` для пропуска инициализации вне Bitrix24
- [x] Добавить обработку ошибок

### Этап 3: Обновление AccessControlService

- [x] Добавить проверку контекста перед инициализацией
- [x] Добавить обработку CORS ошибок
- [x] Добавить fallback на прокси API при ошибках

### Этап 4: Тестирование

- [ ] Протестировать внутри Bitrix24 iframe
- [ ] Протестировать как standalone приложение
- [ ] Протестировать в Chrome
- [ ] Протестировать в других браузерах

---

## Критерии приёмки

- [ ] Приложение работает в Chrome без ошибок CORS
- [ ] Приложение работает внутри Bitrix24 iframe (использует BX24 API)
- [ ] Приложение работает как standalone (использует прокси API)
- [ ] Автоматический fallback на прокси при ошибках BX24 API
- [ ] Нет ошибок в консоли браузера
- [ ] Проверка доступа пользователя работает корректно

---

## Дополнительная информация

### Ссылки на документацию

- **Bitrix24 BX24 API:** https://dev.1c-bitrix.ru/rest_help/js_library/index.php
- **Chrome CORS Policy:** https://developer.chrome.com/blog/private-network-access-update/
- **CORS в браузерах:** https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

### Связанные задачи

- **TASK-002:** Создание AccessControlService
- **TASK-022:** Диагностика и админ-доступ

---

## История правок

- **2025-12-18 16:10 (UTC+3, Брест):** Создан документ с анализом проблемы CORS в Chrome
- **2025-12-19 13:12 (UTC+3, Брест):** Реализовано решение проблемы CORS:
  - Создана утилита `bitrix24-context.js` для определения контекста работы с Bitrix24
  - Обновлён `Bitrix24BxApi` для поддержки автоматического fallback на прокси API
  - Обновлён `AccessControlService` для обработки CORS ошибок с fallback на прокси
  - Реализован автоматический выбор метода работы с API (BX24.* или прокси через Laravel)

