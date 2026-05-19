<?php

namespace App\Http\Controllers\Web\Admin;

use App\Domain\Governance\Actions\SubmitTrainingJobAction;
use App\Domain\Governance\Actions\SyncTrainingJobStatusAction;
use App\Domain\Governance\Data\TrainingJobRequestData;
use App\Domain\Valuation\Actions\CheckAiEngineHealthAction;
use App\Http\Controllers\Controller;
use App\Models\AiTrainingJob;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ModelTrainingController extends Controller
{
    public function index(CheckAiEngineHealthAction $healthAction): Response
    {
        $health = [];
        try {
            $health = $healthAction->execute();
        } catch (\Throwable $e) {
            $health = [
                'status' => 'unreachable',
                'message' => $e->getMessage(),
            ];
        }

        $jobs = AiTrainingJob::query()
            ->orderByDesc('created_at')
            ->limit(20)
            ->get(['id', 'external_job_id', 'status', 'created_at', 'completed_at', 'error_message']);

        return Inertia::render('Admin/ModelTraining', [
            'aiHealth' => $health,
            'jobs' => $jobs,
        ]);
    }

    public function store(Request $request, SubmitTrainingJobAction $action): RedirectResponse
    {
        $data = TrainingJobRequestData::fromRequest($request);
        $job = $action->execute($data, $request->user());

        return back()->with('success', 'Training job queued: '.$job->external_job_id);
    }

    public function sync(string $jobId, SyncTrainingJobStatusAction $sync): RedirectResponse
    {
        $job = AiTrainingJob::query()
            ->where('id', $jobId)
            ->orWhere('external_job_id', $jobId)
            ->firstOrFail();

        $sync->execute($job);

        return back()->with('success', 'Training job status refreshed.');
    }
}
