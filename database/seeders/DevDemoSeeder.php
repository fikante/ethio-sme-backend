<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Domain\Macroeconomics\Actions\UpsertExogenousFactorsAction;
use App\Domain\Macroeconomics\Data\ExogenousFactorsData;
use App\Domain\Payments\Actions\InjectSyntheticStatementAction;
use App\Domain\Payments\Data\SimulationRequestData;
use App\Domain\TimeSeries\Services\DailyHeartbeatAggregatorService;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DevDemoSeeder extends Seeder
{
    public function run(
        InjectSyntheticStatementAction $injectStatement,
        DailyHeartbeatAggregatorService $aggregator,
        CreateLoanApplicationAction $createApplication,
        UpsertExogenousFactorsAction $upsertFactors,
    ): void {
        $admin = User::firstOrCreate(
            ['email' => 'admin@ethiosme.test'],
            ['name' => 'Super Admin', 'password' => Hash::make('password')]
        );
        $admin->syncRoles([RoleName::SuperAdmin->value]);

        $officer = User::firstOrCreate(
            ['email' => 'officer@ethiosme.test'],
            ['name' => 'Loan Officer', 'password' => Hash::make('password')]
        );
        $officer->syncRoles([RoleName::LoanOfficer->value]);

        $scenarios = [
            ['name' => 'Ato Girma - Merkato Retail',  'sector' => 'retail',        'sub_city' => 'Addis Ketema', 'profile' => 'creditworthy'],
            ['name' => 'W/ro Tigist - Bole Coffee',   'sector' => 'food_beverage', 'sub_city' => 'Bole',         'profile' => 'borderline'],
            ['name' => 'Ato Bereket - Piassa Crafts', 'sector' => 'manufacturing', 'sub_city' => 'Lideta',       'profile' => 'high_risk'],
        ];

        $psychometricByProfile = [
            'creditworthy' => ['integrity' => 0.88, 'conscientiousness' => 0.82, 'risk_tolerance' => 0.65],
            'borderline' => ['integrity' => 0.60, 'conscientiousness' => 0.55, 'risk_tolerance' => 0.50],
            'high_risk' => ['integrity' => 0.35, 'conscientiousness' => 0.30, 'risk_tolerance' => 0.80],
        ];

        foreach ($scenarios as $scenario) {
            $owner = User::firstOrCreate(
                ['email' => Str::slug($scenario['name']).'@test.et'],
                ['name' => $scenario['name'], 'password' => Hash::make('password')]
            );
            $owner->syncRoles([RoleName::SmeOwner->value]);

            $business = Business::firstOrCreate(
                ['owner_id' => $owner->id],
                [
                    'business_name' => $scenario['name'],
                    'sector' => $scenario['sector'],
                    'sub_city' => $scenario['sub_city'],
                    'established_year' => 2019,
                    'monthly_revenue_estimate' => 45000,
                ]
            );

            $scores = $psychometricByProfile[$scenario['profile']];

            PsychometricAssessment::firstOrCreate(
                ['business_id' => $business->id],
                [
                    'integrity_score' => $scores['integrity'],
                    'conscientiousness_score' => $scores['conscientiousness'],
                    'risk_tolerance_score' => $scores['risk_tolerance'],
                    'raw_answers' => [],
                    'completed_at' => now(),
                ]
            );

            $injectStatement->execute(
                $business,
                new SimulationRequestData(
                    businessId: $business->id,
                    days: 60,
                    idempotencyKey: 'seed:'.$business->id.':sim',
                ),
            );
            $aggregator->aggregateWindow($business, 60);

            $createApplication->execute(new CreateLoanApplicationData(
                businessId: $business->id,
                requestedAmount: 150000,
                requestedTenureMonths: 12,
                idempotencyKey: 'seed:'.$business->id.':app',
            ));
        }

        $upsertFactors->execute(new ExogenousFactorsData(
            effectiveDate: Carbon::now(),
            nbePolicyRate: 0.15,
            inflationRate: 0.28,
            usdEtbRate: 57.50,
            notes: 'Current NBE policy rate per SBB/95/2025',
            updatedBy: $admin->id,
        ));
    }
}
