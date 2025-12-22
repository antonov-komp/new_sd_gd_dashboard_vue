# TASK-056-01: Улучшение визуализации линий графика

**Дата создания:** 2025-12-17 16:42 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Родительская задача:** [TASK-056: Улучшение дизайна линейных графиков](./TASK-056-line-charts-design-improvements.md)  
**Этап:** 1/7

---

## 📋 Описание

Улучшить визуализацию линий линейных графиков модуля «График приёма и закрытий сектора 1С»: изменить толщину линий, увеличить плавность кривых, добавить точки на линиях и градиенты под основными линиями.

---

## 🎯 Контекст

**Текущее состояние:**
- Линии графика имеют базовую толщину (по умолчанию Chart.js)
- Используется `tension: 0.3` для скругления линий
- Нет точек на линиях
- Нет градиентов под линиями
- Пунктирные линии используют стиль `[5, 5]`

**Проблема:**
- Линии выглядят плоскими, нет визуальной глубины
- Сложно точно определить значения на графике
- Нет визуального выделения основных серий

**Требуемое состояние:**
- Основные линии: толщина `3px`, `tension: 0.4`
- Вспомогательные линии: толщина `2px`, пунктир `[8, 4]`
- Точки на линиях (появляются при hover)
- Градиенты под основными линиями

---

## 🔧 Технические требования

### 1. Обновление толщины и стилей линий

**Основные линии** (Новые, Закрытые все, Переходящие все):
- Толщина: `borderWidth: 3`
- Скругление: `tension: 0.4`
- ✅ **Факт из TASK-053:** В месячном режиме уже используется `tension: 0.4` (LineChartMonths.vue)

**Вспомогательные линии** (созданы этой/другой неделей):
- Толщина: `borderWidth: 2`
- Скругление: `tension: 0.4`
- Пунктир: `borderDash: [8, 4]` (вместо `[5, 5]`)

### 2. Добавление точек на линиях

**Настройки точек:**
- По умолчанию: `pointRadius: 0` (скрыты)
- При hover: `pointHoverRadius: 5` для основных линий, `4` для вспомогательных
- Цвет точек: соответствует цвету линии (`pointBackgroundColor`)
- Обводка точек: белая (`#ffffff`), ширина `2px` (`pointHoverBorderWidth: 2`)

**Применение:**
- Все серии должны иметь точки
- Точки появляются только при наведении курсора

### 3. Реализация градиентов под линиями

**Градиенты для основных линий:**
- Применять только к основным линиям (Новые, Закрытые все, Переходящие все)
- Градиент от цвета линии (opacity 0.3) до прозрачного
- Направление: вертикально (от низа к верху)
- Вспомогательные линии без заливки (`fill: false`)

**Реализация:**
- ✅ Использовать существующие градиенты из `chart-config.js` (`chartGradients.primary()`, `chartGradients.success()`)
- Или создать универсальную функцию для всех серий
- Градиенты должны создаваться динамически на основе `chartArea`

---

## 📝 Ступенчатые подзадачи

### Шаг 1: Обновить конфигурацию линий

1. **Открыть файл:**
   - `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`

2. **Обновить datasets для основных линий:**
   ```javascript
   {
     label: 'Новые',
     data: newSeries,
     backgroundColor: chartColors.primary,
     borderColor: chartColors.primary,
     borderWidth: 3, // Увеличена толщина
     tension: 0.4, // Увеличено скругление
     fill: true, // Включена заливка для градиента
     // ... остальные настройки
   }
   ```

3. **Обновить datasets для вспомогательных линий:**
   ```javascript
   {
     label: 'Закрытые (созданы этой неделей)',
     data: closedCreatedThisWeekSeries,
     backgroundColor: chartColors.successLight,
     borderColor: chartColors.successLight,
     borderWidth: 2, // Уменьшена толщина
     tension: 0.4,
     borderDash: [8, 4], // Обновлён стиль пунктира
     fill: false, // Без заливки
     // ... остальные настройки
   }
   ```

### Шаг 2: Добавить точки на линиях

