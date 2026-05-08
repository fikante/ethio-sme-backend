<?php

namespace App\Domain\Auth\Data;

use Spatie\LaravelData\Data;

class TokenPairData extends Data
{
    public function __construct(
        public readonly string $accessToken,
        public readonly string $refreshToken,
        public readonly int $accessExpiresIn,
        public readonly int $refreshExpiresIn,
        public readonly string $tokenType = 'bearer',
    ) {}

    public function toArray(): array
    {
        return [
            'access_token' => $this->accessToken,
            'refresh_token' => $this->refreshToken,
            'token_type' => $this->tokenType,
            'expires_in' => $this->accessExpiresIn,
            'refresh_expires_in' => $this->refreshExpiresIn,
        ];
    }
}
