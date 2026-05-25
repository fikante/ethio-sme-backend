<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class LoanApplication extends Model implements Auditable
{
    use AuditableTrait;
    use SoftDeletes;

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_PENDING_PSYCHOMETRIC = 'pending_psychometric';

    public const STATUS_PENDING_DATA_SYNC = 'pending_data_sync';

    public const STATUS_QUEUED_FOR_AI = 'queued_for_ai';

    public const STATUS_PROCESSING = 'processing';

    public const STATUS_EVALUATED = 'evaluated';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_REJECTED = 'rejected';

    public const STATUS_WITHDRAWN = 'withdrawn';

    protected $fillable = [
        'business_id',
        'reviewed_by',
        'loan_provider_id',
        'requested_amount',
        'requested_tenure_months',
        'status',
        'idempotency_key',
        'valuation_id',
        'npv_credit_limit',
        'ai_risk_score',
        'ai_risk_band',
        'prob_default',
        'snapshot_risk_score',
        'snapshot_limit_etb',
        'effective_discount_rate',
        'reason_codes',
        'apr',
        'rejection_narrative',
        'decided_at',
        'contract_version',
        'model_versions',
        'feature_snapshot_hash',
    ];

    protected $casts = [
        'reason_codes' => 'array',
        'model_versions' => 'array',
        'decided_at' => 'datetime',
        'ai_risk_score' => 'decimal:4',
        'prob_default' => 'decimal:4',
        'snapshot_risk_score' => 'decimal:4',
        'npv_credit_limit' => 'decimal:2',
        'snapshot_limit_etb' => 'decimal:2',
        'effective_discount_rate' => 'decimal:4',
        'apr' => 'decimal:4',
    ];

    protected $with = [];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function loanProvider(): BelongsTo
    {
        return $this->belongsTo(LoanProvider::class, 'loan_provider_id');
    }

    public function evaluationLogs(): HasMany
    {
        return $this->hasMany(AiEvaluationLog::class);
    }

    public function valuations(): HasMany
    {
        return $this->hasMany(Valuation::class, 'business_id', 'business_id');
    }

    public function valuation(): BelongsTo
    {
        return $this->belongsTo(Valuation::class, 'valuation_id');
    }

    public function latestValuation(): BelongsTo
    {
        return $this->valuation();
    }

    public function adverseActionNotices(): HasMany
    {
        return $this->hasMany(AdverseActionNotice::class);
    }

    /** @return Attribute<string|float|null, never> */
    protected function npvCreditLimit(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->npv_credit_limit ?? $this->snapshot_limit_etb);
    }

    /** @return Attribute<string|float|null, never> */
    protected function aiRiskScore(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->ai_risk_score ?? $this->snapshot_risk_score);
    }

    /** @return Attribute<array|null, never> */
    protected function p10CashflowForecast(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->p10_cashflow_forecast);
    }

    /** @return Attribute<array|null, never> */
    protected function p50CashflowForecast(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->p50_cashflow_forecast);
    }

    /** @return Attribute<array|null, never> */
    protected function p90CashflowForecast(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->p90_cashflow_forecast);
    }

    /** @return Attribute<array|null, never> */
    protected function shapValues(): Attribute
    {
        return Attribute::get(fn () => $this->valuation?->shap_values);
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
        return in_array($this->status, [
            self::STATUS_QUEUED_FOR_AI,
            self::STATUS_SUBMITTED,
            self::STATUS_PENDING_DATA_SYNC,
        ], true);
    }

    public function isDegradedEvaluation(): bool
    {
        return $this->status === self::STATUS_EVALUATED
            && ($this->valuation?->isDegraded() ?? $this->npv_credit_limit === null);
    }
}
