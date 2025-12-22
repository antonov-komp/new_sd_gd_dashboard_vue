# TASK-042-01: Загрузка имён сотрудников через Bitrix24 API

**Дата создания:** 2025-12-15 21:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js Developer)  
**Связь с задачей:** Этап 1 из TASK-042

## Цель этапа
Реализовать загрузку полных имён сотрудников через Bitrix24 API и отображение их в попапе первого уровня модуля «График приёма и закрытий сектора 1С» вместо "ID 1006".

## Контекст
- **Текущее состояние:** API `graph-1c-admission-closure.php` возвращает только ID сотрудника и формирует `name: "ID 1006"`
- **Проблема:** В попапе `ResponsibleModal.vue` отображается только "ID 1006" вместо полного имени "Иванов Иван"
- **Требуется:** Загружать полные имена через Bitrix24 API метод `user.get` и обогащать данные в компоненте

## Задачи этапа

### 1) Анализ существующих решений
- Изучить, как загружаются имена сотрудников в модуле «График состояния сектора 1С»
- Проверить использование `DashboardSector1CService.getEmployeesByIds()` или `EmployeeRepository.getEmployeesByIds()`
- Изучить формат данных, возвращаемых Bitrix24 API методом `user.get`

### 2) Реализация функции обогащения данных
- Создать функцию `enrichResponsibleWithNames()` в `ResponsibleModal.vue` или `admissionClosureService.js`
- Извлечь ID сотрудников из массива `responsible` (исключить `null`)
- Вызвать `DashboardSector1CService.getEmployeesByIds()` для загрузки имён
- Создать маппинг `ID -> имя` и обогатить данные

### 3) Интеграция в ResponsibleModal
- Добавить состояние `enrichedResponsible` (ref)
- Добавить состояние `isLoadingNames` (ref)
- Добавить `watch` на `props.responsible` для автоматической загрузки имён
- Обновить шаблон: использовать `enrichedResponsible` вместо `responsible`

### 4) Обработка состояний и ошибок
- Показывать индикатор загрузки при получении имён
- Обработать ошибки: fallback на исходные данные ("ID {id}") при ошибке API
- Обработать случай, когда имя не найдено (оставить "ID {id}")

## Технические требования

### Используемые сервисы
- `DashboardSector1CService.getEmployeesByIds(employeeIds)` — загрузка имён через Bitrix24 API
- Метод Bitrix24: `user.get` с фильтром по ID
- Документация: https://context7.com/bitrix24/rest/user.get

### Формат данных

**Входные данные (из API):**
```javascript
responsible: [
  { id: 1006, name: "ID 1006", count: 10 },
  { id: 994, name: "ID 994", count: 10 },
  { id: null, name: "Не назначен", count: 0 }
]
```

**Выходные данные (обогащённые):**
```javascript
enrichedResponsible: [
  { id: 1006, name: "Иванов Иван", count: 10 },
  { id: 994, name: "Петров Пётр", count: 10 },
  { id: null, name: "Не назначен", count: 0 }
]
```

### Пример реализации

**Файл:** `vue-app/src/components/graph-admission-closure/ResponsibleModal.vue`

