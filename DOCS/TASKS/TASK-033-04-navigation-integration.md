# TASK-033-04: Этап 4 - Интеграция навигации и состояния попапа

**Дата создания:** 2025-12-12 09:24 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-033

---

## 📋 Описание этапа

Реализация единой системы управления состоянием попапа и плавной навигации между всеми тремя уровнями с сохранением данных, анимациями переходов и обработкой всех граничных случаев.

**Цель:** Обеспечить интуитивную и плавную навигацию между уровнями попапа с сохранением контекста и данных на каждом этапе.

---

## 🎯 Цель этапа

Создать единую систему управления состоянием попапа, которая:
- Сохраняет данные всех уровней при переходах
- Обеспечивает плавную навигацию между уровнями
- Поддерживает возврат на предыдущие уровни
- Интегрируется с компонентом GraphStateChart
- Обрабатывает все граничные случаи
- Включает плавные анимации переходов

**Ожидаемый результат:**
- Единое состояние попапа для всех трех уровней
- Плавная навигация: 1 → 2 → 3 → 2 → 1
- Сохранение данных при переходах
- Анимации переходов между уровнями
- Обработка всех граничных случаев
- Интеграция с GraphStateChart

---

## 🏗️ Архитектура состояния попапа

### Единая структура состояния

```javascript
/**
 * Единое состояние попапа для всех уровней
 */
const popupState = ref({
  // Текущий уровень (1, 2, или 3)
  level: 1,
  
  // Данные уровня 1 (список сотрудников стадии)
  level1: {
    stageName: string,        // Название стадии
    stageId: string,          // ID стадии
    totalCount: number,       // Общее количество тикетов стадии
    employees: Array,         // Массив сотрудников
    others: Object | null,    // Группа "Другие" (если есть)
    snapshot: Object | null,  // Слепок с данными (для получения тикетов)
    ticketDetails: Object | null // Детали тикетов (если загружены через API)
  },
  
  // Данные уровня 2 (временные градации сотрудника)
  level2: {
    employeeId: number,       // ID сотрудника
    employeeName: string,     // Имя сотрудника
    stageId: string,          // ID стадии
    stageName: string,        // Название стадии
    totalCount: number,       // Общее количество тикетов сотрудника
    dateCategories: Array,    // Массив категорий давности
    snapshot: Object | null,  // Слепок (для получения тикетов)
    ticketDetails: Object | null // Детали тикетов
  },
  
  // Данные уровня 3 (заказчики градации)
  level3: {
    employeeId: number,       // ID сотрудника
    employeeName: string,     // Имя сотрудника
    stageId: string,         // ID стадии
    stageName: string,       // Название стадии
    dateCategory: string,    // Ключ категории давности
    dateCategoryLabel: string, // Название категории
    totalCount: number,      // Общее количество тикетов в градации
    departments: Array,      // Массив заказчиков
    snapshot: Object | null,  // Слепок (для получения тикетов)
    ticketDetails: Object | null // Детали тикетов
  }
});
```

### Альтернативный подход (раздельные refs)

```javascript
// Более простой подход с раздельными refs
const popupLevel = ref(1);
const level1Data = ref(null);
const level2Data = ref(null);
const level3Data = ref(null);
```

**Рекомендация:** Использовать раздельные refs для упрощения кода и лучшей читаемости.

---

## 📝 Подзадачи

### Подзадача 4.1: Управление состоянием попапа

**Цель:** Создать единую систему управления состоянием попапа с сохранением данных всех уровней.

#### Задачи

1. **Изучить текущую структуру компонента EmployeeDetailsModal**
   - Открыть `vue-app/src/components/graph-state/EmployeeDetailsModal.vue`
   - Найти текущие props и refs
   - Определить, какие данные уже передаются

2. **Создать структуру состояния**
   ```javascript
   // В <script setup> компонента EmployeeDetailsModal.vue
   
   import { ref, computed } from 'vue';
   
   /**
    * Текущий уровень попапа (1, 2, или 3)
    */
   const popupLevel = ref(1);
   
   /**
    * Данные уровня 1 (список сотрудников стадии)
    * Сохраняются при открытии попапа и при возврате с уровня 2
    */
   const level1Data = ref(null);
   
   /**
    * Данные уровня 2 (временные градации сотрудника)
    * Сохраняются при переходе на уровень 2
    */
   const level2Data = ref(null);
   
   /**
    * Данные уровня 3 (заказчики градации)
    * Сохраняются при переходе на уровень 3
    */
   const level3Data = ref(null);
   ```

