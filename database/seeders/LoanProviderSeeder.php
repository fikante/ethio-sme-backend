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
            ],
            [
                'name' => 'Amhara Bank',
                'short_code' => 'AMHARA',
                'type' => 'commercial_bank',
                'nbe_license_no' => 'AMB-LIC-003',
                'contact_email' => 'credit@amharabank.com.et',
                'base_interest_rate' => 0.1550,
                'accepted_risk_bands' => ['low'],
                'min_loan_amount_etb' => 100000,
                'max_loan_amount_etb' => 10000000,
            ],
        ];

        foreach ($providers as $data) {
            $provider = LoanProvider::firstOrCreate(
                ['short_code' => $data['short_code']],
                $data
            );

            $officer = User::firstOrCreate(
                ['email' => strtolower($data['short_code']).'-officer@ethiosme.test'],
                [
                    'name' => $data['short_code'].' Loan Provider',
                    'password' => Hash::make('password'),
                    'loan_provider_id' => $provider->id,
                ]
            );
            $officer->update(['loan_provider_id' => $provider->id]);
            $officer->assignRole(RoleName::LoanProvider->value);
        }

        $cbe = LoanProvider::where('short_code', 'CBE')->first();
        User::where('email', 'officer@ethiosme.test')
            ->update(['loan_provider_id' => $cbe?->id]);
    }
}
