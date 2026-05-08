<?php

namespace App\Domain\TimeSeries\Data;

use Carbon\CarbonInterface;
use Spatie\LaravelData\Data;

class HeartbeatRowData extends Data
{
    public function __construct(
        public readonly int $businessId,
        public readonly CarbonInterface $date,
        public readonly float $inflowTotal,
        public readonly float $outflowTotal,
        public readonly float $transactionFailureRate,
        public readonly int $transactionCount,
        public readonly bool $isPayday,
        public readonly bool $isHoliday,
    ) {}

    public function toAttributes(): array
    {
        return [
            'business_id' => $this->businessId,
            'heartbeat_date' => $this->date->toDateString(),
            'inflow_total' => $this->inflowTotal,
            'outflow_total' => $this->outflowTotal,
            'transaction_failure_rate' => $this->transactionFailureRate,
            'transaction_count' => $this->transactionCount,
            'is_payday' => $this->isPayday,
            'is_holiday' => $this->isHoliday,
        ];
    }
}