3. **Инициализация состояния при открытии попапа**
   ```javascript
   /**
    * Инициализация данных уровня 1 при открытии попапа
    * Вызывается при изменении isVisible с false на true
    */
   watch(() => props.isVisible, (newValue) => {
     if (newValue) {
       // Инициализация уровня 1 данными из props
       level1Data.value = {
         stageName: props.stageName,
         stageId: props.stageId,
         totalCount: props.totalCount,
         employees: props.employees || [],
         others: props.others || null,
         snapshot: props.snapshot || null,
         ticketDetails: props.ticketDetails || null
       };
       
       // Сброс уровней 2 и 3
       level2Data.value = null;
       level3Data.value = null;
       popupLevel.value = 1;
     } else {
       // При закрытии сбрасываем все данные
       resetPopup();
     }
   });
   ```

4. **Computed-свойства для удобного доступа**
   ```javascript
   /**
    * Текущие данные в зависимости от уровня
    */
   const currentLevelData = computed(() => {
     switch (popupLevel.value) {
       case 1:
         return level1Data.value;
       case 2:
         return level2Data.value;
       case 3:
         return level3Data.value;
       default:
         return null;
     }
   });
   
   /**
    * Проверка возможности возврата назад
    */
   const canGoBack = computed(() => {
     return popupLevel.value > 1;
   });
   
   /**
    * Заголовок попапа в зависимости от уровня
    */
   const popupTitle = computed(() => {
     switch (popupLevel.value) {
       case 1:
         return level1Data.value?.stageName || '';
       case 2:
         return level2Data.value?.employeeName || '';
       case 3:
         return `${level2Data.value?.employeeName || ''} — ${level3Data.value?.dateCategoryLabel || ''}`;
       default:
         return '';
     }
   });
   ```

5. **Функция сброса состояния**
   ```javascript
   /**
    * Полный сброс состояния попапа
    * Вызывается при закрытии попапа
    */
   function resetPopup() {
     popupLevel.value = 1;
     level1Data.value = null;
     level2Data.value = null;
     level3Data.value = null;
   }
   ```

**Критерии завершения:**
- [ ] Структура состояния создана
- [ ] Инициализация при открытии попапа работает
- [ ] Computed-свойства для доступа к данным реализованы
- [ ] Функция сброса состояния работает
- [ ] Состояние сохраняется при переходах между уровнями

---

### Подзадача 4.2: Функции навигации

**Цель:** Реализовать все функции навигации между уровнями попапа.

#### Задачи

1. **Функция перехода на уровень 2**
   ```javascript
   /**
    * Переход на уровень 2 (временные градации сотрудника)
    * 
    * @param {Object} employee - Объект сотрудника из уровня 1
    * @param {number} employee.id - ID сотрудника
    * @param {string} employee.name - Имя сотрудника
    */
   async function goToLevel2(employee) {
     if (!employee || !employee.id) {
       console.error('Invalid employee data for level 2');
       return;
     }
     
     // Сохранить данные уровня 1 (если еще не сохранены)
     if (!level1Data.value) {
       level1Data.value = {
         stageName: props.stageName,
         stageId: props.stageId,
         totalCount: props.totalCount,
         employees: props.employees || [],
         others: props.others || null,
         snapshot: props.snapshot || null,
         ticketDetails: props.ticketDetails || null
       };
     }
     
     // Получить тикеты сотрудника на стадии
     const tickets = await getEmployeeTicketsForStage(
       employee.id,
       level1Data.value.stageId,
       level1Data.value.snapshot,
       level1Data.value.ticketDetails
     );
     
     if (!tickets || tickets.length === 0) {
       // Нет тикетов у сотрудника
       console.warn(`No tickets found for employee ${employee.id} on stage ${level1Data.value.stageId}`);
       // Можно показать уведомление пользователю
       return;
     }
     
     // Группировать по временным градациям
     const dateCategories = groupTicketsByDateCategory(tickets);
     
     // Сохранить данные уровня 2
     level2Data.value = {
       employeeId: employee.id,
       employeeName: employee.name,
       stageId: level1Data.value.stageId,
       stageName: level1Data.value.stageName,
       totalCount: tickets.length,
       dateCategories: dateCategories,
       snapshot: level1Data.value.snapshot,
       ticketDetails: level1Data.value.ticketDetails
     };
     
     // Перейти на уровень 2
     popupLevel.value = 2;
   }
   ```

