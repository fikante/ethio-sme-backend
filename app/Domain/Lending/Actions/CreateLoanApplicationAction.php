<?php

namespace App\Domain\Lending\Actions;

use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Models\LoanApplication;
use Illuminate\Support\Facades\DB;

class CreateLoanApplicationAction
{
    public function execute(CreateLoanApplicationData $data): LoanApplication
    {
        return DB::transaction(function () use ($data): LoanApplication {
            if ($data->idempotencyKey !== null) {
                $existing = LoanApplication::query()
                    ->where('business_id', $data->businessId)
                    ->where('idempotency_key', $data->idempotencyKey)
                    ->first();

                if ($existing !== null) {
                    return $existing;
                }
            }

            return LoanApplication::create([
                'business_id' => $data->businessId,
                'requested_amount' => $data->requestedAmount,
                'requested_tenure_months' => $data->requestedTenureMonths,
                'status' => LoanApplication::STATUS_PENDING_PSYCHOMETRIC,
                'idempotency_key' => $data->idempotencyKey,
            ]);
        });
    }
}
