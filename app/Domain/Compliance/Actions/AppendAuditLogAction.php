<?php

namespace App\Domain\Compliance\Actions;

use App\Domain\Compliance\Data\AuditEventData;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

class AppendAuditLogAction
{
    public function execute(AuditEventData $event): AuditLog
    {
        return DB::transaction(fn (): AuditLog => AuditLog::create($event->toAttributes()));
    }
}
