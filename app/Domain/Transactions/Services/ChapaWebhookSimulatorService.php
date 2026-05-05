<?php

namespace App\Domain\Transactions\Services;

use App\Models\Business;
use App\Models\RawTransaction;
use Carbon\Carbon;
use Illuminate\Support\Str;

class ChapaWebhookSimulatorService
{
    /**
     * Inject 60 days of synthetic Chapa-compliant transaction payloads.
     * Mimics a live API sync as specified in PRD Section 10.
     *
     * Simulates Ethiopian market realities:
     * - "Payday Effect": liquidity spikes on 25th–30th of each month
     * - Holiday variance: Meskel (Sep 27), Timkat (Jan 19)
     */
    public function simulate(Business $business, int $days = 60): array
    {
        $transactions   = [];
        $startDate      = Carbon::now()->subDays($days);
        $paymentMethods = ['telebirr', 'cbe_birr', 'awash_birr', 'chapa_checkout'];

        for ($i = 0; $i < $days; $i++) {
            $date        = $startDate->copy()->addDays($i);
            $isPayday    = $date->day >= 25;
            $isHoliday   = $this->isEthiopianHoliday($date);
            $txCountBase = rand(3, 12);
            $multiplier  = ($isPayday ? 2.5 : 1) * ($isHoliday ? 1.8 : 1);
            $txCount     = (int) ($txCountBase * $multiplier);

            for ($j = 0; $j < $txCount; $j++) {
                $isFailure = rand(1, 100) <= 8; // ~8% baseline failure rate
                $amount    = round(rand(150, 8000) * ($isPayday ? 1.5 : 1), 2);

                $txRef = 'tx-ethio-sme-' . Str::random(12);

                $payload = [
                    'event' => $isFailure ? 'charge.failed' : 'charge.success',
                    'data'  => [
                        'trx_ref'        => $txRef,
                        'amount'         => number_format($amount, 2, '.', ''),
                        'currency'       => 'ETB',
                        'status'         => $isFailure ? 'failed' : 'success',
                        'payment_method' => $paymentMethods[array_rand($paymentMethods)],
                        'created_at'     => $date->toIso8601String(),
                        'customer'       => ['email' => 'owner@' . Str::slug($business->business_name) . '.com'],
                    ],
                ];

                $transactions[] = RawTransaction::create([
                    'business_id'     => $business->id,
                    'provider_tx_ref' => $txRef,
                    'amount'          => $amount,
                    'currency'        => 'ETB',
                    'status'          => $isFailure ? 'failed' : 'success',
                    'payment_method'  => $payload['data']['payment_method'],
                    'customer_email'  => $payload['data']['customer']['email'],
                    'raw_payload'     => $payload,
                    'transacted_at'   => $date,
                ]);
            }
        }

        return $transactions;
    }

    public function isEthiopianHoliday(Carbon $date): bool
    {
        $holidays = [
            ['month' => 1,  'day' => 7],   // Ethiopian Christmas (Genna)
            ['month' => 1,  'day' => 19],  // Timkat
            ['month' => 3,  'day' => 2],   // Victory of Adwa
            ['month' => 4,  'day' => 23],  // Good Friday (approx)
            ['month' => 5,  'day' => 1],   // Labour Day
            ['month' => 5,  'day' => 5],   // Patriots' Victory Day
            ['month' => 5,  'day' => 28],  // Derg Downfall Day
            ['month' => 9,  'day' => 11],  // Ethiopian New Year (Enkutatash)
            ['month' => 9,  'day' => 27],  // Meskel
        ];

        foreach ($holidays as $holiday) {
            if ($date->month === $holiday['month'] && $date->day === $holiday['day']) {
                return true;
            }
        }

        return false;
    }
}

