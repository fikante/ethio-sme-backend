<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('psychometric_assessments', function (Blueprint $table) {
            if (! Schema::hasColumn('psychometric_assessments', 'assessment_version')) {
                $table->string('assessment_version', 10)->default('v1')->after('raw_answers');
            }

            $table->decimal('delayed_gratification_score', 5, 4)
                ->default(0.0000)
                ->after('conscientiousness_score');

            $table->boolean('social_desirability_flagged')
                ->default(false)
                ->after('raw_answers');
        });

        if (Schema::hasColumn('psychometric_assessments', 'risk_tolerance_score')) {
            Schema::table('psychometric_assessments', function (Blueprint $table) {
                $table->renameColumn('risk_tolerance_score', 'financial_risk_score');
            });
        }

        DB::statement('ALTER TABLE psychometric_assessments DROP COLUMN IF EXISTS composite_score');
        DB::statement('
            ALTER TABLE psychometric_assessments
            ADD COLUMN composite_score DECIMAL(5,4) GENERATED ALWAYS AS (
                (integrity_score * 0.35)
                + (conscientiousness_score * 0.30)
                + (delayed_gratification_score * 0.20)
                + (financial_risk_score * 0.15)
            ) STORED
        ');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE psychometric_assessments DROP COLUMN IF EXISTS composite_score');
        DB::statement('
            ALTER TABLE psychometric_assessments
            ADD COLUMN composite_score DECIMAL(5,4) GENERATED ALWAYS AS (
                (integrity_score * 0.4)
                + (conscientiousness_score * 0.4)
                + (financial_risk_score * 0.2)
            ) STORED
        ');

        Schema::table('psychometric_assessments', function (Blueprint $table) {
            if (Schema::hasColumn('psychometric_assessments', 'financial_risk_score')) {
                $table->renameColumn('financial_risk_score', 'risk_tolerance_score');
            }

            $table->dropColumn(['delayed_gratification_score', 'social_desirability_flagged']);
        });
    }
};
