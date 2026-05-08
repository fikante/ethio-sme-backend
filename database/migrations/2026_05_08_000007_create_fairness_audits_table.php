<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fairness_audits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('run_by')->constrained('users');
            $table->json('cohort_definition');
            $table->decimal('spd', 8, 6);
            $table->decimal('eod', 8, 6);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fairness_audits');
    }
};
