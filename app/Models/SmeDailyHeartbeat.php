<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmeDailyHeartbeat extends Model
{
    protected $table = 'sme_daily_heartbeat';

    protected $fillable = [
        'business_id',
        'heartbeat_date',
        'inflow_total',
        'outflow_total',
        'transaction_failure_rate',
        'transaction_count',
        'is_payday',
        'is_holiday',
        'mape_score',
    ];

    protected $casts = [
        'heartbeat_date' => 'date',
        'is_payday' => 'boolean',
        'is_holiday' => 'boolean',
        'inflow_total' => 'decimal:2',
        'outflow_total' => 'decimal:2',
        'net_cashflow' => 'decimal:2',
        'transaction_failure_rate' => 'decimal:4',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function scopeWindow(Builder $query, int $businessId, int $days): Builder
    {
        return $query->where('business_id', $businessId)
            ->orderByDesc('heartbeat_date')
            ->limit($days);
    }
}
