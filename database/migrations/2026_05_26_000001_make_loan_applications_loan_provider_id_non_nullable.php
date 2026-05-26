<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Ensure at least one loan provider exists
        $providerId = DB::table('loan_providers')->orderBy('id')->value('id');

        if ($providerId === null) {
            $providerId = DB::table('loan_providers')->insertGetId([
                'uuid' => \Illuminate\Support\Str::uuid()->toString(),
                'name' => 'Commercial Bank of Ethiopia',
                'short_code' => 'CBE',
                'type' => 'commercial_bank',
                'nbe_license_no' => 'CBE-LIC-001',
                'contact_email' => 'sme@combanketh.et',
                'base_interest_rate' => 0.1500,
                'accepted_risk_bands' => json_encode(['low', 'medium']),
                'min_loan_amount_etb' => 50000,
                'max_loan_amount_etb' => 5000000,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Backfill any NULL loan_provider_id rows
        DB::table('loan_applications')
            ->whereNull('loan_provider_id')
            ->update(['loan_provider_id' => $providerId]);

        // 3. Alter the column to NOT NULL (PostgreSQL syntax)
        DB::statement('ALTER TABLE loan_applications ALTER COLUMN loan_provider_id SET NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE loan_applications ALTER COLUMN loan_provider_id DROP NOT NULL');
    }
};
