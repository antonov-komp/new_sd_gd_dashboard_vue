// Простая проверка синтаксиса Vue template
const fs = require('fs');

try {
  const content = fs.readFileSync('./vue-app/src/components/SectorDashboard.vue', 'utf8');

  // Извлекаем template часть
  const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) {
    console.error('❌ Template не найден');
    process.exit(1);
  }

  const template = templateMatch[1];
  console.log('✅ Template извлечен, длина:', template.length);

  // Проверяем базовую структуру
  const openCount = (template.match(/<[^/]/g) || []).length;
  const closeCount = (template.match(/<\/[^>]+>/g) || []).length;

  console.log(`Открытых тегов: ${openCount}`);
  console.log(`Закрытых тегов: ${closeCount}`);

  if (openCount === closeCount) {
    console.log('✅ Количество тегов совпадает');
  } else {
    console.log('❌ Несоответствие тегов!');

    // Показываем несоответствующие теги
    const openTags = template.match(/<[^/][^>]*>/g) || [];
    const closeTags = template.match(/<\/[^>]+>/g) || [];

    console.log('Первые 5 открытых:', openTags.slice(0, 5));
    console.log('Первые 5 закрытых:', closeTags.slice(0, 5));
  }

} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}