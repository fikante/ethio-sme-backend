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
        RoleName::LoanOfficer->value => 'loan-provider',
        RoleName::SuperAdmin->value => 'super-admin',
    ];

    public static function aliasFor(string $role): string
    {
        return self::CANONICAL_TO_ALIAS[$role] ?? $role;
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
