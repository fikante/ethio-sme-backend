<?php

namespace App\Domain\Auth\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'role' => ['required', Rule::in([
                'sme_owner',
                'loan_provider',
                'loan_officer',
                'super_admin',
                'sme-owner',
                'loan-provider',
                'super-admin',
            ])],
        ];
    }
}
