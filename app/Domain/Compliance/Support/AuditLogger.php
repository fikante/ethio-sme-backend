<?php

namespace App\Domain\Compliance\Support;

use App\Domain\Compliance\Data\AuditEventData;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;

/**
 * Pluggable thin wrapper around AuditLog persistence. Used by Actions when an
 * inline audit append is required outside the AppendAuditLogAction transaction.
 */
class AuditLogger
{
    public function append(AuditEventData $event): ?AuditLog
    {
        try {
            return AuditLog::create($event->toAttributes());
        } catch (\Throwable $e) {
            Log::warning('Failed to write audit log', [
                'reason' => $e->getMessage(),
                'action' => $event->action->value,
            ]);

            return null;
        }
    }
}
