<?php

namespace App\Domain\Governance\Actions;

use App\Domain\Governance\Data\DriftMetricsData;
use App\Models\DriftMetric;
use Illuminate\Support\Facades\DB;

class RecordDriftMetricsAction
{
    public function execute(DriftMetricsData $data): DriftMetric
    {
        return DB::transaction(function () use ($data): DriftMetric {
            return DriftMetric::create([
                'business_id' => $data->businessId,
                'mape' => $data->mape,
                'horizon_days' => $data->horizonDays,
                'evaluated_at' => $data->evaluatedAt,
                'details' => $data->details,
            ]);
        });
    }
}
