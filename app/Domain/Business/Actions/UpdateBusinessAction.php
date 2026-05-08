<?php

namespace App\Domain\Business\Actions;

use App\Domain\Business\Data\BusinessUpdateData;
use App\Models\Business;
use Illuminate\Support\Facades\DB;

class UpdateBusinessAction
{
    public function execute(Business $business, BusinessUpdateData $data): Business
    {
        return DB::transaction(function () use ($business, $data): Business {
            $attributes = $data->toAttributes();

            if (! empty($attributes)) {
                $business->fill($attributes)->save();
            }

            return $business->fresh();
        });
    }
}
