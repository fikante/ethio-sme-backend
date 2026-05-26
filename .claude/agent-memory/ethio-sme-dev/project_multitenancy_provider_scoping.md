---
name: project-multitenancy-provider-scoping
description: Multi-tenancy implementation — loan provider scoping pattern for lender portal controllers and DashboardStatsService
type: project
---

Loan provider scoping was implemented 2026-05-26 as Task 1 of multi-tenancy.

**Key decisions:**

1. `loan_applications.loan_provider_id` made NOT NULL via migration `2026_05_26_000001`. Any existing NULL rows backfilled to the first provider before ALTER.

2. `LoanApplication` model gains `scopeForProvider(Builder $query, int $providerId)` local scope. All lender-facing queries must call `->forProvider($loanProviderId)`.

3. Lender controllers (`ApplicationsPipelineController`, `RiskAndForecastController`, `DecisioningController`) all:
   - Read `$user->loan_provider_id`
   - `abort(403)` if null (account not associated with a provider)
   - Filter queries via `->forProvider($loanProviderId)`
   - In `show` methods: cross-check `$application->loan_provider_id !== $user->loan_provider_id` and abort 403 if mismatch

4. `DecisioningController::decide` enforces `evaluated` status before processing: returns `back()->withErrors([...], 422)` if status is not `evaluated`.

5. `DashboardStatsService::loanProvider()` now takes `User $user` and uses a `$baseQuery` closure that applies `->forProvider($providerId)` when `$providerId !== null`. Super admin (null loan_provider_id) sees all applications.

6. Three canonical test providers seeded: CBE (cbe.officer@test.com), AWASH (awash.officer@test.com), BOA (boa.officer@test.com). All password: `password`. BOA replaces AMHARA from original seeder.

7. `CreateLoanApplicationData` gains optional `loanProviderId: ?int = null`. `StoreLoanApplicationRequest` and `LoanApplicationWebController::store` validate `loan_provider_id` as `required|integer|exists:loan_providers,id`.

8. Public unauthenticated API: `GET /api/v1/public/loan-providers` via `LoanProviderController::publicIndex()` — returns active providers with display fields only (id, name, short_code, logo_url, status, min/max amounts, base_interest_rate).

9. `LoanApplicationWebController::show` fetches active providers via Eloquent and passes them as `loanProviders` Inertia prop.

**Why:** Thesis demo must show that each bank's loan officer only sees their own institution's applications, not the whole pool.

**How to apply:** Any new lender-portal endpoint must call `->forProvider($request->user()->loan_provider_id)` and guard against null loan_provider_id.
