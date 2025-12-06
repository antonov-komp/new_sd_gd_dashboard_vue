# Тесты для дашборда сектора 1С

**Дата создания:** 2025-12-06 18:00 (UTC+3, Брест)  
**Версия:** 1.0

---

## 📁 Структура тестов

```
tests/
├── unit/
│   ├── services/
│   │   └── dashboard-sector-1c/
│   │       ├── data/
│   │       │   ├── ticket-repository.test.js
│   │       │   └── employee-repository.test.js
│   │       ├── mappers/
│   │       │   ├── ticket-mapper.test.js
│   │       │   ├── stage-mapper.test.js
│   │       │   └── employee-mapper.test.js
│   │       ├── filters/
│   │       │   └── sector-filter.test.js
│   │       ├── groupers/
│   │       │   └── ticket-grouper.test.js
│   │       ├── cache/
│   │       │   └── cache-manager.test.js
│   │       └── utils/
│   │           ├── validation.test.js
│   │           └── error-handler.test.js
│   └── composables/
│       ├── useDashboardState.test.js
│       ├── useDashboardActions.test.js
│       ├── useDragAndDrop.test.js
│       └── useNotifications.test.js
└── integration/
    └── components/
        └── dashboard/
            ├── DashboardSector1C.test.js
            ├── EmployeeColumn.test.js
            └── TicketCard.test.js
```

---

## 🧪 Примеры тестов

### Тест репозитория тикетов

```javascript
// tests/unit/services/dashboard-sector-1c/data/ticket-repository.test.js

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TicketRepository } from '@/services/dashboard-sector-1c/data/ticket-repository.js';
import { ApiClient } from '@/services/dashboard-sector-1c/data/api-client.js';

// Моки
vi.mock('@/services/dashboard-sector-1c/data/api-client.js');

describe('TicketRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTicketsByStage', () => {
    it('должен загружать тикеты по стадии', async () => {
      const mockTickets = [
        { id: 1, title: 'Тикет 1', stageId: 'DT140_12:UC_0VHWE2' },
        { id: 2, title: 'Тикет 2', stageId: 'DT140_12:UC_0VHWE2' }
      ];

      ApiClient.call = vi.fn().mockResolvedValue({
        result: mockTickets
      });

      const tickets = await TicketRepository.getTicketsByStage('DT140_12:UC_0VHWE2');

      expect(tickets).toEqual(mockTickets);
      expect(ApiClient.call).toHaveBeenCalledWith('crm.item.list', expect.any(Object));
    });

    it('должен использовать кеш при повторном запросе', async () => {
      const mockTickets = [{ id: 1, title: 'Тикет 1' }];

      ApiClient.call = vi.fn().mockResolvedValue({
        result: mockTickets
      });

      // Первый запрос
      await TicketRepository.getTicketsByStage('DT140_12:UC_0VHWE2', true);
      
      // Второй запрос (должен использовать кеш)
      const tickets = await TicketRepository.getTicketsByStage('DT140_12:UC_0VHWE2', true);

      expect(ApiClient.call).toHaveBeenCalledTimes(1);
      expect(tickets).toEqual(mockTickets);
    });
  });

  describe('assignTicket', () => {
    it('должен назначать тикет сотруднику', async () => {
      ApiClient.call = vi.fn().mockResolvedValue({
        result: true
      });

      const success = await TicketRepository.assignTicket(123, 456, 'DT140_12:UC_0VHWE2');

      expect(success).toBe(true);
      expect(ApiClient.call).toHaveBeenCalledWith('crm.item.update', expect.objectContaining({
        id: 123,
        fields: expect.objectContaining({
          assignedById: 456
        })
      }));
    });
  });
});
```

### Тест маппера

```javascript
// tests/unit/services/dashboard-sector-1c/mappers/ticket-mapper.test.js

import { describe, it, expect } from 'vitest';
import { mapTicket, mapPriority, mapPriorityToBitrix } from '@/services/dashboard-sector-1c/mappers/ticket-mapper.js';

describe('TicketMapper', () => {
  describe('mapTicket', () => {
    it('должен преобразовывать тикет из Bitrix24 в внутренний формат', () => {
      const bitrixTicket = {
        id: 12345,
        title: 'Тестовый тикет',
        stageId: 'DT140_12:UC_0VHWE2',
        assignedById: 678,
        priority: '3',
        createdTime: '2025-12-06T10:00:00'
      };

      const mapped = mapTicket(bitrixTicket);

      expect(mapped).toEqual({
        id: 12345,
        title: 'Тестовый тикет',
        stageId: 'formed',
        assigneeId: 678,
        priority: 'high',
        status: 'in_progress',
        createdAt: '2025-12-06T10:00:00',
        modifiedAt: '',
        amount: 0,
        currency: 'RUB',
        description: ''
      });
    });
  });

  describe('mapPriority', () => {
    it('должен преобразовывать приоритет из Bitrix24', () => {
      expect(mapPriority('3')).toBe('high');
      expect(mapPriority('2')).toBe('medium');
      expect(mapPriority('1')).toBe('low');
      expect(mapPriority('unknown')).toBe('medium');
    });
  });

  describe('mapPriorityToBitrix', () => {
    it('должен преобразовывать приоритет в формат Bitrix24', () => {
      expect(mapPriorityToBitrix('high')).toBe('3');
      expect(mapPriorityToBitrix('medium')).toBe('2');
      expect(mapPriorityToBitrix('low')).toBe('1');
    });
  });
});
```

