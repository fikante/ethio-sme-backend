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

            $business = Business::query()
                ->where('uuid', $data['Business_UUID'] ?? null)
                ->first();

            if ($business === null) {
                continue;
            }

            $inflow = (float) ($data['Daily_Total_Inflow'] ?? 0);
            $outflow = (float) ($data['Daily_Total_Outflow'] ?? 0);

            $chunk[] = [
                'business_id' => $business->id,
                'heartbeat_date' => $data['Transaction_Date'] ?? null,
                'inflow_total' => $inflow,
                'outflow_total' => $outflow,
                'transaction_count' => (int) ($data['Txn_Count'] ?? 0),
                'transaction_failure_rate' => 0,
                'is_holiday' => false,
                'is_payday' => false,
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
        $this->command?->info('Heartbeat data seeded from CSV.');
    }
}
