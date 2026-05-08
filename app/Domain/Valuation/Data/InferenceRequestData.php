<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

class InferenceRequestData extends Data
{
    public function __construct(
        public readonly int $businessId,
        public readonly array $businessProfile,
        public readonly array $heartbeatWindow,
        public readonly array $psychometric,
        public readonly array $exogenousFactors,
        public readonly int $tenureMonths,
        public readonly array $cohortAttributes = [],
    ) {}

    public function toPayload(): array
    {
        return [
            'business_id' => $this->businessId,
            'business_profile' => $this->businessProfile,
            'heartbeat_window' => $this->heartbeatWindow,
            'psychometric' => $this->psychometric,
            'exogenous' => $this->exogenousFactors,
            'tenure_months' => $this->tenureMonths,
            'cohort' => $this->cohortAttributes,
        ];
    }
}
