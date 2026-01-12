// vue-app/scripts/analyze-bundle.js
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '..', '..', 'dist', 'assets');

function analyzeBundle() {
  console.log('📊 Детальный анализ бандла:\n');

  if (!fs.existsSync(distPath)) {
    console.error('❌ Директория dist/assets не найдена. Сначала выполните npm run build');
    process.exit(1);
  }

  const files = fs.readdirSync(distPath);
  const jsFiles = files.filter(file => file.endsWith('.js'));
  const cssFiles = files.filter(file => file.endsWith('.css'));

  console.log('📦 JavaScript файлы:');
  let totalJSSize = 0;
  jsFiles.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalJSSize += stats.size;
    console.log(`  - ${file}: ${sizeKB}KB`);
  });

  console.log(`\n💾 Общий размер JS: ${(totalJSSize / 1024).toFixed(2)}KB`);
  console.log(`💾 Общий размер JS (gzip): ~${(totalJSSize * 0.35 / 1024).toFixed(2)}KB (примерная оценка)`);

  console.log('\n🎨 CSS файлы:');
  let totalCSSSize = 0;
  cssFiles.forEach(file => {
    const stats = fs.statSync(path.join(distPath, file));
    const sizeKB = (stats.size / 1024).toFixed(2);
    totalCSSSize += stats.size;
    console.log(`  - ${file}: ${sizeKB}KB`);
  });

  console.log(`\n💅 Общий размер CSS: ${(totalCSSSize / 1024).toFixed(2)}KB`);

  // Анализ chunks по категориям
  console.log('\n🏷️  Анализ chunks по категориям:');

  const categories = {
    'main': jsFiles.filter(f => f.includes('main')),
    'vendor': jsFiles.filter(f => f.includes('vendor') || f.includes('vue') || f.includes('chart')),
    'pages': jsFiles.filter(f => f.includes('Dashboard') || f.includes('Page')),
    'components': jsFiles.filter(f => f.includes('component') || f.includes('modal')),
    'config': jsFiles.filter(f => f.includes('config') || f.includes('utils')),
    'other': []
  };

  Object.keys(categories).forEach(category => {
    if (categories[category].length > 0) {
      console.log(`  ${category.toUpperCase()}: ${categories[category].length} chunks`);
      categories[category].forEach(file => {
        const stats = fs.statSync(path.join(distPath, file));
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`    - ${file}: ${sizeKB}KB`);
      });
    }
  });

  // Рекомендации
  console.log('\n💡 Рекомендации по оптимизации:');
  if (totalJSSize > 250 * 1024) {
    console.log('  - Основной бандл слишком большой. Рассмотрите code splitting');
  }
  if (jsFiles.length < 5) {
    console.log('  - Мало chunks. Настройте manual chunks для vendor библиотек');
  }
  if (totalCSSSize > 50 * 1024) {
    console.log('  - CSS файлы велики. Рассмотрите разделение CSS');
  }
}

analyzeBundle();