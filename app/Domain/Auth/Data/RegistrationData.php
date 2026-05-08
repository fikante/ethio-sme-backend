<?php

namespace App\Domain\Auth\Data;

use App\Domain\Auth\Enums\RoleName;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class RegistrationData extends Data
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
        public readonly string $password,
        public readonly RoleName $role,
        public readonly ?string $userAgent = null,
        public readonly ?string $ipAddress = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        $role = (string) $request->input('role');
        $normalised = match ($role) {
            'sme-owner', 'sme_owner' => RoleName::SmeOwner,
            'loan-provider', 'loan_officer' => RoleName::LoanOfficer,
            'super-admin', 'super_admin' => RoleName::SuperAdmin,
            default => RoleName::SmeOwner,
        };

        return new self(
            name: (string) $request->input('name'),
            email: (string) $request->input('email'),
            password: (string) $request->input('password'),
            role: $normalised,
            userAgent: $request->userAgent(),
            ipAddress: $request->ip(),
        );
    }
}
