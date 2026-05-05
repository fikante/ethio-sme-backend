<?php

namespace App\Domain\Applications\Actions;

use App\Domain\AI\Services\AiEngineService;
use App\Domain\Applications\Services\NpvCalculationService;
use App\Models\LoanApplication;

class EvaluateApplicationAction
{
    public function __construct(
        private readonly AiEngineService       $aiEngine,
        private readonly NpvCalculationService $npvService
    ) {}

    public function execute(LoanApplication $application): LoanApplication
    {
        $application->update(['status' => 'processing']);

        // 1. Get forecast + SHAP from Leykun's Python service
        $aiResponse = $this->aiEngine->forecast($application);

        // 2. Compute NPV-based credit limit
        $psychometric = $application->business->psychometricAssessment;
        $npvResult    = $this->npvService->compute(
            p10CashFlows: $aiResponse['p10_forecast'],
            psychometric: $psychometric,
            riskScore:    $aiResponse['risk_score']
        );

        // 3. Build NBE reason codes from SHAP values
        $reasonCodes = $this->buildReasonCodes($aiResponse['shap_values']);

        // 4. Persist all results
        $application->update([
            'status'                  => $npvResult['npv_credit_limit'] > 0 ? 'approved' : 'rejected',
            'npv_credit_limit'        => $npvResult['npv_credit_limit'],
            'effective_discount_rate' => $npvResult['effective_discount_rate'],
            'apr'                     => $npvResult['apr'],
            'ai_risk_score'           => $aiResponse['risk_score'],
            'p10_cashflow_forecast'   => $aiResponse['p10_forecast'],
            'p50_cashflow_forecast'   => $aiResponse['p50_forecast'],
            'p90_cashflow_forecast'   => $aiResponse['p90_forecast'],
            'shap_values'             => $aiResponse['shap_values'],
            'reason_codes'            => $reasonCodes,
            'decided_at'              => now(),
        ]);

        return $application->fresh();
    }

    private function buildReasonCodes(array $shapValues): array
    {
        // Sort by absolute SHAP contribution, return top 3 negative drivers
        $negativeCodes = [
            'high_failure_rate'      => 'Transaction failure rate exceeds acceptable threshold in trailing 14 days',
            'low_inflow_trend'       => 'Declining cash inflow trend over analysis period',
            'high_risk_score'        => 'XGBoost classification indicates elevated default probability',
            'insufficient_history'   => 'Insufficient transaction history for confident assessment',
            'low_psychometric_score' => 'Behavioural risk profile indicates elevated willingness-to-default risk',
            'seasonal_volatility'    => 'Extreme seasonal revenue volatility reduces repayment confidence',
        ];

        $codes = [];
        foreach ($shapValues as $feature => $value) {
            if ($value < -0.05 && isset($negativeCodes[$feature])) {
                $codes[] = ['feature' => $feature, 'code' => $negativeCodes[$feature], 'shap' => $value];
            }
        }

        usort($codes, fn ($a, $b) => $a['shap'] <=> $b['shap']);

        return array_slice($codes, 0, 3);
    }
}