### Тест композабла

```javascript
// tests/unit/composables/useDashboardState.test.js

import { describe, it, expect, beforeEach } from 'vitest';
import { useDashboardState } from '@/composables/useDashboardState.js';

describe('useDashboardState', () => {
  let state;

  beforeEach(() => {
    state = useDashboardState();
  });

  it('должен инициализировать состояние по умолчанию', () => {
    expect(state.isLoading.value).toBe(true);
    expect(state.error.value).toBe(null);
    expect(state.stages.value).toHaveLength(3);
    expect(state.zeroPointTickets.value).toEqual({
      formed: [],
      review: [],
      execution: []
    });
  });

  it('должен обновлять состояние данными', () => {
    const data = {
      stages: [{ id: 'formed', name: 'Test', employees: [] }],
      employees: [{ id: 1, name: 'Test' }],
      zeroPointTickets: { formed: [{ id: 1 }] }
    };

    state.updateState(data);

    expect(state.stages.value).toEqual(data.stages);
    expect(state.employees.value).toEqual(data.employees);
    expect(state.zeroPointTickets.value).toEqual(data.zeroPointTickets);
  });

  it('должен обновлять локальное состояние после перемещения тикета', () => {
    // Настройка начального состояния
    state.stages.value = [{
      id: 'formed',
      employees: [{
        id: 1,
        tickets: [{ id: 123, assigneeId: 1, stageId: 'formed' }]
      }]
    }];

    const ticket = { id: 123, assigneeId: 1, stageId: 'formed' };
    state.updateLocalStateAfterMove(ticket, 2, 'review');

    // Тикет должен быть перемещён
    expect(state.stages.value[0].employees[0].tickets).toHaveLength(0);
    // И добавлен в новую позицию (если этап существует)
  });
});
```

### Тест фильтра

```javascript
// tests/unit/services/dashboard-sector-1c/filters/sector-filter.test.js

import { describe, it, expect } from 'vitest';
import { filterBySector } from '@/services/dashboard-sector-1c/filters/sector-filter.js';

describe('SectorFilter', () => {
  it('должен фильтровать тикеты по сектору 1С', () => {
    const tickets = [
      { id: 1, UF_CRM_7_TYPE_PRODUCT: '1C' },
      { id: 2, UF_CRM_7_TYPE_PRODUCT: '2C' },
      { id: 3, UF_CRM_7_TYPE_PRODUCT: '1C' },
      { id: 4, uf_crm_7_type_product: '1C' } // нижний регистр
    ];

    const filtered = filterBySector(tickets);

    expect(filtered).toHaveLength(3);
    expect(filtered.map(t => t.id)).toEqual([1, 3, 4]);
  });

  it('должен использовать мемоизацию для повторных фильтраций', () => {
    const tickets = [{ id: 1, UF_CRM_7_TYPE_PRODUCT: '1C' }];

    const first = filterBySector(tickets);
    const second = filterBySector(tickets);

    expect(first).toBe(second); // Должен вернуть тот же массив из кеша
  });
});
```

---

## 🛠️ Настройка тестов

### Установка зависимостей

```bash
npm install -D vitest @vue/test-utils
```

### Конфигурация Vitest

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './vue-app/src')
    }
  }
});
```

### Запуск тестов

```bash
# Все тесты
npm run test

# Только unit-тесты
npm run test:unit

# С покрытием
npm run test:coverage

# В watch режиме
npm run test:watch
```

---

## 📊 Целевое покрытие тестами

- **Репозитории:** > 80%
- **Мапперы:** > 90%
- **Фильтры и групперы:** > 80%
- **Композаблы:** > 70%
- **Компоненты:** > 60%

**Общее покрытие:** > 70%

---

**Дата создания:** 2025-12-06 18:00 (UTC+3, Брест)  
**Автор:** Рефактор-менеджер


