<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class LoanApplication extends Model implements Auditable
{
    use AuditableTrait;
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_PENDING_PSYCHOMETRIC = 'pending_psychometric';

    public const STATUS_PENDING_DATA_SYNC = 'pending_data_sync';

    public const STATUS_QUEUED_FOR_AI = 'queued_for_ai';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_WITHDRAWN = 'withdrawn';

    protected $fillable = [
        'business_id',
        'reviewed_by',
        'requested_amount',
        'requested_tenure_months',
        'status',
        'idempotency_key',
        'npv_credit_limit',
        'ai_risk_score',
        'snapshot_risk_score',
        'effective_discount_rate',
        'p10_cashflow_forecast',
        'p50_cashflow_forecast',
        'p90_cashflow_forecast',
        'shap_values',
        'reason_codes',
        'apr',
        'rejection_narrative',
        'decided_at',
    ];

    protected $casts = [
        'p10_cashflow_forecast' => 'array',
        'p50_cashflow_forecast' => 'array',
        'p90_cashflow_forecast' => 'array',
        'shap_values' => 'array',
        'reason_codes' => 'array',
        'decided_at' => 'datetime',
        'npv_credit_limit' => 'decimal:2',
        'ai_risk_score' => 'decimal:4',
        'snapshot_risk_score' => 'decimal:4',
        'effective_discount_rate' => 'decimal:4',
        'apr' => 'decimal:4',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function evaluationLogs(): HasMany
    {
        return $this->hasMany(AiEvaluationLog::class);
    }

    public function valuations(): HasMany
    {
        return $this->hasMany(Valuation::class);
    }

    public function latestValuation(): HasOne
    {
        return $this->hasOne(Valuation::class)->latestOfMany('inferred_at');
    }

    public function adverseActionNotices(): HasMany
    {
        return $this->hasMany(AdverseActionNotice::class);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->whereIn('status', [
            self::STATUS_PENDING_PSYCHOMETRIC,
            self::STATUS_PENDING_DATA_SYNC,
            self::STATUS_QUEUED_FOR_AI,
            self::STATUS_PROCESSING,
        ]);
    }

    public function scopeForBusinessOwner(Builder $query, int $userId): Builder
    {
        return $query->whereHas('business', fn (Builder $b) => $b->where('owner_id', $userId));
    }

    public function isTerminal(): bool
    {
        return in_array($this->status, [self::STATUS_APPROVED, self::STATUS_REJECTED, self::STATUS_WITHDRAWN], true);
    }

    public function isReadyForValuation(): bool
    {
        return in_array($this->status, [self::STATUS_QUEUED_FOR_AI, self::STATUS_PENDING_DATA_SYNC], true);
    }
}
