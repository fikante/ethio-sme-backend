<?php

namespace App\Http\Controllers\Web\Lender;

use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RiskAndForecastController extends Controller
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
            ->with('business')
            ->whereIn('status', [
                LoanApplication::STATUS_EVALUATED,
                LoanApplication::STATUS_PROCESSING,
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_REJECTED,
            ])
            ->orderByDesc('updated_at')
            ->limit(25)
            ->get()
            ->map(fn (LoanApplication $app) => [
                'id' => $app->id,
                'status' => $app->status,
                'business_name' => $app->business?->business_name,
            ]);

        return Inertia::render('Lender/RiskAndForecast', [
            'applications' => $applications,
            'application' => null,
        ]);
    }

    public function show(Request $request, LoanApplication $application): Response
    {
        $this->authorize('view', $application);

        $user = $request->user();
        if ($user->loan_provider_id !== null
            && $application->loan_provider_id !== $user->loan_provider_id) {
            abort(403, 'This application does not belong to your institution.');
        }

        if ($application->status === LoanApplication::STATUS_EVALUATED
            && $application->reviewed_by === null) {
            $application->update(['reviewed_by' => $user->id]);
        }

        $application->load(['business', 'valuation.shapExplanations', 'reviewer']);

        // #region agent log
        @file_put_contents(base_path('.cursor/debug-c09a18.log'), json_encode([
            'sessionId' => 'c09a18',
            'hypothesisId' => 'B',
            'location' => 'RiskAndForecastController::show',
            'message' => 'risk review page opened',
            'data' => [
                'applicationId' => $application->id,
                'status' => $application->status,
                'reviewed_by' => $application->reviewed_by,
                'decided_at' => $application->decided_at?->toDateTimeString(),
            ],
            'timestamp' => (int) round(microtime(true) * 1000),
        ])."\n", FILE_APPEND | LOCK_EX);
        // #endregion

        return Inertia::render('Lender/RiskAndForecast', [
            'applications' => [],
            'application' => $this->formatDetail($application),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function formatDetail(LoanApplication $application): array
    {
        $valuation = $application->valuation;
        $shap = $valuation?->shap_values ?? $application->shap_values ?? [];
        if ($shap === [] && $valuation !== null) {
            $shap = $valuation->shapExplanations
                ->mapWithKeys(fn ($row) => [$row->feature_key => (float) $row->shap_value])
                ->all();
        }

        return [
            'id' => $application->id,
            'status' => $application->status,
            'requested_amount' => $application->requested_amount,
            'business_name' => $application->business?->business_name,
            'business_uuid' => $application->business?->uuid,
            'ai_risk_band' => $application->ai_risk_band ?? $valuation?->xgboost_class,
            'ai_risk_score' => $application->ai_risk_score ?? $application->snapshot_risk_score ?? $valuation?->xgboost_score,
            'prob_default' => $application->prob_default ?? $valuation?->prob_default,
            'npv_credit_limit' => $application->npv_credit_limit ?? $application->snapshot_limit_etb ?? $valuation?->mapped_limit_etb,
            'forecaster_mode' => $valuation?->forecaster_mode,
            'is_degraded' => $application->isDegradedEvaluation(),
            'p10_cashflow_forecast' => $valuation?->p10_series ?? $application->p10_cashflow_forecast ?? [],
            'p50_cashflow_forecast' => $valuation?->p50_series ?? $application->p50_cashflow_forecast ?? [],
            'p90_cashflow_forecast' => $valuation?->p90_series ?? $application->p90_cashflow_forecast ?? [],
            'shap_values' => $shap,
            'reason_codes' => $valuation?->reason_codes ?? $application->reason_codes ?? [],
            'contract_version' => $valuation?->contract_version ?? $application->contract_version ?? 'v1',
            'model_versions' => $valuation?->model_versions ?? $application->model_versions ?? [],
            'shap_integrity_passed' => $valuation?->shap_integrity_passed,
            'feature_snapshot_hash' => $valuation?->feature_snapshot_hash ?? $application->feature_snapshot_hash,
            'inferred_at' => $valuation?->inferred_at?->toIso8601String(),
            'horizon_reliability_warning' => (bool) ($valuation?->horizon_reliability_warning ?? false),
            'horizon_reliability_message' => $valuation?->horizon_reliability_message,
            'decided_at' => $application->decided_at?->toDateTimeString(),
            'reviewer_name' => $application->reviewer?->name,
            'rejection_narrative' => $application->rejection_narrative,
        ];
    }
}
