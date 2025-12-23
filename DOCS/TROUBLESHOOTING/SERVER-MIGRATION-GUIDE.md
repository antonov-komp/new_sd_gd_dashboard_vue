# Руководство по переезду на новый сервер

**Дата создания:** 2025-12-23 08:06 (UTC+3, Брест)  
**Версия:** 1.0  
**Описание:** Полное руководство по troubleshooting при переезде REST API приложения на новый сервер

---

## Обзор

Данный документ описывает все проблемы, возникающие при переезде приложения на новый сервер, и их решения. Используйте его как чек-лист при миграции.

---

## Проблема 1: Относительные пути к ресурсам (404 ошибки)

### Симптомы

При открытии модулей приложения в консоли браузера появляются ошибки 404:

```
GET https://back.kompo.by/dist/assets/DashboardSector1C-MLZIRZfD.js net::ERR_ABORTED 404 (Not Found)
GET https://back.kompo.by/dist/assets/priority-config-hNB5nkF_.js net::ERR_ABORTED 404 (Not Found)
GET https://back.kompo.by/dist/assets/DashboardSector1C-DHYjIGct.css net::ERR_ABORTED 404 (Not Found)
```

**Причина:** Пути к ресурсам генерируются без учёта базового пути приложения (`/rest_api_aps/sd_it_gen_plan`).

### Решение

#### Шаг 1: Изменение base в vite.config.js

**Файл:** `vue-app/vite.config.js`

**Было:**
```javascript
export default defineConfig({
  base: '/dist/',
  // ...
});
```

**Стало:**
```javascript
export default defineConfig({
  base: './', // Относительный путь для работы с любым базовым путем
  // ...
});
```

**Результат:** Vite генерирует относительные пути `./assets/...` вместо абсолютных `/dist/assets/...`.

#### Шаг 2: Добавление тега `<base>` в index.php

**Файл:** `index.php`

Добавлен тег `<base>` для автоматического разрешения относительных путей:

```php
<?php
// Определяем базовый путь для тега <base>
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
$basePath = dirname($scriptName);
if ($basePath === '.') {
    $basePath = '';
}
if ($basePath && $basePath[0] !== '/') {
    $basePath = '/' . $basePath;
}
// Добавляем /dist/ к базовому пути для правильного разрешения путей к ресурсам
$baseHref = $basePath . '/dist/';
?>
<base href="<?= htmlspecialchars($baseHref) ?>">
```

**Результат:** Все относительные пути (включая динамически загружаемые чанки) автоматически разрешаются относительно базового пути.

#### Шаг 3: Упрощение обработки путей

Пути в `index.php` теперь выводятся как есть, так как тег `<base>` обрабатывает их автоматически:

```php
if (!empty($scriptMatch[1])) {
    // Пути теперь относительные (./assets/...), тег <base> обработает их правильно
    echo '<script type="module" crossorigin src="' . htmlspecialchars($scriptMatch[1]) . '"></script>' . "\n";
}
```

### Проверка

После изменений все ресурсы должны загружаться корректно:
- Основной JS файл: `/rest_api_aps/sd_it_gen_plan/dist/assets/main-*.js`
- CSS файлы: `/rest_api_aps/sd_it_gen_plan/dist/assets/main-*.css`
- Динамически загружаемые чанки: `/rest_api_aps/sd_it_gen_plan/dist/assets/*.js`

---

## Проблема 2: Относительные пути в API запросах

### Симптомы

API запросы не работают, так как используют абсолютные пути без учёта базового пути приложения.

**Примеры проблемных путей:**
- `/api/bitrix24.php` → должно быть `/rest_api_aps/sd_it_gen_plan/api/bitrix24.php`
- `/api/webhook-logs.php` → должно быть `/rest_api_aps/sd_it_gen_plan/api/webhook-logs.php`
- `/install.php` → должно быть `/rest_api_aps/sd_it_gen_plan/install.php`

### Решение

#### Шаг 1: Создание утилиты для работы с путями

**Файл:** `vue-app/src/utils/path-utils.js`

Создана утилита для автоматического определения базового пути:

