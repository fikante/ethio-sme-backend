<?php

namespace App\Domain\Compliance\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ConsentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'purpose' => ['required', 'string', 'max:128'],
            'document_version' => ['required', 'string', 'max:32'],
            'granted' => ['nullable', 'boolean'],
        ];
    }
}
