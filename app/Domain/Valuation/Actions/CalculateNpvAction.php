<?php

namespace App\Domain\Valuation\Actions;

use App\Domain\Valuation\Data\NpvInputsData;
use App\Domain\Valuation\Data\NpvResultData;

/**
 * Pure NPV computation:
 *   NPV = Σ_{t=1..T} CF^P10_t / (1 + r_monthly)^t
 *
 * Discount rate r is derived as:
 *   r_annual = nbe_policy_rate
 *            + base_risk_premium
 *            - psychometric_relief * composite_score
 *            + xgboost_uplift * xgboost_score
 *
 * Final ETB credit limit is the positive NPV bounded by the configured monotone
 * mapping (config/valuation.php) — typically a multiple of trailing average CF.
 */
class CalculateNpvAction
{
    public function execute(NpvInputsData $inputs): NpvResultData
    {
        $config = (array) config('valuation', []);

        $baseRiskPremium = (float) ($config['base_risk_premium'] ?? 0.08);
        $psychometricRelief = (float) ($config['psychometric_relief'] ?? 0.05);
        $xgboostUplift = (float) ($config['xgboost_uplift'] ?? 0.06);
        $limitMultiple = (float) ($config['limit_multiple_of_avg_cf'] ?? 10.0);
        $minRate = (float) ($config['min_effective_rate'] ?? 0.05);
        $maxRate = (float) ($config['max_effective_rate'] ?? 0.60);

        $effectiveAnnualRate = max(
            $minRate,
            min(
                $maxRate,
                $inputs->nbePolicyRate
                + $baseRiskPremium
                - ($psychometricRelief * $inputs->psychometricCompositeScore)
                + ($xgboostUplift * $inputs->xgboostRiskScore)
            )
        );

        $monthlyRate = $effectiveAnnualRate / 12;
        $apr = pow(1 + $monthlyRate, 12) - 1;

        $npv = 0.0;
        foreach ($inputs->p10CashFlows as $period => $cashFlow) {
            $t = ((int) $period) + 1;
            $npv += ((float) $cashFlow) / pow(1 + $monthlyRate, $t);
        }

        $cashFlowCount = count($inputs->p10CashFlows);
        $monthlyAvg = $cashFlowCount > 0
            ? array_sum($inputs->p10CashFlows) / $cashFlowCount
            : 0.0;

        $mappedLimit = min(max($npv, 0), $monthlyAvg * $limitMultiple);

        return new NpvResultData(
            npvEtb: round($npv, 2),
            mappedLimitEtb: round($mappedLimit, 2),
            effectiveDiscountRate: round($effectiveAnnualRate, 4),
            apr: round($apr, 4),
        );
    }
}
