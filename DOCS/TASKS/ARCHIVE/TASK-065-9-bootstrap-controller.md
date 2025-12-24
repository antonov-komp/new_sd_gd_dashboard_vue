# TASK-065-9: Входная точка и контроллер (`bootstrap.php` + controller)

**Дата создания:** 2025-12-23 01:00 (UTC+3, Брест)  
**Статус:** Новая  
**Приоритет:** Высокий  
**Родитель:** TASK-065  
**Цель:** Создать тонкий слой входа для эндпоинта, сохранив публичный путь и контракт ответа. Разделить обязанности: bootstrap (хедеры/парсинг тела/ошибки) и controller (вызов сервиса).

## Область
- Новый модульный файл `api/graph-admission-closure/bootstrap.php` (или `index.php`), подключающий слои: Config, DatePeriodHelper, BitrixClient, Aggregator, CacheStore, Service.
- Контроллер (например, `controller/GraphAdmissionClosureController.php`) отвечает за:
  - чтение тела (php://input),
  - установку Content-Type,
  - вызов сервиса и возврат JSON,
  - маппинг исключений в HTTP-коды (400 на валидации periodMode, 500 на прочие).
- Старый путь `api/graph-1c-admission-closure.php` должен остаться рабочим — либо прокси на новый bootstrap, либо require.
- Логика ответа/структуры/ключей — неизменна.
- Разрешить только POST (как сейчас по факту), на другие методы — 405/или игнорировать (остаться с текущим поведением).
- Чтение тела: json_decode, при пустом — [].
- В JSON-ответе использовать JSON_UNESCAPED_UNICODE (как в исходнике).

## Требования к реализации
- Bootstrap:
  - `require_once` всех слоёв (если нет автозагрузчика).
  - `setupAppLogging()` (создание каталога logs/app, настройка error_log).
  - Чтение входа в массив (json_decode с fallback на пустой массив).
  - Хедеры: `Content-Type: application/json; charset=utf-8`.
  - Вызов контроллера, echo json_encode с JSON_UNESCAPED_UNICODE.
- Контроллер:
  - Метод `handle(array $body): array` → вызывает Service.
  - Оборачивает вызов в try/catch:
    - на известные ошибки валидации возвращает 400 + `{ success: false, error }`.
    - на Exception — 500 + `{ success: false, message }`.
  - Никакой бизнес-логики внутри.
- Совместимость: формат ошибок/сообщений оставить, как в исходнике (`Invalid periodMode...`, `Ошибка получения данных: ...`).
- Прокси-файл `api/graph-1c-admission-closure.php`: минимум кода, только require нового bootstrap.
- Не менять CORS/доп. заголовки (оставить текущий набор — по факту только Content-Type).

## План выполнения
1) Определить место файлов: `api/graph-admission-closure/bootstrap.php` и `controller/GraphAdmissionClosureController.php`.
2) Подготовить каркас файлов с комментариями/подключениями; пока без рефакторинга тела.
3) В старом `api/graph-1c-admission-closure.php` оставить require нового bootstrap (для сохранения URL).
4) Обновить `graph-admission-closure-spec.md`: раздел “Входная точка” — порядок шагов и коды ответов.

## Артефакты
- Каркас `bootstrap.php` и `controller/GraphAdmissionClosureController.php`.
- Обновление `DOCS/ANALYSIS/graph-admission-closure-spec.md` (раздел входа/контроллера).
- Примечание в родительском таске о сохранении старого пути (прокси).

## Критерии приёмки
- Описаны и готовы каркасы bootstrap+controller.
- Сохранён путь `api/graph-1c-admission-closure.php` (через прокси).
- Формат ошибок/хедеров/ответа не меняется.
- Контракт API неизменен.

## Риски и заметки
- Не нарушить существующий роутинг/фронтовой вызов (URL должен остаться тем же).
- Проверить, что логирование и JSON-хедеры выставлены до вывода.

