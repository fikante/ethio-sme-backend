<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Data\TokenPairData;
use App\Domain\Auth\Enums\TokenAbility;
use App\Domain\Auth\Support\JwtTokenIssuer;
use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;
use Tymon\JWTAuth\Facades\JWTAuth;

class RefreshTokensAction
{
    public function __construct(private readonly JwtTokenIssuer $issuer) {}

    public function execute(string $refreshToken): TokenPairData
    {
        return DB::transaction(function () use ($refreshToken) {
            try {
                $payload = JWTAuth::setToken($refreshToken)->getPayload();
            } catch (\Throwable) {
                throw new AuthenticationException('Invalid refresh token');
            }

            if (($payload->get('ability') ?? null) !== TokenAbility::Refresh->value) {
                throw new AuthenticationException('Token is not a refresh token');
            }

            $familyId = $payload->get('family');
            $jti = $payload->get('jti');
            $userId = $payload->get('sub');

            /** @var RefreshTokenFamily|null $family */
            $family = RefreshTokenFamily::query()
                ->where('family_id', $familyId)
                ->lockForUpdate()
                ->first();

            if ($family === null || $family->revoked) {
                throw new AuthenticationException('Refresh token family is revoked');
            }

            if ($family->current_jti !== $jti) {
                $family->update(['revoked' => true, 'revoked_at' => now()]);
                throw new AuthenticationException('Refresh token reuse detected; family revoked');
            }

            /** @var User|null $user */
            $user = User::find($userId);
            if ($user === null) {
                throw new AuthenticationException('User no longer exists');
            }

            return $this->issuer->rotate($user, $family);
        });
    }
}
