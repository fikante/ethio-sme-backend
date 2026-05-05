<?php

namespace Database\Seeders;

use App\Domain\Transactions\Services\ChapaWebhookSimulatorService;
use App\Domain\Transactions\Services\TransactionAggregatorService;
use App\Models\Business;
use App\Models\ExogenousFactor;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DevDemoSeeder extends Seeder
{
    public function run(
        ChapaWebhookSimulatorService $simulator,
        TransactionAggregatorService $aggregator
    ): void {
        // Super admin
        $admin = User::firstOrCreate(
            ['email' => 'admin@ethiosme.test'],
            ['name' => 'Super Admin', 'password' => Hash::make('password')]
        );
        $admin->assignRole('super_admin');

        // Loan officer
        $officer = User::firstOrCreate(
            ['email' => 'officer@ethiosme.test'],
            ['name' => 'Loan Officer', 'password' => Hash::make('password')]
        );
        $officer->assignRole('loan_officer');

        // Demo scenarios: creditworthy, borderline, high-risk
        $scenarios = [
            ['name' => 'Ato Girma - Merkato Retail', 'sector' => 'retail',         'sub_city' => 'Addis Ketema', 'type' => 'creditworthy'],
            ['name' => 'W/ro Tigist - Bole Coffee',  'sector' => 'food_beverage',  'sub_city' => 'Bole',         'type' => 'borderline'],
            ['name' => 'Ato Bereket - Piassa Crafts','sector' => 'manufacturing',  'sub_city' => 'Lideta',       'type' => 'high_risk'],
        ];

        foreach ($scenarios as $scenario) {
            $owner = User::firstOrCreate(
                ['email' => \Illuminate\Support\Str::slug($scenario['name']) . '@test.et'],
                ['name' => $scenario['name'], 'password' => Hash::make('password')]
            );
            $owner->assignRole('sme_owner');

            $business = Business::firstOrCreate(
                ['owner_id' => $owner->id],
                [
                    'business_name'            => $scenario['name'],
                    'sector'                   => $scenario['sector'],
                    'sub_city'                 => $scenario['sub_city'],
                    'established_year'         => 2019,
                    'monthly_revenue_estimate' => 45000,
                ]
            );

            // Psychometric scores — vary by scenario
            $psychoMap = [
                'creditworthy' => ['integrity' => 0.88, 'conscientiousness' => 0.82, 'risk_tolerance' => 0.65],
                'borderline'   => ['integrity' => 0.60, 'conscientiousness' => 0.55, 'risk_tolerance' => 0.50],
                'high_risk'    => ['integrity' => 0.35, 'conscientiousness' => 0.30, 'risk_tolerance' => 0.80],
            ];

            PsychometricAssessment::firstOrCreate(
                ['business_id' => $business->id],
                [
                    'integrity_score'         => $psychoMap[$scenario['type']]['integrity'],
                    'conscientiousness_score' => $psychoMap[$scenario['type']]['conscientiousness'],
                    'risk_tolerance_score'    => $psychoMap[$scenario['type']]['risk_tolerance'],
                    'raw_answers'             => [],
                    'completed_at'            => now(),
                ]
            );

            // Simulate 60 days of transactions
            $simulator->simulate($business, 60);
            $aggregator->aggregateAll($business, 60);

            // Create application ready for AI evaluation
            LoanApplication::firstOrCreate(
                ['business_id' => $business->id],
                [
                    'requested_amount'        => 150000,
                    'requested_tenure_months' => 12,
                    'status'                  => 'queued_for_ai',
                ]
            );
        }

        // Current macroeconomic factors
        ExogenousFactor::firstOrCreate(
            ['effective_date' => now()->toDateString()],
            [
                'nbe_policy_rate' => 0.15,
                'inflation_rate'  => 0.28,
                'usd_etb_rate'    => 57.50,
                'updated_by'      => $admin->id,
                'notes'           => 'Current NBE policy rate per SBB/95/2025',
            ]
        );
    }
}

