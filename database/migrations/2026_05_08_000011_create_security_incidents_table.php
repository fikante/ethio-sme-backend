<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_incidents', function (Blueprint $table) {
            $table->id();
            $table->timestamp('detected_at');
            $table->timestamp('reported_to_eca_at')->nullable();
            $table->string('summary');
            $table->string('severity', 32)->default('medium');
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index('detected_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_incidents');
    }
};
