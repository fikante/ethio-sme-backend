<?php

namespace App\Http\Controllers\Web\Lender;

use App\Domain\Lending\Actions\SubmitLoanDecisionAction;
use App\Domain\Lending\Data\LoanDecisionData;
use App\Domain\Lending\Enums\DecisionOutcome;
use App\Domain\Lending\Requests\StoreWebLoanDecisionRequest;
use App\Domain\Valuation\Services\ShapLabelService;
use App\Http\Controllers\Controller;
use App\Models\LoanApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DecisioningController extends Controller
{
    public function xaiDashboard(Request $request): Response
    {
        $user = $request->user();
        $providerId = $user->loan_provider_id;

        if ($providerId === null) {
            abort(403, 'No loan provider associated with your account.');
        }

        // ----------------------------------------------------------------
        // Section 1 — Model Performance Stats
        // ----------------------------------------------------------------
        $evaluatedStatuses = [
            LoanApplication::STATUS_EVALUATED,
            LoanApplication::STATUS_APPROVED,
            LoanApplication::STATUS_REJECTED,
        ];

        $totalEvaluated = LoanApplication::forProvider($providerId)
            ->whereIn('status', $evaluatedStatuses)
            ->count();

        // ai_risk_score is a virtual attribute computed from the valuation join;
        // query the valuations table directly through the relationship for aggregates.
        $avgRiskScoreRaw = LoanApplication::forProvider($providerId)
            ->whereNotNull('snapshot_risk_score')
            ->avg('snapshot_risk_score');

        // Also check via joined valuations for the canonical score
        $avgRiskScoreViaValuation = DB::table('loan_applications')
            ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->whereNotNull('valuations.ai_risk_score')
            ->avg('valuations.ai_risk_score');

        $avgRiskScoreRaw = $avgRiskScoreViaValuation ?? $avgRiskScoreRaw;
        $avgRiskScore = $avgRiskScoreRaw !== null ? round((float) $avgRiskScoreRaw * 100, 2) : null;

        $approvedCount = LoanApplication::forProvider($providerId)
            ->where('status', LoanApplication::STATUS_APPROVED)
            ->count();

        $rejectedCount = LoanApplication::forProvider($providerId)
            ->where('status', LoanApplication::STATUS_REJECTED)
            ->count();

        $decidedTotal = $approvedCount + $rejectedCount;
        $approvalRate = $decidedTotal > 0 ? round(($approvedCount / $decidedTotal) * 100, 2) : null;

        $avgApprovedLimit = DB::table('loan_applications')
            ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->where('loan_applications.status', LoanApplication::STATUS_APPROVED)
            ->whereNotNull('valuations.npv_credit_limit')
            ->avg('valuations.npv_credit_limit');

        // Fallback: snapshot column if no valuation join data
        if ($avgApprovedLimit === null) {
            $avgApprovedLimit = LoanApplication::forProvider($providerId)
                ->where('status', LoanApplication::STATUS_APPROVED)
                ->whereNotNull('snapshot_limit_etb')
                ->avg('snapshot_limit_etb');
        }

        $shapPassTotal = DB::table('loan_applications')
            ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->whereIn('loan_applications.status', $evaluatedStatuses)
            ->count();

        $shapPassCount = DB::table('loan_applications')
            ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->whereIn('loan_applications.status', $evaluatedStatuses)
            ->where('valuations.shap_integrity_passed', true)
            ->count();

        $shapIntegrityPassRate = $shapPassTotal > 0 ? round(($shapPassCount / $shapPassTotal) * 100, 2) : null;

        $stats = [
            'totalEvaluated' => $totalEvaluated,
            'avgRiskScore' => $avgRiskScore,
            'approvalRate' => $approvalRate,
            'avgApprovedLimit' => $avgApprovedLimit !== null ? (float) $avgApprovedLimit : null,
            'shapIntegrityPassRate' => $shapIntegrityPassRate,
        ];

        // ----------------------------------------------------------------
        // Section 2 — Risk Score Histogram (10 buckets)
        // ----------------------------------------------------------------
        $riskHistogram = collect(range(0, 9))->map(function ($i) use ($providerId) {
            $min = $i * 0.1;
            $max = $min + 0.1;
            $upperBound = $i === 9 ? 1.0 : ($max - 0.0001);

            $count = DB::table('loan_applications')
                ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
                ->where('loan_applications.loan_provider_id', $providerId)
                ->whereNotNull('valuations.ai_risk_score')
                ->whereBetween('valuations.ai_risk_score', [$min, $upperBound])
                ->count();

            return [
                'bucket' => number_format($min, 1).'–'.number_format($max, 1),
                'count' => $count,
                'min' => $min,
            ];
        })->all();

        // ----------------------------------------------------------------
        // Section 3 — Global SHAP Feature Importance
        // ----------------------------------------------------------------
        // Primary: shap_explanations table (normalised rows)
        $shapFromTable = DB::table('shap_explanations')
            ->join('valuations', 'shap_explanations.valuation_id', '=', 'valuations.id')
            ->join('loan_applications', 'valuations.id', '=', 'loan_applications.valuation_id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->select(
                'shap_explanations.feature_key',
                DB::raw('AVG(ABS(shap_explanations.shap_value)) as mean_abs_shap'),
                DB::raw('AVG(shap_explanations.shap_value) as mean_shap'),
            )
            ->groupBy('shap_explanations.feature_key')
            ->orderByDesc('mean_abs_shap')
            ->limit(15)
            ->get();

        if ($shapFromTable->isNotEmpty()) {
            $shapImportance = $shapFromTable->map(fn ($r) => [
                'feature_key' => $r->feature_key,
                'feature_label' => ShapLabelService::toLabel($r->feature_key),
                'mean_abs_shap' => (float) $r->mean_abs_shap,
                'mean_shap' => (float) $r->mean_shap,
            ])->values()->all();
        } else {
            // Fallback: aggregate from JSON shap_values column on valuations
            $valuationShapRows = DB::table('loan_applications')
                ->join('valuations', 'loan_applications.valuation_id', '=', 'valuations.id')
                ->where('loan_applications.loan_provider_id', $providerId)
                ->whereNotNull('valuations.shap_values')
                ->pluck('valuations.shap_values');

            $featureSums = [];
            $featureCounts = [];

            foreach ($valuationShapRows as $raw) {
                $decoded = is_string($raw) ? json_decode($raw, true) : (array) $raw;
                if (! is_array($decoded)) {
                    continue;
                }
                foreach ($decoded as $feature => $value) {
                    $floatVal = (float) $value;
                    $featureSums[$feature] = ($featureSums[$feature] ?? 0) + abs($floatVal);
                    $featureCounts[$feature] = ($featureCounts[$feature] ?? 0) + 1;
                }
            }

            $shapImportance = collect($featureSums)
                ->map(fn ($sum, $feature) => [
                    'feature_key' => $feature,
                    'feature_label' => ShapLabelService::toLabel($feature),
                    'mean_abs_shap' => $featureCounts[$feature] > 0
                        ? round($sum / $featureCounts[$feature], 6)
                        : 0.0,
                    'mean_shap' => 0.0, // direction unavailable in this fallback path
                ])
                ->sortByDesc('mean_abs_shap')
                ->take(15)
                ->values()
                ->all();
        }

        // ----------------------------------------------------------------
        // Section 4 — Credit Limit Calibration
        // ----------------------------------------------------------------
        $calibrationData = LoanApplication::forProvider($providerId)
            ->with('business:id,business_name')
            ->whereNotNull('valuation_id')
            ->whereNotNull('ai_risk_band')
            ->whereIn('status', $evaluatedStatuses)
            ->get(['id', 'requested_amount', 'valuation_id', 'ai_risk_band', 'business_id'])
            ->map(function ($a) {
                $limit = $a->valuation?->npv_credit_limit ?? $a->snapshot_limit_etb;

                if ($limit === null) {
                    return null;
                }

                return [
                    'id' => $a->id,
                    'requested' => (float) $a->requested_amount,
                    'limit' => (float) $limit,
                    'band' => $a->ai_risk_band,
                    'business' => $a->business?->business_name,
                ];
            })
            ->filter()
            ->values();

        // ----------------------------------------------------------------
        // Section 5 — Decision Audit Trail (paginated)
        // ----------------------------------------------------------------
        $decisions = LoanApplication::forProvider($providerId)
            ->with(['business:id,business_name', 'reviewer:id,name'])
            ->whereIn('status', [LoanApplication::STATUS_APPROVED, LoanApplication::STATUS_REJECTED])
            ->orderByDesc('decided_at')
            ->paginate(15)
            ->through(fn ($a) => [
                'id' => $a->id,
                'decided_at' => $a->decided_at?->toDateString(),
                'business_name' => $a->business?->business_name,
                'requested_amount' => (float) $a->requested_amount,
                'ai_risk_band' => $a->ai_risk_band,
                'npv_credit_limit' => $a->npv_credit_limit !== null ? (float) $a->npv_credit_limit : null,
                'status' => $a->status,
                'reviewer_name' => $a->reviewer?->name,
                'rejection_reason_code' => $a->rejection_reason_code,
                'officer_notes' => $a->officer_notes,
            ]);

        // ----------------------------------------------------------------
        // Section 6 — Sector Approval Rates
        // ----------------------------------------------------------------
        $sectorStats = DB::table('loan_applications')
            ->join('businesses', 'loan_applications.business_id', '=', 'businesses.id')
            ->where('loan_applications.loan_provider_id', $providerId)
            ->whereIn('loan_applications.status', [
                LoanApplication::STATUS_APPROVED,
                LoanApplication::STATUS_REJECTED,
            ])
            ->whereNull('loan_applications.deleted_at')
            ->select(
                'businesses.sector',
                DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN loan_applications.status = 'approved' THEN 1 ELSE 0 END) as approved_count"),
            )
            ->groupBy('businesses.sector')
            ->get()
            ->map(fn ($r) => [
                'sector' => $r->sector ?: 'Unknown',
                'total' => (int) $r->total,
                'approved' => (int) $r->approved_count,
                'approval_rate' => $r->total > 0 ? round(($r->approved_count / $r->total) * 100, 1) : 0.0,
            ])
            ->values()
            ->all();

        return Inertia::render('Lender/DecisioningAndXAI', [
            'stats' => $stats,
            'riskHistogram' => $riskHistogram,
            'shapImportance' => $shapImportance,
            'calibrationData' => $calibrationData,
            'decisions' => $decisions,
            'sectorStats' => $sectorStats,
        ]);
    }

    public function show(LoanApplication $application): Response
    {
        $this->authorize('view', $application);

        $user = auth()->user();
        if ($user->loan_provider_id !== null
            && $application->loan_provider_id !== $user->loan_provider_id) {
            abort(403, 'This application does not belong to your institution.');
        }

        return Inertia::render('Lender/DecisioningAndXAI', [
            'application' => $this->formatApplication($application->load(['business', 'valuation.shapExplanations'])),
        ]);
    }

    public function decide(
        StoreWebLoanDecisionRequest $request,
        LoanApplication $application,
        SubmitLoanDecisionAction $action,
    ): RedirectResponse|JsonResponse {
        $this->authorize('decide', $application);

        if ($application->status !== LoanApplication::STATUS_EVALUATED) {
            if ($request->wantsJson()) {
                return response()->json(
                    ['error' => "Application must be in 'evaluated' state to receive a decision."],
                    422,
                );
            }

            return back()->withErrors(['decision' => "Application must be in 'evaluated' state to receive a decision."], 422);
        }

        $user = $request->user();
        if ($user->loan_provider_id !== null
            && $application->loan_provider_id !== $user->loan_provider_id) {
            abort(403, 'This application does not belong to your institution.');
        }

        if ($request->input('decision') === 'rejected') {
            $this->authorize('rejectWithReason', $application);
        }

        $data = LoanDecisionData::fromWebRequest($request, $user->id);
        $application = $action->execute($application, $data);

        $outcome = $data->outcome === DecisionOutcome::Approved ? 'approved' : 'rejected';
        $message = "Application {$outcome} successfully.";

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => $message,
                'status' => $application->status,
            ]);
        }

        return redirect()
            ->route('applications.pipeline')
            ->with('success', $message);
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
