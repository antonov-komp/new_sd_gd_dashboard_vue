# TASK-023: Обновление карточки тикета - замена title на UF_SUBJECT и добавление кликабельной ссылки на iframe

**Дата создания:** 2025-12-11 10:47 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)

## Описание

Обновить компонент карточки тикета в канбан-сетке дашборда сектора 1С:
1. Заменить отображение поля `title` на пользовательское поле `UF_SUBJECT` из Bitrix24
2. Сделать всю карточку тикета кликабельной с переходом в iframe на страницу детальной информации о тикете в Bitrix24

## Контекст

В дашборде сектора 1С отображаются тикеты из смарт-процесса 140 (Сервис деск) в виде канбан-сетки. Карточка тикета в настоящее время отображает:
- ID тикета
- Title (название тикета)
- Два "чипа" (приоритет и статус)

Требуется:
- Заменить `title` на пользовательское поле `UF_SUBJECT` (как это делается для фильтрации по сектору через `UF_CRM_7_TYPE_PRODUCT`)
- Добавить возможность клика по карточке для открытия детальной информации о тикете в iframe Bitrix24

## Модули и компоненты

- `vue-app/src/components/dashboard/TicketCard.vue` — компонент карточки тикета (основной файл для изменений)
- `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js` — маппер тикетов (добавление UF_SUBJECT)
- `vue-app/src/services/dashboard-sector-1c/data/ticket-repository.js` — репозиторий тикетов (проверка получения UF_SUBJECT)
- `vue-app/src/services/dashboard-sector-1c/utils/constants.js` — константы (добавление константы для URL iframe)

## Зависимости

- Использует Bitrix24 REST API для получения данных тикетов
- Зависит от структуры данных, возвращаемых методом `crm.item.list`
- Требует наличия пользовательского поля `UF_SUBJECT` в смарт-процессе 140

## Ступенчатые подзадачи

### Этап 1: Анализ и подготовка

#### 1.1. Изучение текущей реализации
- Изучить компонент `TicketCard.vue` (строки 19-20, где отображается `ticket.title`)
- Изучить маппер `ticket-mapper.js` (строки 16-38, где происходит маппинг полей)
- Изучить фильтр `sector-filter.js` для понимания работы с пользовательскими полями `UF_*`

#### 1.2. Анализ структуры данных
- Проверить, какие поля возвращаются методом `crm.item.list` для смарт-процесса 140
- Убедиться, что поле `UF_SUBJECT` доступно в ответе API
- Изучить примеры обращения к пользовательским полям (как в `sector-filter.js` с `UF_CRM_7_TYPE_PRODUCT`)

#### 1.3. Анализ структуры URL iframe
- Изучить пример ссылки: `https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/`
- Определить паттерн: `{baseUrl}/page/{section}/servisdesk/type/{entityTypeId}/details/{ticketId}/`
- Где:
  - `baseUrl` — базовый URL Bitrix24 (например, `https://bitrix24.kompo.by`)
  - `section` — раздел (например, `servisdeskitotdel`)
  - `entityTypeId` — ID смарт-процесса (140)
  - `ticketId` — ID тикета (последние цифры в URL)

### Этап 2: Обновление маппера тикетов

#### 2.1. Добавление поддержки UF_SUBJECT в маппер
- Открыть файл `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js`
- В функции `mapTicket()` добавить извлечение поля `UF_SUBJECT` по аналогии с `UF_CRM_7_TYPE_PRODUCT`:
  ```javascript
  const ufSubject = bitrixTicket.UF_SUBJECT || 
                    bitrixTicket.uf_subject || 
                    bitrixTicket.ufSubject ||
                    bitrixTicket['UF_SUBJECT'] ||
                    bitrixTicket['uf_subject'] ||
                    null;
  ```

#### 2.2. Добавление поля в возвращаемый объект
- Добавить поле `ufSubject` в возвращаемый объект функции `mapTicket()`:
  ```javascript
  return {
    id: id,
    title: title,
    ufSubject: ufSubject, // Добавить новое поле
    // ... остальные поля
  };
  ```

#### 2.3. Проверка получения UF_SUBJECT из API
- Убедиться, что в `ticket-repository.js` или в сервисе загрузки тикетов поле `UF_SUBJECT` включено в `select` параметр запроса `crm.item.list`
- Если поле не запрашивается, добавить его в список полей для выборки

### Этап 3: Обновление компонента TicketCard

#### 3.1. Замена отображения title на UF_SUBJECT
- Открыть файл `vue-app/src/components/dashboard/TicketCard.vue`
- В шаблоне (строка 19-20) заменить:
  ```vue
  <!-- Было: -->
  <div class="ticket-title">
    {{ ticket.title }}
  </div>
  
  <!-- Стало: -->
  <div class="ticket-title">
    {{ ticket.ufSubject || ticket.title || 'Без названия' }}
  </div>
  ```
- Использовать fallback на `ticket.title` на случай, если `UF_SUBJECT` отсутствует

#### 3.2. Обновление JSDoc комментариев
- Обновить комментарии в компоненте, указав, что используется `ufSubject` вместо `title`
- Обновить описание пропа `ticket` в комментариях

