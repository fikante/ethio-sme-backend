<?php

namespace App\Domain\Auth\Enums;

enum RoleName: string
{
    case SmeOwner = 'sme_owner';
    case LoanProvider = 'loan_provider';
    case SuperAdmin = 'super_admin';

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }

    /** Role names that identify a loan provider user (current + legacy Spatie names). */
    public static function loanProviderRoleNames(): array
    {
        return [
            self::LoanProvider->value,
            'loan_officer',
            'loan-provider',
        ];
    }
}
