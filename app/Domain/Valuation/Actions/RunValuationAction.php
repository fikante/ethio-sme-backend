<?php

namespace App\Domain\Valuation\Actions;

use App\Domain\Valuation\Data\NpvInputsData;
use App\Domain\Valuation\Services\InferenceOrchestratorService;
use App\Domain\Valuation\Support\ReasonCodeBuilder;
use App\Models\ExogenousFactor;
use App\Models\LoanApplication;
use App\Models\Valuation;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates valuation: calls AI service, persists Supabase-shaped valuations row,
 * links loan_applications.valuation_id.
 */
class RunValuationAction
{
    public function __construct(
        private readonly InferenceOrchestratorService $orchestrator,
        private readonly CalculateNpvAction $calculateNpv,
        private readonly PersistShapExplanationsAction $persistShap,
        private readonly ReasonCodeBuilder $reasonCodes,
    ) {}

    public function execute(LoanApplication $application, ?string $idempotencyKey = null): Valuation
    {
        if ($idempotencyKey !== null) {
            $existing = $application->valuation;
            if ($existing !== null && $existing->isCompleted()) {
                return $existing;
            }
        }

        if (! $application->isReadyForValuation()) {
            throw new \DomainException(
                "Application {$application->id} is not ready for valuation (status={$application->status})"
            );
        }

        $request = $this->orchestrator->buildRequest($application);

        DB::transaction(fn () => $application->update(['status' => LoanApplication::STATUS_PROCESSING]));

        try {
            $response = $this->orchestrator->call($application, $request);
        } catch (\Throwable $e) {
            DB::transaction(fn () => $application->update([
                'status' => LoanApplication::STATUS_QUEUED_FOR_AI,
            ]));

            throw $e;
        }

        $factors = ExogenousFactor::latestRow();
        $assessment = $application->business?->psychometricAssessment;

        $compositeScore = 0.5;
        if ($assessment !== null) {
            $compositeScore = $assessment->isV2()
                ? (float) $assessment->composite_score
                : (float) (
                    ($assessment->integrity_score * 0.4)
                    + ($assessment->conscientiousness_score * 0.4)
                    + ($assessment->financial_risk_score * 0.2)
                );
        }

        $npvResult = $this->calculateNpv->execute(new NpvInputsData(
            p10CashFlows: $response->p10Series,
            nbePolicyRate: (float) ($factors->nbe_policy_rate ?? config('valuation.fallback_policy_rate', 0.15)),
            psychometricCompositeScore: $compositeScore,
            xgboostRiskScore: $response->xgboostScore,
        ));

        $reasonCodes = $response->reasonCodes !== []
            ? $this->reasonCodes->fromMlResponse($response->reasonCodes)
            : $this->reasonCodes->build($response->shapValues);

        $contractVersion = (string) config('services.ai_engine.contract_version', 'v2');

        return DB::transaction(function () use (
            $application,
            $response,
            $npvResult,
            $reasonCodes,
            $contractVersion
        ): Valuation {
            $valuation = Valuation::create([
                'business_id' => $application->business_id,
                'ai_risk_score' => $response->xgboostScore,
                'ai_risk_band' => $response->xgboostClass,
                'prob_default' => $response->probDefault,
                'horizon_days' => min(max((int) $application->requested_tenure_months * 30, 7), 365),
                'effective_discount_rate' => $npvResult->effectiveDiscountRate,
                'apr' => $npvResult->apr,
                'npv_credit_limit' => $npvResult->mappedLimitEtb,
                'p10_cashflow_forecast' => $response->p10Series,
                'p50_cashflow_forecast' => $response->p50Series,
                'p90_cashflow_forecast' => $response->p90Series,
                'shap_values' => $response->shapValues,
                'reason_codes' => $reasonCodes,
                'forecaster_mode' => $response->forecastSource ?? 'selector',
                'contract_version' => $contractVersion,
                'model_versions' => $response->modelVersions,
                'feature_snapshot_hash' => isset($response->dataProvenance['feature_snapshot_hash'])
                    ? (string) $response->dataProvenance['feature_snapshot_hash']
                    : null,
                'inferred_at' => now(),
            ]);

            $this->persistShap->execute($valuation, $response->shapValues);

            $application->update([
                'status' => LoanApplication::STATUS_EVALUATED,
                'valuation_id' => $valuation->id,
                'snapshot_limit_etb' => $npvResult->mappedLimitEtb,
                'effective_discount_rate' => $npvResult->effectiveDiscountRate,
                'apr' => $npvResult->apr,
                'ai_risk_band' => $response->xgboostClass,
                'prob_default' => $response->probDefault,
                'snapshot_risk_score' => $response->xgboostScore,
                'reason_codes' => $reasonCodes,
                'contract_version' => $contractVersion,
                'model_versions' => $response->modelVersions,
                'feature_snapshot_hash' => $response->featureSnapshotHash,
            ]);

            return $valuation->fresh(['shapExplanations']);
        });
    }
}
