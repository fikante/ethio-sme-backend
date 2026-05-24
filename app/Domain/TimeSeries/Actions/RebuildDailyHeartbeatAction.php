<?php

namespace App\Domain\TimeSeries\Actions;

use App\Models\Business;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Legacy aggregator from raw_transactions — disabled on Supabase (CSV/AI heartbeat only).
 */
class RebuildDailyHeartbeatAction
{
    public function execute(Business $business, Carbon $date): void
    {
        Log::debug('RebuildDailyHeartbeatAction skipped: heartbeat is sourced from Supabase AI/CSV data.', [
            'business_uuid' => $business->uuid,
            'date' => $date->toDateString(),
        ]);
    }
}
