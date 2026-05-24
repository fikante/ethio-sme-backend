<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Valuation extends Model
{
    protected $fillable = [
        'business_id',
        'ai_risk_score',
        'ai_risk_band',
        'prob_default',
        'cashflow_haircut',
        'horizon_days',
        'effective_discount_rate',
        'apr',
        'npv_credit_limit',
        'dscr_p10',
        'p10_cashflow_forecast',
        'p50_cashflow_forecast',
        'p90_cashflow_forecast',
        'shap_values',
        'reason_codes',
        'forecaster_mode',
        'contract_version',
        'model_versions',
        'feature_snapshot_hash',
        'inferred_at',
    ];

    protected $casts = [
        'model_versions' => 'array',
        'p10_cashflow_forecast' => 'array',
        'p50_cashflow_forecast' => 'array',
        'p90_cashflow_forecast' => 'array',
        'shap_values' => 'array',
        'reason_codes' => 'array',
        'ai_risk_score' => 'decimal:4',
        'prob_default' => 'decimal:4',
        'npv_credit_limit' => 'decimal:2',
        'effective_discount_rate' => 'decimal:4',
        'apr' => 'decimal:4',
        'inferred_at' => 'datetime',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function shapExplanations(): HasMany
    {
        return $this->hasMany(ShapExplanation::class)->orderBy('sort_order');
    }

    public function isCompleted(): bool
    {
        return $this->inferred_at !== null && $this->ai_risk_score !== null;
    }

    public function isFailed(): bool
    {
        return $this->inferred_at !== null && $this->ai_risk_score === null;
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
        return Attribute::get(fn () => $this->ai_risk_score);
    }

    /** @return Attribute<string|null, never> */
    protected function xgboostClass(): Attribute
    {
        return Attribute::get(fn () => $this->ai_risk_band);
    }

    /** @return Attribute<string|float|null, never> */
    protected function npvEtb(): Attribute
    {
        return Attribute::get(fn () => $this->npv_credit_limit);
    }

    /** @return Attribute<string|float|null, never> */
    protected function mappedLimitEtb(): Attribute
    {
        return Attribute::get(fn () => $this->npv_credit_limit);
    }

    /** @return Attribute<array|null, never> */
    protected function p10Series(): Attribute
    {
        return Attribute::get(fn () => $this->p10_cashflow_forecast);
    }

    /** @return Attribute<array|null, never> */
    protected function p50Series(): Attribute
    {
        return Attribute::get(fn () => $this->p50_cashflow_forecast);
    }

    /** @return Attribute<array|null, never> */
    protected function p90Series(): Attribute
    {
        return Attribute::get(fn () => $this->p90_cashflow_forecast);
    }
}
