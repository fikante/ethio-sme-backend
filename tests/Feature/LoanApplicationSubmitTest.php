<?php

namespace Tests\Feature;

use App\Domain\Auth\Enums\RoleName;
use App\Domain\TimeSeries\Services\ImportTransactionHeartbeatService;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class LoanApplicationSubmitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        Storage::fake('local');
    }

    public function test_sme_owner_can_submit_loan_application_with_transaction_csv(): void
    {
        $user = $this->createSmeOwner('Abebe Kebede', 'abebe@example.com');

        $csv = $this->makeTransactionCsv(ImportTransactionHeartbeatService::MIN_DAILY_ROWS);
        $file = UploadedFile::fake()->createWithContent('cbe_history.csv', $csv);

        $response = $this
            ->actingAs($user)
            ->post(route('loan-application.submit'), [
                'full_name' => 'Abebe Kebede',
                'phone' => '+251911223344',
                'business_name' => 'Abebe Retail',
                'sector' => '5411',
                'sub_city' => 'Bole',
                'established_year' => 2020,
                'requested_amount' => 100_000,
                'tenure_months' => 12,
                'purpose' => 'Inventory for peak season',
                'transaction_file' => $file,
            ]);

        $response
            ->assertRedirect(route('loan-application'))
            ->assertSessionHas('success');

        $business = Business::query()->where('owner_id', $user->id)->first();
        $this->assertNotNull($business);
        $this->assertSame('Abebe Retail', $business->business_name);
        $this->assertSame('5411', $business->sector);
        $this->assertSame('Bole', $business->sub_city);

        $this->assertSame(
            ImportTransactionHeartbeatService::MIN_DAILY_ROWS,
            SmeDailyHeartbeat::query()->where('business_uuid', $business->uuid)->count(),
        );

        $application = LoanApplication::query()
            ->where('business_id', $business->id)
            ->first();

        $this->assertNotNull($application);
        $this->assertEquals(100_000, (float) $application->requested_amount);
        $this->assertSame(12, $application->requested_tenure_months);
        $this->assertSame(LoanApplication::STATUS_PENDING_PSYCHOMETRIC, $application->status);

        Storage::disk('local')->assertExists(
            'transactions/'.$business->uuid.'_transactions.csv',
        );
    }

    public function test_submit_rejects_transaction_file_with_fewer_than_minimum_days(): void
    {
        $user = $this->createSmeOwner();

        $csv = $this->makeTransactionCsv(ImportTransactionHeartbeatService::MIN_DAILY_ROWS - 1);
        $file = UploadedFile::fake()->createWithContent('short_history.csv', $csv);

        $response = $this
            ->actingAs($user)
            ->from(route('loan-application'))
            ->post(route('loan-application.submit'), [
                'full_name' => 'Test User',
                'phone' => '+251911223344',
                'business_name' => 'Short Data Shop',
                'sector' => '5411',
                'sub_city' => 'Bole',
                'established_year' => 2020,
                'requested_amount' => 100_000,
                'tenure_months' => 12,
                'purpose' => 'Working capital',
                'transaction_file' => $file,
            ]);

        $response
            ->assertRedirect(route('loan-application'))
            ->assertSessionHasErrors(['transaction_file']);

        $this->assertDatabaseCount('loan_applications', 0);
        $this->assertDatabaseCount('sme_daily_heartbeat', 0);
    }

    private function createSmeOwner(
        string $name = 'Test User',
        string $email = 'sme-owner@example.com',
    ): User {
        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $user->assignRole(RoleName::SmeOwner->value);

        return $user;
    }

    private function makeTransactionCsv(int $days): string
    {
        $lines = ['Transaction_Date,Daily_Total_Inflow,Daily_Total_Outflow'];
        $start = new \DateTimeImmutable('2025-01-01');

        for ($i = 0; $i < $days; $i++) {
            $date = $start->modify("+{$i} days")->format('Y-m-d');
            $lines[] = "{$date},1000,500";
        }

        return implode("\n", $lines);
    }
}
