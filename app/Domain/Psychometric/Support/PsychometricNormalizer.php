<?php

namespace App\Domain\Psychometric\Support;

use App\Domain\Psychometric\Data\PsychometricResultData;
use App\Domain\Psychometric\Enums\AssessmentVersion;

/**
 * Pure function that normalises raw 1-5 Likert answers into [0,1] dimension scores.
 * Stateless and side-effect free; used by ScorePsychometricAssessmentAction.
 */
class PsychometricNormalizer
{
    public function __construct(private readonly QuestionBank $bank) {}

    /**
     * @param  array<string, int>  $rawAnswers
     */
    public function normalize(array $rawAnswers, AssessmentVersion $version): PsychometricResultData
    {
        $dimensions = [];
        foreach ($this->bank->dimensionMap($version) as $dimension => $questionKeys) {
            $values = [];
            foreach ($questionKeys as $key) {
                if (! isset($rawAnswers[$key])) {
                    continue;
                }
                $values[] = ($rawAnswers[$key] - 1) / 4;
            }

            $dimensions[$dimension] = count($values) > 0
                ? round(array_sum($values) / count($values), 4)
                : 0.5;
        }

        return new PsychometricResultData(
            integrityScore: (float) $dimensions['integrity'],
            conscientiousnessScore: (float) $dimensions['conscientiousness'],
            riskToleranceScore: (float) $dimensions['risk_tolerance'],
            assessmentVersion: $version,
        );
    }
}
