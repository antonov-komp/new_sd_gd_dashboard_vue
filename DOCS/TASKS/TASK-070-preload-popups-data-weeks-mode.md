# TASK-070: Предзагрузка данных для попапов и проверка работы для текущей и предыдущей недели (недельный режим)

**Дата создания:** 2025-12-23 20:43 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Дата завершения:** 2025-12-23 (UTC+3, Брест)  
**Модуль:** График приема и закрытий сектора 1С (недельный режим, 4 недели)

---

## 📋 Описание

В модуле "График приема и закрытий сектора 1С" в недельном режиме попапы загружают данные только при открытии, что создаёт задержку при первом клике. Необходимо добавить предзагрузку данных для попапов в первом запросе и проверить корректность работы попапов для текущей и предыдущей недели.

---

## 🎯 Цель

1. **Предзагрузка данных для попапов** — загружать детальные данные для попапов в первом запросе при рендере страницы
2. **Проверка работы попапов** — убедиться, что попапы корректно работают для текущей и предыдущей недели

---

## 🔎 Контекст

### Текущее состояние

**Первый запрос** (`GraphAdmissionClosureDashboard.vue::loadData()`):
```javascript
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true  // ⚠️ Только для responsible[] текущей недели
})
```

**Что загружается:**
- ✅ Агрегированные метрики для 4 недель (`series`)
- ✅ Данные текущей недели (`currentWeek`)
- ✅ Данные для каждой недели (`weeksData`)
- ✅ Стадии по неделям (`stagesByWeek`)
- ✅ Ответственные с тикетами (`responsible[]`) — только для текущей недели

**Что НЕ загружается:**
- ❌ Детальные данные для `StagesModal` (`includeNewTicketsByStages: false`)
- ❌ Детальные данные для `CarryoverDurationModal` (`includeCarryoverTicketsByDuration: false`)
- ❌ Детальные данные для попапов предыдущей недели

**Проблема:** При открытии попапа происходит задержка из-за загрузки данных.

### Попапы и их параметры загрузки

1. **StagesModal** — требует `includeNewTicketsByStages: true`
2. **ResponsibleModal** — требует `includeTickets: true` (частично уже загружено)
3. **CarryoverDurationModal** — требует `includeCarryoverTicketsByDuration: true`

---

## 📝 Задачи

### 1. Добавить предзагрузку данных для попапов в первом запросе

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue`

**Текущая реализация (строки 247-319):**

Функция `loadData()` находится в строках 247-319. Текущий запрос:
```javascript
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
})
```

**Изменения:**

1. **Обновить параметры первого запроса (строка ~281):**
```javascript
// Было:
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true
})

// Должно быть:
fetchAdmissionClosureStats({
  product: '1C',
  periodMode: 'weeks',
  weekStartUtc,
  weekEndUtc,
  includeTickets: true,                    // Для ResponsibleModal
  includeNewTicketsByStages: true,          // ⚠️ НОВОЕ: Для StagesModal
  includeCarryoverTicketsByDuration: true   // ⚠️ НОВОЕ: Для CarryoverDurationModal
})
```

2. **Добавить ref для хранения предзагруженных данных (после строки ~187, рядом с selectedWeekMeta):**
```javascript
// TASK-070: Предзагруженные данные для попапов
const preloadedPopupData = ref({
  currentWeek: {
    newTicketsByStages: null,
    carryoverTicketsByDuration: null,
    responsibleCreatedThisWeek: null,  // Для ResponsibleModal (уже частично загружено)
    responsibleCreatedOtherWeek: null  // Для ResponsibleModal (уже частично загружено)
  },
  previousWeek: {
    newTicketsByStages: null,
    carryoverTicketsByDuration: null,
    responsibleCreatedThisWeek: null,
    responsibleCreatedOtherWeek: null
  }
});
```

3. **Сохранить предзагруженные данные для текущей недели (в loadData() после строки ~293):**
```javascript
// TASK-070: Сохраняем предзагруженные данные для текущей недели
if (data.newTicketsByStages) {
  preloadedPopupData.value.currentWeek.newTicketsByStages = data.newTicketsByStages;
  console.log('[TASK-070] Preloaded newTicketsByStages for current week:', data.newTicketsByStages.length, 'stages');
}
if (data.carryoverTicketsByDuration) {
  preloadedPopupData.value.currentWeek.carryoverTicketsByDuration = data.carryoverTicketsByDuration;
  console.log('[TASK-070] Preloaded carryoverTicketsByDuration for current week:', data.carryoverTicketsByDuration.length, 'categories');
}
// TASK-070: Сохраняем данные для ResponsibleModal (уже загружены в первом запросе)
if (data.responsibleCreatedThisWeek) {
  preloadedPopupData.value.currentWeek.responsibleCreatedThisWeek = data.responsibleCreatedThisWeek;
}
if (data.responsibleCreatedOtherWeek) {
  preloadedPopupData.value.currentWeek.responsibleCreatedOtherWeek = data.responsibleCreatedOtherWeek;
}
```

4. **Добавить computed для метаданных предыдущей недели (после строки ~187, рядом с selectedWeekMeta):**
```javascript
// TASK-070: Метаданные предыдущей недели для предзагрузки данных
const previousWeekMetaForPreload = computed(() => {
  const weeks = chartMeta.value?.weeks || [];
  if (weeks.length >= 2) {
    return weeks[weeks.length - 2]; // Предпоследняя неделя
  }
  return null;
});
```

5. **Загрузить данные для предыдущей недели (в loadData() после сохранения данных текущей недели, после строки ~309):**
```javascript
// TASK-070: Параллельная загрузка данных для предыдущей недели (не блокирует основной запрос)
if (previousWeekMetaForPreload.value) {
  const prevWeekStart = previousWeekMetaForPreload.value.weekStartUtc;
  const prevWeekEnd = previousWeekMetaForPreload.value.weekEndUtc;
  
  console.log('[TASK-070] Starting preload for previous week:', {
    weekNumber: previousWeekMetaForPreload.value.weekNumber,
    weekStartUtc: prevWeekStart,
    weekEndUtc: prevWeekEnd
  });
  
  // Загружаем данные для предыдущей недели в фоне (не блокируем основной UI)
  fetchAdmissionClosureStats({
    product: '1C',
    periodMode: 'weeks',
    weekStartUtc: prevWeekStart,
    weekEndUtc: prevWeekEnd,
    includeTickets: true,                    // Для ResponsibleModal
    includeNewTicketsByStages: true,          // Для StagesModal
    includeCarryoverTicketsByDuration: true   // Для CarryoverDurationModal
  }).then(result => {
    console.log('[TASK-070] Preload successful for previous week');
    
    // Сохраняем предзагруженные данные для предыдущей недели
    if (result.data.newTicketsByStages) {
      preloadedPopupData.value.previousWeek.newTicketsByStages = result.data.newTicketsByStages;
      console.log('[TASK-070] Preloaded newTicketsByStages for previous week:', result.data.newTicketsByStages.length, 'stages');
    }
    if (result.data.carryoverTicketsByDuration) {
      preloadedPopupData.value.previousWeek.carryoverTicketsByDuration = result.data.carryoverTicketsByDuration;
      console.log('[TASK-070] Preloaded carryoverTicketsByDuration for previous week:', result.data.carryoverTicketsByDuration.length, 'categories');
    }
    if (result.data.responsibleCreatedThisWeek) {
      preloadedPopupData.value.previousWeek.responsibleCreatedThisWeek = result.data.responsibleCreatedThisWeek;
    }
    if (result.data.responsibleCreatedOtherWeek) {
      preloadedPopupData.value.previousWeek.responsibleCreatedOtherWeek = result.data.responsibleCreatedOtherWeek;
    }
  }).catch(err => {
    console.warn('[TASK-070] Failed to preload previous week data (non-critical):', err);
    // Не критично, данные загрузятся при открытии попапа (fallback)
  });
}
```

6. **Обновить template для передачи предзагруженных данных в попапы (строки ~130-144):**
```vue
<StagesModal
  :is-visible="showStagesModal"
  :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
  :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
  :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
  :preloaded-data="getPreloadedStagesData(selectedWeekMeta)"  <!-- ⚠️ TASK-070: НОВОЕ -->
  @close="showStagesModal = false; selectedWeekMeta = null"
