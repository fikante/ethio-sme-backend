<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shap_explanations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('valuation_id')->constrained()->cascadeOnDelete();
            $table->string('feature_key');
            $table->decimal('shap_value', 12, 6);
            $table->json('feature_value_snapshot')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['valuation_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shap_explanations');
    }
};
