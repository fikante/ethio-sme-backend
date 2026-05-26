<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'rejection_reason_code')) {
                $table->string('rejection_reason_code', 64)->nullable()->after('rejection_narrative');
            }
            if (! Schema::hasColumn('loan_applications', 'officer_notes')) {
                $table->text('officer_notes')->nullable()->after('rejection_reason_code');
            }
        });
    }

    public function down(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'officer_notes')) {
                $table->dropColumn('officer_notes');
            }
            if (Schema::hasColumn('loan_applications', 'rejection_reason_code')) {
                $table->dropColumn('rejection_reason_code');
            }
        });
    }
};