/>

<CarryoverDurationModal
  :is-visible="showCarryoverModal"
  :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
  :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
  :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
  :preloaded-data="getPreloadedCarryoverData(selectedWeekMeta)"  <!-- ⚠️ TASK-070: НОВОЕ -->
  @close="showCarryoverModal = false; selectedWeekMeta = null"
/>

<!-- TASK-070: ResponsibleModal уже получает данные через props, но нужно проверить работу для предыдущей недели -->
<ResponsibleModal
  :is-visible="showResponsibleModal"
  :responsible="getResponsibleData(selectedWeekMeta) || chartData.responsible || []"
  :closed-tickets-created-this-week="getClosedTicketsCreatedThisWeek(selectedWeekMeta) ?? chartData.closedTicketsCreatedThisWeek ?? 0"
  :closed-tickets-created-other-week="getClosedTicketsCreatedOtherWeek(selectedWeekMeta) ?? chartData.closedTicketsCreatedOtherWeek ?? 0"
  :responsible-created-this-week="getResponsibleCreatedThisWeek(selectedWeekMeta) || chartData.responsibleCreatedThisWeek || []"
  :responsible-created-other-week="getResponsibleCreatedOtherWeek(selectedWeekMeta) || chartData.responsibleCreatedOtherWeek || []"
  :week-number="selectedWeekMeta?.weekNumber || chartMeta?.weekNumber || null"
  :week-start-utc="selectedWeekMeta?.weekStartUtc || chartMeta?.weekStartUtc || null"
  :week-end-utc="selectedWeekMeta?.weekEndUtc || chartMeta?.weekEndUtc || null"
  @close="showResponsibleModal = false; selectedWeekMeta = null"
/>
```

7. **Добавить вспомогательные функции для получения предзагруженных данных (после функции loadData, ~строка 560):**
```javascript
/**
 * TASK-070: Получение предзагруженных данных для StagesModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Предзагруженные данные стадий или null
 */
function getPreloadedStagesData(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  const data = isCurrentWeek 
    ? preloadedPopupData.value.currentWeek.newTicketsByStages
    : preloadedPopupData.value.previousWeek.newTicketsByStages;
  
  // Валидация: проверяем, что данные есть и это массив
  if (Array.isArray(data) && data.length > 0) {
    console.log('[TASK-070] Using preloaded stages data for week', weekMeta.weekNumber, ':', data.length, 'stages');
    return data;
  }
  
  console.log('[TASK-070] No preloaded stages data for week', weekMeta.weekNumber, ', will use API fallback');
  return null;
}

/**
 * TASK-070: Получение предзагруженных данных для CarryoverDurationModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Предзагруженные данные категорий сроков или null
 */
function getPreloadedCarryoverData(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  const data = isCurrentWeek 
    ? preloadedPopupData.value.currentWeek.carryoverTicketsByDuration
    : preloadedPopupData.value.previousWeek.carryoverTicketsByDuration;
  
  // Валидация: проверяем, что данные есть и это массив
  if (Array.isArray(data) && data.length > 0) {
    console.log('[TASK-070] Using preloaded carryover data for week', weekMeta.weekNumber, ':', data.length, 'categories');
    return data;
  }
  
  console.log('[TASK-070] No preloaded carryover data for week', weekMeta.weekNumber, ', will use API fallback');
  return null;
}

/**
 * TASK-070: Получение данных ответственных для ResponsibleModal
 * 
 * @param {Object|null} weekMeta - Метаданные недели (текущей или предыдущей)
 * @returns {Array|null} Данные ответственных или null
 */
function getResponsibleData(weekMeta) {
  // Для ResponsibleModal данные загружаются через отдельный запрос при открытии попапа
  // Предзагруженные данные используются только для текущей недели (уже в chartData)
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  if (isCurrentWeek) {
    // Для текущей недели данные уже в chartData.responsible
    return chartData.value.responsible || null;
  }
  
  // Для предыдущей недели данные будут загружены при открытии попапа
  return null;
}

/**
 * TASK-070: Получение данных responsibleCreatedThisWeek для ResponsibleModal
 */
function getResponsibleCreatedThisWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  if (isCurrentWeek) {
    return chartData.value.responsibleCreatedThisWeek || null;
  }
  
  // Для предыдущей недели данные будут загружены при открытии попапа
  return preloadedPopupData.value.previousWeek.responsibleCreatedThisWeek || null;
}

/**
 * TASK-070: Получение данных responsibleCreatedOtherWeek для ResponsibleModal
 */
function getResponsibleCreatedOtherWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  if (isCurrentWeek) {
    return chartData.value.responsibleCreatedOtherWeek || null;
  }
  
  // Для предыдущей недели данные будут загружены при открытии попапа
  return preloadedPopupData.value.previousWeek.responsibleCreatedOtherWeek || null;
}

/**
 * TASK-070: Получение closedTicketsCreatedThisWeek для ResponsibleModal
 */
function getClosedTicketsCreatedThisWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  if (isCurrentWeek) {
    return chartData.value.closedTicketsCreatedThisWeek ?? null;
  }
  
  // Для предыдущей недели нужно получить из weeksData или сделать отдельный запрос
  // Пока возвращаем null, попап сделает запрос при открытии
  return null;
}

/**
 * TASK-070: Получение closedTicketsCreatedOtherWeek для ResponsibleModal
 */
