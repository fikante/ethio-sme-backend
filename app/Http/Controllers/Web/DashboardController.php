<?php

namespace App\Http\Controllers\Web;

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

        return Inertia::render('Dashboard', [
            'role' => $role,
            'user' => [
                'name' => $user->name,
                'email' => $user->email,
            ],
            'stats' => DashboardStatsService::getForRole($user),
        ]);
    }
}
