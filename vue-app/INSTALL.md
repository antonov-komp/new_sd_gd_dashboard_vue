# Инструкция по установке и настройке Vue.js приложения

## Требования

- Node.js 18.x или выше
- npm или yarn
- PHP 8.3+ (уже установлен на сервере)

## Установка

1. **Установите зависимости:**

```bash
cd /var/www/back/vue-app
npm install
```

2. **Режим разработки:**

```bash
npm run dev
```

Vite dev server запустится на `http://localhost:3000`

3. **Сборка для production:**

```bash
npm run build
```

Собранные файлы будут в папке `/var/www/back/dist/`

## Настройка веб-сервера

Убедитесь, что веб-сервер настроен для обслуживания статических файлов из папки `dist/`.

### Для Apache (.htaccess)

Создайте файл `/var/www/back/.htaccess`:

```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /
    
    # Разрешаем доступ к статическим файлам
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    
    # Перенаправляем на index.php для Vue Router
    RewriteRule ^(.*)$ index.php [L,QSA]
</IfModule>
```

### Для Nginx

Добавьте в конфигурацию:

```nginx
location /dist/ {
    alias /var/www/back/dist/;
    try_files $uri $uri/ =404;
}
```

## Проверка работы

1. **Установка приложения:**
   - Откройте `https://ваш-домен.com/back/install.php`
   - Должна отобразиться страница установки на Vue.js

2. **Главная страница:**
   - Откройте `https://ваш-домен.com/back/index.php`
   - Должна отобразиться главная страница с профилем приложения

## Устранение проблем

### Ошибка: "Cannot find module"

Убедитесь, что зависимости установлены:
```bash
npm install
```

### Ошибка: "Failed to load resource"

Проверьте, что файлы из `dist/` доступны по пути `/dist/` на сервере.

### Ошибка: "Bitrix24 API not loaded"

Убедитесь, что скрипт Bitrix24 API подключен в HTML:
```html
<script src="//api.bitrix24.com/api/v1/"></script>
```

## Разработка

В режиме разработки используйте Vite dev server. PHP файлы автоматически определят режим и подключат нужные скрипты.

Для production обязательно выполните сборку:
```bash
npm run build
```




