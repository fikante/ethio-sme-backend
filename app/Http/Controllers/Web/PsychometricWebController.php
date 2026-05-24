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

        return Inertia::render('Borrower/PsychometricResults', [
            'assessment' => $assessment ? [
                'integrity' => round((float) $assessment->integrity_score * 100, 1),
                'conscientiousness' => round((float) $assessment->conscientiousness_score * 100, 1),
                'risk_tolerance' => round((float) $assessment->risk_tolerance_score * 100, 1),
                'completed_at' => ($assessment->completed_at ?? $assessment->created_at)
                    ->format('M d, Y · h:i A'),
                'raw_answers' => $assessment->raw_answers,
            ] : null,
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
            'answers.*' => ['required', 'integer', 'min:1', 'max:5'],
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
