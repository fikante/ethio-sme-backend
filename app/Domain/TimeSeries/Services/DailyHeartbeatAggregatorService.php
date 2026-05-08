<?php

namespace App\Domain\TimeSeries\Services;

use App\Domain\TimeSeries\Actions\RebuildDailyHeartbeatAction;
use App\Models\Business;
use Carbon\Carbon;

/**
 * Coordinates per-day rebuilds across a window. Performs no DB writes itself
 * — delegates each row to RebuildDailyHeartbeatAction so that mutation lives
 * in an Action per the architecture rules.
 */
class DailyHeartbeatAggregatorService
{
    public function __construct(private readonly RebuildDailyHeartbeatAction $rebuild) {}

    public function aggregateWindow(Business $business, int $days = 60): int
    {
        $rebuilt = 0;
        for ($i = 0; $i < $days; $i++) {
            $this->rebuild->execute($business, Carbon::now()->subDays($i + 1));
            $rebuilt++;
        }

        return $rebuilt;
    }

    public function aggregateAllBusinesses(int $days = 1): int
    {
        $rebuilt = 0;
        Business::query()->orderBy('id')->chunk(100, function ($chunk) use (&$rebuilt, $days) {
            foreach ($chunk as $business) {
                for ($i = 0; $i < $days; $i++) {
                    $this->rebuild->execute($business, Carbon::yesterday()->subDays($i));
                    $rebuilt++;
                }
            }
        });

        return $rebuilt;
    }
}
