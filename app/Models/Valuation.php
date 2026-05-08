<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Valuation extends Model
{
    public const STATUS_PENDING = 'pending';

    public const STATUS_COMPLETED = 'completed';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'business_id',
        'loan_application_id',
        'status',
        'model_versions',
        'p10_series',
        'p50_series',
        'p90_series',
        'xgboost_score',
        'xgboost_class',
        'npv_etb',
        'mapped_limit_etb',
        'effective_discount_rate',
        'apr',
        'idempotency_key',
        'inferred_at',
        'error_code',
        'error_message',
    ];

    protected $casts = [
        'model_versions' => 'array',
        'p10_series' => 'array',
        'p50_series' => 'array',
        'p90_series' => 'array',
        'xgboost_score' => 'decimal:4',
        'npv_etb' => 'decimal:2',
        'mapped_limit_etb' => 'decimal:2',
        'effective_discount_rate' => 'decimal:4',
        'apr' => 'decimal:4',
        'inferred_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function shapExplanations(): HasMany
    {
        return $this->hasMany(ShapExplanation::class)->orderBy('sort_order');
    }

    public function isCompleted(): bool
    {
        return $this->status === self::STATUS_COMPLETED;
    }
}
