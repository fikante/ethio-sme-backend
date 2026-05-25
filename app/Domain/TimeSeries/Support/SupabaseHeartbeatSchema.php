<?php

namespace App\Domain\TimeSeries\Support;

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

    /**
     * On Supabase PostgreSQL, `net_cashflow` is a GENERATED column
     * (typically daily_total_inflow - daily_total_outflow). Inserts must
     * not include it or PostgreSQL returns SQLSTATE 428C9.
     */
    public static function omitNetCashflowOnInsert(): bool
    {
        return config('database.default') === 'pgsql'
            || config('database.connections.'.config('database.default').'.driver') === 'pgsql';
    }
}
