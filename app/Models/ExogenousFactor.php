<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExogenousFactor extends Model
{
    protected $fillable = [
        'effective_date', 'nbe_policy_rate', 'inflation_rate', 'usd_etb_rate',
        'updated_by', 'notes',
    ];

    protected $casts = [
        'effective_date'  => 'date',
        'nbe_policy_rate' => 'decimal:4',
        'inflation_rate'  => 'decimal:4',
        'usd_etb_rate'    => 'decimal:2',
    ];

    public static function latest(): ?self
    {
        return static::orderByDesc('effective_date')->first();
    }
}
