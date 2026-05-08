<?php

namespace App\Domain\Compliance\Data;

use App\Domain\Compliance\Enums\AuditAction;
use Spatie\LaravelData\Data;

class AuditEventData extends Data
{
    public function __construct(
        public readonly AuditAction $action,
        public readonly ?int $actorId,
        public readonly ?string $entityType = null,
        public readonly ?string $entityId = null,
        public readonly ?array $oldValues = null,
        public readonly ?array $newValues = null,
        public readonly ?string $ipAddress = null,
        public readonly ?string $userAgent = null,
    ) {}

    public function toAttributes(): array
    {
        return [
            'action' => $this->action->value,
            'actor_id' => $this->actorId,
            'entity_type' => $this->entityType,
            'entity_id' => $this->entityId,
            'old_values' => $this->oldValues,
            'new_values' => $this->newValues,
            'ip_address' => $this->ipAddress,
            'user_agent' => $this->userAgent,
            'created_at' => now(),
        ];
    }
}
