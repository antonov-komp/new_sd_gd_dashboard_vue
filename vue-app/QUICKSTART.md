# Быстрый старт Vue.js приложения

## Шаг 1: Установка зависимостей

```bash
cd /var/www/back/vue-app
npm install
```

## Шаг 2: Режим разработки

```bash
npm run dev
```

Vite dev server запустится на `http://localhost:3000`

## Шаг 3: Сборка для production

```bash
npm run build
```

Собранные файлы будут в `/var/www/back/dist/`

## Шаг 4: Проверка работы

1. Откройте `http://localhost/back/install.php` - должна отобразиться страница установки
2. Откройте `http://localhost/back/index.php` - должна отобразиться главная страница

## Структура проекта

```
vue-app/
├── src/                    # Исходный код
│   ├── components/         # Vue компоненты
│   ├── services/           # Сервисы для API
│   ├── router/             # Маршрутизация
│   └── styles/             # Стили
├── package.json            # Зависимости
└── vite.config.js         # Конфигурация Vite
```

## Команды

- `npm run dev` - запуск dev server
- `npm run build` - сборка для production
- `npm run preview` - предпросмотр production сборки

## Документация

- [README.md](./README.md) - общая информация
- [INSTALL.md](./INSTALL.md) - подробная инструкция по установке



