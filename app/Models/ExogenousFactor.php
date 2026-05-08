<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExogenousFactor extends Model
{
    protected $fillable = [
        'effective_date',
        'nbe_policy_rate',
        'inflation_rate',
        'usd_etb_rate',
        'updated_by',
        'notes',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'nbe_policy_rate' => 'decimal:4',
        'inflation_rate' => 'decimal:4',
        'usd_etb_rate' => 'decimal:2',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function effectiveOn(?\DateTimeInterface $on = null): ?self
    {
        $query = static::query()->orderByDesc('effective_date');

        if ($on !== null) {
            $query->where('effective_date', '<=', $on);
        }

        return $query->first();
    }

    public static function latestRow(): ?self
    {
        return static::orderByDesc('effective_date')->first();
    }
}
