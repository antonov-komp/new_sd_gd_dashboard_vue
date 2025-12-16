# TASK-044-03: Обновление графиков для отображения трёх категорий

**Дата создания:** 2025-12-16 11:01 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 3 из TASK-044

## Цель этапа

Обновить графики (линейный, столбчатый, круговая диаграмма) и summary-карточки в модуле «График приёма и закрытий сектора 1С» для отображения трёх категорий тикетов: Новые, Закрытые и Переходящие.

## Контекст

- **Текущее состояние:** Графики отображают только две категории (Новые и Закрытые)
- **Требуется:** Добавить третью категорию (Переходящие) на все графики и summary-карточки
- **Зависимости:** 
  - TASK-044-01: Реализация логики переходящих тикетов на бэкенде (должна быть выполнена)
  - TASK-044-02: Расширение API для возврата переходящих тикетов (должна быть выполнена)

## Задачи этапа

### 1) Обновление сервиса для загрузки данных
- Расширить `admissionClosureService.js` для поддержки `includeCarryoverTickets`
- Обновить функцию `fetchAdmissionClosureStats()` для передачи параметра в API
- Обработать ответ API с полем `carryoverTickets` и `series.carryover[]`

### 2) Обновление линейного графика
- Добавить третью линию для переходящих тикетов
- Обновить цвета и легенды
- Обновить тултипы для отображения всех трёх категорий

### 3) Обновление столбчатого графика
- Добавить третий столбец для переходящих тикетов
- Обновить цвета и легенды
- Обновить тултипы

### 4) Обновление круговой диаграммы
- Добавить третий сектор для переходящих тикетов
- Обновить цвета и легенды
- Обновить подписи

### 5) Обновление summary-карточек
- Добавить третью карточку «Переходящие за неделю»
- Обновить визуальное оформление
- Добавить обработчик клика для открытия попапа переходящих тикетов

### 6) Обновление обработчика кликов на графике
- Добавить обработку клика на «Переходящие» для открытия попапа
- Эмитить событие `open-carryover` при клике на переходящие тикеты

## Технические требования

### Обновление сервиса

**Файл:** `vue-app/src/services/graph-admission-closure/admissionClosureService.js`

```javascript
export async function fetchAdmissionClosureStats(params = {}) {
  const {
    endpoint = DEFAULT_ENDPOINT,
    product = '1C',
    weekStartUtc = null,
    weekEndUtc = null,
    useCache = true,
    forceRefresh = false,
    includeTickets = false,
    includeNewTicketsByStages = false,
    includeCarryoverTickets = true  // новый параметр, по умолчанию true
  } = params;

  const body = {
    product,
    weekStartUtc,
    weekEndUtc,
    useCache,
    forceRefresh,
    includeTickets,
    includeNewTicketsByStages,
    includeCarryoverTickets  // передать в API
  };

  // ... остальной код ...
}
```

### Обновление линейного графика

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`

```javascript
const chartData = computed(() => {
  const data = props.data;
  
  return {
    labels: [props.meta?.weekNumber || 'Неделя'],
    datasets: [
      {
        label: 'Новые',
        data: data.series?.new || [0],
        borderColor: '#007bff',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        tension: 0.4
      },
      {
        label: 'Закрытые',
        data: data.series?.closed || [0],
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.4
      },
      {
        label: 'Переходящие',  // новый dataset
        data: data.series?.carryover || [0],
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        tension: 0.4
      }
    ]
  };
});
```

### Обновление столбчатого графика

```javascript
const chartData = computed(() => {
  const data = props.data;
  
  return {
    labels: [props.meta?.weekNumber || 'Неделя'],
    datasets: [
      {
        label: 'Новые',
        data: data.series?.new || [0],
        backgroundColor: '#007bff'
      },
      {
        label: 'Закрытые',
        data: data.series?.closed || [0],
        backgroundColor: '#28a745'
      },
      {
        label: 'Переходящие',  // новый dataset
        data: data.series?.carryover || [0],
        backgroundColor: '#ff9800'
      }
    ]
  };
});
```

### Обновление круговой диаграммы

```javascript
const chartData = computed(() => {
  const data = props.data;
  
  return {
    labels: ['Новые', 'Закрытые', 'Переходящие'],
    datasets: [
      {
        data: [
          data.newTickets || 0,
          data.closedTickets || 0,
          data.carryoverTickets || 0  // новое значение
        ],
        backgroundColor: [
          '#007bff',  // Новые
          '#28a745',  // Закрытые
          '#ff9800'   // Переходящие
        ]
      }
    ]
  };
});
```

### Обновление summary-карточек

```vue
<section class="ac-chart__summary">
  <div class="summary-card summary-card--new">
    <div class="summary-card__label">Новые за неделю</div>
    <div class="summary-card__value">{{ data.newTickets ?? 0 }}</div>
  </div>
  <div class="summary-card summary-card--closed">
    <div class="summary-card__label">Закрытые за неделю</div>
    <div class="summary-card__value">{{ data.closedTickets ?? 0 }}</div>
  </div>
  <div class="summary-card summary-card--carryover">
    <div class="summary-card__label">Переходящие</div>
    <div class="summary-card__value">{{ data.carryoverTickets ?? 0 }}</div>
  </div>
  <!-- ... остальные карточки ... -->
