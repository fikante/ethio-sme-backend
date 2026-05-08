<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Data\CredentialsData;
use App\Domain\Auth\Data\TokenPairData;
use App\Domain\Auth\Support\JwtTokenIssuer;
use App\Models\User;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IssueTokensAction
{
    public function __construct(private readonly JwtTokenIssuer $issuer) {}

    public function execute(CredentialsData $credentials): TokenPairData
    {
        return DB::transaction(function () use ($credentials) {
            $authenticated = Auth::guard('api')->attempt([
                'email' => $credentials->email,
                'password' => $credentials->password,
            ]);

            if (! $authenticated) {
                throw new AuthenticationException('Invalid credentials');
            }

            /** @var User $user */
            $user = Auth::guard('api')->user();

            return $this->issuer->issue($user, $credentials->userAgent, $credentials->ipAddress);
        });
    }
}
