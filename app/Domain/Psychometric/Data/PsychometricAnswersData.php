<?php

namespace App\Domain\Psychometric\Data;

use App\Domain\Psychometric\Enums\AssessmentVersion;
use Illuminate\Http\Request;
use Spatie\LaravelData\Data;

class PsychometricAnswersData extends Data
{
    /**
     * @param  array<string, int>  $answers
     */
    public function __construct(
        public readonly int $businessId,
        public readonly array $answers,
        public readonly AssessmentVersion $version,
    ) {}

    public static function fromRequest(Request $request, int $businessId): self
    {
        return new self(
            businessId: $businessId,
            answers: (array) $request->input('answers', []),
            version: AssessmentVersion::current(),
        );
    }
}
