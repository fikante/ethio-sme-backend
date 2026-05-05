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
        Schema::create('exogenous_factors', function (Blueprint $table) {
            $table->id();
            $table->date('effective_date')->unique();
            $table->decimal('nbe_policy_rate', 5, 4);     // ~0.15 currently
            $table->decimal('inflation_rate', 5, 4);
            $table->decimal('usd_etb_rate', 8, 2)->nullable();
            $table->foreignId('updated_by')->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('exogenous_factors');
    }
};
