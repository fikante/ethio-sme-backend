<?php

namespace App\Domain\Psychometric\Data;

use App\Domain\Psychometric\Enums\AssessmentVersion;
use Spatie\LaravelData\Data;

class PsychometricResultData extends Data
{
    public function __construct(
        public readonly float $integrityScore,
        public readonly float $conscientiousnessScore,
        public readonly AssessmentVersion $assessmentVersion,
        public readonly ?float $riskToleranceScore = null,
        public readonly ?float $delayedGratificationScore = null,
        public readonly ?float $financialRiskScore = null,
        public readonly bool $socialDesirabilityFlagged = false,
    ) {}

    public function compositeScore(): float
    {
        if ($this->assessmentVersion === AssessmentVersion::V2) {
            return round(
                $this->integrityScore * 0.35
                + $this->conscientiousnessScore * 0.30
                + ($this->delayedGratificationScore ?? 0) * 0.20
                + ($this->financialRiskScore ?? 0) * 0.15,
                4
            );
        }

        return round(
            $this->integrityScore * 0.4
            + $this->conscientiousnessScore * 0.4
            + ($this->riskToleranceScore ?? 0) * 0.2,
            4
        );
    }

    public function creditRiskBand(): string
    {
        $composite = $this->compositeScore();

        return match (true) {
            $composite >= 0.80 => 'low',
            $composite >= 0.60 => 'medium',
            $composite >= 0.40 => 'high',
            default => 'very_high',
        };
    }

    /**
     * @return array<string, mixed>
     */
    public function toAttributes(): array
    {
        $base = [
            'integrity_score' => $this->integrityScore,
            'conscientiousness_score' => $this->conscientiousnessScore,
            'assessment_version' => $this->assessmentVersion->value,
        ];

        if ($this->assessmentVersion === AssessmentVersion::V2) {
            return [
                ...$base,
                'delayed_gratification_score' => $this->delayedGratificationScore ?? 0,
                'financial_risk_score' => $this->financialRiskScore ?? 0,
                'social_desirability_flagged' => $this->socialDesirabilityFlagged,
            ];
        }

        return [
            ...$base,
            'financial_risk_score' => $this->riskToleranceScore ?? 0,
            'delayed_gratification_score' => 0,
        ];
    }
}
