<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('raw_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('raw_transactions', 'source')) {
                $table->string('source', 32)->default('chapa_simulated')->after('payment_method');
            }

            if (! Schema::hasColumn('raw_transactions', 'idempotency_key')) {
                $table->string('idempotency_key')->nullable()->after('source');
                $table->unique(['business_id', 'idempotency_key'], 'raw_txn_business_idem_unique');
            }
        });
    }

    public function down(): void
    {
        Schema::table('raw_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('raw_transactions', 'idempotency_key')) {
                $table->dropUnique('raw_txn_business_idem_unique');
                $table->dropColumn('idempotency_key');
            }

            if (Schema::hasColumn('raw_transactions', 'source')) {
                $table->dropColumn('source');
            }
        });
    }
};
