# Bitrix24 Vue.js Application

Vue.js приложение для Bitrix24 REST Application.

## Структура проекта

```
vue-app/
├── src/
│   ├── main.js                    # Точка входа Vue.js
│   ├── App.vue                     # Корневой компонент
│   ├── components/
│   │   ├── InstallPage.vue        # Компонент страницы установки
│   │   ├── IndexPage.vue          # Компонент главной страницы
│   │   └── common/
│   │       ├── StatusMessage.vue  # Компонент для сообщений
│   │       └── LoadingSpinner.vue  # Компонент загрузки
│   ├── services/
│   │   ├── bitrix24-api.js        # Сервис для Bitrix24 REST API
│   │   └── bitrix24-bx-api.js     # Сервис для BX24.* API
│   ├── router/
│   │   └── index.js               # Маршрутизация
│   └── styles/
│       └── main.css               # Глобальные стили
├── public/
│   └── index.html                 # HTML шаблон
├── package.json                    # Зависимости
└── vite.config.js                 # Конфигурация Vite
```

## Установка зависимостей

```bash
cd vue-app
npm install
```

## Разработка

```bash
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`

## Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`

## Использование

После сборки файлы из `dist/` должны быть доступны по пути `/dist/` на сервере.

PHP файлы (`install.php`, `index.php`) автоматически подключат собранные файлы или будут использовать Vite dev server в режиме разработки.


