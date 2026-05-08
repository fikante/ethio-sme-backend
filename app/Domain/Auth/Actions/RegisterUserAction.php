<?php

namespace App\Domain\Auth\Actions;

use App\Domain\Auth\Data\RegistrationData;
use App\Domain\Auth\Support\JwtTokenIssuer;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class RegisterUserAction
{
    public function __construct(private readonly JwtTokenIssuer $issuer) {}

    public function execute(RegistrationData $data): array
    {
        return DB::transaction(function () use ($data): array {
            $user = User::create([
                'name' => $data->name,
                'email' => $data->email,
                'password' => Hash::make($data->password),
            ]);

            $user->assignRole($data->role->value);

            $tokens = $this->issuer->issue($user, $data->userAgent, $data->ipAddress);

            return [
                'user' => $user->load('roles'),
                'tokens' => $tokens,
            ];
        });
    }
}
