<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiEvaluationLog extends Model
{
    protected $fillable = [
        'loan_application_id', 'request_payload', 'response_payload',
        'latency_ms', 'success', 'error_message',
    ];

    protected $casts = [
        'request_payload'  => 'array',
        'response_payload' => 'array',
        'success'          => 'boolean',
    ];
}
