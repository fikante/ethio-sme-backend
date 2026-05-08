<?php

namespace App\Domain\Valuation\Support;

use App\Domain\Lending\Enums\ReasonCode;

/**
 * Translates SHAP feature contributions into the canonical PRD §14.3 adverse
 * action reason-code catalog. Pure / stateless.
 */
class ReasonCodeBuilder
{
    /**
     * Negative SHAP signal threshold below which a feature is considered a "drag"
     * worth surfacing to the officer.
     */
    private const NEGATIVE_THRESHOLD = -0.05;

    /**
     * Map SHAP feature keys returned by the FastAPI inference service to canonical
     * PRD reason codes. Multiple raw features may collapse to the same code.
     *
     * @var array<string, ReasonCode>
     */
    private const FEATURE_TO_CODE = [
        'high_failure_rate' => ReasonCode::FailureRateHigh,
        'transaction_failure_rate' => ReasonCode::FailureRateHigh,
        'low_inflow_trend' => ReasonCode::CashflowP10Insufficient,
        'p10_cashflow' => ReasonCode::CashflowP10Insufficient,
        'high_risk_score' => ReasonCode::RiskScoreThreshold,
        'xgboost_class' => ReasonCode::RiskScoreThreshold,
        'low_psychometric_score' => ReasonCode::PsychometricLowConscientiousness,
        'conscientiousness_score' => ReasonCode::PsychometricLowConscientiousness,
        'nbe_policy_rate' => ReasonCode::MacroStress,
        'macro_discount_rate' => ReasonCode::MacroStress,
    ];

    /**
     * @param  array<string, float>  $shapValues
     * @return list<array{code:string, feature:string, shap:float}>
     */
    public function build(array $shapValues, int $limit = 3): array
    {
        $candidates = [];
        foreach ($shapValues as $feature => $value) {
            $value = (float) $value;
            if ($value > self::NEGATIVE_THRESHOLD || ! isset(self::FEATURE_TO_CODE[$feature])) {
                continue;
            }

            $candidates[] = [
                'code' => self::FEATURE_TO_CODE[$feature]->value,
                'feature' => $feature,
                'shap' => $value,
            ];
        }

        usort($candidates, static fn (array $a, array $b) => $a['shap'] <=> $b['shap']);

        return array_slice($candidates, 0, $limit);
    }
}
