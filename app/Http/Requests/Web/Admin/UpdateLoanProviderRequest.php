<?php

namespace App\Http\Requests\Web\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLoanProviderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['super_admin', 'super-admin']) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $provider = $this->route('loanProvider');

        return [
            'name'                => 'sometimes|string|max:255',
            'short_code'          => ['sometimes', 'string', 'max:20', Rule::unique('loan_providers', 'short_code')->ignore($provider?->id)],
            'type'                => 'sometimes|in:commercial_bank,development_bank,microfinance,cooperative',
            'nbe_license_no'      => 'sometimes|nullable|string|max:64',
            'contact_email'       => 'sometimes|nullable|email|max:255',
            'contact_phone'       => 'sometimes|nullable|string|max:30',
            'website'             => 'sometimes|nullable|url|max:255',
            'address'             => 'sometimes|nullable|string|max:500',
            'accepted_risk_bands' => 'sometimes|array|min:1',
            'accepted_risk_bands.*' => 'in:low,medium,high',
            'min_loan_amount_etb' => 'sometimes|numeric|min:0',
            'max_loan_amount_etb' => 'sometimes|numeric',
            'base_interest_rate'  => 'sometimes|numeric|between:0,1',
            'logo_url'            => 'sometimes|nullable|url|max:500',
            'status'              => 'sometimes|in:active,inactive,suspended',
        ];
    }
}
