<?php

namespace App\Domain\Compliance\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class AuditLogPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(PermissionName::AuditRead->value);
    }
}
