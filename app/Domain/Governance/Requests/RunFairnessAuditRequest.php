<?php

namespace App\Domain\Governance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RunFairnessAuditRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'cohorts' => ['required', 'array', 'min:2'],
            'cohorts.*.label' => ['required', 'string'],
            'cohorts.*.match' => ['required', 'array'],
            'notes' => ['nullable', 'string', 'max:1024'],
        ];
    }
}
