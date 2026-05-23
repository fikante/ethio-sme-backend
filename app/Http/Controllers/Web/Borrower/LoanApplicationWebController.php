<?php

namespace App\Http\Controllers\Web\Borrower;

use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LoanApplicationWebController extends Controller
{
    public function index(): Response
    {
        /** @var User $user */
        $user = auth()->user();
        $business = $user->businesses()->first();

        if ($business === null) {
            return Inertia::render('Borrower/LoanApplication', [
                'business' => null,
                'heartbeatDays' => 0,
                'canApply' => false,
                'prerequisites' => [
                    'heartbeatReady' => false,
                    'psychometricReady' => false,
                ],
                'checklist' => [
                    'businessRegistered' => false,
                    'heartbeatLoaded' => false,
                    'assessmentCompleted' => false,
                    'applicationSubmitted' => false,
                    'aiEvaluated' => false,
                    'decisionReceived' => false,
                ],
                'existingApplication' => null,
            ]);
        }

        $heartbeatCount = SmeDailyHeartbeat::query()
            ->where('business_id', $business->id)
            ->count();
        $hasAssessment = $business->psychometricAssessments()->exists();
        $canApply = $heartbeatCount >= 45 && $hasAssessment;

        $existingApplication = LoanApplication::query()
            ->where('business_id', $business->id)
            ->latest()
            ->first();

        return Inertia::render('Borrower/LoanApplication', [
            'business' => [
                'id' => $business->id,
                'name' => $business->business_name,
                'sector' => $business->sector,
            ],
            'heartbeatDays' => $heartbeatCount,
            'canApply' => $canApply,
            'prerequisites' => [
                'heartbeatReady' => $heartbeatCount >= 45,
                'psychometricReady' => $hasAssessment,
            ],
            'checklist' => [
                'businessRegistered' => true,
                'heartbeatLoaded' => $heartbeatCount >= 45,
                'assessmentCompleted' => $hasAssessment,
                'applicationSubmitted' => $existingApplication !== null,
                'aiEvaluated' => $existingApplication && in_array($existingApplication->status, [
                    LoanApplication::STATUS_EVALUATED,
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_REJECTED,
                ], true),
                'decisionReceived' => $existingApplication && in_array($existingApplication->status, [
                    LoanApplication::STATUS_APPROVED,
                    LoanApplication::STATUS_REJECTED,
                ], true),
            ],
            'existingApplication' => $existingApplication ? [
                'id' => $existingApplication->id,
                'status' => $existingApplication->status,
                'requested_amount' => $existingApplication->requested_amount,
                'tenure_months' => $existingApplication->requested_tenure_months,
                'npv_credit_limit' => $existingApplication->npv_credit_limit,
                'apr' => $existingApplication->apr,
                'ai_risk_band' => $existingApplication->ai_risk_band,
                'created_at' => $existingApplication->created_at->toDateTimeString(),
            ] : null,
        ]);
    }

    public function store(Request $request, CreateLoanApplicationAction $action): RedirectResponse
    {
        $validated = $request->validate([
            'requested_amount' => ['required', 'numeric', 'min:10000', 'max:5000000'],
            'requested_tenure_months' => ['required', 'integer', 'in:6,12,18,24'],
            'purpose' => ['required', 'string', 'max:500'],
        ]);

        /** @var User $user */
        $user = auth()->user();
        $business = $user->businesses()->firstOrFail();

        $heartbeatCount = SmeDailyHeartbeat::query()
            ->where('business_id', $business->id)
            ->count();
        $hasAssessment = $business->psychometricAssessments()->exists();

        if ($heartbeatCount < 45 || ! $hasAssessment) {
            return redirect()
                ->route('loan-application')
                ->with('error', 'Complete transaction data and psychometric assessment before applying.');
        }

        $duplicate = LoanApplication::query()
            ->where('business_id', $business->id)
            ->whereNotIn('status', [
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_WITHDRAWN,
            ])
            ->exists();

        if ($duplicate) {
            return redirect()
                ->route('loan-application')
                ->with('error', 'You already have an active loan application.');
        }

        $application = $action->execute(new CreateLoanApplicationData(
            businessId: $business->id,
            requestedAmount: (float) $validated['requested_amount'],
            requestedTenureMonths: (int) $validated['requested_tenure_months'],
            idempotencyKey: $request->header('Idempotency-Key'),
        ));

        $application->update(['status' => LoanApplication::STATUS_QUEUED_FOR_AI]);

        return redirect()
            ->route('loan-application')
            ->with('success', 'Application submitted. Awaiting AI evaluation.');
    }
}
