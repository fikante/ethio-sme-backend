<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

/**
 * Selector-based inference request for FastAPI contract v2.
 * The ML service loads transaction history from shared Postgres.
 */
class InferenceRequestData extends Data
{
    public function __construct(
        public readonly string $requestId,
        public readonly string $businessUuid,
        public readonly string $asOfDate,
        public readonly array $historyWindow,
        public readonly int $horizonDays,
        public readonly array $psychometricRef,
        public readonly array $macroRef,
        public readonly ?int $seed = null,
        public readonly string $contractVersion = 'v2',
    ) {}

    public function toPayload(): array
    {
        $payload = [
            'contract_version' => $this->contractVersion,
            'request_id' => $this->requestId,
            'business_uuid' => $this->businessUuid,
            'as_of_date' => $this->asOfDate,
            'history_window' => $this->historyWindow,
            'horizon_days' => $this->horizonDays,
            'psychometric_ref' => $this->psychometricRef,
            'macro_ref' => $this->macroRef,
        ];

        if ($this->seed !== null) {
            $payload['seed'] = $this->seed;
        }

        return $payload;
    }
}
