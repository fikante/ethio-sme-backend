<?php

namespace App\Http\Controllers\Api\V1\Governance;

use App\Domain\Governance\Actions\RunFairnessAuditAction;
use App\Domain\Governance\Requests\RunFairnessAuditRequest;
use App\Http\Controllers\Controller;
use App\Models\FairnessAudit;
use Illuminate\Http\JsonResponse;

class FairnessAuditController extends Controller
{
    public function index(): JsonResponse
    {
        $this->authorize('viewAny', FairnessAudit::class);

        return response()->json(
            FairnessAudit::query()->orderByDesc('created_at')->paginate(20)
        );
    }

    public function store(RunFairnessAuditRequest $request, RunFairnessAuditAction $action): JsonResponse
    {
        $this->authorize('run', FairnessAudit::class);

        $audit = $action->execute(
            cohortDefinition: ['cohorts' => $request->input('cohorts')],
            runBy: $request->user()->id,
            notes: $request->input('notes'),
        );

        return response()->json($audit, 201);
    }
}
