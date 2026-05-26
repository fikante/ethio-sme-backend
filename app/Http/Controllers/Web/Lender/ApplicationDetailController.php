<?php

namespace App\Http\Controllers\Web\Lender;

use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApplicationDetailController extends Controller
{
    public function show(Request $request, LoanApplication $application): JsonResponse
    {
        $user = $request->user();

        if ($user->loan_provider_id !== null
            && $application->loan_provider_id !== $user->loan_provider_id) {
            abort(403, 'This application does not belong to your institution.');
        }

        $this->authorize('view', $application);

        $application->load([
            'business',
            'business.psychometricAssessment',
            'valuation.shapExplanations',
            'reviewer',
            'loanProvider',
        ]);

        $business = $application->business;

        // Compute data coverage days
        $dataCoverageDays = 0;
        if ($business !== null) {
            $fkColumn = SupabaseHeartbeatSchema::businessFkColumn();
            $fkValue = SupabaseHeartbeatSchema::businessFkValue($business);
            $dataCoverageDays = SmeDailyHeartbeat::query()
                ->where($fkColumn, $fkValue)
                ->count();
        }

        $valuation = $application->valuation;

        // Resolve SHAP values: prefer valuation shap_values, fall back to shapExplanations rows
        $shap = $valuation?->shap_values ?? [];
        if (($shap === [] || $shap === null) && $valuation !== null) {
            $shap = $valuation->shapExplanations
                ->mapWithKeys(fn ($row) => [$row->feature_key => (float) $row->shap_value])
                ->all();
        }

        $psychometric = $business?->psychometricAssessment;

        return response()->json([
            'id' => $application->id,
            'status' => $application->status,
            'requested_amount' => $application->requested_amount,
            'requested_tenure_months' => $application->requested_tenure_months,
            'is_degraded' => $application->isDegradedEvaluation(),

            // AI scores
            'ai_risk_band' => $application->ai_risk_band ?? $valuation?->xgboost_class,
            'ai_risk_score' => $application->ai_risk_score ?? $application->snapshot_risk_score ?? $valuation?->xgboost_score,
            'prob_default' => $application->prob_default ?? $valuation?->prob_default,
            'npv_credit_limit' => $application->npv_credit_limit ?? $application->snapshot_limit_etb ?? $valuation?->mapped_limit_etb,

            // Forecasts
            'p10_cashflow_forecast' => $valuation?->p10_series ?? $application->p10_cashflow_forecast ?? [],
            'p50_cashflow_forecast' => $valuation?->p50_series ?? $application->p50_cashflow_forecast ?? [],
            'p90_cashflow_forecast' => $valuation?->p90_series ?? $application->p90_cashflow_forecast ?? [],

            // SHAP & reason codes
            'shap_values' => $shap ?: [],
            'reason_codes' => $valuation?->reason_codes ?? $application->reason_codes ?? [],
            'shap_integrity_passed' => $valuation?->shap_integrity_passed,

            // Inference metadata
            'contract_version' => $valuation?->contract_version ?? $application->contract_version ?? 'v1',
            'model_versions' => $valuation?->model_versions ?? $application->model_versions ?? [],
            'feature_snapshot_hash' => $valuation?->feature_snapshot_hash ?? $application->feature_snapshot_hash,
            'inferred_at' => $valuation?->inferred_at?->toIso8601String(),
            'forecaster_mode' => $valuation?->forecaster_mode,
            'horizon_reliability_warning' => (bool) ($valuation?->horizon_reliability_warning ?? false),
            'horizon_reliability_message' => $valuation?->horizon_reliability_message,

            // Decision info
            'decided_at' => $application->decided_at?->toDateTimeString(),
            'reviewer_name' => $application->reviewer?->name,
            'rejection_narrative' => $application->rejection_narrative,
            'rejection_reason_code' => $application->rejection_reason_code,
            'officer_notes' => $application->officer_notes,

            // Business profile
            'business_name' => $business?->business_name,
            'sector' => $business?->sector,
            'sub_city' => $business?->sub_city,
            'established_year' => $business?->established_year,
            'employee_count' => $business?->employee_count,
            'premises_status' => $business?->premises_status,
            'data_coverage_days' => $dataCoverageDays,

            // Loan provider
            'loan_provider_name' => $application->loanProvider?->name,

            // Dates
            'created_at' => $application->created_at?->toDateTimeString(),

            // Psychometric scores (stored as 0-1, multiply × 100 for display)
            'psychometric' => $psychometric ? [
                'integrity_score' => $psychometric->integrity_score !== null ? (float) $psychometric->integrity_score * 100 : null,
                'conscientiousness_score' => $psychometric->conscientiousness_score !== null ? (float) $psychometric->conscientiousness_score * 100 : null,
                'delayed_gratification_score' => $psychometric->delayed_gratification_score !== null ? (float) $psychometric->delayed_gratification_score * 100 : null,
                'financial_risk_score' => $psychometric->financial_risk_score !== null ? (float) $psychometric->financial_risk_score * 100 : null,
            ] : null,
        ]);
    }
}
