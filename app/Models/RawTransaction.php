<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RawTransaction extends Model
{
    protected $fillable = [
        'business_id', 'provider_tx_ref', 'amount', 'currency',
        'status', 'payment_method', 'customer_email', 'raw_payload', 'transacted_at',
    ];

    protected $casts = [
        'raw_payload'    => 'array',
        'transacted_at'  => 'datetime',
        'amount'         => 'decimal:2',
    ];

    public function business(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}
