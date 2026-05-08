<?php

namespace App\Domain\Psychometric\Support;

use App\Domain\Psychometric\Enums\AssessmentVersion;

/**
 * Versioned EFL-style question bank. Phase 1 ships version v1 (15 items).
 * Update by appending a new version constant rather than mutating an existing one.
 */
class QuestionBank
{
    /**
     * @return array<string, array{text:string, dimension:string}>
     */
    public function forVersion(AssessmentVersion $version): array
    {
        return match ($version) {
            AssessmentVersion::V1 => $this->v1Questions(),
        };
    }

    /**
     * @return array<string, array{text:string, dimension:string}>
     */
    public function current(): array
    {
        return $this->forVersion(AssessmentVersion::current());
    }

    /**
     * @return array<string, list<string>>
     */
    public function dimensionMap(AssessmentVersion $version): array
    {
        return match ($version) {
            AssessmentVersion::V1 => [
                'integrity' => ['q1', 'q3', 'q7', 'q11', 'q14'],
                'conscientiousness' => ['q2', 'q5', 'q8', 'q12', 'q15'],
                'risk_tolerance' => ['q4', 'q6', 'q9', 'q10', 'q13'],
            ],
        };
    }

    /**
     * @return array<string, array{text:string, dimension:string}>
     */
    private function v1Questions(): array
    {
        return [
            'q1' => ['text' => 'How do you feel today?', 'dimension' => 'integrity'],
            'q2' => ['text' => 'When you make a plan, how often do you follow through?', 'dimension' => 'conscientiousness'],
            'q3' => ['text' => 'If you found a wallet with money, what would you do?', 'dimension' => 'integrity'],
            'q4' => ['text' => 'Imagine you find 10 gold coins. How would you spend them?', 'dimension' => 'risk_tolerance'],
            'q5' => ['text' => 'How do you organize your business records?', 'dimension' => 'conscientiousness'],
            'q6' => ['text' => 'Would you rather receive 500 ETB today or 750 ETB in 3 months?', 'dimension' => 'risk_tolerance'],
            'q7' => ['text' => 'A customer overpays you. What do you do?', 'dimension' => 'integrity'],
            'q8' => ['text' => 'How far in advance do you plan your business expenses?', 'dimension' => 'conscientiousness'],
            'q9' => ['text' => 'Would you invest all profits in expansion or keep reserves?', 'dimension' => 'risk_tolerance'],
            'q10' => ['text' => 'How comfortable are you taking on business debt?', 'dimension' => 'risk_tolerance'],
            'q11' => ['text' => 'Have you ever misrepresented your business income?', 'dimension' => 'integrity'],
            'q12' => ['text' => 'How often do you review your business finances?', 'dimension' => 'conscientiousness'],
            'q13' => ['text' => 'You can double your profit but risk losing everything. Do you?', 'dimension' => 'risk_tolerance'],
            'q14' => ['text' => 'A supplier offers a discount for early payment. Do you comply?', 'dimension' => 'integrity'],
            'q15' => ['text' => 'How detailed are your records of daily transactions?', 'dimension' => 'conscientiousness'],
        ];
    }
}
