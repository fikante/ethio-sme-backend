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
        $allowed = $this->isLoanProviderOrAdmin($user)
            || $user->can(PermissionName::ApplicationsPipelineView->value);

        // #region agent log
        @file_put_contents(base_path('.cursor/debug-054501.log'), json_encode([
            'sessionId' => '054501',
            'hypothesisId' => 'A',
            'location' => 'LoanApplicationPolicy::viewPipeline',
            'message' => 'pipeline auth check',
            'data' => [
                'userId' => $user->id,
                'roles' => $user->getRoleNames()->all(),
                'isLoanProvider' => $this->isLoanProviderOrAdmin($user),
                'canPermission' => $user->can(PermissionName::ApplicationsPipelineView->value),
                'allowed' => $allowed,
            ],
            'timestamp' => (int) round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        return $allowed;
    }

    public function viewSelf(User $user): bool
    {
        return $user->can(PermissionName::ApplicationsSelfRead->value);
    }

    public function view(User $user, LoanApplication $application): bool
    {
        if ($this->isLoanProviderOrAdmin($user)) {
            return true;
        }

        return $user->can(PermissionName::ApplicationsSelfRead->value)
            && $application->business?->isOwnedBy($user);
    }

    public function create(User $user): bool
    {
        return $user->can(PermissionName::BusinessesSelfManage->value);
    }

    public function evaluate(User $user, LoanApplication $application): bool
    {
        if (! $user->hasAnyRole(RoleName::loanProviderRoleNames())) {
            return false;
        }

        return in_array($application->status, [
            LoanApplication::STATUS_QUEUED_FOR_AI,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_PROCESSING,
        ], true);
    }

    public function decide(User $user, LoanApplication $application): bool
    {
        if (! $this->isLoanProviderOrAdmin($user)
            && ! $user->can(PermissionName::ApplicationsDecide->value)
        ) {
            return false;
        }

        return $application->status === LoanApplication::STATUS_EVALUATED;
    }

    public function rejectWithReason(User $user, LoanApplication $application): bool
    {
        if (! $this->isLoanProviderOrAdmin($user)
            && ! $user->can(PermissionName::ApplicationsRejectWithReason->value)
        ) {
            return false;
        }

        return ! $application->isTerminal();
    }

    private function isLoanProviderOrAdmin(User $user): bool
    {
        return $user->hasAnyRole([
            ...RoleName::loanProviderRoleNames(),
            RoleName::SuperAdmin->value,
            'super-admin',
        ]);
    }
}