1. **Добавить настройки точек для всех серий:**
   ```javascript
   {
     // ... существующие настройки
     pointRadius: 0, // Скрыты по умолчанию
     pointHoverRadius: 5, // Для основных линий (или 4 для вспомогательных)
     pointHoverBorderWidth: 2,
     pointHoverBorderColor: '#ffffff',
     pointBackgroundColor: chartColors.primary, // Соответствует цвету линии
   }
   ```

2. **Применить к обоим графикам:**
   - Левый график (Новые и Закрытые)
   - Правый график (Переходящие)

### Шаг 3: Реализовать градиенты

1. **Проверить существующие градиенты:**
   - Открыть `vue-app/src/utils/chart-config.js`
   - Проверить наличие `chartGradients.primary()` и `chartGradients.success()`
   - **Важно:** Существующие градиенты используют фиксированную высоту (400px), нужно адаптировать для динамической высоты

2. **Создать универсальную функцию для градиентов:**
   ```javascript
   /**
    * Создаёт градиент для заливки под линией графика
    * 
    * @param {CanvasRenderingContext2D} ctx - Контекст canvas
    * @param {Object} chartArea - Область графика {top, bottom, left, right}
    * @param {string} color - Цвет линии в формате hex (#007bff)
    * @param {number} opacityStart - Начальная прозрачность (0-1), по умолчанию 0.3
    * @param {number} opacityEnd - Конечная прозрачность (0-1), по умолчанию 0
    * @returns {CanvasGradient} Градиент для использования в backgroundColor
    */
   function createGradient(ctx, chartArea, color, opacityStart = 0.3, opacityEnd = 0) {
     if (!chartArea) {
       return color; // Fallback если chartArea недоступен
     }
     
     // Конвертируем hex цвет в rgba
     const hexToRgba = (hex, alpha) => {
       const r = parseInt(hex.slice(1, 3), 16);
       const g = parseInt(hex.slice(3, 5), 16);
       const b = parseInt(hex.slice(5, 7), 16);
       return `rgba(${r}, ${g}, ${b}, ${alpha})`;
     };
     
     const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
     gradient.addColorStop(0, hexToRgba(color, opacityStart)); // Внизу: opacity 0.3
     gradient.addColorStop(1, hexToRgba(color, opacityEnd)); // Вверху: прозрачный
     
     return gradient;
   }
   ```

3. **Применить градиенты к основным линиям в computed:**
   ```javascript
   // В newClosedChartData computed
   const newClosedChartData = computed(() => {
     const labels = getWeekLabels();
     // ... получение серий данных ...
     
     return {
       labels,
       datasets: [
         {
           label: 'Новые',
           data: newSeries,
           backgroundColor: (context) => {
             const chart = context.chart;
             const {ctx, chartArea} = chart;
             if (!chartArea) {
               // Fallback: возвращаем цвет с прозрачностью для заливки
               return 'rgba(0, 123, 255, 0.1)';
             }
             return createGradient(ctx, chartArea, chartColors.primary);
           },
           borderColor: chartColors.primary,
           borderWidth: 3,
           tension: 0.4,
           fill: true, // Включена заливка
           pointRadius: 0,
           pointHoverRadius: 5,
           pointHoverBorderWidth: 2,
           pointHoverBorderColor: '#ffffff',
           pointBackgroundColor: chartColors.primary
         },
         {
           label: 'Закрытые (все)',
           data: closedSeries,
           backgroundColor: (context) => {
             const chart = context.chart;
             const {ctx, chartArea} = chart;
             if (!chartArea) {
               return 'rgba(40, 167, 69, 0.1)';
             }
             return createGradient(ctx, chartArea, chartColors.success);
           },
           borderColor: chartColors.success,
           borderWidth: 3,
           tension: 0.4,
           fill: true,
           pointRadius: 0,
           pointHoverRadius: 5,
           pointHoverBorderWidth: 2,
           pointHoverBorderColor: '#ffffff',
           pointBackgroundColor: chartColors.success
         },
         // Вспомогательные линии БЕЗ градиентов
         {
           label: 'Закрытые (созданы этой неделей)',
           data: closedCreatedThisWeekSeries,
           backgroundColor: chartColors.successLight,
           borderColor: chartColors.successLight,
           borderWidth: 2,
           tension: 0.4,
           borderDash: [8, 4],
           fill: false, // Без заливки
           pointRadius: 0,
           pointHoverRadius: 4,
           pointHoverBorderWidth: 2,
           pointHoverBorderColor: '#ffffff',
           pointBackgroundColor: chartColors.successLight
         },
         // ... остальные вспомогательные линии
       ]
     };
   });
   ```

