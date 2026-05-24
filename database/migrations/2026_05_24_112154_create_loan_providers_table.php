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
        Schema::create('loan_providers', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();

            // Identity
            $table->string('name');
            $table->string('short_code', 20)->unique();
            $table->string('type', 32)->default('commercial_bank');

            // Regulatory
            $table->string('nbe_license_no', 64)->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone', 30)->nullable();
            $table->string('website')->nullable();
            $table->text('address')->nullable();

            // Lending parameters — used to match SMEs to suitable providers
            $table->jsonb('accepted_risk_bands')->default('["low","medium"]');
            $table->decimal('min_loan_amount_etb', 15, 2)->default(5000);
            $table->decimal('max_loan_amount_etb', 15, 2)->default(5000000);
            $table->decimal('base_interest_rate', 5, 4)->default(0.1500);

            // Status
            $table->string('status', 20)->default('active');

            $table->string('logo_url')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        DB::statement('CREATE INDEX idx_loan_providers_short_code ON loan_providers (short_code)');
        DB::statement('CREATE INDEX idx_loan_providers_status ON loan_providers (status) WHERE deleted_at IS NULL');
        DB::statement('CREATE INDEX idx_loan_providers_type ON loan_providers (type)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_loan_providers_type');
        DB::statement('DROP INDEX IF EXISTS idx_loan_providers_status');
        DB::statement('DROP INDEX IF EXISTS idx_loan_providers_short_code');
        Schema::dropIfExists('loan_providers');
    }
};
