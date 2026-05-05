<?php

namespace App\Http\Controllers\Api;

use App\Domain\Psychometric\Services\PsychometricNormalizationService;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PsychometricController extends Controller
{
    public function __construct(
        private readonly PsychometricNormalizationService $normService
    ) {}

    public function questions(): JsonResponse
    {
        return response()->json([
            'questions'     => $this->normService->getQuestions(),
            'instructions'  => 'Answer each question on a scale of 1 (strongly disagree) to 5 (strongly agree).',
        ]);
    }

    public function submit(Request $request): JsonResponse
    {
        $data = $request->validate([
            'business_id' => 'required|exists:businesses,id',
            'answers'     => 'required|array|min:15',
            'answers.*'   => 'required|integer|min:1|max:5',
        ]);

        $scores = $this->normService->normalize($data['answers']);

        $assessment = PsychometricAssessment::updateOrCreate(
            ['business_id' => $data['business_id']],
            [
                ...$scores,
                'raw_answers'  => $data['answers'],
                'completed_at' => now(),
            ]
        );

        // Advance application status
        $application = Business::find($data['business_id'])
            ?->loanApplications()
            ->where('status', 'pending_psychometric')
            ->latest()
            ->first();

        $application?->update(['status' => 'pending_data_sync']);

        return response()->json([
            'assessment'         => $assessment,
            'application_status' => $application?->status,
        ]);
    }
}

