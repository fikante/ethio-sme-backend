<?php

namespace App\Domain\Macroeconomics\Actions;

use App\Domain\Macroeconomics\Data\ExogenousFactorsData;
use App\Models\ExogenousFactor;
use Illuminate\Support\Facades\DB;

class UpsertExogenousFactorsAction
{
    public function execute(ExogenousFactorsData $data): ExogenousFactor
    {
        return DB::transaction(function () use ($data): ExogenousFactor {
            return ExogenousFactor::updateOrCreate(
                ['effective_date' => $data->effectiveDate->toDateString()],
                $data->toAttributes()
            );
        });
    }
}
