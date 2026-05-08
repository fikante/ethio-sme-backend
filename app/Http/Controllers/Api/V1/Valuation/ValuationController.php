<?php

namespace App\Http\Controllers\Api\V1\Valuation;

use App\Domain\Valuation\Actions\RunValuationAction;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ValuationController extends Controller
{
    public function run(Request $request, Business $business, RunValuationAction $action): JsonResponse
    {
        $this->authorize('run', $business);

        $application = LoanApplication::query()
            ->where('business_id', $business->id)
            ->whereIn('status', [LoanApplication::STATUS_QUEUED_FOR_AI, LoanApplication::STATUS_PENDING_DATA_SYNC])
            ->latest()
            ->firstOrFail();

        $valuation = $action->execute($application, $request->header('Idempotency-Key'));

        return response()->json($valuation->load(['shapExplanations', 'loanApplication']));
    }

    public function latest(Business $business): JsonResponse
    {
        $this->authorize('readForBusiness', $business);

        $valuation = $business->valuations()
            ->where('status', 'completed')
            ->latest('inferred_at')
            ->with('shapExplanations')
            ->firstOrFail();

        return response()->json($valuation);
    }
}
