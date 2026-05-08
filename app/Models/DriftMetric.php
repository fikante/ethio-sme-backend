<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DriftMetric extends Model
{
    protected $fillable = [
        'business_id',
        'mape',
        'horizon_days',
        'evaluated_at',
        'details',
    ];

    protected $casts = [
        'mape' => 'decimal:6',
        'horizon_days' => 'integer',
        'evaluated_at' => 'datetime',
        'details' => 'array',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
