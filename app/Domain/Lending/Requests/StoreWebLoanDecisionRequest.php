<?php

namespace App\Domain\Lending\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWebLoanDecisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approved', 'rejected'])],
            'reason_codes' => ['required_if:decision,rejected', 'array', 'min:1'],
            'reason_codes.*' => ['string', 'max:200'],
            'narrative' => ['nullable', 'string', 'max:2000'],
            'rejection_narrative' => ['nullable', 'string', 'max:2000'],
            'officer_notes' => ['nullable', 'string', 'max:2000'],
            'rejection_reason_code' => ['nullable', 'string', 'max:200'],
        ];
    }
}
