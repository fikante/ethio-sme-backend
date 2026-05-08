<?php

namespace App\Domain\Payments\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ChapaWebhookRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'business_id' => ['required', 'integer', 'exists:businesses,id'],
            'event' => ['required', 'string'],
            'data' => ['required', 'array'],
            'data.trx_ref' => ['required', 'string', 'max:128'],
            'data.amount' => ['required', 'numeric', 'min:0'],
            'data.currency' => ['required', 'string', 'size:3'],
            'data.status' => ['required', 'in:success,failed,pending,reversed'],
            'data.payment_method' => ['required', 'string', 'max:32'],
            'data.created_at' => ['required', 'date'],
            'data.customer.email' => ['nullable', 'email'],
        ];
    }
}
