<?php

namespace App\Domain\Psychometric\Data;

use App\Domain\Psychometric\Enums\AssessmentVersion;
use Spatie\LaravelData\Data;

class PsychometricResultData extends Data
{
    public function __construct(
        public readonly float $integrityScore,
        public readonly float $conscientiousnessScore,
        public readonly float $riskToleranceScore,
        public readonly AssessmentVersion $assessmentVersion,
    ) {}

    public function compositeScore(): float
    {
        return round(
            $this->integrityScore * 0.4
            + $this->conscientiousnessScore * 0.4
            + $this->riskToleranceScore * 0.2,
            4
        );
    }

    public function toAttributes(): array
    {
        return [
            'integrity_score' => $this->integrityScore,
            'conscientiousness_score' => $this->conscientiousnessScore,
            'risk_tolerance_score' => $this->riskToleranceScore,
        ];
    }
}
