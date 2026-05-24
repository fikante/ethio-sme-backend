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
        'psychometrics_included',
    ];

    protected $casts = [
        'cohort_definition' => 'array',
        'spd' => 'decimal:6',
        'eod' => 'decimal:6',
        'psychometrics_included' => 'boolean',
    ];

    public function runner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'run_by');
    }
}
