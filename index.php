<?php
require_once(__DIR__ . '/crest.php');
?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bitrix24 REST Application</title>
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
        
        // Базовый путь для ресурсов (относительно корня сайта)
        $basePath = '/rest_api_aps/sd_it_gen_plan';
        
        if (!empty($scriptMatch[1])) {
            // Исправляем путь: если начинается с /dist, заменяем на правильный путь
            $scriptPath = $scriptMatch[1];
            if (strpos($scriptPath, '/dist/') === 0) {
                $scriptPath = $basePath . $scriptPath;
            }
            echo '<script type="module" crossorigin src="' . htmlspecialchars($scriptPath) . '"></script>' . "\n";
        }
        
        if (!empty($styleMatch[1])) {
            // Исправляем путь: если начинается с /dist, заменяем на правильный путь
            $stylePath = $styleMatch[1];
            if (strpos($stylePath, '/dist/') === 0) {
                $stylePath = $basePath . $stylePath;
            }
            echo '<link rel="stylesheet" crossorigin href="' . htmlspecialchars($stylePath) . '">' . "\n";
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
