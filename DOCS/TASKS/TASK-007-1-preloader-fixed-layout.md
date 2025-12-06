# TASK-007-1: Фиксированный размер контейнера прелоадера

**Дата создания:** 2025-12-06 14:15 (UTC+3, Брест)  
**Дата завершения:** 2025-12-06 14:20 (UTC+3, Брест)  
**Статус:** Завершена  
**Приоритет:** Средний  
**Исполнитель:** UX/UI-дизайнер + Bitrix24 Программист (Vue.js)  
**Родительская задача:** TASK-007

---

## Описание

Улучшить UX прелоадера, сделав контейнер с фиксированным размером, чтобы подложка (фон) всегда имела единый размер независимо от объёма динамического контента.

---

## Контекст

**Текущее состояние:**
- Прелоадер (`LoadingPreloader.vue`) имеет подложку (фон), которая подстраивается под размер контента
- Контент динамический: количество деталей, длина описаний, количество элементов варьируется
- Это приводит к "прыгающему" размеру прелоадера при смене этапов загрузки

**Проблемы:**
- Подложка меняет размер при смене этапов загрузки
- Визуально нестабильно, плохой UX
- Контент может обрезаться на некоторых этапах (если контент больше) или оставлять пустое пространство (если контент меньше)

**Требуется:**
- Фиксированный размер контейнера прелоадера
- Контент не должен обрезаться
- Подложка должна иметь единый размер для всех этапов
- Плавные переходы при смене контента

---

## Модули и компоненты

### Модифицируемые компоненты:

1. **`vue-app/src/components/dashboard/LoadingPreloader.vue`**
   - Изменить структуру контейнера для фиксированного размера
   - Добавить прокрутку для контента, если он не помещается
   - Обеспечить единый размер подложки

### Стили:

1. **Стили в `LoadingPreloader.vue`**
   - Фиксированная высота контейнера
   - Фиксированная ширина контейнера (или максимальная ширина)
   - Прокрутка для контента (если нужно)
   - Плавные переходы при смене контента

---

## Зависимости

### От других задач:
- **TASK-007** — прелоадер должен быть реализован и работать

### От модулей:
- `vue-app/src/components/dashboard/LoadingPreloader.vue` — компонент прелоадера

---

## Технические требования

### Размеры контейнера:

**Вариант 1: Фиксированные размеры (рекомендуется)**
- **Ширина:** `400px` (или `max-width: 400px` для адаптивности)
- **Высота:** `300px` (или `min-height: 300px` для минимальной высоты)
- **Прокрутка:** `overflow-y: auto` для контента, если он не помещается

**Вариант 2: Адаптивные размеры**
- **Ширина:** `min-width: 300px`, `max-width: 500px`, `width: 90%` (для мобильных)
- **Высота:** `min-height: 250px`, `max-height: 400px`
- **Прокрутка:** `overflow-y: auto` для контента

### Структура контейнера:

```vue
<template>
  <div class="loading-preloader">
    <div class="preloader-backdrop">
      <!-- Фиксированный контейнер -->
      <div class="preloader-container">
        <!-- Контент с прокруткой -->
        <div class="preloader-content-scrollable">
          <!-- Анимация -->
          <div class="spinner-container">...</div>
          
          <!-- Контент -->
          <div class="preloader-content">
            <h3 class="step-title">...</h3>
            <p class="step-description">...</p>
            
            <!-- Прогресс-бар -->
            <div class="progress-container">...</div>
            
            <!-- Детали этапа -->
            <div class="step-details">...</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Ошибка (отдельно, не влияет на размер контейнера) -->
    <div class="error-container" v-if="error">...</div>
  </div>
</template>
```

### Стили:

```css
.preloader-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.preloader-container {
  width: 400px;
  min-height: 300px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Скрываем переполнение контейнера */
}

.preloader-content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0; /* Важно для правильной работы flex с overflow */
}

.preloader-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* Плавные переходы при смене контента */
.step-title,
.step-description,
.step-details {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

/* Скрытие скроллбара на мобильных (опционально) */
.preloader-content-scrollable::-webkit-scrollbar {
  width: 6px;
}

.preloader-content-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* Адаптивность */
@media (max-width: 768px) {
  .preloader-container {
    width: 90%;
    max-width: 400px;
    min-height: 250px;
    max-height: 350px;
  }
  
  .preloader-content-scrollable {
    padding: 20px;
  }
}
```

---

## Ступенчатые подзадачи

