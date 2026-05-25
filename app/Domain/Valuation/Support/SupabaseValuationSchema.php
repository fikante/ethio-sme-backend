<?php

namespace App\Domain\Valuation\Support;

use App\Domain\Valuation\Data\InferenceResponseData;
use App\Models\LoanApplication;
use Illuminate\Support\Facades\Schema;

/**
 * Maps valuation persistence to the live Supabase schema (differs from SQLite migrations).
 */
final class SupabaseValuationSchema
{
    private static ?bool $isSupabaseLayout = null;

    public static function isSupabaseLayout(): bool
    {
        if (self::$isSupabaseLayout === null) {
            self::$isSupabaseLayout = Schema::hasTable('valuations')
                && Schema::hasColumn('valuations', 'ai_risk_score');
        }

        return self::$isSupabaseLayout;
    }

    public static function hasColumn(string $column): bool
    {
        return Schema::hasTable('valuations') && Schema::hasColumn('valuations', $column);
    }

    /**
     * @param  list<array<string, mixed>>  $reasonCodes
     * @return array<string, mixed>
     */
    public static function valuationInsertAttributes(
        LoanApplication $application,
        InferenceResponseData $response,
        array $reasonCodes,
        string $contractVersion,
        ?float $npvLimit,
        ?string $idempotencyKey,
    ): array {
        if (! self::isSupabaseLayout()) {
            return [
                'business_id' => $application->business_id,
                'loan_application_id' => $application->id,
                'status' => 'completed',
                'forecaster_mode' => $response->forecasterMode ?? ($response->isDegraded() ? 'degraded' : 'normal'),
                'contract_version' => $contractVersion,
                'model_versions' => $response->modelVersions,
                'feature_snapshot_hash' => $response->featureSnapshotHash,
                'shap_integrity_passed' => $response->shapIntegrityPassed,
                'horizon_reliability_warning' => $response->horizonReliabilityWarning,
                'horizon_reliability_message' => $response->horizonReliabilityMessage,
                'p10_series' => $response->p10Series,
                'p50_series' => $response->p50Series ?? [],
                'p90_series' => $response->p90Series ?? [],
                'xgboost_score' => $response->xgboostScore,
                'xgboost_class' => $response->xgboostClass,
                'prob_default' => $response->probDefault,
                'horizon_days' => count($response->p10Series) ?: (int) config('valuation.inference_horizon_days', 30),
                'cashflow_haircut' => $response->cashflowHaircut ?? config('valuation.cashflow_haircut', 0.30),
                'dscr_p10' => $response->dscrP10,
                'npv_etb' => $npvLimit,
                'mapped_limit_etb' => $npvLimit,
                'effective_discount_rate' => $response->effectiveDiscountRate,
                'apr' => $response->effectiveDiscountRate,
                'reason_codes' => $reasonCodes,
                'shap_values' => $response->shapValues,
                'idempotency_key' => $idempotencyKey,
                'external_valuation_id' => $response->externalValuationId,
                'inferred_at' => $response->inferredAtCarbon(),
            ];
        }

        $attrs = [
            'business_id' => $application->business_id,
            'ai_risk_score' => $response->xgboostScore,
            'ai_risk_band' => $response->xgboostClass,
            'prob_default' => $response->probDefault,
            'cashflow_haircut' => $response->cashflowHaircut ?? config('valuation.cashflow_haircut', 0.30),
            'horizon_days' => count($response->p10Series) ?: (int) config('valuation.inference_horizon_days', 30),
            'effective_discount_rate' => $response->effectiveDiscountRate,
            'npv_credit_limit' => $npvLimit,
            'dscr_p10' => $response->dscrP10,
            'p10_cashflow_forecast' => $response->p10Series,
            'p50_cashflow_forecast' => $response->p50Series ?? [],
            'p90_cashflow_forecast' => $response->p90Series ?? [],
            'shap_values' => $response->shapValues,
            'reason_codes' => $reasonCodes,
            'forecaster_mode' => $response->forecasterMode ?? ($response->isDegraded() ? 'degraded' : 'normal'),
            'contract_version' => $contractVersion,
            'model_versions' => $response->modelVersions,
            'feature_snapshot_hash' => $response->featureSnapshotHash,
            'inferred_at' => $response->inferredAtCarbon(),
        ];

        return array_filter($attrs, static fn ($value, string $key) => self::hasColumn($key), ARRAY_FILTER_USE_BOTH);
    }

    /**
     * @param  list<array<string, mixed>>  $reasonCodes
     * @return array<string, mixed>
     */
    public static function loanApplicationUpdateAttributes(
        LoanApplication $application,
        int $valuationId,
        InferenceResponseData $response,
        array $reasonCodes,
        string $contractVersion,
        ?float $npvLimit,
    ): array {
        $base = [
            'status' => LoanApplication::STATUS_EVALUATED,
            'valuation_id' => $valuationId,
            'effective_discount_rate' => $response->effectiveDiscountRate,
            'ai_risk_band' => $response->xgboostClass,
            'prob_default' => $response->probDefault,
            'reason_codes' => $reasonCodes,
            'contract_version' => $contractVersion,
            'model_versions' => $response->modelVersions,
            'feature_snapshot_hash' => $response->featureSnapshotHash,
        ];

        if (Schema::hasColumn('loan_applications', 'apr')) {
            $base['apr'] = $response->effectiveDiscountRate;
        }

        if (Schema::hasColumn('loan_applications', 'npv_credit_limit')) {
            $base['npv_credit_limit'] = $npvLimit;
        }

        if (Schema::hasColumn('loan_applications', 'snapshot_limit_etb')) {
            $base['snapshot_limit_etb'] = $npvLimit;
        }

        if (Schema::hasColumn('loan_applications', 'ai_risk_score')) {
            $base['ai_risk_score'] = $response->xgboostScore;
        }

        if (Schema::hasColumn('loan_applications', 'snapshot_risk_score')) {
            $base['snapshot_risk_score'] = $response->xgboostScore;
        }

        if (Schema::hasColumn('loan_applications', 'p10_cashflow_forecast')) {
            $base['p10_cashflow_forecast'] = $response->p10Series;
            $base['p50_cashflow_forecast'] = $response->p50Series ?? [];
            $base['p90_cashflow_forecast'] = $response->p90Series ?? [];
        }

        if (Schema::hasColumn('loan_applications', 'shap_values')) {
            $base['shap_values'] = $response->shapValues;
        }

        return $base;
    }
}
