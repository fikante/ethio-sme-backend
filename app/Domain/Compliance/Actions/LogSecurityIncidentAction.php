<?php

namespace App\Domain\Compliance\Actions;

use App\Domain\Compliance\Data\SecurityIncidentData;
use App\Models\SecurityIncident;
use Illuminate\Support\Facades\DB;

class LogSecurityIncidentAction
{
    public function execute(SecurityIncidentData $data): SecurityIncident
    {
        return DB::transaction(function () use ($data): SecurityIncident {
            return SecurityIncident::create([
                'detected_at' => $data->detectedAt,
                'summary' => $data->summary,
                'severity' => $data->severity,
                'reported_to_eca_at' => $data->reportedToEcaAt,
                'payload' => $data->payload,
            ]);
        });
    }
}
