<?php

namespace App\Domain\Lending\Data;

use Spatie\LaravelData\Data;

class LoanProviderData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $short_code,
        public readonly string $type,
        public readonly ?string $nbe_license_no,
        public readonly ?string $contact_email,
        public readonly ?string $contact_phone,
        public readonly ?string $website,
        public readonly ?string $address,
        /** @var string[] */
        public readonly array $accepted_risk_bands,
        public readonly float $min_loan_amount_etb,
        public readonly float $max_loan_amount_etb,
        public readonly float $base_interest_rate,
        public readonly ?string $logo_url = null,
        public readonly string $status = 'active',
    ) {}
}
