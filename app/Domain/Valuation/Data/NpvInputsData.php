<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

class NpvInputsData extends Data
{
    /**
     * @param  list<float>  $p10CashFlows
     */
    public function __construct(
        public readonly array $p10CashFlows,
        public readonly float $nbePolicyRate,
        public readonly float $psychometricCompositeScore,
        public readonly float $xgboostRiskScore,
    ) {}
}
