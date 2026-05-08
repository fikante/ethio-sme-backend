<?php

namespace App\Domain\Valuation\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RunValuationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'application_id' => ['nullable', 'integer', 'exists:loan_applications,id'],
        ];
    }
}
