<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LoanProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class LoanProviderController extends Controller
{
    public function index(): JsonResponse
    {
        $providers = QueryBuilder::for(LoanProvider::class)
            ->allowedFilters([
                AllowedFilter::exact('status'),
                AllowedFilter::exact('type'),
            ])
            ->allowedSorts(['name', 'base_interest_rate', 'created_at'])
            ->withCount(['loanApplications', 'users'])
            ->active()
            ->paginate(20);

        return response()->json($providers);
    }

    public function show(LoanProvider $loanProvider): JsonResponse
    {
        return response()->json(
            $loanProvider->load(['users:id,name,email,loan_provider_id'])
                ->loadCount(['loanApplications', 'loanHistory', 'users'])
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'short_code' => 'required|string|max:20|unique:loan_providers',
            'type' => 'required|in:commercial_bank,development_bank,microfinance,cooperative',
            'nbe_license_no' => 'nullable|string|max:64',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string|max:30',
            'website' => 'nullable|url',
            'address' => 'nullable|string',
            'accepted_risk_bands' => 'required|array|min:1',
            'accepted_risk_bands.*' => 'in:low,medium,high',
            'min_loan_amount_etb' => 'required|numeric|min:0',
            'max_loan_amount_etb' => 'required|numeric|gt:min_loan_amount_etb',
            'base_interest_rate' => 'required|numeric|between:0,1',
        ]);

        $provider = LoanProvider::create($data);

        return response()->json($provider, 201);
    }

    public function update(Request $request, LoanProvider $loanProvider): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'accepted_risk_bands' => 'sometimes|array|min:1',
            'accepted_risk_bands.*' => 'in:low,medium,high',
            'min_loan_amount_etb' => 'sometimes|numeric|min:0',
            'max_loan_amount_etb' => 'sometimes|numeric',
            'base_interest_rate' => 'sometimes|numeric|between:0,1',
            'status' => 'sometimes|in:active,inactive,suspended',
            'contact_email' => 'sometimes|nullable|email',
            'contact_phone' => 'sometimes|nullable|string',
            'website' => 'sometimes|nullable|url',
        ]);

        $loanProvider->update($data);

        return response()->json($loanProvider->fresh());
    }
}
