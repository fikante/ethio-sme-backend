<?php

namespace App\Domain\Applications\Services;

use App\Models\ExogenousFactor;
use App\Models\PsychometricAssessment;

class NpvCalculationService
{
    /**
     * Compute NPV-based credit limit from DeepAR P10 cash flows.
     *
     * Formula: NPV = Σ [ CF_t / (1 + r)^t ]
     *
     * Where:
     *  - CF_t  = P10 pessimistic cash flow for period t (monthly)
     *  - r     = dynamic discount rate (NBE base rate + risk premium)
     *  - Risk premium is REDUCED by psychometric composite score
     *    (high conscientiousness → lower rate → higher credit limit)
     */
    public function compute(
        array $p10CashFlows,
        PsychometricAssessment $psychometric,
        float $riskScore
    ): array {
        $macroFactors = ExogenousFactor::latest();
        $baseRate     = $macroFactors?->nbe_policy_rate ?? config('app.nbe_base_policy_rate', 0.15);

        // Risk premium: starts at 8%, reduced by psychometric, increased by AI risk score
        $psychometricAdjustment = $psychometric->composite_score * 0.05; // max -5%
        $riskScoreAdjustment    = $riskScore * 0.06;                     // max +6%
        $riskPremium            = 0.08 - $psychometricAdjustment + $riskScoreAdjustment;

        $effectiveAnnualRate  = $baseRate + $riskPremium;
        $monthlyRate          = $effectiveAnnualRate / 12;

        $npv = 0.0;
        foreach ($p10CashFlows as $period => $cashFlow) {
            $t    = $period + 1; // 1-indexed
            $npv += $cashFlow / pow(1 + $monthlyRate, $t);
        }

        // Credit limit is the positive NPV, capped at 10x monthly average
        $monthlyAvg  = count($p10CashFlows) > 0
            ? array_sum($p10CashFlows) / count($p10CashFlows)
            : 0;
        $creditLimit = min(max($npv, 0), $monthlyAvg * 10);

        // APR = (1 + monthly_rate)^12 - 1
        $apr = pow(1 + $monthlyRate, 12) - 1;

        return [
            'npv_credit_limit'        => round($creditLimit, 2),
            'effective_discount_rate' => round($effectiveAnnualRate, 4),
            'apr'                     => round($apr, 4),
        ];
    }
}

