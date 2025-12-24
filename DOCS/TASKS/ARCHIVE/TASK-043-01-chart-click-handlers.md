# TASK-043-01: Разделение обработчиков кликов на графике для «Новых» и «Закрытых» тикетов

**Дата создания:** 2025-12-16 13:28 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 1 из TASK-043

## Цель этапа
Разделить обработчики кликов на графике так, чтобы клик на «Закрытые» открывал `ResponsibleModal`, а клик на «Новые» открывал новый `StagesModal`.

## Контекст
- **Текущее состояние:** В `GraphAdmissionClosureChart.vue` обработчик `onClick` открывает только `ResponsibleModal` для закрытых тикетов
- **Проблема:** Нет различия между кликом на «Новые» и «Закрытые» — оба открывают один попап
- **Требуется:** Определять, на какой dataset кликнули, и открывать соответствующий попап

## Задачи этапа

### 1) Анализ текущей реализации
- Изучить `GraphAdmissionClosureChart.vue` и обработчик `onClick`
- Понять структуру данных графика (datasets)
- Определить, как различить клик на «Новые» и «Закрытые»

### 2) Модификация обработчика кликов
- Изменить `onClick` для определения `datasetIndex`
- Проверить `dataset.label` для определения типа («Новые» или «Закрытые»)
- Эмитить разные события: `open-responsible` или `open-stages`

### 3) Обновление родительского компонента
- В `GraphAdmissionClosureDashboard.vue` добавить обработчик `@open-stages`
- Добавить состояние `showStagesModal`
- Подготовить место для будущего компонента `StagesModal`

## Технические требования

### Текущая реализация

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`

```javascript
const chartOptions = computed(() => ({
  // ...
  onClick: () => {
    if ((props.data?.responsible || []).length > 0) {
      emit('open-responsible');
    }
  },
  // ...
}));
```

**Проблема:** Обработчик не различает, на какой dataset кликнули.

### Новая реализация

```javascript
const chartOptions = computed(() => ({
  // ...
  onClick: (event, elements, chart) => {
    if (elements.length === 0) {
      return;
    }
    
    const element = elements[0];
    const datasetIndex = element.datasetIndex;
    const dataset = chart.data.datasets[datasetIndex];
    
    if (!dataset || !dataset.label) {
      return;
    }
    
    // Определяем тип по label
    if (dataset.label === 'Закрытые') {
      // Проверяем, есть ли данные для закрытых
      if ((props.data?.responsible || []).length > 0) {
        emit('open-responsible');
      }
    } else if (dataset.label === 'Новые') {
      // Проверяем, есть ли новые тикеты
      if ((props.data?.newTickets || 0) > 0) {
        emit('open-stages');
      }
    }
  },
  // ...
}));
```

### Обновление родительского компонента

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureDashboard.vue`

```vue
<GraphAdmissionClosureChart
  :meta="chartMeta"
  :data="chartData"
  @open-responsible="showResponsibleModal = true"
  @open-stages="showStagesModal = true"
/>

<ResponsibleModal
  :is-visible="showResponsibleModal"
  :responsible="chartData.responsible || []"
  :week-start-utc="chartMeta?.weekStartUtc || null"
  :week-end-utc="chartMeta?.weekEndUtc || null"
  @close="showResponsibleModal = false"
/>

<!-- TODO: Добавить StagesModal после реализации этапа 3 -->
<!-- <StagesModal
  :is-visible="showStagesModal"
  :stages="chartData.newTicketsByStages || []"
  :week-start-utc="chartMeta?.weekStartUtc || null"
  :week-end-utc="chartMeta?.weekEndUtc || null"
  @close="showStagesModal = false"
/> -->
```

```javascript
const showResponsibleModal = ref(false);
const showStagesModal = ref(false);
```

## Ступенчатые подзадачи

1. **Анализ текущего кода**
   - Изучить `GraphAdmissionClosureChart.vue`
   - Понять структуру `chartOptions.onClick`
   - Изучить документацию Chart.js для обработчиков кликов

2. **Модификация обработчика кликов**
   - Изменить сигнатуру `onClick` для получения `elements` и `chart`
   - Добавить проверку `elements.length > 0`
   - Извлечь `datasetIndex` из первого элемента
   - Получить `dataset` по индексу
   - Проверить `dataset.label` и эмитить соответствующее событие

3. **Обновление родительского компонента**
   - Добавить обработчик `@open-stages` в `GraphAdmissionClosureChart`
   - Добавить состояние `showStagesModal`
   - Добавить комментарий для будущего `StagesModal`

4. **Тестирование**
   - Проверить клик на «Закрытые» (должен открыть `ResponsibleModal`)
   - Проверить клик на «Новые» (должен эмитить `open-stages`)
   - Проверить клик вне графика (не должен открывать попапы)

## Критерии приёмки этапа

- [ ] При клике на «Закрытые» открывается `ResponsibleModal` (как раньше)
- [ ] При клике на «Новые» эмитится событие `open-stages`
- [ ] При клике вне графика ничего не происходит
- [ ] Обработчик корректно определяет dataset по клику
- [ ] Проверка наличия данных перед открытием попапа работает

## Дополнительные уточнения

### Обработка edge cases
- Если `elements.length === 0` — ничего не делать
- Если `dataset` не найден — ничего не делать
- Если `dataset.label` не соответствует ожидаемым — ничего не делать
- Если данных нет (count = 0) — не открывать попап

### Совместимость
- Не ломать текущую функциональность для «Закрытые»
- Обратная совместимость с существующим кодом

## История правок

- 2025-12-16 13:28 (UTC+3, Брест): Создан этап 1 задачи TASK-043

