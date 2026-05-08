<?php

namespace App\Domain\Governance\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class FairnessAuditPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(PermissionName::FairnessAuditRead->value);
    }

    public function run(User $user): bool
    {
        return $user->can(PermissionName::FairnessAuditRun->value);
    }
}
