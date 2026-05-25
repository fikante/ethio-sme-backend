<?php

namespace App\Domain\Valuation\Data;

use Carbon\Carbon;
use Spatie\LaravelData\Data;

class InferenceResponseData extends Data
{
    /**
     * @param  list<float>  $p10Series
     * @param  list<float>|null  $p50Series
     * @param  list<float>|null  $p90Series
     * @param  array<string, float>  $shapValues
     * @param  array<string, string>  $modelVersions
     * @param  list<array<string, mixed>>  $reasonCodes
     */
    public function __construct(
        public readonly string $requestId,
        public readonly array $p10Series,
        public readonly ?array $p50Series,
        public readonly ?array $p90Series,
        public readonly float $xgboostScore,
        public readonly string $xgboostClass,
        public readonly ?float $probDefault,
        public readonly array $shapValues,
        public readonly array $modelVersions,
        public readonly array $reasonCodes = [],
        public readonly ?string $forecasterMode = null,
        public readonly string $contractVersion = 'v1',
        public readonly ?float $npvCreditLimit = null,
        public readonly ?float $effectiveDiscountRate = null,
        public readonly ?float $cashflowHaircut = null,
        public readonly ?float $dscrP10 = null,
        public readonly bool $shapIntegrityPassed = false,
        public readonly ?string $featureSnapshotHash = null,
        public readonly ?string $inferredAt = null,
        public readonly bool $horizonReliabilityWarning = false,
        public readonly ?string $horizonReliabilityMessage = null,
        public readonly ?int $externalValuationId = null,
        public readonly bool $isFallback = false,
    ) {}

    /**
     * Live Hugging Face /predict contract (v1).
     *
     * @param  array<string, mixed>  $payload
     */
    public static function fromPredictV1(array $payload): self
    {
        $toFloats = static fn (mixed $values): array => array_values(
            array_map(static fn ($v) => (float) $v, (array) ($values ?? []))
        );

        $shapValues = [];
        foreach ((array) ($payload['shap_values'] ?? []) as $feature => $value) {
            if (is_numeric($value)) {
                $shapValues[(string) $feature] = (float) $value;
            }
        }

        $reasonCodes = self::parseReasonCodeStrings((array) ($payload['reason_codes'] ?? []));

        return new self(
            requestId: (string) ($payload['valuation_id'] ?? $payload['request_id'] ?? ''),
            p10Series: $toFloats($payload['p10_cashflow_forecast'] ?? []),
            p50Series: $toFloats($payload['p50_cashflow_forecast'] ?? []),
            p90Series: $toFloats($payload['p90_cashflow_forecast'] ?? []),
            xgboostScore: (float) ($payload['ai_risk_score'] ?? 0.0),
            xgboostClass: strtolower((string) ($payload['ai_risk_band'] ?? 'unknown')),
            probDefault: isset($payload['prob_default']) ? (float) $payload['prob_default'] : null,
            shapValues: $shapValues,
            modelVersions: (array) ($payload['model_versions'] ?? []),
            reasonCodes: $reasonCodes,
            forecasterMode: isset($payload['forecaster_mode']) ? (string) $payload['forecaster_mode'] : null,
            contractVersion: (string) ($payload['contract_version'] ?? 'v1'),
            npvCreditLimit: array_key_exists('npv_credit_limit', $payload) && $payload['npv_credit_limit'] !== null
                ? (float) $payload['npv_credit_limit']
                : null,
            effectiveDiscountRate: isset($payload['effective_discount_rate'])
                ? (float) $payload['effective_discount_rate']
                : null,
            cashflowHaircut: isset($payload['cashflow_haircut']) ? (float) $payload['cashflow_haircut'] : null,
            dscrP10: isset($payload['dscr_p10']) ? (float) $payload['dscr_p10'] : null,
            shapIntegrityPassed: (bool) ($payload['shap_integrity_passed'] ?? false),
            featureSnapshotHash: isset($payload['feature_snapshot_hash'])
                ? (string) $payload['feature_snapshot_hash']
                : null,
            inferredAt: isset($payload['inferred_at']) ? (string) $payload['inferred_at'] : null,
            horizonReliabilityWarning: (bool) ($payload['horizon_reliability_warning'] ?? false),
            horizonReliabilityMessage: isset($payload['horizon_reliability_message'])
                ? (string) $payload['horizon_reliability_message']
                : null,
            externalValuationId: isset($payload['valuation_id']) ? (int) $payload['valuation_id'] : null,
            isFallback: false,
        );
    }

