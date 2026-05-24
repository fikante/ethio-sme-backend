<?php

namespace App\Http\Controllers\Web\Admin;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Auth\Support\WebRoleAlias;
use App\Http\Controllers\Controller;
use App\Mail\WelcomeUserMail;
use App\Models\Business;
use App\Models\LoanProvider;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserManagementController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::query()
            ->with(['roles', 'loanProvider:id,name,short_code'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $this->displayRole($user),
                'role_value' => $this->canonicalRoleValue($user),
                'loan_provider_id' => $user->loan_provider_id,
                'loan_provider' => $user->loanProvider ? [
                    'id' => $user->loanProvider->id,
                    'name' => $user->loanProvider->name,
                    'short_code' => $user->loanProvider->short_code,
                ] : null,
                'created_at' => $user->created_at?->toDateTimeString(),
            ]);

        $roleCounts = $users->groupBy('role_value')->map->count();

        return Inertia::render('Admin/Users', [
            'users' => $users->values()->all(),
            'loanProviders' => LoanProvider::query()
                ->where('status', 'active')
                ->orderBy('name')
                ->get(['id', 'name', 'short_code'])
                ->map(fn (LoanProvider $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'short_code' => $p->short_code,
                    'label' => $p->short_code.' · '.$p->name,
                ])
                ->values()
                ->all(),
            'roleOptions' => $this->roleOptions(),
            'stats' => [
                'total' => $users->count(),
                'sme_owners' => $roleCounts[RoleName::SmeOwner->value] ?? 0,
                'loan_provider_users' => $roleCounts[RoleName::LoanProvider->value] ?? 0,
                'super_admins' => $roleCounts[RoleName::SuperAdmin->value] ?? 0,
                'partner_institutions' => LoanProvider::query()->count(),
            ],
            'currentUserId' => $request->user()->id,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $rules = [
            'role' => ['required', Rule::in(['sme_owner', 'loan_officer', 'super_admin'])],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ];

        if ($request->role === 'sme_owner') {
            $rules = array_merge($rules, [
                'phone' => ['nullable', 'string', 'max:30'],
                'business_name' => ['required', 'string', 'max:255'],
                'sector' => ['required', 'string'],
                'sub_city' => ['required', 'string'],
                'established_year' => ['required', 'integer', 'min:1990', 'max:'.date('Y')],
            ]);
        }

        if ($request->role === 'loan_officer') {
            $rules = array_merge($rules, [
                'loan_provider_id' => ['required', 'exists:loan_providers,id'],
                'employee_id' => ['nullable', 'string', 'max:64'],
            ]);
        }

        if ($request->role === 'super_admin') {
            $rules = array_merge($rules, [
                'admin_code' => [
                    'required',
                    'string',
                    function ($attribute, $value, $fail) {
                        if ($value !== config('app.admin_creation_code')) {
                            $fail('Invalid admin authorization code.');
                        }
                    },
                ],
            ]);
        }

        $validated = $request->validate($rules);

        $plainPassword = $validated['password'];
        $canonicalRole = $this->canonicalRole($validated['role']);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $plainPassword,
            'loan_provider_id' => $canonicalRole === RoleName::LoanProvider->value
                ? ($validated['loan_provider_id'] ?? null)
                : null,
        ]);

        $this->syncUserRoles($user, $canonicalRole);

        if ($validated['role'] === 'sme_owner') {
            Business::create([
                'owner_id' => $user->id,
                'uuid' => (string) Str::uuid(),
                'business_name' => $validated['business_name'],
                'sector' => $validated['sector'],
                'sub_city' => $validated['sub_city'],
                'established_year' => $validated['established_year'],
                'status' => 'active',
                'data_source' => 'app',
                'tin_number' => 'PENDING-'.strtoupper(Str::random(6)),
            ]);
        }

        try {
            Mail::to($user->email)->send(
                new WelcomeUserMail($user, $plainPassword, $validated['role'])
            );
            $emailSent = true;
        } catch (\Exception $e) {
            Log::warning('Welcome email failed', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            $emailSent = false;
        }

        $message = $emailSent
            ? "User {$user->name} created and welcome email sent to {$user->email}."
            : "User {$user->name} created. Email delivery failed — share credentials manually.";

        return back()->with($emailSent ? 'success' : 'error', $message);
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role' => ['required', Rule::in($this->assignableRoles())],
            'loan_provider_id' => [
                'nullable',
                'integer',
                Rule::exists('loan_providers', 'id'),
                Rule::requiredIf(fn () => $this->canonicalRole($request->input('role')) === RoleName::LoanProvider->value),
            ],
        ]);

        $canonicalRole = $this->canonicalRole($validated['role']);

        $user->update([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'loan_provider_id' => $canonicalRole === RoleName::LoanProvider->value
                ? ($validated['loan_provider_id'] ?? null)
                : null,
        ]);

        if (! empty($validated['password'])) {
            $user->update(['password' => $validated['password']]);
        }

        $this->syncUserRoles($user, $canonicalRole);

        return back()->with('success', 'User updated successfully.');
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $user->delete();

        return back()->with('success', 'User deleted successfully.');
    }

    private function syncUserRoles(User $user, string $canonicalRole): void
    {
        $roles = array_map(
            fn (string $guard) => Role::findByName($canonicalRole, $guard),
            ['web', 'api'],
        );

        $user->syncRoles($roles);
    }

    private function canonicalRole(string $role): string
    {
        return match ($role) {
            'sme-owner', RoleName::SmeOwner->value, 'sme_owner' => RoleName::SmeOwner->value,
            'loan-provider', 'loan_officer', 'loan_provider', RoleName::LoanProvider->value => RoleName::LoanProvider->value,
            'super-admin', RoleName::SuperAdmin->value, 'super_admin' => RoleName::SuperAdmin->value,
            default => $role,
        };
    }

    private function displayRole(User $user): string
    {
        $name = $user->getRoleNames()->first();

        return match ($name) {
            RoleName::SmeOwner->value => 'SME Owner',
            RoleName::LoanProvider->value, 'loan_officer', 'loan-provider' => 'Loan Provider',
            RoleName::SuperAdmin->value => 'Super Admin',
            default => $name ? WebRoleAlias::aliasFor($name) : 'No role',
        };
    }

    private function canonicalRoleValue(User $user): string
    {
        $name = $user->getRoleNames()->first();

        return match ($name) {
            RoleName::SmeOwner->value, 'sme-owner' => RoleName::SmeOwner->value,
            RoleName::LoanProvider->value, 'loan-provider', 'loan_officer' => RoleName::LoanProvider->value,
            RoleName::SuperAdmin->value, 'super-admin' => RoleName::SuperAdmin->value,
            default => RoleName::SmeOwner->value,
        };
    }

    /** @return list<array{value: string, label: string}> */
    private function roleOptions(): array
    {
        return [
            ['value' => RoleName::SmeOwner->value, 'label' => 'SME Owner'],
            ['value' => RoleName::LoanProvider->value, 'label' => 'Loan Provider'],
            ['value' => RoleName::SuperAdmin->value, 'label' => 'Super Admin'],
        ];
    }

    /** @return list<string> */
    private function assignableRoles(): array
    {
        return [
            RoleName::SmeOwner->value,
            'sme-owner',
            'sme_owner',
            RoleName::LoanProvider->value,
            'loan-provider',
            'loan_officer',
            'loan_provider',
            RoleName::SuperAdmin->value,
            'super-admin',
            'super_admin',
        ];
    }
}
