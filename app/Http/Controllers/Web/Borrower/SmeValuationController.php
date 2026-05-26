<?php

namespace App\Http\Controllers\Web\Borrower;

use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Domain\Valuation\Actions\RunValuationAction;
use App\Domain\Valuation\Services\ShapLabelService;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\Valuation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SmeValuationController extends Controller
{
    public function index(Request $request): Response
    {
        $businesses = Business::query()
            ->ownedBy($request->user()->id)
            ->with(['latestValuation', 'loanApplications'])
            ->orderByDesc('created_at')
            ->get();

        $primary = $businesses->first();
        $latestValuation = $primary?->latestValuation;

        return Inertia::render('Borrower/SmeValuation', [
            'businesses' => $businesses->map(fn (Business $b) => [
                'id'            => $b->id,
                'uuid'          => $b->uuid,
                'business_name' => $b->business_name,
                'sector'        => $b->sector,
                'sub_city'      => $b->sub_city,
            ]),
            'valuation'       => $latestValuation
                ? $this->buildSmeOwnerView($latestValuation, $primary)
                : null,
            'canRunValuation' => $primary !== null && $this->hasRunnableApplication($primary),
        ]);
    }

    public function run(Request $request, Business $business, RunValuationAction $action): RedirectResponse
    {
        $this->authorize('run', $business);

        $application = LoanApplication::query()
            ->where('business_id', $business->id)
            ->whereIn('status', [LoanApplication::STATUS_QUEUED_FOR_AI, LoanApplication::STATUS_PENDING_DATA_SYNC])
            ->latest()
            ->first();

        if ($application === null) {
            return back()->with('error', 'No loan application is ready for AI valuation.');
        }

        $valuation = $action->execute($application, $request->header('Idempotency-Key'));

        if ($valuation->isFailed()) {
            return back()->with('error', 'Valuation failed.');
        }

        return back()->with('success', 'Valuation completed successfully.');
    }

    private function hasRunnableApplication(Business $business): bool
    {
        return LoanApplication::query()
            ->where('business_id', $business->id)
            ->whereIn('status', [LoanApplication::STATUS_QUEUED_FOR_AI, LoanApplication::STATUS_PENDING_DATA_SYNC])
            ->exists();
    }

    /**
     * Build the sanitised SME-owner-safe view.
     * NEVER exposes: npv_etb, npv_credit_limit, approved_limit, xgboost_score,
     *                prob_default, dscr_p10, raw P10/P50/P90 series values.
     *
     * @return array<string, mixed>
     */
    private function buildSmeOwnerView(Valuation $valuation, Business $business): array
    {
        // --- SHAP drivers ---
        $shapRaw = is_array($valuation->shap_values)
            ? $valuation->shap_values
            : (json_decode($valuation->shap_values ?? 'null', true) ?? []);
        $shapDrivers = ShapLabelService::categorise($shapRaw, 3);

        // --- Forecast chart data (shape/trend only, not raw credit amounts) ---
        $p50 = is_array($valuation->p50_cashflow_forecast)
            ? $valuation->p50_cashflow_forecast
            : (json_decode($valuation->p50_cashflow_forecast ?? '[]', true) ?? []);
        $p10 = is_array($valuation->p10_cashflow_forecast)
            ? $valuation->p10_cashflow_forecast
            : (json_decode($valuation->p10_cashflow_forecast ?? '[]', true) ?? []);
        $p90 = is_array($valuation->p90_cashflow_forecast)
            ? $valuation->p90_cashflow_forecast
            : (json_decode($valuation->p90_cashflow_forecast ?? '[]', true) ?? []);

        $horizonDays = count($p50);
        $forecastChartData = [];

        for ($i = 0; $i < $horizonDays; $i++) {
            $forecastChartData[] = [
                'day'        => 'Day ' . ($i + 1),
                'expected'   => isset($p50[$i]) ? round((float) $p50[$i], 2) : null,
                'range_low'  => isset($p10[$i]) ? round((float) $p10[$i], 2) : null,
                'range_high' => isset($p90[$i]) ? round((float) $p90[$i], 2) : null,
            ];
        }

        // --- Band config ---
        $riskBand   = $valuation->ai_risk_band ?? 'unknown';
        $bandConfig = match ($riskBand) {
            'low'    => [
                'label'      => 'Strong financial profile',
                'color'      => 'green',
                'score_hint' => 'Your business shows strong cash flow patterns.',
            ],
            'medium' => [
                'label'      => 'Moderate financial profile',
                'color'      => 'amber',
                'score_hint' => 'Your business shows moderate financial stability.',
            ],
            'high'   => [
                'label'      => 'Profile requires attention',
                'color'      => 'red',
                'score_hint' => 'Focus on improving cash flow consistency.',
            ],
            default  => [
                'label'      => 'Evaluation complete',
                'color'      => 'zinc',
                'score_hint' => '',
            ],
        };

        // --- Cash flow metrics from heartbeat (not raw model outputs) ---
        $avgNet30d = 0.0;
        $posRatio  = 0.0;
        $avgTxn14d = 0.0;

        $fkCol  = SupabaseHeartbeatSchema::businessFkColumn();
        $fkVal  = SupabaseHeartbeatSchema::businessFkValue($business);
        $datCol = SupabaseHeartbeatSchema::dateColumn();
        $txnCol = SupabaseHeartbeatSchema::txnCountColumn();

        $recent30 = SmeDailyHeartbeat::query()
            ->where($fkCol, $fkVal)
            ->orderBy($datCol, 'desc')
            ->limit(30)
            ->get(['net_cashflow', $txnCol]);

        if ($recent30->isNotEmpty()) {
            $avgNet30d   = round((float) ($recent30->avg('net_cashflow') ?? 0), 2);
            $totalDays   = $recent30->count();
            $positiveDays = $recent30->where('net_cashflow', '>', 0)->count();
            $posRatio    = $totalDays > 0 ? round($positiveDays / $totalDays * 100, 1) : 0.0;
        }

        $recent14TxnAvg = SmeDailyHeartbeat::query()
            ->where($fkCol, $fkVal)
            ->orderBy($datCol, 'desc')
            ->limit(14)
            ->avg($txnCol);
        $avgTxn14d = round((float) ($recent14TxnAvg ?? 0), 1);

        // --- Psychometric composite score ---
        // composite_score is stored as 0–1 decimal; the UI renders it as /100
        $psycho      = $business->psychometricAssessments()->latest('completed_at')->first();
        $psychoScore = $psycho?->composite_score !== null
            ? round((float) $psycho->composite_score * 100, 1)
            : null;

        // --- Next steps based on loan application status ---
        $loanApp   = $valuation->loanApplication ?? $business->loanApplications()->latest()->first();
        $appStatus = $loanApp?->status ?? 'evaluated';

        $nextSteps = match (true) {
            $appStatus === 'approved' => [
                'Your loan officer will contact you shortly.',
                'Ensure your contact details and business registration are up to date.',
                'Review the loan terms carefully before signing.',
            ],
            in_array($appStatus, ['evaluated', 'processing', 'queued_for_ai']) => [
                'Your evaluation is complete. A loan officer is reviewing your results.',
                'You will be notified of the decision via your registered contact.',
            ],
            $riskBand === 'high' => array_filter([
                'Focus on maintaining positive daily cash flow.',
                isset($shapDrivers['drags'][0]) ? 'Work on: ' . $shapDrivers['drags'][0]['label'] : null,
                isset($shapDrivers['drags'][1]) ? 'Improve: ' . $shapDrivers['drags'][1]['label'] : null,
            ]),
            default => [
                'Your evaluation results are ready.',
                'A loan officer will review your application and contact you.',
            ],
        };

        return [
            // Explicitly excluded: npv_etb, npv_credit_limit, approved_limit,
            //                      xgboost_score, prob_default, dscr_p10
            'evaluated_at'    => $valuation->inferred_at instanceof \Carbon\Carbon
                ? $valuation->inferred_at->toDateTimeString()
                : (string) ($valuation->inferred_at ?? ''),
            'band_label'      => $bandConfig['label'],
            'band_color'      => $bandConfig['color'],
            'band_score_hint' => $bandConfig['score_hint'],
            'forecast_chart'  => $forecastChartData,
            'horizon_days'    => $horizonDays,
            'shap_drivers'    => $shapDrivers,
            'avg_net_30d'     => $avgNet30d,
            'positive_ratio'  => $posRatio,
            'avg_txn_14d'     => $avgTxn14d,
            'psycho_score'    => $psychoScore,
            'next_steps'      => array_values($nextSteps),
            'app_status'      => $appStatus,
            'horizon_warning' => (bool) ($valuation->horizon_reliability_warning ?? false),
        ];
    }
}