### 1. Изменение структуры контейнера

**Файл:** `vue-app/src/components/dashboard/LoadingPreloader.vue`

**Изменения:**
- Обернуть контент в `.preloader-content-scrollable`
- Установить фиксированные размеры для `.preloader-container`
- Добавить прокрутку для контента

### 2. Обновление стилей

**Файл:** `vue-app/src/components/dashboard/LoadingPreloader.vue` (секция `<style>`)

**Изменения:**
- Добавить стили для `.preloader-backdrop`
- Добавить стили для `.preloader-container` с фиксированными размерами
- Добавить стили для `.preloader-content-scrollable` с прокруткой
- Добавить плавные переходы для контента
- Добавить адаптивность для мобильных устройств

### 3. Тестирование

**Проверки:**
- Прелоадер имеет единый размер на всех этапах загрузки
- Контент не обрезается (если не помещается, появляется прокрутка)
- Подложка не меняет размер при смене этапов
- Плавные переходы при смене контента
- Адаптивность на мобильных устройствах

---

## Критерии приёмки

- [x] Контейнер прелоадера имеет фиксированный размер (550px × 400-500px)
- [x] Подложка не меняет размер при смене этапов загрузки
- [x] Контент не обрезается (если не помещается, появляется прокрутка)
- [x] Плавные переходы при смене контента (fade-in/fade-out)
- [x] Прелоадер адаптивен для мобильных устройств
- [x] Скроллбар стилизован (если используется)
- [x] Визуально стабильный прелоадер на всех этапах загрузки
- [x] Код соответствует стандартам Vue.js и CSS
- [x] Увеличенные размеры контейнера для лучшего отображения контента

---

## Тестирование

### Функциональное тестирование:

1. **Проверка фиксированного размера:**
   - Открыть дашборд и наблюдать за прелоадером на всех этапах
   - Проверить, что размер контейнера не меняется
   - Проверить, что подложка имеет единый размер

2. **Проверка прокрутки:**
   - Симулировать этап с большим количеством деталей
   - Проверить, что контент не обрезается
   - Проверить, что появляется прокрутка, если контент не помещается

3. **Проверка переходов:**
   - Наблюдать за сменой этапов загрузки
   - Проверить плавность переходов контента

### Адаптивное тестирование:

1. Проверить на десктопе (> 1024px)
2. Проверить на планшете (768px - 1024px)
3. Проверить на мобильном (< 768px)

---

## Примеры реализации

### Пример 1: Базовая структура с фиксированным размером

```vue
<template>
  <div class="loading-preloader">
    <!-- Подложка (фон) -->
    <div class="preloader-backdrop">
      <!-- Фиксированный контейнер -->
      <div class="preloader-container">
        <!-- Контент с прокруткой -->
        <div class="preloader-content-scrollable">
          <!-- Спиннер -->
          <div class="spinner-container" v-if="!error">
            <div class="spinner"></div>
          </div>

          <!-- Контент -->
          <div class="preloader-content">
            <h3 class="step-title">{{ stepTitle }}</h3>
            <p class="step-description" v-if="stepDescription">
              {{ stepDescription }}
            </p>

            <!-- Прогресс-бар -->
            <div class="progress-container" v-if="!error">
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :style="{ width: progress + '%' }"
                ></div>
              </div>
              <span class="progress-text">{{ Math.round(progress) }}%</span>
            </div>

            <!-- Детали этапа -->
            <div class="step-details" v-if="!error">
              <!-- Детали загрузки тикетов -->
              <div v-if="details.count !== undefined" class="detail-item">
                <span class="detail-label">Загружено тикетов:</span>
                <span class="detail-value">{{ details.count }}</span>
                <span v-if="details.total !== undefined" class="detail-total">
                  из {{ details.total }}
                </span>
              </div>

              <!-- Информация о стадии -->
              <div v-if="details.stage" class="detail-item">
                <span class="detail-label">Стадия:</span>
                <span class="detail-value">{{ getStageDisplayName(details.stage) }}</span>
                <span v-if="details.stageIndex && details.totalStages" class="detail-total">
                  ({{ details.stageIndex }}/{{ details.totalStages }})
                </span>
              </div>

              <!-- Информация о сотрудниках -->
              <div v-if="details.employeeCount !== undefined" class="detail-item">
                <span class="detail-label">Сотрудников:</span>
                <span class="detail-value">{{ details.employeeCount }}</span>
              </div>

              <!-- Предупреждение (если есть) -->
              <div v-if="details.warning" class="detail-warning">
                <span>⚠️ {{ details.warning }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Ошибка (отдельно, не влияет на размер контейнера) -->
    <div class="error-container" v-if="error">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <p class="error-message">{{ error }}</p>
        <button @click="handleRetry" class="retry-button">
          Повторить попытку
        </button>
      </div>
    </div>
  </div>
</template>
```

