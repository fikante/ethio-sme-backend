<?php

namespace Tests\Feature\Valuation;

use App\Domain\Auth\Enums\RoleName;
use App\Models\AdverseActionNotice;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\PsychometricAssessment;
use App\Models\ShapExplanation;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use App\Models\Valuation;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RunAiEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private const PREDICT_URL = 'https://leykun-code-ethiopian-sme-ai-service.hf.space/predict';

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RolesAndPermissionsSeeder::class);
        config([
            'services.ai_engine.url' => 'https://leykun-code-ethiopian-sme-ai-service.hf.space',
            'services.ai_engine.key' => 'test-key',
            'services.ai_engine.timeout' => 60,
            'services.ai_engine.contract_version' => 'v1',
            'services.ai_engine.fallback_enabled' => true,
        ]);
    }

    public function test_happy_path_normal_mode(): void
    {
        Http::fake([
            self::PREDICT_URL => Http::response($this->normalPredictPayload()),
        ]);

        [$application, $officer] = $this->seedEvaluableApplication();

        $response = $this->actingAs($officer)->post(
            route('applications.evaluate', $application->id),
        );

        $response->assertRedirect(route('applications.pipeline'));
        $response->assertSessionHas('success');

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_EVALUATED, $application->status);
        $this->assertNotNull($application->valuation_id);
        $this->assertNotNull($application->npv_credit_limit);
        $this->assertContains($application->ai_risk_band, ['low', 'medium', 'high']);

        $valuation = Valuation::query()->findOrFail($application->valuation_id);
        $this->assertSame('normal', $valuation->forecaster_mode);
        $this->assertNotNull($valuation->mapped_limit_etb);
        $this->assertGreaterThan(0, ShapExplanation::query()->where('valuation_id', $valuation->id)->count());

        $this->actingAs($officer)
            ->get(route('risk.forecast.show', $application->id))
            ->assertOk();
    }

    public function test_degraded_mode_response(): void
    {
        Http::fake([
            self::PREDICT_URL => Http::response($this->degradedPredictPayload()),
        ]);

        [$application, $officer] = $this->seedEvaluableApplication();

        $this->actingAs($officer)
            ->post(route('applications.evaluate', $application->id))
            ->assertRedirect(route('applications.pipeline'));

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_EVALUATED, $application->status);
        $this->assertNull($application->npv_credit_limit);

        $valuation = Valuation::query()->findOrFail($application->valuation_id);
        $this->assertSame('degraded', $valuation->forecaster_mode);
        $this->assertNull($valuation->mapped_limit_etb);
        $this->assertNotEmpty($valuation->reason_codes);
    }

    public function test_ai_service_unreachable_uses_fallback(): void
    {
        config(['services.ai_engine.fallback_enabled' => true]);

        Http::fake([
            self::PREDICT_URL => fn () => throw new ConnectionException('Connection refused'),
        ]);

        [$application, $officer] = $this->seedEvaluableApplication();

        $this->actingAs($officer)
            ->post(route('applications.evaluate', $application->id))
            ->assertRedirect(route('applications.pipeline'));

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_EVALUATED, $application->status);
        $this->assertNotSame(LoanApplication::STATUS_PROCESSING, $application->status);
        $this->assertNotNull($application->valuation_id);
    }

    public function test_full_approve_flow(): void
    {
        [$application, $officer] = $this->seedEvaluatedApplication();
        $owner = User::query()->findOrFail($application->business->owner_id);

        $this->actingAs($officer)
            ->post(route('decisioning.decide', $application->id), [
                'decision' => 'approved',
            ])
            ->assertRedirect(route('applications.pipeline'))
            ->assertSessionHas('success');

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_APPROVED, $application->status);

        $this->actingAs($owner)
            ->get(route('loan-application'))
            ->assertOk();
    }

    public function test_full_reject_flow_with_reason_codes(): void
    {
        [$application, $officer] = $this->seedEvaluatedApplication();

        $this->actingAs($officer)
            ->post(route('decisioning.decide', $application->id), [
                'decision' => 'rejected',
                'reason_codes' => ['RC-12'],
                'narrative' => 'Insufficient history',
            ])
            ->assertRedirect(route('applications.pipeline'));

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_REJECTED, $application->status);
        $this->assertGreaterThan(
            0,
            AdverseActionNotice::query()->where('loan_application_id', $application->id)->count(),
        );
        $this->assertContains('RC-12', $application->reason_codes ?? []);
    }

    public function test_reject_without_reason_codes_fails_validation(): void
    {
        [$application, $officer] = $this->seedEvaluatedApplication();

        $this->actingAs($officer)
            ->post(route('decisioning.decide', $application->id), [
                'decision' => 'rejected',
                'reason_codes' => [],
            ])
            ->assertSessionHasErrors('reason_codes');

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_EVALUATED, $application->status);
    }

    public function test_sme_owner_cannot_trigger_evaluate(): void
    {
        [$application, , $owner] = $this->seedEvaluableApplication(withOwner: true);

        $this->actingAs($owner)
            ->post(route('applications.evaluate', $application->id))
            ->assertForbidden();

        $application->refresh();
        $this->assertSame(LoanApplication::STATUS_QUEUED_FOR_AI, $application->status);
    }

    /**
     * @return array{0: LoanApplication, 1: User}|array{0: LoanApplication, 1: User, 2: User}
     */
    private function seedEvaluableApplication(bool $withOwner = false): array
    {
        $owner = User::create([
            'name' => 'Borrower Test',
            'email' => 'borrower-eval@test.et',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $owner->assignRole(RoleName::SmeOwner->value);

        $business = Business::create([
            'owner_id' => $owner->id,
            'uuid' => 'b2fb40ea-f263-4ad6-8023-3e34ae8df73f',
            'business_name' => 'Eval Test Shop',
            'sector' => '5411',
            'sub_city' => 'Bole',
            'established_year' => 2020,
            'monthly_revenue_estimate' => 50000,
            'premises_status' => 'rented',
            'data_source' => 'test',
        ]);

        for ($i = 0; $i < 60; $i++) {
            SmeDailyHeartbeat::create([
                'business_uuid' => $business->uuid,
                'transaction_date' => now()->subDays(60 - $i)->toDateString(),
                'daily_total_inflow' => 1000,
                'daily_total_outflow' => 500,
                'net_cashflow' => 500,
                'txn_count' => 5,
                'source_type' => 'test',
            ]);
        }

        PsychometricAssessment::create([
            'business_id' => $business->id,
            'integrity_score' => 0.8,
            'conscientiousness_score' => 0.75,
            'delayed_gratification_score' => 0.7,
            'financial_risk_score' => 0.4,
            'raw_answers' => [],
            'assessment_version' => 'v2',
            'completed_at' => now(),
        ]);

        $application = LoanApplication::create([
            'business_id' => $business->id,
            'requested_amount' => 150_000,
            'requested_tenure_months' => 12,
            'status' => LoanApplication::STATUS_QUEUED_FOR_AI,
        ]);

        $officer = User::create([
            'name' => 'Loan Officer',
            'email' => 'officer-eval@test.et',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $officer->assignRole(RoleName::LoanProvider->value);

        return $withOwner
            ? [$application, $officer, $owner]
            : [$application, $officer];
    }

    /**
     * @return array{0: LoanApplication, 1: User}
     */
    private function seedEvaluatedApplication(): array
    {
        [$application, $officer] = $this->seedEvaluableApplication();

        $valuation = Valuation::create([
            'business_id' => $application->business_id,
            'loan_application_id' => $application->id,
            'status' => 'completed',
            'forecaster_mode' => 'normal',
            'contract_version' => 'v1',
            'p10_series' => array_fill(0, 30, 100.0),
            'p50_series' => array_fill(0, 30, 200.0),
            'p90_series' => array_fill(0, 30, 300.0),
            'xgboost_score' => 0.044,
            'xgboost_class' => 'low',
            'prob_default' => 0.05,
            'mapped_limit_etb' => 187_500,
            'npv_etb' => 187_500,
            'reason_codes' => [['code' => 'RC-01', 'message' => 'Test']],
            'shap_values' => ['txn_count' => 0.1],
            'inferred_at' => now(),
        ]);

        $application->update([
            'status' => LoanApplication::STATUS_EVALUATED,
            'valuation_id' => $valuation->id,
            'npv_credit_limit' => 187_500,
            'ai_risk_band' => 'low',
            'ai_risk_score' => 0.044,
            'prob_default' => 0.05,
        ]);

        return [$application->fresh(['business']), $officer];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalPredictPayload(): array
    {
        return [
            'valuation_id' => 9001,
            'business_uuid' => 'b2fb40ea-f263-4ad6-8023-3e34ae8df73f',
            'forecaster_mode' => 'normal',
            'horizon_days' => 30,
            'p10_cashflow_forecast' => array_fill(0, 30, 120.5),
            'p50_cashflow_forecast' => array_fill(0, 30, 180.0),
            'p90_cashflow_forecast' => array_fill(0, 30, 240.0),
            'ai_risk_score' => 0.044,
            'ai_risk_band' => 'low',
            'prob_default' => 0.051,
            'npv_credit_limit' => 187_500.0,
            'effective_discount_rate' => 0.18,
            'cashflow_haircut' => 0.30,
            'dscr_p10' => 1.2,
            'shap_values' => [
                'has_default_history' => -1.24,
                'payment_completion_rate' => -0.29,
            ],
            'reason_codes' => ['RC-01: Strong cashflow'],
            'shap_integrity_passed' => true,
            'contract_version' => 'v1',
            'model_versions' => [
                'forecaster' => 'lstm-v1',
                'scorer' => 'xgb-v1',
                'lstm' => 'lstm-v1',
            ],
            'feature_snapshot_hash' => 'abc123def456',
            'inferred_at' => now()->toIso8601String(),
            'horizon_reliability_warning' => false,
            'horizon_reliability_message' => null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function degradedPredictPayload(): array
    {
        $payload = $this->normalPredictPayload();
        $payload['forecaster_mode'] = 'degraded';
        $payload['npv_credit_limit'] = null;
        $payload['p10_cashflow_forecast'] = array_fill(0, 30, 0.0);
        $payload['p50_cashflow_forecast'] = array_fill(0, 30, 0.0);
        $payload['p90_cashflow_forecast'] = array_fill(0, 30, 0.0);
        $payload['reason_codes'] = ['RC-12: Insufficient transaction history'];

        return $payload;
    }
}
