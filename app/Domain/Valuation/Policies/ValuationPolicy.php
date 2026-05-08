<?php

namespace App\Domain\Valuation\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Domain\Auth\Enums\RoleName;
use App\Models\Business;
use App\Models\User;
use App\Models\Valuation;

class ValuationPolicy
{
    public function run(User $user, Business $business): bool
    {
        if (! $user->can(PermissionName::ValuationsRun->value)) {
            return false;
        }

        if ($user->hasAnyRole([RoleName::LoanOfficer->value, RoleName::SuperAdmin->value])) {
            return true;
        }

        return $business->isOwnedBy($user);
    }

    public function read(User $user, Valuation $valuation): bool
    {
        if (! $user->can(PermissionName::ValuationsRead->value)) {
            return false;
        }

        if ($user->hasAnyRole([RoleName::LoanOfficer->value, RoleName::SuperAdmin->value])) {
            return true;
        }

        return $valuation->business?->isOwnedBy($user) ?? false;
    }

    public function readForBusiness(User $user, Business $business): bool
    {
        if (! $user->can(PermissionName::ValuationsRead->value)) {
            return false;
        }

        if ($user->hasAnyRole([RoleName::LoanOfficer->value, RoleName::SuperAdmin->value])) {
            return true;
        }

        return $business->isOwnedBy($user);
    }
}