4. **Важные моменты при создании градиентов:**
   - Градиенты создаются динамически при каждом рендере графика
   - `chartArea` доступен только после инициализации графика
   - Использовать проверку `if (!chartArea)` для fallback
   - Градиенты кэшируются Chart.js автоматически при одинаковых параметрах
   - Для оптимизации можно кэшировать градиенты вручную (но обычно не требуется)

5. **Обработка edge cases:**
   - Если `chartArea` недоступен → использовать fallback цвет с прозрачностью
   - Если график перерисовывается → градиенты пересоздаются автоматически
   - Если данные пустые → градиенты всё равно создаются (но график не отображается)

---

## 🔍 Детали реализации

### Файлы для изменения

1. **`vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`**
   - Обновить `newClosedChartData` computed
   - Обновить `carryoverChartData` computed
   - Добавить настройки точек и градиентов

2. **`vue-app/src/utils/chart-config.js`** (опционально)
   - Расширить `chartGradients` для всех серий
   - Или создать универсальную функцию

### Применение к обоим графикам

**Левый график (Новые и Закрытые):**
- Новые: основные настройки (3px, градиент, точки)
- Закрытые (все): основные настройки
- Закрытые (созданы этой неделей): вспомогательные настройки (2px, пунктир, без градиента)
- Закрытые (созданы другой неделей): вспомогательные настройки

**Правый график (Переходящие):**
- Переходящие (все): основные настройки
- Переходящие (созданы этой неделей): вспомогательные настройки
- Переходящие (созданы другой неделей): вспомогательные настройки

### Обработка градиентов

**Важно:**
- Градиенты должны создаваться после инициализации графика (когда доступен `chartArea`)
- Использовать проверку `if (!chartArea) return fallbackColor`
- Кэшировать градиенты для производительности (если возможно)

---

## 💻 Примеры кода

### Полный пример обновлённой конфигурации datasets

**Важно:** Все изменения нужно применить в `newClosedChartData` и `carryoverChartData` computed свойствах.