2. **Функция перехода на уровень 3**
   ```javascript
   /**
    * Переход на уровень 3 (детализация по заказчикам)
    * 
    * @param {Object} category - Объект категории давности из уровня 2
    * @param {string} category.category - Ключ категории ('today', 'yesterday', ...)
    * @param {string} category.label - Название категории ('СЕГОДНЯ', 'ВЧЕРА', ...)
    * @param {number} category.count - Количество тикетов в категории
    * @param {Array} category.tickets - Массив тикетов в категории
    */
   function goToLevel3(category) {
     if (!category || !category.tickets || category.tickets.length === 0) {
       console.warn('No tickets in category:', category?.label);
       return;
     }
     
     // Проверить наличие данных уровня 2
     if (!level2Data.value) {
       console.error('Level 2 data not found');
       return;
     }
     
     // Группировать тикеты по заказчикам
     const departments = groupTicketsByDepartment(category.tickets);
     
     // Сохранить данные уровня 3
     level3Data.value = {
       employeeId: level2Data.value.employeeId,
       employeeName: level2Data.value.employeeName,
       stageId: level2Data.value.stageId,
       stageName: level2Data.value.stageName,
       dateCategory: category.category,
       dateCategoryLabel: category.label,
       totalCount: category.count,
       departments: departments,
       snapshot: level2Data.value.snapshot,
       ticketDetails: level2Data.value.ticketDetails
     };
     
     // Перейти на уровень 3
     popupLevel.value = 3;
   }
   ```

3. **Функция возврата назад**
   ```javascript
   /**
    * Возврат на предыдущий уровень
    * 
    * Логика:
    * - С уровня 3 → уровень 2 (очистить данные уровня 3)
    * - С уровня 2 → уровень 1 (очистить данные уровня 2)
    * - С уровня 1 → закрыть попап (через emit('close'))
    */
   function goBack() {
     if (popupLevel.value === 3) {
       // Возврат с уровня 3 на уровень 2
       popupLevel.value = 2;
       level3Data.value = null; // Очистить данные уровня 3
     } else if (popupLevel.value === 2) {
       // Возврат с уровня 2 на уровень 1
       popupLevel.value = 1;
       level2Data.value = null; // Очистить данные уровня 2
       level3Data.value = null; // Очистить данные уровня 3 (на всякий случай)
     } else if (popupLevel.value === 1) {
       // На уровне 1 кнопка "Назад" не должна отображаться
       // Но если вызвана, закрываем попап
       close();
     }
   }
   ```

4. **Функции прямого перехода (для хлебных крошек)**
   ```javascript
   /**
    * Прямой переход на уровень 1 (через хлебные крошки)
    */
   function goToLevel1() {
     if (level1Data.value) {
       popupLevel.value = 1;
       level2Data.value = null;
       level3Data.value = null;
     }
   }
   
   /**
    * Прямой переход на уровень 2 (через хлебные крошки)
    */
   function goToLevel2Direct() {
     if (level2Data.value) {
       popupLevel.value = 2;
       level3Data.value = null;
     }
   }
   ```

5. **Обработка ошибок навигации**
   ```javascript
   /**
    * Проверка возможности перехода на уровень
    * 
    * @param {number} targetLevel - Целевой уровень (1, 2, или 3)
    * @returns {boolean} true, если переход возможен
    */
   function canNavigateToLevel(targetLevel) {
     switch (targetLevel) {
       case 1:
         return level1Data.value !== null;
       case 2:
         return level2Data.value !== null;
       case 3:
         return level3Data.value !== null;
       default:
         return false;
     }
   }
   ```

6. **Импорт необходимых функций**
   ```javascript
   import { 
     getEmployeeTicketsForStage,
     groupTicketsByDateCategory,
     groupTicketsByDepartment
   } from '@/utils/graph-state/popupNavigationUtils.js';
   ```

**Критерии завершения:**
- [ ] Функция `goToLevel2()` реализована
- [ ] Функция `goToLevel3()` реализована
- [ ] Функция `goBack()` реализована
- [ ] Функции прямого перехода реализованы
- [ ] Обработка ошибок навигации добавлена
- [ ] Все функции протестированы

---

### Подзадача 4.3: Обновление компонента GraphStateChart

**Цель:** Обновить компонент GraphStateChart для передачи всех необходимых данных в попап.

