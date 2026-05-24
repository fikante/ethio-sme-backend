<?php

namespace App\Http\Controllers\Web\Borrower;

use App\Domain\Valuation\Actions\RunValuationAction;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
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
            ->with(['latestValuation.shapExplanations', 'loanApplications.valuation'])
            ->orderByDesc('created_at')
            ->get();

        $primary = $businesses->first();
        $latestValuation = $primary?->latestValuation;
        if ($latestValuation !== null) {
            $latestValuation->load('shapExplanations');
        }

        return Inertia::render('Borrower/SmeValuation', [
            'businesses' => $businesses->map(fn (Business $b) => [
                'id' => $b->id,
                'uuid' => $b->uuid,
                'business_name' => $b->business_name,
                'sector' => $b->sector,
                'sub_city' => $b->sub_city,
            ]),
            'valuation' => $latestValuation ? $this->formatValuation($latestValuation) : null,
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
     * @return array<string, mixed>
     */
    private function formatValuation(Valuation $valuation): array
    {
        return [
            'id' => $valuation->id,
            'status' => $valuation->status,
            'inferred_at' => $valuation->inferred_at?->toIso8601String(),
            'npv_etb' => $valuation->npv_etb,
            'mapped_limit_etb' => $valuation->mapped_limit_etb,
            'xgboost_score' => $valuation->xgboost_score,
            'xgboost_class' => $valuation->xgboost_class,
            'p10_series' => $valuation->p10_series,
            'p50_series' => $valuation->p50_series,
            'p90_series' => $valuation->p90_series,
            'model_versions' => $valuation->model_versions,
            'shap' => $valuation->shapExplanations->map(fn ($row) => [
                'feature' => $row->feature_key,
                'value' => (float) $row->shap_value,
            ])->values(),
        ];
    }
}
