<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\PermissionName;
use App\Domain\Auth\Enums\RoleName;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Seeds the canonical permission catalog from PRD §14.4 and the three
     * production roles from §5. Also seeds backward-compatible aliases
     * used by the legacy web (Inertia) layer.
     */
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionName::values() as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'api']);
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        $rolePermissions = [
            RoleName::SmeOwner->value => [
                PermissionName::AuthLogout->value,
                PermissionName::BusinessesSelfManage->value,
                PermissionName::PsychometricSubmit->value,
                PermissionName::PaymentsSimulateInject->value,
                PermissionName::ApplicationsSelfRead->value,
                PermissionName::ValuationsRun->value,
                PermissionName::ValuationsRead->value,
                PermissionName::ConsentsManage->value,
                PermissionName::PrivacyErasureRequest->value,
            ],
            RoleName::LoanOfficer->value => [
                PermissionName::AuthLogout->value,
                PermissionName::ApplicationsPipelineView->value,
                PermissionName::ApplicationsDetailView->value,
                PermissionName::ApplicationsDecide->value,
                PermissionName::ApplicationsRejectWithReason->value,
                PermissionName::ValuationsRun->value,
                PermissionName::ValuationsRead->value,
                PermissionName::FairnessAuditRead->value,
                PermissionName::DriftMetricsRead->value,
            ],
            RoleName::SuperAdmin->value => PermissionName::values(),
        ];

        foreach (['api', 'web'] as $guard) {
            foreach ($rolePermissions as $roleName => $permissions) {
                $role = Role::firstOrCreate(['name' => $roleName, 'guard_name' => $guard]);
                $role->syncPermissions(
                    Permission::query()
                        ->whereIn('name', $permissions)
                        ->where('guard_name', $guard)
                        ->get()
                );
            }
        }

        $aliases = [
            'sme-owner' => RoleName::SmeOwner->value,
            'loan-provider' => RoleName::LoanOfficer->value,
            'super-admin' => RoleName::SuperAdmin->value,
        ];

        foreach (['api', 'web'] as $guard) {
            foreach ($aliases as $alias => $canonical) {
                $aliasRole = Role::firstOrCreate(['name' => $alias, 'guard_name' => $guard]);
                $canonicalRole = Role::query()->where(['name' => $canonical, 'guard_name' => $guard])->firstOrFail();
                $aliasRole->syncPermissions($canonicalRole->permissions);
            }
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
