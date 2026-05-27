<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent repair migration.
 *
 * The migration `2026_05_24_112155_add_loan_provider_id_to_related_tables`
 * was recorded as "Ran" in the migrations table but its ALTER TABLE statements
 * were never actually applied to the Supabase database.  This migration adds
 * the two missing columns only when they are absent, so it is safe to run
 * regardless of the current schema state.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'loan_provider_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->unsignedBigInteger('loan_provider_id')->nullable();
            });
        }

        if (! Schema::hasColumn('loan_applications', 'loan_provider_id')) {
            Schema::table('loan_applications', function (Blueprint $table) {
                $table->unsignedBigInteger('loan_provider_id')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('loan_applications', 'loan_provider_id')) {
            Schema::table('loan_applications', function (Blueprint $table) {
                $table->dropColumn('loan_provider_id');
            });
        }

        if (Schema::hasColumn('users', 'loan_provider_id')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropColumn('loan_provider_id');
            });
        }
    }
};
