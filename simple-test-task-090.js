/**
 * Простой тест для проверки импортов TASK-090
 */

console.log('=== Testing TASK-090 imports ===');

try {
  // Тест NotificationSystem
  const { NotificationSystem } = require('./vue-app/src/utils/notifications.js');
  console.log('✓ NotificationSystem imported successfully');

  // Проверка статических методов
  if (typeof NotificationSystem.success === 'function') {
    console.log('✓ NotificationSystem.success is a function');
  }

  if (typeof NotificationSystem.error === 'function') {
    console.log('✓ NotificationSystem.error is a function');
  }

  // Тест ConfirmationSystem
  const { ConfirmationSystem } = require('./vue-app/src/utils/confirmations.js');
  console.log('✓ ConfirmationSystem imported successfully');

  // Проверка статических методов
  if (typeof ConfirmationSystem.show === 'function') {
    console.log('✓ ConfirmationSystem.show is a function');
  }

  if (typeof ConfirmationSystem.hide === 'function') {
    console.log('✓ ConfirmationSystem.hide is a function');
  }

  console.log('\n=== All imports successful! ===');

} catch (error) {
  console.error('✗ Import test failed:', error.message);
  console.error('Stack:', error.stack);
}