import { test, expect } from '@playwright/test';

test.describe('Cache Management E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cache-management');
    await page.waitForLoadState('networkidle');
  });

  test('полная цепочка создания и очистки кеша', async ({ page }) => {
    // Выбираем основной модуль
    const primaryModule = page.locator('.primary-module').first();
    await expect(primaryModule).toBeVisible();

    // Проверяем наличие кнопок действий
    const createButton = primaryModule.locator('.create-button');
    const clearButton = primaryModule.locator('.clear-button');

    await expect(createButton).toBeVisible();
    await expect(clearButton).toBeVisible();

    // Проверяем отображение метаданных для основных модулей
    const performanceSection = primaryModule.locator('.data-section.performance');
    await expect(performanceSection).toBeVisible();

    // Проверяем наличие метрик производительности
    await expect(performanceSection).toContainText('Время создания:');
    await expect(performanceSection).toContainText('Эффективность:');
    await expect(performanceSection).toContainText('Свежесть данных:');
  });

  test('визуальная иерархия модулей', async ({ page }) => {
    // Проверяем разделение на основные и второстепенные модули
    const primarySection = page.locator('.primary-modules');
    const secondarySection = page.locator('.secondary-modules');

    await expect(primarySection).toBeVisible();
    await expect(secondarySection).toBeVisible();

    // Проверяем стили основных модулей
    const primaryModules = primarySection.locator('.cache-module-card');
    await expect(primaryModules.first()).toHaveClass(/primary-module/);

    // Проверяем стили второстепенных модулей
    const secondaryModules = secondarySection.locator('.cache-module-card');
    await expect(secondaryModules.first()).toHaveClass(/secondary-module/);
  });

  test('адаптивность интерфейса', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Mobile tests only on chromium');

    // Устанавливаем мобильный viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Проверяем мобильную компоновку кнопок
    const cardActions = page.locator('.card-actions.mobile-layout');
    await expect(cardActions).toBeVisible();

    // Проверяем что кнопки занимают полную ширину на мобильных
    const buttons = cardActions.locator('.action-button');
    for (const button of await buttons.all()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThan(150); // Минимум 150px для touch
    }
  });

  test('доступность интерфейса', async ({ page }) => {
    // Проверяем tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Продолжаем навигацию
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }

    // Проверяем ARIA labels
    const buttons = page.locator('[aria-label]');
    await expect(buttons).toHaveCount(await page.locator('button').count());
  });

  test('цветовые индикаторы и статусы', async ({ page }) => {
    // Проверяем наличие статусных бейджей
    const statusBadges = page.locator('.status-badge');
    await expect(statusBadges).toHaveCount(await page.locator('.cache-module-card').count());

    // Проверяем цветовые классы для метрик
    const greenMetrics = page.locator('.metric-green');
    const yellowMetrics = page.locator('.metric-yellow');
    const redMetrics = page.locator('.metric-red');

    // Должны быть какие-то метрики с цветами
    const totalMetrics = await greenMetrics.count() + await yellowMetrics.count() + await redMetrics.count();
    expect(totalMetrics).toBeGreaterThan(0);
  });

  test('модальные окна и подтверждения', async ({ page }) => {
    // Находим кнопку очистки кеша
    const clearButton = page.locator('.clear-button').first();
    await expect(clearButton).toBeVisible();

    // Кликаем для вызова подтверждения
    await clearButton.click();

    // Проверяем появление модального окна подтверждения
    const modal = page.locator('.confirmation-modal');
    await expect(modal).toBeVisible();

    // Проверяем наличие кнопок в модальном окне
    const cancelBtn = modal.locator('.btn-cancel');
    const confirmBtn = modal.locator('.btn-confirm');

    await expect(cancelBtn).toBeVisible();
    await expect(confirmBtn).toBeVisible();

    // Отменяем действие
    await cancelBtn.click();

    // Модальное окно должно закрыться
    await expect(modal).not.toBeVisible();
  });
});