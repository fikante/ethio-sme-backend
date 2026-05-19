<?php

namespace App\Domain\Governance\Actions;

use App\Domain\Governance\Data\TrainingJobRequestData;
use App\Domain\Valuation\Services\AiEngineClient;
use App\Models\AiTrainingJob;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class SubmitTrainingJobAction
{
    public function __construct(
        private readonly AiEngineClient $client,
    ) {}

    public function execute(TrainingJobRequestData $data, ?User $submitter = null): AiTrainingJob
    {
        $payload = $data->toPayload();
        $response = $this->client->submitTrainingJob($payload);

        return DB::transaction(function () use ($data, $response, $submitter, $payload): AiTrainingJob {
            return AiTrainingJob::create([
                'external_job_id' => (string) ($response['job_id'] ?? ''),
                'status' => (string) ($response['status'] ?? AiTrainingJob::STATUS_QUEUED),
                'request_payload' => $payload,
                'last_status_payload' => $response,
                'submitted_by' => $submitter?->id,
            ]);
        });
    }
}