```javascript
/**
 * Получить базовый путь приложения
 * 
 * Определяется автоматически на основе текущего пути страницы.
 * Например, если страница: /rest_api_aps/sd_it_gen_plan/index.php
 * то базовый путь будет: /rest_api_aps/sd_it_gen_plan
 */
export function getBasePath() {
  const path = window.location.pathname;
  
  // Если путь заканчивается на index.php или install.php, убираем имя файла
  if (path.endsWith('index.php') || path.endsWith('install.php')) {
    return path.substring(0, path.lastIndexOf('/'));
  }
  
  // Если путь заканчивается на /, убираем последний слэш
  if (path.endsWith('/')) {
    return path.substring(0, path.length - 1);
  }
  
  // Иначе возвращаем путь до последнего слэша
  return path.substring(0, path.lastIndexOf('/'));
}

/**
 * Получить полный URL для API endpoint
 */
export function getApiUrl(endpoint) {
  const basePath = getBasePath();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
  return `${basePath}/${cleanEndpoint}`;
}

/**
 * Получить полный URL для страницы
 */
export function getPageUrl(page) {
  const basePath = getBasePath();
  const cleanPage = page.startsWith('/') ? page.substring(1) : page;
  return `${basePath}/${cleanPage}`;
}
```

#### Шаг 2: Обновление всех сервисов API

**Обновлённые файлы:**

1. **`vue-app/src/services/bitrix24-api.js`**
   ```javascript
   import { getApiUrl as getApiUrlUtil } from '@/utils/path-utils.js';
   
   static getApiUrl() {
     return getApiUrlUtil('/api/bitrix24.php');
   }
   ```

2. **`vue-app/src/services/webhook-logs-api.js`**
   ```javascript
   import { getApiUrl } from '@/utils/path-utils.js';
   
   static getBaseUrl() {
     return getApiUrl('/api/webhook-logs.php');
   }
   ```

3. **`vue-app/src/services/tickets-time-tracking/timeTrackingService.js`**
   ```javascript
   import { getApiUrl } from '@/utils/path-utils.js';
   
   const endpoint = getApiUrl(DEFAULT_ENDPOINT);
   const response = await fetch(endpoint, { ... });
   ```

4. **`vue-app/src/services/graph-admission-closure/admissionClosureService.js`**
   ```javascript
   import { getApiUrl } from '@/utils/path-utils.js';
   
   const fullEndpoint = getApiUrl(endpoint);
   const response = await fetch(fullEndpoint, { ... });
   ```

5. **`vue-app/src/services/graph-state/SnapshotService.js`**
   ```javascript
   import { getBasePath } from '@/utils/path-utils.js';
   
   static getApiBaseUrl() {
     if (snapshotConfig.apiBaseUrl) {
       return snapshotConfig.apiBaseUrl;
     }
     return getBasePath();
   }
   ```

#### Шаг 3: Обновление компонентов

**Обновлённые файлы:**

1. **`vue-app/src/components/IndexPage.vue`**
   ```javascript
   import { getPageUrl } from '@/utils/path-utils.js';
   
   const installPageUrl = computed(() => {
     return getPageUrl('/install.php');
   });
   ```

2. **`vue-app/src/components/InstallPage.vue`**
   ```javascript
   import { getPageUrl } from '@/utils/path-utils.js';
   
   const installUrl = getPageUrl('/install.php');
   const response = await fetch(`${installUrl}?get_result=1`);
   ```

3. **`vue-app/src/main.js`**
   ```javascript
   import { getApiUrl } from '@/utils/path-utils.js';
   
   BX.ajax({
     url: getApiUrl('/api/log-error.php'),
     // ...
   });
   ```

4. **`vue-app/src/pages/WebhookLogsPage.vue`**
   ```javascript
   import { getApiUrl } from '@/utils/path-utils.js';
   
   useRealtime(getApiUrl('/api/webhook-realtime.php'), { ... });
   ```

### Проверка

Все API запросы должны работать корректно:
- ✅ Запросы к `/api/bitrix24.php` → `/rest_api_aps/sd_it_gen_plan/api/bitrix24.php`
- ✅ Запросы к `/api/webhook-logs.php` → `/rest_api_aps/sd_it_gen_plan/api/webhook-logs.php`
- ✅ Ссылки на `/install.php` → `/rest_api_aps/sd_it_gen_plan/install.php`

