<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RawTransaction extends Model
{
    public const STATUS_SUCCESS = 'success';

    public const STATUS_FAILED = 'failed';

    public const STATUS_PENDING = 'pending';

    public const STATUS_REVERSED = 'reversed';

    public const SOURCE_CHAPA_SIMULATED = 'chapa_simulated';

    public const SOURCE_CHAPA_WEBHOOK = 'chapa_webhook';

    protected $fillable = [
        'business_id',
        'provider_tx_ref',
        'amount',
        'currency',
        'status',
        'payment_method',
        'customer_email',
        'raw_payload',
        'transacted_at',
        'source',
        'idempotency_key',
    ];

    protected $casts = [
        'raw_payload' => 'array',
        'transacted_at' => 'datetime',
        'amount' => 'decimal:2',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function scopeForBusiness(Builder $query, int $businessId): Builder
    {
        return $query->where('business_id', $businessId);
    }

    public function scopeOnDate(Builder $query, \DateTimeInterface $date): Builder
    {
        return $query->whereDate('transacted_at', $date);
    }
}
