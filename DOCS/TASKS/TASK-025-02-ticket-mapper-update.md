# TASK-025-02: Этап 2 — Обновление маппера тикетов для UF_CRM_7_UF_PRIORITY

**Дата создания:** 2025-12-11 14:47 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-025  

## Цель этапа

Интегрировать конфигурацию приоритетов (из `priority-config.js`) в маппер тикетов, извлекая значение из пользовательского поля Bitrix24 `UF_CRM_7_UF_PRIORITY`, нормализуя его и передавая в компоненты в унифицированном формате (id, label, цвета). Обеспечить обратную совместимость и корректный fallback для пустых/неизвестных значений.

## Контекст

- Источник данных: Bitrix24 `crm.item.list` по смарт-процессу 140 (с `useOriginalUfNames: 'Y'`), поле `UF_CRM_7_UF_PRIORITY` (текст).  
- Конфиг приоритетов создаётся на этапе 25-01 в `vue-app/src/config/priority-config.js`.  
- Текущий маппер: `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js` (mapPriority сейчас работает с числовыми кодами 1/2/3).  
- Нужно заменить маппинг на работу с текстовыми значениями и использовать конфиг.

---

## Область работ этапа

1) Обновить извлечение поля приоритета из объекта Bitrix24 (UF-имена в разных регистрах).  
2) Интегрировать конфиг приоритетов: получение объекта приоритета по значению Bitrix24.  
3) Вернуть в DTO тикета нормализованное поле приоритета (id, label, цвета).  
4) Добавить fallback для пустых/неизвестных значений и логирование в dev-режиме.  
5) Обеспечить обратный маппинг (при сохранении/обновлении) на текстовое значение Bitrix24.  
6) Покрыть тест-кейсами/чек-листом маппинг и fallback.

---

## Детальный план (шаги)

### Шаг 1. Анализ существующего маппера
- Файл: `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js`.
- Текущие функции: `mapTicket`, `mapPriority`, `mapPriorityToBitrix`, `mapStatus`.
- Сейчас `mapPriority` использует числовые коды (1/2/3) из `PRIORITY_MAPPING` в `constants.js`.
- Входные поля: `priority || PRIORITY` (нет UF-поля).

### Шаг 2. Извлечение UF_CRM_7_UF_PRIORITY
- Добавить чтение всех вариантов имён поля (паттерн как для UF_SUBJECT в TASK-023):  
  - `bitrixTicket.UF_CRM_7_UF_PRIORITY`  
  - `bitrixTicket.uf_crm_7_uf_priority`  
  - `bitrixTicket.ufCrm7UfPriority`  
  - `bitrixTicket['UF_CRM_7_UF_PRIORITY']`  
  - `bitrixTicket['uf_crm_7_uf_priority']`
- Нормализовать значение: `String(value).trim()`; если пусто — null.

### Шаг 3. Интеграция с priority-config
- Импортировать утилиты: `getPriorityByBitrixValue`, `getPriorityById`, `DEFAULT_PRIORITY_ID`.
- В `mapTicket` вернуть поле `priority` как объект или как id?  
  - Рекомендуется возвращать **id + label + цвета**:  
    ```js
    const priorityObj = getPriorityByBitrixValue(ufPriorityValue);
    return {
      ...,
      priorityId: priorityObj.id,
      priorityLabel: priorityObj.label,
      priorityColors: {
        color: priorityObj.color,
        backgroundColor: priorityObj.backgroundColor,
        textColor: priorityObj.textColor
      },
      // при необходимости: priority (legacy) = priorityObj.id
    };
    ```
  - Для совместимости можно оставить `priority: priorityObj.id` (до миграции компонентов).

### Шаг 4. Обратный маппинг (сохранение/обновление)
- Обновить `mapPriorityToBitrix` для работы с id/bitrixValue:  
  - Принимает `priorityId` (или объект).  
  - Возвращает `priorityObj.bitrixValue || null`.  
  - Fallback: `DEFAULT_PRIORITY_ID`.
- Проверить места вызова `mapPriorityToBitrix` (создание/обновление тикетов).

### Шаг 5. Логирование и fallback
- Если значение не найдено в конфиге:
  - В dev: `console.warn('[priority] Unknown UF_CRM_7_UF_PRIORITY value', value)`.
  - В прод: тихий fallback на `DEFAULT_PRIORITY_ID`.
- Если значение пустое/null — сразу fallback.

### Шаг 6. Обновление типов/DTO
- Обновить `ticket-types.js` (если есть описание) — добавить поля `priorityId`, `priorityLabel`, `priorityColors`.
- Обновить JSDoc в `ticket-mapper.js`.
- Обновить тестовые данные (если есть snapshot/fixtures).

### Шаг 7. Минимальный рефактор констант
- В `utils/constants.js` оставить старые маппинги нетронутыми (для обратной совместимости) — но добавить комментарий, что новая логика в `priority-config.js`.
- Не удалять старые функции до обновления компонентов (этап 25-03).

### Шаг 8. Чек-лист тестов маппера
- Кейс: каждое из 7 известных значений → корректный id/label/цвета.  
- Кейс: значение в другом регистре → нормализуется.  
- Кейс: пустое значение → fallback `unknown`.  
- Кейс: неизвестное значение → fallback + предупреждение в dev.  
- Кейс: обратный маппинг `priorityId` → `bitrixValue` корректен.  
- Кейс: backward compatibility (`priority` числом не ломает рантайм, если где-то останется).

---

## Артефакты этапа

- Обновлён `vue-app/src/services/dashboard-sector-1c/mappers/ticket-mapper.js`.
- Обновлён `vue-app/src/services/dashboard-sector-1c/types/ticket-types.js` (при необходимости).
- Комментарии/JSDoc с ссылками на Bitrix24 REST `crm.item.list` (https://context7.com/bitrix24/rest/crm.item.list).

---

## Критерии приёмки этапа

- [ ] Маппер читает `UF_CRM_7_UF_PRIORITY` во всех вариантах регистра/кейса.  
- [ ] Приоритет маппится через `priority-config.js`, возвращая id/label/цвета.  
- [ ] Пустые и неизвестные значения уходят в fallback без ошибок рантайма.  
- [ ] Обратный маппинг (на Bitrix24) возвращает текстовое значение приоритета.  
- [ ] Добавлено логирование неизвестных значений в dev.  
- [ ] JSDoc/типы обновлены, ссылки на Bitrix24 REST указаны.  
- [ ] Регрессия: старый код не падает (при необходимости сохранён `priority: id`).

---

## Риски и допущения

- Возможны новые значения в `UF_CRM_7_UF_PRIORITY` → закрыто fallback-логикой.  
- Поле может отсутствовать в `select` — нужно убедиться, что `crm.item.list` запрашивает `'*'` или добавить явно (контроль в репозитории данных).  
- Цвета окончательно проверяются на этапе UI (25-03).  
- Приоритет возвращаем как id/label/цвета — компоненты надо будет обновить в 25-03.

---

## Следующие шаги после этапа

- Этап 25-03: обновить `TicketCard.vue` и другие компоненты для использования нового формата приоритета (id/label/цвета).  
- Этап 25-04: единая обработка неизвестных значений в UI.  
- Этап 25-05: финальное тестирование и регрессия.  