function getClosedTicketsCreatedOtherWeek(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  if (isCurrentWeek) {
    return chartData.value.closedTicketsCreatedOtherWeek ?? null;
  }
  
  // Для предыдущей недели нужно получить из weeksData или сделать отдельный запрос
  // Пока возвращаем null, попап сделает запрос при открытии
  return null;
}
```

### 2. Обновить попапы для использования предзагруженных данных

#### 2.1. StagesModal

**Файл:** `vue-app/src/components/graph-admission-closure/StagesModal.vue`

**Изменения:**

1. **Добавить prop для предзагруженных данных:**
```javascript
const props = defineProps({
  isVisible: { type: Boolean, default: false },
  weekNumber: { type: Number, default: null },
  weekStartUtc: { type: String, default: null },
  weekEndUtc: { type: String, default: null },
  preloadedData: { type: Array, default: null }  // ⚠️ НОВОЕ
});
```

2. **Обновить watch для использования предзагруженных данных (текущий watch находится в строках ~299-310):**
```javascript
// TASK-070: Обновлённый watch с поддержкой предзагруженных данных
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    // Сброс состояния
    popupLevel.value = 1;
    selectedStage.value = null;
    tickets.value = [];
    error.value = null;
    
    // TASK-070: Проверяем, есть ли предзагруженные данные
    if (props.preloadedData && Array.isArray(props.preloadedData) && props.preloadedData.length > 0) {
      console.log('[TASK-070] StagesModal: Using preloaded data, stages count:', props.preloadedData.length);
      
      // Используем предзагруженные данные
      stages.value = props.preloadedData;
      isLoadingStages.value = false;
      
      // Валидация: проверяем структуру данных
      const hasValidStages = props.preloadedData.every(stage => 
        stage.stageId && 
        stage.stageName && 
        typeof stage.count === 'number'
      );
      
      if (!hasValidStages) {
        console.warn('[TASK-070] StagesModal: Invalid preloaded data structure, falling back to API');
        await loadStages();
      }
    } else {
      console.log('[TASK-070] StagesModal: No preloaded data, loading from API');
      // Загружаем данные через API (fallback)
      await loadStages();
    }
  }
}, { immediate: false });
```

3. **Добавить проверку валидности предзагруженных данных при изменении weekNumber:**
```javascript
// TASK-070: Watch для обновления данных при изменении недели
watch([() => props.weekNumber, () => props.preloadedData], async ([newWeekNumber, newPreloadedData]) => {
  // Если попап открыт и изменилась неделя, обновляем данные
  if (props.isVisible && newWeekNumber) {
    if (newPreloadedData && Array.isArray(newPreloadedData) && newPreloadedData.length > 0) {
      console.log('[TASK-070] StagesModal: Week changed, updating with preloaded data for week', newWeekNumber);
      stages.value = newPreloadedData;
      isLoadingStages.value = false;
    } else {
      console.log('[TASK-070] StagesModal: Week changed, loading from API for week', newWeekNumber);
      await loadStages();
    }
  }
});
```

#### 2.2. CarryoverDurationModal

**Файл:** `vue-app/src/components/graph-admission-closure/CarryoverDurationModal.vue`

**Изменения:**

1. **Добавить prop для предзагруженных данных:**
```javascript
const props = defineProps({
  isVisible: { type: Boolean, default: false },
  weekNumber: { type: Number, default: null },
  weekStartUtc: { type: String, default: null },
  weekEndUtc: { type: String, default: null },
  preloadedData: { type: Array, default: null }  // ⚠️ НОВОЕ
});
```

2. **Обновить watch для использования предзагруженных данных (текущий watch находится в строках ~297-310):**
```javascript
// TASK-070: Обновлённый watch с поддержкой предзагруженных данных
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    // Сброс состояния
    popupLevel.value = 1;
    selectedCategory.value = null;
    tickets.value = [];
    error.value = null;
    
    // TASK-070: Проверяем, есть ли предзагруженные данные
    if (props.preloadedData && Array.isArray(props.preloadedData) && props.preloadedData.length > 0) {
      console.log('[TASK-070] CarryoverDurationModal: Using preloaded data, categories count:', props.preloadedData.length);
      
      // Используем предзагруженные данные
      durationCategories.value = props.preloadedData;
      isLoadingCategories.value = false;
      
      // Валидация: проверяем структуру данных
      const hasValidCategories = props.preloadedData.every(category => 
        category.durationCategory && 
        category.durationLabel && 
        typeof category.count === 'number'
      );
      
      if (!hasValidCategories) {
        console.warn('[TASK-070] CarryoverDurationModal: Invalid preloaded data structure, falling back to API');
        await loadCategories();
      }
    } else {
      console.log('[TASK-070] CarryoverDurationModal: No preloaded data, loading from API');
      // Загружаем данные через API (fallback)
      await loadCategories();
    }
  }
}, { immediate: false });
```

3. **Добавить проверку валидности предзагруженных данных при изменении weekNumber:**
```javascript
// TASK-070: Watch для обновления данных при изменении недели
watch([() => props.weekNumber, () => props.preloadedData], async ([newWeekNumber, newPreloadedData]) => {
  // Если попап открыт и изменилась неделя, обновляем данные
  if (props.isVisible && newWeekNumber) {
    if (newPreloadedData && Array.isArray(newPreloadedData) && newPreloadedData.length > 0) {
      console.log('[TASK-070] CarryoverDurationModal: Week changed, updating with preloaded data for week', newWeekNumber);
      durationCategories.value = newPreloadedData;
      isLoadingCategories.value = false;
    } else {
      console.log('[TASK-070] CarryoverDurationModal: Week changed, loading from API for week', newWeekNumber);
      await loadCategories();
    }
  }
});
```

#### 2.3. ResponsibleModal

**Примечание:** Для `ResponsibleModal` данные уже частично загружаются в первом запросе (`includeTickets: true`). Нужно проверить, что данные корректно используются для текущей и предыдущей недели.

**Файл:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

**Текущая реализация:**
- Попап получает данные через props: `responsibleCreatedThisWeek`, `responsibleCreatedOtherWeek` (строки ~329-336)
- Для текущей недели данные уже загружены в первом запросе
- Для предыдущей недели попап делает отдельный запрос при открытии (если данные не предзагружены)

**Проверка и улучшения:**

1. **Проверить работу для текущей недели:**
   - Убедиться, что данные `responsibleCreatedThisWeek` и `responsibleCreatedOtherWeek` корректно передаются через props
   - Проверить, что категории отображаются корректно (строки ~364-377)
   - Проверить, что вкладка "По сотрудникам" работает с предзагруженными данными (строки ~380-426)

2. **Проверить работу для предыдущей недели:**
   - При открытии попапа для предыдущей недели попап должен получить `weekStartUtc` и `weekEndUtc` предыдущей недели
   - Попап делает запрос к API с этими параметрами (если данные не предзагружены)
   - Проверить, что в заголовке попапа отображается правильный номер недели (строка ~31)

3. **Добавить логирование для отладки:**
```javascript
// В watch для props.isVisible (если есть) или в функции открытия попапа
watch(() => props.isVisible, (isVisible) => {
  if (isVisible) {
    console.log('[TASK-070] ResponsibleModal opened for week', props.weekNumber);
    console.log('[TASK-070] ResponsibleModal data:', {
      responsibleCreatedThisWeek: props.responsibleCreatedThisWeek?.length || 0,
      responsibleCreatedOtherWeek: props.responsibleCreatedOtherWeek?.length || 0,
      closedTicketsCreatedThisWeek: props.closedTicketsCreatedThisWeek,
      closedTicketsCreatedOtherWeek: props.closedTicketsCreatedOtherWeek
    });
  }
});
```

4. **Проверить загрузку данных для предыдущей недели:**
   - Если данные не переданы через props (для предыдущей недели), попап должен сделать запрос
   - Проверить функцию `loadNames()` (строка ~680+) — она должна использовать `props.weekStartUtc` и `props.weekEndUtc`
   - Убедиться, что запрос использует правильные параметры недели

5. **Добавить поддержку предзагруженных данных для предыдущей недели (опционально):**
   - Если данные для предыдущей недели предзагружены, передавать их через props
   - Это ускорит открытие попапа для предыдущей недели
   - Если данные не предзагружены, попап делает запрос (существующая логика)

### 3. Обработка edge cases и валидация данных

#### 3.1. Валидация предзагруженных данных

**Проблема:** Предзагруженные данные могут быть неполными или некорректными.

**Решение:** Добавить валидацию перед использованием предзагруженных данных.

**Пример валидации для StagesModal:**
```javascript
function validatePreloadedStagesData(data) {
  if (!data || !Array.isArray(data)) {
    return false;
  }
  
  // Проверяем, что каждый элемент имеет необходимые поля
  return data.every(stage => {
    return (
      typeof stage.stageId === 'string' &&
      typeof stage.stageName === 'string' &&
      typeof stage.count === 'number' &&
      stage.count >= 0
    );
  });
}
```

#### 3.2. Обработка отсутствия данных

**Сценарий:** Предзагруженные данные отсутствуют (например, при ошибке загрузки).

**Решение:** Fallback на API запрос.

**Пример:**
```javascript
if (props.preloadedData && validatePreloadedStagesData(props.preloadedData)) {
  // Используем предзагруженные данные
  stages.value = props.preloadedData;
} else {
  // Fallback: загружаем через API
  console.warn('[TASK-070] Preloaded data invalid or missing, using API fallback');
  await loadStages();
}
```

#### 3.3. Обработка изменения недели

**Сценарий:** Пользователь открыл попап для текущей недели, затем закрыл и открыл для предыдущей.

**Решение:** Обновлять данные при изменении `weekNumber` в props.

**Пример:**
```javascript
watch([() => props.weekNumber, () => props.preloadedData], async ([newWeekNumber, newPreloadedData]) => {
  if (props.isVisible && newWeekNumber) {
    // Обновляем данные при изменении недели
    if (newPreloadedData && validatePreloadedStagesData(newPreloadedData)) {
      stages.value = newPreloadedData;
    } else {
      await loadStages();
    }
  }
});
```

#### 3.4. Проверка тикетов в предзагруженных данных

**Важно:** Если `includeTickets: true` в первом запросе, тикеты могут быть включены в предзагруженные данные.

**Проверка в StagesModal:**
```javascript
// В StagesModal при использовании предзагруженных данных
if (props.preloadedData) {
  stages.value = props.preloadedData;
  
  // Проверяем, есть ли тикеты в предзагруженных данных
  const hasTickets = stages.value.some(stage => 
    Array.isArray(stage.tickets) && stage.tickets.length > 0
  );
  
  if (hasTickets) {
    console.log('[TASK-070] StagesModal: Preloaded data includes tickets, no need to load them separately');
  } else {
    console.log('[TASK-070] StagesModal: Preloaded data does not include tickets, will load them on stage click');
  }
}

