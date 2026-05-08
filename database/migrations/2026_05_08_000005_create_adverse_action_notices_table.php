<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('adverse_action_notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('loan_application_id')->constrained()->cascadeOnDelete();
            $table->foreignId('officer_id')->constrained('users');
            $table->json('reason_codes');
            $table->text('narrative')->nullable();
            $table->decimal('apr', 6, 4)->nullable();
            $table->timestamps();

            $table->index('loan_application_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('adverse_action_notices');
    }
};