```vue
<script setup>
import { computed, ref, watch } from 'vue';
import { DashboardSector1CService } from '@/services/dashboard-sector-1c-service.js';

const props = defineProps({
  isVisible: {
    type: Boolean,
    default: false
  },
  responsible: {
    type: Array,
    default: () => []
  }
});

const enrichedResponsible = ref([]);
const isLoadingNames = ref(false);

// Загрузить имена при изменении responsible
watch(() => props.responsible, async (newResponsible) => {
  if (!newResponsible || newResponsible.length === 0) {
    enrichedResponsible.value = [];
    return;
  }
  
  isLoadingNames.value = true;
  try {
    enrichedResponsible.value = await enrichResponsibleWithNames(newResponsible);
  } catch (error) {
    console.error('[ResponsibleModal] Error loading employee names:', error);
    // Fallback: использовать исходные данные
    enrichedResponsible.value = newResponsible;
  } finally {
    isLoadingNames.value = false;
  }
}, { immediate: true });

async function enrichResponsibleWithNames(responsible) {
  // Извлечь ID сотрудников (исключить null)
  const employeeIds = responsible
    .filter(r => r.id !== null && r.id !== undefined)
    .map(r => r.id);
  
  if (employeeIds.length === 0) {
    return responsible; // Нет сотрудников для загрузки
  }
  
  // Загрузить имена через Bitrix24 API
  const employees = await DashboardSector1CService.getEmployeesByIds(employeeIds);
  
  // Создать маппинг ID -> имя
  const nameMap = new Map();
  employees.forEach(emp => {
    nameMap.set(emp.id, emp.name); // Формат: "Имя Фамилия"
  });
  
  // Обогатить данные именами
  return responsible.map(r => {
    if (r.id && nameMap.has(r.id)) {
      return {
        ...r,
        name: nameMap.get(r.id) // Заменить "ID 1006" на "Иванов Иван"
      };
    }
    return r; // Оставить как есть (например, "Не назначен")
  });
}

const hasData = computed(() => (enrichedResponsible.value || []).length > 0);
</script>

<template>
  <div v-if="isVisible" class="modal-backdrop">
    <div class="modal">
      <header class="modal__header">
        <h3 class="modal__title">Ответственные за неделю</h3>
        <button class="modal__close" @click="$emit('close')">✕</button>
      </header>

      <section class="modal__body">
        <div v-if="isLoadingNames" class="loading-names">
          Загрузка имён сотрудников...
        </div>
        
        <p v-else-if="!hasData" class="modal__empty">Нет данных по ответственным</p>

        <ul v-else class="responsible-list">
          <li
            v-for="person in enrichedResponsible"
            :key="person.id || person.name"
            class="responsible-list__item"
          >
            <div class="responsible-list__name">
              <span class="responsible-list__avatar" aria-hidden="true">
                {{ getInitials(person.name) }}
              </span>
              <span>{{ person.name || 'Не назначен' }}</span>
            </div>
            <div class="responsible-list__count">
              {{ person.count ?? 0 }}
            </div>
          </li>
        </ul>
      </section>

      <footer class="modal__footer">
        <button class="btn" @click="$emit('close')">Закрыть</button>
      </footer>
    </div>
  </div>
</template>
```

## Ступенчатые подзадачи

1. **Изучение существующих решений**
   - Проверить `DashboardSector1CService.getEmployeesByIds()`
   - Изучить формат ответа Bitrix24 API `user.get`
   - Проверить кэширование имён сотрудников

2. **Реализация функции обогащения**
   - Создать функцию `enrichResponsibleWithNames()`
   - Реализовать извлечение ID сотрудников
   - Реализовать загрузку имён через API
   - Реализовать маппинг и обогащение данных

3. **Интеграция в компонент**
   - Добавить состояния `enrichedResponsible` и `isLoadingNames`
   - Добавить `watch` на `props.responsible`
   - Обновить шаблон для использования `enrichedResponsible`

4. **Обработка ошибок**
   - Добавить try/catch для обработки ошибок API
   - Реализовать fallback на исходные данные
   - Добавить индикатор загрузки

5. **Тестирование**
   - Проверить загрузку имён при открытии попапа
   - Проверить отображение полных имён вместо "ID {id}"
   - Проверить обработку ошибок (fallback)
   - Проверить обработку случая "Не назначен"

## Критерии приёмки этапа

- [ ] В попапе первого уровня отображаются полные имена сотрудников ("Иванов Иван") вместо "ID 1006"
- [ ] Имена загружаются через Bitrix24 API метод `user.get` через `DashboardSector1CService.getEmployeesByIds()`
- [ ] При ошибке загрузки имени показывается fallback "ID {id}"
- [ ] При загрузке имён показывается индикатор "Загрузка имён сотрудников..."
- [ ] Случай "Не назначен" обрабатывается корректно (не пытается загрузить имя)
- [ ] Кэширование имён работает (используется существующий кэш из `EmployeeRepository`)
- [ ] Имена загружаются только один раз при открытии попапа

## Дополнительные уточнения

### Оптимизация
- Использовать существующий кэш из `EmployeeRepository` для минимизации запросов к API
- Загружать имена только для сотрудников с `id !== null`
- Не загружать имена повторно, если они уже загружены

### Обработка ошибок
- При ошибке API не ломать работу попапа
- Показывать исходные данные ("ID {id}") как fallback
- Логировать ошибки в консоль для отладки

## История правок

- 2025-12-15 21:15 (UTC+3, Брест): Создан этап 1 задачи TASK-042

