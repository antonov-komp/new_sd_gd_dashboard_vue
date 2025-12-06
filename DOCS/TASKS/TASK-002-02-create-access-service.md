# TASK-002-02: Создание сервиса проверки доступа

**Дата создания:** 2025-12-05 21:51 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Высокий  
**Исполнитель:** Bitrix24 Программист (Vue.js)  
**Зависимости:** TASK-002-01  
**Связанные задачи:** TASK-002-03, TASK-002-04, TASK-002-05

## Описание
Создать сервис для проверки доступа пользователя к приложению на основе его ID отдела. Сервис должен получать информацию о текущем пользователе через Bitrix24 API, проверять его отдел и возвращать результат проверки.

## Контекст
После создания конфига доступа (TASK-002-01) необходимо создать сервис, который будет использовать этот конфиг для проверки доступа пользователя. Сервис должен работать с Bitrix24 API для получения информации о пользователе и его отделе.

## Модули и компоненты
- `vue-app/src/services/access-control-service.js` — сервис проверки доступа

## Ступенчатые подзадачи
1. Создать файл `access-control-service.js` в директории `services/`
2. Импортировать конфиг доступа из `@/config/access-config.js`
3. Импортировать `Bitrix24BxApi` для работы с Bitrix24 API
4. Реализовать метод получения информации о пользователе и его отделе
5. Реализовать метод проверки доступа по ID отдела
6. Реализовать обработку ошибок (не удалось определить пользователя)
7. Добавить логирование для отладки

## Технические требования
- Использовать `Bitrix24BxApi.getCurrentUser()` для получения информации о пользователе
- Метод `user.current` возвращает объект с полем `UF_DEPARTMENT` (массив ID отделов)
- Если `UF_DEPARTMENT` пустой или отсутствует — пользователь не привязан к отделу
- Если пользователь не определён — вернуть ошибку "USER_NOT_DETERMINED"
- Если отдел не разрешён — вернуть ошибку "ACCESS_DENIED"

## API-методы Bitrix24
- `user.current` — получение информации о текущем пользователе
  - Документация: https://context7.com/bitrix24/rest/user.current
  - Возвращает объект с полем `UF_DEPARTMENT` (массив ID отделов)

## Пример кода

```javascript
/**
 * Сервис проверки доступа к приложению
 * 
 * Проверяет, имеет ли текущий пользователь доступ к приложению
 * на основе его принадлежности к разрешённым отделам
 */

import { isDepartmentAllowed } from '@/config/access-config.js';
import { Bitrix24BxApi } from './bitrix24-bx-api.js';

/**
 * Коды ошибок доступа
 */
export const AccessErrorCodes = {
  USER_NOT_DETERMINED: 'USER_NOT_DETERMINED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  API_ERROR: 'API_ERROR'
};

/**
 * Результат проверки доступа
 */
export class AccessCheckResult {
  constructor(allowed, errorCode = null, errorMessage = null, user = null) {
    this.allowed = allowed;
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    this.user = user;
  }
}

export class AccessControlService {
  /**
   * Проверка доступа текущего пользователя
   * 
   * @returns {Promise<AccessCheckResult>} Результат проверки доступа
   */
  static async checkAccess() {
    try {
      // Инициализация Bitrix24 API
      await Bitrix24BxApi.init();
      
      // Получение информации о текущем пользователе
      const user = await Bitrix24BxApi.getCurrentUser();
      
      // Проверка, что пользователь определён
      if (!user || !user.ID) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.USER_NOT_DETERMINED,
          'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      // Получение ID отделов пользователя
      const departmentIds = user.UF_DEPARTMENT || [];
      
      // Проверка, что пользователь привязан к отделу
      if (!Array.isArray(departmentIds) || departmentIds.length === 0) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён. Пользователь не привязан к отделу.'
        );
      }
      
      // Проверка доступа по ID отделов
      const hasAccess = departmentIds.some(deptId => isDepartmentAllowed(deptId));
      
      if (!hasAccess) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.ACCESS_DENIED,
          'Доступ запрещён'
        );
      }
      
      // Доступ разрешён
      return new AccessCheckResult(true, null, null, user);
      
    } catch (error) {
      console.error('AccessControlService.checkAccess error:', error);
      
      // Обработка ошибок API
      if (error.message && error.message.includes('not loaded')) {
        return new AccessCheckResult(
          false,
          AccessErrorCodes.USER_NOT_DETERMINED,
          'Не удалось определить пользователя. Обратитесь в Поддержку приложения в ИТ отдел.'
        );
      }
      
      return new AccessCheckResult(
        false,
        AccessErrorCodes.API_ERROR,
        'Ошибка при проверке доступа. Обратитесь в Поддержку приложения в ИТ отдел.'
      );
    }
  }
  
  /**
   * Получение информации о текущем пользователе
   * 
   * @returns {Promise<object|null>} Информация о пользователе или null
   */
  static async getCurrentUser() {
    try {
      await Bitrix24BxApi.init();
      return await Bitrix24BxApi.getCurrentUser();
    } catch (error) {
      console.error('AccessControlService.getCurrentUser error:', error);
      return null;
    }
  }
}
