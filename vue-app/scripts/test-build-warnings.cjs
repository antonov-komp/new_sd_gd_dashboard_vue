// vue-app/scripts/test-build-warnings.js
const { execSync } = require('child_process');

function testBuildWarnings() {
  console.log('🔍 Проверка предупреждений сборки...');

  try {
    const output = execSync('npm run build', {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    // Проверить отсутствие предупреждений о dynamic imports
    const dynamicImportWarnings = output.match(/dynamically imported by.*but also statically imported/g);

    if (dynamicImportWarnings) {
      console.error('❌ Найдены предупреждения о конфликтах импортов:');
      dynamicImportWarnings.forEach(warning => console.error('  -', warning));
      process.exit(1);
    }

    console.log('✅ Предупреждений о конфликтах импортов не найдено');
  } catch (error) {
    console.error('❌ Ошибка при сборке:', error.message);
    process.exit(1);
  }
}

testBuildWarnings();