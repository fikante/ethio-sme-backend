<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class SmeDailyHeartbeat extends Model
{
    protected $table = 'sme_daily_heartbeat';

    protected $fillable = [
        'business_uuid',
        'transaction_date',
        'daily_total_inflow',
        'daily_total_outflow',
        'net_cashflow',
        'end_of_day_balance',
        'txn_count',
        'unique_cust_count',
        'channel',
        'sector_mcc',
        'location_region',
        'acct_opening_date',
        'source_type',
        'ingest_seed',
    ];

    protected $casts = [
        'business_uuid' => 'string',
        'transaction_date' => 'date',
        'acct_opening_date' => 'date',
        'daily_total_inflow' => 'decimal:2',
        'daily_total_outflow' => 'decimal:2',
        'net_cashflow' => 'decimal:2',
        'end_of_day_balance' => 'decimal:2',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class, 'business_uuid', 'uuid');
    }

    public function scopeForBusiness(Builder $query, Business $business): Builder
    {
        return $query->where('business_uuid', $business->uuid);
    }

    public function scopeWindow(Builder $query, Business $business, int $days): Builder
    {
        return $query->forBusiness($business)
            ->orderByDesc('transaction_date')
            ->limit($days);
    }

    /** @return Attribute<Carbon|null, never> */
    protected function heartbeatDate(): Attribute
    {
        return Attribute::get(fn () => $this->transaction_date);
    }

    /** @return Attribute<string|float|null, never> */
    protected function inflowTotal(): Attribute
    {
        return Attribute::get(fn () => $this->daily_total_inflow);
    }

    /** @return Attribute<string|float|null, never> */
    protected function outflowTotal(): Attribute
    {
        return Attribute::get(fn () => $this->daily_total_outflow);
    }

    /** @return Attribute<int|null, never> */
    protected function transactionCount(): Attribute
    {
        return Attribute::get(fn () => $this->txn_count);
    }
}