// В loadStageTickets() (строка ~217) можно оптимизировать:
async function loadStageTickets(stageId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    // TASK-070: Проверяем, есть ли тикеты в предзагруженных данных
    const preloadedStage = stages.value.find(s => s.stageId === stageId);
    if (preloadedStage && Array.isArray(preloadedStage.tickets) && preloadedStage.tickets.length > 0) {
      console.log('[TASK-070] StagesModal: Using preloaded tickets for stage', stageId);
      // Используем предзагруженные тикеты
      const stageTickets = preloadedStage.tickets;
      // Обогащаем данные через prepareTicketsForDisplay
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(stageTickets, null, null);
      isLoadingTickets.value = false;
      return; // Выходим, не делая запрос к API
    }
    
    // Если тикеты не предзагружены, загружаем через API (существующая логика)
    // ... остальной код функции loadStageTickets()
  } catch (err) {
    // ... обработка ошибок
  }
}
```

**Проверка в CarryoverDurationModal:**
```javascript
// Аналогично для CarryoverDurationModal в loadCategoryTickets() (строка ~218)
async function loadCategoryTickets(durationCategory) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    // TASK-070: Проверяем, есть ли тикеты в предзагруженных данных
    const preloadedCategory = durationCategories.value.find(
      c => c.durationCategory === durationCategory
    );
    if (preloadedCategory && Array.isArray(preloadedCategory.tickets) && preloadedCategory.tickets.length > 0) {
      console.log('[TASK-070] CarryoverDurationModal: Using preloaded tickets for category', durationCategory);
      // Используем предзагруженные тикеты
      const categoryTickets = preloadedCategory.tickets;
      // Обогащаем данные через prepareTicketsForDisplay
      const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
      tickets.value = await prepareTicketsForDisplay(categoryTickets, null, null);
      isLoadingTickets.value = false;
      return; // Выходим, не делая запрос к API
    }
    
    // Если тикеты не предзагружены, загружаем через API (существующая логика)
    // ... остальной код функции loadCategoryTickets()
  } catch (err) {
    // ... обработка ошибок
  }
}
```

### 4. Проверка работы попапов для текущей и предыдущей недели

**Тестовые сценарии:**

#### 3.1. Текущая неделя

1. **StagesModal (Новые по стадиям):**
   - [ ] Кликнуть на карточку "Новые за неделю" в блоке "Текущая неделя"
   - [ ] Попап открывается мгновенно (без загрузки)
   - [ ] Отображаются стадии с количеством тикетов
   - [ ] Клик на стадию открывает список тикетов
   - [ ] Тикеты отображаются корректно

2. **ResponsibleModal (Закрытые по ответственным):**
   - [ ] Кликнуть на карточку "Закрытые за неделю" в блоке "Текущая неделя"
   - [ ] Попап открывается с данными текущей недели
   - [ ] Отображаются категории "Созданные этой неделей" и "Созданные другой неделей"
   - [ ] Клик на категорию открывает список ответственных
   - [ ] Клик на ответственного открывает список тикетов
   - [ ] Тикеты отображаются корректно

3. **CarryoverDurationModal (Переходящие по срокам):**
   - [ ] Кликнуть на карточку "Переходящие" в блоке "Текущая неделя"
   - [ ] Попап открывается мгновенно (без загрузки)
   - [ ] Отображаются категории сроков с количеством тикетов
   - [ ] Клик на категорию открывает список тикетов
   - [ ] Тикеты отображаются корректно

#### 3.2. Предыдущая неделя

1. **StagesModal (Новые по стадиям):**
   - [ ] Кликнуть на карточку "Новые за неделю" в блоке "Предыдущая неделя"
   - [ ] Попап открывается с данными предыдущей недели (неделя N-1)
   - [ ] В заголовке попапа отображается номер предыдущей недели
   - [ ] Отображаются стадии с количеством тикетов для предыдущей недели
   - [ ] Клик на стадию открывает список тикетов предыдущей недели
   - [ ] Тикеты отображаются корректно

2. **ResponsibleModal (Закрытые по ответственным):**
   - [ ] Кликнуть на карточку "Закрытые за неделю" в блоке "Предыдущая неделя"
   - [ ] Попап открывается с данными предыдущей недели (неделя N-1)
   - [ ] В заголовке попапа отображается номер предыдущей недели
   - [ ] Отображаются категории "Созданные этой неделей" и "Созданные другой неделей" для предыдущей недели
   - [ ] Клик на категорию открывает список ответственных для предыдущей недели
   - [ ] Клик на ответственного открывает список тикетов для предыдущей недели
   - [ ] Тикеты отображаются корректно

3. **CarryoverDurationModal (Переходящие по срокам):**
   - [ ] Кликнуть на карточку "Переходящие" в блоке "Предыдущая неделя"
   - [ ] Попап открывается с данными предыдущей недели (неделя N-1)
   - [ ] В заголовке попапа отображается номер предыдущей недели
   - [ ] Отображаются категории сроков с количеством тикетов для предыдущей недели
   - [ ] Клик на категорию открывает список тикетов для предыдущей недели
   - [ ] Тикеты отображаются корректно

---

## 🔧 Технические детали

### Схема потока данных

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Первый запрос при рендере страницы                           │
│    (GraphAdmissionClosureDashboard.vue::loadData())              │
├─────────────────────────────────────────────────────────────────┤
│ Параметры запроса:                                              │
│   - includeTickets: true                                       │
│   - includeNewTicketsByStages: true  ⚠️ TASK-070: НОВОЕ         │
│   - includeCarryoverTicketsByDuration: true  ⚠️ TASK-070: НОВОЕ │
├─────────────────────────────────────────────────────────────────┤
│ Загружается:                                                     │
│   ✅ series (4 недели)                                          │
│   ✅ currentWeek (текущая неделя)                               │
│   ✅ weeksData (данные для каждой недели)                        │
│   ✅ stagesByWeek (стадии по неделям)                            │
│   ✅ responsible[] с tickets[] (текущая неделя)                │
│   ✅ newTicketsByStages[] (текущая неделя)  ⚠️ TASK-070: НОВОЕ  │
│   ✅ carryoverTicketsByDuration[] (текущая неделя)  ⚠️ TASK-070 │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Сохранение предзагруженных данных                             │
│    (preloadedPopupData.currentWeek)                              │
├─────────────────────────────────────────────────────────────────┤
│ Сохраняется:                                                     │
│   - newTicketsByStages → preloadedPopupData.currentWeek          │
│   - carryoverTicketsByDuration → preloadedPopupData.currentWeek │
│   - responsibleCreatedThisWeek → preloadedPopupData.currentWeek  │
│   - responsibleCreatedOtherWeek → preloadedPopupData.currentWeek │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Параллельная загрузка данных для предыдущей недели           │
│    (не блокирует основной UI)                                    │
├─────────────────────────────────────────────────────────────────┤
│ Запрос с параметрами предыдущей недели:                         │
│   - weekStartUtc: previousWeekMeta.weekStartUtc                  │
│   - weekEndUtc: previousWeekMeta.weekEndUtc                     │
│   - includeTickets: true                                        │
│   - includeNewTicketsByStages: true                              │
│   - includeCarryoverTicketsByDuration: true                     │
├─────────────────────────────────────────────────────────────────┤
│ Сохраняется:                                                     │
│   - newTicketsByStages → preloadedPopupData.previousWeek         │
│   - carryoverTicketsByDuration → preloadedPopupData.previousWeek │
│   - responsibleCreatedThisWeek → preloadedPopupData.previousWeek │
│   - responsibleCreatedOtherWeek → preloadedPopupData.previousWeek│
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Клик на summary-карточку                                      │
│    (handleSummaryClick / handlePreviousWeekSummaryClick)         │
├─────────────────────────────────────────────────────────────────┤
│ Эмит события с метаданными недели:                               │
│   - weekNumber                                                  │
│   - weekStartUtc                                                │
│   - weekEndUtc                                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Открытие попапа                                                │
│    (StagesModal / ResponsibleModal / CarryoverDurationModal)     │
├─────────────────────────────────────────────────────────────────┤
│ Попап получает:                                                  │
│   - Метаданные недели (weekNumber, weekStartUtc, weekEndUtc)     │
│   - Предзагруженные данные (preloadedData)  ⚠️ TASK-070: НОВОЕ  │
├─────────────────────────────────────────────────────────────────┤
│ Логика попапа:                                                   │
│   1. Проверка предзагруженных данных                            │
│   2. Если данные валидны → использование предзагруженных данных  │
│   3. Если данных нет → запрос к API (fallback)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Структура данных

**Предзагруженные данные для текущей недели:**
```javascript
{
  newTicketsByStages: [
    {
      stageId: 'DT140_12:UC_0VHWE2',
      stageName: 'Сформировано обращение',
      color: '#007bff',
      count: 5,
      tickets: [...] // Если includeTickets: true
    },
    // ...
  ],
  carryoverTicketsByDuration: [
    {
      durationCategory: 'up_to_month',
      durationLabel: 'До 1 месяца',
      color: '#28a745',
      count: 3,
      tickets: [...] // Если includeTickets: true
    },
    // ...
  ]
}
```

**Предзагруженные данные для предыдущей недели:**
```javascript
{
  newTicketsByStages: [...], // Аналогично текущей неделе
  carryoverTicketsByDuration: [...] // Аналогично текущей неделе
}
```

### Оптимизация

**Вариант 1: Загрузка данных для обеих недель в первом запросе (рекомендуется)**

- Загружать данные для текущей недели в основном запросе
- Загружать данные для предыдущей недели параллельно (не блокируя основной запрос)
- **Преимущества:**
  - Попапы открываются мгновенно для обеих недель
  - Лучший пользовательский опыт
- **Недостатки:**
  - Увеличение времени первого запроса на 10-20%
  - Увеличение размера ответа API

**Вариант 2: Ленивая загрузка для предыдущей недели**

- Загружать данные для предыдущей недели только при первом открытии попапа
- Кешировать загруженные данные для повторного использования
- **Преимущества:**
  - Меньше нагрузка на первый запрос
  - Данные загружаются только при необходимости
- **Недостатки:**
  - Задержка при первом открытии попапа для предыдущей недели

**Рекомендация:** Использовать Вариант 1 для лучшего UX.

### Включение тикетов в предзагруженные данные

**Важно:** Если `includeTickets: true` в первом запросе, тикеты могут быть включены в предзагруженные данные.

**Преимущества:**
- Ускорение открытия уровня 2 в попапах (список тикетов)
- Меньше запросов к API

**Недостатки:**
- Увеличение размера ответа API
- Увеличение времени первого запроса

**Рекомендация:** Оставить `includeTickets: true` в первом запросе для оптимизации уровня 2 в попапах.

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Данные для попапов предзагружаются в первом запросе для текущей недели
- [ ] Данные для попапов предзагружаются параллельно для предыдущей недели (не блокирует UI)
- [ ] Попапы открываются мгновенно (без задержки загрузки) для текущей недели
- [ ] Попапы открываются мгновенно (без задержки загрузки) для предыдущей недели (если данные предзагружены)
- [ ] Попапы корректно работают для текущей недели
- [ ] Попапы корректно работают для предыдущей недели
- [ ] В заголовках попапов отображается правильный номер недели (текущей или предыдущей)
- [ ] Данные в попапах соответствуют выбранной неделе
- [ ] Fallback на API работает, если предзагруженные данные отсутствуют или невалидны
- [ ] Валидация предзагруженных данных работает корректно

### Технические требования

- [ ] Нет ошибок в консоли браузера
- [ ] Логирование добавлено для отладки (префикс `[TASK-070]`)
- [ ] Производительность не ухудшилась (время первого запроса увеличилось не более чем на 20%)
- [ ] Параллельная загрузка данных для предыдущей недели не блокирует основной UI
- [ ] Обработка ошибок реализована (если предзагрузка для предыдущей недели не удалась)

### Тестирование

- [ ] Протестированы все попапы для текущей недели
- [ ] Протестированы все попапы для предыдущей недели
- [ ] Протестирован fallback на API при отсутствии предзагруженных данных
- [ ] Протестирована валидация предзагруженных данных
- [ ] Протестировано изменение недели (открытие попапа для текущей, затем для предыдущей)
- [ ] Протестирована производительность (время первого запроса, время открытия попапов)

### Проверка данных

- [ ] Количество стадий в StagesModal соответствует данным API
- [ ] Количество категорий в CarryoverDurationModal соответствует данным API
- [ ] Количество ответственных в ResponsibleModal соответствует данным API
- [ ] Тикеты в попапах соответствуют выбранной неделе
- [ ] Номера недель в заголовках попапов корректны

---

## 📚 Связанные файлы

### Компоненты
- `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue`
- `vue-app/src/components/graph-admission-closure/StagesModal.vue`
- `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`
- `vue-app/src/components/graph-admission-closure/CarryoverDurationModal.vue`

### Сервисы
- `vue-app/src/services/graph-admission-closure/admissionClosureService.js`

### Документация
- `DOCS/ARCHITECTURE/graph-admission-closure-popups-analysis.md` — анализ работы попапов

---

## 🔗 Связанные задачи

- **TASK-041** — График приёма и закрытий сектора 1С (базовая реализация)
- **TASK-043** — Попап новых тикетов по стадиям
- **TASK-044** — Переходящие тикеты (carryover)
- **TASK-062** — Summary-карточки для предыдущей недели
- **TASK-064** — Закрытия по стадиям для предыдущей недели

---

## 📝 Примечания

### Производительность

1. **Размер ответа API:**
   - Предзагрузка данных увеличит размер ответа API на ~20-30%
   - Время первого запроса может увеличиться на 10-20%
   - Необходимо проверить, что это не критично для пользовательского опыта

2. **Параллельная загрузка:**
   - Загрузка данных для предыдущей недели выполняется параллельно (не блокирует основной UI)
   - Если загрузка для предыдущей недели не удалась, это не критично (данные загрузятся при открытии попапа)

### Кеширование

3. **Кеширование в компоненте:**
   - Предзагруженные данные хранятся в `preloadedPopupData` ref
   - Данные сохраняются до перезагрузки страницы или смены режима
   - Рассмотреть возможность кеширования в localStorage (опционально, для будущих улучшений)

### Обратная совместимость

4. **Fallback на API:**
   - Fallback на API должен работать, если предзагруженные данные отсутствуют
   - Это гарантирует работу попапов даже при ошибках предзагрузки
   - Валидация предзагруженных данных обязательна перед использованием

### Тестирование

5. **Особое внимание:**
   - Тестирование попапов для предыдущей недели (относительно новая функциональность)
   - Проверка валидации предзагруженных данных
   - Проверка производительности (время первого запроса, время открытия попапов)
   - Проверка edge cases (отсутствие данных, некорректные данные, ошибки API)

### Логирование

6. **Отладочное логирование:**
   - Все логи должны иметь префикс `[TASK-070]` для удобной фильтрации
   - Логировать использование предзагруженных данных vs API fallback
   - Логировать ошибки предзагрузки (не критично, но полезно для отладки)

### Валидация данных

7. **Проверка структуры данных:**
   - Валидация обязательна перед использованием предзагруженных данных
   - Проверка типов полей (stageId, stageName, count и т.д.)
   - Проверка наличия обязательных полей
   - Fallback на API при невалидных данных

### Оптимизация

8. **Включение тикетов в предзагруженные данные:**
   - Если `includeTickets: true` в первом запросе, тикеты могут быть включены в предзагруженные данные
   - Это ускорит открытие уровня 2 в попапах (список тикетов)
   - Проверить, что это не увеличивает размер ответа критично

### Проверка ResponsibleModal

9. **Особенности ResponsibleModal:**
   - Данные для текущей недели уже частично загружены в первом запросе
   - Для предыдущей недели данные загружаются при открытии попапа (если не предзагружены)
   - Проверить, что попап корректно работает для обеих недель
   - Проверить, что вкладка "По сотрудникам" использует предзагруженные данные (если доступны)

10. **Детали проверки ResponsibleModal для предыдущей недели:**
    - При открытии попапа для предыдущей недели проверять, есть ли предзагруженные данные
    - Если данные предзагружены, использовать их (не делать запрос к API)
    - Если данных нет, делать запрос к API с параметрами предыдущей недели
    - Проверить, что попап использует `props.weekStartUtc` и `props.weekEndUtc` из `selectedWeekMeta` для запросов
    - Убедиться, что вкладка "По категориям" работает с предзагруженными данными (если доступны)
    - Убедиться, что вкладка "По сотрудникам" работает с предзагруженными данными (если доступны)
    - Проверить функцию `loadGradationTicketsFromAPI()` (строка ~738) — она должна использовать `props.weekStartUtc` и `props.weekEndUtc`

### Обработка ошибок

11. **Ошибки предзагрузки:**
    - Если предзагрузка данных для предыдущей недели не удалась, это не критично
    - Попап должен работать через fallback на API
    - Логировать ошибки, но не прерывать работу приложения

12. **Ошибки валидации:**
    - Если предзагруженные данные невалидны, использовать fallback на API
    - Логировать предупреждения о невалидных данных
    - Не показывать ошибки пользователю (работает через fallback)

---

## 🧪 Детальные инструкции по тестированию

### Подготовка к тестированию

1. **Открыть DevTools:**
   - Вкладка "Console" для просмотра логов
   - Вкладка "Network" для проверки запросов к API
   - Фильтр по `[TASK-070]` для логов задачи

2. **Проверить начальное состояние:**
   - Открыть модуль "График приема и закрытий сектора 1С"
   - Выбрать недельный режим (4 недели)
   - Дождаться загрузки данных

### Тест 1: Предзагрузка данных для текущей недели

**Шаги:**
1. Открыть DevTools → Network
2. Обновить страницу (F5)
3. Найти запрос к `/api/graph-1c-admission-closure.php`
4. Проверить параметры запроса:
   - `includeNewTicketsByStages: true` ✅
   - `includeCarryoverTicketsByDuration: true` ✅
   - `includeTickets: true` ✅
5. Проверить ответ API:
   - `data.newTicketsByStages` присутствует ✅
   - `data.carryoverTicketsByDuration` присутствует ✅
6. Проверить консоль:
   - Логи `[TASK-070] Preloaded newTicketsByStages for current week` ✅
   - Логи `[TASK-070] Preloaded carryoverTicketsByDuration for current week` ✅

**Ожидаемый результат:**
- Данные предзагружены для текущей недели
- В консоли есть логи о предзагрузке

### Тест 2: Предзагрузка данных для предыдущей недели

**Шаги:**
1. Открыть DevTools → Network
2. Обновить страницу (F5)
3. Найти второй запрос к `/api/graph-1c-admission-closure.php` (для предыдущей недели)
4. Проверить параметры запроса:
   - `weekStartUtc` соответствует предыдущей неделе ✅
   - `weekEndUtc` соответствует предыдущей неделе ✅
   - `includeNewTicketsByStages: true` ✅
   - `includeCarryoverTicketsByDuration: true` ✅
5. Проверить консоль:
   - Логи `[TASK-070] Starting preload for previous week` ✅
   - Логи `[TASK-070] Preload successful for previous week` ✅

**Ожидаемый результат:**
- Данные предзагружены для предыдущей недели (параллельно, не блокирует UI)
- В консоли есть логи о предзагрузке

### Тест 3: Открытие попапов для текущей недели

**Шаги для StagesModal:**
1. Кликнуть на карточку "Новые за неделю" в блоке "Текущая неделя"
2. Проверить консоль:
   - Лог `[TASK-070] StagesModal: Using preloaded data` ✅
   - Нет запроса к API (данные уже предзагружены) ✅
3. Проверить попап:
   - Открывается мгновенно (без загрузки) ✅
   - Отображаются стадии с количеством тикетов ✅
   - В заголовке отображается номер текущей недели ✅

**Шаги для CarryoverDurationModal:**
1. Кликнуть на карточку "Переходящие" в блоке "Текущая неделя"
2. Проверить консоль:
   - Лог `[TASK-070] CarryoverDurationModal: Using preloaded data` ✅
   - Нет запроса к API ✅
3. Проверить попап:
   - Открывается мгновенно ✅
   - Отображаются категории сроков ✅

**Шаги для ResponsibleModal:**
1. Кликнуть на карточку "Закрытые за неделю" в блоке "Текущая неделя"
2. Проверить попап:
   - Отображаются категории "Созданные этой неделей" и "Созданные другой неделей" ✅
   - Данные соответствуют текущей неделе ✅

### Тест 4: Открытие попапов для предыдущей недели

**Шаги для StagesModal:**
1. Кликнуть на карточку "Новые за неделю" в блоке "Предыдущая неделя"
2. Проверить консоль:
   - Лог `[TASK-070] StagesModal: Using preloaded data for week [N-1]` ✅
   - ИЛИ лог `[TASK-070] StagesModal: No preloaded data, loading from API` (если предзагрузка не удалась) ✅
3. Проверить попап:
   - В заголовке отображается номер предыдущей недели (N-1) ✅
   - Данные соответствуют предыдущей неделе ✅

**Шаги для CarryoverDurationModal:**
1. Кликнуть на карточку "Переходящие" в блоке "Предыдущая неделя"
2. Проверить попап:
   - В заголовке отображается номер предыдущей недели ✅
   - Данные соответствуют предыдущей неделе ✅

**Шаги для ResponsibleModal:**
1. Кликнуть на карточку "Закрытые за неделю" в блоке "Предыдущая неделя"
2. Проверить попап:
   - В заголовке отображается номер предыдущей недели ✅
   - Данные соответствуют предыдущей неделе ✅
   - Если данные не предзагружены, попап делает запрос к API ✅

### Тест 5: Fallback на API

**Шаги:**
1. Симулировать отсутствие предзагруженных данных (например, очистить `preloadedPopupData` в консоли)
2. Открыть попап для текущей недели
3. Проверить консоль:
   - Лог `[TASK-070] StagesModal: No preloaded data, loading from API` ✅
4. Проверить Network:
   - Есть запрос к API ✅
5. Проверить попап:
   - Данные загружены через API ✅
   - Попап работает корректно ✅

### Тест 6: Валидация данных

**Шаги:**
1. Симулировать невалидные предзагруженные данные (например, изменить структуру данных)
2. Открыть попап
3. Проверить консоль:
   - Лог `[TASK-070] StagesModal: Invalid preloaded data structure, falling back to API` ✅
4. Проверить попап:
   - Fallback на API работает ✅
   - Попап работает корректно ✅

### Тест 7: Производительность

**Шаги:**
1. Открыть DevTools → Network
2. Обновить страницу (F5)
3. Замерить время первого запроса:
   - Должно быть не более чем на 20% больше, чем до изменений ✅
4. Открыть попап для текущей недели:
   - Время открытия должно быть < 100ms (мгновенно) ✅
5. Открыть попап для предыдущей недели:
   - Время открытия должно быть < 100ms (если данные предзагружены) ✅
   - ИЛИ время открытия должно быть < 2 секунд (если данные загружаются через API) ✅

### Тест 8: Проверка тикетов в предзагруженных данных

**Шаги:**
1. Открыть попап StagesModal для текущей недели
2. Кликнуть на стадию с тикетами
3. Проверить консоль:
   - Лог `[TASK-070] StagesModal: Using preloaded tickets for stage [stageId]` ✅
   - Нет запроса к API для загрузки тикетов ✅
4. Проверить попап:
   - Тикеты отображаются мгновенно ✅
   - Тикеты соответствуют выбранной стадии ✅

**Повторить для CarryoverDurationModal:**
1. Открыть попап CarryoverDurationModal для текущей недели
2. Кликнуть на категорию с тикетами
3. Проверить консоль:
   - Лог `[TASK-070] CarryoverDurationModal: Using preloaded tickets for category [category]` ✅
   - Нет запроса к API ✅
4. Проверить попап:
   - Тикеты отображаются мгновенно ✅

---

## 📊 Метрики производительности

### До изменений (текущее состояние)

- Время первого запроса: ~2-5 секунд
- Время открытия попапа: ~1-3 секунды (загрузка данных)

### После изменений (ожидаемое)

- Время первого запроса: ~2.5-6 секунд (увеличение на 10-20%)
- Время открытия попапа (текущая неделя): < 100ms (мгновенно)
- Время открытия попапа (предыдущая неделя): < 100ms (если предзагружено) или ~1-3 секунды (если через API)

### Критерии успеха

- ✅ Время первого запроса увеличилось не более чем на 20%
- ✅ Попапы открываются мгновенно для текущей недели
- ✅ Попапы открываются мгновенно для предыдущей недели (если данные предзагружены)
- ✅ Пользовательский опыт улучшился (нет задержки при открытии попапов)

---

## 🔍 Детальная проверка работы попапов

### Проверка StagesModal

**Текущая реализация (строки ~163-188):**
- Функция `loadStages()` делает запрос с `includeNewTicketsByStages: true`
- При открытии попапа вызывается `loadStages()` через watch

**После изменений:**
- Проверка предзагруженных данных перед запросом к API
- Использование предзагруженных данных, если они валидны
- Fallback на API, если данных нет

**Проверка уровня 2 (список тикетов):**
- Функция `loadStageTickets()` (строка ~217) делает запрос с `includeNewTicketsByStages: true` и `includeTickets: true`
- После изменений: проверка тикетов в предзагруженных данных перед запросом

### Проверка CarryoverDurationModal

**Текущая реализация (строки ~173-189):**
- Функция `loadCategories()` делает запрос с `includeCarryoverTicketsByDuration: true`
- При открытии попапа вызывается `loadCategories()` через watch

**После изменений:**
- Проверка предзагруженных данных перед запросом к API
- Использование предзагруженных данных, если они валидны
- Fallback на API, если данных нет

**Проверка уровня 2 (список тикетов):**
- Функция `loadCategoryTickets()` (строка ~218) делает запрос с `includeCarryoverTicketsByDuration: true` и `includeTickets: true`
- После изменений: проверка тикетов в предзагруженных данных перед запросом

### Проверка ResponsibleModal

**Текущая реализация:**
- Попап получает данные через props: `responsibleCreatedThisWeek`, `responsibleCreatedOtherWeek`
- Для текущей недели данные уже загружены в первом запросе
- Для предыдущей недели попап делает запрос при открытии (если данные не предзагружены)

**После изменений:**
- Для текущей недели: данные уже доступны через props (без изменений)
- Для предыдущей недели: если данные предзагружены, передавать их через props
- Если данных нет, попап делает запрос к API (существующая логика)

**Проверка функций:**
- `loadGradationTicketsFromAPI()` (строка ~738) использует `props.weekStartUtc` и `props.weekEndUtc`
- Убедиться, что для предыдущей недели используются правильные параметры

---

## 💻 Примеры кода с реальными строками

### Пример 1: Обновление loadData() в GraphAdmissionClosureDashboard.vue

**Текущий код (строки 279-288):**
```javascript
const [_, result] = await Promise.all([
  minLoadingTime,
  fetchAdmissionClosureStats({
    product: '1C',
    periodMode: 'weeks',
    weekStartUtc,
    weekEndUtc,
    includeTickets: true // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
  })
]);
```

**Обновлённый код (TASK-070):**
```javascript
const [_, result] = await Promise.all([
  minLoadingTime,
  fetchAdmissionClosureStats({
    product: '1C',
    periodMode: 'weeks',
    weekStartUtc,
    weekEndUtc,
    includeTickets: true,                    // TASK-047: Включаем тикеты для вкладки "По сотрудникам"
    includeNewTicketsByStages: true,          // TASK-070: Предзагрузка для StagesModal
    includeCarryoverTicketsByDuration: true   // TASK-070: Предзагрузка для CarryoverDurationModal
  })
]);
```

**Код для сохранения предзагруженных данных (после строки 293):**
```javascript
// TASK-070: Сохраняем предзагруженные данные для текущей недели
if (data.newTicketsByStages) {
  preloadedPopupData.value.currentWeek.newTicketsByStages = data.newTicketsByStages;
  console.log('[TASK-070] Preloaded newTicketsByStages for current week:', data.newTicketsByStages.length, 'stages');
}
if (data.carryoverTicketsByDuration) {
  preloadedPopupData.value.currentWeek.carryoverTicketsByDuration = data.carryoverTicketsByDuration;
  console.log('[TASK-070] Preloaded carryoverTicketsByDuration for current week:', data.carryoverTicketsByDuration.length, 'categories');
}
// TASK-070: Сохраняем данные для ResponsibleModal (уже загружены в первом запросе)
if (data.responsibleCreatedThisWeek) {
  preloadedPopupData.value.currentWeek.responsibleCreatedThisWeek = data.responsibleCreatedThisWeek;
}
if (data.responsibleCreatedOtherWeek) {
  preloadedPopupData.value.currentWeek.responsibleCreatedOtherWeek = data.responsibleCreatedOtherWeek;
}
```

### Пример 2: Обновление watch в StagesModal.vue

**Текущий код (строки ~299-310):**
```javascript
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    loadStages();
  }
});
```

**Обновлённый код (TASK-070):**
```javascript
// TASK-070: Обновлённый watch с поддержкой предзагруженных данных
watch(() => props.isVisible, async (isVisible) => {
  if (isVisible) {
    // Сброс состояния
    popupLevel.value = 1;
    selectedStage.value = null;
    tickets.value = [];
    error.value = null;
    
    // TASK-070: Проверяем, есть ли предзагруженные данные
    if (props.preloadedData && Array.isArray(props.preloadedData) && props.preloadedData.length > 0) {
      // Валидация структуры данных
      const isValid = props.preloadedData.every(stage => 
        typeof stage.stageId === 'string' &&
        typeof stage.stageName === 'string' &&
        typeof stage.count === 'number'
      );
      
      if (isValid) {
        console.log('[TASK-070] StagesModal: Using preloaded data, stages count:', props.preloadedData.length);
        stages.value = props.preloadedData;
        isLoadingStages.value = false;
      } else {
        console.warn('[TASK-070] StagesModal: Invalid preloaded data structure, falling back to API');
        await loadStages();
      }
    } else {
      console.log('[TASK-070] StagesModal: No preloaded data, loading from API');
      await loadStages();
    }
  }
}, { immediate: false });
```

### Пример 3: Оптимизация loadStageTickets() в StagesModal.vue

**Текущий код (строки 217-269):**
```javascript
async function loadStageTickets(stageId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    if (!props.weekStartUtc || !props.weekEndUtc) {
      throw new Error('Не указаны границы недели');
    }
    
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeNewTicketsByStages: true,
      includeTickets: true
    });
    
    const stage = response.data.newTicketsByStages?.find(s => s.stageId === stageId);
    const stageTickets = stage?.tickets || [];
    // ... остальной код
  } catch (err) {
    // ... обработка ошибок
  }
}
```

**Обновлённый код (TASK-070):**
```javascript
async function loadStageTickets(stageId) {
  isLoadingTickets.value = true;
  error.value = null;
  
  try {
    // TASK-070: Проверяем, есть ли тикеты в предзагруженных данных
    const preloadedStage = stages.value.find(s => s.stageId === stageId);
    if (preloadedStage && Array.isArray(preloadedStage.tickets) && preloadedStage.tickets.length > 0) {
      console.log('[TASK-070] StagesModal: Using preloaded tickets for stage', stageId, 'count:', preloadedStage.tickets.length);
      
      // Используем предзагруженные тикеты
      const stageTickets = preloadedStage.tickets;
      
      // Обогащаем данные через prepareTicketsForDisplay
      try {
        const { prepareTicketsForDisplay } = await import('@/utils/graph-state/ticketListUtils.js');
        tickets.value = await prepareTicketsForDisplay(stageTickets, null, null);
      } catch (prepareError) {
        console.error('[TASK-070] StagesModal: Error preparing tickets:', prepareError);
        tickets.value = stageTickets; // Fallback
      }
      
      isLoadingTickets.value = false;
      return; // Выходим, не делая запрос к API
    }
    
    // Если тикеты не предзагружены, загружаем через API (существующая логика)
    console.log('[TASK-070] StagesModal: Tickets not preloaded, loading from API for stage', stageId);
    
    if (!props.weekStartUtc || !props.weekEndUtc) {
      throw new Error('Не указаны границы недели');
    }
    
    const response = await fetchAdmissionClosureStats({
      product: '1C',
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      includeNewTicketsByStages: true,
      includeTickets: true
    });
    
    const stage = response.data.newTicketsByStages?.find(s => s.stageId === stageId);
    const stageTickets = stage?.tickets || [];
    
    // ... остальной код (обогащение данных)
  } catch (err) {
    error.value = err.message || 'Ошибка загрузки тикетов';
    console.error('[TASK-070] StagesModal: Error loading tickets:', err);
    tickets.value = [];
  } finally {
    isLoadingTickets.value = false;
  }
}
```

### Пример 4: Проверка ResponsibleModal для предыдущей недели

**Текущая реализация:**
- Попап получает `weekStartUtc` и `weekEndUtc` через props
- При открытии попапа для предыдущей недели попап делает запрос к API (если данные не переданы через props)

**Проверка функции loadGradationTicketsFromAPI() (строка ~738):**
```javascript
async function loadGradationTicketsFromAPI(gradation) {
  // ...
  const response = await fetchAdmissionClosureStats({
    product: '1C',
    weekStartUtc: props.weekStartUtc,  // ⚠️ Должен использовать weekStartUtc из selectedWeekMeta
    weekEndUtc: props.weekEndUtc,      // ⚠️ Должен использовать weekEndUtc из selectedWeekMeta
    includeTickets: true
  });
  // ...
}
```

**Проверка:**
- Убедиться, что `props.weekStartUtc` и `props.weekEndUtc` передаются корректно из `selectedWeekMeta`
- Для предыдущей недели эти значения должны соответствовать предыдущей неделе
- Проверить, что попап использует правильные параметры для запроса

**Добавить логирование в ResponsibleModal:**
```javascript
// TASK-070: Добавить логирование при открытии попапа (в watch для props.isVisible, строка ~942)
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    console.log('[TASK-070] ResponsibleModal opened for week', props.weekNumber);
    console.log('[TASK-070] ResponsibleModal data:', {
      weekStartUtc: props.weekStartUtc,
      weekEndUtc: props.weekEndUtc,
      responsibleCreatedThisWeek: props.responsibleCreatedThisWeek?.length || 0,
      responsibleCreatedOtherWeek: props.responsibleCreatedOtherWeek?.length || 0,
      closedTicketsCreatedThisWeek: props.closedTicketsCreatedThisWeek,
      closedTicketsCreatedOtherWeek: props.closedTicketsCreatedOtherWeek
    });
    
    // Проверка: для предыдущей недели данные могут отсутствовать
    const isCurrentWeek = props.weekNumber === chartMeta.value?.weekNumber;
    if (!isCurrentWeek) {
      console.log('[TASK-070] ResponsibleModal: Previous week detected, will load data via API if not preloaded');
    }
  } else {
    // Сброс состояния при закрытии (существующий код)
    popupLevel.value = 0;
    activeTab.value = 'categories';
    selectedCategory.value = null;
    selectedEmployee.value = null;
    selectedGradation.value = null;
    tickets.value = [];
    error.value = null;
    enrichedResponsible.value = [];
    enrichedEmployeesList.value = [];
  }
});
```

---

## 📋 Чек-лист реализации

### Этап 1: Обновление GraphAdmissionClosureDashboard.vue

- [ ] Добавить ref `preloadedPopupData` (после строки ~187)
- [ ] Обновить параметры первого запроса (строка ~281):
  - [ ] Добавить `includeNewTicketsByStages: true`
  - [ ] Добавить `includeCarryoverTicketsByDuration: true`
- [ ] Сохранить предзагруженные данные для текущей недели (после строки ~293)
- [ ] Добавить computed `previousWeekMetaForPreload` (после строки ~187)
- [ ] Добавить параллельную загрузку данных для предыдущей недели (после строки ~309)
- [ ] Добавить вспомогательные функции для получения предзагруженных данных (после функции loadData)
- [ ] Обновить template для передачи предзагруженных данных в попапы (строки ~130-144)

### Этап 2: Обновление StagesModal.vue

- [ ] Добавить prop `preloadedData` (строка ~124)
- [ ] Обновить watch для использования предзагруженных данных (строка ~299)
- [ ] Добавить валидацию предзагруженных данных
- [ ] Добавить watch для обновления данных при изменении недели
- [ ] Оптимизировать `loadStageTickets()` для использования предзагруженных тикетов (строка ~217)

### Этап 3: Обновление CarryoverDurationModal.vue

- [ ] Добавить prop `preloadedData` (строка ~124)
- [ ] Обновить watch для использования предзагруженных данных (строка ~297)
- [ ] Добавить валидацию предзагруженных данных
- [ ] Добавить watch для обновления данных при изменении недели
- [ ] Оптимизировать `loadCategoryTickets()` для использования предзагруженных тикетов (строка ~218)

### Этап 4: Проверка ResponsibleModal.vue

- [ ] Проверить работу для текущей недели (данные уже загружены)
- [ ] Проверить работу для предыдущей недели (запрос к API с правильными параметрами)
- [ ] Добавить логирование для отладки (watch для props.isVisible, строка ~942)
- [ ] Проверить, что `loadGradationTicketsFromAPI()` (строка ~738) использует правильные параметры недели
- [ ] Проверить, что попап корректно определяет текущую/предыдущую неделю по `props.weekNumber`
- [ ] Проверить, что вкладка "По категориям" работает для предыдущей недели
- [ ] Проверить, что вкладка "По сотрудникам" работает для предыдущей недели

### Этап 5: Тестирование

- [ ] Протестировать предзагрузку данных для текущей недели
- [ ] Протестировать предзагрузку данных для предыдущей недели
- [ ] Протестировать открытие попапов для текущей недели
- [ ] Протестировать открытие попапов для предыдущей недели
- [ ] Протестировать fallback на API
- [ ] Протестировать валидацию данных
- [ ] Протестировать производительность

---

## 🚨 Важные замечания

### Обработка ошибок предзагрузки

**Сценарий:** Предзагрузка данных для предыдущей недели не удалась.

**Решение:**
- Не прерывать работу приложения
- Логировать предупреждение (не ошибку)
- Попап должен работать через fallback на API

**Пример обработки:**
```javascript
fetchAdmissionClosureStats({...})
  .then(result => {
    // Сохраняем данные
  })
  .catch(err => {
    console.warn('[TASK-070] Failed to preload previous week data (non-critical):', err);
    // Не критично, данные загрузятся при открытии попапа
    // НЕ устанавливаем error.value, чтобы не показывать ошибку пользователю
  });
