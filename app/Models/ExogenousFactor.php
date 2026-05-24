<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExogenousFactor extends Model
{
    protected $appends = [
        'inflation_rate',
    ];

    protected $fillable = [
        'effective_date',
        'nbe_policy_rate',
        'food_inflation',
        'non_food_inflation',
        'inflation_composite',
        'usd_etb_rate',
        'fuel_price_retail',
        'is_current',
        'updated_by',
    ];

    protected $casts = [
        'effective_date' => 'date',
        'nbe_policy_rate' => 'decimal:4',
        'food_inflation' => 'decimal:4',
        'non_food_inflation' => 'decimal:4',
        'inflation_composite' => 'decimal:4',
        'usd_etb_rate' => 'decimal:2',
        'fuel_price_retail' => 'decimal:2',
        'is_current' => 'boolean',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /** @return Attribute<float|null, never> */
    protected function inflationRate(): Attribute
    {
        return Attribute::get(fn () => $this->inflation_composite !== null
            ? (float) $this->inflation_composite
            : null);
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
        $current = static::query()->where('is_current', true)->orderByDesc('effective_date')->first();

        return $current ?? static::orderByDesc('effective_date')->first();
    }
}
