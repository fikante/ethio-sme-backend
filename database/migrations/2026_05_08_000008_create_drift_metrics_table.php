<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drift_metrics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('business_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('mape', 10, 6);
            $table->unsignedInteger('horizon_days');
            $table->timestamp('evaluated_at');
            $table->json('details')->nullable();
            $table->timestamps();

            $table->index(['business_id', 'evaluated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drift_metrics');
    }
};
