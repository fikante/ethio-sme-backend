<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('valuations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->foreignId('loan_application_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 32)->default('pending');

            $table->json('model_versions')->nullable();
            $table->json('p10_series')->nullable();
            $table->json('p50_series')->nullable();
            $table->json('p90_series')->nullable();

            $table->decimal('xgboost_score', 6, 4)->nullable();
            $table->string('xgboost_class', 32)->nullable();

            $table->decimal('npv_etb', 18, 2)->nullable();
            $table->decimal('mapped_limit_etb', 18, 2)->nullable();
            $table->decimal('effective_discount_rate', 6, 4)->nullable();
            $table->decimal('apr', 6, 4)->nullable();

            $table->string('idempotency_key')->nullable();
            $table->timestamp('inferred_at')->nullable();
            $table->string('error_code', 64)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->unique(['business_id', 'idempotency_key'], 'valuations_business_idem_unique');
            $table->index(['business_id', 'inferred_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('valuations');
    }
};
