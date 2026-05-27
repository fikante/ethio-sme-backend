<?php

namespace App\Http\Requests\Web\Admin;

use Illuminate\Foundation\Http\FormRequest;

class StoreLoanProviderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole(['super_admin', 'super-admin']) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name'                => 'required|string|max:255',
            'short_code'          => 'required|string|max:20|unique:loan_providers,short_code',
            'type'                => 'required|in:commercial_bank,development_bank,microfinance,cooperative',
            'nbe_license_no'      => 'nullable|string|max:64',
            'contact_email'       => 'nullable|email|max:255',
            'contact_phone'       => 'nullable|string|max:30',
            'website'             => 'nullable|url|max:255',
            'address'             => 'nullable|string|max:500',
            'accepted_risk_bands' => 'required|array|min:1',
            'accepted_risk_bands.*' => 'in:low,medium,high',
            'min_loan_amount_etb' => 'required|numeric|min:0',
            'max_loan_amount_etb' => 'required|numeric|gt:min_loan_amount_etb',
            'base_interest_rate'  => 'required|numeric|between:0,1',
            'logo_url'            => 'nullable|url|max:500',
            'status'              => 'sometimes|in:active,inactive,suspended',
        ];
    }
}
