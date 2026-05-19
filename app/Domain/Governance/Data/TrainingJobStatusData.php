<?php

namespace App\Domain\Governance\Data;

use Spatie\LaravelData\Data;

class TrainingJobStatusData extends Data
{
    public function __construct(
        public readonly string $jobId,
        public readonly string $status,
        public readonly ?array $progress,
        public readonly ?array $results,
        public readonly ?array $warnings,
        public readonly ?string $startedAt,
        public readonly ?string $updatedAt,
        public readonly ?string $completedAt,
        public readonly ?string $errorMessage,
        public readonly string $contractVersion = 'v2',
    ) {}

    public static function fromHttp(array $payload): self
    {
        return new self(
            jobId: (string) ($payload['job_id'] ?? ''),
            status: (string) ($payload['status'] ?? 'unknown'),
            progress: isset($payload['progress']) ? (array) $payload['progress'] : null,
            results: isset($payload['results']) ? (array) $payload['results'] : null,
            warnings: isset($payload['warnings']) ? (array) $payload['warnings'] : null,
            startedAt: isset($payload['started_at']) ? (string) $payload['started_at'] : null,
            updatedAt: isset($payload['updated_at']) ? (string) $payload['updated_at'] : null,
            completedAt: isset($payload['completed_at']) ? (string) $payload['completed_at'] : null,
            errorMessage: isset($payload['error_message']) ? (string) $payload['error_message'] : null,
            contractVersion: (string) ($payload['contract_version'] ?? 'v2'),
        );
    }
}