### Этап 4: Реализация кликабельной ссылки на iframe

#### 4.1. Создание константы для URL iframe
- Открыть файл `vue-app/src/services/dashboard-sector-1c/utils/constants.js`
- Добавить константу для базового URL Bitrix24:
  ```javascript
  /**
   * Базовый URL Bitrix24 для создания ссылок на iframe
   */
  export const BITRIX24_BASE_URL = 'https://bitrix24.kompo.by';
  
  /**
   * Раздел сервис-деска в Bitrix24
   */
  export const SERVISDESK_SECTION = 'servisdeskitotdel';
  
  /**
   * ID смарт-процесса сектора 1С
   */
  export const ENTITY_TYPE_ID = 140;
  ```

#### 4.2. Создание функции генерации URL iframe
- В файле `constants.js` или в отдельном утилитарном файле создать функцию:
  ```javascript
  /**
   * Генерация URL для открытия тикета в iframe Bitrix24
   * 
   * @param {number} ticketId - ID тикета
   * @returns {string} URL для iframe
   * 
   * @example
   * getTicketIframeUrl(5025)
   * // 'https://bitrix24.kompo.by/page/servisdeskitotdel/servisdesk/type/140/details/5025/'
   */
  export function getTicketIframeUrl(ticketId) {
    return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
  }
  ```

#### 4.3. Обновление компонента TicketCard для обработки клика
- В компоненте `TicketCard.vue` импортировать функцию `getTicketIframeUrl`
- Добавить обработчик клика на карточку (уже есть `@click`, но нужно обновить логику)
- В функции `setup()` добавить метод для открытия iframe:
  ```javascript
  import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';
  
  const handleCardClick = (event) => {
    // Предотвращаем клик при перетаскивании
    if (event.target.closest('.ticket-card[draggable="true"]')) {
      return;
    }
    
    const iframeUrl = getTicketIframeUrl(props.ticket.id);
    
    // Использование BX.helper для открытия iframe (если доступен)
    if (typeof BX !== 'undefined' && BX.helper) {
      BX.helper.show(iframeUrl, {
        width: 1200,
        height: 800
      });
    } else {
      // Fallback: открытие в новом окне
      window.open(iframeUrl, '_blank');
    }
    
    emit('click', props.ticket);
  };
  ```

#### 4.4. Обновление обработчика клика в шаблоне
- Обновить обработчик `@click` в шаблоне:
  ```vue
  <div
    class="ticket-card"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
  ```

#### 4.5. Добавление визуальной индикации кликабельности
- Убедиться, что стили `.ticket-card` уже содержат `cursor: pointer` (строка 153)
- При необходимости добавить стили для hover-эффекта (уже есть, строка 158-161)

### Этап 5: Тестирование и проверка

#### 5.1. Проверка отображения UF_SUBJECT
- Запустить приложение и открыть дашборд сектора 1С
- Проверить, что в карточках тикетов отображается значение `UF_SUBJECT` вместо `title`
- Убедиться, что fallback на `title` работает, если `UF_SUBJECT` отсутствует
- Проверить отображение на разных этапах (Сформировано обращение, Рассмотрение ТЗ, Исполнение)

#### 5.2. Проверка кликабельности карточки
- Кликнуть по карточке тикета
- Проверить, что открывается iframe с детальной информацией о тикете
- Убедиться, что URL формируется корректно (проверить в консоли браузера)
- Проверить, что перетаскивание (drag & drop) всё ещё работает корректно

#### 5.3. Проверка совместимости
- Проверить работу в разных браузерах (Chrome, Firefox, Safari)
- Убедиться, что функционал работает как в облачной, так и в коробочной версии Bitrix24 (если применимо)
- Проверить работу на мобильных устройствах

#### 5.4. Проверка обработки ошибок
- Проверить поведение при отсутствии `UF_SUBJECT` (должен использоваться fallback на `title`)
- Проверить поведение при некорректном `ticketId` (должна быть обработка ошибки)
- Проверить поведение при недоступности Bitrix24 API

## API-методы Bitrix24

- `crm.item.list` — получение списка тикетов
  - Документация: https://context7.com/bitrix24/rest/crm.item.list
  - Параметры: `entityTypeId: 140`, `select: ['id', 'title', 'UF_SUBJECT', ...]`
  - Используется для получения данных тикетов, включая `UF_SUBJECT`

## Технические требования

- Vue.js 3.x (Composition API)
- Поддержка пользовательских полей Bitrix24 (UF_*)
- Использование BX.helper для открытия iframe (если доступен)
- Fallback на `window.open()` при отсутствии BX.helper
- Сохранение функциональности drag & drop

## Критерии приёмки

- [ ] В карточке тикета отображается `UF_SUBJECT` вместо `title`
- [ ] Если `UF_SUBJECT` отсутствует, используется fallback на `title`
- [ ] Вся карточка тикета кликабельна (кроме области перетаскивания)
- [ ] При клике открывается iframe с детальной информацией о тикете
- [ ] URL iframe формируется корректно по паттерну: `{baseUrl}/page/{section}/servisdesk/type/140/details/{ticketId}/`
- [ ] Функциональность drag & drop сохранена и работает корректно
- [ ] Код соответствует стандартам проекта (ESLint, комментарии)
- [ ] Обновлены JSDoc комментарии в компонентах
- [ ] Протестировано на разных браузерах и устройствах

