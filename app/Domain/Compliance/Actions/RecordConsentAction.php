<?php

namespace App\Domain\Compliance\Actions;

use App\Domain\Compliance\Data\ConsentData;
use App\Models\Consent;
use Illuminate\Support\Facades\DB;

class RecordConsentAction
{
    public function execute(ConsentData $data): Consent
    {
        return DB::transaction(function () use ($data): Consent {
            $consent = Consent::firstOrNew([
                'user_id' => $data->userId,
                'purpose' => $data->purpose,
                'document_version' => $data->documentVersion,
            ]);

            if ($data->granted) {
                $consent->granted_at = now();
                $consent->withdrawn_at = null;
            } else {
                $consent->granted_at ??= now();
                $consent->withdrawn_at = now();
            }

            $consent->save();

            return $consent->fresh();
        });
    }
}
