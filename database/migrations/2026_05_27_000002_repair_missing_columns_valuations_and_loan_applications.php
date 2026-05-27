<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Idempotent repair migration.
 *
 * Two earlier migrations were recorded as "Ran" in the migrations table but
 * their ALTER TABLE statements were never fully applied to Supabase:
 *
 *   - 2026_05_25_100000_add_v1_fields_to_valuations_and_loan_applications
 *     → valuations: shap_integrity_passed, horizon_reliability_warning,
 *                   horizon_reliability_message, external_valuation_id
 *
 *   - 2026_05_26_000002_add_decision_fields_to_loan_applications
 *     → loan_applications: rejection_reason_code, officer_notes
 *
 * Every column addition is guarded by Schema::hasColumn() so this migration
 * is safe to run regardless of the current schema state.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('valuations', function (Blueprint $table) {
            if (! Schema::hasColumn('valuations', 'shap_integrity_passed')) {
                $table->boolean('shap_integrity_passed')->nullable();
            }
            if (! Schema::hasColumn('valuations', 'horizon_reliability_warning')) {
                $table->boolean('horizon_reliability_warning')->default(false);
            }
            if (! Schema::hasColumn('valuations', 'horizon_reliability_message')) {
                $table->text('horizon_reliability_message')->nullable();
            }
            if (! Schema::hasColumn('valuations', 'external_valuation_id')) {
                $table->unsignedBigInteger('external_valuation_id')->nullable();
            }
        });

        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'rejection_reason_code')) {
                $table->string('rejection_reason_code', 64)->nullable();
            }
            if (! Schema::hasColumn('loan_applications', 'officer_notes')) {
                $table->text('officer_notes')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            foreach (['officer_notes', 'rejection_reason_code'] as $col) {
                if (Schema::hasColumn('loan_applications', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('valuations', function (Blueprint $table) {
            foreach (['external_valuation_id', 'horizon_reliability_message', 'horizon_reliability_warning', 'shap_integrity_passed'] as $col) {
                if (Schema::hasColumn('valuations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