</section>
```

### Обновление обработчика кликов

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
      if ((props.data?.responsible || []).length > 0) {
        emit('open-responsible');
      }
    } else if (dataset.label === 'Новые') {
      if ((props.data?.newTickets || 0) > 0) {
        emit('open-stages');
      }
    } else if (dataset.label === 'Переходящие') {  // новый обработчик
      if ((props.data?.carryoverTickets || 0) > 0) {
        emit('open-carryover');
      }
    }
  },
  // ...
}));
```

## Ступенчатые подзадачи

1. **Обновление сервиса**
   - Расширить `admissionClosureService.js` для поддержки `includeCarryoverTickets`
   - Обновить нормализацию ответа API

2. **Обновление линейного графика**
   - Добавить третий dataset для переходящих тикетов
   - Обновить цвета и легенды
   - Обновить тултипы

3. **Обновление столбчатого графика**
   - Добавить третий dataset для переходящих тикетов
   - Обновить цвета и легенды
   - Обновить тултипы

4. **Обновление круговой диаграммы**
   - Добавить третий сектор для переходящих тикетов
   - Обновить цвета и легенды
   - Обновить подписи

5. **Обновление summary-карточек**
   - Добавить третью карточку «Переходящие»
   - Обновить стили для новой карточки
   - Добавить обработчик клика

6. **Обновление обработчика кликов**
   - Добавить обработку клика на «Переходящие»
   - Эмитить событие `open-carryover`

7. **Интеграция в дашборд**
   - В `GraphAdmissionClosureDashboard.vue` добавить обработчик `@open-carryover`
   - Подготовить место для будущего попапа `CarryoverDurationModal`

## Критерии приёмки этапа

- [ ] Сервис `admissionClosureService.js` поддерживает `includeCarryoverTickets`
- [ ] На линейном графике отображаются три линии (Новые, Закрытые, Переходящие)
- [ ] На столбчатом графике отображаются три столбца (Новые, Закрытые, Переходящие)
- [ ] На круговой диаграмме отображаются три сектора (Новые, Закрытые, Переходящие)
- [ ] Summary-карточки обновлены: три карточки вместо двух
- [ ] Цвета обновлены: Новые (синий), Закрытые (зелёный), Переходящие (оранжевый)
- [ ] Тултипы показывают значения для всех трёх категорий
- [ ] При клике на «Переходящие» эмитится событие `open-carryover`
- [ ] Легенды обновлены для всех трёх категорий
- [ ] Визуальное оформление соответствует существующему стилю

## Дополнительные уточнения

### Цвета для категорий

- **Новые:** синий `#007bff` (как сейчас)
- **Закрытые:** зелёный `#28a745` (как сейчас)
- **Переходящие:** оранжевый `#ff9800` (новый цвет)

### Обработка пустых данных

- Если `carryoverTickets` отсутствует или равен 0, отображать 0
- Если `series.carryover[]` отсутствует, использовать `[0]`
- Не ломать графики при отсутствии данных

### Совместимость

- Не ломать текущую функциональность для новых и закрытых тикетов
- Обратная совместимость с существующим кодом
- Если API не возвращает `carryoverTickets`, графики работают как раньше

## История правок

- 2025-12-16 11:01 (UTC+3, Брест): Создан этап 3 задачи TASK-044

