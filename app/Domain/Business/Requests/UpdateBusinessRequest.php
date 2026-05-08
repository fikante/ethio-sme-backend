<?php

namespace App\Domain\Business\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'business_name' => ['sometimes', 'required', 'string', 'max:255'],
            'sector' => ['sometimes', 'required', 'string', 'max:64'],
            'sub_city' => ['sometimes', 'required', 'string', 'max:64'],
            'established_year' => ['sometimes', 'required', 'integer', 'min:1900', 'max:'.((int) date('Y'))],
            'monthly_revenue_estimate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', 'in:active,suspended,under_review'],
        ];
    }
}
