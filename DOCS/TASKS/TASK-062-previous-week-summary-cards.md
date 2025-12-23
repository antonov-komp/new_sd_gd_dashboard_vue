# TASK-062: Добавление блока summary-карточек для предыдущей недели

**Дата создания:** 2025-12-23 12:54 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связанная задача:** TASK-041, TASK-048, TASK-061

---

## 📋 Описание

Добавить блок summary-карточек (чипов) для предыдущей недели под существующим блоком текущей недели в модуле «График приёма и закрытий сектора 1С». Визуально отделить цифры текущей активной недели от цифр предыдущей недели.

---

## 🎯 Цель

В модуле «График приёма и закрытий сектора 1С» уже есть 4 summary-карточки (чипа), которые показывают данные текущей недели:
1. Новые за неделю
2. Закрытые за неделю (с разбивкой)
3. Переходящие (с разбивкой)
4. Закрытия по стадиям

**Требуется:** Добавить такой же блок под ними для предыдущей недели с визуальным разделением.

---

## 🎨 UX/UI Требования

### Визуальная структура

```
┌─────────────────────────────────────────────────────────────────────────┐
│  График приёма и закрытий сектора 1С                                    │
│  Неделя 51 · 2025-12-15 — 2025-12-21 (UTC)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ТЕКУЩАЯ НЕДЕЛЯ (Неделя 51)                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Новые    │  │ Закрытые │  │ Переход. │  │ Стадии   │        │   │
│  │  │   12     │  │    8     │  │   97     │  │ ...      │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  ────────────────────────────────────────────────────────────────────  │
│  (Визуальный разделитель: линия, отступ, другой фон)                    │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ПРЕДЫДУЩАЯ НЕДЕЛЯ (Неделя 50)                                  │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │   │
│  │  │ Новые    │  │ Закрытые │  │ Переход. │  │ Стадии   │        │   │
│  │  │   14     │  │   33     │  │   78     │  │ ...      │        │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  [Графики...]                                                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Визуальное разделение

**Критически важно:** Текущая неделя и предыдущая неделя должны быть визуально четко разделены.

**Варианты визуального разделения:**
1. **Разделительная линия** между блоками (горизонтальная линия)
2. **Отступ** между блоками (увеличенный margin/padding)
3. **Разный фон** для блоков (текущая неделя — светлый фон, предыдущая — более светлый/серый)
4. **Заголовки блоков** с указанием номера недели
5. **Комбинация** всех вышеперечисленных методов

**Рекомендуемый подход:**
- Заголовок блока с номером недели и датами
- Разделительная линия между блоками
- Легкое различие в фоне (текущая неделя — белый/светлый, предыдущая — чуть более серый)
- Увеличенный отступ между блоками (24-32px)

---

## 🔧 Технические требования

### Файл для изменения

**Файл:** `vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`

### Структура данных

**Текущая неделя:**
- Используется computed-свойство `currentWeekData`
- Данные берутся из последнего элемента `series` или `weeksData` (индекс `length - 1`)

**Предыдущая неделя:**
- Нужно создать computed-свойство `previousWeekData`
- Данные берутся из предпоследнего элемента `series` или `weeksData` (индекс `length - 2`)
- Если данных меньше 2 недель, блок предыдущей недели не отображается

### Детальная логика получения данных предыдущей недели

**Важно:** Логика должна точно соответствовать логике получения данных текущей недели, но брать предпоследний элемент вместо последнего.

```javascript
// Computed-свойство для данных предыдущей недели
const previousWeekData = computed(() => {
  // 1. Приоритет: series[предпоследний] (если есть данные за 2+ недели)
  // Используем ту же логику, что и для currentWeekData, но с индексом prevIndex
  if (props.data?.series) {
    const series = props.data.series;
    
    // Находим максимальный индекс (длина самого длинного массива - 1)
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.closedCreatedThisWeek) ? series.closedCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.closedCreatedOtherWeek) ? series.closedCreatedOtherWeek.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedThisWeek) ? series.carryoverCreatedThisWeek.length : 0) - 1,
      (Array.isArray(series.carryoverCreatedOtherWeek) ? series.carryoverCreatedOtherWeek.length : 0) - 1,
      -1
    );
    
    // Проверяем, что есть хотя бы 2 недели данных (lastIndex >= 1 означает, что есть минимум 2 элемента)
    if (lastIndex >= 1) {
      const prevIndex = lastIndex - 1;
      
      // Получаем метаданные о предыдущей неделе
      const prevWeekMeta = props.meta?.weeks?.[prevIndex];
      
      // Формируем объект с данными предыдущей недели
      const prevWeekFromSeries = {
        weekNumber: prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: (Array.isArray(series.new) && series.new[prevIndex] !== undefined) 
          ? series.new[prevIndex] 
          : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[prevIndex] !== undefined) 
          ? series.closed[prevIndex] 
          : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[prevIndex] !== undefined) 
          ? series.closedCreatedThisWeek[prevIndex] 
          : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[prevIndex] !== undefined) 
          ? series.closedCreatedOtherWeek[prevIndex] 
          : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[prevIndex] !== undefined) 
          ? series.carryover[prevIndex] 
          : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[prevIndex] !== undefined) 
          ? series.carryoverCreatedThisWeek[prevIndex] 
          : 0,
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[prevIndex] !== undefined) 
          ? series.carryoverCreatedOtherWeek[prevIndex] 
          : 0
      };
      
      // Если в series есть хотя бы одно ненулевое значение, используем эти данные
      if (prevWeekFromSeries.newTickets > 0 || 
          prevWeekFromSeries.closedTickets > 0 || 
          prevWeekFromSeries.carryoverTickets > 0) {
        return prevWeekFromSeries;
      }
    }
  }
  
  // 2. Пробуем weeksData[предпоследний]
  if (props.data?.weeksData && Array.isArray(props.data.weeksData) && props.data.weeksData.length >= 2) {
    const prevWeekIndex = props.data.weeksData.length - 2;
    const prevWeek = props.data.weeksData[prevWeekIndex];
    const prevWeekMeta = props.meta?.weeks?.[prevWeekIndex];
    
    // Проверяем, что есть хотя бы одно ненулевое значение
    if ((prevWeek.newTickets ?? 0) > 0 || 
        (prevWeek.closedTickets ?? 0) > 0 || 
        (prevWeek.carryoverTickets ?? 0) > 0) {
      return {
        weekNumber: prevWeek.weekNumber ?? prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: prevWeek.newTickets ?? 0,
        closedTickets: prevWeek.closedTickets ?? 0,
        closedTicketsCreatedThisWeek: prevWeek.closedTicketsCreatedThisWeek ?? 0,
        closedTicketsCreatedOtherWeek: prevWeek.closedTicketsCreatedOtherWeek ?? 0,
        carryoverTickets: prevWeek.carryoverTickets ?? 0,
        carryoverTicketsCreatedThisWeek: prevWeek.carryoverTicketsCreatedThisWeek ?? 0,
        carryoverTicketsCreatedOtherWeek: prevWeek.carryoverTicketsCreatedOtherWeek ?? 0
      };
    }
  }
  
  // 3. Fallback: возвращаем данные из series даже если они нули (для консистентности)
  if (props.data?.series) {
    const series = props.data.series;
    const lastIndex = Math.max(
      (Array.isArray(series.new) ? series.new.length : 0) - 1,
      (Array.isArray(series.closed) ? series.closed.length : 0) - 1,
      (Array.isArray(series.carryover) ? series.carryover.length : 0) - 1,
      -1
    );
    
    if (lastIndex >= 1) {
      const prevIndex = lastIndex - 1;
      const prevWeekMeta = props.meta?.weeks?.[prevIndex];
      
      return {
        weekNumber: prevWeekMeta?.weekNumber ?? null,
        weekStartUtc: prevWeekMeta?.weekStartUtc ?? null,
        weekEndUtc: prevWeekMeta?.weekEndUtc ?? null,
        newTickets: (Array.isArray(series.new) && series.new[prevIndex] !== undefined) ? series.new[prevIndex] : 0,
        closedTickets: (Array.isArray(series.closed) && series.closed[prevIndex] !== undefined) ? series.closed[prevIndex] : 0,
        closedTicketsCreatedThisWeek: (Array.isArray(series.closedCreatedThisWeek) && series.closedCreatedThisWeek[prevIndex] !== undefined) ? series.closedCreatedThisWeek[prevIndex] : 0,
        closedTicketsCreatedOtherWeek: (Array.isArray(series.closedCreatedOtherWeek) && series.closedCreatedOtherWeek[prevIndex] !== undefined) ? series.closedCreatedOtherWeek[prevIndex] : 0,
        carryoverTickets: (Array.isArray(series.carryover) && series.carryover[prevIndex] !== undefined) ? series.carryover[prevIndex] : 0,
        carryoverTicketsCreatedThisWeek: (Array.isArray(series.carryoverCreatedThisWeek) && series.carryoverCreatedThisWeek[prevIndex] !== undefined) ? series.carryoverCreatedThisWeek[prevIndex] : 0,
        carryoverTicketsCreatedOtherWeek: (Array.isArray(series.carryoverCreatedOtherWeek) && series.carryoverCreatedOtherWeek[prevIndex] !== undefined) ? series.carryoverCreatedOtherWeek[prevIndex] : 0
      };
    }
  }
  
  // 4. Если данных меньше 2 недель, возвращаем null (блок не отображается)
  return null;
});
```

### Обработка граничных случаев

**Случай 1: Данных меньше 2 недель**
```javascript
// Если lastIndex < 1, значит данных меньше 2 недель
// В этом случае previousWeekData вернёт null
// Блок предыдущей недели не отобразится (v-if="previousWeekData")
```

**Случай 2: Неполные данные в массивах**
```javascript
// Если один из массивов series короче других, используем Math.max для определения lastIndex
// Это гарантирует, что мы не выйдем за границы массива
```

**Случай 3: Отсутствие метаданных о неделе**
```javascript
// Если props.meta?.weeks?.[prevIndex] отсутствует, используем null
// В template это обрабатывается через оператор ?? и fallback на '—'
```

**Случай 4: Все значения равны нулю**
```javascript
// Если все метрики равны 0, но данные есть, всё равно возвращаем объект
// Это позволяет отобразить блок с нулевыми значениями
// Пользователь увидит, что неделя была, но данных нет
```

### Полная структура template

**Важно:** Нужно обернуть существующие карточки в блок текущей недели и добавить блок предыдущей недели.

```vue
<section class="ac-chart__summary">
  <!-- Блок текущей недели -->
  <div class="summary-week-block summary-week-block--current">
    <h3 class="summary-week-block__title">
      <span class="summary-week-block__title-text">Текущая неделя</span>
      <span class="summary-week-block__title-week">
        Неделя {{ (meta?.currentWeek?.weekNumber ?? meta?.weekNumber) ?? '—' }}
      </span>
      <span class="summary-week-block__title-dates" v-if="meta?.currentWeek?.weekStartUtc">
        {{ formatWeekDates(meta.currentWeek.weekStartUtc, meta.currentWeek.weekEndUtc) }}
      </span>
    </h3>
    <div class="summary-week-block__cards">
      <!-- Карточка 1: Новые за неделю -->
      <div class="summary-card summary-card--new" @click="handleSummaryClick('new')">
        <div class="summary-card__label">Новые за неделю</div>
        <div class="summary-card__value">{{ currentWeekData?.newTickets ?? 0 }}</div>
      </div>
      
      <!-- Карточка 2: Закрытые за неделю (с разбивкой) -->
      <div class="summary-card summary-card--closed-breakdown" @click="handleSummaryClick('closed')">
        <div class="summary-card__label">Закрытые за неделю</div>
        <div class="summary-card__value-main">{{ currentWeekData?.closedTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ currentWeekData?.closedTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой неделей</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ currentWeekData?.closedTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">другой неделей</span>
          </div>
        </div>
      </div>
      
      <!-- Карточка 3: Переходящие (с разбивкой) -->
      <div class="summary-card summary-card--carryover-breakdown" @click="handleSummaryClick('carryover')">
        <div class="summary-card__label">Переходящие</div>
        <div class="summary-card__value-main">{{ currentWeekData?.carryoverTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой недели</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ currentWeekData?.carryoverTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">предыдущих</span>
          </div>
        </div>
      </div>
      
      <!-- Карточка 4: Закрытия по стадиям -->
      <div class="summary-card summary-card--stages">
        <div class="summary-card__label">Закрытия по стадиям</div>
        <div class="summary-card__tags">
          <span
            v-for="stage in data.stages || []"
            :key="stage.stageId"
            class="stage-tag"
          >
            {{ stage.stageName || stage.stageId }} — {{ stage.count }}
          </span>
          <span v-if="!data.stages || data.stages.length === 0" class="stage-tag stage-tag--empty">
            Нет данных
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- Визуальный разделитель -->
  <div v-if="previousWeekData" class="summary-week-divider">
    <div class="summary-week-divider__line"></div>
    <div class="summary-week-divider__label">Предыдущая неделя</div>
  </div>

  <!-- Блок предыдущей недели -->
  <div v-if="previousWeekData" class="summary-week-block summary-week-block--previous">
    <h3 class="summary-week-block__title">
      <span class="summary-week-block__title-text">Предыдущая неделя</span>
      <span class="summary-week-block__title-week">
        Неделя {{ previousWeekData.weekNumber ?? '—' }}
      </span>
      <span class="summary-week-block__title-dates" v-if="previousWeekData.weekStartUtc">
        {{ formatWeekDates(previousWeekData.weekStartUtc, previousWeekData.weekEndUtc) }}
      </span>
    </h3>
    <div class="summary-week-block__cards">
      <!-- Карточка 1: Новые за неделю (предыдущая) -->
      <div class="summary-card summary-card--new summary-card--previous">
        <div class="summary-card__label">Новые за неделю</div>
        <div class="summary-card__value">{{ previousWeekData?.newTickets ?? 0 }}</div>
      </div>
      
      <!-- Карточка 2: Закрытые за неделю (предыдущая, с разбивкой) -->
      <div class="summary-card summary-card--closed-breakdown summary-card--previous">
        <div class="summary-card__label">Закрытые за неделю</div>
        <div class="summary-card__value-main">{{ previousWeekData?.closedTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ previousWeekData?.closedTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой неделей</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ previousWeekData?.closedTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">другой неделей</span>
          </div>
        </div>
      </div>
      
      <!-- Карточка 3: Переходящие (предыдущая, с разбивкой) -->
      <div class="summary-card summary-card--carryover-breakdown summary-card--previous">
        <div class="summary-card__label">Переходящие</div>
        <div class="summary-card__value-main">{{ previousWeekData?.carryoverTickets ?? 0 }}</div>
        <div class="summary-card__breakdown">
          <div class="breakdown-item breakdown-item--this-week">
            <span class="breakdown-item__icon">✓</span>
            <span class="breakdown-item__value">{{ previousWeekData?.carryoverTicketsCreatedThisWeek ?? 0 }}</span>
            <span class="breakdown-item__label">этой недели</span>
          </div>
          <div class="breakdown-item breakdown-item--other-week">
            <span class="breakdown-item__icon">↻</span>
            <span class="breakdown-item__value">{{ previousWeekData?.carryoverTicketsCreatedOtherWeek ?? 0 }}</span>
            <span class="breakdown-item__label">предыдущих</span>
          </div>
        </div>
      </div>
      
      <!-- Карточка 4: Закрытия по стадиям (предыдущая) -->
      <!-- ВАЖНО: Стадии для предыдущей недели нужно получать отдельно или использовать общие -->
      <div class="summary-card summary-card--stages summary-card--previous">
        <div class="summary-card__label">Закрытия по стадиям</div>
        <div class="summary-card__tags">
          <!-- Примечание: Стадии для предыдущей недели могут быть недоступны в текущем API -->
          <!-- Можно использовать общие стадии или добавить запрос отдельно -->
          <span
            v-for="stage in data.stages || []"
            :key="stage.stageId"
            class="stage-tag"
          >
            {{ stage.stageName || stage.stageId }} — {{ stage.count }}
          </span>
          <span v-if="!data.stages || data.stages.length === 0" class="stage-tag stage-tag--empty">
            Нет данных
          </span>
        </div>
      </div>
    </div>
  </div>
</section>
```

### Вспомогательная функция для форматирования дат

```javascript
/**
 * Форматирует даты недели для отображения в заголовке
 * 
 * @param {string} startUtc - Начало недели в UTC (ISO-8601)
 * @param {string} endUtc - Конец недели в UTC (ISO-8601)
 * @returns {string} Отформатированная строка дат
 */
function formatWeekDates(startUtc, endUtc) {
  if (!startUtc || !endUtc) {
    return '';
  }
  
  try {
    const start = new Date(startUtc);
    const end = new Date(endUtc);
    
    // Форматируем как "15 Dec — 21 Dec" или "15 Dec 2025 — 21 Dec 2025" (если разные годы)
    const startDay = start.getUTCDate();
    const startMonth = start.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' });
    const startYear = start.getUTCFullYear();
    
    const endDay = end.getUTCDate();
    const endMonth = end.toLocaleDateString('ru-RU', { month: 'short', timeZone: 'UTC' });
    const endYear = end.getUTCFullYear();
    
    if (startYear === endYear && startMonth === endMonth) {
      return `${startDay} — ${endDay} ${startMonth}`;
    } else if (startYear === endYear) {
      return `${startDay} ${startMonth} — ${endDay} ${endMonth}`;
    } else {
      return `${startDay} ${startMonth} ${startYear} — ${endDay} ${endMonth} ${endYear}`;
    }
  } catch (error) {
    console.error('[formatWeekDates] Error:', error);
    return '';
  }
}
```

### Детальная стилизация

```css
/* Контейнер для всех summary-блоков */
.ac-chart__summary {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 16px;
}

/* Блок недели (базовые стили) */
.summary-week-block {
  margin-bottom: 0;
  transition: all 0.3s ease;
}

/* Блок текущей недели - выделен */
.summary-week-block--current {
  background: var(--b24-bg-white, #fff);
  padding: 20px;
  border-radius: var(--radius-md, 8px);
  border: 2px solid var(--b24-primary, #007bff);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
  position: relative;
}

/* Блок текущей недели - индикатор активности */
.summary-week-block--current::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--b24-primary, #007bff), var(--b24-success, #28a745));
  border-radius: var(--radius-md, 8px) var(--radius-md, 8px) 0 0;
}

/* Блок предыдущей недели - приглушен */
.summary-week-block--previous {
  background: var(--b24-bg-light, #f9fafb);
  padding: 20px;
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--b24-border-light, #e5e7eb);
  opacity: 0.85;
  transition: opacity 0.2s ease;
}

/* При наведении на блок предыдущей недели - увеличиваем непрозрачность */
.summary-week-block--previous:hover {
  opacity: 0.95;
  border-color: var(--b24-border-light, #d1d5db);
}

/* Заголовок блока недели */
.summary-week-block__title {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--b24-border-light, #e5e7eb);
}

/* Текст заголовка */
.summary-week-block__title-text {
  font-size: 16px;
  font-weight: 700;
  color: var(--b24-text-primary, #111827);
  line-height: 1.2;
}

/* Номер недели в заголовке */
.summary-week-block__title-week {
  font-size: 14px;
  font-weight: 600;
  color: var(--b24-primary, #007bff);
  line-height: 1.2;
}

/* Даты в заголовке */
.summary-week-block__title-dates {
  font-size: 12px;
  font-weight: 400;
  color: var(--b24-text-secondary, #6b7280);
  line-height: 1.2;
  font-style: italic;
}

/* Блок предыдущей недели - приглушенные цвета заголовка */
.summary-week-block--previous .summary-week-block__title-text {
  color: var(--b24-text-secondary, #6b7280);
  font-weight: 600;
}

.summary-week-block--previous .summary-week-block__title-week {
  color: var(--b24-text-secondary, #6b7280);
  font-weight: 500;
}

/* Контейнер карточек внутри блока */
.summary-week-block__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

/* Визуальный разделитель между блоками */
.summary-week-divider {
  margin: 28px 0;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Линия разделителя */
.summary-week-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--b24-border-light, #e5e7eb) 20%,
    var(--b24-border-light, #e5e7eb) 80%,
    transparent
  );
  position: relative;
}

/* Декоративные элементы на концах линии */
.summary-week-divider__line::before,
.summary-week-divider__line::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 6px;
  height: 6px;
  background: var(--b24-border-light, #e5e7eb);
  border-radius: 50%;
  transform: translateY(-50%);
}

.summary-week-divider__line::before {
  left: -8px;
}

.summary-week-divider__line::after {
  right: -8px;
}

/* Метка разделителя (опционально) */
.summary-week-divider__label {
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--b24-text-secondary, #6b7280);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--b24-bg-white, #fff);
  position: relative;
  z-index: 1;
}

/* Карточки предыдущей недели - легкое затемнение */
.summary-card--previous {
  opacity: 0.8;
  cursor: default; /* Отключаем курсор pointer, если клики не нужны */
  transition: opacity 0.2s ease, transform 0.2s ease;
}

/* При наведении на карточку предыдущей недели */
.summary-card--previous:hover {
  opacity: 1;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Если карточки предыдущей недели должны быть кликабельными */
.summary-card--previous.summary-card--clickable {
  cursor: pointer;
}

/* Адаптивность для планшетов (768px - 1024px) */
@media (max-width: 1024px) and (min-width: 769px) {
  .summary-week-block__cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 16px;
  }
  
  .summary-week-divider {
    margin: 24px 0;
  }
}

/* Адаптивность для мобильных устройств (< 768px) */
@media (max-width: 768px) {
  .ac-chart__summary {
    gap: 0;
  }
  
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 12px;
    border-radius: var(--radius-sm, 6px);
  }
  
  .summary-week-block__title {
    margin-bottom: 12px;
    padding-bottom: 8px;
  }
  
  .summary-week-block__title-text {
    font-size: 14px;
  }
  
  .summary-week-block__title-week {
    font-size: 12px;
  }
  
  .summary-week-block__title-dates {
    font-size: 11px;
  }
  
  .summary-week-block__cards {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .summary-week-divider {
    margin: 20px 0;
  }
  
  .summary-week-divider__label {
    font-size: 10px;
    padding: 0 8px;
  }
  
  /* На мобильных карточки предыдущей недели менее приглушены */
  .summary-card--previous {
    opacity: 0.9;
  }
}

/* Адаптивность для очень маленьких экранов (< 480px) */
@media (max-width: 480px) {
  .summary-week-block--current,
  .summary-week-block--previous {
    padding: 10px;
  }
  
  .summary-week-block__title {
    gap: 2px;
    margin-bottom: 10px;
    padding-bottom: 6px;
  }
  
  .summary-week-block__cards {
    gap: 8px;
  }
}
```

---

## 📊 Структура данных API

### Источник данных

Данные для предыдущей недели уже доступны в ответе API:

```json
{
  "meta": {
    "weeks": [
      {
        "weekNumber": 48,
        "weekStartUtc": "2025-11-24T00:00:00Z",
        "weekEndUtc": "2025-11-30T23:59:59Z"
      },
      {
        "weekNumber": 49,
        "weekStartUtc": "2025-12-01T00:00:00Z",
        "weekEndUtc": "2025-12-07T23:59:59Z"
      },
      {
        "weekNumber": 50,
        "weekStartUtc": "2025-12-08T00:00:00Z",
        "weekEndUtc": "2025-12-14T23:59:59Z"
      },
      {
        "weekNumber": 51,
        "weekStartUtc": "2025-12-15T00:00:00Z",
        "weekEndUtc": "2025-12-21T23:59:59Z"
      }
    ]
  },
  "data": {
    "series": {
      "new": [14, 14, 14, 12],           // Индекс 2 = предыдущая неделя (50)
      "closed": [21, 21, 33, 8],         // Индекс 2 = предыдущая неделя (50)
      "closedCreatedThisWeek": [10, 7, 9, 2],
      "closedCreatedOtherWeek": [11, 14, 24, 6],
      "carryover": [63, 67, 78, 97],     // Индекс 2 = предыдущая неделя (50)
      "carryoverCreatedThisWeek": [2, 3, 5, 5],
      "carryoverCreatedOtherWeek": [61, 64, 73, 92]
    },
    "weeksData": [
      {
        "weekNumber": 48,
        "newTickets": 14,
        "closedTickets": 21,
        // ...
      },
      {
        "weekNumber": 49,
        "newTickets": 14,
        "closedTickets": 21,
        // ...
      },
      {
        "weekNumber": 50,  // ← Предыдущая неделя (индекс 2)
        "newTickets": 14,
        "closedTickets": 33,
        // ...
      },
      {
        "weekNumber": 51,  // ← Текущая неделя (индекс 3)
        "newTickets": 12,
        "closedTickets": 8,
        // ...
      }
    ]
  }
}
```

**Примечание:** Индекс 2 в массивах `series` и `weeksData` соответствует предыдущей неделе (неделя 50), индекс 3 — текущей неделе (неделя 51).

---

## 🚀 Этапы реализации

### Этап 1: Создание computed-свойства для предыдущей недели

**Задачи:**
1. Добавить computed-свойство `previousWeekData` в компонент
2. Реализовать логику получения данных из предпоследнего элемента `series` или `weeksData`
3. Добавить проверку наличия данных (если меньше 2 недель, вернуть `null`)
4. Включить метаданные о неделе (номер, даты начала/конца)

**Критерии приёмки этапа 1:**
- [ ] Computed-свойство `previousWeekData` создано
- [ ] Данные берутся из предпоследнего элемента массивов
- [ ] Возвращается `null`, если данных меньше 2 недель
- [ ] Включаются метаданные о неделе (номер, даты)

### Этап 2: Обновление структуры template

**Задачи:**
1. Обернуть существующие summary-карточки в блок `summary-week-block--current`
2. Добавить заголовок блока с номером текущей недели
3. Добавить визуальный разделитель между блоками
4. Добавить блок `summary-week-block--previous` с карточками для предыдущей недели
5. Использовать `v-if="previousWeekData"` для условного отображения

**Критерии приёмки этапа 2:**
- [ ] Существующие карточки обернуты в блок текущей недели
- [ ] Добавлен заголовок блока текущей недели
- [ ] Добавлен визуальный разделитель
- [ ] Добавлен блок предыдущей недели с карточками
- [ ] Блок предыдущей недели отображается только при наличии данных

### Этап 3: Стилизация и визуальное разделение

**Задачи:**
1. Добавить стили для блоков недель (`.summary-week-block`)
2. Реализовать визуальное разделение (разный фон, разделительная линия, отступы)
3. Добавить стили для заголовков блоков
4. Добавить стили для карточек предыдущей недели (легкое затемнение)
5. Обеспечить адаптивность на мобильных устройствах

**Критерии приёмки этапа 3:**
- [ ] Блоки визуально четко разделены
- [ ] Текущая неделя выделена (белый/светлый фон)
- [ ] Предыдущая неделя визуально отличается (более серый фон, затемнение)
- [ ] Разделительная линия между блоками
- [ ] Заголовки блоков с номерами недель
- [ ] Адаптивность на мобильных устройствах

### Этап 4: Обработка кликов на карточки предыдущей недели

**Задачи:**
1. Определить, должны ли карточки предыдущей недели быть кликабельными
2. Если да — реализовать обработчики кликов (открытие попапов с данными предыдущей недели)
3. Если нет — отключить клики на карточки предыдущей недели

**Вопрос для уточнения:** Должны ли карточки предыдущей недели открывать попапы? Или они только для отображения?

**Рекомендация:** Карточки предыдущей недели должны быть **только для отображения** (не кликабельными), так как:
- Основной фокус на текущей неделе
- Попапы открываются для текущей недели
- Это упрощает UX и снижает путаницу

**Реализация (если карточки не кликабельны):**
```vue
<!-- Карточки предыдущей недели БЕЗ @click -->
<div class="summary-card summary-card--new summary-card--previous">
  <div class="summary-card__label">Новые за неделю</div>
  <div class="summary-card__value">{{ previousWeekData?.newTickets ?? 0 }}</div>
</div>
```

**Стили для некликабельных карточек:**
```css
.summary-card--previous {
  cursor: default; /* Не pointer */
  opacity: 0.8;
}

.summary-card--previous:hover {
  opacity: 1;
  /* Убираем изменение border-color при hover */
}
```

**Критерии приёмки этапа 4:**
- [ ] Определено поведение при клике на карточки предыдущей недели
- [ ] Реализованы обработчики кликов (если требуется)
- [ ] Или отключены клики (если требуется)
- [ ] Курсор изменён на `default` для некликабельных карточек

### Этап 5: Обработка стадий для предыдущей недели

**Проблема:** В текущем API стадии (`data.stages`) возвращаются только для текущей недели. Для предыдущей недели стадии могут быть недоступны.

**Варианты решения:**

**Вариант 1: Использовать общие стадии (рекомендуется)**
```vue
<!-- Используем те же стадии, что и для текущей недели -->
<div class="summary-card summary-card--stages summary-card--previous">
  <div class="summary-card__label">Закрытия по стадиям</div>
  <div class="summary-card__tags">
    <span
      v-for="stage in data.stages || []"
      :key="stage.stageId"
      class="stage-tag"
    >
      {{ stage.stageName || stage.stageId }} — {{ stage.count }}
    </span>
    <span v-if="!data.stages || data.stages.length === 0" class="stage-tag stage-tag--empty">
      Нет данных
    </span>
  </div>
</div>
```

**Вариант 2: Добавить запрос стадий для предыдущей недели (если требуется)**
- Требует изменения API
- Увеличивает количество запросов
- Не рекомендуется для первой версии

**Вариант 3: Показывать "Нет данных" для стадий предыдущей недели**
```vue
<div class="summary-card summary-card--stages summary-card--previous">
  <div class="summary-card__label">Закрытия по стадиям</div>
  <div class="summary-card__tags">
    <span class="stage-tag stage-tag--empty">
      Данные недоступны для предыдущей недели
    </span>
  </div>
</div>
```

**Рекомендация:** Использовать **Вариант 1** (общие стадии) для первой версии. Если потребуется точность, можно добавить отдельный запрос позже.

**Критерии приёмки этапа 5:**
- [ ] Карточка стадий для предыдущей недели отображается
- [ ] Используются общие стадии или показывается "Нет данных"
- [ ] Нет ошибок при отсутствии стадий

---

## ⚡ Производительность и оптимизация

### Влияние на производительность

**Минимальное влияние:**
- Computed-свойство `previousWeekData` вычисляется только при изменении props
- Vue.js кеширует computed-свойства автоматически
- Дополнительный рендеринг 4 карточек незначительно влияет на производительность

**Оптимизации:**
1. **Условный рендеринг:** Блок предыдущей недели отображается только при наличии данных (`v-if="previousWeekData"`)
2. **Кеширование computed:** Vue.js автоматически кеширует результат `previousWeekData`
3. **Ленивая загрузка:** Данные уже загружены в API, дополнительных запросов не требуется

### Рекомендации по оптимизации

**Если производительность станет проблемой:**
1. Использовать `v-show` вместо `v-if` (если блок часто переключается)
2. Мемоизировать функцию `formatWeekDates`
3. Оптимизировать стили (использовать CSS-переменные вместо вычислений)

---

## 🎨 Дополнительные визуальные улучшения

### Анимации (опционально)

**Плавное появление блока предыдущей недели:**
```css
.summary-week-block--previous {
  animation: fadeInUp 0.4s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 0.85;
    transform: translateY(0);
  }
}
```

**Плавное появление разделителя:**
```css
.summary-week-divider {
  animation: fadeIn 0.3s ease-out 0.2s;
  animation-fill-mode: both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
```

### Индикатор сравнения (опционально)

**Можно добавить индикаторы изменения значений:**
```vue
<div class="summary-card__value">
  {{ previousWeekData?.newTickets ?? 0 }}
  <span 
    v-if="currentWeekData?.newTickets && previousWeekData?.newTickets"
    class="value-change"
    :class="{
      'value-change--increase': currentWeekData.newTickets > previousWeekData.newTickets,
      'value-change--decrease': currentWeekData.newTickets < previousWeekData.newTickets
    }"
  >
    {{ currentWeekData.newTickets > previousWeekData.newTickets ? '↑' : '↓' }}
    {{ Math.abs(currentWeekData.newTickets - previousWeekData.newTickets) }}
  </span>
</div>
```

**Стили для индикатора:**
```css
.value-change {
  font-size: 12px;
  margin-left: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.value-change--increase {
  color: var(--b24-success, #28a745);
  background: rgba(40, 167, 69, 0.1);
}

.value-change--decrease {
  color: var(--b24-danger, #dc3545);
  background: rgba(220, 53, 69, 0.1);
}
```

**Примечание:** Это опциональное улучшение, можно добавить в будущих версиях.

---

## 📝 Модули и компоненты

### Файлы для изменения

1. **`vue-app/src/components/graph-admission-closure/GraphAdmissionClosureChart.vue`**
   - Добавление computed-свойства `previousWeekData`
   - Обновление структуры template
   - Добавление стилей

### Зависимости

- Использует данные из `props.data.series` и `props.data.weeksData`
- Использует метаданные из `props.meta.weeks`
- Зависит от структуры данных API (уже реализована в TASK-048)

---

## ✅ Критерии приёмки

### Функциональные требования

- [ ] Блок summary-карточек для предыдущей недели отображается под блоком текущей недели
- [ ] Данные предыдущей недели берутся из предпоследнего элемента массивов `series` или `weeksData`
- [ ] Блок предыдущей недели отображается только при наличии данных за 2+ недели
- [ ] Все 4 карточки отображаются для предыдущей недели:
  - Новые за неделю
  - Закрытые за неделю (с разбивкой)
  - Переходящие (с разбивкой)
  - Закрытия по стадиям
- [ ] Заголовки блоков показывают номера недель

### Визуальные требования

- [ ] Текущая неделя и предыдущая неделя визуально четко разделены
- [ ] Разделительная линия между блоками
- [ ] Разный фон для блоков (текущая — белый/светлый, предыдущая — более серый)
- [ ] Заголовки блоков с номерами недель и датами
- [ ] Карточки предыдущей недели визуально отличаются (легкое затемнение)
- [ ] Адаптивность на мобильных устройствах

### Технические требования

- [ ] Computed-свойство `previousWeekData` реализовано корректно
- [ ] Обработка граничных случаев (меньше 2 недель данных)
- [ ] Нет ошибок в консоли
- [ ] Код соответствует стандартам проекта

---

## 🧪 Тестирование

### Тестовые сценарии с конкретными данными

#### Сценарий 1: Данные за 4 недели (нормальный случай)

**Входные данные:**
```json
{
  "meta": {
    "weeks": [
      { "weekNumber": 48, "weekStartUtc": "2025-11-24T00:00:00Z", "weekEndUtc": "2025-11-30T23:59:59Z" },
      { "weekNumber": 49, "weekStartUtc": "2025-12-01T00:00:00Z", "weekEndUtc": "2025-12-07T23:59:59Z" },
      { "weekNumber": 50, "weekStartUtc": "2025-12-08T00:00:00Z", "weekEndUtc": "2025-12-14T23:59:59Z" },
      { "weekNumber": 51, "weekStartUtc": "2025-12-15T00:00:00Z", "weekEndUtc": "2025-12-21T23:59:59Z" }
    ]
  },
  "data": {
    "series": {
      "new": [14, 14, 14, 12],
      "closed": [21, 21, 33, 8],
      "closedCreatedThisWeek": [10, 7, 9, 2],
      "closedCreatedOtherWeek": [11, 14, 24, 6],
      "carryover": [63, 67, 78, 97],
      "carryoverCreatedThisWeek": [2, 3, 5, 5],
      "carryoverCreatedOtherWeek": [61, 64, 73, 92]
    }
  }
}
```

**Ожидаемый результат:**
- ✅ Отображаются оба блока (текущая неделя 51 и предыдущая неделя 50)
- ✅ Текущая неделя: новые=12, закрытые=8, переходящие=97
- ✅ Предыдущая неделя: новые=14, закрытые=33, переходящие=78
- ✅ Заголовки показывают номера недель и даты

**Проверка:**
```javascript
// previousWeekData должен вернуть:
{
  weekNumber: 50,
  weekStartUtc: "2025-12-08T00:00:00Z",
  weekEndUtc: "2025-12-14T23:59:59Z",
  newTickets: 14,        // series.new[2]
  closedTickets: 33,     // series.closed[2]
  closedTicketsCreatedThisWeek: 9,  // series.closedCreatedThisWeek[2]
  closedTicketsCreatedOtherWeek: 24, // series.closedCreatedOtherWeek[2]
  carryoverTickets: 78,  // series.carryover[2]
  carryoverTicketsCreatedThisWeek: 5, // series.carryoverCreatedThisWeek[2]
  carryoverTicketsCreatedOtherWeek: 73 // series.carryoverCreatedOtherWeek[2]
}
```

#### Сценарий 2: Данные за 1 неделю (граничный случай)

**Входные данные:**
```json
{
  "meta": {
    "weeks": [
      { "weekNumber": 51, "weekStartUtc": "2025-12-15T00:00:00Z", "weekEndUtc": "2025-12-21T23:59:59Z" }
    ]
  },
  "data": {
    "series": {
      "new": [12],
      "closed": [8],
      "closedCreatedThisWeek": [2],
      "closedCreatedOtherWeek": [6],
      "carryover": [97],
      "carryoverCreatedThisWeek": [5],
      "carryoverCreatedOtherWeek": [92]
    }
  }
}
```

**Ожидаемый результат:**
- ✅ Отображается только блок текущей недели
- ✅ Блок предыдущей недели НЕ отображается (`v-if="previousWeekData"` вернёт `null`)
- ✅ Разделитель не отображается

**Проверка:**
```javascript
// previousWeekData должен вернуть null
// lastIndex = 0 (один элемент в массиве)
// lastIndex >= 1 = false, поэтому возвращаем null
```

#### Сценарий 3: Все значения предыдущей недели равны нулю

**Входные данные:**
```json
{
  "meta": {
    "weeks": [
      { "weekNumber": 50, "weekStartUtc": "2025-12-08T00:00:00Z", "weekEndUtc": "2025-12-14T23:59:59Z" },
      { "weekNumber": 51, "weekStartUtc": "2025-12-15T00:00:00Z", "weekEndUtc": "2025-12-21T23:59:59Z" }
    ]
  },
  "data": {
    "series": {
      "new": [0, 12],
      "closed": [0, 8],
      "closedCreatedThisWeek": [0, 2],
      "closedCreatedOtherWeek": [0, 6],
      "carryover": [0, 97],
      "carryoverCreatedThisWeek": [0, 5],
      "carryoverCreatedOtherWeek": [0, 92]
    }
  }
}
```

**Ожидаемый результат:**
- ✅ Отображаются оба блока
- ✅ Предыдущая неделя показывает все нули
- ✅ Блок не скрывается, даже если все значения равны нулю (для консистентности)

**Проверка:**
```javascript
// previousWeekData вернёт объект с нулевыми значениями
// Это позволяет пользователю видеть, что неделя была, но данных нет
```

#### Сценарий 4: Неполные данные в массивах (один массив короче)

**Входные данные:**
```json
{
  "data": {
    "series": {
      "new": [14, 14, 14, 12],
      "closed": [21, 21, 33],  // Короче на 1 элемент
      "carryover": [63, 67, 78, 97]
    }
  }
}
```

**Ожидаемый результат:**
- ✅ `lastIndex` определяется как `Math.max(3, 2, 3) = 3`
- ✅ `prevIndex = 2`
- ✅ Для `closed` используется индекс 2 (значение 33)
- ✅ Для `new` и `carryover` используется индекс 2 (значения 14 и 78)
- ✅ Нет ошибок выхода за границы массива

**Проверка:**
```javascript
// Проверка наличия элемента перед доступом:
(Array.isArray(series.closed) && series.closed[prevIndex] !== undefined) 
  ? series.closed[prevIndex] 
  : 0
```

#### Сценарий 5: Визуальное разделение

**Проверка визуальных элементов:**
- ✅ Блок текущей недели имеет синюю рамку (`border: 2px solid #007bff`)
- ✅ Блок текущей недели имеет градиентную полоску сверху
- ✅ Блок предыдущей недели имеет серый фон (`background: #f9fafb`)
- ✅ Блок предыдущей недели имеет `opacity: 0.85`
- ✅ Разделительная линия между блоками видна
- ✅ Заголовки блоков показывают номера недель и даты
- ✅ Карточки предыдущей недели приглушены (`opacity: 0.8`)

#### Сценарий 6: Адаптивность на разных устройствах

**Desktop (> 1024px):**
- ✅ Карточки в 4 колонки (`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))`)
- ✅ Отступы: 20px padding в блоках
- ✅ Разделитель: 28px margin

**Tablet (768px - 1024px):**
- ✅ Карточки в 2 колонки
- ✅ Отступы: 16px padding
- ✅ Разделитель: 24px margin

**Mobile (< 768px):**
- ✅ Карточки в 1 колонку
- ✅ Отступы: 12px padding
- ✅ Разделитель: 20px margin
- ✅ Карточки предыдущей недели менее приглушены (`opacity: 0.9`)

**Very Small Mobile (< 480px):**
- ✅ Отступы: 10px padding
- ✅ Заголовки уменьшены

#### Сценарий 7: Обработка ошибок

**Случай: Отсутствие props.data**
```javascript
// Если props.data === undefined или null
// previousWeekData вернёт null
// Блок не отобразится, ошибок не будет
```

**Случай: Невалидные данные в массивах**
```javascript
// Если series.new не массив, а число
// Array.isArray(series.new) вернёт false
// Используется fallback на 0
```

**Случай: Отсутствие метаданных**
```javascript
// Если props.meta?.weeks отсутствует
// weekNumber, weekStartUtc, weekEndUtc будут null
// В template это обрабатывается через ?? и fallback
```

### Чек-лист тестирования

**Функциональное тестирование:**
- [ ] Блок предыдущей недели отображается при наличии данных за 2+ недели
- [ ] Блок предыдущей недели НЕ отображается при данных за 1 неделю
- [ ] Данные предыдущей недели соответствуют предпоследнему элементу массивов
- [ ] Все 4 карточки отображаются для предыдущей недели
- [ ] Заголовки показывают правильные номера недель и даты
- [ ] Форматирование дат работает корректно

**Визуальное тестирование:**
- [ ] Блоки визуально четко разделены
- [ ] Текущая неделя выделена (синяя рамка, градиентная полоска)
- [ ] Предыдущая неделя приглушена (серый фон, затемнение)
- [ ] Разделительная линия видна
- [ ] Карточки предыдущей недели приглушены, но читаемы

**Адаптивное тестирование:**
- [ ] Desktop: 4 колонки карточек
- [ ] Tablet: 2 колонки карточек
- [ ] Mobile: 1 колонка карточек
- [ ] Very Small Mobile: корректные отступы и размеры

**Тестирование граничных случаев:**
- [ ] Данные за 1 неделю — блок не отображается
- [ ] Все значения равны нулю — блок отображается с нулями
- [ ] Неполные данные в массивах — нет ошибок
- [ ] Отсутствие метаданных — корректная обработка
- [ ] Отсутствие props.data — нет ошибок

---

## 📚 Связанные документы

- [TASK-041: График приёма и закрытий сектора 1С](./TASK-041-graph-1c-admission-closure.md)
- [TASK-048: Линейный график на 4 недели без попапов](./TASK-048-line-chart-4-weeks-no-popups.md)
- [TASK-061: Детальный анализ модуля — режим 4 недели](./TASK-061-analysis-module-graph-admission-closure-4-weeks.md)
- [Гайдлайн модуля](../GUIDES/module-graph-admission-closure-guide.md)

---

## ❓ Вопросы для уточнения

### Вопрос 1: Кликабельность карточек предыдущей недели

**Вопрос:** Должны ли карточки предыдущей недели открывать попапы при клике?

**Варианты:**
- **A:** Карточки не кликабельны (только для отображения) — **рекомендуется**
- **B:** Карточки кликабельны и открывают попапы с данными предыдущей недели

**Рекомендация:** Вариант A (не кликабельны), так как:
- Основной фокус на текущей неделе
- Упрощает UX
- Снижает путаницу

### Вопрос 2: Стадии для предыдущей недели

**Вопрос:** Как отображать стадии для предыдущей недели, если API не возвращает их отдельно?

**Варианты:**
- **A:** Использовать общие стадии (те же, что для текущей недели) — **рекомендуется**
- **B:** Показывать "Нет данных"
- **C:** Добавить отдельный запрос к API для стадий предыдущей недели

**Рекомендация:** Вариант A для первой версии, вариант C — если потребуется точность.

### Вопрос 3: Индикаторы сравнения

**Вопрос:** Нужны ли индикаторы изменения значений (стрелки ↑↓ с разницей)?

**Варианты:**
- **A:** Не добавлять в первую версию — **рекомендуется**
- **B:** Добавить индикаторы сравнения

**Рекомендация:** Вариант A, можно добавить позже как улучшение.

---

## 📋 Чек-лист перед началом работы

**Перед началом реализации:**
- [ ] Изучен текущий код компонента `GraphAdmissionClosureChart.vue`
- [ ] Понятна структура данных API (серии, weeksData, метаданные)
- [ ] Определено поведение карточек предыдущей недели (кликабельны или нет)
- [ ] Определено отображение стадий для предыдущей недели
- [ ] Изучены существующие стили и адаптивность

---

## 📝 История правок

- **2025-12-23 12:54 (UTC+3, Брест):** Создана подзадача TASK-062
  - Определены требования к добавлению блока summary-карточек для предыдущей недели
  - Описаны визуальные требования к разделению блоков
  - Добавлены этапы реализации и критерии приёмки

- **2025-12-23 13:00 (UTC+3, Брест):** Расширен документ деталями
  - Добавлена полная структура template со всеми 4 карточками
  - Добавлена функция форматирования дат
  - Расширены стили с детальной адаптивностью
  - Добавлена детальная логика получения данных с обработкой граничных случаев
  - Добавлены детальные тестовые сценарии с конкретными данными
  - Добавлен раздел по обработке стадий для предыдущей недели
  - Добавлены рекомендации по производительности и оптимизации
  - Добавлены опциональные визуальные улучшения
  - Добавлены вопросы для уточнения

---

**Автор:** Технический писатель  
**Версия документа:** 1.1

