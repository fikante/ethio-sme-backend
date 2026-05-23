<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const STATUSES = [
        'draft',
        'submitted',
        'pending_psychometric',
        'pending_data_sync',
        'queued_for_ai',
        'processing',
        'evaluated',
        'approved',
        'rejected',
        'withdrawn',
    ];

    public function up(): void
    {
        Schema::table('loan_applications', function (Blueprint $table) {
            if (! Schema::hasColumn('loan_applications', 'ai_risk_band')) {
                $table->string('ai_risk_band')->nullable()->after('ai_risk_score');
            }

            if (! Schema::hasColumn('loan_applications', 'prob_default')) {
                $table->decimal('prob_default', 5, 4)->nullable()->after('ai_risk_band');
            }
        });

        $this->replaceStatusCheck(self::STATUSES);
    }

    public function down(): void
    {
        DB::table('loan_applications')
            ->whereIn('status', ['submitted', 'evaluated'])
            ->update(['status' => 'processing']);

        Schema::table('loan_applications', function (Blueprint $table) {
            if (Schema::hasColumn('loan_applications', 'prob_default')) {
                $table->dropColumn('prob_default');
            }

            if (Schema::hasColumn('loan_applications', 'ai_risk_band')) {
                $table->dropColumn('ai_risk_band');
            }
        });

        $this->replaceStatusCheck([
            'draft',
            'pending_psychometric',
            'pending_data_sync',
            'queued_for_ai',
            'processing',
            'approved',
            'rejected',
            'withdrawn',
        ]);
    }

    /**
     * @param  list<string>  $statuses
     */
    private function replaceStatusCheck(array $statuses): void
    {
        DB::statement('ALTER TABLE loan_applications DROP CONSTRAINT IF EXISTS loan_applications_status_check');

        $allowed = implode(', ', array_map(
            static fn (string $status) => "'".str_replace("'", "''", $status)."'",
            $statuses,
        ));

        DB::statement("ALTER TABLE loan_applications ADD CONSTRAINT loan_applications_status_check CHECK (status::text = ANY (ARRAY[{$allowed}]::text[]))");
    }
};
