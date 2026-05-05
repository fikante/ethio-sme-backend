<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PsychometricAssessment extends Model
{
    protected $fillable = [
        'business_id', 'integrity_score', 'conscientiousness_score',
        'risk_tolerance_score', 'raw_answers', 'completed_at',
    ];

    protected $casts = [
        'raw_answers'    => 'array',
        'completed_at'   => 'datetime',
        'integrity_score'         => 'decimal:4',
        'conscientiousness_score' => 'decimal:4',
        'risk_tolerance_score'    => 'decimal:4',
        'composite_score'         => 'decimal:4',
    ];

    public function business(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
