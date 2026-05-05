<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use OwenIt\Auditing\Contracts\Auditable;

class Business extends Model implements Auditable
{
    use SoftDeletes, \OwenIt\Auditing\Auditable;

    protected $fillable = [
        'owner_id', 'business_name', 'sector',
        'sub_city', 'established_year', 'monthly_revenue_estimate', 'status',
    ];

    public function owner(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function psychometricAssessment(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(PsychometricAssessment::class);
    }

    public function rawTransactions(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(RawTransaction::class);
    }

    public function dailyHeartbeat(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SmeDailyHeartbeat::class);
    }

    public function loanApplications(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }
}
