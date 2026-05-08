<?php

namespace App\Domain\Business\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;
use Spatie\LaravelData\Optional;

class BusinessData extends Data
{
    public function __construct(
        public readonly int $ownerId,
        public readonly string $businessName,
        public readonly string $sector,
        public readonly string $subCity,
        public readonly int $establishedYear,
        public readonly float|Optional|null $monthlyRevenueEstimate = null,
        public readonly string $status = 'active',
    ) {}

    public static function fromRequest(Request $request, int $ownerId): self
    {
        return new self(
            ownerId: $ownerId,
            businessName: (string) $request->input('business_name'),
            sector: (string) $request->input('sector'),
            subCity: (string) $request->input('sub_city'),
            establishedYear: (int) $request->input('established_year'),
            monthlyRevenueEstimate: $request->filled('monthly_revenue_estimate')
                ? (float) $request->input('monthly_revenue_estimate')
                : null,
            status: (string) $request->input('status', 'active'),
        );
    }

    public function toAttributes(): array
    {
        return [
            'owner_id' => $this->ownerId,
            'business_name' => $this->businessName,
            'sector' => $this->sector,
            'sub_city' => $this->subCity,
            'established_year' => $this->establishedYear,
            'monthly_revenue_estimate' => $this->monthlyRevenueEstimate instanceof Optional
                ? null
                : $this->monthlyRevenueEstimate,
            'status' => $this->status,
        ];
    }
}