#### Задачи

1. **Изучить текущую передачу данных в попап**
   - Найти компонент `EmployeeDetailsModal` в `GraphStateChart.vue`
   - Проверить, какие props передаются
   - Определить, какие данные отсутствуют

2. **Добавить необходимые props**
   ```vue
   <!-- В GraphStateChart.vue -->
   <EmployeeDetailsModal
     :is-visible="showEmployeeModal"
     :stage-name="modalStageName"
     :stage-id="modalStageId"           <!-- Добавить -->
     :total-count="modalTotalCount"
     :employees="modalEmployees"
     :others="modalOthers"
     :snapshot="currentSnapshot"        <!-- Добавить -->
     :ticket-details="ticketDetails"    <!-- Добавить (если есть) -->
     @close="closeEmployeeModal"
   />
   ```

3. **Добавить ref для snapshot**
   ```javascript
   // В GraphStateChart.vue
   
   /**
    * Текущий слепок для передачи в попап
    * Сохраняется при открытии попапа
    */
   const currentSnapshot = ref(null);
   ```

4. **Обновить функцию открытия попапа для линейного графика**
   ```javascript
   /**
    * Открытие модального окна для линейного графика
    * 
    * @param {string} stageId - ID этапа
    * @param {string} timePoint - Временная точка ('weekStart' | 'weekEnd' | 'current')
    * @param {Array} employeeData - Данные сотрудников
    */
   function openEmployeeDetailsModalForLine(stageId, timePoint, employeeData) {
     const stage = stages.find(s => s.id === stageId);
     if (!stage) {
       return;
     }
     
     // Получить слепок по временной точке
     const snapshot = getSnapshotByTimePoint(timePoint);
     
     // Сохранить слепок для передачи в попап
     currentSnapshot.value = snapshot;
     
     // Получить общее количество тикетов этапа
     const totalCount = snapshot?.statistics?.stages?.[stageId]?.count || 0;
     
     // Форматирование данных для прогресс-баров
     const formatted = formatEmployeeProgressBarData(
       employeeData,
       totalCount,
       stage.color,
       10
     );
     
     // Установить данные для уровня 1
     modalStageName.value = stage.name;
     modalStageId.value = stageId; // Добавить
     modalTotalCount.value = totalCount;
     modalEmployees.value = formatted.employees;
     modalOthers.value = formatted.others;
     
     // Открыть попап
     showEmployeeModal.value = true;
   }
   ```

5. **Обновить функцию открытия попапа для круговой диаграммы**
   ```javascript
   /**
    * Открытие модального окна для круговой диаграммы
    * 
    * @param {string} stageId - ID этапа
    * @param {Object} employeeData - Данные сотрудников из метаданных
    */
   function openEmployeeDetailsModalForDoughnut(stageId, employeeData) {
     if (!employeeData || !employeeData.employees || employeeData.employees.length === 0) {
       notifications.warning('Нет данных о сотрудниках для этого этапа');
       return;
     }
     
     // Получить слепок (используем текущий или последний доступный)
     const snapshot = snapshots.value.current || snapshots.value.weekEnd || snapshots.value.weekStart;
     currentSnapshot.value = snapshot;
     
     // Получить стадию
     const stage = stages.find(s => s.id === stageId);
     
     // Установить данные для уровня 1
     modalStageName.value = employeeData.stageName;
     modalStageId.value = stageId; // Добавить
     modalTotalCount.value = employeeData.totalCount;
     modalEmployees.value = employeeData.employees;
     modalOthers.value = employeeData.others;
     
     // Открыть попап
     showEmployeeModal.value = true;
   }
   ```

6. **Добавить ref для modalStageId**
   ```javascript
   // В GraphStateChart.vue
   
   /**
    * ID стадии для попапа
    */
   const modalStageId = ref('');
   ```

7. **Обновить функцию закрытия попапа**
   ```javascript
   /**
    * Закрытие модального окна с детализацией по сотрудникам
    */
   function closeEmployeeModal() {
     showEmployeeModal.value = false;
     modalStageName.value = '';
     modalStageId.value = ''; // Очистить
     modalTotalCount.value = 0;
     modalEmployees.value = [];
     modalOthers.value = null;
     currentSnapshot.value = null; // Очистить слепок
   }
   ```

