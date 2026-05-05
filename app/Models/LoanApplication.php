<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;

class LoanApplication extends Model implements Auditable
{
    use SoftDeletes, \OwenIt\Auditing\Auditable;

    protected $fillable = [
        'business_id', 'reviewed_by', 'requested_amount', 'requested_tenure_months',
        'status', 'npv_credit_limit', 'ai_risk_score', 'effective_discount_rate',
        'p10_cashflow_forecast', 'p50_cashflow_forecast', 'p90_cashflow_forecast',
        'shap_values', 'reason_codes', 'apr', 'rejection_narrative', 'decided_at',
    ];

    protected $casts = [
        'p10_cashflow_forecast' => 'array',
        'p50_cashflow_forecast' => 'array',
        'p90_cashflow_forecast' => 'array',
        'shap_values'           => 'array',
        'reason_codes'          => 'array',
        'decided_at'            => 'datetime',
        'npv_credit_limit'      => 'decimal:2',
        'ai_risk_score'         => 'decimal:4',
        'effective_discount_rate' => 'decimal:4',
        'apr'                   => 'decimal:4',
    ];

    public function business(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function reviewer(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function evaluationLogs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(AiEvaluationLog::class);
    }
}