```javascript
// Функция для создания градиента (добавить в script setup)
function createGradient(ctx, chartArea, color, opacityStart = 0.3, opacityEnd = 0) {
  if (!chartArea) {
    // Fallback: конвертируем hex в rgba с прозрачностью
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    return hexToRgba(color, opacityStart);
  }
  
  const hexToRgba = (hex, alpha) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };
  
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
  gradient.addColorStop(0, hexToRgba(color, opacityStart));
  gradient.addColorStop(1, hexToRgba(color, opacityEnd));
  
  return gradient;
}

// Обновлённый newClosedChartData computed
const newClosedChartData = computed(() => {
  const labels = getWeekLabels();
  
  const newSeries = Array.isArray(props.data.series?.new) && props.data.series.new.length > 0
    ? props.data.series.new
    : [props.data.newTickets ?? 0];
  
  const closedSeries = Array.isArray(props.data.series?.closed) && props.data.series.closed.length > 0
    ? props.data.series.closed
    : [props.data.closedTickets ?? 0];
  
  const closedCreatedThisWeekSeries = Array.isArray(props.data.series?.closedCreatedThisWeek) && props.data.series.closedCreatedThisWeek.length > 0
    ? props.data.series.closedCreatedThisWeek
    : [props.data.closedTicketsCreatedThisWeek ?? 0];
  
  const closedCreatedOtherWeekSeries = Array.isArray(props.data.series?.closedCreatedOtherWeek) && props.data.series.closedCreatedOtherWeek.length > 0
    ? props.data.series.closedCreatedOtherWeek
    : [props.data.closedTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      // Основная линия: Новые
      {
        label: 'Новые',
        data: newSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.primary);
        },
        borderColor: chartColors.primary,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.primary
      },
      // Основная линия: Закрытые (все)
      {
        label: 'Закрытые (все)',
        data: closedSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.success);
        },
        borderColor: chartColors.success,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.success
      },
      // Вспомогательная линия: Закрытые (созданы этой неделей)
      {
        label: 'Закрытые (созданы этой неделей)',
        data: closedCreatedThisWeekSeries,
        backgroundColor: chartColors.successLight,
        borderColor: chartColors.successLight,
        borderWidth: 2,
        tension: 0.4,
        borderDash: [8, 4], // Обновлённый стиль пунктира
        fill: false, // Без градиента
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.successLight
      },
      // Вспомогательная линия: Закрытые (созданы другой неделей)
      {
        label: 'Закрытые (созданы другой неделей)',
        data: closedCreatedOtherWeekSeries,
        backgroundColor: chartColors.warning,
        borderColor: chartColors.warning,
        borderWidth: 2,
        tension: 0.4,
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.warning
      }
    ]
  };
});

// Аналогично обновить carryoverChartData computed
const carryoverChartData = computed(() => {
  const labels = getWeekLabels();
  
  const carryoverSeries = Array.isArray(props.data.series?.carryover) && props.data.series.carryover.length > 0
    ? props.data.series.carryover
    : [props.data.carryoverTickets ?? 0];
  
  const carryoverCreatedThisWeekSeries = Array.isArray(props.data.series?.carryoverCreatedThisWeek) && props.data.series.carryoverCreatedThisWeek.length > 0
    ? props.data.series.carryoverCreatedThisWeek
    : [props.data.carryoverTicketsCreatedThisWeek ?? 0];
  
  const carryoverCreatedOtherWeekSeries = Array.isArray(props.data.series?.carryoverCreatedOtherWeek) && props.data.series.carryoverCreatedOtherWeek.length > 0
    ? props.data.series.carryoverCreatedOtherWeek
    : [props.data.carryoverTicketsCreatedOtherWeek ?? 0];

  return {
    labels,
    datasets: [
      // Основная линия: Переходящие (все)
      {
        label: 'Переходящие (все)',
        data: carryoverSeries,
        backgroundColor: (context) => {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return createGradient(ctx, chartArea, chartColors.carryover);
        },
        borderColor: chartColors.carryover,
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.carryover
      },
      // Вспомогательная линия: Переходящие (созданы этой неделей)
      {
        label: 'Переходящие (созданы этой неделей)',
        data: carryoverCreatedThisWeekSeries,
        backgroundColor: chartColors.carryoverLight,
        borderColor: chartColors.carryoverLight,
        borderWidth: 2,
        tension: 0.4,
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.carryoverLight
      },
      // Вспомогательная линия: Переходящие (созданы другой неделей)
      {
        label: 'Переходящие (созданы другой неделей)',
        data: carryoverCreatedOtherWeekSeries,
        backgroundColor: chartColors.carryoverDark,
        borderColor: chartColors.carryoverDark,
        borderWidth: 2,
        tension: 0.4,
        borderDash: [8, 4],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointBackgroundColor: chartColors.carryoverDark
      }
    ]
  };
});
```

### Обработка ошибок и edge cases

**1. Градиенты при отсутствии chartArea:**
```javascript
backgroundColor: (context) => {
  const chart = context.chart;
  const {ctx, chartArea} = chart;
  
  if (!chartArea) {
    // Fallback: используем цвет с прозрачностью
    // Это может произойти при первой инициализации или при изменении размера
    return 'rgba(0, 123, 255, 0.1)';
  }
  
  try {
    return createGradient(ctx, chartArea, chartColors.primary);
  } catch (error) {
    console.warn('[GraphAdmissionClosureChart] Error creating gradient:', error);
    return 'rgba(0, 123, 255, 0.1)'; // Fallback
  }
}
```