8. **Добавить загрузку деталей тикетов (опционально)**
   ```javascript
   /**
    * Детали тикетов (если загружены через API)
    * Ключ - ID тикета, значение - объект тикета с полными данными
    */
   const ticketDetails = ref(null);
   
   /**
    * Загрузка деталей тикетов для попапа
    * Вызывается при открытии попапа, если слепок не содержит полных данных
    */
   async function loadTicketDetailsForPopup(snapshot) {
     if (!snapshot || !snapshot.ticketIds || snapshot.ticketIds.length === 0) {
       return null;
     }
     
     // Проверить, нужна ли загрузка деталей
     // Если в слепке уже есть stageId и departmentHead в тикетах, загрузка не нужна
     const needsLoading = !snapshot.tickets || 
                          !snapshot.tickets[0]?.stageId || 
                          !snapshot.tickets[0]?.departmentHead;
     
     if (!needsLoading) {
       // Данные уже есть в слепке
       return null;
     }
     
     // Загрузить детали через API
     try {
       const details = await TicketDetailsService.getTicketsDetails(snapshot.ticketIds);
       return details;
     } catch (error) {
       console.error('Error loading ticket details:', error);
       return null;
     }
   }
   ```

**Критерии завершения:**
- [ ] Компонент GraphStateChart обновлен
- [ ] Все необходимые props передаются в попап
- [ ] Слепок сохраняется и передается в попап
- [ ] ID стадии передается в попап
- [ ] Функции открытия попапа обновлены
- [ ] Загрузка деталей тикетов реализована (если необходимо)

---

### Подзадача 4.4: Анимации переходов

**Цель:** Добавить плавные анимации при переходах между уровнями попапа.

#### Задачи

1. **Изучить Vue transitions**
   - Документация: https://vuejs.org/guide/built-ins/transition.html
   - Определить тип анимации (fade, slide, scale)

2. **Добавить transition для уровней**
   ```vue
   <template>
     <Teleport to="body">
       <div v-if="isVisible" class="employee-details-modal" ...>
         <div class="modal-content">
           <Transition name="level" mode="out-in">
             <!-- Уровень 1: Список сотрудников -->
             <div v-if="popupLevel === 1" key="level-1" class="level-1">
               <!-- Контент уровня 1 -->
             </div>
             
             <!-- Уровень 2: Временные градации -->
             <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
               <!-- Контент уровня 2 -->
             </div>
             
             <!-- Уровень 3: Заказчики -->
             <div v-else-if="popupLevel === 3" key="level-3" class="level-3">
               <!-- Контент уровня 3 -->
             </div>
           </Transition>
         </div>
       </div>
     </Teleport>
   </template>
   ```

3. **Добавить CSS анимации**
   ```css
   /* Анимации переходов между уровнями */
   
   /* Вход (появление нового уровня) */
   .level-enter-active {
     transition: all 0.3s ease-out;
   }
   
   .level-enter-from {
     opacity: 0;
     transform: translateX(20px);
   }
   
   .level-enter-to {
     opacity: 1;
     transform: translateX(0);
   }
   
   /* Выход (исчезновение текущего уровня) */
   .level-leave-active {
     transition: all 0.3s ease-in;
   }
   
   .level-leave-from {
     opacity: 1;
     transform: translateX(0);
   }
   
   .level-leave-to {
     opacity: 0;
     transform: translateX(-20px);
   }
   ```

4. **Альтернативная анимация (fade)**
   ```css
   /* Простая fade анимация */
   .level-enter-active,
   .level-leave-active {
     transition: opacity 0.25s ease;
   }
   
   .level-enter-from,
   .level-leave-to {
     opacity: 0;
   }
   ```

5. **Анимация для кнопки "Назад"**
   ```css
   .btn-back {
     transition: all 0.2s ease;
   }
   
   .btn-back:hover {
     transform: translateX(-2px);
   }
   
   .btn-back:active {
     transform: translateX(-4px);
   }
   ```

6. **Анимация для строк таблицы/списка**
   ```css
   .category-item,
   .department-row {
     transition: all 0.2s ease;
   }
   
   .category-item:hover,
   .department-row:hover {
     transform: translateX(4px);
   }
   ```

7. **Оптимизация производительности**
   ```css
   /* Использование will-change для оптимизации анимаций */
   .level-enter-active,
   .level-leave-active {
     will-change: opacity, transform;
   }
   
   /* Отключение will-change после анимации */
   .level-enter-to,
   .level-leave-from {
     will-change: auto;
   }
   ```

