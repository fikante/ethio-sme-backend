<?php

namespace App\Domain\TimeSeries\Support;

use App\Models\Business;
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

    /**
     * Live Supabase/Postgres uses business_id + heartbeat_date; SQLite tests use business_uuid + transaction_date.
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

    public static function dateColumn(): string
    {
        return self::isSupabaseLayout() ? 'heartbeat_date' : 'transaction_date';
    }

    public static function inflowColumn(): string
    {
        return self::isSupabaseLayout() ? 'inflow_total' : 'daily_total_inflow';
    }

    public static function outflowColumn(): string
    {
        return self::isSupabaseLayout() ? 'outflow_total' : 'daily_total_outflow';
    }

    public static function txnCountColumn(): string
    {
        return self::isSupabaseLayout() ? 'transaction_count' : 'txn_count';
    }

    public static function hasSourceTypeColumn(): bool
    {
        return Schema::hasTable('sme_daily_heartbeat')
            && Schema::hasColumn('sme_daily_heartbeat', 'source_type');
    }

    /**
     * On Supabase PostgreSQL, `net_cashflow` is a GENERATED column
     * (typically daily_total_inflow - daily_total_outflow). Inserts must
     * not include it or PostgreSQL returns SQLSTATE 428C9.
     */
    public static function omitNetCashflowOnInsert(): bool
    {
        return self::isSupabaseLayout();
    }
}
