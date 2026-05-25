<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            if (! Schema::hasColumn('businesses', 'uuid')) {
                $table->uuid('uuid')->nullable()->unique()->after('id');
            }

            if (! Schema::hasColumn('businesses', 'tin_number')) {
                $table->string('tin_number')->nullable()->unique()->after('monthly_revenue_estimate');
            }

            if (! Schema::hasColumn('businesses', 'trade_license_no')) {
                $table->string('trade_license_no')->nullable()->after('tin_number');
            }

            if (! Schema::hasColumn('businesses', 'premises_status')) {
                $table->string('premises_status')->nullable()->after('trade_license_no');
            }

            if (! Schema::hasColumn('businesses', 'employee_count')) {
                $table->unsignedInteger('employee_count')->nullable()->after('premises_status');
            }

            if (! Schema::hasColumn('businesses', 'monthly_rent')) {
                $table->decimal('monthly_rent', 15, 2)->nullable()->after('employee_count');
            }

            if (! Schema::hasColumn('businesses', 'data_source')) {
                $table->string('data_source')->nullable()->after('monthly_rent');
            }

            if (! Schema::hasColumn('businesses', 'simulation_seed')) {
                $table->unsignedBigInteger('simulation_seed')->nullable()->after('data_source');
            }
        });
    }

    public function down(): void
    {
        Schema::table('businesses', function (Blueprint $table) {
            foreach ([
                'simulation_seed',
                'data_source',
                'monthly_rent',
                'employee_count',
                'premises_status',
                'trade_license_no',
                'tin_number',
                'uuid',
            ] as $column) {
                if (Schema::hasColumn('businesses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
