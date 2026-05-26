<?php

namespace App\Http\Controllers\Web\Borrower;

use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Http\Controllers\Controller;
use App\Models\SmeDailyHeartbeat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IntegrationsController extends Controller
{
    private const CHAPA_SOURCE = 'chapa_simulation';

    public function show(Request $request): Response
    {
        $user = $request->user();
        $business = $user->businesses()->latest()->first();

        $chapaData = null;
        $cbeData = null;
        $syncHistory = [];

        if ($business) {
            $fkColumn = SupabaseHeartbeatSchema::businessFkColumn();
            $fkValue = SupabaseHeartbeatSchema::businessFkValue($business);
            $dateColumn = SupabaseHeartbeatSchema::dateColumn();

            // Chapa simulation data
            $chapaQuery = SmeDailyHeartbeat::where($fkColumn, $fkValue)
                ->where('source_type', self::CHAPA_SOURCE);
            $chapaCount = $chapaQuery->count();

            if ($chapaCount > 0) {
                $chapaMin = $chapaQuery->min($dateColumn);
                $chapaMax = $chapaQuery->max($dateColumn);
                $chapaDays = $chapaQuery->distinct($dateColumn)->count($dateColumn);

                $chapaData = [
                    'connected'  => true,
                    'days_synced' => $chapaDays,
                    'date_from'  => (string) $chapaMin,
                    'date_to'    => (string) $chapaMax,
                ];
            } else {
                $chapaData = ['connected' => false, 'days_synced' => 0];
            }

            // CBE — all non-chapa records
            $cbeQuery = SmeDailyHeartbeat::where($fkColumn, $fkValue)
                ->where('source_type', '!=', self::CHAPA_SOURCE);
            $cbeCount = $cbeQuery->count();

            if ($cbeCount > 0) {
                $cbeMin = $cbeQuery->min($dateColumn);
                $cbeMax = $cbeQuery->max($dateColumn);
                $cbeDays = $cbeQuery->distinct($dateColumn)->count($dateColumn);

                $cbeData = [
                    'active'       => true,
                    'record_count' => $cbeCount,
                    'days'         => $cbeDays,
                    'date_from'    => (string) $cbeMin,
                    'date_to'      => (string) $cbeMax,
                ];
            } else {
                $cbeData = ['active' => false, 'record_count' => 0, 'days' => 0];
            }

            // Sync history — last 5 sync batches by source + date
            $syncHistory = SmeDailyHeartbeat::where($fkColumn, $fkValue)
                ->selectRaw('source_type, DATE(created_at) as sync_date, COUNT(*) as records_added')
                ->groupBy('source_type', 'sync_date')
                ->orderByDesc('sync_date')
                ->limit(5)
                ->get()
                ->map(fn ($r) => [
                    'source'        => $r->source_type ?? 'manual_upload',
                    'sync_date'     => (string) $r->sync_date,
                    'records_added' => (int) $r->records_added,
                ])
                ->toArray();
        }

        return Inertia::render('Borrower/Integrations', [
            'hasBusiness'  => (bool) $business,
            'businessUuid' => $business?->uuid,
            'chapaData'    => $chapaData,
            'cbeData'      => $cbeData,
            'syncHistory'  => $syncHistory,
        ]);
    }

    /**
     * Simulate a Chapa merchant connection by generating 30 days of heartbeat records.
     * Uses schema helpers to resolve the correct column names for the active environment.
     */
    public function simulateChapa(Request $request): JsonResponse
    {
        $user = $request->user();
        $business = $user->businesses()->latest()->first();

        if (! $business) {
            return response()->json(['error' => 'No business found.'], 422);
        }

        $fkColumn = SupabaseHeartbeatSchema::businessFkColumn();
        $fkValue = SupabaseHeartbeatSchema::businessFkValue($business);

        $existing = SmeDailyHeartbeat::where($fkColumn, $fkValue)
            ->where('source_type', self::CHAPA_SOURCE)
            ->exists();

        if ($existing) {
            return response()->json([
                'message'           => 'Chapa simulation already connected.',
                'already_connected' => true,
            ]);
        }

        $dateColumn     = SupabaseHeartbeatSchema::dateColumn();
        $inflowColumn   = SupabaseHeartbeatSchema::inflowColumn();
        $outflowColumn  = SupabaseHeartbeatSchema::outflowColumn();
        $txnColumn      = SupabaseHeartbeatSchema::txnCountColumn();
        $omitNetCashflow = SupabaseHeartbeatSchema::omitNetCashflowOnInsert();

        $records = [];
        $startDate = now()->subDays(29);

        for ($i = 0; $i < 30; $i++) {
            $date    = $startDate->copy()->addDays($i);
            $inflow  = round(mt_rand(5000, 25000) + mt_rand(0, 9999) / 10000, 2);
            $outflow = round(mt_rand(2000, 12000) + mt_rand(0, 9999) / 10000, 2);
            $net     = round($inflow - $outflow, 2);

            $record = [
                $fkColumn         => $fkValue,
                $dateColumn       => $date->toDateString(),
                $inflowColumn     => $inflow,
                $outflowColumn    => $outflow,
                $txnColumn        => mt_rand(5, 40),
                'unique_cust_count' => mt_rand(3, 20),
                'end_of_day_balance' => $net,
                'channel'         => 'mobile_money',
                'location_region' => 'Addis Ababa',
                'source_type'     => self::CHAPA_SOURCE,
                'created_at'      => now()->toDateTimeString(),
                'updated_at'      => now()->toDateTimeString(),
            ];

            if (! $omitNetCashflow) {
                $record['net_cashflow'] = $net;
            }

            $records[] = $record;
        }

        collect($records)->chunk(10)->each(fn ($chunk) => SmeDailyHeartbeat::insert($chunk->toArray()));

        return response()->json([
            'message'       => 'Chapa simulation connected successfully.',
            'records_added' => count($records),
            'days_synced'   => 30,
        ]);
    }
}
