<?php

namespace App\Domain\Auth\Enums;

enum RoleName: string
{
    case SmeOwner = 'sme_owner';
    case LoanOfficer = 'loan_officer';
    case SuperAdmin = 'super_admin';

    public static function values(): array
    {
        return array_map(fn (self $case) => $case->value, self::cases());
    }
}
