<?php

namespace App\Domain\Payments\Data;

use App\Domain\Payments\Enums\TransactionStatus;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

/**
 * Canonical Chapa simulation payload mapped to the PRD §14.2 schema.
 */
class ChapaPayloadData extends Data
{
    public function __construct(
        public readonly string $event,
        public readonly string $trxRef,
        public readonly float $amount,
        public readonly string $currency,
        public readonly TransactionStatus $status,
        public readonly string $paymentMethod,
        public readonly CarbonInterface $createdAt,
        public readonly ?string $customerEmail,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return self::fromArray($request->all());
    }

    public static function fromArray(array $payload): self
    {
        $data = $payload['data'] ?? [];

        return new self(
            event: (string) ($payload['event'] ?? 'charge.success'),
            trxRef: (string) ($data['trx_ref'] ?? ''),
            amount: (float) ($data['amount'] ?? 0),
            currency: (string) ($data['currency'] ?? 'ETB'),
            status: TransactionStatus::from((string) ($data['status'] ?? 'pending')),
            paymentMethod: (string) ($data['payment_method'] ?? 'unknown'),
            createdAt: Carbon::parse((string) ($data['created_at'] ?? now()->toIso8601String())),
            customerEmail: $data['customer']['email'] ?? null,
        );
    }

    public function toRawPayload(): array
    {
        return [
            'event' => $this->event,
            'data' => [
                'trx_ref' => $this->trxRef,
                'amount' => number_format($this->amount, 2, '.', ''),
                'currency' => $this->currency,
                'status' => $this->status->value,
                'payment_method' => $this->paymentMethod,
                'created_at' => $this->createdAt->toIso8601String(),
                'customer' => ['email' => $this->customerEmail],
            ],
        ];
    }
}
