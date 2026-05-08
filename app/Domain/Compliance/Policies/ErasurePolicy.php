<?php

namespace App\Domain\Compliance\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Models\User;

class ErasurePolicy
{
    public function request(User $user): bool
    {
        return $user->can(PermissionName::PrivacyErasureRequest->value);
    }
}
