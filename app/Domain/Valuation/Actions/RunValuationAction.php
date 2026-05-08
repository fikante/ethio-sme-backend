<?php

namespace App\Domain\Valuation\Actions;

use App\Domain\Valuation\Data\NpvInputsData;
use App\Domain\Valuation\Enums\ValuationStatus;
use App\Domain\Valuation\Services\InferenceOrchestratorService;
use App\Domain\Valuation\Support\ReasonCodeBuilder;
use App\Models\ExogenousFactor;
use App\Models\LoanApplication;
use App\Models\Valuation;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates the valuation lifecycle for a loan application:
 *   1. Marks the application as processing.
 *   2. Builds + sends the inference request.
 *   3. Computes NPV / credit limit from the response.
 *   4. Persists Valuation + SHAP rows + denormalised application snapshot.
 * All state mutations live inside the DB::transaction boundary.
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
            $existing = Valuation::query()
                ->where('business_id', $application->business_id)
                ->where('idempotency_key', $idempotencyKey)
                ->first();

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

        $valuation = DB::transaction(function () use ($application, $idempotencyKey) {
            $application->update(['status' => LoanApplication::STATUS_PROCESSING]);

            return Valuation::create([
                'business_id' => $application->business_id,
                'loan_application_id' => $application->id,
                'status' => ValuationStatus::Pending->value,
                'idempotency_key' => $idempotencyKey,
            ]);
        });

        try {
            $response = $this->orchestrator->call($application, $request);
        } catch (\Throwable $e) {
            return DB::transaction(function () use ($application, $valuation, $e): Valuation {
                $valuation->update([
                    'status' => ValuationStatus::Failed->value,
                    'error_code' => 'inference_failed',
                    'error_message' => $e->getMessage(),
                    'inferred_at' => now(),
                ]);

                $application->update([
                    'status' => LoanApplication::STATUS_QUEUED_FOR_AI,
                ]);

                return $valuation->fresh();
            });
        }

        $factors = ExogenousFactor::latestRow();
        $assessment = $application->business?->psychometricAssessment;

        $compositeScore = $assessment !== null
            ? (float) ((($assessment->integrity_score * 0.4) + ($assessment->conscientiousness_score * 0.4) + ($assessment->risk_tolerance_score * 0.2)))
            : 0.5;

        $npvResult = $this->calculateNpv->execute(new NpvInputsData(
            p10CashFlows: $response->p10Series,
            nbePolicyRate: (float) ($factors->nbe_policy_rate ?? config('valuation.fallback_policy_rate', 0.15)),
            psychometricCompositeScore: $compositeScore,
            xgboostRiskScore: $response->xgboostScore,
        ));

        $reasonCodes = $this->reasonCodes->build($response->shapValues);

        return DB::transaction(function () use (
            $application,
            $valuation,
            $response,
            $npvResult,
            $reasonCodes
        ): Valuation {
            $valuation->update([
                'status' => ValuationStatus::Completed->value,
                'model_versions' => $response->modelVersions,
                'p10_series' => $response->p10Series,
                'p50_series' => $response->p50Series,
                'p90_series' => $response->p90Series,
                'xgboost_score' => $response->xgboostScore,
                'xgboost_class' => $response->xgboostClass,
                'npv_etb' => $npvResult->npvEtb,
                'mapped_limit_etb' => $npvResult->mappedLimitEtb,
                'effective_discount_rate' => $npvResult->effectiveDiscountRate,
                'apr' => $npvResult->apr,
                'inferred_at' => now(),
            ]);

            $this->persistShap->execute($valuation, $response->shapValues);

            $application->update([
                'status' => $application->status === LoanApplication::STATUS_PROCESSING
                    ? LoanApplication::STATUS_PROCESSING
                    : $application->status,
                'npv_credit_limit' => $npvResult->mappedLimitEtb,
                'effective_discount_rate' => $npvResult->effectiveDiscountRate,
                'apr' => $npvResult->apr,
                'ai_risk_score' => $response->xgboostScore,
                'snapshot_risk_score' => $response->xgboostScore,
                'p10_cashflow_forecast' => $response->p10Series,
                'p50_cashflow_forecast' => $response->p50Series,
                'p90_cashflow_forecast' => $response->p90Series,
                'shap_values' => $response->shapValues,
                'reason_codes' => $reasonCodes,
            ]);

            return $valuation->fresh(['shapExplanations']);
        });
    }
}
