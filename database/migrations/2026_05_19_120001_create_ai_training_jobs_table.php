<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_training_jobs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('external_job_id')->nullable()->unique();
            $table->string('status', 32)->default('queued');
            $table->json('request_payload');
            $table->json('last_status_payload')->nullable();
            $table->text('error_message')->nullable();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_training_jobs');
    }
};
