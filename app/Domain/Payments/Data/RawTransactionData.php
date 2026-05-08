<?php

namespace App\Domain\Payments\Data;

use App\Domain\Payments\Enums\TransactionSource;
use App\Domain\Payments\Enums\TransactionStatus;
use Carbon\CarbonInterface;
use Spatie\LaravelData\Data;

class RawTransactionData extends Data
{
    public function __construct(
        public readonly int $businessId,
        public readonly string $providerTxRef,
        public readonly float $amount,
        public readonly string $currency,
        public readonly TransactionStatus $status,
        public readonly string $paymentMethod,
        public readonly ?string $customerEmail,
        public readonly array $rawPayload,
        public readonly CarbonInterface $transactedAt,
        public readonly TransactionSource $source,
        public readonly ?string $idempotencyKey = null,
    ) {}

    public function toAttributes(): array
    {
        return [
            'business_id' => $this->businessId,
            'provider_tx_ref' => $this->providerTxRef,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'status' => $this->status->value,
            'payment_method' => $this->paymentMethod,
            'customer_email' => $this->customerEmail,
            'raw_payload' => $this->rawPayload,
            'transacted_at' => $this->transactedAt,
            'source' => $this->source->value,
            'idempotency_key' => $this->idempotencyKey,
        ];
    }
}