**2. Проверка данных перед созданием градиента:**
```javascript
// Убедиться, что данные не пустые
if (!newSeries || newSeries.length === 0) {
  // Градиент всё равно создастся, но график не отобразится
  // Это нормальное поведение
}
```

**3. Оптимизация производительности:**
- Chart.js автоматически кэширует градиенты при одинаковых параметрах
- Не нужно вручную кэшировать градиенты
- При изменении размера графика градиенты пересоздаются автоматически

---

## ✅ Критерии приёмки

- [ ] Основные линии имеют толщину `3px`
- [ ] Вспомогательные линии имеют толщину `2px`
- [ ] Все линии используют `tension: 0.4`
- [ ] Пунктирные линии используют стиль `[8, 4]`
- [ ] Точки скрыты по умолчанию (`pointRadius: 0`)
- [ ] Точки появляются при hover (радиус 5px для основных, 4px для вспомогательных)
- [ ] Точки имеют белую обводку (2px)
- [ ] Градиенты применены к основным линиям (Новые, Закрытые все, Переходящие все)
- [ ] Градиенты имеют opacity 0.3 внизу и прозрачный вверху
- [ ] Вспомогательные линии без градиентов (`fill: false`)
- [ ] Улучшения применены к обоим графикам (Новые/Закрытые и Переходящие)
- [ ] Графики работают корректно в обоих режимах (недели и месяцы)

---

## 🔗 Зависимости

**Зависит от:**
- Нет (это первый этап)

**Зависит от этого этапа:**
- [TASK-056-02: Улучшение tooltips](./TASK-056-02-tooltips-improvement.md) — может использовать улучшенные точки
- [TASK-056-06: Добавление анимаций](./TASK-056-06-animations.md) — будет использовать улучшенные линии

---

## 📝 История правок

- **2025-12-17 16:42 (UTC+3, Брест):** Создан этап TASK-056-01
  - Определены требования для улучшения визуализации линий
  - Зафиксированы технические детали и примеры кода
  - Добавлены критерии приёмки

---

## 💡 Примечания

- **Градиенты:** Использовать существующие из `chart-config.js` или создать универсальную функцию
- **Производительность:** Градиенты должны создаваться эффективно, избегать лишних перерисовок
- **Совместимость:** Проверить работу на разных версиях Chart.js
- **Тестирование:** Протестировать hover-эффекты для точек, проверить градиенты на разных размерах графика

## ⚠️ Возможные проблемы и решения

### Проблема 1: Градиенты не отображаются
**Причина:** `chartArea` недоступен при первой инициализации  
**Решение:** Использовать fallback цвет с прозрачностью, градиент создастся при следующем рендере

### Проблема 2: Градиенты выглядят неправильно
**Причина:** Неправильное направление градиента или неправильные координаты  
**Решение:** Проверить, что `chartArea.bottom` и `chartArea.top` используются правильно (вертикальный градиент)

### Проблема 3: Точки не появляются при hover
**Причина:** `pointHoverRadius` не настроен или равен 0  
**Решение:** Убедиться, что `pointHoverRadius: 5` для основных и `4` для вспомогательных линий

### Проблема 4: Пунктирные линии выглядят слишком часто
**Причина:** Старый стиль `[5, 5]`  
**Решение:** Обновить на `[8, 4]` для более редкого пунктира

### Проблема 5: Градиенты создаются при каждом рендере
**Причина:** Это нормальное поведение Chart.js  
**Решение:** Не нужно оптимизировать, Chart.js кэширует градиенты автоматически

## 🔍 Детальная проверка реализации

**После реализации проверить:**
1. Градиенты отображаются под основными линиями (Новые, Закрытые все, Переходящие все)
2. Вспомогательные линии без градиентов (`fill: false`)
3. Точки скрыты по умолчанию, появляются при hover
4. Толщина линий: 3px основные, 2px вспомогательные
5. Пунктир: `[8, 4]` для всех вспомогательных линий
6. Tension: `0.4` для всех линий
7. Работает в обоих режимах (недели и месяцы)

