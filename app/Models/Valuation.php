<?php

namespace App\Models;

use App\Domain\Valuation\Support\SupabaseValuationSchema;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Valuation extends Model
{
    protected $fillable = [
        'business_id',
        'loan_application_id',
        'status',
        'forecaster_mode',
        'contract_version',
        'model_versions',
        'feature_snapshot_hash',
        'shap_integrity_passed',
        'horizon_reliability_warning',
        'horizon_reliability_message',
        'ai_risk_score',
        'ai_risk_band',
        'p10_cashflow_forecast',
        'p50_cashflow_forecast',
        'p90_cashflow_forecast',
        'p10_series',
        'p50_series',
        'p90_series',
        'xgboost_score',
        'xgboost_class',
        'prob_default',
        'horizon_days',
        'cashflow_haircut',
        'dscr_p10',
        'npv_credit_limit',
        'npv_etb',
        'mapped_limit_etb',
        'effective_discount_rate',
        'apr',
        'reason_codes',
        'shap_values',
        'idempotency_key',
        'external_valuation_id',
        'inferred_at',
        'error_code',
        'error_message',
    ];

    protected $casts = [
        'model_versions' => 'array',
        'p10_series' => 'array',
        'p50_series' => 'array',
        'p90_series' => 'array',
        'p10_cashflow_forecast' => 'array',
        'p50_cashflow_forecast' => 'array',
        'p90_cashflow_forecast' => 'array',
        'shap_values' => 'array',
        'reason_codes' => 'array',
        'shap_integrity_passed' => 'boolean',
        'horizon_reliability_warning' => 'boolean',
        'ai_risk_score' => 'decimal:4',
        'xgboost_score' => 'decimal:4',
        'prob_default' => 'decimal:4',
        'npv_credit_limit' => 'decimal:2',
        'npv_etb' => 'decimal:2',
        'mapped_limit_etb' => 'decimal:2',
        'effective_discount_rate' => 'decimal:4',
        'apr' => 'decimal:4',
        'cashflow_haircut' => 'decimal:4',
        'dscr_p10' => 'decimal:4',
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
        $score = SupabaseValuationSchema::isSupabaseLayout()
            ? $this->ai_risk_score
            : $this->xgboost_score;

        return $this->inferred_at !== null && $score !== null;
    }

    public function isFailed(): bool
    {
        return $this->inferred_at !== null && ! $this->isCompleted();
    }

    public function isDegraded(): bool
    {
        if ($this->forecaster_mode === 'degraded') {
            return true;
        }

        $limit = SupabaseValuationSchema::isSupabaseLayout()
            ? $this->npv_credit_limit
            : ($this->mapped_limit_etb ?? $this->npv_etb);

        return $limit === null;
    }

    /** @return Attribute<string, never> */
    protected function status(): Attribute
    {
        return Attribute::get(function (): string {
            if ($this->isCompleted()) {
                return 'completed';
            }

            if ($this->isFailed()) {
                return 'failed';
            }

            return 'pending';
        });
    }

    /** @return Attribute<string|float|null, never> */
    protected function xgboostScore(): Attribute
    {
        return Attribute::get(fn () => $this->ai_risk_score ?? $this->attributes['xgboost_score'] ?? null);
    }

    /** @return Attribute<string|null, never> */
    protected function xgboostClass(): Attribute
    {
        return Attribute::get(fn () => $this->ai_risk_band ?? $this->attributes['xgboost_class'] ?? null);
    }

    /** @return Attribute<string|float|null, never> */
    protected function mappedLimitEtb(): Attribute
    {
        return Attribute::get(fn () => $this->npv_credit_limit ?? $this->npv_etb ?? $this->mapped_limit_etb);
    }

    /** @return Attribute<string|float|null, never> */
    protected function npvEtb(): Attribute
    {
        return Attribute::get(fn () => $this->mapped_limit_etb);
    }

    /** @return Attribute<array|null, never> */
    protected function p10Series(): Attribute
    {
        return Attribute::get(fn () => $this->p10_cashflow_forecast ?? $this->attributes['p10_series'] ?? null);
    }

    /** @return Attribute<array|null, never> */
    protected function p50Series(): Attribute
    {
        return Attribute::get(fn () => $this->p50_cashflow_forecast ?? $this->attributes['p50_series'] ?? null);
    }

    /** @return Attribute<array|null, never> */
    protected function p90Series(): Attribute
    {
        return Attribute::get(fn () => $this->p90_cashflow_forecast ?? $this->attributes['p90_series'] ?? null);
    }
}
