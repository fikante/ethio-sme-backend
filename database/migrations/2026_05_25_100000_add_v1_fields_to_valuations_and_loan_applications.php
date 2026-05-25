<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('valuations', function (Blueprint $table) {
            if (! Schema::hasColumn('valuations', 'forecaster_mode')) {
                $table->string('forecaster_mode', 32)->nullable()->after('status');
            }
            if (! Schema::hasColumn('valuations', 'contract_version')) {
                $table->string('contract_version', 8)->nullable()->after('forecaster_mode');
            }
            if (! Schema::hasColumn('valuations', 'feature_snapshot_hash')) {
                $table->string('feature_snapshot_hash', 128)->nullable()->after('model_versions');
            }
            if (! Schema::hasColumn('valuations', 'shap_integrity_passed')) {
                $table->boolean('shap_integrity_passed')->nullable()->after('feature_snapshot_hash');
            }
            if (! Schema::hasColumn('valuations', 'horizon_reliability_warning')) {
                $table->boolean('horizon_reliability_warning')->default(false)->after('shap_integrity_passed');
            }
            if (! Schema::hasColumn('valuations', 'horizon_reliability_message')) {
                $table->text('horizon_reliability_message')->nullable()->after('horizon_reliability_warning');
            }
            if (! Schema::hasColumn('valuations', 'reason_codes')) {
                $table->json('reason_codes')->nullable()->after('apr');
            }
            if (! Schema::hasColumn('valuations', 'shap_values')) {
                $table->json('shap_values')->nullable()->after('reason_codes');
            }
            if (! Schema::hasColumn('valuations', 'prob_default')) {
                $table->decimal('prob_default', 6, 4)->nullable()->after('xgboost_class');
            }
            if (! Schema::hasColumn('valuations', 'horizon_days')) {
                $table->unsignedSmallInteger('horizon_days')->nullable()->after('prob_default');
            }
            if (! Schema::hasColumn('valuations', 'cashflow_haircut')) {
                $table->decimal('cashflow_haircut', 5, 4)->nullable()->after('horizon_days');
            }
            if (! Schema::hasColumn('valuations', 'dscr_p10')) {
                $table->decimal('dscr_p10', 8, 4)->nullable()->after('cashflow_haircut');
            }
            if (! Schema::hasColumn('valuations', 'external_valuation_id')) {
                $table->unsignedBigInteger('external_valuation_id')->nullable()->after('idempotency_key');
            }
        });

        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'valuation_id')) {
                $table->foreignId('valuation_id')->nullable()->after('idempotency_key')
                    ->constrained('valuations')->nullOnDelete();
            }
            if (! Schema::hasColumn('loan_applications', 'snapshot_limit_etb')) {
                $table->decimal('snapshot_limit_etb', 15, 2)->nullable()->after('npv_credit_limit');
            }
            if (! Schema::hasColumn('loan_applications', 'contract_version')) {
                $table->string('contract_version', 8)->nullable()->after('reason_codes');
            }
            if (! Schema::hasColumn('loan_applications', 'model_versions')) {
                $table->json('model_versions')->nullable()->after('contract_version');
            }
            if (! Schema::hasColumn('loan_applications', 'feature_snapshot_hash')) {
                $table->string('feature_snapshot_hash', 128)->nullable()->after('model_versions');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            foreach (['valuation_id', 'snapshot_limit_etb', 'contract_version', 'model_versions', 'feature_snapshot_hash'] as $col) {
                if (Schema::hasColumn('loan_applications', $col)) {
                    if ($col === 'valuation_id') {
                        $table->dropConstrainedForeignId('valuation_id');
                    } else {
                        $table->dropColumn($col);
                    }
                }
            }
        });

        Schema::table('valuations', function (Blueprint $table) {
            foreach ([
                'forecaster_mode', 'contract_version', 'feature_snapshot_hash', 'shap_integrity_passed',
                'horizon_reliability_warning', 'horizon_reliability_message', 'reason_codes', 'shap_values',
                'prob_default', 'horizon_days', 'cashflow_haircut', 'dscr_p10', 'external_valuation_id',
            ] as $col) {
                if (Schema::hasColumn('valuations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
