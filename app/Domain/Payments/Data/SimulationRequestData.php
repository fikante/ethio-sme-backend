<?php

namespace App\Domain\Payments\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class SimulationRequestData extends Data
{
    public function __construct(
        public readonly int $businessId,
        public readonly int $days,
        public readonly ?string $idempotencyKey,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            businessId: (int) $request->input('business_id'),
            days: (int) $request->input('days', 60),
            idempotencyKey: $request->header('Idempotency-Key'),
        );
    }
}
