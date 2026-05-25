<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Exceptions\AiEngineException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * HTTP client for the Hugging Face Financial Predictions service (contract v1).
 */
class AiEngineClient
{
    public function health(): array
    {
        return $this->request('get', '/health');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function predict(array $payload): array
    {
        return $this->request('post', '/predict', $payload, authenticated: true);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     * @return array<string, mixed>
     */
    private function request(
        string $method,
        string $path,
        ?array $payload = null,
        bool $authenticated = false,
    ): array {
        $response = $this->send($method, $path, $payload, $authenticated);

        if ($response->successful()) {
            return (array) $response->json();
        }

        $body = (array) $response->json();
        Log::error('AI engine request failed', [
            'method' => $method,
            'path' => $path,
            'status' => $response->status(),
            'body' => $body,
        ]);

        throw AiEngineException::fromResponse($response->status(), $body);
    }

    /**
     * @param  array<string, mixed>|null  $payload
     */
    private function send(
        string $method,
        string $path,
        ?array $payload,
        bool $authenticated,
    ): Response {
        $baseUrl = rtrim((string) config('services.ai_engine.url', 'http://localhost:8000'), '/');
        $timeout = (int) config('services.ai_engine.timeout', 60);

        $http = Http::timeout($timeout)->acceptJson();

        if ($authenticated) {
            $key = (string) config('services.ai_engine.key', '');
            if ($key === '') {
                throw new AiEngineException(
                    'UNAUTHORIZED',
                    'AI service key is not configured (AI_SERVICE_KEY).',
                    httpStatus: 500,
                );
            }
            $http = $http->withHeaders(['X-Internal-Key' => $key]);
        }

        $url = $baseUrl.$path;

        try {
            $response = match (strtolower($method)) {
                'get' => $http->get($url),
                'post' => $http->asJson()->post($url, $payload ?? []),
                default => throw new \InvalidArgumentException("Unsupported HTTP method: {$method}"),
            };

            if ($response->status() === 503 && strtolower($method) === 'post') {
                Log::warning('AI engine returned 503, retrying once after cold-start delay', ['url' => $url]);
                sleep(5);

                return match (strtolower($method)) {
                    'get' => $http->get($url),
                    'post' => $http->asJson()->post($url, $payload ?? []),
                    default => throw new \InvalidArgumentException("Unsupported HTTP method: {$method}"),
                };
            }

            return $response;
        } catch (ConnectionException $e) {
            Log::error('AI engine connection failed', [
                'url' => $url,
                'message' => $e->getMessage(),
            ]);

            throw new AiEngineException(
                'SERVICE_UNAVAILABLE',
                'AI engine is unreachable: '.$e->getMessage(),
                httpStatus: 503,
            );
        }
    }
}
