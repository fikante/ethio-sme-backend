<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Domain\Transactions\Services\TransactionAggregatorService;
use App\Models\Business;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Aggregate daily heartbeat every night at 01:00 AM
Schedule::call(function () {
    $aggregator = app(TransactionAggregatorService::class);
    Business::all()->each(fn ($b) => $aggregator->aggregate($b));
})->dailyAt('01:00')->name('aggregate-daily-heartbeat')->withoutOverlapping();
