<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->after('status');
                $table->unique(['business_id', 'idempotency_key'], 'loan_apps_business_idem_unique');
            }

            if (! Schema::hasColumn('loan_applications', 'snapshot_risk_score')) {
                $table->decimal('snapshot_risk_score', 5, 4)->nullable()->after('ai_risk_score');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'idempotency_key')) {
                $table->dropUnique('loan_apps_business_idem_unique');
                $table->dropColumn('idempotency_key');
            }

            if (Schema::hasColumn('loan_applications', 'snapshot_risk_score')) {
                $table->dropColumn('snapshot_risk_score');
            }
        });
    }
};