**Критерии завершения:**
- [ ] Transition компонент добавлен
- [ ] CSS анимации для переходов созданы
- [ ] Анимации плавные и не замедляют работу
- [ ] Анимации работают в обоих направлениях (вперед и назад)
- [ ] Производительность анимаций оптимизирована

---

### Подзадача 4.5: Обработка граничных случаев

**Цель:** Обработать все возможные граничные случаи и ошибки в навигации попапа.

#### Задачи

1. **Обработка отсутствия данных уровня 1**
   ```javascript
   /**
    * Проверка наличия данных уровня 1
    */
   function validateLevel1Data() {
     if (!level1Data.value) {
       console.error('Level 1 data is missing');
       // Закрыть попап или показать ошибку
       close();
       return false;
     }
     
     if (!level1Data.value.stageId) {
       console.error('Stage ID is missing in level 1 data');
       return false;
     }
     
     return true;
   }
   ```

2. **Обработка отсутствия тикетов у сотрудника**
   ```javascript
   /**
    * Обработка случая, когда у сотрудника нет тикетов на стадии
    */
   async function handleEmployeeClick(employee) {
     // ... получение тикетов ...
     
     if (!tickets || tickets.length === 0) {
       // Показать уведомление пользователю
       notifications.info(`У сотрудника "${employee.name}" нет тикетов на стадии "${level1Data.value.stageName}"`);
       return;
     }
     
     // Продолжить переход на уровень 2
     goToLevel2(employee);
   }
   ```

3. **Обработка отсутствия тикетов в категории**
   ```javascript
   /**
    * Обработка случая, когда в категории нет тикетов
    */
   function handleCategoryClick(category) {
     if (!category || category.count === 0) {
       notifications.info(`В категории "${category?.label || 'неизвестная'}" нет тикетов`);
       return;
     }
     
     if (!category.tickets || category.tickets.length === 0) {
       console.warn('Category has count but no tickets array');
       // Попытаться получить тикеты из других источников
       return;
     }
     
     // Продолжить переход на уровень 3
     goToLevel3(category);
   }
   ```

4. **Обработка отсутствия заказчиков**
   ```javascript
   /**
    * Обработка случая, когда все тикеты без заказчика
    */
   function groupTicketsByDepartment(tickets) {
     // ... группировка ...
     
     // Если все тикеты без заказчика
     if (departments.length === 1 && departments[0].departmentName === 'Без заказчика') {
       // Это нормальная ситуация, просто вернуть результат
       return departments;
     }
     
     return departments;
   }
   ```

5. **Обработка ошибок загрузки данных**
   ```javascript
   /**
    * Обработка ошибок при загрузке тикетов
    */
   async function getEmployeeTicketsForStage(employeeId, stageId, snapshot, ticketDetails) {
     try {
       // ... получение тикетов ...
       return tickets;
     } catch (error) {
       console.error('Error getting employee tickets:', error);
       notifications.error('Ошибка загрузки данных о тикетах');
       return [];
     }
   }
   ```

6. **Обработка некорректного состояния**
   ```javascript
   /**
    * Восстановление корректного состояния при ошибках
    */
   function recoverFromError() {
     // Если данные уровня 2 отсутствуют, но мы на уровне 2
     if (popupLevel.value === 2 && !level2Data.value) {
       console.warn('Level 2 data missing, returning to level 1');
       popupLevel.value = 1;
     }
     
     // Если данные уровня 3 отсутствуют, но мы на уровне 3
     if (popupLevel.value === 3 && !level3Data.value) {
       console.warn('Level 3 data missing, returning to level 2');
       if (level2Data.value) {
         popupLevel.value = 2;
       } else {
         popupLevel.value = 1;
       }
     }
   }
   ```

7. **Валидация данных при переходах**
   ```javascript
   /**
    * Валидация данных перед переходом на уровень
    */
   function validateBeforeNavigation(targetLevel) {
     switch (targetLevel) {
       case 2:
         if (!level1Data.value || !level1Data.value.stageId) {
           console.error('Cannot navigate to level 2: missing level 1 data');
           return false;
         }
         return true;
       
       case 3:
         if (!level2Data.value || !level2Data.value.dateCategories) {
           console.error('Cannot navigate to level 3: missing level 2 data');
           return false;
         }
         return true;
       
       default:
         return true;
     }
   }
   ```

