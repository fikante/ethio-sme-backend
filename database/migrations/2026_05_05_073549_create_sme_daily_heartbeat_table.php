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
        Schema::create('sme_daily_heartbeat', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->date('heartbeat_date');
            $table->decimal('inflow_total', 15, 2)->default(0);
            $table->decimal('outflow_total', 15, 2)->default(0);
            $table->decimal('net_cashflow', 15, 2)->storedAs('inflow_total - outflow_total');
            $table->decimal('transaction_failure_rate', 5, 4)->default(0); // key SHAP feature
            $table->integer('transaction_count')->default(0);
            $table->boolean('is_payday')->default(false);   // end-of-month liquidity spike
            $table->boolean('is_holiday')->default(false);  // Meskel, Timkat etc.
            $table->decimal('mape_score', 8, 4)->nullable(); // for drift monitoring
            $table->timestamps();

            $table->unique(['business_id', 'heartbeat_date']);
            $table->index(['business_id', 'heartbeat_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sme_daily_heartbeat');
    }
};
