<?php

namespace App\Domain\Psychometric\Support;

use App\Domain\Psychometric\Enums\AssessmentVersion;

/**
 * Psychometric question banks: v1 (36 questions, legacy) and v2 (30 questions, EFL/WEDP).
 */
class QuestionBank
{
    public function questionCount(AssessmentVersion $version): int
    {
        return count($this->forVersion($version));
    }

    /**
     * @return array<string, array{
     *     text: string,
     *     dimension: string,
     *     type: string,
     *     section?: string,
     *     is_reverse_scored?: bool,
     *     options?: list<array{text: string, score: int}>
     * }>
     */
    public function forVersion(AssessmentVersion $version): array
    {
        return match ($version) {
            AssessmentVersion::V1 => $this->v1Questions(),
            AssessmentVersion::V2 => V2Questions::all(),
        };
    }

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
                'integrity' => ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
                'conscientiousness' => ['q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14'],
                'risk_tolerance' => ['q15', 'q16', 'q17', 'q18', 'q19', 'q20', 'q21', 'q22'],
                'time_preference' => ['q23', 'q24', 'q25', 'q26', 'q27', 'q28', 'q29', 'q30'],
                'perseverance' => ['q31', 'q32', 'q33', 'q34', 'q35', 'q36'],
            ],
        };
    }

    private function v1Questions(): array
    {
        return [
            'q1' => [
                'text' => 'If a supplier accidentally under-billed me, I would feel a strong obligation to inform them.',
                'dimension' => 'integrity',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q2' => [
                'text' => 'Scenario: You find a way to legally avoid a small tax, but it involves a complex loophole. Do you:',
                'dimension' => 'integrity',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Use the loophole', 'score' => 1],
                    ['text' => 'Pay the full amount', 'score' => 5],
                ],
            ],
            'q3' => [
                'text' => 'I have never told a lie in my life, not even a small one.',
                'dimension' => 'integrity',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q4' => [
                'text' => 'Keeping a promise to a business partner is more important than maximizing profit this month.',
                'dimension' => 'integrity',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q5' => [
                'text' => 'Rules are guidelines that can be bent if the business survival is at stake.',
                'dimension' => 'integrity',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q6' => [
                'text' => 'Scenario: You realize a mistake in your loan application after submission. Do you:',
                'dimension' => 'integrity',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Wait to see if they notice', 'score' => 1],
                    ['text' => 'Proactively call to correct it', 'score' => 5],
                ],
            ],
            'q7' => [
                'text' => 'I keep a detailed written record of every business expense, no matter how small.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q8' => [
                'text' => 'I often start new projects before finishing my current ones.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q9' => [
                'text' => 'I prefer to have a strict schedule for my workday rather than \'going with the flow\'.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q10' => [
                'text' => 'Scenario: An unexpected task arises. Do you:',
                'dimension' => 'conscientiousness',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Drop everything to do it', 'score' => 2],
                    ['text' => 'Add it to a prioritized list for later', 'score' => 5],
                ],
            ],
            'q11' => [
                'text' => 'I have a reputation for always being on time for meetings.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q12' => [
                'text' => 'I double-check all my calculations before finalizing a sale or purchase.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q13' => [
                'text' => 'I find it difficult to stay organized when things get busy.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q14' => [
                'text' => 'I set clear, measurable goals for my business every quarter.',
                'dimension' => 'conscientiousness',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q15' => [
                'text' => 'I would invest my last bit of savings into a \'sure thing\' business opportunity.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q16' => [
                'text' => 'Scenario: Choosing an investment.',
                'dimension' => 'risk_tolerance',
                'type' => 'choice',
                'options' => [
                    ['text' => '80% chance to earn 10%', 'score' => 5],
                    ['text' => '20% chance to earn 100%', 'score' => 2],
                ],
            ],
            'q17' => [
                'text' => 'I only take risks after I have analyzed all possible negative outcomes.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q18' => [
                'text' => 'I enjoy the \'rush\' of making a high-stakes business deal.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q19' => [
                'text' => 'I always have a \'Plan B\' in case my main business strategy fails.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q20' => [
                'text' => 'If I lost a large amount of money on a deal, I would immediately try a bigger deal to win it back.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q21' => [
                'text' => 'I prefer a steady, predictable income over a fluctuating one with higher potential.',
                'dimension' => 'risk_tolerance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q22' => [
                'text' => 'Scenario: A new competitor opens. Do you:',
                'dimension' => 'risk_tolerance',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Cut prices immediately', 'score' => 2],
                    ['text' => 'Research their costs and customer base first', 'score' => 5],
                ],
            ],
            'q23' => [
                'text' => 'I would rather have $1,000 today than $1,200 in six months.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q24' => [
                'text' => 'When the business makes a profit, my first instinct is to reinvest it.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q25' => [
                'text' => 'I am willing to live on a very small salary now to build a bigger business for the future.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q26' => [
                'text' => 'Scenario: You have extra cash. Do you:',
                'dimension' => 'time_preference',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Upgrade your personal vehicle', 'score' => 1],
                    ['text' => 'Purchase more inventory at a discount', 'score' => 5],
                ],
            ],
            'q27' => [
                'text' => 'I often buy things for myself on impulse.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q28' => [
                'text' => 'I am patient when waiting for my efforts to show results.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q29' => [
                'text' => 'I plan my personal finances as strictly as I plan my business finances.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q30' => [
                'text' => 'Saving money for a \'rainy day\' is more important than appearing successful to others.',
                'dimension' => 'time_preference',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q31' => [
                'text' => 'Setbacks don\'t discourage me; I find a way to work around them.',
                'dimension' => 'perseverance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q32' => [
                'text' => 'I have been obsessed with a certain idea or project for a long time but later lost interest.',
                'dimension' => 'perseverance',
                'type' => 'likert',
                'is_reverse_scored' => true,
            ],
            'q33' => [
                'text' => 'I finish whatever I begin.',
                'dimension' => 'perseverance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q34' => [
                'text' => 'Scenario: Your business model fails. Do you:',
                'dimension' => 'perseverance',
                'type' => 'choice',
                'options' => [
                    ['text' => 'Close down and try something else', 'score' => 2],
                    ['text' => 'Analyze the failure and try a modified version', 'score' => 5],
                ],
            ],
            'q35' => [
                'text' => 'I am a hard worker.',
                'dimension' => 'perseverance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
            'q36' => [
                'text' => 'Even when others say a task is impossible, I keep going.',
                'dimension' => 'perseverance',
                'type' => 'likert',
                'is_reverse_scored' => false,
            ],
        ];
    }
}
