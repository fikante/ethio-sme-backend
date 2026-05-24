<?php

namespace App\Http\Controllers\Api\V1\Psychometric;

use App\Domain\Psychometric\Actions\ScorePsychometricAssessmentAction;
use App\Domain\Psychometric\Data\PsychometricAnswersData;
use App\Domain\Psychometric\Enums\AssessmentVersion;
use App\Domain\Psychometric\Requests\SubmitPsychometricRequest;
use App\Domain\Psychometric\Support\QuestionBank;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use Illuminate\Http\JsonResponse;

class PsychometricController extends Controller
{
    public function questions(QuestionBank $bank): JsonResponse
    {
        $questions = collect($bank->current())
            ->map(fn (array $question, string $id) => [
                'id' => $id,
                ...$question,
            ])
            ->values();

        return response()->json([
            'questions' => $questions,
            'version' => AssessmentVersion::current()->value,
            'instructions' => [
                'section_a' => 'For each situation, choose the answer that best describes what you would do.',
                'section_b' => 'For each statement, indicate how much you agree or disagree.',
            ],
        ]);
    }

    public function store(
        SubmitPsychometricRequest $request,
        Business $business,
        ScorePsychometricAssessmentAction $action
    ): JsonResponse {
        $this->authorize('submit', [PsychometricAssessment::class, $business]);

        $assessment = $action->execute(PsychometricAnswersData::fromRequest($request, $business->id));

        $application = LoanApplication::query()
            ->where('business_id', $business->id)
            ->latest()
            ->first();

        return response()->json([
            'assessment' => [
                'id' => $assessment->id,
                'integrity_score' => $assessment->integrity_score,
                'conscientiousness_score' => $assessment->conscientiousness_score,
                'delayed_gratification_score' => $assessment->delayed_gratification_score,
                'financial_risk_score' => $assessment->financial_risk_score,
                'composite_score' => $assessment->composite_score,
                'social_desirability_flagged' => $assessment->social_desirability_flagged,
                'assessment_version' => $assessment->assessment_version,
                'completed_at' => $assessment->completed_at,
            ],
            'credit_risk_band' => match (true) {
                (float) $assessment->composite_score >= 0.80 => 'low',
                (float) $assessment->composite_score >= 0.60 => 'medium',
                (float) $assessment->composite_score >= 0.40 => 'high',
                default => 'very_high',
            },
            'application_status' => $application?->status,
        ], 201);
    }
}
