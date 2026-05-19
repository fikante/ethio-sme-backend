<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

class InferenceResponseData extends Data
{
    /**
     * @param  list<float|string>  $p10Series
     * @param  list<float|string>|null  $p50Series
     * @param  list<float|string>|null  $p90Series
     * @param  array<string, float>  $shapValues
     * @param  array<string, string>  $modelVersions
     * @param  list<array<string, mixed>>  $reasonCodes
     * @param  array<string, mixed>|null  $dataProvenance
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
        public readonly ?array $dataProvenance = null,
        public readonly ?string $forecastSource = null,
        public readonly bool $isFallback = false,
    ) {}

    public static function fromHttp(array $payload): self
    {
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
            dataProvenance: isset($payload['data_provenance']) ? (array) $payload['data_provenance'] : null,
            forecastSource: isset($forecast['source']) ? (string) $forecast['source'] : null,
            isFallback: (bool) ($forecast['is_fallback'] ?? false),
        );
    }
}
