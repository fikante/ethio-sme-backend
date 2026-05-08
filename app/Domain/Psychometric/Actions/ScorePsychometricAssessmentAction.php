<?php

namespace App\Domain\Psychometric\Actions;

use App\Domain\Psychometric\Data\PsychometricAnswersData;
use App\Domain\Psychometric\Support\PsychometricNormalizer;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use Illuminate\Support\Facades\DB;

class ScorePsychometricAssessmentAction
{
    public function __construct(private readonly PsychometricNormalizer $normalizer) {}

    public function execute(PsychometricAnswersData $data): PsychometricAssessment
    {
        return DB::transaction(function () use ($data): PsychometricAssessment {
            $result = $this->normalizer->normalize($data->answers, $data->version);

            $assessment = PsychometricAssessment::updateOrCreate(
                ['business_id' => $data->businessId],
                [
                    ...$result->toAttributes(),
                    'raw_answers' => $data->answers,
                    'completed_at' => now(),
                ]
            );

            LoanApplication::query()
                ->where('business_id', $data->businessId)
                ->where('status', LoanApplication::STATUS_PENDING_PSYCHOMETRIC)
                ->update(['status' => LoanApplication::STATUS_PENDING_DATA_SYNC]);

            return $assessment->fresh();
        });
    }
}
