<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('loan_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->decimal('requested_amount', 15, 2);
            $table->integer('requested_tenure_months');
            $table->enum('status', [
                'draft',
                'pending_psychometric',
                'pending_data_sync',
                'queued_for_ai',
                'processing',
                'approved',
                'rejected',
                'withdrawn',
            ])->default('draft');

            // AI output fields (populated after evaluation)
            $table->decimal('npv_credit_limit', 15, 2)->nullable();
            $table->decimal('ai_risk_score', 5, 4)->nullable();    // XGBoost score 0–1
            $table->decimal('effective_discount_rate', 5, 4)->nullable();
            $table->json('p10_cashflow_forecast')->nullable();     // array from DeepAR
            $table->json('p50_cashflow_forecast')->nullable();
            $table->json('p90_cashflow_forecast')->nullable();
            $table->json('shap_values')->nullable();               // feature contributions
            $table->json('reason_codes')->nullable();              // NBE adverse action codes
            $table->decimal('apr', 5, 4)->nullable();              // Annual Percentage Rate

            // Adverse action compliance
            $table->text('rejection_narrative')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'ai_risk_score']);
            $table->index('business_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loan_applications');
    }
};
