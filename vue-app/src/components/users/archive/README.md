# Архив старых компонентов управления пользователями

**Дата создания архива:** 2026-01-12 (UTC+3, Брест)
**TASK:** [TASK-089](https://github.com/.../TASK-089-unify-user-management-interface.md)

## Описание

Этот архив содержит старые компоненты интерфейса управления пользователями, которые были заменены новым единым интерфейсом `UnifiedUserManagement.vue` в рамках TASK-089.

## Старые компоненты (УДАЛЕНЫ ИЗ ПРОДАКШЕНА)

### UserActivityList.vue
- **Статус:** ❌ УДАЛЕН
- **Причина:** Содержал кнопку "Дашборд анализа" для переключения между режимами
- **Замена:** `UnifiedUserManagement.vue` + `UserListPanel.vue`

### UserActivityFilters.vue
- **Статус:** ❌ УДАЛЕН
- **Причина:** Раздельные фильтры для каждого режима
- **Замена:** Единая система фильтров в `UserListPanel.vue`

### UserActivityStats.vue
- **Статус:** ❌ УДАЛЕН
- **Причина:** Базовая статистика отдельно от основного интерфейса
- **Замена:** Контекстная боковая панель `ContextSidebar.vue`

### HiddenUsersManager.vue
- **Статус:** ❌ УДАЛЕН
- **Причина:** Отдельное управление скрытыми пользователями
- **Замена:** Интегрировано в `UserListPanel.vue`

### UserActivityCard.vue
- **Статус:** ❌ УДАЛЕН
- **Причина:** Карточка пользователя для старого интерфейса
- **Замена:** `UnifiedUserCard.vue`

## Миграция состояния

Настройки пользователей из старого интерфейса мигрированы с помощью `StateMigrationService`:

- Режим отображения (`user-management-view-mode`)
- Список скрытых пользователей (`hidden-users-list`)
- Фильтры (`activity-filters`)
- Предпочтения пользователя (`user-theme`, `items-per-page`, etc.)

## Новый интерфейс

### UnifiedUserManagement.vue
- **Расположение:** `vue-app/src/components/users/management/UnifiedUserManagement.vue`
- **Особенности:**
  - Единый интерфейс без переключения режимов
  - Drill-down навигация с breadcrumbs
  - Контекстная боковая панель
  - Масштабируемая архитектура

### Архитектура
```
vue-app/src/components/users/management/
├── UnifiedUserManagement.vue     # Главный компонент
├── UserListPanel.vue            # Панель списка пользователей
├── AnalysisPanel.vue            # Панель анализа (в разработке)
├── ManagementPanel.vue          # Панель управления (в разработке)
├── ContextSidebar.vue           # Боковая панель
└── DrillDownNavigation.vue      # Навигация

vue-app/src/components/users/shared/
├── UnifiedUserCard.vue          # Карточка пользователя
└── ...

vue-app/src/services/userManagement/
├── ContextManager.js            # Управление контекстами
└── StateMigrationService.js     # Миграция состояния
```

## Восстановление (при необходимости)

Если потребуется откат к старому интерфейсу:

1. Восстановить компоненты из архива
2. Отменить изменения в `UsersManagementPage.vue`
3. Удалить новый интерфейс
4. Очистить миграцию: `StateMigrationService.resetMigration()`

## Контакты

- **Задача:** TASK-089
- **Исполнитель:** Vue.js разработчик
- **Документация:** `DOCS/TASKS/TASK-089-unify-user-management-interface.md`