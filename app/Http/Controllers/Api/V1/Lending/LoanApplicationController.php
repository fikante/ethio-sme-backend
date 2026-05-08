<?php

namespace App\Http\Controllers\Api\V1\Lending;

use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Domain\Lending\Requests\StoreLoanApplicationRequest;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class LoanApplicationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = QueryBuilder::for(LoanApplication::class)
            ->allowedFilters([
                AllowedFilter::exact('status'),
                AllowedFilter::exact('business_id'),
            ])
            ->allowedSorts(['created_at', 'snapshot_risk_score', 'ai_risk_score', 'npv_credit_limit'])
            ->with(['business.owner', 'reviewer']);

        if ($user->hasAnyRole(['loan_officer', 'super_admin'])) {
            $this->authorize('viewPipeline', LoanApplication::class);
        } else {
            $this->authorize('viewSelf', LoanApplication::class);
            $query->forBusinessOwner($user->id);
        }

        return response()->json($query->paginate(20));
    }

    public function show(LoanApplication $application): JsonResponse
    {
        $this->authorize('view', $application);

        return response()->json($application->load([
            'business.owner',
            'business.psychometricAssessment',
            'reviewer',
            'evaluationLogs',
            'latestValuation.shapExplanations',
            'adverseActionNotices',
        ]));
    }

    public function store(StoreLoanApplicationRequest $request, CreateLoanApplicationAction $action): JsonResponse
    {
        $this->authorize('create', LoanApplication::class);

        $application = $action->execute(CreateLoanApplicationData::fromRequest($request));

        return response()->json($application, 201);
    }
}
