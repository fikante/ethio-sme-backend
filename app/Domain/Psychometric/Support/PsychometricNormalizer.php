<?php

namespace App\Domain\Psychometric\Support;

use App\Domain\Psychometric\Data\PsychometricResultData;
use App\Domain\Psychometric\Enums\AssessmentVersion;

/**
 * Normalises raw answers into [0,1] dimension scores.
 * Scoring aligned with psychometric-app Assessment::calculateScores().
 */
class PsychometricNormalizer
{
    private const SCORED_DIMENSIONS = [
        'integrity',
        'conscientiousness',
        'risk_tolerance',
    ];

    public function __construct(private readonly QuestionBank $bank) {}

    /**
     * @param  array<string, int>  $rawAnswers
     */
    public function normalize(array $rawAnswers, AssessmentVersion $version): PsychometricResultData
    {
        $questions = $this->bank->forVersion($version);
        $dimensions = [];

        foreach ($this->bank->dimensionMap($version) as $dimension => $questionKeys) {
            if (! in_array($dimension, self::SCORED_DIMENSIONS, true)) {
                continue;
            }

            $values = [];

            foreach ($questionKeys as $key) {
                if (! isset($rawAnswers[$key])) {
                    continue;
                }

                $question = $questions[$key];
                $value = (int) $rawAnswers[$key];

                if (($question['type'] ?? 'likert') === 'likert' && ($question['is_reverse_scored'] ?? false)) {
                    $value = 6 - $value;
                }

                $values[] = $value / 5;
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
