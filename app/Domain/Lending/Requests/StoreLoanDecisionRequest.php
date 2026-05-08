<?php

namespace App\Domain\Lending\Requests;

use App\Domain\Lending\Enums\ReasonCode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLoanDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::in(['approved', 'rejected'])],
            'rejection_narrative' => ['required_if:status,rejected', 'nullable', 'string', 'max:2000'],
            'reason_codes' => ['required_if:status,rejected', 'array', 'min:1'],
            'reason_codes.*' => [Rule::in(ReasonCode::values())],
            'apr' => ['nullable', 'numeric', 'min:0', 'max:1'],
        ];
    }
}
