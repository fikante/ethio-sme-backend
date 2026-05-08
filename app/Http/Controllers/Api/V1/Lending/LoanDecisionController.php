<?php

namespace App\Http\Controllers\Api\V1\Lending;

use App\Domain\Lending\Actions\SubmitLoanDecisionAction;
use App\Domain\Lending\Data\LoanDecisionData;
use App\Domain\Lending\Enums\DecisionOutcome;
use App\Domain\Lending\Requests\StoreLoanDecisionRequest;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;

class LoanDecisionController extends Controller
{
    public function __invoke(
        StoreLoanDecisionRequest $request,
        LoanApplication $application,
        SubmitLoanDecisionAction $action
    ): JsonResponse {
        $this->authorize('decide', $application);

        $data = LoanDecisionData::fromRequest($request, $request->user()->id);

        if ($data->outcome === DecisionOutcome::Rejected) {
            $this->authorize('rejectWithReason', $application);
        }

        $application = $action->execute($application, $data);

        return response()->json($application->load(['adverseActionNotices', 'reviewer']));
    }
}
