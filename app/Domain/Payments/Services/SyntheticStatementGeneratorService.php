<?php

namespace App\Domain\Payments\Services;

use App\Domain\Payments\Data\ChapaPayloadData;
use App\Domain\Payments\Enums\TransactionStatus;
use App\Domain\Payments\Support\EthiopianHolidayCalendar;
use App\Models\Business;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * Pure deterministic generator that produces a canonical-shape Chapa payload
 * stream for a business. It does NOT touch the database; persistence is the
 * responsibility of the InjectSyntheticStatementAction.
 */
class SyntheticStatementGeneratorService
{
    public function __construct(private readonly EthiopianHolidayCalendar $calendar) {}

    /**
     * @return iterable<ChapaPayloadData>
     */
    public function generate(Business $business, int $days, ?string $seed = null): iterable
    {
        $seed = $seed ?? "business-{$business->id}";
        mt_srand(crc32($seed));

        $startDate = Carbon::now()->subDays($days);
        $paymentMethods = ['telebirr', 'cbe_birr', 'awash_birr', 'chapa_checkout'];

        for ($i = 0; $i < $days; $i++) {
            $date = $startDate->copy()->addDays($i);
            $isPayday = $date->day >= 25;
            $isHoliday = $this->calendar->isHoliday($date);
            $multiplier = ($isPayday ? 2.5 : 1) * ($isHoliday ? 1.8 : 1);
            $txCount = (int) (mt_rand(3, 12) * $multiplier);

            for ($j = 0; $j < $txCount; $j++) {
                $isFailure = mt_rand(1, 100) <= 8;
                $amount = round(mt_rand(150, 8000) * ($isPayday ? 1.5 : 1), 2);

                yield new ChapaPayloadData(
                    event: $isFailure ? 'charge.failed' : 'charge.success',
                    trxRef: 'tx-ethio-sme-'.Str::random(12),
                    amount: $amount,
                    currency: 'ETB',
                    status: $isFailure ? TransactionStatus::Failed : TransactionStatus::Success,
                    paymentMethod: $paymentMethods[array_rand($paymentMethods)],
                    createdAt: $date->copy()->setTime(mt_rand(8, 20), mt_rand(0, 59)),
                    customerEmail: 'owner@'.Str::slug($business->business_name).'.com',
                );
            }
        }
    }
}
