<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent repair migration.
 *
 * The migration `2026_05_25_100000_add_extended_columns_to_businesses_table`
 * added `tin_number` and `trade_license_no` as nullable columns, but Supabase
 * has both with a NOT NULL constraint, causing 23502 violations when the loan
 * application form omits those optional fields.
 *
 * This migration drops the NOT NULL constraint only when it is present,
 * so it is safe to run regardless of the current schema state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('businesses', 'tin_number')) {
            DB::statement('ALTER TABLE businesses ALTER COLUMN tin_number DROP NOT NULL');
        }

        if (Schema::hasColumn('businesses', 'trade_license_no')) {
            DB::statement('ALTER TABLE businesses ALTER COLUMN trade_license_no DROP NOT NULL');
        }
    }

    public function down(): void
    {
        // We do not restore NOT NULL on rollback — restoring it could break
        // existing rows that have NULL values.
    }
};
