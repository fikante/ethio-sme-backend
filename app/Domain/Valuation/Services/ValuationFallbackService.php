<?php

namespace App\Domain\Valuation\Services;

use App\Domain\Valuation\Data\InferenceResponseData;
use App\Models\LoanApplication;
use Illuminate\Support\Str;

/**
 * Deterministic fallback when the live AI service is unreachable.
 */
class ValuationFallbackService
{
    public function build(LoanApplication $application): InferenceResponseData
    {
        $business = $application->business;
        $horizon = 30;
        $zeros = array_fill(0, $horizon, 0.0);

        return new InferenceResponseData(
            requestId: (string) Str::uuid(),
            p10Series: $zeros,
            p50Series: $zeros,
            p90Series: $zeros,
            xgboostScore: 0.55,
            xgboostClass: 'medium',
            probDefault: 0.12,
            shapValues: [
                'transaction_count' => -0.15,
                'payment_completion_rate' => -0.08,
            ],
            modelVersions: ['forecaster' => 'fallback', 'scorer' => 'fallback', 'lstm' => 'fallback'],
            reasonCodes: [
                ['code' => 'RC-FALLBACK', 'message' => 'AI service unreachable; rule-based fallback applied'],
            ],
            forecasterMode: 'degraded',
            contractVersion: 'v1',
            npvCreditLimit: null,
            effectiveDiscountRate: null,
            cashflowHaircut: (float) config('valuation.cashflow_haircut', 0.30),
            dscrP10: null,
            shapIntegrityPassed: false,
            featureSnapshotHash: null,
            inferredAt: now()->toIso8601String(),
            horizonReliabilityWarning: true,
            horizonReliabilityMessage: 'Fallback valuation — reconnect AI service for full inference',
            isFallback: true,
        );
    }
}
