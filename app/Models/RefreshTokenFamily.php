<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefreshTokenFamily extends Model
{
    protected $fillable = [
        'user_id',
        'family_id',
        'current_jti',
        'revoked',
        'issued_at',
        'rotated_at',
        'revoked_at',
        'user_agent',
        'ip_address',
    ];

    protected $casts = [
        'revoked' => 'boolean',
        'issued_at' => 'datetime',
        'rotated_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isUsable(): bool
    {
        return ! $this->revoked;
    }
}
