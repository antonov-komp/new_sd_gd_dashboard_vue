# TASK-038-02: Данные и загрузка для переключения стадий в попапе 1-го уровня (Vue)

**Дата создания:** 2025-12-15 12:15 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Средний  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Связь:** Этап 2 эпика TASK-038 (`TASK-038-popup-stage-switching.md`)  
**Модуль:** График состояния сектора 1С (`EmployeeDetailsModal.vue`, `GraphStateChart.vue`)  

## Цель
Реализовать получение данных 1-го уровня попапа при переключении между стадиями без закрытия модального окна. Обеспечить единый метод загрузки данных для выбранной стадии с приоритетом использования уже загруженных метаданных графиков/слепков и фолбэком на REST.

## Требования к данным
- **Минимальный набор для уровня 1:** `stageId`, `stageName`, `color`, `totalCount`, `employees[]`, `others?`.
- **Employees item:** `{ id, name, count, percentage, progressBarWidth, progressBarColor, isKeeper? }` (совместимо с существующим форматированием).
- **Стадии:** 3 фиксированные (formed/review/execution — id/label/color из stage map).
- **Цвета:** использовать единый словарь цветов стадий, чтобы согласовывалось с графиками и прогресс-барами.

## Источники данных (приоритет)
1) **Метаданные графиков/слепков (предпочтительно):**  
   - Линейный: `dataset.meta.employees[timePoint]` + totalCount по стадии.  
   - Круговая: `chartData.datasets[0].meta.employees[stageId]` + totalCount.  
   - Столбчатый: если есть мета по стадиям, использовать; иначе пропустить и перейти к REST.  
   - Проверить наличие агрегатов в скоупе текущего слепка; если мета пустая — переход к REST.
2) **REST-фолбэк (если нет метаданных):**  
   - Запрос по ID слепка/временной точке и stageId, возвращающий сотрудников и totalCount.  
   - Минимальные поля: `stageId`, `stageName`, `totalCount`, `employees[]` (id, name, count), опционально others.  
   - Пример метода: (уточнить в сервисах) — может быть proxy endpoint на бэкенде или прямой вызов Bitrix24.  
   - Обработать таймаут/ошибки: показать уведомление в попапе и не ронять текущий стейт.
   - Если REST через Bitrix24: `crm.item.list` (entityTypeId 140) с фильтром по `stageId` и `assignedById`, select: `id,title,stageId,UF_CRM_7_DEPARTMENT_HEAD,createdTime,assignedById`; на клиенте агрегировать в employees.

## Задачи этапа
1) **Собрать и задокументировать API загрузки:**  
   - Выявить доступные источники метаданных в `GraphStateChart.vue` для line/bar/doughnut.  
   - Составить интерфейс единой функции `loadStageLevel1(stageId, context)` с описанием входов (stageId, timePoint/snapshotId/graphType) и выходов (структура уровня 1).  
   - **Реализовано:** `vue-app/src/utils/graph-state/stageLevel1Loader.js` — принимает `{ stageId, graphType, timePoint|snapshotType, snapshots, meta:{line|doughnut|bar}, stageColorMap, stageNameMap, restLoader? }`, возвращает `{ stageId, stageName, color, totalCount, employees, others, snapshot }`, приоритет: метаданные → REST-фолбэк.
2) **Реализовать загрузчик с приоритетами:**  
   - Сначала попытка получить данные из метаданных (без доп. запросов).  
   - Если пусто — запросить REST и заполнить структуру уровня 1.  
   - Нормализовать данные в общий формат, включая `others` (если > maxVisible).  
3) **Интеграция в попап:**  
   - При выборе стадии из dropdown: вызвать загрузчик, показывать лоадер, по успеху обновить `level1Data` и `currentStageId`.  
   - Сбросить `level2/level3` данные и ошибки; закрыть список стадий.  
   - **Подготовлено:** в `EmployeeDetailsModal.vue` добавлен метод `reloadLevel1ForStage` (expose) с флагами `isStageLoading/loadError`, откатом к предыдущей стадии, сбросом уровней 2/3/4; использует контекст `stageSwitchContext` из родителя.
4) **Обработка ошибок/таймаутов:**  
   - Таймаут (конфигurable, например 10–15s) → уведомление и кнопка “Повторить”.  
   - Нет данных/пустой ответ → сообщение в попапе, оставить старую стадию активной.  
   - REST недоступен → лог и уведомление, откат к предыдущему состоянию попапа.  
5) **Тестовые сценарии (для ручной проверки):**  
   - Есть метаданные → быстрая подмена стадии без REST.  
   - Нет метаданных → уходит REST, возвращает корректную структуру.  
   - Ошибка REST → уведомление, стейт не ломается.  
   - Пустой ответ → уведомление, старая стадия остаётся.  
   - Клавиатурная навигация: выбор стадии → лоадер → обновление данных.

## Технические детали реализации
- **Функция загрузки:**  
  - Сигнатура (пример): `async function loadStageLevel1({ stageId, graphType, timePoint, snapshotId, stageMeta, stageColorMap })`.  
  - Возвращает нормализованный объект уровня 1 или бросает ошибку.  
  - Нормализация процентов/ширины прогресс-баров делать в утилите (можно реиспользовать `formatEmployeeProgressBarData`).
- **Нормализация данных:**  
  - employees: сортировка по count desc, truncate до maxVisible (10), остальные в `others`.  
  - percentage = count / totalCount * 100 (1 знак), progressBarWidth=percentage, color: из stageColorMap или isKeeper → оранжевый, others → серый.  
  - totalCount: если не пришло, вычислить как сумма count по employees + others.count.
- **Где вызывать:**  
  - В `EmployeeDetailsModal.vue` при выборе стадии из списка; контекст (graphType/timePoint/snapshotId) пробрасывать пропсами/emit из `GraphStateChart.vue` при открытии попапа.  
  - Хранить текущий контекст открытия (тип графика, временная точка или snapshotId), чтобы REST знали, что грузить.
- **Состояния:**  
  - `isStageLoading`, `loadError`, `currentStageId`, `level1Data`, `availableStages`.  
  - Сброс `level2Data/level3Data` при смене стадии.

## Критерии приёмки
- Единая функция/слой загрузки данных уровня 1 по stageId с приоритетом на метаданные и фолбэком REST.
- Попап корректно обновляет 1-й уровень при смене стадии, не закрываясь, с лоадером и уведомлениями об ошибках.
- Цвета и id стадий берутся из единого словаря; данные нормализованы под текущий UI прогресс-баров.
- Обработаны таймауты/ошибки/пустые ответы без поломки стейта; есть кнопка “Повторить”.
- Задокументированы источники данных, сигнатура загрузчика и тестовые сценарии.

## Связанные материалы
- `DOCS/TASKS/TASK-038-popup-stage-switching.md`
- `DOCS/TASKS/TASK-038-01-popup-stage-switching-analysis.md`
- `DOCS/ANALYSIS/graph-state-popup-interactive-levels-analysis.md`
- `DOCS/USER-GUIDE/graph-state-sector-1c/00-overview.md`
- `vue-app/src/components/graph-state/EmployeeDetailsModal.vue`
- `vue-app/src/components/graph-state/GraphStateChart.vue`

