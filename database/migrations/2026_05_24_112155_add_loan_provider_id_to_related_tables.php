<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('loan_provider_id')->nullable()->after('remember_token');
        });
        DB::statement('CREATE INDEX idx_users_loan_provider_id ON users (loan_provider_id)');

        Schema::table('loan_applications', function (Blueprint $table) {
            $table->unsignedBigInteger('loan_provider_id')->nullable()->after('reviewed_by');
        });
        DB::statement('CREATE INDEX idx_loan_app_provider_id ON loan_applications (loan_provider_id)');

        if (Schema::hasTable('sme_loan_history')) {
            Schema::table('sme_loan_history', function (Blueprint $table) {
                $table->unsignedBigInteger('loan_provider_id')->nullable()->after('source_bank');
            });
            DB::statement('CREATE INDEX idx_loan_history_provider_id ON sme_loan_history (loan_provider_id)');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('sme_loan_history')) {
            DB::statement('DROP INDEX IF EXISTS idx_loan_history_provider_id');
            Schema::table('sme_loan_history', function (Blueprint $table) {
                $table->dropColumn('loan_provider_id');
            });
        }

        DB::statement('DROP INDEX IF EXISTS idx_loan_app_provider_id');
        Schema::table('loan_applications', function (Blueprint $table) {
            $table->dropColumn('loan_provider_id');
        });

        DB::statement('DROP INDEX IF EXISTS idx_users_loan_provider_id');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('loan_provider_id');
        });
    }
};
