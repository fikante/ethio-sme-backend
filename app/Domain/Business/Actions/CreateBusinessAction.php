<?php

namespace App\Domain\Business\Actions;

use App\Domain\Business\Data\BusinessData;
use App\Models\Business;
use Illuminate\Support\Facades\DB;

class CreateBusinessAction
{
    public function execute(BusinessData $data): Business
    {
        return DB::transaction(fn (): Business => Business::create($data->toAttributes()));
    }
}
