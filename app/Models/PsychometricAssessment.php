<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsychometricAssessment extends Model
{
    protected $fillable = [
        'business_id',
        'integrity_score',
        'conscientiousness_score',
        'delayed_gratification_score',
        'financial_risk_score',
        'raw_answers',
        'social_desirability_flagged',
        'assessment_version',
        'completed_at',
        'expiry_date',
    ];

    protected $casts = [
        'raw_answers' => 'array',
        'completed_at' => 'datetime',
        'expiry_date' => 'datetime',
        'integrity_score' => 'decimal:4',
        'conscientiousness_score' => 'decimal:4',
        'delayed_gratification_score' => 'decimal:4',
        'financial_risk_score' => 'decimal:4',
        'composite_score' => 'decimal:4',
        'social_desirability_flagged' => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function isV2(): bool
    {
        return ($this->assessment_version ?? 'v1') === 'v2';
    }
}
