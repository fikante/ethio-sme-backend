<?php

namespace App\Domain\Auth\Support;

use App\Domain\Auth\Data\TokenPairData;
use App\Domain\Auth\Enums\TokenAbility;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Support\Str;
use Tymon\JWTAuth\Facades\JWTAuth;

/**
 * Issues short-lived access tokens and rotating refresh tokens.
 * Refresh family lifecycle is persisted in the refresh_token_families table
 * so reuse of an old refresh token can be detected and the family revoked.
 */
class JwtTokenIssuer
{
    public function issue(User $user, ?string $userAgent = null, ?string $ipAddress = null): TokenPairData
    {
        $familyId = (string) Str::uuid();
        $refreshJti = (string) Str::uuid();

        $family = RefreshTokenFamily::create([
            'user_id' => $user->id,
            'family_id' => $familyId,
            'current_jti' => $refreshJti,
            'revoked' => false,
            'issued_at' => now(),
            'user_agent' => $userAgent,
            'ip_address' => $ipAddress,
        ]);

        return new TokenPairData(
            accessToken: $this->mintAccess($user),
            refreshToken: $this->mintRefresh($user, $family, $refreshJti),
            accessExpiresIn: $this->accessTtlSeconds(),
            refreshExpiresIn: $this->refreshTtlSeconds(),
        );
    }

    public function rotate(User $user, RefreshTokenFamily $family): TokenPairData
    {
        $refreshJti = (string) Str::uuid();

        $family->update([
            'current_jti' => $refreshJti,
            'rotated_at' => now(),
        ]);

        return new TokenPairData(
            accessToken: $this->mintAccess($user),
            refreshToken: $this->mintRefresh($user, $family, $refreshJti),
            accessExpiresIn: $this->accessTtlSeconds(),
            refreshExpiresIn: $this->refreshTtlSeconds(),
        );
    }

    public function accessTtlSeconds(): int
    {
        return ((int) config('jwt.ttl', 15)) * 60;
    }

    public function refreshTtlSeconds(): int
    {
        return ((int) config('jwt.refresh_ttl', 60 * 24 * 14)) * 60;
    }

    private function mintAccess(User $user): string
    {
        return JWTAuth::claims([
            'aud' => config('app.url'),
            'ability' => TokenAbility::Access->value,
        ])->fromUser($user);
    }

    private function mintRefresh(User $user, RefreshTokenFamily $family, string $jti): string
    {
        return JWTAuth::claims([
            'aud' => config('app.url'),
            'ability' => TokenAbility::Refresh->value,
            'family' => $family->family_id,
            'jti' => $jti,
        ])->setTTL((int) config('jwt.refresh_ttl', 60 * 24 * 14))
            ->fromUser($user);
    }
}
