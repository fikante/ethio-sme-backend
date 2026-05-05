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
        Schema::create('businesses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('business_name');
            $table->string('sector');           // e.g. 'retail', 'manufacturing', 'services'
            $table->string('sub_city');         // geographic feature for DeepAR cross-learning
            $table->year('established_year');
            $table->decimal('monthly_revenue_estimate', 15, 2)->nullable();
            $table->enum('status', ['active', 'suspended', 'under_review'])->default('active');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('businesses');
    }
};
