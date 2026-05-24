<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class LoanProvider extends Model implements Auditable
{
    use AuditableTrait;
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'short_code',
        'type',
        'nbe_license_no',
        'contact_email',
        'contact_phone',
        'website',
        'address',
        'accepted_risk_bands',
        'min_loan_amount_etb',
        'max_loan_amount_etb',
        'base_interest_rate',
        'status',
        'logo_url',
    ];

    protected $casts = [
        'accepted_risk_bands' => 'array',
        'min_loan_amount_etb' => 'decimal:2',
        'max_loan_amount_etb' => 'decimal:2',
        'base_interest_rate' => 'decimal:4',
    ];

    protected static function booted(): void
    {
        static::creating(function (LoanProvider $model): void {
            $model->uuid ??= (string) Str::uuid();
        });
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'loan_provider_id');
    }

    /** @deprecated Use users() — loan provider staff are the same role. */
    public function loanOfficers(): HasMany
    {
        return $this->users();
    }

    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class, 'loan_provider_id');
    }

    public function loanHistory(): HasMany
    {
        return $this->hasMany(SmeLoanHistory::class, 'loan_provider_id');
    }

    public function acceptsRiskBand(string $band): bool
    {
        return in_array($band, $this->accepted_risk_bands ?? [], true);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active');
    }
}
