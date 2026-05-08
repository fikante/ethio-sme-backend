<?php

namespace App\Domain\Compliance\Actions;

use App\Domain\Compliance\Data\ErasureRequestData;
use App\Models\DataSubjectRequest;
use Illuminate\Support\Facades\DB;

class RequestErasureAction
{
    public function execute(ErasureRequestData $data): DataSubjectRequest
    {
        return DB::transaction(function () use ($data): DataSubjectRequest {
            return DataSubjectRequest::create([
                'user_id' => $data->userId,
                'type' => $data->type,
                'status' => DataSubjectRequest::STATUS_RECEIVED,
                'requested_at' => now(),
                'notes' => $data->notes,
            ]);
        });
    }
}
