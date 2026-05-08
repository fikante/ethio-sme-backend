<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

class NpvResultData extends Data
{
    public function __construct(
        public readonly float $npvEtb,
        public readonly float $mappedLimitEtb,
        public readonly float $effectiveDiscountRate,
        public readonly float $apr,
    ) {}
}
