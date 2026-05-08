<?php

namespace App\Domain\Auth\Data;

use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class CredentialsData extends Data
{
    public function __construct(
        public readonly string $email,
        public readonly string $password,
        public readonly ?string $userAgent = null,
        public readonly ?string $ipAddress = null,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return new self(
            email: (string) $request->input('email'),
            password: (string) $request->input('password'),
            userAgent: $request->userAgent(),
            ipAddress: $request->ip(),
        );
    }
}
