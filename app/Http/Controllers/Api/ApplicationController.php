<?php

namespace App\Http\Controllers\Api;

use App\Domain\Applications\Actions\EvaluateApplicationAction;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ApplicationController extends Controller
{
    public function index(): JsonResponse
    {
        $applications = QueryBuilder::for(LoanApplication::class)
            ->allowedFilters([
                AllowedFilter::exact('status'),
                AllowedFilter::exact('business_id'),
            ])
            ->allowedSorts(['created_at', 'ai_risk_score', 'npv_credit_limit'])
            ->with(['business.owner'])
            ->paginate(20);

        return response()->json($applications);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id'             => 'required|exists:businesses,id',
            'requested_amount'        => 'required|numeric|min:1000',
            'requested_tenure_months' => 'required|integer|min:1|max:60',
        ]);

        $application = LoanApplication::create([
            ...$data,
            'status' => 'pending_psychometric',
        ]);

        return response()->json($application, 201);
    }

    public function show(LoanApplication $application): JsonResponse
    {
        return response()->json($application->load([
            'business.psychometricAssessment',
            'reviewer',
            'evaluationLogs',
        ]));
    }

    public function evaluate(
        LoanApplication $application,
        EvaluateApplicationAction $action
    ): JsonResponse {
        if (!in_array($application->status, ['pending_data_sync', 'queued_for_ai'])) {
            return response()->json([
                'message' => 'Application is not ready for evaluation. Status: ' . $application->status,
            ], 422);
        }

        $result = $action->execute($application);

        return response()->json($result->load([
            'business.psychometricAssessment',
            'evaluationLogs',
        ]));
    }

    public function decision(Request $request, LoanApplication $application): JsonResponse
    {
        $data = $request->validate([
            'status'              => 'required|in:approved,rejected',
            'rejection_narrative' => 'required_if:status,rejected|nullable|string',
            'reason_codes'        => 'nullable|array',
        ]);

        $application->update([
            ...$data,
            'reviewed_by' => auth('api')->id(),
            'decided_at'  => now(),
        ]);

        return response()->json($application->fresh());
    }
}

