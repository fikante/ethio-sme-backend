<?php

namespace App\Domain\Psychometric\Requests;

use App\Domain\Psychometric\Enums\AssessmentVersion;
use App\Domain\Psychometric\Support\QuestionBank;
use Illuminate\Foundation\Http\FormRequest;

class SubmitPsychometricRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        $count = app(QuestionBank::class)->questionCount(AssessmentVersion::current());

        return [
            'answers' => ['required', 'array', 'min:'.$count],
            'answers.*' => ['required', 'integer', 'min:0', 'max:5'],
        ];
    }
}
