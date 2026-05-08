<?php

namespace App\Domain\Business\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Domain\Auth\Enums\RoleName;
use App\Models\Business;
use App\Models\User;

/**
 * Owns all business-resource abilities. Payment-related abilities (`simulate`,
 * `ingestWebhook`) live here because Laravel resolves policies by model class
 * and the $business model is the authorization target for those actions too.
 */
class BusinessPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole([
            RoleName::SmeOwner->value,
            RoleName::LoanOfficer->value,
            RoleName::SuperAdmin->value,
        ]);
    }

    public function view(User $user, Business $business): bool
    {
        if ($user->hasAnyRole([RoleName::LoanOfficer->value, RoleName::SuperAdmin->value])) {
            return true;
        }

        return $business->isOwnedBy($user);
    }

    public function create(User $user): bool
    {
        return $user->can(PermissionName::BusinessesSelfManage->value);
    }

    public function update(User $user, Business $business): bool
    {
        return $business->isOwnedBy($user) && $user->can(PermissionName::BusinessesSelfManage->value);
    }

    public function delete(User $user, Business $business): bool
    {
        return $business->isOwnedBy($user) && $user->can(PermissionName::BusinessesSelfManage->value);
    }

    public function simulate(User $user, Business $business): bool
    {
        return $business->isOwnedBy($user) && $user->can(PermissionName::PaymentsSimulateInject->value);
    }

    public function ingestWebhook(User $user, Business $business): bool
    {
        return $business->isOwnedBy($user) && $user->can(PermissionName::PaymentsSimulateInject->value);
    }

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
