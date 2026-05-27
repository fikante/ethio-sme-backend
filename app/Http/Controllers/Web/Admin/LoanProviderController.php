<?php

namespace App\Http\Controllers\Web\Admin;

use App\Domain\Lending\Actions\CreateLoanProviderAction;
use App\Domain\Lending\Actions\UpdateLoanProviderAction;
use App\Domain\Lending\Data\LoanProviderData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Web\Admin\StoreLoanProviderRequest;
use App\Http\Requests\Web\Admin\UpdateLoanProviderRequest;
use App\Models\LoanProvider;
use Inertia\Inertia;
use Inertia\Response;

class LoanProviderController extends Controller
{
    public function __construct(
        private readonly CreateLoanProviderAction $createAction,
        private readonly UpdateLoanProviderAction $updateAction,
    ) {}

    public function index(): Response
    {
        $providers = LoanProvider::query()
            ->withCount(['loanApplications', 'users'])
            ->orderBy('name')
            ->get()
            ->map(fn (LoanProvider $p) => [
                'id'                => $p->id,
                'uuid'              => $p->uuid,
                'name'              => $p->name,
                'short_code'        => $p->short_code,
                'type'              => $p->type,
                'nbe_license_no'    => $p->nbe_license_no,
                'contact_email'     => $p->contact_email,
                'contact_phone'     => $p->contact_phone,
                'website'           => $p->website,
                'address'           => $p->address,
                'accepted_risk_bands' => $p->accepted_risk_bands,
                'min_loan_amount_etb' => (float) $p->min_loan_amount_etb,
                'max_loan_amount_etb' => (float) $p->max_loan_amount_etb,
                'base_interest_rate'  => (float) $p->base_interest_rate,
                'logo_url'          => $p->logo_url,
                'status'            => $p->status,
                'application_count' => $p->loan_applications_count ?? 0,
                'officer_count'     => $p->users_count ?? 0,
                'created_at'        => $p->created_at?->toDateString(),
            ]);

        return Inertia::render('Admin/LoanProviders', [
            'providers' => $providers,
        ]);
    }

    public function store(StoreLoanProviderRequest $request): \Illuminate\Http\RedirectResponse
    {
        $this->createAction->execute(LoanProviderData::from($request->validated()));

        return redirect()->route('admin.loan-providers')
            ->with('flash', ['type' => 'success', 'message' => 'Loan provider created successfully.']);
    }

    public function update(UpdateLoanProviderRequest $request, LoanProvider $loanProvider): \Illuminate\Http\RedirectResponse
    {
        $this->updateAction->execute($loanProvider, $request->validated());

        return redirect()->route('admin.loan-providers')
            ->with('flash', ['type' => 'success', 'message' => 'Loan provider updated successfully.']);
    }

    public function toggleActive(LoanProvider $loanProvider): \Illuminate\Http\RedirectResponse
    {
        $loanProvider->update([
            'status' => $loanProvider->status === 'active' ? 'inactive' : 'active',
        ]);

        return redirect()->route('admin.loan-providers')
            ->with('flash', ['type' => 'success', 'message' => 'Provider status updated.']);
    }
}
