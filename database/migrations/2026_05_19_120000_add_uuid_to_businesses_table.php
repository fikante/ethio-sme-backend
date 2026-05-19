<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->unique()->after('id');
        });

        \App\Models\Business::query()
            ->whereNull('uuid')
            ->eachById(function (\App\Models\Business $business): void {
                $business->forceFill(['uuid' => (string) Str::uuid()])->saveQuietly();
            });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            $table->dropColumn('uuid');
        });
    }
};
