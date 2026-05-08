<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SecurityIncident extends Model
{
    public const SEVERITY_LOW = 'low';

    public const SEVERITY_MEDIUM = 'medium';

    public const SEVERITY_HIGH = 'high';

    public const SEVERITY_CRITICAL = 'critical';

    protected $fillable = [
        'detected_at',
        'reported_to_eca_at',
        'summary',
        'severity',
        'payload',
    ];

    protected $casts = [
        'detected_at' => 'datetime',
        'reported_to_eca_at' => 'datetime',
        'payload' => 'array',
    ];

    public function isWithinEcaSla(): bool
    {
        if ($this->reported_to_eca_at === null) {
            return $this->detected_at->diffInHours(now()) <= 72;
        }

        return $this->detected_at->diffInHours($this->reported_to_eca_at) <= 72;
    }
}
