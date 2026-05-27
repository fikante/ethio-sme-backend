<?php

namespace App\Domain\TimeSeries\Support;

use App\Models\Business;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Column constraints for the live Supabase `sme_daily_heartbeat` table.
 * Do not change production schema via Laravel migrations — code adapts here.
 */
final class SupabaseHeartbeatSchema
{
    /** Fits Supabase varchar(16) on `source_type`. */
    public const SOURCE_TYPE_APP_UPLOAD = 'app_upload';

    public const MAX_SOURCE_TYPE_LENGTH = 16;

    public const MAX_CHANNEL_LENGTH = 16;

    public const MAX_SECTOR_MCC_LENGTH = 16;

    private static ?bool $isSupabaseLayout = null;

    private static ?bool $netCashflowIsGenerated = null;

    /** Resolved column-name cache so Schema::hasColumn is only called once per process. */
    private static ?string $dateCol      = null;
    private static ?string $inflowCol    = null;
    private static ?string $outflowCol   = null;
    private static ?string $txnCountCol  = null;

    /**
     * Returns true when the live Supabase table is in use.
     * Detected by the presence of the `business_id` integer FK column,
     * which the Supabase-managed schema adds alongside `business_uuid`.
     */
    public static function isSupabaseLayout(): bool
    {
        if (self::$isSupabaseLayout === null) {
            self::$isSupabaseLayout = Schema::hasTable('sme_daily_heartbeat')
                && Schema::hasColumn('sme_daily_heartbeat', 'business_id');
        }

        return self::$isSupabaseLayout;
    }

    public static function businessFkColumn(): string
    {
        return self::isSupabaseLayout() ? 'business_id' : 'business_uuid';
    }

    public static function businessFkValue(Business $business): int|string
    {
        return self::isSupabaseLayout() ? $business->id : $business->uuid;
    }

    /**
     * The date column name varies across Supabase deployments.
     * Some instances use `heartbeat_date`; others retain `transaction_date`.
     * We detect whichever actually exists rather than hard-coding.
     */
    public static function dateColumn(): string
    {
        if (self::$dateCol === null) {
            self::$dateCol = (self::isSupabaseLayout() && Schema::hasColumn('sme_daily_heartbeat', 'heartbeat_date'))
                ? 'heartbeat_date'
                : 'transaction_date';
        }

        return self::$dateCol;
    }

    /**
     * Inflow total column — `inflow_total` on some Supabase deployments,
     * `daily_total_inflow` on others (and in tests).
     */
    public static function inflowColumn(): string
    {
        if (self::$inflowCol === null) {
            self::$inflowCol = (self::isSupabaseLayout() && Schema::hasColumn('sme_daily_heartbeat', 'inflow_total'))
                ? 'inflow_total'
                : 'daily_total_inflow';
        }

        return self::$inflowCol;
    }

    /**
     * Outflow total column — `outflow_total` on some Supabase deployments,
     * `daily_total_outflow` on others (and in tests).
     */
    public static function outflowColumn(): string
    {
        if (self::$outflowCol === null) {
            self::$outflowCol = (self::isSupabaseLayout() && Schema::hasColumn('sme_daily_heartbeat', 'outflow_total'))
                ? 'outflow_total'
                : 'daily_total_outflow';
        }

        return self::$outflowCol;
    }

    /**
     * Transaction-count column — `transaction_count` on some Supabase deployments,
     * `txn_count` on others (and in tests).
     */
    public static function txnCountColumn(): string
    {
        if (self::$txnCountCol === null) {
            self::$txnCountCol = (self::isSupabaseLayout() && Schema::hasColumn('sme_daily_heartbeat', 'transaction_count'))
                ? 'transaction_count'
                : 'txn_count';
        }

        return self::$txnCountCol;
    }

    public static function hasSourceTypeColumn(): bool
    {
        return Schema::hasTable('sme_daily_heartbeat')
            && Schema::hasColumn('sme_daily_heartbeat', 'source_type');
    }

    /**
     * On live Postgres (including Supabase), `net_cashflow` may be a GENERATED
     * column even when the table still uses Laravel column names (business_uuid).
     * Inserts must not include it or PostgreSQL returns SQLSTATE 428C9.
     */
    public static function omitNetCashflowOnInsert(): bool
    {
        if (self::$netCashflowIsGenerated !== null) {
            return self::$netCashflowIsGenerated;
        }

        if (! Schema::hasTable('sme_daily_heartbeat')
            || ! Schema::hasColumn('sme_daily_heartbeat', 'net_cashflow')) {
            self::$netCashflowIsGenerated = false;

            return false;
        }

        if (DB::connection()->getDriverName() !== 'pgsql') {
            self::$netCashflowIsGenerated = false;

            return false;
        }

        $row = DB::selectOne(
            "SELECT is_generated
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'sme_daily_heartbeat'
               AND column_name = 'net_cashflow'
             LIMIT 1"
        );

        self::$netCashflowIsGenerated = ($row->is_generated ?? '') === 'ALWAYS';

        return self::$netCashflowIsGenerated;
    }
}
