<?php

namespace App\Domain\Psychometric\Support;

use App\Domain\Psychometric\Data\PsychometricResultData;
use App\Domain\Psychometric\Enums\AssessmentVersion;

/**
 * Normalises raw answers into [0,1] dimension scores.
 */
class PsychometricNormalizer
{
    private const V1_SCORED_DIMENSIONS = [
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
        return match ($version) {
            AssessmentVersion::V1 => $this->normalizeV1($rawAnswers, $version),
            AssessmentVersion::V2 => $this->normalizeV2($rawAnswers, $version),
        };
    }

    /**
     * @param  array<string, int>  $rawAnswers
     */
    private function normalizeV1(array $rawAnswers, AssessmentVersion $version): PsychometricResultData
    {
        $questions = $this->bank->forVersion($version);
        $dimensions = [];

        foreach ($this->bank->dimensionMap($version) as $dimension => $questionKeys) {
            if (! in_array($dimension, self::V1_SCORED_DIMENSIONS, true)) {
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
            assessmentVersion: $version,
            riskToleranceScore: (float) $dimensions['risk_tolerance'],
        );
    }

    /**
     * @param  array<string, int>  $rawAnswers
     */
    private function normalizeV2(array $rawAnswers, AssessmentVersion $version): PsychometricResultData
    {
        $questions = $this->bank->forVersion($version);
        $indexedQ = collect($questions);

        $dimensionScores = [
            'integrity' => ['sum' => 0, 'max' => 0],
            'conscientiousness' => ['sum' => 0, 'max' => 0],
            'delayed_gratification' => ['sum' => 0, 'max' => 0],
            'financial_risk' => ['sum' => 0, 'max' => 0],
        ];

        $sdTracker = [];

        foreach ($rawAnswers as $questionId => $answer) {
            $question = $indexedQ->get($questionId);
            if ($question === null) {
                continue;
            }

            $dim = $question['dimension'];
            if (! isset($dimensionScores[$dim])) {
                continue;
            }

            if ($question['type'] === 'choice') {
                $options = $question['options'] ?? [];
                $optionIndex = (int) $answer;

                if ($optionIndex < 0 || $optionIndex >= count($options)) {
                    continue;
                }

                $rawValue = (int) $options[$optionIndex]['score'];
                $maxValue = 4;
                $dimensionScores[$dim]['sum'] += $rawValue;
                $dimensionScores[$dim]['max'] += $maxValue;
            } elseif ($question['type'] === 'likert') {
                $rawValue = (int) $answer;
                if ($rawValue < 1 || $rawValue > 5) {
                    continue;
                }

                $maxValue = 5;
                $reversed = $question['is_reverse_scored'] ?? false;
                $scored = $reversed ? (6 - $rawValue) : $rawValue;

                $dimensionScores[$dim]['sum'] += $scored;
                $dimensionScores[$dim]['max'] += $maxValue;

                $sdTracker[$dim][] = ['reversed' => $reversed, 'raw' => $rawValue];
            }
        }

        $normalized = [];
        foreach ($dimensionScores as $dim => $data) {
            $normalized[$dim] = ($data['max'] > 0)
                ? round($data['sum'] / $data['max'], 4)
                : 0.5000;
        }

        $flagged = false;
        foreach ($sdTracker as $items) {
            $positives = collect($items)->where('reversed', false)->avg('raw');
            $negatives = collect($items)->where('reversed', true)->avg('raw');

            if ($positives !== null && $negatives !== null && $positives >= 4.0 && $negatives >= 4.0) {
                $flagged = true;
            }
        }

        return new PsychometricResultData(
            integrityScore: $normalized['integrity'],
            conscientiousnessScore: $normalized['conscientiousness'],
            assessmentVersion: $version,
            delayedGratificationScore: $normalized['delayed_gratification'],
            financialRiskScore: $normalized['financial_risk'],
            socialDesirabilityFlagged: $flagged,
        );
    }
}
