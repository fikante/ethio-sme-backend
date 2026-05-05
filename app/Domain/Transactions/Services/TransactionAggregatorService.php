<?php

namespace App\Domain\Transactions\Services;

use App\Models\Business;
use App\Models\RawTransaction;
use App\Models\SmeDailyHeartbeat;
use Carbon\Carbon;

class TransactionAggregatorService
{
    /**
     * Aggregate raw_transactions into sme_daily_heartbeat time-series table.
     * This is the nightly cron job that the LSTM reads.
     */
    public function aggregate(Business $business, ?Carbon $forDate = null): void
    {
        $date = $forDate ?? Carbon::yesterday();

        $transactions = RawTransaction::where('business_id', $business->id)
            ->whereDate('transacted_at', $date)
            ->get();

        if ($transactions->isEmpty()) {
            return;
        }

        $successTx   = $transactions->where('status', 'success');
        $failedTx    = $transactions->where('status', 'failed');
        $inflowTotal = $successTx->sum('amount');
        $failureRate = $transactions->count() > 0
            ? round($failedTx->count() / $transactions->count(), 4)
            : 0;

        SmeDailyHeartbeat::updateOrCreate(
            ['business_id' => $business->id, 'heartbeat_date' => $date->toDateString()],
            [
                'inflow_total'             => $inflowTotal,
                'outflow_total'            => 0,
                'transaction_failure_rate' => $failureRate,
                'transaction_count'        => $transactions->count(),
                'is_payday'                => $date->day >= 25,
                'is_holiday'               => app(ChapaWebhookSimulatorService::class)
                    ->isEthiopianHoliday($date), // reuse holiday logic — make it public
            ]
        );
    }

    public function aggregateAll(Business $business, int $days = 60): void
    {
        for ($i = 0; $i < $days; $i++) {
            $this->aggregate($business, Carbon::now()->subDays($i + 1));
        }
    }
}

