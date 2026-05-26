<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\RoleName;
use App\Models\LoanProvider;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class LoanProviderSeeder extends Seeder
{
    public function run(): void
    {
        $providers = [
            [
                'name' => 'Commercial Bank of Ethiopia',
                'short_code' => 'CBE',
                'type' => 'commercial_bank',
                'nbe_license_no' => 'CBE-LIC-001',
                'contact_email' => 'sme@combanketh.et',
                'base_interest_rate' => 0.1500,
                'accepted_risk_bands' => ['low', 'medium'],
                'min_loan_amount_etb' => 50000,
                'max_loan_amount_etb' => 5000000,
                'officer_email' => 'cbe.officer@test.com',
                'officer_name' => 'CBE Loan Officer',
            ],
            [
                'name' => 'Awash Bank',
                'short_code' => 'AWASH',
                'type' => 'commercial_bank',
                'nbe_license_no' => 'AWB-LIC-002',
                'contact_email' => 'sme@awashbank.com',
                'base_interest_rate' => 0.1600,
                'accepted_risk_bands' => ['low', 'medium', 'high'],
                'min_loan_amount_etb' => 10000,
                'max_loan_amount_etb' => 2000000,
                'officer_email' => 'awash.officer@test.com',
                'officer_name' => 'Awash Bank Loan Officer',
            ],
            [
                'name' => 'Bank of Abyssinia',
                'short_code' => 'BOA',
                'type' => 'commercial_bank',
                'nbe_license_no' => 'BOA-LIC-003',
                'contact_email' => 'sme@bankofabyssinia.com',
                'base_interest_rate' => 0.1550,
                'accepted_risk_bands' => ['low', 'medium'],
                'min_loan_amount_etb' => 25000,
                'max_loan_amount_etb' => 3000000,
                'officer_email' => 'boa.officer@test.com',
                'officer_name' => 'Bank of Abyssinia Loan Officer',
            ],
        ];

        foreach ($providers as $data) {
            $officerEmail = $data['officer_email'];
            $officerName = $data['officer_name'];

            $providerData = array_diff_key($data, array_flip(['officer_email', 'officer_name']));

            $provider = LoanProvider::updateOrCreate(
                ['short_code' => $providerData['short_code']],
                $providerData
            );

            $officer = User::firstOrCreate(
                ['email' => $officerEmail],
                [
                    'name' => $officerName,
                    'password' => Hash::make('password'),
                    'loan_provider_id' => $provider->id,
                ]
            );
            $officer->update(['loan_provider_id' => $provider->id]);
            $officer->assignRole(RoleName::LoanProvider->value);

            // Also seed legacy short-code-based officer email for backward compat
            $legacyEmail = strtolower($providerData['short_code']).'-officer@ethiosme.test';
            if ($legacyEmail !== $officerEmail) {
                $legacyOfficer = User::firstOrCreate(
                    ['email' => $legacyEmail],
                    [
                        'name' => $providerData['short_code'].' Loan Provider',
                        'password' => Hash::make('password'),
                        'loan_provider_id' => $provider->id,
                    ]
                );
                $legacyOfficer->update(['loan_provider_id' => $provider->id]);
                $legacyOfficer->assignRole(RoleName::LoanProvider->value);
            }
        }

        $cbe = LoanProvider::where('short_code', 'CBE')->first();
        if ($cbe) {
            User::where('email', 'officer@ethiosme.test')
                ->update(['loan_provider_id' => $cbe->id]);
        }
    }
}
