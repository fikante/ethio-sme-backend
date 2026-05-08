<?php

namespace App\Domain\Payments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SimulateStatementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'days' => ['nullable', 'integer', 'min:30', 'max:90'],
        ];
    }
}
