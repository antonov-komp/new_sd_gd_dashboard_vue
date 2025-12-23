<?php

// Путь к crest.php относительно api/graph-admission-closure/bitrix/
// crest.php находится в корне проекта (3 уровня вверх: bitrix -> graph-admission-closure -> api -> корень)
require_once __DIR__ . '/../../../crest.php';

/**
 * TASK-065: Инкапсуляция работы с Bitrix24 (CRest) для модуля графика.
 *
 * Перенесена логика из legacy `graph-1c-admission-closure.php`:
 * - Параллельные запросы (executeParallelQueries)
 * - Пагинация для created/closed/carryover тикетов
 * - Обработка ошибок и fallback на последовательные запросы
 * - Фильтрация по product=1C
 */
class BitrixClient
{
    private int $entityTypeId;
    private int $pageSize;

    public function __construct(int $entityTypeId = 140, int $pageSize = 50)
    {
        $this->entityTypeId = $entityTypeId;
        $this->pageSize = $pageSize;
    }

    /**
     * Параллельное выполнение двух запросов к Bitrix24 API
     * Логика перенесена из legacy без изменений (TASK-065)
     */
    private function executeParallelQueries(array $query1Params, array $query2Params): array
    {
        $settings = null;
        $isWebhook = false;

        try {
            $reflection = new ReflectionClass('CRest');
            $method = $reflection->getMethod('getAppSettings');
            $method->setAccessible(true);
            $settings = $method->invoke(null);
        } catch (Exception $e) {
            error_log("[BitrixClient::executeParallelQueries] Failed to get settings: " . $e->getMessage());
            return [
                ['error' => 'settings_not_available'],
                ['error' => 'settings_not_available']
            ];
        }

        if (!$settings || $settings === false) {
            return [
                ['error' => 'settings_not_available'],
                ['error' => 'settings_not_available']
            ];
        }

        $isWebhook = !empty($settings['is_web_hook']) && $settings['is_web_hook'] === 'Y';
        $baseUrl = '';

        if ($isWebhook) {
            $baseUrl = defined('C_REST_WEB_HOOK_URL') ? C_REST_WEB_HOOK_URL : '';
            if (empty($baseUrl) && isset($settings['client_endpoint'])) {
                $baseUrl = $settings['client_endpoint'];
            }
        } else {
            $baseUrl = isset($settings['client_endpoint']) ? $settings['client_endpoint'] : '';
            $accessToken = $settings['access_token'] ?? '';
            $expiresAt = isset($settings['expires_at']) ? (int)$settings['expires_at'] : 0;
            $now = time();

            if (empty($accessToken) || ($expiresAt > 0 && $now >= ($expiresAt - 60))) {
                try {
                    CRest::call('app.info', []);
                    $reflection = new ReflectionClass('CRest');
                    $getMethod = $reflection->getMethod('getAppSettings');
                    $getMethod->setAccessible(true);
                    $settings = $getMethod->invoke(null);
                    $accessToken = $settings['access_token'] ?? '';
                } catch (Exception $e) {
                    error_log("[BitrixClient::executeParallelQueries] Error checking token: " . $e->getMessage());
                }
            }

            if (!empty($accessToken)) {
                $query1Params['auth'] = $accessToken;
                $query2Params['auth'] = $accessToken;
            } else {
                error_log("[BitrixClient::executeParallelQueries] ERROR: OAuth mode but access_token not available");
            }
        }

        if (empty($baseUrl)) {
            error_log("[BitrixClient::executeParallelQueries] Base URL not found");
            return [
                ['error' => 'base_url_not_configured'],
                ['error' => 'base_url_not_configured']
            ];
        }

        $method = 'crm.item.list';
        $extension = '.json';

        $url1 = rtrim($baseUrl, '/') . '/' . $method . $extension;
        $url2 = rtrim($baseUrl, '/') . '/' . $method . $extension;

        $postData1 = http_build_query($query1Params);
        $postData2 = http_build_query($query2Params);

        $multiHandle = curl_multi_init();
        $handles = [];
        $results = [];

        foreach ([
            ['url' => $url1, 'data' => $postData1, 'index' => 0],
            ['url' => $url2, 'data' => $postData2, 'index' => 1]
        ] as $query) {
            $ch = curl_init($query['url']);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $query['data']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_USERAGENT, 'Bitrix24 CRest PHP Parallel');

            if (defined("C_REST_IGNORE_SSL") && C_REST_IGNORE_SSL === true) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            }

