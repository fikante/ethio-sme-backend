<?php

namespace App\Models;

use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

class SmeDailyHeartbeat extends Model
{
    protected $table = 'sme_daily_heartbeat';

    protected $fillable = [
        'business_id',
        'business_uuid',
        'heartbeat_date',
        'transaction_date',
        'inflow_total',
        'outflow_total',
        'daily_total_inflow',
        'daily_total_outflow',
        'net_cashflow',
        'transaction_failure_rate',
        'transaction_count',
        'txn_count',
        'unique_cust_count',
        'end_of_day_balance',
        'channel',
        'sector_mcc',
        'location_region',
        'acct_opening_date',
        'source_type',
        'ingest_seed',
        'is_payday',
        'is_holiday',
        'mape_score',
    ];

    protected $casts = [
        'business_id' => 'integer',
        'business_uuid' => 'string',
        'heartbeat_date' => 'date',
        'transaction_date' => 'date',
        'acct_opening_date' => 'date',
        'inflow_total' => 'decimal:2',
        'outflow_total' => 'decimal:2',
        'daily_total_inflow' => 'decimal:2',
        'daily_total_outflow' => 'decimal:2',
        'net_cashflow' => 'decimal:2',
        'transaction_failure_rate' => 'decimal:4',
        'is_payday' => 'boolean',
        'is_holiday' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        if (SupabaseHeartbeatSchema::isSupabaseLayout()) {
            return $this->belongsTo(Business::class, 'business_id');
        }

        return $this->belongsTo(Business::class, 'business_uuid', 'uuid');
    }

    public function scopeForBusiness(Builder $query, Business $business): Builder
    {
        // #region agent log
        $logPath = base_path('.cursor/debug-054501.log');
        @file_put_contents($logPath, json_encode([
            'sessionId' => '054501',
            'hypothesisId' => 'A',
            'location' => 'SmeDailyHeartbeat::scopeForBusiness',
            'message' => 'forBusiness scope',
            'data' => [
                'isSupabaseLayout' => SupabaseHeartbeatSchema::isSupabaseLayout(),
                'fkColumn' => SupabaseHeartbeatSchema::businessFkColumn(),
                'businessId' => $business->id,
                'hasBusinessUuid' => $business->uuid !== null,
            ],
            'timestamp' => (int) round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        return $query->where(
            SupabaseHeartbeatSchema::businessFkColumn(),
            SupabaseHeartbeatSchema::businessFkValue($business),
        );
    }

    public function scopeWindow(Builder $query, Business $business, int $days): Builder
    {
        return $query->forBusiness($business)
            ->orderByDesc(SupabaseHeartbeatSchema::dateColumn())
            ->limit($days);
    }

    /** @return Attribute<Carbon|null, never> */
    protected function heartbeatDate(): Attribute
    {
        return Attribute::get(fn () => $this->attributes[SupabaseHeartbeatSchema::dateColumn()] ?? null);
    }

    /** @return Attribute<Carbon|null, never> */
    protected function transactionDate(): Attribute
    {
        return Attribute::get(fn () => $this->heartbeat_date);
    }

    /** @return Attribute<string|float|null, never> */
    protected function inflowTotal(): Attribute
    {
        return Attribute::get(fn () => $this->attributes[SupabaseHeartbeatSchema::inflowColumn()] ?? null);
    }

    /** @return Attribute<string|float|null, never> */
    protected function dailyTotalInflow(): Attribute
    {
        return Attribute::get(fn () => $this->inflow_total);
    }

    /** @return Attribute<string|float|null, never> */
    protected function outflowTotal(): Attribute
    {
        return Attribute::get(fn () => $this->attributes[SupabaseHeartbeatSchema::outflowColumn()] ?? null);
    }

    /** @return Attribute<string|float|null, never> */
    protected function dailyTotalOutflow(): Attribute
    {
        return Attribute::get(fn () => $this->outflow_total);
    }

    /** @return Attribute<int|null, never> */
    protected function transactionCount(): Attribute
    {
        return Attribute::get(fn () => $this->attributes[SupabaseHeartbeatSchema::txnCountColumn()] ?? null);
    }

    /** @return Attribute<int|null, never> */
    protected function txnCount(): Attribute
    {
        return Attribute::get(fn () => $this->transaction_count);
    }
}
