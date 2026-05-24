<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiEvaluationLog extends Model
{
    protected $fillable = [
        'loan_application_id',
        'valuation_id',
        'request_payload',
        'response_payload',
        'latency_ms',
        'success',
        'forecaster_mode',
        'error_message',
    ];

    protected $casts = [
        'request_payload' => 'array',
        'response_payload' => 'array',
        'success' => 'boolean',
    ];

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }
}
