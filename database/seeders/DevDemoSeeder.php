<?php

namespace Database\Seeders;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Domain\Macroeconomics\Actions\UpsertExogenousFactorsAction;
use App\Domain\Macroeconomics\Data\ExogenousFactorsData;
use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Models\Business;
use App\Models\PsychometricAssessment;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DevDemoSeeder extends Seeder
{
    public function run(
        CreateLoanApplicationAction $createApplication,
        UpsertExogenousFactorsAction $upsertFactors,
    ): void {
        $admin = User::firstOrCreate(
            ['email' => 'admin@ethiosme.test'],
            ['name' => 'Super Admin', 'password' => 'password']
        );
        $admin->syncRoles([RoleName::SuperAdmin->value]);

        $officer = User::firstOrCreate(
            ['email' => 'officer@ethiosme.test'],
            ['name' => 'Loan Provider Demo', 'password' => 'password']
        );
        $officer->syncRoles([RoleName::LoanProvider->value]);

        $heartbeatUuids = SupabaseHeartbeatSchema::isSupabaseLayout()
            ? SmeDailyHeartbeat::query()
                ->select('business_id')
                ->distinct()
                ->orderBy('business_id')
                ->limit(3)
                ->pluck('business_id')
                ->map(fn (int $id) => Business::query()->find($id)?->uuid)
                ->filter()
                ->values()
                ->all()
            : SmeDailyHeartbeat::query()
                ->select('business_uuid')
                ->distinct()
                ->orderBy('business_uuid')
                ->limit(3)
                ->pluck('business_uuid')
                ->all();

        $scenarios = [
            ['name' => 'Ato Girma - Merkato Retail', 'sector' => 'retail', 'sub_city' => 'Addis Ketema', 'profile' => 'creditworthy'],
            ['name' => 'W/ro Tigist - Bole Coffee', 'sector' => 'food_beverage', 'sub_city' => 'Bole', 'profile' => 'borderline'],
            ['name' => 'Ato Bereket - Piassa Crafts', 'sector' => 'manufacturing', 'sub_city' => 'Lideta', 'profile' => 'high_risk'],
        ];

        $psychometricByProfile = [
            'creditworthy' => [
                'integrity' => 0.88,
                'conscientiousness' => 0.82,
                'delayed_gratification' => 0.78,
                'financial_risk' => 0.65,
            ],
            'borderline' => [
                'integrity' => 0.60,
                'conscientiousness' => 0.55,
                'delayed_gratification' => 0.50,
                'financial_risk' => 0.50,
            ],
            'high_risk' => [
                'integrity' => 0.35,
                'conscientiousness' => 0.30,
                'delayed_gratification' => 0.25,
                'financial_risk' => 0.75,
            ],
        ];

        foreach ($scenarios as $index => $scenario) {
            $owner = User::firstOrCreate(
                ['email' => str()->slug($scenario['name']).'@test.et'],
                ['name' => $scenario['name'], 'password' => 'password']
            );
            $owner->syncRoles([RoleName::SmeOwner->value]);

            $uuid = $heartbeatUuids[$index] ?? null;

            $business = Business::firstOrCreate(
                ['owner_id' => $owner->id],
                [
                    'uuid' => $uuid ?? (string) str()->uuid(),
                    'business_name' => $scenario['name'],
                    'sector' => $scenario['sector'],
                    'sub_city' => $scenario['sub_city'],
                    'established_year' => 2019,
                    'monthly_revenue_estimate' => 45000,
                    'tin_number' => 'DEMO-'.str_pad((string) ($index + 1), 4, '0', STR_PAD_LEFT),
                    'premises_status' => 'rented',
                    'data_source' => 'demo_seed',
                ]
            );

            if ($uuid !== null && $business->uuid !== $uuid) {
                $business->update(['uuid' => $uuid]);
            }

            $scores = $psychometricByProfile[$scenario['profile']];

            PsychometricAssessment::updateOrCreate(
                ['business_id' => $business->id],
                [
                    'integrity_score' => $scores['integrity'],
                    'conscientiousness_score' => $scores['conscientiousness'],
                    'delayed_gratification_score' => $scores['delayed_gratification'],
                    'financial_risk_score' => $scores['financial_risk'],
                    'raw_answers' => [],
                    'assessment_version' => 'v2',
                    'completed_at' => now(),
                ]
            );

            if (SmeDailyHeartbeat::query()->forBusiness($business)->exists()) {
                $createApplication->execute(new CreateLoanApplicationData(
                    businessId: $business->id,
                    requestedAmount: 150000,
                    requestedTenureMonths: 12,
                    idempotencyKey: 'seed:'.$business->id.':app',
                ));
            }
        }

        $upsertFactors->execute(new ExogenousFactorsData(
            effectiveDate: Carbon::now(),
            nbePolicyRate: 0.15,
            inflationRate: 0.28,
            usdEtbRate: 57.50,
            fuelPriceRetail: null,
            updatedBy: $admin->id,
        ));
    }
}
