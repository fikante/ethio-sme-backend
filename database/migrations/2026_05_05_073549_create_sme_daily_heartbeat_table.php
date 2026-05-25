<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sme_daily_heartbeat', function (Blueprint $table) {
            $table->id();
            $table->uuid('business_uuid');
            $table->date('transaction_date');
            $table->decimal('daily_total_inflow', 15, 2)->default(0);
            $table->decimal('daily_total_outflow', 15, 2)->default(0);
            $table->decimal('net_cashflow', 15, 2)->default(0);
            $table->decimal('end_of_day_balance', 15, 2)->default(0);
            $table->integer('txn_count')->default(0);
            $table->integer('unique_cust_count')->default(0);
            $table->string('channel')->nullable();
            $table->string('sector_mcc')->nullable();
            $table->string('location_region')->nullable();
            $table->date('acct_opening_date')->nullable();
            $table->string('source_type');
            $table->unsignedBigInteger('ingest_seed')->nullable();
            $table->timestamps();

            $table->index(['business_uuid', 'transaction_date'], 'idx_heartbeat_business_date');
            $table->index('source_type', 'idx_heartbeat_source_type');
            $table->unique(['business_uuid', 'transaction_date', 'source_type'], 'uq_heartbeat_business_date_source');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sme_daily_heartbeat');
    }
};
