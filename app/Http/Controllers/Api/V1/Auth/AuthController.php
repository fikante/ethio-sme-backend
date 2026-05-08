<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Domain\Auth\Actions\IssueTokensAction;
use App\Domain\Auth\Actions\RefreshTokensAction;
use App\Domain\Auth\Actions\RegisterUserAction;
use App\Domain\Auth\Actions\RevokeTokensAction;
use App\Domain\Auth\Data\CredentialsData;
use App\Domain\Auth\Data\RegistrationData;
use App\Domain\Auth\Requests\LoginRequest;
use App\Domain\Auth\Requests\RefreshTokenRequest;
use App\Domain\Auth\Requests\RegisterRequest;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, RegisterUserAction $action): JsonResponse
    {
        $result = $action->execute(RegistrationData::fromRequest($request));

        return response()->json([
            'user' => $result['user'],
            ...$result['tokens']->toArray(),
        ], 201);
    }

    public function login(LoginRequest $request, IssueTokensAction $action): JsonResponse
    {
        $tokens = $action->execute(CredentialsData::fromRequest($request));

        return response()->json($tokens->toArray());
    }

    public function refresh(RefreshTokenRequest $request, RefreshTokensAction $action): JsonResponse
    {
        $tokens = $action->execute((string) $request->input('refresh_token'));

        return response()->json($tokens->toArray());
    }

    public function logout(Request $request, RevokeTokensAction $action): JsonResponse
    {
        $count = $action->execute($request->user());

        return response()->json([
            'message' => 'Successfully logged out',
            'revoked_families' => $count,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('roles'));
    }
}
