<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    /**
     * Unify loan_officer and loan-provider Spatie roles under loan_provider.
     */
    public function up(): void
    {
        foreach (['web', 'api'] as $guard) {
            $target = Role::firstOrCreate([
                'name' => 'loan_provider',
                'guard_name' => $guard,
            ]);

            foreach (['loan_officer', 'loan-provider'] as $legacyName) {
                $legacy = Role::query()
                    ->where('name', $legacyName)
                    ->where('guard_name', $guard)
                    ->first();

                if ($legacy === null || $legacy->id === $target->id) {
                    continue;
                }

                DB::table('model_has_roles')
                    ->where('role_id', $legacy->id)
                    ->update(['role_id' => $target->id]);
            }
        }
    }

    public function down(): void
    {
        // Roles are not split back on rollback.
    }
};
