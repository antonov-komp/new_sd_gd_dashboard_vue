<?php
require_once(__DIR__ . '/crest.php');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitrix24 REST Application</title>
    <?php
    // Определяем базовый путь для тега <base>
    $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
    $basePath = dirname($scriptName);
    if ($basePath === '.') {
        $basePath = '';
    }
    if ($basePath && $basePath[0] !== '/') {
        $basePath = '/' . $basePath;
    }
    // Добавляем /dist/ к базовому пути для правильного разрешения путей к ресурсам
    $baseHref = $basePath . '/dist/';
    ?>
    <base href="<?= htmlspecialchars($baseHref) ?>">
    <script src="//api.bitrix24.com/api/v1/"></script>
    <!-- В production используйте собранные файлы из /dist -->
    <!-- Для разработки используйте Vite dev server -->
    <?php 
    $distIndexPath = __DIR__ . '/dist/index.html';
    if (file_exists($distIndexPath)) { 
        // Читаем dist/index.html и извлекаем пути к скриптам и стилям
        $distHtml = file_get_contents($distIndexPath);
        // Ищем скрипт с type="module" (Vue.js), а не Bitrix24 API скрипт
        preg_match('/<script[^>]+type=["\']module["\'][^>]+src="([^"]+)"[^>]*>/i', $distHtml, $scriptMatch);
        // Если не нашли, ищем любой скрипт с crossorigin (Vite сборка)
        if (empty($scriptMatch[1])) {
            preg_match('/<script[^>]+crossorigin[^>]+src="([^"]+)"[^>]*>/i', $distHtml, $scriptMatch);
        }
        preg_match('/<link[^>]+href="([^"]+)"[^>]*>/i', $distHtml, $styleMatch);
        
        // Базовый путь для ресурсов (определяется автоматически на основе текущего пути)
        $scriptName = $_SERVER['SCRIPT_NAME'] ?? '';
        $basePath = dirname($scriptName);
        // Убираем точку, если путь корневой
        if ($basePath === '.') {
            $basePath = '';
        }
        // Убеждаемся, что путь начинается с /
        if ($basePath && $basePath[0] !== '/') {
            $basePath = '/' . $basePath;
        }
        
        if (!empty($scriptMatch[1])) {
            // Пути теперь относительные (./assets/...), тег <base> обработает их правильно
            // Просто выводим путь как есть
            echo '<script type="module" crossorigin src="' . htmlspecialchars($scriptMatch[1]) . '"></script>' . "\n";
        }
        
        if (!empty($styleMatch[1])) {
            // Пути теперь относительные (./assets/...), тег <base> обработает их правильно
            // Просто выводим путь как есть
            echo '<link rel="stylesheet" crossorigin href="' . htmlspecialchars($styleMatch[1]) . '">' . "\n";
        }
    } else { ?>
        <!-- В режиме разработки используйте Vite dev server -->
        <script type="module" src="http://localhost:3000/src/main.js"></script>
    <?php } ?>
</head>
<body>
    <div id="app"></div>
</body>
</html>
