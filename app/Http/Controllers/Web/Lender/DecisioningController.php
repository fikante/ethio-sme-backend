<?php

namespace App\Http\Controllers\Web\Lender;

use App\Domain\Lending\Actions\SubmitLoanDecisionAction;
use App\Domain\Lending\Data\LoanDecisionData;
use App\Domain\Lending\Enums\DecisionOutcome;
use App\Domain\Lending\Requests\StoreWebLoanDecisionRequest;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class DecisioningController extends Controller
{
    public function show(LoanApplication $application): Response
    {
        $this->authorize('view', $application);

        return Inertia::render('Lender/DecisioningAndXAI', [
            'application' => $this->formatApplication($application->load(['business', 'valuation.shapExplanations'])),
        ]);
    }

    public function decide(
        StoreWebLoanDecisionRequest $request,
        LoanApplication $application,
        SubmitLoanDecisionAction $action,
    ): RedirectResponse {
        $this->authorize('decide', $application);

        if ($request->input('decision') === 'rejected') {
            $this->authorize('rejectWithReason', $application);
        }

        $data = LoanDecisionData::fromWebRequest($request, $request->user()->id);
        $application = $action->execute($application, $data);

        $outcome = $data->outcome === DecisionOutcome::Approved ? 'approved' : 'rejected';

        return redirect()
            ->route('applications.pipeline')
            ->with('success', "Application {$outcome} successfully.");
    }

    /**
     * @return array<string, mixed>
     */
    private function formatApplication(LoanApplication $application): array
    {
        $valuation = $application->valuation;

        return [
            'id' => $application->id,
            'status' => $application->status,
            'requested_amount' => $application->requested_amount,
            'business_name' => $application->business?->business_name,
            'ai_risk_band' => $application->ai_risk_band,
            'ai_risk_score' => $application->ai_risk_score ?? $application->snapshot_risk_score,
            'prob_default' => $application->prob_default,
            'npv_credit_limit' => $application->npv_credit_limit ?? $application->snapshot_limit_etb,
            'reason_codes' => $valuation?->reason_codes ?? $application->reason_codes ?? [],
            'decided_at' => $application->decided_at?->toDateTimeString(),
            'rejection_narrative' => $application->rejection_narrative,
        ];
    }
}
