<?php

namespace App\Domain\Compliance\Requests;

use App\Models\DataSubjectRequest;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ErasureRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'type' => ['nullable', Rule::in([DataSubjectRequest::TYPE_ERASURE, DataSubjectRequest::TYPE_EXPORT])],
            'notes' => ['nullable', 'string', 'max:1024'],
        ];
    }
}
