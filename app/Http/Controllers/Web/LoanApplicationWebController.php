<?php

namespace App\Http\Controllers\Web;

use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Domain\TimeSeries\Actions\ImportTransactionHeartbeatAction;
use App\Domain\TimeSeries\Exceptions\TransactionImportException;
use App\Domain\TimeSeries\Support\SupabaseHeartbeatSchema;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\LoanProvider;
use App\Models\PsychometricAssessment;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class LoanApplicationWebController extends Controller
{
    public function show(): Response
    {
        /** @var User $user */
        $user = auth()->user();
        $business = $this->ensureDraftBusiness($user);

        $uploadedHeartbeatQuery = $business
            ? SmeDailyHeartbeat::query()->forBusiness($business)
            : null;

        if ($uploadedHeartbeatQuery && SupabaseHeartbeatSchema::hasSourceTypeColumn()) {
            $uploadedHeartbeatQuery->where('source_type', SupabaseHeartbeatSchema::SOURCE_TYPE_APP_UPLOAD);
        }

        $heartbeatDays = $uploadedHeartbeatQuery?->count() ?? 0;
        $dateColumn = SupabaseHeartbeatSchema::dateColumn();

        $transactions = $uploadedHeartbeatQuery
            ? $uploadedHeartbeatQuery
                ->orderByDesc($dateColumn)
                ->get([
                    $dateColumn,
                    SupabaseHeartbeatSchema::inflowColumn(),
                    SupabaseHeartbeatSchema::outflowColumn(),
                    SupabaseHeartbeatSchema::txnCountColumn(),
                    'net_cashflow',
                ])
                ->map(fn (SmeDailyHeartbeat $row) => [
                    'date' => $row->transaction_date?->toDateString(),
                    'inflow' => $row->daily_total_inflow,
                    'outflow' => $row->daily_total_outflow,
                    'net' => $row->net_cashflow ?? ((float) $row->daily_total_inflow - (float) $row->daily_total_outflow),
                    'txn_count' => $row->txn_count,
                ])
                ->values()
                ->all()
            : [];

        $dateRange = $heartbeatDays > 0
            ? [
                'from' => $uploadedHeartbeatQuery->min($dateColumn),
                'to' => $uploadedHeartbeatQuery->max($dateColumn),
            ]
            : null;

        $existingApp = $business
            ? LoanApplication::query()
                ->where('business_id', $business->id)
                ->latest()
                ->first()
            : null;

        // Cash flow analytics from all heartbeat records (ascending for charts)
        $heartbeatRecords = [];
        $weeklyTxnCounts = [];
        $cashflowStats = null;

        if ($business && $uploadedHeartbeatQuery) {
            $allRecords = (clone $uploadedHeartbeatQuery)
                ->orderBy($dateColumn, 'asc')
                ->get([
                    $dateColumn,
                    SupabaseHeartbeatSchema::inflowColumn(),
                    SupabaseHeartbeatSchema::outflowColumn(),
                    SupabaseHeartbeatSchema::txnCountColumn(),
                    'net_cashflow',
                ])
                ->map(fn (SmeDailyHeartbeat $row) => [
                    'date'    => $row->transaction_date?->toDateString() ?? '',
                    'inflow'  => (float) ($row->daily_total_inflow ?? 0),
                    'outflow' => (float) ($row->daily_total_outflow ?? 0),
                    'net'     => (float) ($row->net_cashflow ?? ((float) $row->daily_total_inflow - (float) $row->daily_total_outflow)),
                    'txn'     => (int) ($row->txn_count ?? 0),
                ])
                ->values();

            $heartbeatRecords = $allRecords->all();

            // 30-day rolling averages
            $last30 = (clone $uploadedHeartbeatQuery)
                ->orderByDesc($dateColumn)
                ->limit(30)
                ->get([
                    SupabaseHeartbeatSchema::inflowColumn(),
                    SupabaseHeartbeatSchema::outflowColumn(),
                    'net_cashflow',
                ]);

            $positiveDays = $allRecords->where('net', '>', 0)->count();
            $negativeDays = $allRecords->where('net', '<=', 0)->count();
            $totalDays = $allRecords->count();

            $cashflowStats = [
                'avg_inflow_30d'      => round((float) ($last30->avg(SupabaseHeartbeatSchema::inflowColumn()) ?? 0), 2),
                'avg_outflow_30d'     => round((float) ($last30->avg(SupabaseHeartbeatSchema::outflowColumn()) ?? 0), 2),
                'avg_net_30d'         => round((float) ($last30->avg('net_cashflow') ?? 0), 2),
                'total_days'          => $totalDays,
                'positive_days'       => $positiveDays,
                'negative_days'       => $negativeDays,
                'positive_ratio'      => $totalDays > 0 ? round($positiveDays / $totalDays * 100, 1) : 0,
                'cashflow_volatility' => $this->computeVolatilityLabel($allRecords->pluck('net')->toArray()),
            ];

            // Weekly transaction volume aggregation
            $weeklyTxnCounts = $allRecords
                ->groupBy(fn ($r) => \Carbon\Carbon::parse($r['date'])->startOfWeek()->toDateString())
                ->map(fn ($week, $startDate) => [
                    'week'  => $startDate,
                    'total' => $week->sum('txn'),
                ])
                ->values()
                ->all();
        }

        $loanProviders = LoanProvider::query()
            ->active()
            ->orderBy('name')
            ->get(['id', 'name', 'short_code', 'logo_url', 'status',
                'min_loan_amount_etb', 'max_loan_amount_etb', 'base_interest_rate'])
            ->map(fn (LoanProvider $p) => [
                'id'                  => $p->id,
                'name'                => $p->name,
                'short_code'          => $p->short_code,
                'logo_url'            => $p->logo_url,
                'min_loan_amount_etb' => (float) $p->min_loan_amount_etb,
                'max_loan_amount_etb' => (float) $p->max_loan_amount_etb,
                'base_interest_rate'  => (float) $p->base_interest_rate,
            ])
            ->values()
            ->all();

        return Inertia::render('Borrower/LoanApplication', [
            'loanProviders' => $loanProviders,
            'transactions' => $transactions,
            'existingApplication' => $existingApp ? [
                'status'                   => $existingApp->status,
                'requested_amount'         => $existingApp->requested_amount,
                'requested_tenure_months'  => $existingApp->requested_tenure_months,
                'apr'                      => $existingApp->apr,
                'ai_risk_band'             => $existingApp->ai_risk_band,
                'created_at'               => $existingApp->created_at->toDateTimeString(),
            ] : null,
            'hasBusiness'          => (bool) $business,
            'heartbeatDays'        => $heartbeatDays,
            'transactionDateRange' => $dateRange,
            'businessUuid'         => $business?->uuid,
            'psychometricCompleted' => $business
                ? PsychometricAssessment::query()
                    ->where('business_id', $business->id)
                    ->whereNotNull('completed_at')
                    ->exists()
                : false,
            'heartbeatRecords' => $heartbeatRecords,
            'weeklyTxnCounts'  => $weeklyTxnCounts,
            'cashflowStats'    => $cashflowStats,
        ]);
    }

    private function computeVolatilityLabel(array $netCashflows): string
    {
        if (count($netCashflows) < 5) {
            return 'Insufficient data';
        }
        $mean = array_sum($netCashflows) / count($netCashflows);
        $variance = array_sum(array_map(fn ($v) => ($v - $mean) ** 2, $netCashflows)) / count($netCashflows);
        $stdDev = sqrt($variance);
        $cv = $mean != 0 ? abs($stdDev / $mean) : 1;

        if ($cv < 0.3) {
            return 'Low';
        } elseif ($cv < 0.7) {
            return 'Moderate';
        } else {
            return 'High';
        }
    }

    public function store(
        Request $request,
        CreateLoanApplicationAction $createApplication,
        ImportTransactionHeartbeatAction $importHeartbeat,
    ): RedirectResponse {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'business_name' => ['required', 'string', 'max:255'],
            'sector' => ['required', 'string'],
            'sub_city' => ['required', 'string'],
            'established_year' => ['required', 'integer', 'min:1990', 'max:'.date('Y')],
            'employee_count' => ['required', 'integer', 'min:1', 'max:9999'],
            'premises_status' => ['required', 'in:owned,rented,online'],
            'tin_number' => ['nullable', 'string', 'max:50'],
            'trade_license_no' => ['nullable', 'string', 'max:100'],
            'monthly_revenue_estimate' => ['nullable', 'numeric', 'min:0'],
            'requested_amount' => ['required', 'numeric', 'min:10000', 'max:5000000'],
            'tenure_months' => ['required', 'integer', 'in:6,12,18,24'],
            'purpose' => ['required', 'string', 'max:500'],
            'transaction_file' => ['required', 'file', 'mimes:csv,xlsx,xls,txt', 'max:10240'],
            'loan_provider_id' => ['required', 'integer', 'exists:loan_providers,id'],
        ]);

        /** @var User $user */
        $user = auth()->user();

        $user->update(['name' => $validated['full_name']]);

        $existingBusiness = $user->businesses()->withTrashed()->first();

        if ($existingBusiness?->trashed()) {
            $existingBusiness->restore();
        }

        $business = Business::updateOrCreate(
            ['owner_id' => $user->id],
            [
                'uuid' => $existingBusiness?->uuid ?? (string) Str::uuid(),
                'business_name' => $validated['business_name'],
                'sector' => $validated['sector'],
                'sub_city' => $validated['sub_city'],
                'established_year' => $validated['established_year'],
                'employee_count' => (int) $validated['employee_count'],
                'premises_status' => $validated['premises_status'],
                'tin_number' => $validated['tin_number'] ?? null,
                'trade_license_no' => $validated['trade_license_no'] ?? null,
                'monthly_revenue_estimate' => isset($validated['monthly_revenue_estimate'])
                    ? (float) $validated['monthly_revenue_estimate']
                    : null,
            ]
        );

        $duplicate = LoanApplication::query()
            ->where('business_id', $business->id)
            ->whereNotIn('status', [
                LoanApplication::STATUS_REJECTED,
                LoanApplication::STATUS_WITHDRAWN,
                LoanApplication::STATUS_DRAFT,
            ])
            ->exists();

        if ($duplicate) {
            return redirect()
                ->route('loan-application')
                ->withErrors([
                    'transaction_file' => 'You already have an active loan application.',
                ])
                ->withInput();
        }

        try {
            $importedDays = $importHeartbeat->execute($business, $request->file('transaction_file'));
        } catch (TransactionImportException $e) {
            return redirect()
                ->route('loan-application')
                ->withErrors(['transaction_file' => $e->getMessage()])
                ->withInput();
        } catch (\Throwable $e) {
            report($e);
            // #region agent log
            @file_put_contents(base_path('.cursor/debug-054501.log'), json_encode([
                'sessionId' => '054501',
                'hypothesisId' => 'H1-net-cashflow',
                'location' => 'LoanApplicationWebController::store',
                'message' => 'heartbeat import failed',
                'data' => [
                    'exception' => $e::class,
                    'error' => $e->getMessage(),
                    'omitNetCashflow' => SupabaseHeartbeatSchema::omitNetCashflowOnInsert(),
                    'isSupabaseLayout' => SupabaseHeartbeatSchema::isSupabaseLayout(),
                ],
                'timestamp' => (int) (microtime(true) * 1000),
            ])."\n", FILE_APPEND);
            // #endregion

            return redirect()
                ->route('loan-application')
                ->withErrors([
                    'transaction_file' => 'Could not save transaction history. Please verify your file and try again.',
                ])
                ->withInput();
        }

        $file = $request->file('transaction_file');
        $file->storeAs(
            'transactions',
            $business->uuid.'_transactions.'.$file->getClientOriginalExtension(),
            'local'
        );

        $psychometricDone = PsychometricAssessment::query()
            ->where('business_id', $business->id)
            ->whereNotNull('completed_at')
            ->exists();

        $application = $createApplication->execute(new CreateLoanApplicationData(
            businessId: $business->id,
            requestedAmount: (float) $validated['requested_amount'],
            requestedTenureMonths: (int) $validated['tenure_months'],
            idempotencyKey: $request->header('Idempotency-Key'),
            loanProviderId: (int) $validated['loan_provider_id'],
        ));

        $application->update([
            'status' => $psychometricDone
                ? LoanApplication::STATUS_QUEUED_FOR_AI
                : LoanApplication::STATUS_PENDING_PSYCHOMETRIC,
        ]);

        // #region agent log
        @file_put_contents(base_path('.cursor/debug-054501.log'), json_encode([
            'sessionId' => '054501',
            'hypothesisId' => 'H1-net-cashflow',
            'location' => 'LoanApplicationWebController::store',
            'message' => 'loan application submitted',
            'data' => [
                'applicationId' => $application->id,
                'businessId' => $business->id,
                'importedDays' => $importedDays,
                'status' => $application->status,
                'omitNetCashflow' => SupabaseHeartbeatSchema::omitNetCashflowOnInsert(),
            ],
            'timestamp' => (int) (microtime(true) * 1000),
        ])."\n", FILE_APPEND);
        // #endregion

        return redirect()
            ->route('loan-application')
            ->with(
                'success',
                "Application submitted successfully. {$importedDays} days of transaction history loaded. Awaiting AI evaluation."
            );
    }

    public function ensureBusiness(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = auth()->user();

        $validated = $request->validate([
            'business_name' => ['nullable', 'string', 'max:255'],
            'sector' => ['nullable', 'string'],
            'sub_city' => ['nullable', 'string'],
            'established_year' => ['nullable', 'integer', 'min:1990', 'max:'.date('Y')],
        ]);

        $business = $this->ensureDraftBusiness($user);

        $updates = array_filter([
            'business_name' => $validated['business_name'] ?? null,
            'sector' => $validated['sector'] ?? null,
            'sub_city' => $validated['sub_city'] ?? null,
            'established_year' => $validated['established_year'] ?? null,
        ], fn ($value) => $value !== null && $value !== '');

        if ($updates !== []) {
            $business->update($updates);
        }

        return response()->json([
            'businessUuid' => $business->uuid,
            'psychometricCompleted' => PsychometricAssessment::query()
                ->where('business_id', $business->id)
                ->whereNotNull('completed_at')
                ->exists(),
        ]);
    }

    private function ensureDraftBusiness(User $user): Business
    {
        $existing = $user->businesses()->withTrashed()->first();

        if ($existing !== null) {
            if ($existing->trashed()) {
                $existing->restore();
            }

            return $existing;
        }

        $label = trim($user->name) !== '' ? "{$user->name}'s Business" : 'My Business';

        return Business::create([
            'owner_id' => $user->id,
            'business_name' => $label,
            'sector' => '5411',
            'sub_city' => 'Addis Ababa',
            'established_year' => (int) date('Y') - 3,
            'status' => 'under_review',
        ]);
    }
}
