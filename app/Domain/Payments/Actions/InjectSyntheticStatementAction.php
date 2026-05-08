<?php

namespace App\Domain\Payments\Actions;

use App\Domain\Payments\Data\RawTransactionData;
use App\Domain\Payments\Data\SimulationRequestData;
use App\Domain\Payments\Enums\TransactionSource;
use App\Domain\Payments\Services\SyntheticStatementGeneratorService;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\RawTransaction;
use Illuminate\Support\Facades\DB;

class InjectSyntheticStatementAction
{
    public function __construct(private readonly SyntheticStatementGeneratorService $generator) {}

    /**
     * @return array{business: Business, transactions_count: int}
     */
    public function execute(Business $business, SimulationRequestData $request): array
    {
        return DB::transaction(function () use ($business, $request): array {
            if ($request->idempotencyKey !== null) {
                $baseKey = $request->idempotencyKey;
                $existing = RawTransaction::query()
                    ->where('business_id', $business->id)
                    ->where('idempotency_key', 'like', $baseKey.':%')
                    ->exists();

                if ($existing) {
                    return [
                        'business' => $business,
                        'transactions_count' => RawTransaction::query()
                            ->where('business_id', $business->id)
                            ->where('idempotency_key', 'like', $baseKey.':%')
                            ->count(),
                    ];
                }
            }

            $count = 0;
            $index = 1;
            foreach ($this->generator->generate($business, $request->days) as $payload) {
                $idempotencyKey = $request->idempotencyKey !== null
                    ? $request->idempotencyKey.':'.$index
                    : null;

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
                    source: TransactionSource::ChapaSimulated,
                    idempotencyKey: $idempotencyKey,
                );

                RawTransaction::create($data->toAttributes());
                $count++;
                $index++;
            }

            LoanApplication::query()
                ->where('business_id', $business->id)
                ->where('status', LoanApplication::STATUS_PENDING_DATA_SYNC)
                ->update(['status' => LoanApplication::STATUS_QUEUED_FOR_AI]);

            return [
                'business' => $business,
                'transactions_count' => $count,
            ];
        });
    }
}
