<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use OwenIt\Auditing\Auditable as AuditableTrait;
use OwenIt\Auditing\Contracts\Auditable;
use Spatie\Permission\Traits\HasRoles;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements Auditable, JWTSubject
{
    use AuditableTrait;
    use HasRoles;
    use Notifiable;

    protected $fillable = ['name', 'email', 'password', 'loan_provider_id'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims(): array
    {
        return [
            'role' => $this->getRoleNames()->first(),
            'email' => $this->email,
        ];
    }

    public function loanProvider(): BelongsTo
    {
        return $this->belongsTo(LoanProvider::class, 'loan_provider_id');
    }

    public function business(): HasOne
    {
        return $this->hasOne(Business::class, 'owner_id');
    }

    public function businesses(): HasMany
    {
        return $this->hasMany(Business::class, 'owner_id');
    }

    public function consents(): HasMany
    {
        return $this->hasMany(Consent::class);
    }

    public function dataSubjectRequests(): HasMany
    {
        return $this->hasMany(DataSubjectRequest::class);
    }

    public function refreshTokenFamilies(): HasMany
    {
        return $this->hasMany(RefreshTokenFamily::class);
    }
}
