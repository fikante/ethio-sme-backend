<?php

namespace App\Domain\Lending\Policies;

use App\Domain\Auth\Enums\PermissionName;
use App\Domain\Auth\Enums\RoleName;
use App\Models\LoanApplication;
use App\Models\User;

class LoanApplicationPolicy
{
    public function viewPipeline(User $user): bool
    {
        return $user->can(PermissionName::ApplicationsPipelineView->value);
    }

    public function viewSelf(User $user): bool
    {
        return $user->can(PermissionName::ApplicationsSelfRead->value);
    }

    public function view(User $user, LoanApplication $application): bool
    {
        if ($user->hasAnyRole([RoleName::LoanOfficer->value, RoleName::SuperAdmin->value])
            && $user->can(PermissionName::ApplicationsDetailView->value)
        ) {
            return true;
        }

        return $user->can(PermissionName::ApplicationsSelfRead->value)
            && $application->business?->isOwnedBy($user);
    }

    public function create(User $user): bool
    {
        return $user->can(PermissionName::BusinessesSelfManage->value);
    }

    public function decide(User $user, LoanApplication $application): bool
    {
        return $user->can(PermissionName::ApplicationsDecide->value) && ! $application->isTerminal();
    }

    public function rejectWithReason(User $user, LoanApplication $application): bool
    {
        return $user->can(PermissionName::ApplicationsRejectWithReason->value) && ! $application->isTerminal();
    }
}
