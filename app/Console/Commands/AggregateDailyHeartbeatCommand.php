<?php

namespace App\Console\Commands;

use App\Domain\TimeSeries\Services\DailyHeartbeatAggregatorService;
use Illuminate\Console\Command;

class AggregateDailyHeartbeatCommand extends Command
{
    protected $signature = 'heartbeat:aggregate {--days=1 : Number of trailing days to (re)aggregate}';

    protected $description = 'Rebuilds sme_daily_heartbeat rows from raw_transactions for all businesses';

    public function handle(DailyHeartbeatAggregatorService $service): int
    {
        $days = (int) $this->option('days');
        $count = $service->aggregateAllBusinesses(max(1, $days));

        $this->info("Heartbeat aggregation completed; rows rebuilt: {$count}");

        return self::SUCCESS;
    }
}
