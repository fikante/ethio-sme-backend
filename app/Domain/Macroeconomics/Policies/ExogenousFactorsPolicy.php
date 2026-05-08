<?php

namespace App\Domain\Macroeconomics\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class ExogenousFactorsPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can(PermissionName::MacroeconomicsManage->value);
    }

    public function manage(User $user): bool
    {
        return $user->can(PermissionName::MacroeconomicsManage->value);
    }
}
