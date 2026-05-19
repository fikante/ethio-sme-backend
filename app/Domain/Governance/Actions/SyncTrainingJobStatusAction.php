<?php

namespace App\Domain\Governance\Actions;

use App\Domain\Governance\Data\TrainingJobStatusData;
use App\Domain\Valuation\Exceptions\AiEngineException;
use App\Domain\Valuation\Services\AiEngineClient;
use App\Models\AiTrainingJob;
use Illuminate\Support\Facades\DB;

class SyncTrainingJobStatusAction
{
    public function __construct(
        private readonly AiEngineClient $client,
    ) {}

    public function execute(AiTrainingJob $job): TrainingJobStatusData
    {
        if ($job->external_job_id === null || $job->external_job_id === '') {
            throw new AiEngineException('JOB_NOT_FOUND', 'Training job has no external job id.', httpStatus: 404);
        }

        $response = $this->client->getTrainingJob($job->external_job_id);
        $status = TrainingJobStatusData::fromHttp($response);

        if (! $job->isTerminal()) {
            DB::transaction(function () use ($job, $status, $response): void {
                $updates = [
                    'status' => $status->status,
                    'last_status_payload' => $response,
                    'error_message' => $status->errorMessage,
                ];

                if ($status->startedAt !== null && $job->started_at === null) {
                    $updates['started_at'] = $status->startedAt;
                }

                if (in_array($status->status, [AiTrainingJob::STATUS_COMPLETED, AiTrainingJob::STATUS_FAILED], true)) {
                    $updates['completed_at'] = $status->completedAt ?? now();
                }

                $job->update($updates);
            });
        }

        return $status;
    }
}
