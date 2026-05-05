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
        Schema::create('ai_evaluation_logs', function (Blueprint $table) {
            $table->id();
            // Foreign key constraint is added in a follow-up migration
            // to guarantee migration order on fresh databases.
            $table->foreignId('loan_application_id');
            $table->json('request_payload');       // what we sent to Python
            $table->json('response_payload');      // what Python returned
            $table->integer('latency_ms');
            $table->boolean('success');
            $table->text('error_message')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ai_evaluation_logs');
    }
};
