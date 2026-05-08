<?php

namespace App\Domain\TimeSeries\Actions;

use App\Domain\Payments\Support\EthiopianHolidayCalendar;
use App\Domain\TimeSeries\Data\HeartbeatRowData;
use App\Models\Business;
use App\Models\RawTransaction;
use App\Models\SmeDailyHeartbeat;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Rebuilds the sme_daily_heartbeat row for a given (business, date).
 * Idempotent via updateOrCreate on (business_id, heartbeat_date).
 */
class RebuildDailyHeartbeatAction
{
    public function __construct(private readonly EthiopianHolidayCalendar $calendar) {}

    public function execute(Business $business, CarbonInterface $date): SmeDailyHeartbeat
    {
        return DB::transaction(function () use ($business, $date): SmeDailyHeartbeat {
            $transactions = RawTransaction::query()
                ->forBusiness($business->id)
                ->onDate($date)
                ->get();

            $successTotal = (float) $transactions
                ->where('status', RawTransaction::STATUS_SUCCESS)
                ->sum('amount');

            $failedCount = $transactions->where('status', RawTransaction::STATUS_FAILED)->count();
            $totalCount = $transactions->count();

            $row = new HeartbeatRowData(
                businessId: $business->id,
                date: Carbon::parse($date),
                inflowTotal: $successTotal,
                outflowTotal: 0.0,
                transactionFailureRate: $totalCount > 0 ? round($failedCount / $totalCount, 4) : 0.0,
                transactionCount: $totalCount,
                isPayday: $date->day >= 25,
                isHoliday: $this->calendar->isHoliday($date),
            );

            return SmeDailyHeartbeat::updateOrCreate(
                [
                    'business_id' => $row->businessId,
                    'heartbeat_date' => $row->date->toDateString(),
                ],
                $row->toAttributes()
            );
        });
    }
}
