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
        'risk_tolerance_score',
        'raw_answers',
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
        'risk_tolerance_score' => 'decimal:4',
        'composite_score' => 'decimal:4',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
