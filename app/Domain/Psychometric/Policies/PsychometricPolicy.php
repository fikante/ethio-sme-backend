<?php

namespace App\Domain\Psychometric\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Domain\Auth\Enums\RoleName;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use App\Models\User;

class PsychometricPolicy
{
    public function submit(User $user, Business $business): bool
    {
        return $business->isOwnedBy($user) && $user->can(PermissionName::PsychometricSubmit->value);
    }

    public function view(User $user, PsychometricAssessment $assessment): bool
    {
        if ($user->hasAnyRole([...RoleName::loanProviderRoleNames(), RoleName::SuperAdmin->value])) {
            return true;
        }

        $business = $assessment->business;

        return $business !== null && $business->isOwnedBy($user);
    }
}