---

## Проблема 3: Поломка верстки при открытии модулей

### Симптомы

При открытии модуля "Дашборд сектора 1С" ломается структура и верстка:
- Элементы наезжают друг на друга
- Кнопки не отображаются корректно
- Grid-структура переполняется

### Решение

#### Шаг 1: Исправление глобального сброса стилей

**Файл:** `vue-app/src/styles/main.css`

**Было:**
```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
```

**Стало:**
```css
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Сброс margin и padding только для основных элементов, не для всех */
body,
h1, h2, h3, h4, h5, h6,
p, ul, ol, li,
figure, figcaption,
blockquote, dl, dd {
  margin: 0;
  padding: 0;
}
```

**Результат:** Сброс стилей применяется только к основным элементам, не ломая структуру компонентов.

#### Шаг 2: Устранение конфликта фона

**Файл:** `vue-app/src/App.vue`

**Было:**
```css
#app {
  min-height: 100vh;
  background: #f5f5f5;
}
```

**Стало:**
```css
#app {
  min-height: 100vh;
  width: 100%;
  position: relative;
}

/* Убираем дублирование фона - компоненты сами управляют своим фоном */
```

**Результат:** Компоненты сами управляют своим фоном, нет конфликтов.

#### Шаг 3: Улучшение структуры DashboardSector1C

**Файл:** `vue-app/src/components/dashboard/DashboardSector1C.vue`

**Добавлено:**

1. **Предотвращение переполнения:**
   ```css
   .dashboard-sector-1c {
     padding: 20px;
     background: #f5f5f5;
     min-height: 100vh;
     width: 100%;
     position: relative;
     overflow-x: auto; /* Предотвращаем горизонтальный скролл */
   }
   ```

2. **Улучшение заголовка:**
   ```css
   .dashboard-header {
     display: flex;
     align-items: center;
     gap: 15px;
     flex-wrap: wrap; /* Позволяет кнопкам переноситься */
     width: 100%;
   }
   
   .header-actions {
     display: flex;
     gap: 10px;
     align-items: center;
     flex-wrap: wrap; /* Позволяет кнопкам переноситься */
     flex-shrink: 0;
   }
   ```

3. **Исправление grid-структуры:**
   ```css
   .stages-container {
     display: grid;
     grid-template-columns: repeat(3, 1fr);
     gap: 20px;
     width: 100%;
     min-width: 0; /* Предотвращает переполнение grid */
   }
   
   .stages-container > * {
     min-width: 0; /* Позволяет элементам сжиматься */
   }
   ```

4. **Улучшение адаптивности:**
   ```css
   @media (max-width: 768px) {
     .dashboard-header {
       flex-direction: column;
       align-items: flex-start;
     }
     
     .dashboard-header h1 {
       width: 100%;
       margin-bottom: 10px;
     }
     
     .header-actions {
       width: 100%;
       justify-content: flex-start;
     }
   }
   ```

### Проверка

Верстка должна работать корректно:
- ✅ Элементы не наезжают друг на друга
- ✅ Кнопки отображаются правильно
- ✅ Grid-структура не переполняется
- ✅ Адаптивность работает на всех устройствах

---

## Чек-лист при переезде на новый сервер

### Перед переездом

- [ ] Создать резервную копию всех файлов
- [ ] Экспортировать настройки (settings.json, .env файлы)
- [ ] Задокументировать текущую конфигурацию сервера

### После переезда

#### 1. Проверка путей к ресурсам

- [ ] Проверить, что `vite.config.js` использует `base: './'`
- [ ] Проверить, что `index.php` содержит тег `<base>`
- [ ] Пересобрать приложение: `npm run build` в `vue-app/`
- [ ] Проверить в консоли браузера отсутствие ошибок 404

#### 2. Проверка API запросов

- [ ] Проверить, что все сервисы используют `path-utils.js`
- [ ] Проверить работу API endpoints:
  - [ ] `/api/bitrix24.php`
  - [ ] `/api/webhook-logs.php`
  - [ ] `/api/tickets-time-tracking-sector-1c.php`
  - [ ] `/api/graph-1c-admission-closure.php`
  - [ ] `/api/snapshots.php`

