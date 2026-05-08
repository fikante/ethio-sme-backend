<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShapExplanation extends Model
{
    protected $fillable = [
        'valuation_id',
        'feature_key',
        'shap_value',
        'feature_value_snapshot',
        'sort_order',
    ];

    protected $casts = [
        'shap_value' => 'decimal:6',
        'feature_value_snapshot' => 'array',
        'sort_order' => 'integer',
    ];

    public function valuation(): BelongsTo
    {
        return $this->belongsTo(Valuation::class);
    }
}
