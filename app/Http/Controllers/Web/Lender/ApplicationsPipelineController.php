<?php

namespace App\Http\Controllers\Web\Lender;

use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Domain\Valuation\Actions\RunValuationAction;
use App\Domain\Valuation\Exceptions\AiEngineException;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class ApplicationsPipelineController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewPipeline', LoanApplication::class);

        $loanProviderId = $request->user()->loan_provider_id;
        if ($loanProviderId === null) {
            abort(403, 'Your account is not associated with a loan provider.');
        }

        $applications = LoanApplication::query()
            ->forProvider($loanProviderId)
            ->with(['business', 'business.psychometricAssessment', 'valuation'])
            ->whereIn('status', [
                LoanApplication::STATUS_DRAFT,
                LoanApplication::STATUS_SUBMITTED,
                LoanApplication::STATUS_PENDING_PSYCHOMETRIC,
                LoanApplication::STATUS_PENDING_DATA_SYNC,
                LoanApplication::STATUS_QUEUED_FOR_AI,
                LoanApplication::STATUS_PROCESSING,
                LoanApplication::STATUS_EVALUATED,
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_WITHDRAWN,
            ])
            ->orderByRaw("CASE status
                WHEN 'queued_for_ai' THEN 1
                WHEN 'processing' THEN 2
                WHEN 'evaluated' THEN 3
                WHEN 'submitted' THEN 4
                ELSE 5 END")
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(function (LoanApplication $app) {
                $hasDecision = $app->decided_at !== null
                    || in_array($app->status, [
                        LoanApplication::STATUS_APPROVED,
                        LoanApplication::STATUS_REJECTED,
                    ], true);
                $hasRiskReview = $app->reviewed_by !== null;
                $canReview = $app->status === LoanApplication::STATUS_EVALUATED
                    && ! $hasDecision
                    && ! $hasRiskReview;

                $business = $app->business;

                // Compute heartbeat data coverage days using the correct FK column
                $dataCoverageDays = 0;
                if ($business !== null) {
                    $fkColumn = SupabaseHeartbeatSchema::businessFkColumn();
                    $fkValue = SupabaseHeartbeatSchema::businessFkValue($business);
                    $dataCoverageDays = SmeDailyHeartbeat::query()
                        ->where($fkColumn, $fkValue)
                        ->count();
                }

                // Psychometric: completed if assessment exists and completed_at is set
                $psychometricComplete = false;
                if ($business !== null && $business->psychometricAssessment !== null) {
                    $psychometricComplete = $business->psychometricAssessment->completed_at !== null;
                }

                return [
                    'id' => $app->id,
                    'status' => $app->status,
                    'business_name' => $business?->business_name,
                    'sector' => $business?->sector,
                    'requested_amount' => $app->requested_amount,
                    'requested_tenure_months' => $app->requested_tenure_months,
                    'ai_risk_band' => $app->ai_risk_band,
                    'ai_risk_score' => $app->ai_risk_score ?? $app->snapshot_risk_score,
                    'npv_credit_limit' => $app->npv_credit_limit ?? $app->snapshot_limit_etb,
                    'is_degraded' => $app->isDegradedEvaluation(),
                    'created_at' => $app->created_at->toDateTimeString(),
                    'submitted_at' => $app->created_at->toIso8601String(),
                    'data_coverage_days' => $dataCoverageDays,
                    'psychometric_complete' => $psychometricComplete,
                    'can_run_ai' => in_array($app->status, [
                        LoanApplication::STATUS_QUEUED_FOR_AI,
                        LoanApplication::STATUS_SUBMITTED,
                        LoanApplication::STATUS_PROCESSING,
                    ], true),
                    'can_review' => $canReview,
                    'is_reviewed' => $hasDecision || $hasRiskReview,
                    'can_view_review' => $app->status === LoanApplication::STATUS_EVALUATED
                        && $hasRiskReview
                        && ! $hasDecision,
                ];
            });

        return Inertia::render('Lender/ApplicationsPipeline', [
            'applications' => $applications,
        ]);
    }

    public function evaluate(
        Request $request,
        LoanApplication $application,
        RunValuationAction $action,
    ): RedirectResponse {
        $this->authorize('evaluate', $application);

        if (! in_array($application->status, [
            LoanApplication::STATUS_QUEUED_FOR_AI,
            LoanApplication::STATUS_SUBMITTED,
            LoanApplication::STATUS_PROCESSING,
        ], true)) {
            return back()->with('error', 'Application is not eligible for AI evaluation.');
        }

        try {
            $action->execute($application);
        } catch (AiEngineException $e) {
            Log::error('AI evaluation AiEngineException', [
                'application_id' => $application->id,
                'code' => $e->errorCode,
                'message' => $e->getMessage(),
            ]);

            return back()->with('error', 'AI evaluation failed: '.$e->getMessage());
        } catch (\Throwable $e) {
            Log::error('AI evaluation failed', [
                'application_id' => $application->id,
                'message' => $e->getMessage(),
            ]);

            return back()->with('error', 'AI evaluation failed: '.$e->getMessage());
        }

        $application->refresh();
        $message = $application->isDegradedEvaluation()
            ? 'AI evaluation completed in degraded mode — review before deciding.'
            : 'AI evaluation completed successfully.';

        return redirect()
            ->route('applications.pipeline')
            ->with('success', $message);
    }
}