## Примеры кода

### Пример маппинга UF_SUBJECT в ticket-mapper.js

```javascript
export function mapTicket(bitrixTicket) {
  // ... существующий код ...
  
  // Извлечение UF_SUBJECT (по аналогии с UF_CRM_7_TYPE_PRODUCT)
  const ufSubject = bitrixTicket.UF_SUBJECT || 
                    bitrixTicket.uf_subject || 
                    bitrixTicket.ufSubject ||
                    bitrixTicket['UF_SUBJECT'] ||
                    bitrixTicket['uf_subject'] ||
                    null;

  return {
    id: id,
    title: title,
    ufSubject: ufSubject, // Новое поле
    // ... остальные поля ...
  };
}
```

### Пример обновления компонента TicketCard.vue

```vue
<template>
  <div
    class="ticket-card"
    @click="handleCardClick"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
  >
    <!-- ... -->
    <div class="ticket-title">
      {{ ticket.ufSubject || ticket.title || 'Без названия' }}
    </div>
    <!-- ... -->
  </div>
</template>

<script>
import { getTicketIframeUrl } from '@/services/dashboard-sector-1c/utils/constants.js';

export default {
  // ...
  setup(props, { emit }) {
    const handleCardClick = (event) => {
      // Предотвращаем клик при перетаскивании
      if (event.target.closest('.ticket-card[draggable="true"]')) {
        return;
      }
      
      const iframeUrl = getTicketIframeUrl(props.ticket.id);
      
      if (typeof BX !== 'undefined' && BX.helper) {
        BX.helper.show(iframeUrl, {
          width: 1200,
          height: 800
        });
      } else {
        window.open(iframeUrl, '_blank');
      }
      
      emit('click', props.ticket);
    };
    
    // ... остальной код ...
  }
};
</script>
```

### Пример константы для URL iframe

```javascript
// vue-app/src/services/dashboard-sector-1c/utils/constants.js

export const BITRIX24_BASE_URL = 'https://bitrix24.kompo.by';
export const SERVISDESK_SECTION = 'servisdeskitotdel';
export const ENTITY_TYPE_ID = 140;

export function getTicketIframeUrl(ticketId) {
  return `${BITRIX24_BASE_URL}/page/${SERVISDESK_SECTION}/servisdesk/type/${ENTITY_TYPE_ID}/details/${ticketId}/`;
}
```

## Тестирование

### Шаги для тестирования:

1. **Проверка отображения UF_SUBJECT:**
   - Открыть дашборд сектора 1С
   - Проверить, что в карточках тикетов отображается значение из `UF_SUBJECT`
   - Проверить fallback на `title`, если `UF_SUBJECT` пустое

2. **Проверка кликабельности:**
   - Кликнуть по карточке тикета
   - Проверить, что открывается iframe с детальной информацией
   - Проверить корректность URL в iframe

3. **Проверка drag & drop:**
   - Перетащить тикет между этапами
   - Убедиться, что перетаскивание работает корректно
   - Проверить, что клик не срабатывает во время перетаскивания

4. **Проверка обработки ошибок:**
   - Проверить поведение при отсутствии `UF_SUBJECT`
   - Проверить поведение при некорректном `ticketId`

## История правок

- 2025-12-11 10:47 (UTC+3, Брест): Создана задача
- 2025-12-11 17:45 (UTC+3, Брест): Этап 2 выполнен — обновлён маппер `ticket-mapper.js`, добавлено поле `ufSubject`, подтверждён запрос `UF_SUBJECT` через `select: ['*']` и `useOriginalUfNames: 'Y'`
- 2025-12-11 18:00 (UTC+3, Брест): Этап 3 выполнен — обновлён компонент `TicketCard.vue`: заменено отображение `title` на `ufSubject || title`, добавлен обработчик `handleCardClick` для открытия iframe через `BX.helper` с fallback на `window.open()`, обновлены JSDoc комментарии. Добавлены константы `BITRIX24_BASE_URL`, `SERVISDESK_SECTION` и функция `getTicketIframeUrl()` в `constants.js`.
- 2025-12-11 18:10 (UTC+3, Брест): Этап 4 выполнен — кликабельная ссылка на iframe реализована в `TicketCard.vue` с использованием `getTicketIframeUrl`, `BX.helper.show` и fallback `window.open`; стили кликабельности сохранены.
- 2025-12-11 18:30 (UTC+3, Брест): Этап 6 (023-06) — добавлен флаг `DISABLE_TICKET_DRAG` (по умолчанию true) для глобального отключения drag & drop без удаления логики.
- 2025-12-11 18:40 (UTC+3, Брест): Финальная настройка открытия — принудительно в новой вкладке (`window.open`), SidePanel/overlay отключён по требованию; drag & drop отключён флагом.