    /** @deprecated Legacy v2 nested payload — kept for API compatibility tests. */
    public static function fromHttp(array $payload): self
    {
        if (isset($payload['ai_risk_score']) || isset($payload['p10_cashflow_forecast'])) {
            return self::fromPredictV1($payload);
        }

        $forecast = (array) ($payload['forecast'] ?? []);
        $risk = (array) ($payload['risk'] ?? []);
        $explain = (array) ($payload['explainability'] ?? []);

        $toFloats = static fn (?array $values): array => array_values(
            array_map(static fn ($v) => (float) $v, (array) ($values ?? []))
        );

        $shapValues = [];
        foreach ((array) ($explain['shap_values'] ?? []) as $row) {
            if (is_array($row) && isset($row['feature'], $row['value'])) {
                $shapValues[(string) $row['feature']] = (float) $row['value'];
            }
        }

        if ($shapValues === [] && isset($explain['shap_values']) && is_array($explain['shap_values'])) {
            foreach ($explain['shap_values'] as $feature => $value) {
                if (is_numeric($value)) {
                    $shapValues[(string) $feature] = (float) $value;
                }
            }
        }

        return new self(
            requestId: (string) ($payload['request_id'] ?? ''),
            p10Series: $toFloats($forecast['p10_net_inflow_etb'] ?? $payload['p10_forecast'] ?? $payload['p10_series'] ?? []),
            p50Series: isset($forecast['p50_net_inflow_etb'])
                ? $toFloats($forecast['p50_net_inflow_etb'])
                : (isset($payload['p50_forecast']) ? $toFloats($payload['p50_forecast']) : null),
            p90Series: isset($forecast['p90_net_inflow_etb'])
                ? $toFloats($forecast['p90_net_inflow_etb'])
                : (isset($payload['p90_forecast']) ? $toFloats($payload['p90_forecast']) : null),
            xgboostScore: (float) ($risk['score'] ?? $payload['risk_score'] ?? $payload['xgboost_score'] ?? 0.0),
            xgboostClass: (string) ($risk['risk_band'] ?? $payload['risk_class'] ?? $payload['xgboost_class'] ?? 'unknown'),
            probDefault: isset($risk['prob_default']) ? (float) $risk['prob_default'] : null,
            shapValues: $shapValues,
            modelVersions: (array) ($payload['model_versions'] ?? []),
            reasonCodes: array_values((array) ($explain['reason_codes'] ?? [])),
            forecasterMode: isset($forecast['source']) ? (string) $forecast['source'] : null,
            isFallback: (bool) ($forecast['is_fallback'] ?? false),
        );
    }

    public function isDegraded(): bool
    {
        return $this->forecasterMode === 'degraded' || $this->npvCreditLimit === null;
    }

    public function inferredAtCarbon(): Carbon
    {
        return $this->inferredAt !== null
            ? Carbon::parse($this->inferredAt)
            : now();
    }

    /**
     * @param  list<string>  $strings
     * @return list<array{code:string, message:string}>
     */
    private static function parseReasonCodeStrings(array $strings): array
    {
        $parsed = [];
        foreach ($strings as $line) {
            if (! is_string($line) || trim($line) === '') {
                continue;
            }
            $parts = explode(':', $line, 2);
            $parsed[] = [
                'code' => trim($parts[0]),
                'message' => isset($parts[1]) ? trim($parts[1]) : trim($line),
            ];
        }

        return $parsed;
    }
}
