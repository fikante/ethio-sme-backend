<?php

namespace App\Domain\Governance\Data;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Data;

class DriftMetricsData extends Data
{
    public function __construct(
        public readonly ?int $businessId,
        public readonly float $mape,
        public readonly int $horizonDays,
        public readonly CarbonInterface $evaluatedAt,
        public readonly array $details = [],
    ) {}

    public static function forBusiness(int $businessId, float $mape, int $horizonDays, array $details = []): self
    {
        return new self(
            businessId: $businessId,
            mape: $mape,
            horizonDays: $horizonDays,
            evaluatedAt: Carbon::now(),
            details: $details,
        );
    }
}
