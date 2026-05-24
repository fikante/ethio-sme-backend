<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;

class Business extends Model implements Auditable
{
    use AuditableTrait;
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'owner_id',
        'business_name',
        'sector',
        'sub_city',
        'established_year',
        'monthly_revenue_estimate',
        'tin_number',
        'trade_license_no',
        'premises_status',
        'employee_count',
        'monthly_rent',
        'data_source',
        'simulation_seed',
        'status',
    ];

    protected static function booted(): void
    {
        static::creating(function (Business $business): void {
            if (empty($business->uuid)) {
                $business->uuid = (string) Str::uuid();
            }

            // Placeholder must be unique (uq_businesses_tin); one shared "PENDING" breaks multi-tenant drafts.
            $business->tin_number ??= 'PENDING-'.$business->uuid;
            $business->premises_status ??= 'rented';
            $business->data_source ??= 'web';
        });
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function psychometricAssessment(): HasOne
    {
        return $this->hasOne(PsychometricAssessment::class)->latestOfMany();
    }

    public function psychometricAssessments(): HasMany
    {
        return $this->hasMany(PsychometricAssessment::class);
    }

    public function rawTransactions(): HasMany
    {
        return $this->hasMany(RawTransaction::class);
    }

    public function dailyHeartbeat(): HasMany
    {
        return $this->hasMany(SmeDailyHeartbeat::class, 'business_uuid', 'uuid');
    }

    public function loanApplications(): HasMany
    {
        return $this->hasMany(LoanApplication::class);
    }

    public function valuations(): HasMany
    {
        return $this->hasMany(Valuation::class);
    }

    public function latestValuation(): HasOne
    {
        return $this->hasOne(Valuation::class)
            ->whereNotNull('inferred_at')
            ->whereNotNull('ai_risk_score')
            ->latestOfMany('inferred_at');
    }

    public function scopeOwnedBy(Builder $query, int $userId): Builder
    {
        return $query->where('owner_id', $userId);
    }

    public function isOwnedBy(?User $user): bool
    {
        return $user !== null && (int) $user->id === (int) $this->owner_id;
    }
}
