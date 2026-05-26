<?php

namespace App\Http\Controllers\Web;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Dashboard\Services\DashboardStatsService;
use App\Http\Controllers\Controller;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        /** @var User $user */
        $user = auth()->user();
        $role = DashboardStatsService::resolveRole($user);
        $stats = DashboardStatsService::getForRole($user);

        $props = [
            'role' => $role,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'stats' => $stats,
        ];

        // Pass analytics as a top-level prop for loan providers so the
        // Dashboard component can access chart data without an extra request.
        if ($role === RoleName::LoanProvider->value) {
            $props['analytics'] = $stats['analytics'] ?? [];
        }

        return Inertia::render('Dashboard', $props);
    }
}
