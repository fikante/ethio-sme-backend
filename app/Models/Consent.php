<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Consent extends Model
{
    protected $fillable = [
        'user_id',
        'purpose',
        'document_version',
        'granted_at',
        'withdrawn_at',
    ];

    protected $casts = [
        'granted_at' => 'datetime',
        'withdrawn_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereNotNull('granted_at')->whereNull('withdrawn_at');
    }

    public function isActive(): bool
    {
        return $this->granted_at !== null && $this->withdrawn_at === null;
    }
}
