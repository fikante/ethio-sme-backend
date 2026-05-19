<?php

namespace App\Http\Controllers\Api\V1\Governance;

use App\Domain\Governance\Actions\SubmitTrainingJobAction;
use App\Domain\Governance\Actions\SyncTrainingJobStatusAction;
use App\Domain\Governance\Data\TrainingJobRequestData;
use App\Http\Controllers\Controller;
use App\Models\AiTrainingJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrainingJobController extends Controller
{
    public function store(Request $request, SubmitTrainingJobAction $action): JsonResponse
    {
        $this->authorize('run', \App\Models\FairnessAudit::class);

        $data = TrainingJobRequestData::fromRequest($request);
        $job = $action->execute($data, $request->user());

        return response()->json([
            'contract_version' => config('services.ai_engine.contract_version', 'v2'),
            'request_id' => $data->requestId,
            'job_id' => $job->external_job_id,
            'local_id' => $job->id,
            'status' => $job->status,
            'poll_url' => '/api/v1/admin/training/jobs/'.$job->external_job_id,
        ], 202);
    }

    public function show(string $jobId, SyncTrainingJobStatusAction $sync): JsonResponse
    {
        $this->authorize('run', \App\Models\FairnessAudit::class);

        $trainingJob = AiTrainingJob::query()
            ->where('id', $jobId)
            ->orWhere('external_job_id', $jobId)
            ->firstOrFail();

        $status = $sync->execute($trainingJob->fresh());

        return response()->json([
            'contract_version' => $status->contractVersion,
            'job_id' => $status->jobId,
            'local_id' => $trainingJob->id,
            'status' => $status->status,
            'progress' => $status->progress,
            'results' => $status->results,
            'warnings' => $status->warnings,
            'started_at' => $status->startedAt,
            'updated_at' => $status->updatedAt,
            'completed_at' => $status->completedAt,
            'error_message' => $status->errorMessage,
        ]);
    }

    public function index(): JsonResponse
    {
        $this->authorize('run', \App\Models\FairnessAudit::class);

        $jobs = AiTrainingJob::query()
            ->orderByDesc('created_at')
            ->limit(50)
            ->get(['id', 'external_job_id', 'status', 'created_at', 'completed_at', 'error_message']);

        return response()->json($jobs);
    }
}