8. **Логирование для отладки**
   ```javascript
   /**
    * Логирование состояния попапа (только в режиме разработки)
   */
   function logPopupState() {
     if (import.meta.env?.MODE !== 'production') {
       console.log('Popup state:', {
         level: popupLevel.value,
         level1: level1Data.value ? 'exists' : 'null',
         level2: level2Data.value ? 'exists' : 'null',
         level3: level3Data.value ? 'exists' : 'null'
       });
     }
   }
   ```

**Критерии завершения:**
- [ ] Обработка отсутствия данных уровня 1 реализована
- [ ] Обработка отсутствия тикетов у сотрудника реализована
- [ ] Обработка отсутствия тикетов в категории реализована
- [ ] Обработка отсутствия заказчиков реализована
- [ ] Обработка ошибок загрузки данных реализована
- [ ] Восстановление корректного состояния работает
- [ ] Валидация данных перед переходами работает
- [ ] Логирование для отладки добавлено

---

## 🔄 Интеграция всех компонентов

### Полная структура компонента EmployeeDetailsModal

```vue
<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="employee-details-modal"
      @click.self="close"
      @keydown.esc="close"
    >
      <div class="modal-content">
        <!-- Хлебные крошки (опционально) -->
        <div v-if="popupLevel > 1" class="breadcrumbs">
          <span class="breadcrumb-item" @click="goToLevel1">
            {{ level1Data?.stageName || 'Стадия' }}
          </span>
          <span v-if="popupLevel >= 2" class="breadcrumb-separator">→</span>
          <span v-if="popupLevel >= 2" class="breadcrumb-item" @click="goToLevel2Direct">
            {{ level2Data?.employeeName || 'Сотрудник' }}
          </span>
          <span v-if="popupLevel === 3" class="breadcrumb-separator">→</span>
          <span v-if="popupLevel === 3" class="breadcrumb-item active">
            {{ level3Data?.dateCategoryLabel || 'Градация' }}
          </span>
        </div>
        
        <!-- Transition для плавной анимации -->
        <Transition name="level" mode="out-in">
          <!-- Уровень 1: Список сотрудников -->
          <div v-if="popupLevel === 1" key="level-1" class="level-1">
            <!-- Контент уровня 1 -->
          </div>
          
          <!-- Уровень 2: Временные градации -->
          <div v-else-if="popupLevel === 2" key="level-2" class="level-2">
            <!-- Контент уровня 2 -->
          </div>
          
          <!-- Уровень 3: Заказчики -->
          <div v-else-if="popupLevel === 3" key="level-3" class="level-3">
            <!-- Контент уровня 3 -->
          </div>
        </Transition>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { 
  getEmployeeTicketsForStage,
  groupTicketsByDateCategory,
  groupTicketsByDepartment
} from '@/utils/graph-state/popupNavigationUtils.js';
import { useNotifications } from '@/composables/useNotifications.js';

const props = defineProps({
  isVisible: Boolean,
  stageName: String,
  stageId: String,        // Добавить
  totalCount: Number,
  employees: Array,
  others: Object | null,
  snapshot: Object | null,      // Добавить
  ticketDetails: Object | null  // Добавить
});

const emit = defineEmits(['close']);

const notifications = useNotifications();

// Состояние попапа
const popupLevel = ref(1);
const level1Data = ref(null);
const level2Data = ref(null);
const level3Data = ref(null);

// Инициализация при открытии
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    initializeLevel1();
  } else {
    resetPopup();
  }
});

// Функции навигации
function initializeLevel1() { /* ... */ }
function goToLevel2(employee) { /* ... */ }
function goToLevel3(category) { /* ... */ }
function goBack() { /* ... */ }
function goToLevel1() { /* ... */ }
function goToLevel2Direct() { /* ... */ }
function resetPopup() { /* ... */ }
function close() { /* ... */ }

// Обработчики кликов
function handleEmployeeClick(employee) { /* ... */ }
function handleCategoryClick(category) { /* ... */ }

// Валидация и обработка ошибок
function validateLevel1Data() { /* ... */ }
function validateBeforeNavigation(targetLevel) { /* ... */ }
function recoverFromError() { /* ... */ }
</script>
```

---

## 📊 Примеры сценариев навигации

### Сценарий 1: Полный путь (1 → 2 → 3 → 2 → 1)

