<?php

namespace App\Domain\Business\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class BusinessUpdateData extends Data
{
    public function __construct(
        public readonly ?string $businessName = null,
        public readonly ?string $sector = null,
        public readonly ?string $subCity = null,
        public readonly ?int $establishedYear = null,
        public readonly ?float $monthlyRevenueEstimate = null,
        public readonly ?string $status = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            businessName: $request->filled('business_name') ? (string) $request->input('business_name') : null,
            sector: $request->filled('sector') ? (string) $request->input('sector') : null,
            subCity: $request->filled('sub_city') ? (string) $request->input('sub_city') : null,
            establishedYear: $request->filled('established_year') ? (int) $request->input('established_year') : null,
            monthlyRevenueEstimate: $request->filled('monthly_revenue_estimate')
                ? (float) $request->input('monthly_revenue_estimate')
                : null,
            status: $request->filled('status') ? (string) $request->input('status') : null,
        );
    }

    public function toAttributes(): array
    {
        return array_filter([
            'business_name' => $this->businessName,
            'sector' => $this->sector,
            'sub_city' => $this->subCity,
            'established_year' => $this->establishedYear,
            'monthly_revenue_estimate' => $this->monthlyRevenueEstimate,
            'status' => $this->status,
        ], static fn ($value) => $value !== null);
    }
}
