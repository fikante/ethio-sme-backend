<?php

namespace App\Domain\Macroeconomics\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExogenousFactorsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'effective_date' => ['required', 'date'],
            'nbe_policy_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'inflation_rate' => ['required', 'numeric', 'min:0', 'max:1'],
            'usd_etb_rate' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string', 'max:1024'],
        ];
    }
}
