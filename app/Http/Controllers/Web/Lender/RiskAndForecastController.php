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
        $applications = LoanApplication::query()
            ->with(['business', 'valuation'])
            ->whereIn('status', [
                LoanApplication::STATUS_PROCESSING,
                LoanApplication::STATUS_QUEUED_FOR_AI,
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
                'business_uuid' => $app->business?->uuid,
                'ai_risk_score' => $app->ai_risk_score,
                'npv_credit_limit' => $app->npv_credit_limit,
                'p10' => $app->p10_cashflow_forecast,
                'p50' => $app->p50_cashflow_forecast,
                'valuation_status' => $app->valuation?->status,
                'inferred_at' => $app->valuation?->inferred_at?->toIso8601String(),
            ]);

        return Inertia::render('Lender/RiskAndForecast', [
            'applications' => $applications,
        ]);
    }
}
