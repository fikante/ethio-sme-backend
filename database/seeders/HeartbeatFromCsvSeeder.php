<?php

namespace Database\Seeders;

use App\Models\Business;
use App\Models\SmeDailyHeartbeat;
use Illuminate\Database\Seeder;

class HeartbeatFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $csvPath = database_path('data/sme_daily_transactions.csv');

        if (! file_exists($csvPath)) {
            $this->command?->warn('CSV not found at '.$csvPath);

            return;
        }

        $file = fopen($csvPath, 'r');
        if ($file === false) {
            $this->command?->error('Could not open CSV at '.$csvPath);

            return;
        }

        $headers = fgetcsv($file);
        if ($headers === false) {
            fclose($file);
            $this->command?->error('CSV has no header row.');

            return;
        }

        $chunk = [];

        while (($row = fgetcsv($file)) !== false) {
            $data = array_combine($headers, $row);
            if ($data === false) {
                continue;
            }

            $uuid = $data['Business_UUID'] ?? null;
            if ($uuid === null || $uuid === '') {
                continue;
            }

            $business = Business::query()->where('uuid', $uuid)->first();
            if ($business === null) {
                continue;
            }

            $inflow = (float) ($data['Daily_Total_Inflow'] ?? 0);
            $outflow = (float) ($data['Daily_Total_Outflow'] ?? 0);

            $chunk[] = [
                'business_uuid' => $uuid,
                'transaction_date' => $data['Transaction_Date'] ?? null,
                'daily_total_inflow' => $inflow,
                'daily_total_outflow' => $outflow,
                'net_cashflow' => $inflow - $outflow,
                'end_of_day_balance' => (float) ($data['End_of_Day_Balance'] ?? 0),
                'txn_count' => (int) ($data['Txn_Count'] ?? 0),
                'unique_cust_count' => (int) ($data['Unique_Cust_Count'] ?? 0),
                'channel' => $data['Channel'] ?? 'unknown',
                'sector_mcc' => $data['Sector_MCC'] ?? $business->sector,
                'location_region' => $data['Location_Region'] ?? $business->sub_city,
                'source_type' => 'csv_seed',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (count($chunk) >= 500) {
                SmeDailyHeartbeat::insertOrIgnore($chunk);
                $chunk = [];
            }
        }

        if ($chunk !== []) {
            SmeDailyHeartbeat::insertOrIgnore($chunk);
        }

        fclose($file);
        $this->command?->info('Heartbeat data seeded from CSV (Supabase schema).');
    }
}