```

### Проверка соответствия данных неделе

**Проблема:** Предзагруженные данные могут не соответствовать выбранной неделе.

**Решение:**
- Проверять `weekNumber` в предзагруженных данных
- Сравнивать с `props.weekNumber` в попапе
- Если не совпадает, использовать fallback на API

**Пример:**
```javascript
function getPreloadedStagesData(weekMeta) {
  if (!weekMeta || !chartMeta.value) {
    return null;
  }
  
  const isCurrentWeek = weekMeta.weekNumber === chartMeta.value.weekNumber;
  const data = isCurrentWeek 
    ? preloadedPopupData.value.currentWeek.newTicketsByStages
    : preloadedPopupData.value.previousWeek.newTicketsByStages;
  
  // Дополнительная проверка: убедиться, что данные соответствуют неделе
  if (data && Array.isArray(data) && data.length > 0) {
    // Можно добавить проверку метаданных в данных (если они есть)
    return data;
  }
  
  return null;
}
```

### Производительность и оптимизация

**Рекомендации:**
1. **Параллельная загрузка:** Загрузка данных для предыдущей недели должна быть неблокирующей
2. **Ленивая загрузка тикетов:** Если тикеты не включены в предзагруженные данные, загружать их при клике на стадию/категорию
3. **Кеширование:** Рассмотреть кеширование предзагруженных данных в localStorage (опционально)

**Мониторинг:**
- Логировать время первого запроса
- Логировать время открытия попапов
- Сравнивать с метриками до изменений

---

**История правок:**
- 2025-12-23 20:43 (UTC+3, Брест): Создана задача TASK-070
- 2025-12-23 20:52 (UTC+3, Брест): Добавлены детальные инструкции по реализации, тестированию, примеры кода с реальными строками, схемы потока данных, обработка edge cases, валидация данных, оптимизация производительности

