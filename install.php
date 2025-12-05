<?php
require_once (__DIR__.'/crest.php');

$result = CRest::installApp();
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Установка Bitrix24 приложения</title>
	<script src="//api.bitrix24.com/api/v1/"></script>
	<style>
		body {
			font-family: Arial, sans-serif;
			padding: 40px;
			background: #f5f5f5;
		}
		.container {
			background: white;
			padding: 30px;
			border-radius: 4px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
			max-width: 600px;
			margin: 0 auto;
		}
		.success {
			background: #e8f5e9;
			padding: 15px;
			border-left: 4px solid #4caf50;
			margin: 20px 0;
		}
		.error {
			background: #ffebee;
			padding: 15px;
			border-left: 4px solid #f44336;
			margin: 20px 0;
		}
		.info {
			background: #e3f2fd;
			padding: 15px;
			border-left: 4px solid #2196f3;
			margin: 20px 0;
		}
		pre {
			background: #f5f5f5;
			padding: 10px;
			border-radius: 4px;
			overflow-x: auto;
			font-size: 12px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Установка Bitrix24 приложения</h1>
		
		<?php if($result['rest_only'] === false): ?>
			<?php if($result['install'] == true): ?>
				<div class="success">
					<strong>✓ Установка завершена успешно!</strong>
				</div>
				<script>
					BX24.init(function(){
						BX24.installFinish();
					});
				</script>
			<?php else: ?>
				<div class="error">
					<strong>✗ Ошибка установки</strong>
					<p>Не удалось установить приложение. Проверьте настройки.</p>
				</div>
			<?php endif; ?>
			
			<div class="info">
				<h3>Информация об установке:</h3>
				<pre><?php print_r($result); ?></pre>
			</div>
		<?php else: ?>
			<div class="info">
				<strong>REST-only режим</strong>
				<p>Это приложение работает только через REST API, без пользовательского интерфейса.</p>
				<p>Результат установки:</p>
				<pre><?php print_r($result); ?></pre>
			</div>
		<?php endif; ?>
	</div>
</body>
</html>