<?php

namespace App\Domain\Governance\Data;

use Spatie\LaravelData\Data;

class FairnessMetricsData extends Data
{
    public function __construct(
        public readonly int $runBy,
        public readonly array $cohortDefinition,
        public readonly float $spd,
        public readonly float $eod,
        public readonly ?string $notes = null,
    ) {}
}
