<?php

namespace App\Domain\Business\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBusinessRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'business_name' => ['required', 'string', 'max:255'],
            'sector' => ['required', 'string', 'max:64'],
            'sub_city' => ['required', 'string', 'max:64'],
            'established_year' => ['required', 'integer', 'min:1900', 'max:'.((int) date('Y'))],
            'monthly_revenue_estimate' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:active,suspended,under_review'],
        ];
    }
}
