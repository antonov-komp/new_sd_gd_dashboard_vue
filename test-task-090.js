/**
 * Тестовый файл для проверки улучшений TASK-090
 */

// Имитация объекта window для тестирования
global.window = {
  BX: null,
  Notification: null
};

// Имитация document для тестирования
global.document = {
  createElement: () => ({}),
  body: { appendChild: () => {} },
  head: { appendChild: () => {} },
  getElementById: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null
};

// Тест для NotificationSystem
console.log('=== Testing NotificationSystem ===');

try {
  const { NotificationSystem } = require('./vue-app/src/utils/notifications.js');

  // Тест создания экземпляра
  console.log('✓ NotificationSystem imported successfully');

  // Тест метода success
  NotificationSystem.success('Тест', 'Тестовое уведомление');
  console.log('✓ NotificationSystem.success() called without errors');

  // Тест метода error
  NotificationSystem.error('Ошибка', 'Тестовая ошибка');
  console.log('✓ NotificationSystem.error() called without errors');

} catch (error) {
  console.error('✗ NotificationSystem test failed:', error.message);
}

// Тест для ConfirmationSystem
console.log('\n=== Testing ConfirmationSystem ===');

try {
  const { ConfirmationSystem } = require('./vue-app/src/utils/confirmations.js');

  // Тест создания экземпляра
  console.log('✓ ConfirmationSystem imported successfully');

  // Тест метода show (асинхронный)
  const testShow = async () => {
    try {
      // Имитируем отмену для теста
      setTimeout(() => {
        if (ConfirmationSystem.hide) {
          ConfirmationSystem.hide();
        }
      }, 100);

      const result = await ConfirmationSystem.show({
        title: 'Тест',
        message: 'Тестовое сообщение',
        type: 'info'
      });

      console.log('✓ ConfirmationSystem.show() resolved with:', result);
    } catch (error) {
      console.error('✗ ConfirmationSystem.show() failed:', error.message);
    }
  };

  testShow();

} catch (error) {
  console.error('✗ ConfirmationSystem test failed:', error.message);
}

console.log('\n=== All tests completed ===');