<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Exceptions\AiEngineException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Low-level HTTP client for the FastAPI Financial Predictions service (contract v2).
 */
class AiEngineClient
{
    public function health(): array
    {
        return $this->request('get', '/health');
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function inference(array $payload): array
    {
        return $this->request('post', '/inference', $payload, authenticated: true);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function submitTrainingJob(array $payload): array
    {
        return $this->request('post', '/training/jobs', $payload, authenticated: true);
    }

    public function getTrainingJob(string $jobId): array
    {
        return $this->request('get', '/training/jobs/'.$jobId, authenticated: true);
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

        throw AiEngineException::fromResponse($response->status(), (array) $response->json());
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
        $apiPrefix = '/api/v1';
        $timeout = (int) config('services.ai_engine.timeout', 30);
        $retries = max(1, (int) config('services.ai_engine.retries', 1));

        $http = Http::timeout($timeout)
            ->retry($retries, 200, throw: false)
            ->acceptJson();

        if ($authenticated) {
            $token = (string) config('services.ai_engine.token', '');
            if ($token === '') {
                throw new AiEngineException(
                    'UNAUTHORIZED',
                    'AI service token is not configured (AI_SERVICE_TOKEN).',
                    httpStatus: 500,
                );
            }
            $http = $http->withToken($token);
        }

        $url = $baseUrl.$apiPrefix.$path;

        try {
            return match (strtolower($method)) {
                'get' => $http->get($url),
                'post' => $http->asJson()->post($url, $payload ?? []),
                default => throw new \InvalidArgumentException("Unsupported HTTP method: {$method}"),
            };
        } catch (ConnectionException $e) {
            throw new AiEngineException(
                'SERVICE_UNAVAILABLE',
                'AI engine is unreachable: '.$e->getMessage(),
                httpStatus: 503,
            );
        }
    }
}
