<?php

namespace App\Http\Controllers\Web;

use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Domain\Payments\Actions\InjectSyntheticStatementAction;
use App\Domain\Payments\Data\SimulationRequestData;
use App\Domain\TimeSeries\Services\DailyHeartbeatAggregatorService;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
use App\Models\SmeDailyHeartbeat;
use App\Models\User;
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
        $business = $user->businesses()->first();

        $transactions = $business
            ? SmeDailyHeartbeat::query()
                ->where('business_id', $business->id)
                ->orderByDesc('heartbeat_date')
                ->take(30)
                ->get(['heartbeat_date', 'inflow_total', 'outflow_total', 'transaction_count'])
                ->map(fn (SmeDailyHeartbeat $row) => [
                    'date' => $row->heartbeat_date?->toDateString(),
                    'inflow' => $row->inflow_total,
                    'outflow' => $row->outflow_total,
                    'net' => (float) $row->inflow_total - (float) $row->outflow_total,
                    'txn_count' => $row->transaction_count,
                ])
                ->values()
                ->all()
            : [];

        $existingApp = $business
            ? LoanApplication::query()
                ->where('business_id', $business->id)
                ->latest()
                ->first()
            : null;

        return Inertia::render('Borrower/LoanApplication', [
            'transactions' => $transactions,
            'existingApplication' => $existingApp ? [
                'status' => $existingApp->status,
                'requested_amount' => $existingApp->requested_amount,
                'tenure_months' => $existingApp->requested_tenure_months,
                'created_at' => $existingApp->created_at->toDateTimeString(),
            ] : null,
            'hasBusiness' => (bool) $business,
            'heartbeatDays' => $business
                ? SmeDailyHeartbeat::query()->where('business_id', $business->id)->count()
                : 0,
        ]);
    }

    public function store(
        Request $request,
        InjectSyntheticStatementAction $injectAction,
        DailyHeartbeatAggregatorService $aggregator,
        CreateLoanApplicationAction $createApplication,
    ): RedirectResponse {
        $validated = $request->validate([
            'full_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'business_name' => ['required', 'string', 'max:255'],
            'sector' => ['required', 'string'],
            'sub_city' => ['required', 'string'],
            'established_year' => ['required', 'integer', 'min:1990', 'max:'.date('Y')],
            'requested_amount' => ['required', 'numeric', 'min:10000', 'max:5000000'],
            'tenure_months' => ['required', 'integer', 'in:6,12,18,24'],
            'purpose' => ['required', 'string', 'max:500'],
            'transaction_file' => ['nullable', 'file', 'mimes:csv,xlsx,xls', 'max:10240'],
        ]);

        /** @var User $user */
        $user = auth()->user();

        $user->update(['name' => $validated['full_name']]);

        $existingBusiness = $user->businesses()->first();

        $business = Business::updateOrCreate(
            ['owner_id' => $user->id],
            [
                'uuid' => $existingBusiness?->uuid ?? (string) Str::uuid(),
                'business_name' => $validated['business_name'],
                'sector' => $validated['sector'],
                'sub_city' => $validated['sub_city'],
                'established_year' => $validated['established_year'],
            ]
        );

        if ($request->hasFile('transaction_file')) {
            $file = $request->file('transaction_file');
            $file->storeAs(
                'transactions',
                $business->uuid.'_transactions.'.$file->getClientOriginalExtension(),
                'local'
            );
        }

        $simulation = new SimulationRequestData(
            businessId: $business->id,
            days: 60,
            idempotencyKey: null,
        );
        $injectAction->execute($business, $simulation);
        $aggregator->aggregateWindow($business, 60);

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
                ->with('error', 'You already have an active loan application.');
        }

        $application = $createApplication->execute(new CreateLoanApplicationData(
            businessId: $business->id,
            requestedAmount: (float) $validated['requested_amount'],
            requestedTenureMonths: (int) $validated['tenure_months'],
            idempotencyKey: $request->header('Idempotency-Key'),
        ));

        $application->update(['status' => LoanApplication::STATUS_QUEUED_FOR_AI]);

        return redirect()
            ->route('loan-application')
            ->with('success', 'Application submitted successfully. Awaiting AI evaluation.');
    }
}
