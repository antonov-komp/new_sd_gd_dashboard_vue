// vue-app/scripts/test-build-chunks.js
const fs = require('fs');
const path = require('path');
const { statSync } = require('fs');

const distPath = path.join(__dirname, '..', '..', 'dist', 'assets');

function testBuildChunks() {
  console.log('📊 Анализ chunks сборки:');

  if (!fs.existsSync(distPath)) {
    console.error('❌ Директория dist/assets не найдена. Сначала выполните npm run build');
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);

  // Проверить наличие vendor chunks (они могут иметь разные имена из-за хеширования)
  const hasVueVendor = files.some(file => {
    if (!file.endsWith('.js') || file.includes('main')) return false;
    const stats = fs.statSync(path.join(distPath, file));
    return stats.size > 200 * 1024; // > 200KB для vue-vendor
  });

  const hasChartsVendor = files.some(file => {
    if (!file.endsWith('.js') || file.includes('main')) return false;
    const stats = fs.statSync(path.join(distPath, file));
    return stats.size > 50 * 1024 && stats.size < 100 * 1024; // 50-100KB для charts
  });

  const hasBitrixCore = files.some(file => {
    if (!file.endsWith('.js') || file.includes('main')) return false;
    const stats = fs.statSync(path.join(distPath, file));
    return stats.size > 5 * 1024 && stats.size < 15 * 1024; // 5-15KB для bitrix-core
  });

  const missingChunks = [];
  if (!hasVueVendor) missingChunks.push('vue-vendor');
  if (!hasChartsVendor) missingChunks.push('charts-vendor');
  if (!hasBitrixCore) missingChunks.push('bitrix24-core');

  if (missingChunks.length > 0) {
    console.error('❌ Отсутствующие vendor chunks:', missingChunks);
    console.log('💡 Проверьте конфигурацию manualChunks в vite.config.js');
    process.exit(1);
  }

  // Проверить размеры
  const mainChunk = files.find(file => file.includes('main') && file.endsWith('.js'));
  if (mainChunk) {
    const stats = fs.statSync(path.join(distPath, mainChunk));
    const sizeKB = (stats.size / 1024).toFixed(2);

    console.log(`📦 Размер main chunk: ${sizeKB}KB`);

    if (stats.size > 250 * 1024) { // 250KB
      console.error('❌ Main chunk слишком большой!');
      process.exit(1);
    }
  }

  // Показать все JS файлы и их размеры
  console.log('\n📋 Все JS chunks:');
  const jsFiles = files.filter(file => file.endsWith('.js'));
  jsFiles.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`  - ${file}: ${sizeKB}KB`);
  });

  console.log('✅ Все проверки chunks пройдены');
}

testBuildChunks();