<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'view applications',
            'create applications',
            'evaluate applications',
            'decide applications',
            'view own applications',
            'submit psychometric',
            'trigger simulation',
            'manage exogenous factors',
            'view fairness metrics',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        Role::firstOrCreate(['name' => 'sme_owner'])->syncPermissions([
            'view own applications',
            'create applications',
            'submit psychometric',
            'trigger simulation',
        ]);

        Role::firstOrCreate(['name' => 'loan_officer'])->syncPermissions([
            'view applications',
            'evaluate applications',
            'decide applications',
        ]);

        Role::firstOrCreate(['name' => 'super_admin'])->syncPermissions($permissions);
    }
}

