<?php
require_once (__DIR__.'/crest.php');
?>
<!DOCTYPE html>
<html>
<head>
	<meta charset="UTF-8">
	<title>Bitrix24 REST Application</title>
	<script src="//api.bitrix24.com/api/v1/"></script>
	<style>
		body {
			font-family: Arial, sans-serif;
			padding: 20px;
			background: #f5f5f5;
		}
		.container {
			background: white;
			padding: 20px;
			border-radius: 4px;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}
		h1 {
			color: #333;
		}
		.info {
			background: #e7f3ff;
			padding: 15px;
			border-left: 4px solid #2196F3;
			margin: 20px 0;
		}
		.error {
			background: #ffebee;
			padding: 15px;
			border-left: 4px solid #f44336;
			margin: 20px 0;
		}
		pre {
			background: #f5f5f5;
			padding: 10px;
			border-radius: 4px;
			overflow-x: auto;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Bitrix24 REST Application</h1>
		
		<?php
		// Получаем профиль приложения (админа) для проверки подключения
		$profileResult = CRest::call('profile', []);
		
		if (isset($profileResult['error'])) {
			echo '<div class="error">';
			echo '<strong>Ошибка API:</strong> ' . htmlspecialchars($profileResult['error']);
			if (isset($profileResult['error_information'])) {
				echo '<br><strong>Детали:</strong> ' . htmlspecialchars($profileResult['error_information']);
			}
			
			// Если ошибка "no_install_app" - приложение не установлено
			if ($profileResult['error'] === 'no_install_app') {
				echo '<br><br><strong>Решение:</strong> Установите приложение через <a href="install.php">install.php</a>';
			}
			echo '</div>';
			
			echo '<h2>Детали ошибки:</h2>';
			echo '<pre>';
			print_r($profileResult);
			echo '</pre>';
		} else {
			echo '<div class="info">';
			echo '<strong>Приложение успешно подключено!</strong>';
			echo '</div>';
			
			// Информация о профиле приложения (админе)
			echo '<h2>Профиль приложения (админ):</h2>';
			echo '<pre>';
			print_r($profileResult);
			echo '</pre>';
			
			// Информация о текущем пользователе (кто открыл приложение)
			// Получается через BX24 API на клиенте, так как REST API возвращает админа
			echo '<h2>Текущий пользователь (кто открыл приложение):</h2>';
			echo '<div id="current-user-info" style="padding: 10px; background: #f9f9f9; border-radius: 4px; margin: 10px 0;">';
			echo '<p>Загрузка информации о пользователе...</p>';
			echo '</div>';
		}
		?>
	</div>
	
	<script>
		BX24.init(function() {
			console.log('Bitrix24 API initialized');
			
			var userInfoDiv = document.getElementById('current-user-info');
			
			// Получаем информацию о текущем пользователе через BX24.callMethod
			// Это правильный способ для локальных приложений
			BX24.callMethod('user.current', {}, function(result) {
				if (result.error()) {
					var error = result.error();
					console.error('Error getting user:', error);
					if (userInfoDiv) {
						userInfoDiv.innerHTML = '<div class="error">Ошибка получения информации о пользователе: ' + 
							(error.error_description || error.error || 'Неизвестная ошибка') + '</div>';
					}
				} else {
					var user = result.data();
					console.log('Current user:', user);
					if (userInfoDiv) {
						userInfoDiv.innerHTML = '<pre>' + JSON.stringify(user, null, 2) + '</pre>';
					}
				}
			});
			
			// Дополнительно: получаем информацию через getUser (если доступно)
			if (typeof BX24.getUser === 'function') {
				BX24.getUser(function(user) {
					console.log('User from getUser:', user);
				});
			}
			
			// Дополнительно: получаем информацию через getAuth
			BX24.getAuth(function(auth) {
				console.log('Auth info:', auth);
			});
		});
	</script>
</body>
</html>