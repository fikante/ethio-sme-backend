<?php

namespace App\Domain\Psychometric\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SubmitPsychometricRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'answers' => ['required', 'array', 'min:15'],
            'answers.*' => ['required', 'integer', 'min:1', 'max:5'],
        ];
    }
}
