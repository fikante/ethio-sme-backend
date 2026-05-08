<?php

namespace App\Http\Controllers\Api\V1\Psychometric;

use App\Domain\Psychometric\Actions\ScorePsychometricAssessmentAction;
use App\Domain\Psychometric\Data\PsychometricAnswersData;
use App\Domain\Psychometric\Requests\SubmitPsychometricRequest;
use App\Domain\Psychometric\Support\QuestionBank;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use Illuminate\Http\JsonResponse;

class PsychometricController extends Controller
{
    public function questions(QuestionBank $bank): JsonResponse
    {
        return response()->json([
            'questions' => $bank->current(),
            'instructions' => 'Answer each question on a 1 (strongly disagree) to 5 (strongly agree) Likert scale.',
        ]);
    }

    public function store(
        SubmitPsychometricRequest $request,
        Business $business,
        ScorePsychometricAssessmentAction $action
    ): JsonResponse {
        $this->authorize('submit', [PsychometricAssessment::class, $business]);

        $assessment = $action->execute(PsychometricAnswersData::fromRequest($request, $business->id));

        return response()->json($assessment, 201);
    }
}
