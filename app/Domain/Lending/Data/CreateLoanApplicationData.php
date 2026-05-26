<?php

namespace App\Domain\Lending\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class CreateLoanApplicationData extends Data
{
    public function __construct(
        public readonly int $businessId,
        public readonly float $requestedAmount,
        public readonly int $requestedTenureMonths,
        public readonly ?string $idempotencyKey,
        public readonly ?int $loanProviderId = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            businessId: (int) $request->input('business_id'),
            requestedAmount: (float) $request->input('requested_amount'),
            requestedTenureMonths: (int) $request->input('requested_tenure_months'),
            idempotencyKey: $request->header('Idempotency-Key'),
            loanProviderId: $request->input('loan_provider_id') !== null
                ? (int) $request->input('loan_provider_id')
                : null,
        );
    }
}
