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
        Schema::create('psychometric_assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->constrained()->cascadeOnDelete();
            // Normalized 0.0000–1.0000 scores per PRD EFL methodology
            $table->decimal('integrity_score', 5, 4)->default(0);
            $table->decimal('conscientiousness_score', 5, 4)->default(0);
            $table->decimal('risk_tolerance_score', 5, 4)->default(0);
            $table->decimal('composite_score', 5, 4)->storedAs(
                '(integrity_score * 0.4 + conscientiousness_score * 0.4 + risk_tolerance_score * 0.2)'
            );
            $table->json('raw_answers');        // store the 15-20 question responses
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('psychometric_assessments');
    }
};
