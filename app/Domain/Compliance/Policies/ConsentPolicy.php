<?php

namespace App\Domain\Compliance\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class ConsentPolicy
{
    public function manage(User $user): bool
    {
        return $user->can(PermissionName::ConsentsManage->value);
    }
}