### Пример 2: Стили с фиксированным размером

```css
<style scoped>
.loading-preloader {
  position: relative;
}

.preloader-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.preloader-container {
  width: 400px;
  min-height: 300px;
  max-height: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preloader-content-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 0;
}

.preloader-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.spinner-container {
  margin-bottom: 20px;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.step-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
  transition: opacity 0.3s ease;
}

.step-description {
  font-size: 14px;
  color: #666;
  margin: 0;
  text-align: center;
  transition: opacity 0.3s ease;
}

.progress-container {
  margin: 20px 0;
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #007bff, #0056b3);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

.step-details {
  font-size: 12px;
  color: #999;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;
}

.detail-label {
  font-weight: 500;
  color: #555;
}

.detail-value {
  color: #333;
}

.detail-total {
  color: #777;
  margin-left: 5px;
}

.detail-warning {
  color: #ffc107;
  font-weight: 500;
}

/* Стилизация скроллбара */
.preloader-content-scrollable::-webkit-scrollbar {
  width: 6px;
}

.preloader-content-scrollable::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.preloader-content-scrollable::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.error-container {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 400px;
  text-align: center;
  z-index: 10000;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.error-message {
  color: #dc3545;
  font-size: 14px;
  margin: 0 0 15px 0;
}

.retry-button {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.retry-button:hover {
  background: #0056b3;
}

/* Адаптивность */
@media (max-width: 768px) {
  .preloader-container {
    width: 90%;
    max-width: 400px;
    min-height: 250px;
    max-height: 350px;
  }
  
  .preloader-content-scrollable {
    padding: 20px;
  }
}
</style>
```

---

## Реализованные изменения

**Дата завершения:** 2025-12-06 14:20 (UTC+3, Брест)

### Изменения в структуре:

1. **Добавлена подложка (`.preloader-backdrop`):**
   - Отдельный элемент для фона прелоадера
   - Фиксированная позиция на весь экран
   - Backdrop-filter для эффекта размытия

2. **Изменён контейнер (`.preloader-container`):**
   - Фиксированная ширина: `400px`
   - Фиксированная высота: `min-height: 300px`, `max-height: 400px`
   - Flexbox для правильного размещения контента
   - `overflow: hidden` для скрытия переполнения

3. **Добавлен прокручиваемый контент (`.preloader-content-scrollable`):**
   - Прокрутка для контента, если он не помещается
   - Flexbox для центрирования контента
   - `min-height: 0` для правильной работы flex с overflow

4. **Обновлены стили:**
   - Плавные переходы для контента (`transition: opacity 0.3s ease, transform 0.3s ease`)
   - Стилизация скроллбара (тонкий, стильный)
   - Адаптивность для мобильных устройств

### Дополнительные улучшения:

5. **Увеличение размеров контейнера:**
   - Ширина увеличена с `400px` до `550px` (+150px)
   - Высота увеличена с `300-400px` до `400-500px` (+100px)
   - Для мобильных: ширина `max-width: 500px`, высота `350-450px`
   - Больше места для контента, прокрутка используется реже

### Результат:

- ✅ Контейнер имеет фиксированный размер на всех этапах загрузки
- ✅ Подложка не меняет размер при смене этапов
- ✅ Контент не обрезается (если не помещается, появляется прокрутка)
- ✅ Плавные переходы при смене контента
- ✅ Адаптивность для мобильных устройств
- ✅ Визуально стабильный прелоадер
- ✅ Увеличенный размер контейнера для лучшего отображения контента

---

## История правок

- **2025-12-06 14:15 (UTC+3, Брест):** Создана подзадача TASK-007-1 для фиксированного размера контейнера прелоадера
- **2025-12-06 14:20 (UTC+3, Брест):** Задача завершена, фиксированный размер контейнера реализован
- **2025-12-06 14:25 (UTC+3, Брест):** Увеличены размеры контейнера (ширина 550px, высота 400-500px) для лучшего отображения контента

---

**Автор:** UX/UI-дизайнер + Технический писатель  
**Статус:** Завершена

