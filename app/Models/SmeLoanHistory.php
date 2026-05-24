<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SmeLoanHistory extends Model
{
    protected $table = 'sme_loan_history';

    protected $fillable = [
        'loan_provider_id',
        'source_bank',
    ];

    public function loanProvider(): BelongsTo
    {
        return $this->belongsTo(LoanProvider::class, 'loan_provider_id');
    }
}
