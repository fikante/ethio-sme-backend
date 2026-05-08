<?php

namespace App\Domain\Governance\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class DriftMetricsPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(PermissionName::DriftMetricsRead->value);
    }
}