```javascript
// 1. Открытие попапа (уровень 1)
popupLevel = 1
level1Data = { stageName: "Сформировано обращение", ... }

// 2. Клик на сотрудника (1 → 2)
goToLevel2(employee)
popupLevel = 2
level2Data = { employeeName: "Иван Иванов", dateCategories: [...] }

// 3. Клик на градацию (2 → 3)
goToLevel3(category)
popupLevel = 3
level3Data = { departments: [...] }

// 4. Возврат назад (3 → 2)
goBack()
popupLevel = 2
level3Data = null

// 5. Возврат назад (2 → 1)
goBack()
popupLevel = 1
level2Data = null
level3Data = null
```

### Сценарий 2: Прямой переход через хлебные крошки

```javascript
// На уровне 3, клик на "Стадия" в хлебных крошках
goToLevel1()
popupLevel = 1
level2Data = null
level3Data = null

// На уровне 3, клик на "Сотрудник" в хлебных крошках
goToLevel2Direct()
popupLevel = 2
level3Data = null
```

### Сценарий 3: Обработка ошибок

```javascript
// Попытка перехода на уровень 2 без данных уровня 1
if (!validateBeforeNavigation(2)) {
  // Показать ошибку, не переходить
  return;
}

// Попытка перехода на уровень 3 без тикетов в категории
if (category.count === 0) {
  // Показать уведомление, не переходить
  notifications.info('Нет тикетов в этой категории');
  return;
}
```

---

## 🎨 Визуальные улучшения

### Индикатор текущего уровня

```vue
<!-- Индикатор уровня (опционально) -->
<div class="level-indicator">
  <span :class="{ active: popupLevel === 1 }">1</span>
  <span class="separator">→</span>
  <span :class="{ active: popupLevel === 2 }">2</span>
  <span class="separator">→</span>
  <span :class="{ active: popupLevel === 3 }">3</span>
</div>
```

```css
.level-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--b24-text-muted, #9ca3af);
}

.level-indicator span {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: var(--b24-bg-light, #f3f4f6);
  color: var(--b24-text-muted, #9ca3af);
  font-weight: 600;
  transition: all 0.2s ease;
}

.level-indicator span.active {
  background-color: var(--b24-primary, #007bff);
  color: white;
}

.level-indicator .separator {
  width: auto;
  height: auto;
  background: transparent;
  color: var(--b24-text-muted, #9ca3af);
}
```

---

## 📚 Связанные файлы

- `vue-app/src/components/graph-state/EmployeeDetailsModal.vue` — компонент попапа
- `vue-app/src/components/graph-state/GraphStateChart.vue` — компонент графика
- `vue-app/src/utils/graph-state/popupNavigationUtils.js` — утилиты навигации
- `vue-app/src/composables/useNotifications.js` — композабл уведомлений
- `DOCS/TASKS/TASK-033-02-level-2-implementation.md` — этап 2
- `DOCS/TASKS/TASK-033-03-level-3-implementation.md` — этап 3

---

## ✅ Критерии приёмки этапа 4

- [ ] Единое состояние попапа реализовано
- [ ] Навигация между всеми уровнями работает корректно
- [ ] Данные сохраняются при переходах
- [ ] Функция `goBack()` работает на всех уровнях
- [ ] Прямые переходы через хлебные крошки работают
- [ ] Анимации переходов плавные
- [ ] Компонент GraphStateChart обновлен
- [ ] Все необходимые props передаются в попап
- [ ] Обработка граничных случаев реализована
- [ ] Валидация данных перед переходами работает
- [ ] Ошибки обрабатываются корректно
- [ ] Логирование для отладки добавлено

---

## 🔄 Зависимости

**Зависит от:**
- Этап 2 (TASK-033-02): Реализация уровня 2
- Этап 3 (TASK-033-03): Реализация уровня 3
- Этап 1 (TASK-033-01): Подготовка данных (для получения тикетов)

**Требует для следующего этапа:**
- Этап 5 (TASK-033-05): Тестирование и оптимизация
  - Все три уровня должны работать вместе
  - Навигация должна быть протестирована

---

## 📝 История правок

- **2025-12-12 09:24 (UTC+3, Брест):** Создан документ этапа 4
  - Добавлены 5 подзадач с детальной реализацией
  - Описана архитектура состояния попапа
  - Добавлены примеры всех функций навигации
  - Описаны анимации переходов
  - Добавлена обработка всех граничных случаев

---

**Автор:** Технический писатель  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Дата:** 2025-12-12 09:24 (UTC+3, Брест)





