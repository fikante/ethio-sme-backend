<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeUserMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $plainPassword,
        public string $role,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            from: new Address(
                config('mail.welcome_from.address', config('mail.from.address')),
                config('mail.welcome_from.name', config('mail.from.name')),
            ),
            subject: 'Welcome to EthioSME Valuation System — Your Account is Ready',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.welcome-user',
            with: [
                'name' => $this->user->name,
                'email' => $this->user->email,
                'password' => $this->plainPassword,
                'role' => $this->role,
                'loginUrl' => config('app.url').'/login',
                'roleLabel' => match ($this->role) {
                    'sme_owner' => 'SME Owner',
                    'loan_officer', 'loan_provider', 'loan-provider' => 'Loan Officer',
                    'super_admin' => 'Super Administrator',
                    default => ucfirst(str_replace('_', ' ', $this->role)),
                },
            ],
        );
    }
}
