# Анализ работы попапов в модуле "График приема и закрытий сектора 1С"

**Дата создания:** 2025-12-23 20:28 (UTC+3, Брест)  
**Версия:** 1.0  
**Автор:** Технический писатель  
**Статус:** Актуально

---

## Оглавление

1. [Обзор попапов](#обзор-попапов)
2. [Структура данных на главной странице](#структура-данных-на-главной-странице)
3. [Механизм загрузки данных](#механизм-загрузки-данных)
4. [Работа попапов для текущей недели](#работа-попапов-для-текущей-недели)
5. [Работа попапов для предыдущей недели](#работа-попапов-для-предыдущей-недели)
6. [Детальный анализ загрузки данных](#детальный-анализ-загрузки-данных)
7. [Выводы и рекомендации](#выводы-и-рекомендации)

---

## Обзор попапов

### Типы попапов

В модуле "График приема и закрытий сектора 1С" используются три типа попапов:

1. **ResponsibleModal** — попап с разбивкой закрытых тикетов по ответственным сотрудникам
2. **StagesModal** — попап с разбивкой новых тикетов по стадиям
3. **CarryoverDurationModal** — попап с разбивкой переходящих тикетов по срокам

### Где открываются попапы

Попапы открываются при клике на summary-карточки в двух блоках:

- **Блок "Текущая неделя"** — попапы открываются с данными текущей недели
- **Блок "Предыдущая неделя"** — попапы открываются с данными предыдущей недели

---

## Структура данных на главной странице

### Два ряда цифр

На главной странице модуля отображаются два блока с метриками:

#### 1. Блок "Текущая неделя"

**Источник данных:** `currentWeekData` (computed-свойство в `GraphAdmissionClosureChart.vue`)

**Приоритет получения данных:**
1. `props.data.series[последний]` — последний элемент из массива series
2. `props.data.currentWeek` — данные текущей недели из API
3. `props.data.weeksData[последний]` — последний элемент из weeksData
4. Fallback на прямые данные из `props.data`

**Отображаемые метрики:**
- Новые за неделю (`newTickets`)
- Закрытые за неделю (`closedTickets`) с разбивкой:
  - Созданные этой неделей (`closedTicketsCreatedThisWeek`)
  - Созданные другой неделей (`closedTicketsCreatedOtherWeek`)
- Переходящие (`carryoverTickets`) с разбивкой:
  - Созданные этой недели (`carryoverTicketsCreatedThisWeek`)
  - Созданные предыдущей недели (`carryoverTicketsCreatedPreviousWeek`)
  - Остальные (`carryoverTicketsCreatedOlder`)
- Закрытия по стадиям (`stagesByWeek[последний]`)

#### 2. Блок "Предыдущая неделя"

**Источник данных:** `previousWeekData` (computed-свойство в `GraphAdmissionClosureChart.vue`)

**Приоритет получения данных:**
1. `props.data.series[предпоследний]` — предпоследний элемент из массива series
2. `props.data.weeksData[предпоследний]` — предпоследний элемент из weeksData
3. Fallback на series даже если значения нули

**Отображаемые метрики:**
- Новые за неделю (`newTickets`)
- Закрытые за неделю (`closedTickets`) с разбивкой
- Переходящие (`carryoverTickets`) с разбивкой
- Закрытия по стадиям (`stagesByWeek[предпоследний]`)

---

## Механизм загрузки данных

### Первый запрос при рендере страницы

**Файл:** `GraphAdmissionClosureDashboard.vue`  
**Функция:** `loadData()`

**Параметры запроса:**
```javascript
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true  // ⚠️ ВАЖНО: включает тикеты для responsible[]
})
```

**Что загружается при первом запросе:**

✅ **Загружается:**
- Агрегированные метрики для 4 недель (`series`)
- Данные текущей недели (`currentWeek`)
- Данные для каждой недели (`weeksData`)
- Стадии по неделям (`stagesByWeek`)
- Ответственные с тикетами (`responsible[]` с `tickets[]`) — только для текущей недели
- Разбивка закрытых по стадиям (`stagesByWeek`) — для всех 4 недель

❌ **НЕ загружается:**
- Детальные списки тикетов для попапа "Новые по стадиям" (`StagesModal`)
- Детальные списки тикетов для попапа "Переходящие по срокам" (`CarryoverDurationModal`)
- Детальные списки тикетов для попапа "Ответственные" для предыдущей недели

**Вывод:** При первом запросе загружаются только агрегированные данные (цифры) для обеих недель. Детальные данные для попапов загружаются отдельно при открытии попапа.

---

## Работа попапов для текущей недели

### Обработчик клика

**Файл:** `GraphAdmissionClosureChart.vue`  
**Функция:** `handleSummaryClick(type)`

**Логика:**
```javascript
const handleSummaryClick = (type) => {
  const currentWeek = currentWeekData.value;
  const weekMeta = currentWeekMeta.value;
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages', weekMeta);  // Открывает StagesModal
  } else if (type === 'closed' && closedTickets > 0) {
    emit('open-responsible', weekMeta);  // Открывает ResponsibleModal
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover', weekMeta);  // Открывает CarryoverDurationModal
  }
};
```

### Открытие попапов

**Файл:** `GraphAdmissionClosureDashboard.vue`

**Обработчики:**
```javascript
function handleOpenStages(weekMeta = null) {
  selectedWeekMeta.value = weekMeta || {
    weekNumber: chartMeta.value?.weekNumber,
    weekStartUtc: chartMeta.value?.weekStartUtc,
    weekEndUtc: chartMeta.value?.weekEndUtc
  };
  showStagesModal.value = true;
}

function handleOpenResponsible(weekMeta = null) {
  selectedWeekMeta.value = weekMeta || {
    weekNumber: chartMeta.value?.weekNumber,
    weekStartUtc: chartMeta.value?.weekStartUtc,
    weekEndUtc: chartMeta.value?.weekEndUtc
  };
  showResponsibleModal.value = true;
}

function handleOpenCarryover(weekMeta = null) {
  selectedWeekMeta.value = weekMeta || {
    weekNumber: chartMeta.value?.weekNumber,
    weekStartUtc: chartMeta.value?.weekStartUtc,
    weekEndUtc: chartMeta.value?.weekEndUtc
  };
  showCarryoverModal.value = true;
}
```

### Загрузка данных в попапах

**Важно:** Попапы получают метаданные недели (`weekNumber`, `weekStartUtc`, `weekEndUtc`) и делают **отдельный запрос к API** для получения детальных данных.

**Пример:** `StagesModal.vue` делает запрос:
```javascript
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc: props.weekStartUtc,
  weekEndUtc: props.weekEndUtc,
  includeNewTicketsByStages: true  // ⚠️ Загружает детальные данные для попапа
})
```

---

## Работа попапов для предыдущей недели

### Обработчик клика

**Файл:** `GraphAdmissionClosureChart.vue`  
**Функция:** `handlePreviousWeekSummaryClick(type)`

**Логика:**
```javascript
const handlePreviousWeekSummaryClick = (type) => {
  const previousWeek = previousWeekData.value;
  const weekMeta = previousWeekMeta.value;  // ⚠️ Метаданные предыдущей недели
  
  if (type === 'new' && newTickets > 0) {
    emit('open-stages', weekMeta);  // Передаём метаданные предыдущей недели
  } else if (type === 'closed' && closedTickets > 0) {
    emit('open-responsible', weekMeta);  // Передаём метаданные предыдущей недели
  } else if (type === 'carryover' && carryoverTickets > 0) {
    emit('open-carryover', weekMeta);  // Передаём метаданные предыдущей недели
  }
};
```

### Метаданные предыдущей недели

**Computed-свойство:** `previousWeekMeta`

```javascript
const previousWeekMeta = computed(() => {
  const weeks = props.meta?.weeks || [];
  if (weeks.length >= 2) {
    return weeks[weeks.length - 2];  // Предпоследняя неделя
  }
  return null;
});
```

### Загрузка данных в попапах для предыдущей недели

**Важно:** Попапы для предыдущей недели работают **аналогично** попапам для текущей недели:

1. Получают метаданные предыдущей недели (`weekNumber`, `weekStartUtc`, `weekEndUtc`)
2. Делают **отдельный запрос к API** с этими метаданными
3. Загружают детальные данные для выбранной недели

**Пример:** При клике на "Закрытые за неделю" в блоке "Предыдущая неделя":
- Открывается `ResponsibleModal`
- Попап получает `weekStartUtc` и `weekEndUtc` предыдущей недели
- Попап делает запрос к API с этими параметрами
- API возвращает данные для предыдущей недели

---

## Детальный анализ загрузки данных

### Схема загрузки данных

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Первый запрос при рендере страницы                      │
│    (GraphAdmissionClosureDashboard.vue::loadData())         │
├─────────────────────────────────────────────────────────────┤
│ Параметры:                                                  │
│   - includeTickets: true                                    │
│   - includeNewTicketsByStages: false                        │
│   - includeCarryoverTickets: true                          │
│   - includeCarryoverTicketsByDuration: false                │
├─────────────────────────────────────────────────────────────┤
│ Загружается:                                                │
│   ✅ series (4 недели)                                      │
│   ✅ currentWeek (текущая неделя)                           │
│   ✅ weeksData (данные для каждой недели)                   │
│   ✅ stagesByWeek (стадии по неделям)                       │
│   ✅ responsible[] с tickets[] (только текущая неделя)     │
│   ❌ Детальные тикеты для попапов НЕ загружаются            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Отображение данных на странице                           │
│    (GraphAdmissionClosureChart.vue)                         │
├─────────────────────────────────────────────────────────────┤
│ Блок "Текущая неделя":                                      │
│   - Данные из currentWeekData (series[последний])           │
│   - Стадии из stagesByWeek[последний]                       │
│                                                             │
│ Блок "Предыдущая неделя":                                   │
│   - Данные из previousWeekData (series[предпоследний])     │
│   - Стадии из stagesByWeek[предпоследний]                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Клик на summary-карточку                                 │
│    (handleSummaryClick / handlePreviousWeekSummaryClick)    │
├─────────────────────────────────────────────────────────────┤
│ Эмит события с метаданными недели:                          │
│   - weekNumber                                              │
│   - weekStartUtc                                            │
│   - weekEndUtc                                               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Открытие попапа                                          │
│    (StagesModal / ResponsibleModal / CarryoverDurationModal)│
├─────────────────────────────────────────────────────────────┤
│ Попап получает метаданные недели и делает                   │
│ ОТДЕЛЬНЫЙ запрос к API:                                     │
│                                                             │
│ StagesModal:                                                │
│   - includeNewTicketsByStages: true                         │
│                                                             │
│ ResponsibleModal:                                          │
│   - includeTickets: true                                    │
│                                                             │
│ CarryoverDurationModal:                                     │
│   - includeCarryoverTicketsByDuration: true                 │
└─────────────────────────────────────────────────────────────┘
```

### Ключевые моменты

1. **При первом запросе НЕ загружаются детальные данные для попапов**
   - Загружаются только агрегированные метрики (цифры)
   - Загружаются стадии по неделям (`stagesByWeek`) — это уже есть для обеих недель
   - Загружаются тикеты для `responsible[]`, но только для текущей недели

2. **Попапы делают отдельный запрос при открытии**
   - Каждый попап получает метаданные недели
   - Делает запрос с соответствующими параметрами (`includeNewTicketsByStages`, `includeTickets`, `includeCarryoverTicketsByDuration`)
   - Загружает детальные данные для выбранной недели

3. **Данные для предыдущей недели загружаются так же, как для текущей**
   - При первом запросе загружаются агрегированные метрики для всех 4 недель
   - При открытии попапа для предыдущей недели делается отдельный запрос с метаданными предыдущей недели

---

## Выводы и рекомендации

### Текущее состояние

✅ **Что работает хорошо:**
- Агрегированные данные загружаются сразу при первом запросе
- Стадии по неделям (`stagesByWeek`) загружаются для всех 4 недель сразу
- Попапы корректно работают для текущей и предыдущей недели
- Метаданные недели передаются правильно

⚠️ **Что можно улучшить:**
- Детальные данные для попапов загружаются только при открытии попапа
- Это может создавать задержку при первом открытии попапа
- Для предыдущей недели нет предзагрузки детальных данных

### Рекомендации

#### 1. Предзагрузка данных для попапов (опционально)

**Проблема:** При первом открытии попапа происходит задержка из-за загрузки данных.

**Решение:** Добавить предзагрузку детальных данных при первом запросе:

```javascript
// В loadData() добавить:
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true,
  includeNewTicketsByStages: true,  // ⚠️ Предзагрузка для StagesModal
  includeCarryoverTicketsByDuration: true  // ⚠️ Предзагрузка для CarryoverDurationModal
})
```

**Плюсы:**
- Попапы открываются мгновенно
- Лучший UX

**Минусы:**
- Увеличение размера ответа API
- Увеличение времени первого запроса

#### 2. Кеширование данных попапов

**Проблема:** При повторном открытии попапа делается повторный запрос.

**Решение:** Кешировать данные попапов в компоненте:

```javascript
const popupCache = ref({});

function handleOpenStages(weekMeta) {
  const cacheKey = `stages-${weekMeta.weekNumber}`;
  
  if (popupCache.value[cacheKey]) {
    // Используем кеш
    showStagesModal.value = true;
  } else {
    // Загружаем данные
    loadStagesData(weekMeta).then(data => {
      popupCache.value[cacheKey] = data;
      showStagesModal.value = true;
    });
  }
}
```

#### 3. Оптимизация запросов для предыдущей недели

**Проблема:** Данные для предыдущей недели загружаются только при открытии попапа.

**Решение:** Предзагружать данные для предыдущей недели параллельно с текущей:

```javascript
// В loadData() добавить параллельную загрузку:
const [currentWeekData, previousWeekData] = await Promise.all([
  fetchAdmissionClosureStats({...params, weekStartUtc: currentWeekStart}),
  fetchAdmissionClosureStats({...params, weekStartUtc: previousWeekStart})
]);
```

---

## Заключение

### Ответ на ключевой вопрос

**Вопрос:** Подгружаются ли данные для попапов сразу при первом запросе, когда идет рендер страницы?

**Ответ:** ❌ **НЕТ, детальные данные для попапов НЕ загружаются при первом запросе.**

**Что загружается при первом запросе:**
- ✅ Агрегированные метрики для 4 недель (`series`)
- ✅ Данные текущей недели (`currentWeek`)
- ✅ Данные для каждой недели (`weeksData`)
- ✅ Стадии по неделям (`stagesByWeek`) — для всех 4 недель
- ✅ Ответственные с тикетами (`responsible[]`) — только для текущей недели

**Что НЕ загружается при первом запросе:**
- ❌ Детальные списки тикетов для попапа "Новые по стадиям" (`StagesModal`)
- ❌ Детальные списки тикетов для попапа "Переходящие по срокам" (`CarryoverDurationModal`)
- ❌ Детальные списки тикетов для попапа "Ответственные" для предыдущей недели

**Как работают попапы:**
1. При клике на summary-карточку эмитируется событие с метаданными недели
2. Попап получает метаданные и делает **отдельный запрос к API**
3. API возвращает детальные данные для выбранной недели
4. Попап отображает данные

**Это работает одинаково для:**
- ✅ Текущей недели
- ✅ Предыдущей недели

---

**История правок:**
- 2025-12-23 20:28 (UTC+3, Брест): Создан документ с анализом работы попапов и загрузки данных

