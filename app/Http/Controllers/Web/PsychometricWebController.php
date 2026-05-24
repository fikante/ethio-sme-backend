<?php

namespace App\Http\Controllers\Web;

use App\Domain\Psychometric\Actions\ScorePsychometricAssessmentAction;
use App\Domain\Psychometric\Data\PsychometricAnswersData;
use App\Domain\Psychometric\Enums\AssessmentVersion;
use App\Domain\Psychometric\Support\QuestionBank;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PsychometricWebController extends Controller
{
    public function show(): Response
    {
        $user = auth()->user();
        $business = $user->businesses()->first();

        $assessment = $business
            ? $business->psychometricAssessments()
                ->whereNotNull('completed_at')
                ->latest()
                ->first()
            : null;

        if ($assessment === null) {
            return Inertia::render('Borrower/PsychometricResults', [
                'assessment' => null,
            ]);
        }

        $completedAt = ($assessment->completed_at ?? $assessment->created_at)
            ->format('M d, Y · h:i A');

        if ($assessment->isV2()) {
            return Inertia::render('Borrower/PsychometricResults', [
                'assessment' => [
                    'version' => 'v2',
                    'integrity' => round((float) $assessment->integrity_score * 100, 1),
                    'conscientiousness' => round((float) $assessment->conscientiousness_score * 100, 1),
                    'delayed_gratification' => round((float) $assessment->delayed_gratification_score * 100, 1),
                    'financial_risk' => round((float) $assessment->financial_risk_score * 100, 1),
                    'composite' => round((float) $assessment->composite_score * 100, 1),
                    'social_desirability_flagged' => (bool) $assessment->social_desirability_flagged,
                    'completed_at' => $completedAt,
                    'raw_answers' => $assessment->raw_answers,
                ],
            ]);
        }

        return Inertia::render('Borrower/PsychometricResults', [
            'assessment' => [
                'version' => 'v1',
                'integrity' => round((float) $assessment->integrity_score * 100, 1),
                'conscientiousness' => round((float) $assessment->conscientiousness_score * 100, 1),
                'risk_tolerance' => round((float) $assessment->financial_risk_score * 100, 1),
                'composite' => round(
                    (
                        ((float) $assessment->integrity_score * 0.4)
                        + ((float) $assessment->conscientiousness_score * 0.4)
                        + ((float) $assessment->financial_risk_score * 0.2)
                    ) * 100,
                    1,
                ),
                'completed_at' => $completedAt,
                'raw_answers' => $assessment->raw_answers,
            ],
        ]);
    }

    public function test(Request $request, QuestionBank $bank): Response
    {
        $questions = collect($bank->current())
            ->map(fn (array $question, string $id) => [
                'id' => $id,
                'text' => $question['text'],
                'dimension' => $question['dimension'],
                'type' => $question['type'] ?? 'likert',
                'section' => $question['section'] ?? null,
                'is_reverse_scored' => $question['is_reverse_scored'] ?? false,
                'options' => $question['options'] ?? null,
            ])
            ->values()
            ->all();

        $alreadyCompleted = false;
        $token = $request->query('token');

        if (is_string($token) && $token !== '') {
            $business = Business::query()->where('uuid', $token)->first();
            $assessment = $business?->psychometricAssessment;
            $alreadyCompleted = $assessment !== null && $assessment->completed_at !== null;
        }

        return Inertia::render('Borrower/PsychometricTest', [
            'submitUrl' => route('psychometric.submit'),
            'questions' => $questions,
            'questionCount' => count($questions),
            'alreadyCompleted' => $alreadyCompleted,
        ]);
    }

    public function storeFromToken(
        Request $request,
        QuestionBank $bank,
        ScorePsychometricAssessmentAction $scoreAction,
    ): JsonResponse {
        $questionCount = $bank->questionCount(AssessmentVersion::current());

        $validated = $request->validate([
            'business_token' => ['required', 'string', 'exists:businesses,uuid'],
            'answers' => ['required', 'array', 'min:'.$questionCount],
            'answers.*' => ['required', 'integer', 'min:0', 'max:5'],
        ]);

        $business = Business::query()
            ->where('uuid', $validated['business_token'])
            ->firstOrFail();

        $existing = PsychometricAssessment::query()
            ->where('business_id', $business->id)
            ->whereNotNull('completed_at')
            ->first();

        if ($existing !== null) {
            return response()->json(['success' => true, 'locked' => true]);
        }

        $scoreAction->execute(new PsychometricAnswersData(
            businessId: $business->id,
            answers: $validated['answers'],
            version: AssessmentVersion::current(),
        ));

        return response()->json(['success' => true, 'locked' => false]);
    }
}
