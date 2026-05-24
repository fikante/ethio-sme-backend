<?php

namespace App\Http\Controllers\Web;

use App\Domain\Lending\Actions\CreateLoanApplicationAction;
use App\Domain\Lending\Data\CreateLoanApplicationData;
use App\Http\Controllers\Controller;
use App\Models\Business;
use App\Models\LoanApplication;
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

        $transactions = $business
            ? SmeDailyHeartbeat::query()
                ->forBusiness($business)
                ->orderByDesc('transaction_date')
                ->take(30)
                ->get([
                    'transaction_date',
                    'daily_total_inflow',
                    'daily_total_outflow',
                    'txn_count',
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
                ? SmeDailyHeartbeat::query()->forBusiness($business)->count()
                : 0,
            'businessUuid' => $business?->uuid,
        ]);
    }

    public function store(
        Request $request,
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
            ]
        );

        $heartbeatDays = SmeDailyHeartbeat::query()->forBusiness($business)->count();
        if ($heartbeatDays < 1) {
            return redirect()
                ->route('loan-application')
                ->with('error', 'No transaction history found for this business. Use a business UUID that exists in the AI dataset, or contact support.');
        }

        if ($request->hasFile('transaction_file')) {
            $file = $request->file('transaction_file');
            $file->storeAs(
                'transactions',
                $business->uuid.'_transactions.'.$file->getClientOriginalExtension(),
                'local'
            );
        }

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

        return response()->json(['businessUuid' => $business->uuid]);
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
