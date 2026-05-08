<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| Nightly heartbeat aggregation (PRD §7.5)
|--------------------------------------------------------------------------
| Rebuilds sme_daily_heartbeat rows for every business. Action lives in
| App\Domain\TimeSeries\Actions\RebuildDailyHeartbeatAction; the service
| App\Domain\TimeSeries\Services\DailyHeartbeatAggregatorService coordinates
| the per-business loop. The Artisan command thinly wraps the service.
*/
Schedule::command('heartbeat:aggregate', ['--days=1'])
    ->dailyAt('01:00')
    ->name('aggregate-daily-heartbeat')
    ->withoutOverlapping();
