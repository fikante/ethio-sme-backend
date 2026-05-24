<?php

namespace App\Domain\Macroeconomics\Data;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class ExogenousFactorsData extends Data
{
    public function __construct(
        public readonly CarbonInterface $effectiveDate,
        public readonly float $nbePolicyRate,
        public readonly float $inflationRate,
        public readonly ?float $usdEtbRate,
        public readonly ?float $fuelPriceRetail,
        public readonly int $updatedBy,
    ) {}

    public static function fromRequest(Request $request, int $updatedBy): self
    {
        return new self(
            effectiveDate: Carbon::parse((string) $request->input('effective_date')),
            nbePolicyRate: (float) $request->input('nbe_policy_rate'),
            inflationRate: (float) $request->input('inflation_rate'),
            usdEtbRate: $request->filled('usd_etb_rate') ? (float) $request->input('usd_etb_rate') : null,
            fuelPriceRetail: $request->filled('fuel_price_retail') ? (float) $request->input('fuel_price_retail') : null,
            updatedBy: $updatedBy,
        );
    }

    public function toAttributes(): array
    {
        return [
            'effective_date' => $this->effectiveDate->toDateString(),
            'nbe_policy_rate' => $this->nbePolicyRate,
            'food_inflation' => $this->inflationRate,
            'non_food_inflation' => $this->inflationRate,
            'inflation_composite' => $this->inflationRate,
            'usd_etb_rate' => $this->usdEtbRate,
            'fuel_price_retail' => $this->fuelPriceRetail ?? 0,
            'is_current' => true,
            'updated_by' => $this->updatedBy,
        ];
    }
}
