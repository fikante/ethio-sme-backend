<?php

namespace App\Domain\Auth\Actions;

use App\Models\RefreshTokenFamily;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RevokeTokensAction
{
    public function execute(User $user, ?string $familyId = null): int
    {
        return DB::transaction(function () use ($user, $familyId): int {
            $query = RefreshTokenFamily::query()
                ->where('user_id', $user->id)
                ->where('revoked', false);

            if ($familyId !== null) {
                $query->where('family_id', $familyId);
            }

            $count = $query->update([
                'revoked' => true,
                'revoked_at' => now(),
            ]);

            try {
                Auth::guard('api')->logout();
            } catch (\Throwable) {
            }

            return $count;
        });
    }
}