#### 3. Проверка верстки

- [ ] Открыть модуль "Дашборд сектора 1С"
- [ ] Проверить, что верстка не ломается
- [ ] Проверить адаптивность на разных устройствах
- [ ] Проверить работу всех кнопок и элементов

#### 4. Проверка функциональности

- [ ] Проверить работу всех 4 активных модулей:
  - [ ] Дашборд сектора 1С
  - [ ] График состояния
  - [ ] График приёма/закрытий 1С
  - [ ] Трудозатраты на Тикеты сектора 1С
- [ ] Проверить работу администраторских интерфейсов
- [ ] Проверить работу вебхуков

### Файлы, которые нужно проверить/обновить

1. **Конфигурация сборки:**
   - `vue-app/vite.config.js` - должен содержать `base: './'`

2. **Точка входа:**
   - `index.php` - должен содержать тег `<base>`

3. **Утилиты:**
   - `vue-app/src/utils/path-utils.js` - должен существовать и работать

4. **Сервисы API:**
   - `vue-app/src/services/bitrix24-api.js`
   - `vue-app/src/services/webhook-logs-api.js`
   - `vue-app/src/services/tickets-time-tracking/timeTrackingService.js`
   - `vue-app/src/services/graph-admission-closure/admissionClosureService.js`
   - `vue-app/src/services/graph-state/SnapshotService.js`

5. **Компоненты:**
   - `vue-app/src/components/IndexPage.vue`
   - `vue-app/src/components/InstallPage.vue`
   - `vue-app/src/main.js`
   - `vue-app/src/pages/WebhookLogsPage.vue`

6. **Стили:**
   - `vue-app/src/styles/main.css`
   - `vue-app/src/App.vue`
   - `vue-app/src/components/dashboard/DashboardSector1C.vue`

---

## Команды для быстрого исправления

### Пересборка приложения

```bash
cd /var/www/app/public/rest_api_aps/sd_it_gen_plan/vue-app
npm run build
```

### Проверка путей в браузере

Откройте консоль браузера (F12) и проверьте:
- Нет ошибок 404 для ресурсов
- Все пути начинаются с правильного базового пути
- API запросы идут на правильные endpoints

### Проверка структуры файлов

```bash
# Проверка наличия утилиты
ls -la vue-app/src/utils/path-utils.js

# Проверка наличия тега <base> в index.php
grep -n "<base" index.php

# Проверка base в vite.config.js
grep -n "base:" vue-app/vite.config.js
```

---

## Часто задаваемые вопросы

### Q: Почему пути начинаются с `/dist/` вместо базового пути?

**A:** Это происходит, если в `vite.config.js` установлен `base: '/dist/'`. Измените на `base: './'` и пересоберите приложение.

### Q: Почему API запросы идут на неправильные пути?

**A:** Убедитесь, что все сервисы используют `path-utils.js` для получения путей. Проверьте импорты в файлах сервисов.

### Q: Почему верстка ломается при открытии модуля?

**A:** Проверьте:
1. Глобальный сброс стилей в `main.css` не применяется ко всем элементам
2. Нет конфликта фона между `App.vue` и компонентами
3. Grid-структура имеет `min-width: 0` для предотвращения переполнения

### Q: Как проверить, что всё работает правильно?

**A:** Используйте чек-лист выше. Основные индикаторы:
- Нет ошибок 404 в консоли браузера
- Все модули открываются без поломки верстки
- API запросы возвращают данные
- Все кнопки и элементы работают корректно

---

## История изменений

- **2025-12-23 08:06 (UTC+3, Брест):** Создан документ с описанием всех проблем и решений при переезде на новый сервер

---

## Связанные документы

- `DOCS/ARCHITECTURE/tech-stack.md` - Технологический стек проекта
- `DOCS/DEPLOYMENT/` - Документация по развёртыванию
- `DOCS/TROUBLESHOOTING/TASK-060-cors-user-current-chrome.md` - Решение проблемы CORS

---

**Автор:** Системный администратор / Bitrix24 Программист  
**Последнее обновление:** 2025-12-23 08:06 (UTC+3, Брест)


