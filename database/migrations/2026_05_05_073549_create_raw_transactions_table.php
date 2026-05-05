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
        Schema::create('raw_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            $table->string('provider_tx_ref')->unique();    // Chapa trx_ref
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('ETB');
            $table->enum('status', ['success', 'failed', 'pending', 'reversed']);
            $table->string('payment_method')->nullable();   // telebirr, cbe_birr, etc.
            $table->string('customer_email')->nullable();
            $table->jsonb('raw_payload');                   // full Chapa webhook payload
            $table->timestamp('transacted_at');
            $table->timestamps();

            $table->index(['business_id', 'transacted_at']);
            $table->index(['business_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_transactions');
    }
};
