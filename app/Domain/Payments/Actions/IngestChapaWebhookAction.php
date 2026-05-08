<?php

namespace App\Domain\Payments\Actions;

use App\Domain\Payments\Data\ChapaPayloadData;
use App\Domain\Payments\Data\RawTransactionData;
use App\Domain\Payments\Enums\TransactionSource;
use App\Models\Business;
use App\Models\RawTransaction;
use Illuminate\Support\Facades\DB;

class IngestChapaWebhookAction
{
    /**
     * Append-only ingestion. Returns existing record if provider_tx_ref already
     * stored for the business (idempotency on duplicate webhook delivery).
     */
    public function execute(Business $business, ChapaPayloadData $payload, ?string $idempotencyKey = null): RawTransaction
    {
        return DB::transaction(function () use ($business, $payload, $idempotencyKey): RawTransaction {
            $existing = RawTransaction::query()
                ->where('business_id', $business->id)
                ->where('provider_tx_ref', $payload->trxRef)
                ->first();

            if ($existing !== null) {
                return $existing;
            }

            $data = new RawTransactionData(
                businessId: $business->id,
                providerTxRef: $payload->trxRef,
                amount: $payload->amount,
                currency: $payload->currency,
                status: $payload->status,
                paymentMethod: $payload->paymentMethod,
                customerEmail: $payload->customerEmail,
                rawPayload: $payload->toRawPayload(),
                transactedAt: $payload->createdAt,
                source: TransactionSource::ChapaWebhook,
                idempotencyKey: $idempotencyKey,
            );

            return RawTransaction::create($data->toAttributes());
        });
    }
}
