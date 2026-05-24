<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdverseActionNotice extends Model
{
    protected $fillable = [
        'loan_application_id',
        'valuation_id',
        'officer_id',
        'reason_codes',
        'narrative',
        'apr',
        'contract_version',
        'model_versions',
    ];

    protected $casts = [
        'reason_codes' => 'array',
        'model_versions' => 'array',
        'apr' => 'decimal:4',
    ];

    public function loanApplication(): BelongsTo
    {
        return $this->belongsTo(LoanApplication::class);
    }

    public function officer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'officer_id');
    }
}
