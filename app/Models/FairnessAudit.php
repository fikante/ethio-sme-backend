<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FairnessAudit extends Model
{
    protected $fillable = [
        'run_by',
        'cohort_definition',
        'spd',
        'eod',
        'notes',
    ];

    protected $casts = [
        'cohort_definition' => 'array',
        'spd' => 'decimal:6',
        'eod' => 'decimal:6',
    ];

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'run_by');
    }
}