            curl_multi_add_handle($multiHandle, $ch);
            $handles[$query['index']] = $ch;
        }

        $running = null;
        do {
            curl_multi_exec($multiHandle, $running);
            curl_multi_select($multiHandle, 0.1);
        } while ($running > 0);

        foreach ($handles as $index => $ch) {
            $response = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $error = curl_error($ch);

            if ($error) {
                error_log("[BitrixClient::executeParallelQueries] Error for query {$index}: {$error}");
                $results[$index] = ['error' => $error];
            } elseif ($httpCode !== 200) {
                error_log("[BitrixClient::executeParallelQueries] HTTP error {$httpCode} for query {$index}");
                $results[$index] = ['error' => "HTTP {$httpCode}"];
            } else {
                $data = json_decode($response, true);
                if ($data === null) {
                    error_log("[BitrixClient::executeParallelQueries] Failed to decode JSON for query {$index}");
                    $results[$index] = ['error' => 'invalid_json'];
                } else {
                    $results[$index] = $data;
                }
            }

            curl_multi_remove_handle($multiHandle, $ch);
            curl_close($ch);
        }

        curl_multi_close($multiHandle);

        return [
            $results[0] ?? ['error' => 'unknown_error'],
            $results[1] ?? ['error' => 'unknown_error']
        ];
    }

    /**
     * Загрузка тикетов с пагинацией
     */
    private function fetchTicketsWithPagination(array $baseParams, bool $useParallel = false, ?array $parallelResult = null): array
    {
        $allTicketsMap = [];
        $pageNum = 1;

        if ($useParallel && $parallelResult !== null && !isset($parallelResult['error'])) {
            $result = $parallelResult;
        } else {
            $result = CRest::call('crm.item.list', $baseParams);
        }

        if (isset($result['error'])) {
            throw new Exception($result['error_description'] ?? $result['error']);
        }

        $items = $result['result']['items'] ?? [];
        foreach ($items as $item) {
            $allTicketsMap[$item['id']] = $item;
        }

        $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
        $hasNext = $nextValue !== null &&
                  $nextValue !== '' &&
                  $nextValue !== '0' &&
                  (int)$nextValue > 0;
        $hasMore = count($items) === $this->pageSize && $hasNext;

        $start = $this->pageSize;
        while ($hasMore) {
            $params = array_merge($baseParams, ['start' => $start]);
            $result = CRest::call('crm.item.list', $params);

            if (isset($result['error'])) {
                throw new Exception($result['error_description'] ?? $result['error']);
            }

            $items = $result['result']['items'] ?? [];
            $pageNum++;

            foreach ($items as $item) {
                $allTicketsMap[$item['id']] = $item;
            }

            $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
            $hasNext = $nextValue !== null &&
                      $nextValue !== '' &&
                      $nextValue !== '0' &&
                      (int)$nextValue > 0;
            $hasMore = count($items) === $this->pageSize && $hasNext;

            $start += $this->pageSize;
        }

        return array_values($allTicketsMap);
    }

    /**
     * Загрузка созданных тикетов за период
     */
    public function fetchCreatedTickets(DateTimeImmutable $periodStart, DateTimeImmutable $periodEnd, bool $debug = false): array
    {
        $periodStartStr = $periodStart->format('Y-m-d H:i:s');
        $periodEndStr = $periodEnd->format('Y-m-d H:i:s');

        $query1Params = [
            'entityTypeId' => $this->entityTypeId,
            'filter' => [
                '>=createdTime' => $periodStartStr,
                '<=createdTime' => $periodEndStr
            ],
            'select' => [
                'id', 'title', 'stageId', 'assignedById',
                'createdTime', 'updatedTime', 'movedTime',
                'UF_CRM_7_TYPE_PRODUCT', 'ufCrm7TypeProduct'
            ],
            'start' => 0
        ];

        $query2Params = [
            'entityTypeId' => $this->entityTypeId,
            'filter' => [
                '>=movedTime' => $periodStartStr,
                '<=movedTime' => $periodEndStr,
                'stageId' => [] // Будет заполнено в fetchClosedTickets
            ],
            'select' => [
                'id', 'title', 'stageId', 'assignedById',
                'createdTime', 'updatedTime', 'movedTime',
                'UF_CRM_7_TYPE_PRODUCT', 'ufCrm7TypeProduct'
            ],
            'start' => 0
        ];

        $parallelResults = $this->executeParallelQueries($query1Params, $query2Params);
        $query1FirstPage = $parallelResults[0];
        $useParallel = !isset($query1FirstPage['error']);

        if (!$useParallel && $debug) {
            error_log("[BitrixClient::fetchCreatedTickets] Parallel query failed, falling back to sequential");
        }

        return $this->fetchTicketsWithPagination($query1Params, $useParallel, $query1FirstPage);
    }

    /**
     * Загрузка закрытых тикетов за период
     */
    public function fetchClosedTickets(DateTimeImmutable $periodStart, DateTimeImmutable $periodEnd, array $closingStages, bool $debug = false): array
    {
        $periodStartStr = $periodStart->format('Y-m-d H:i:s');
        $periodEndStr = $periodEnd->format('Y-m-d H:i:s');

        $query2Params = [
            'entityTypeId' => $this->entityTypeId,
            'filter' => [
                '>=movedTime' => $periodStartStr,
                '<=movedTime' => $periodEndStr,
                'stageId' => $closingStages
            ],
            'select' => [
                'id', 'title', 'stageId', 'assignedById',
                'createdTime', 'updatedTime', 'movedTime',
                'UF_CRM_7_TYPE_PRODUCT', 'ufCrm7TypeProduct'
            ],
            'start' => 0
        ];

        $query1Params = [
            'entityTypeId' => $this->entityTypeId,
            'filter' => [
                '>=createdTime' => $periodStartStr,
                '<=createdTime' => $periodEndStr
            ],
            'select' => [
                'id', 'title', 'stageId', 'assignedById',
                'createdTime', 'updatedTime', 'movedTime',
                'UF_CRM_7_TYPE_PRODUCT', 'ufCrm7TypeProduct'
            ],
            'start' => 0
        ];

        $parallelResults = $this->executeParallelQueries($query1Params, $query2Params);
        $query2FirstPage = $parallelResults[1];
        $useParallel = !isset($query2FirstPage['error']);

        if (!$useParallel && $debug) {
            error_log("[BitrixClient::fetchClosedTickets] Parallel query failed, falling back to sequential");
        }

        return $this->fetchTicketsWithPagination($query2Params, $useParallel, $query2FirstPage);
    }

    /**
     * Загрузка переходящих тикетов (созданных до endDate, находящихся в targetStages)
     */
    public function fetchCarryoverTickets(array $targetStages, DateTimeImmutable $endDate, bool $debug = false): array
    {
        $periodEndStr = $endDate->format('Y-m-d H:i:s');
        $allTicketsMap = [];

        foreach ($targetStages as $stageId) {
            $start = 0;
            $hasMore = true;

            while ($hasMore) {
                $result = CRest::call('crm.item.list', [
                    'entityTypeId' => $this->entityTypeId,
                    'filter' => [
                        'stageId' => $stageId,
                        '<=createdTime' => $periodEndStr
                    ],
                    'select' => [
                        'id', 'title', 'stageId', 'assignedById',
                        'createdTime', 'updatedTime', 'movedTime',
                        'UF_CRM_7_TYPE_PRODUCT', 'ufCrm7TypeProduct'
                    ],
                    'start' => $start
                ]);

                if (isset($result['error'])) {
                    throw new Exception($result['error_description'] ?? $result['error']);
                }

                $items = $result['result']['items'] ?? [];
                foreach ($items as $item) {
                    if (!isset($allTicketsMap[$item['id']])) {
                        $allTicketsMap[$item['id']] = $item;
                    }
                }

                $nextValue = $result['result']['next'] ?? $result['next'] ?? null;
                $hasNext = $nextValue !== null &&
                          $nextValue !== '' &&
                          $nextValue !== '0' &&
                          (int)$nextValue > 0;
                $hasMore = count($items) === $this->pageSize && $hasNext;

                $start += $this->pageSize;
            }
        }

        return array_values($allTicketsMap);
    }

    /**
     * Фильтрация тикетов по product=1C
     * Логика перенесена из legacy без изменений (TASK-065)
     */
    public function filterByProduct(array $tickets, string $product = '1C'): array
    {
        $filtered = [];

        foreach ($tickets as $item) {
            $tagRaw = $item['UF_CRM_7_TYPE_PRODUCT'] ?? $item['ufCrm7TypeProduct'] ?? null;
            $tags = [];
            if (is_array($tagRaw)) {
                $tags = $tagRaw;
            } elseif (is_string($tagRaw)) {
                $parts = array_map('trim', explode(',', $tagRaw));
                $tags = $parts;
            }
            $normalized = array_map(function ($v) {
                return mb_strtoupper(str_replace('С', 'C', trim((string)$v)));
            }, $tags);
            $is1C = in_array('1C', $normalized, true);
            if (!$is1C && mb_strtoupper($product) === '1C') {
                continue;
            }
            $filtered[] = $item;
        }

        return $filtered;
    }

    /**
     * Объединение массивов тикетов по ID (для устранения дубликатов)
     */
    public function mergeTickets(array ...$ticketArrays): array
    {
        $merged = [];
        foreach ($ticketArrays as $tickets) {
            foreach ($tickets as $ticket) {
                $merged[$ticket['id']] = $ticket;
            }
        }
        return array_values($merged);
    }
}
