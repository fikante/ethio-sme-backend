<?php

namespace App\Domain\Auth\Support;

use App\Domain\Auth\Enums\RoleName;
use App\Models\User;
use Illuminate\Support\Collection;

final class WebRoleAlias
{
    /** @var array<string, string> */
    private const CANONICAL_TO_ALIAS = [
        RoleName::SmeOwner->value => 'sme-owner',
        RoleName::LoanProvider->value => 'loan_provider',
        RoleName::SuperAdmin->value => 'super-admin',
    ];

    public static function aliasFor(string $role): string
    {
        if (in_array($role, RoleName::loanProviderRoleNames(), true)) {
            return RoleName::LoanProvider->value;
        }

        return self::CANONICAL_TO_ALIAS[$role] ?? $role;
    }

    public static function isLoanProviderRole(string $role): bool
    {
        return in_array($role, RoleName::loanProviderRoleNames(), true);
    }

    /** @return list<string> */
    public static function middlewareRoleList(string ...$roles): array
    {
        $expanded = [];
        foreach ($roles as $role) {
            $expanded[] = $role;
            if (isset(self::CANONICAL_TO_ALIAS[$role])) {
                $expanded[] = self::CANONICAL_TO_ALIAS[$role];
            }
            foreach (self::CANONICAL_TO_ALIAS as $canonical => $alias) {
                if ($alias === $role) {
                    $expanded[] = $canonical;
                }
            }
            if (self::isLoanProviderRole($role)) {
                $expanded = array_merge($expanded, RoleName::loanProviderRoleNames());
            }
        }

        return array_values(array_unique($expanded));
    }

    /** @return Collection<int, string> */
    public static function namesForFrontend(User $user): Collection
    {
        return $user->getRoleNames()
            ->map(fn (string $name) => self::aliasFor($name))
            ->unique()
            ->values();
    }

    public static function registrationRoleName(RoleName $role): string
    {
        return self::aliasFor($role->value);
    }
}
