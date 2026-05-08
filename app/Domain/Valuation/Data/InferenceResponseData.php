<?php

namespace App\Domain\Valuation\Data;

use Spatie\LaravelData\Data;

class InferenceResponseData extends Data
{
    /**
     * @param  list<float>  $p10Series
     * @param  list<float>|null  $p50Series
     * @param  list<float>|null  $p90Series
     * @param  array<string, float>  $shapValues
     * @param  array<string, string>  $modelVersions
     */
    public function __construct(
        public readonly array $p10Series,
        public readonly ?array $p50Series,
        public readonly ?array $p90Series,
        public readonly float $xgboostScore,
        public readonly string $xgboostClass,
        public readonly array $shapValues,
        public readonly array $modelVersions,
    ) {}

    public static function fromHttp(array $payload): self
    {
        return new self(
            p10Series: array_values((array) ($payload['p10_forecast'] ?? $payload['p10_series'] ?? [])),
            p50Series: isset($payload['p50_forecast']) ? array_values((array) $payload['p50_forecast']) : null,
            p90Series: isset($payload['p90_forecast']) ? array_values((array) $payload['p90_forecast']) : null,
            xgboostScore: (float) ($payload['risk_score'] ?? $payload['xgboost_score'] ?? 0.0),
            xgboostClass: (string) ($payload['risk_class'] ?? $payload['xgboost_class'] ?? 'unknown'),
            shapValues: (array) ($payload['shap_values'] ?? []),
            modelVersions: (array) ($payload['model_versions'] ?? []),
        );
    }
}
