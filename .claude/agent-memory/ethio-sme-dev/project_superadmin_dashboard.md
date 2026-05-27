---
name: project-superadmin-dashboard
description: Super Admin Dashboard rebuild — 7-section layout, new backend stats, missing pages added
metadata:
  type: project
---

## Super Admin Dashboard (completely rebuilt, May 2026)

The `SuperAdminDashboard` component in `resources/js/Pages/Dashboard.tsx` was fully rebuilt with 7 sections:

1. **PlatformHealthBar** — sticky bar showing AI service, DB, and last training status
2. **KPI Row** — 8 cards in 4-col × 2-row grid: Businesses, Applications, Evaluations, Approval Rate, Avg Risk Score, SHAP Pass Rate, Avg NPV Limit, Last Fairness Audit Days
3. **System Health Panel** — Active Providers, Officer Count, PDPP badge, Drift Alert (MAPE >30% triggers)
4. **Pipeline Analytics** — Applications Over Time (Line, 60d, 3 series), Status Distribution Donut, Risk Band by Provider (grouped Bar), Avg NPV by Sector (horizontal Bar)
5. **AI Model Performance** — Validated thesis metrics card, Psychometric vs Risk summary, DeepAR card; Risk Score Distribution histogram (bins with green/amber/red coloring), NPV histogram with median line
6. **Compliance** — DataCoverageHealth segmented bar (4 tiers), PDPP Checklist, Recent Audit Log timeline (8 entries)
7. **Provider Overview Table** — read-only table with avg risk score color-coded by band

### Backend changes

`DashboardStatsService::superAdmin()` now returns the full payload. New private helper methods added:
- `fetchDriftData()` — wraps AI `/drift` endpoint with mock fallback (validated thesis numbers)
- `applicationsOverTime(int $days)` — 3-series (submitted/evaluated/decided) for line chart
- `riskBandByProvider()` — grouped bar data
- `avgNpvBySector()` — top 8 sectors horizontal bar
- `riskScoreDistribution()` — 10 bins of 0.1 width for histogram
- `npvCreditLimitDistribution()` — 8 buckets + median for histogram
- `psychometricVsRisk()` — up to 200 scatter points
- `dataCoverageHealth()` — 4 tier counts (≥365, 180-364, 45-179, <45)
- `loanProviderOverview()` — rows for admin table

### New pages added

- `resources/js/Pages/Admin/LoanProviders.tsx` — Full CRUD with card grid, useForm with transform() for % → decimal rate conversion
- `resources/js/Pages/Admin/AuditLogs.tsx` — Paginated table, filter panel, CSV export, detail slide-over drawer

### New routes (routes/web.php, super-admin middleware group)
- `admin.loan-providers` (GET, POST, PATCH, POST toggle-active)
- `admin.audit-logs` (GET, GET export)

### New backend files
- `app/Http/Controllers/Web/Admin/LoanProviderController.php`
- `app/Http/Controllers/Web/Admin/AuditLogController.php`
- `app/Domain/Lending/Actions/CreateLoanProviderAction.php`
- `app/Domain/Lending/Actions/UpdateLoanProviderAction.php`
- `app/Domain/Lending/Data/LoanProviderData.php`
- `app/Http/Requests/Web/Admin/StoreLoanProviderRequest.php`
- `app/Http/Requests/Web/Admin/UpdateLoanProviderRequest.php`

### AuthenticatedLayout sidebar
Two new items added to `adminSection` between Users and Macroeconomic Factors:
- "Loan Providers" → `admin.loan-providers`
- "Audit Logs" → `admin.audit-logs` (appended after Fairness Audit)

### SuperAdminStats type
Fully expanded in `resources/js/types/dashboard.ts`. Added `DriftData` and `ProviderOverviewRow` types.

**Why:** The previous dashboard had only 4 KPI cards and a basic status panel — insufficient for thesis defense demonstration of the platform's governance and analytics capabilities.

**How to apply:** When making further super admin changes, read `DashboardStatsService::superAdmin()` and `SuperAdminStats` type together — they must stay in sync.
