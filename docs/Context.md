# EthioSME Valuation System — Master Build Document
# Cursor Agent Context & Task Breakdown

> **How to use this document:**
> Paste the "MASTER CONTEXT" section at the top of every Cursor session.
> Then paste only the specific TASK you are working on.
> Never give Cursor more than one task at a time.

---

# ═══════════════════════════════════════════════
# MASTER CONTEXT (paste this in EVERY session)
# ═══════════════════════════════════════════════

## What this project is

This is a university thesis Proof-of-Concept (PoC) called the **EthioSME Valuation System**.
It is a credit scoring platform for Ethiopian Small and Medium Enterprises (SMEs) that uses
AI — not physical collateral — to decide how much money a business can borrow.

Instead of asking "do you own property?", the system asks:
"How much money will this business earn in the next 30 days?"
An AI model forecasts future cash flows. Those forecasts feed into an NPV formula.
The NPV result becomes the credit limit.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend framework | Laravel 13 (PHP) |
| Frontend | React 18 + Inertia.js (pages rendered server-side via Inertia, not a separate SPA) |
| Styling | Tailwind CSS 3 |
| Database | PostgreSQL |
| Auth | JWT (API routes) + Laravel Session (web/Inertia routes) |
| Role system | Spatie Laravel Permission |
| AI service | External Python FastAPI service (separate repo, not in this codebase) |
| Charts | ECharts (to be installed: `npm install echarts echarts-for-react`) |

## Architecture: Two layers, one codebase

```
Browser
  └── Inertia.js (React pages in resources/js/Pages/)
        └── Laravel web routes (routes/web.php) — session auth
              └── Domain Actions (app/Domain/*/Actions/)
                    └── PostgreSQL DB

Browser / Postman
  └── API routes (routes/api.php, prefix: /api/v1) — JWT auth
        └── Same Domain Actions
```

**Important:** The frontend uses Inertia.js. This means React pages get their
data from Laravel controllers via `Inertia::render('PageName', ['data' => $data])`.
The React page does NOT call `/api/v1` endpoints directly.
Web controllers pass data as Inertia props. Forms submit via Inertia's `useForm` hook.

## The Three User Roles

| Role name (Spatie) | What they do | Where they land |
|-------------------|--------------|-----------------|
| `sme_owner` | Applies for a loan | `/dashboard` → SME flows |
| `loan_officer` | Reviews applications, triggers AI, approves/rejects | `/dashboard` → Lender flows |
| `super_admin` | Manages macro factors, sees fairness audits, triggers model training | `/dashboard` → Admin flows |

## Demo Users (from DevDemoSeeder)

| Email | Role | Password |
|-------|------|----------|
| `admin@ethiosme.test` | super_admin | `password` |
| `officer@ethiosme.test` | loan_officer | `password` |
| `ato-girma-merkato-retail@test.et` | sme_owner (creditworthy) | `password` |
| *(second sme)* | sme_owner (borderline) | `password` |
| *(third sme)* | sme_owner (high risk) | `password` |

## The AI Service Contract (READ THIS CAREFULLY)

The Python AI service is external. Laravel calls it via HTTP.
The AI service reads from the **same PostgreSQL database** as Laravel.
Laravel does NOT send transaction data in the request body — it sends selectors.

### AI Service Base URL
Configured in `.env` as `AI_SERVICE_URL=http://localhost:8000`
and `AI_SERVICE_TOKEN=your-shared-secret-here`

### Key AI Endpoint: POST /api/v1/inference

**Laravel sends this:**
```json
{
  "contract_version": "v2",
  "request_id": "uuid-here",
  "business_uuid": "b1f7f8a3-89e7-4b92-a0b0-1d2b9b5d9b9a",
  "as_of_date": "2026-05-23",
  "history_window": {
    "mode": "lookback_days",
    "lookback_days": 60
  },
  "horizon_days": 30,
  "seed": 42,
  "psychometric_ref": { "mode": "latest_for_business" },
  "macro_ref": { "mode": "as_of_date", "date": "2026-05-23" }
}
```

**AI service responds with:**
```json
{
  "contract_version": "v2",
  "request_id": "uuid-here",
  "forecast": {
    "horizon_days": 30,
    "p10_net_inflow_etb": ["1800.00", "1750.00", "...30 values"],
    "p50_net_inflow_etb": ["2500.00", "2480.00", "...30 values"],
    "p90_net_inflow_etb": ["3300.00", "3350.00", "...30 values"],
    "source": "deepar_p10_lstm_p50",
    "is_fallback": false
  },
  "risk": {
    "score": 0.63,
    "prob_default": 0.18,
    "risk_band": "medium"
  },
  "explainability": {
    "expected_value": 0.41,
    "shap_values": [
      { "feature": "failure_rate_14d", "value": 0.12 },
      { "feature": "net_inflow_trend_30d", "value": -0.05 }
    ],
    "reason_codes": [
      {
        "code": "HIGH_FAILURE_RATE_TRAILING_14D",
        "direction": "negative",
        "feature": "failure_rate_14d",
        "message": "Score lowered by elevated transaction failure rates in the last 14 days."
      }
    ]
  }
}
```

### NPV Formula (Laravel calculates this, NOT the AI service)

After getting the AI forecast, Laravel computes:

```
NPV = Σ (P10_cashflow[t] / (1 + r)^t)  for t = 1 to 30 days

Where:
  r = (NBE policy rate + risk adjustment) / 365  (daily discount rate)
  NBE policy rate = from exogenous_factors table
  risk adjustment = based on risk_band: low=0%, medium=2%, high=5%
  P10 cashflows = the pessimistic floor (we use P10 for safety)

Credit limit = NPV * loan_to_value_ratio (default 0.75)
APR = NBE rate + risk_premium (based on risk_band)
```

## Current Codebase Status

### Backend (~78% done)
These things ALREADY EXIST and work — do not rebuild them:
- JWT auth (register, login, refresh, logout, me)
- Business CRUD (`/api/v1/businesses`)
- Psychometric questions API (`GET /api/v1/psychometric/questions`, `POST .../psychometric-assessments`)
- Chapa webhook simulation (`POST /api/v1/payments/chapa/simulate`)
- Full valuation pipeline (`RunValuationAction` → AI → NPV → SHAP persist)
- Loan application create & decision (`/api/v1/applications`)
- Exogenous factors admin API
- Fairness audit API
- Model training proxy API

### Backend Bugs to Fix (already identified)
- Applications stay in `processing` status after AI runs — they should move to `evaluated`
- `RecordDriftMetricsAction` exists but nothing calls it
- `LogSecurityIncidentAction` exists but nothing calls it

### Frontend (~38% done)
These pages ALREADY EXIST and are mostly working:
- Login, Register, Profile (Breeze standard)
- `Landing` (marketing page at `/`)
- `Borrower/SmeValuation` (partial — has structure but no charts)
- `Lender/RiskAndForecast` (partial — table only, no charts)
- `Admin/ModelTraining` (partial — health + job queue works)
- `AuthenticatedLayout` (sidebar, role-based nav, dark mode — DO NOT touch this)

These pages are PLACEHOLDERS (just a div with text) — need to be built:
- `Dashboard` (wrong content — shows sales/inventory, must be replaced)
- `Placeholders/Psychometrics`
- `Placeholders/Integrations`
- `Placeholders/ApplicationsPipeline`
- `Placeholders/DecisioningAndXAI`
- `Placeholders/MacroeconomicFactors`
- `Placeholders/FairnessAudit`

## Key File Locations

```
app/
  Domain/
    Auth/Actions/           ← RegisterUserAction, LoginAction, etc.
    Business/Actions/       ← CreateBusinessAction, etc.
    Psychometric/           ← QuestionBank, PsychometricNormalizer
    Payments/               ← SyntheticStatementGeneratorService, Chapa
    Valuation/Actions/      ← RunValuationAction, CalculateNpvAction, PersistShapExplanationsAction
    Lending/Actions/        ← CreateLoanApplicationAction, SubmitLoanDecisionAction
    Macroeconomics/         ← UpsertExogenousFactorsAction
    Governance/             ← FairnessCalculator, TrainingJobActions
  Http/Controllers/
    Web/                    ← Inertia controllers (return Inertia::render)
    Api/                    ← API controllers (return JSON)
  Models/
    Business.php, LoanApplication.php, Valuation.php, etc.

resources/js/
  Pages/
    Auth/                   ← Login.tsx, Register.tsx
    Borrower/               ← SmeValuation.tsx
    Lender/                 ← RiskAndForecast.tsx
    Admin/                  ← ModelTraining.tsx
    Placeholders/           ← All the unbuilt pages
    Dashboard.tsx           ← Currently wrong content
  Components/
    features/valuation/     ← ValuationSummary, ForecastBands, ShapDrivers
  Layouts/
    AuthenticatedLayout.tsx ← DO NOT TOUCH

routes/
  web.php                   ← Inertia routes (session auth)
  api.php                   ← JSON API routes (JWT auth)
```

---

# ═══════════════════════════════════════════════
# MODULE 0 — ENVIRONMENT & FOUNDATION
# ═══════════════════════════════════════════════
# Run these tasks FIRST before any other module.
# ═══════════════════════════════════════════════

---

## TASK 0.1 — Verify and fix the development environment

**What this task does:**
Make sure the project runs locally end-to-end.
Seeds the database with demo data. Confirms AI service health.

**Steps for Cursor:**

1. Check `.env` has these keys set:
   ```
   DB_CONNECTION=pgsql
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_DATABASE=ethiosme
   DB_USERNAME=postgres
   DB_PASSWORD=password

   JWT_SECRET=   ← must not be empty, run: php artisan jwt:secret
   AI_SERVICE_URL=http://localhost:8000
   AI_SERVICE_TOKEN=your-shared-secret-here

   APP_URL=http://localhost:8000  ← Laravel's port, change if different
   ```

2. Run migrations fresh:
   ```bash
   php artisan migrate:fresh --seed
   ```

3. Verify seeder ran:
   ```bash
   php artisan tinker
   >>> App\Models\User::count()   # should be at least 5
   >>> App\Models\Business::count()  # should be at least 3
   ```

4. Start Laravel:
   ```bash
   php artisan serve --port=8080
   ```
   And in another terminal:
   ```bash
   npm run dev
   ```

5. Call AI health check — open browser or curl:
   ```
   GET http://localhost:8000/api/v1/health
   ```
   Expected: `{"status":"healthy",...}`

**Expected output:** Laravel runs at `http://localhost:8080`. Login page works. Seeders populated DB.

---

## TASK 0.2 — Fix application status transitions after AI valuation

**What this task does:**
Currently, after the AI service returns results and Laravel persists them,
the `loan_applications.status` stays as `processing` forever.
The loan officer pipeline will never show results.
This task fixes the status machine.

**The correct status flow:**
```
draft → submitted → queued_for_ai → processing → evaluated → approved | rejected
```

**What to fix:**

Find `RunValuationAction.php` in `app/Domain/Valuation/Actions/`.
After the AI response is persisted (after `PersistShapExplanationsAction` runs),
add this code to update the application status:

```php
// After persisting SHAP explanations:
$loanApplication->update([
    'status' => 'evaluated',
    'ai_risk_score' => $inferenceResponse['risk']['score'],
    'ai_risk_band' => $inferenceResponse['risk']['risk_band'],
    'prob_default' => $inferenceResponse['risk']['prob_default'],
]);
```

Also find `SubmitLoanDecisionAction.php` in `app/Domain/Lending/Actions/`.
Make sure when a loan officer approves, status becomes `approved`.
When they reject, status becomes `rejected`.

**Check `LoanApplication.php` model** — it should have these status constants:
```php
const STATUS_DRAFT = 'draft';
const STATUS_SUBMITTED = 'submitted';
const STATUS_QUEUED_FOR_AI = 'queued_for_ai';
const STATUS_PROCESSING = 'processing';
const STATUS_EVALUATED = 'evaluated';
const STATUS_APPROVED = 'approved';
const STATUS_REJECTED = 'rejected';
```
If any are missing, add them.

**Expected output:** After calling `POST /api/v1/businesses/{id}/valuate`,
query the application and confirm `status = 'evaluated'`.

---

## TASK 0.3 — Install ECharts and clean up dead pages

**What this task does:**
Installs the chart library needed for all visualizations.
Removes dead/duplicate placeholder files that confuse navigation.

**Step 1 — Install ECharts:**
```bash
npm install echarts echarts-for-react
```

Verify in `package.json` that `echarts` and `echarts-for-react` appear in dependencies.

**Step 2 — Delete dead files (they are superseded by real pages):**
- Delete `resources/js/Pages/Placeholders/SMEValuation.tsx`
- Delete `resources/js/Pages/Placeholders/RiskAndForecast.tsx`

Do NOT delete any other placeholder files — they will be built in later tasks.

**Step 3 — Verify ECharts import works:**
Create a quick test in the browser console or add a temporary import to any page:
```tsx
import ReactECharts from 'echarts-for-react';
```
If no import error, ECharts is installed correctly. Remove the test import.

**Expected output:** `npm run dev` compiles without errors. ECharts is in package.json.

---

# ═══════════════════════════════════════════════
# MODULE 1 — ROLE-AWARE DASHBOARD
# ═══════════════════════════════════════════════

---

## TASK 1.1 — Replace Dashboard with role-aware KPI cards

**What this task does:**
The current Dashboard shows sales/inventory content from a different project.
Replace it entirely with role-appropriate content.

**File to edit:** `resources/js/Pages/Dashboard.tsx`
**Laravel controller to edit:** Whatever controller renders the Dashboard route in `routes/web.php`

**For SME Owner dashboard, show:**
- Card: "My Business" — business name, sector, region
- Card: "Latest Application" — status badge (color-coded), credit limit if evaluated
- Card: "Psychometric Score" — completed / not completed yet
- Card: "Transaction Data" — number of days of heartbeat data available

**For Loan Officer dashboard, show:**
- Card: "Pending Review" — count of applications with status `evaluated`
- Card: "Queued for AI" — count of applications with status `queued_for_ai`
- Card: "Approved Today" — count of approved decisions today
- Card: "Rejected Today" — count of rejected decisions today
- Table: Last 5 applications (business name, risk band, status, action button)

**For Super Admin dashboard, show:**
- Card: "AI Service Status" — green/red based on health check
- Card: "Total Businesses" — count
- Card: "Total Applications" — count by status
- Card: "Last Model Training" — date and status of last training job

**Laravel controller logic (in the web route for `/dashboard`):**
```php
// Get the authenticated user's role
$user = auth()->user();
$role = $user->getRoleNames()->first();

// Pass role-specific data to Inertia
return Inertia::render('Dashboard', [
    'role' => $role,
    'stats' => DashboardStatsService::getForRole($role, $user),
]);
```

Create `app/Domain/Dashboard/Services/DashboardStatsService.php` with a static method
`getForRole(string $role, User $user): array` that queries the right data per role.

**Expected output:** When logged in as each role, the dashboard shows relevant KPI cards with real data from the DB.

---

# ═══════════════════════════════════════════════
# MODULE 2 — SME OWNER FLOW (4 tasks)
# ═══════════════════════════════════════════════
# Complete in order: 2.1 → 2.2 → 2.3 → 2.4
# ═══════════════════════════════════════════════

---

## TASK 2.1 — Psychometric Quiz Page

**What this task does:**
Builds the full psychometric assessment UI.
The SME owner answers 15 questions on a 1–5 scale.
The answers are submitted and normalized scores are stored.

**Backend already exists:**
- `GET /api/v1/psychometric/questions` → returns the 15 questions
- `POST /api/v1/businesses/{businessId}/psychometric-assessments` → stores answers

**The problem:** The frontend uses Inertia (not direct API calls).
We need a web controller that proxies this.

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/PsychometricWebController.php`:

```php
public function show(): Response
{
    $user = auth()->user();
    $business = $user->businesses()->first();
    $questions = app(QuestionBank::class)->all(); // already exists

    $existingAssessment = $business?->psychometricAssessments()->latest()->first();

    return Inertia::render('Borrower/Psychometrics', [
        'questions' => $questions,
        'business' => $business,
        'existingAssessment' => $existingAssessment ? [
            'integrity' => $existingAssessment->integrity,
            'conscientiousness' => $existingAssessment->conscientiousness,
            'risk_tolerance' => $existingAssessment->risk_tolerance,
            'completed_at' => $existingAssessment->created_at,
        ] : null,
    ]);
}

public function store(Request $request): RedirectResponse
{
    $user = auth()->user();
    $business = $user->businesses()->firstOrFail();

    // Call the existing action
    app(StorePsychometricAssessmentAction::class)->execute(
        $business,
        $request->validated()
    );

    return redirect()->route('psychometrics')->with('success', 'Assessment completed.');
}
```

**Step 2 — Add web routes** in `routes/web.php`:
```php
Route::middleware(['auth', 'role:sme-owner'])->group(function () {
    Route::get('/psychometrics', [PsychometricWebController::class, 'show'])->name('psychometrics');
    Route::post('/psychometrics', [PsychometricWebController::class, 'store']);
});
```

**Step 3 — Build `resources/js/Pages/Borrower/Psychometrics.tsx`:**

UI structure:
- If `existingAssessment` prop is not null: show a "Already Completed" card
  with the three scores (integrity, conscientiousness, risk tolerance) as percentage bars.
  Show a "Retake Assessment" button.
- If not completed: show the quiz form.
  - Display questions one section at a time (5 questions per page, 3 pages)
  - Each question: text + radio buttons labeled 1 (Strongly Disagree) to 5 (Strongly Agree)
  - Progress bar at top showing "Step 1 of 3"
  - "Next" and "Back" buttons
  - On final page: "Submit Assessment" button
  - Use Inertia `useForm` hook to submit

**Question format from backend:**
```json
{ "id": 1, "text": "I always pay my debts on time", "dimension": "integrity" }
```

Group questions by `dimension` for display purposes.

**Expected output:** SME owner visits `/psychometrics`, completes 15 questions in 3 steps,
submits, and sees their scores displayed as bars.

---

## TASK 2.2 — Transaction Data Integration Page (Integrations)

**What this task does:**
Builds the "Connect Your Transactions" page.
Since we use synthetic data (not live Chapa), this page triggers the
Chapa simulator to generate 60 days of synthetic transactions for this business,
then aggregates them into the daily heartbeat table that the AI reads.

**Backend already exists:**
- `POST /api/v1/payments/chapa/simulate` → generates synthetic transactions
- `RebuildDailyHeartbeatAction` → aggregates raw transactions into `sme_daily_heartbeat`
- `heartbeat:aggregate` artisan command → runs the above

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/IntegrationsWebController.php`:

```php
public function show(): Response
{
    $user = auth()->user();
    $business = $user->businesses()->first();
    $heartbeatCount = $business
        ? SmeDailyHeartbeat::where('business_id', $business->id)->count()
        : 0;

    return Inertia::render('Borrower/Integrations', [
        'business' => $business,
        'heartbeatDaysLoaded' => $heartbeatCount,
        'hasEnoughData' => $heartbeatCount >= 45,
    ]);
}

public function simulate(Request $request): RedirectResponse
{
    $user = auth()->user();
    $business = $user->businesses()->firstOrFail();

    // Call existing Chapa simulator
    app(SyntheticStatementGeneratorService::class)->generateForBusiness(
        $business,
        days: 60
    );

    // Aggregate into heartbeat table
    app(RebuildDailyHeartbeatAction::class)->execute($business);

    return redirect()->route('integrations')
        ->with('success', '60 days of transaction data loaded successfully.');
}
```

**Step 2 — Add web routes** in `routes/web.php`:
```php
Route::middleware(['auth', 'role:sme-owner'])->group(function () {
    Route::get('/integrations', [IntegrationsWebController::class, 'show'])->name('integrations');
    Route::post('/integrations/simulate', [IntegrationsWebController::class, 'simulate'])->name('integrations.simulate');
});
```

**Step 3 — Build `resources/js/Pages/Borrower/Integrations.tsx`:**

UI structure:
- Page title: "Connect Your Transaction Data"
- Explanation card: "We use your CBE transaction history to forecast your cash flow.
  Since this is a proof-of-concept, we simulate 60 days of realistic transaction data
  for your business."
- Status indicator:
  - If `heartbeatDaysLoaded === 0`: Red indicator "No data loaded yet"
  - If `heartbeatDaysLoaded > 0 && < 45`: Yellow "Data loading incomplete ({n} / 45 minimum days)"
  - If `heartbeatDaysLoaded >= 45`: Green "✓ {n} days of data ready"
- Big button: "Load 60 Days of Transaction Data" (POST to `/integrations/simulate`)
- Show a loading spinner while submitting (Inertia's `processing` state)
- After success: show green success banner from `$page.props.flash.success`

**Expected output:** SME owner clicks the button, sees spinner, then green confirmation.
Heartbeat count updates on reload.

---

## TASK 2.3 — Submit Loan Application Page

**What this task does:**
Builds the page where the SME owner fills in their loan request:
how much they want to borrow and for how long.
On submission, a `loan_application` record is created with status `queued_for_ai`.

**Backend already exists:**
- `POST /api/v1/applications` → creates loan application

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/LoanApplicationWebController.php`:

```php
public function create(): Response
{
    $user = auth()->user();
    $business = $user->businesses()->firstOrFail();
    $heartbeatCount = SmeDailyHeartbeat::where('business_id', $business->id)->count();
    $hasAssessment = $business->psychometricAssessments()->exists();

    // Check prerequisites
    $canApply = $heartbeatCount >= 45 && $hasAssessment;

    $existingApplication = LoanApplication::where('business_id', $business->id)
        ->latest()->first();

    return Inertia::render('Borrower/Apply', [
        'business' => $business,
        'canApply' => $canApply,
        'prerequisites' => [
            'heartbeatReady' => $heartbeatCount >= 45,
            'psychometricReady' => $hasAssessment,
        ],
        'existingApplication' => $existingApplication ? [
            'id' => $existingApplication->id,
            'status' => $existingApplication->status,
            'requested_amount' => $existingApplication->requested_amount,
            'tenure_months' => $existingApplication->tenure_months,
            'npv_credit_limit' => $existingApplication->npv_credit_limit,
            'apr' => $existingApplication->apr,
            'ai_risk_band' => $existingApplication->ai_risk_band,
            'created_at' => $existingApplication->created_at,
        ] : null,
    ]);
}

public function store(Request $request): RedirectResponse
{
    $request->validate([
        'requested_amount' => 'required|numeric|min:10000|max:5000000',
        'tenure_months' => 'required|integer|in:6,12,18,24',
        'purpose' => 'required|string|max:500',
    ]);

    $user = auth()->user();
    $business = $user->businesses()->firstOrFail();

    app(CreateLoanApplicationAction::class)->execute($business, $request->all());

    return redirect()->route('apply')->with('success', 'Application submitted. Awaiting AI evaluation.');
}
```

**Step 2 — Add routes** in `routes/web.php`:
```php
Route::middleware(['auth', 'role:sme-owner'])->group(function () {
    Route::get('/apply', [LoanApplicationWebController::class, 'create'])->name('apply');
    Route::post('/apply', [LoanApplicationWebController::class, 'store']);
});
```

**Step 3 — Build `resources/js/Pages/Borrower/Apply.tsx`:**

UI structure:
- **If `existingApplication` exists:** Show application status card instead of the form.
  - Status badge (color by status: queued_for_ai=blue, evaluated=yellow, approved=green, rejected=red)
  - Show requested amount and tenure
  - If status is `evaluated`, `approved`, or `rejected`: show NPV limit, APR, risk band
  - Button: "View Full Result" (links to `/sme-valuation`)

- **If no existing application:**
  - Prerequisites checklist at top:
    - ✓ or ✗ "Transaction data loaded (45+ days)"
    - ✓ or ✗ "Psychometric assessment completed"
    - If either is ✗: show links to those pages, disable submit button
  - Form fields:
    - "Requested Loan Amount (ETB)" — number input, min 10,000, max 5,000,000
    - "Loan Duration" — select: 6 months / 12 months / 18 months / 24 months
    - "Purpose of Loan" — textarea
  - Submit button: "Submit Application for AI Evaluation"

**Expected output:** SME owner can submit a loan application.
If they return to the page, they see their application status.

---

## TASK 2.4 — SME Valuation Result Page (with charts)

**What this task does:**
The SME owner's result page. After the loan officer triggers the AI evaluation,
the SME can see their credit limit, risk score, and the SHAP explanation
(which factors helped or hurt their score).

**File to EDIT (already exists, needs upgrading):** `resources/js/Pages/Borrower/SmeValuation.tsx`
**Laravel controller to EDIT:** `app/Http/Controllers/Web/SmeValuationController.php`

**Step 1 — Update SmeValuationController to pass all needed data:**

```php
public function show(): Response
{
    $user = auth()->user();
    $business = $user->businesses()->firstOrFail();

    $application = LoanApplication::where('business_id', $business->id)
        ->with(['valuations.shapExplanations'])
        ->latest()->firstOrFail();

    $valuation = $application->valuations()->latest()->first();

    $forecastData = null;
    $shapData = [];

    if ($valuation) {
        // P10/P50/P90 arrays from valuation
        $forecastData = [
            'p10' => $valuation->p10_net_inflow_etb ?? [],
            'p50' => $valuation->p50_net_inflow_etb ?? [],
            'p90' => $valuation->p90_net_inflow_etb ?? [],
            'horizon_days' => $valuation->horizon_days ?? 30,
        ];

        // SHAP values sorted by |value| descending
        $shapData = $valuation->shapExplanations()
            ->orderByDesc('sort_order')
            ->get()
            ->map(fn($s) => [
                'feature' => $s->feature_key,
                'value' => $s->shap_value,
                'direction' => $s->shap_value >= 0 ? 'positive' : 'negative',
            ])->toArray();
    }

    return Inertia::render('Borrower/SmeValuation', [
        'application' => [
            'status' => $application->status,
            'requested_amount' => $application->requested_amount,
            'npv_credit_limit' => $application->npv_credit_limit,
            'apr' => $application->apr,
            'ai_risk_band' => $application->ai_risk_band,
            'prob_default' => $application->prob_default,
        ],
        'forecast' => $forecastData,
        'shapDrivers' => $shapData,
        'reasonCodes' => $application->reason_codes ?? [],
    ]);
}
```

**Step 2 — Update `SmeValuation.tsx` to show charts:**

Replace the existing content with:

**A) Summary Cards (top row, already exists but improve):**
- NPV Credit Limit (in ETB, formatted: 1,234,567 ETB)
- Risk Band (low=green badge, medium=yellow, high=red)
- Probability of Default (as percentage)
- Application Status (badge)

**B) Forecast Chart (ECharts line chart with bands):**
```tsx
import ReactECharts from 'echarts-for-react';

// Build chart option:
const forecastOption = {
  title: { text: '30-Day Cash Flow Forecast' },
  xAxis: {
    type: 'category',
    data: Array.from({ length: 30 }, (_, i) => `Day ${i + 1}`),
  },
  yAxis: { type: 'value', name: 'ETB' },
  series: [
    {
      name: 'Pessimistic (P10)',
      type: 'line',
      data: forecast.p10,
      lineStyle: { color: '#ef4444' },
      areaStyle: { color: 'rgba(239, 68, 68, 0.1)' },
    },
    {
      name: 'Expected (P50)',
      type: 'line',
      data: forecast.p50,
      lineStyle: { color: '#3b82f6', width: 2 },
    },
    {
      name: 'Optimistic (P90)',
      type: 'line',
      data: forecast.p90,
      lineStyle: { color: '#22c55e' },
      areaStyle: { color: 'rgba(34, 197, 94, 0.1)' },
    },
  ],
  legend: { show: true },
  tooltip: { trigger: 'axis' },
};
```

**C) SHAP Waterfall Chart (horizontal bar chart):**
Show top 8 SHAP features. Positive values = green bars (right). Negative = red bars (left).
```tsx
const shapOption = {
  title: { text: 'What Influenced Your Score' },
  xAxis: { type: 'value', name: 'SHAP Impact' },
  yAxis: {
    type: 'category',
    data: shapDrivers.map(s => s.feature),
  },
  series: [{
    type: 'bar',
    data: shapDrivers.map(s => ({
      value: s.value,
      itemStyle: { color: s.value >= 0 ? '#22c55e' : '#ef4444' },
    })),
  }],
};
```

**D) Reason Codes (plain text cards below charts):**
For each reason code, show a card with:
- Direction icon (↑ green for positive, ↓ red for negative)
- The `message` field

**Expected output:** SME owner sees their credit limit, a 3-band forecast chart,
a SHAP bar chart explaining the score, and text reason codes.

---

# ═══════════════════════════════════════════════
# MODULE 3 — LOAN OFFICER FLOW (3 tasks)
# ═══════════════════════════════════════════════
# Complete in order: 3.1 → 3.2 → 3.3
# ═══════════════════════════════════════════════

---

## TASK 3.1 — Applications Pipeline Page

**What this task does:**
Builds the loan officer's main working view.
A sortable table of all loan applications.
Each row shows: business name, sector, application date, requested amount,
AI risk band, status, and an "Evaluate" or "Decide" action button.

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/ApplicationsPipelineController.php`:

```php
public function index(Request $request): Response
{
    $applications = LoanApplication::with(['business'])
        ->when($request->status, fn($q, $s) => $q->where('status', $s))
        ->orderByRaw("CASE status
            WHEN 'queued_for_ai' THEN 1
            WHEN 'evaluated' THEN 2
            WHEN 'processing' THEN 3
            WHEN 'approved' THEN 4
            WHEN 'rejected' THEN 5
            ELSE 6 END")
        ->orderByDesc('created_at')
        ->paginate(20);

    return Inertia::render('Lender/ApplicationsPipeline', [
        'applications' => $applications->through(fn($app) => [
            'id' => $app->id,
            'business_name' => $app->business->name,
            'sector' => $app->business->sector,
            'requested_amount' => $app->requested_amount,
            'tenure_months' => $app->tenure_months,
            'status' => $app->status,
            'ai_risk_band' => $app->ai_risk_band,
            'ai_risk_score' => $app->ai_risk_score,
            'npv_credit_limit' => $app->npv_credit_limit,
            'created_at' => $app->created_at->toDateTimeString(),
        ]),
        'filters' => $request->only('status'),
    ]);
}

public function triggerEvaluation(LoanApplication $application): RedirectResponse
{
    // Validate application is ready
    if (!in_array($application->status, ['queued_for_ai', 'pending_data_sync'])) {
        return back()->with('error', 'Application is not ready for evaluation.');
    }

    // Call the existing action
    app(RunValuationAction::class)->execute($application);

    return redirect()->route('applications-pipeline')
        ->with('success', 'AI evaluation triggered successfully.');
}
```

**Step 2 — Add routes** in `routes/web.php`:
```php
Route::middleware(['auth', 'role:loan-provider'])->group(function () {
    Route::get('/applications-pipeline', [ApplicationsPipelineController::class, 'index'])
        ->name('applications-pipeline');
    Route::post('/applications/{application}/evaluate',
        [ApplicationsPipelineController::class, 'triggerEvaluation'])
        ->name('applications.evaluate');
});
```

**Step 3 — Build `resources/js/Pages/Lender/ApplicationsPipeline.tsx`:**

UI structure:
- Page title: "Loan Applications Pipeline"
- Filter tabs: All | Queued for AI | Evaluated | Approved | Rejected
- Table columns:
  - Business Name
  - Sector
  - Requested Amount (formatted ETB)
  - Date Submitted
  - Status (badge, color-coded)
  - Risk Band (badge: low=green, medium=yellow, high=red, empty=gray)
  - Action button:
    - If status `queued_for_ai`: blue button "Run AI Evaluation"
      → POST to `/applications/{id}/evaluate` with Inertia
    - If status `evaluated`: green button "Review & Decide"
      → Link to `/decisioning/{id}`
    - If status `approved` or `rejected`: gray button "View Decision"
      → Link to `/decisioning/{id}`
    - If status `processing`: gray text "Evaluating..."

- Pagination at bottom

**Expected output:** Loan officer sees all applications in a table, can trigger AI evaluation with one click.

---

## TASK 3.2 — Decisioning & XAI Page

**What this task does:**
The loan officer's decision page for a single application.
Shows all AI results: forecast chart, SHAP waterfall, risk metrics.
Provides approve or reject controls.
Rejection requires selecting reason codes (NBE compliance requirement).

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/DecisioningController.php`:

```php
public function show(LoanApplication $application): Response
{
    $application->load(['business', 'valuations.shapExplanations', 'adverseActionNotices']);
    $valuation = $application->valuations()->latest()->first();

    return Inertia::render('Lender/DecisioningAndXAI', [
        'application' => [
            'id' => $application->id,
            'status' => $application->status,
            'business_name' => $application->business->name,
            'sector' => $application->business->sector,
            'requested_amount' => $application->requested_amount,
            'tenure_months' => $application->tenure_months,
            'npv_credit_limit' => $application->npv_credit_limit,
            'apr' => $application->apr,
            'ai_risk_band' => $application->ai_risk_band,
            'ai_risk_score' => $application->ai_risk_score,
            'prob_default' => $application->prob_default,
            'reason_codes' => $application->reason_codes ?? [],
        ],
        'forecast' => $valuation ? [
            'p10' => $valuation->p10_net_inflow_etb ?? [],
            'p50' => $valuation->p50_net_inflow_etb ?? [],
            'p90' => $valuation->p90_net_inflow_etb ?? [],
        ] : null,
        'shapDrivers' => $valuation ? $valuation->shapExplanations()
            ->orderByDesc('sort_order')->get()
            ->map(fn($s) => [
                'feature' => $s->feature_key,
                'value' => $s->shap_value,
            ])->toArray() : [],
        'alreadyDecided' => in_array($application->status, ['approved', 'rejected']),
        'decision' => $application->adverseActionNotices()->latest()->first()?->toArray(),
    ]);
}

public function decide(Request $request, LoanApplication $application): RedirectResponse
{
    $request->validate([
        'decision' => 'required|in:approved,rejected',
        'reason_codes' => 'required_if:decision,rejected|array',
        'narrative' => 'nullable|string|max:1000',
    ]);

    app(SubmitLoanDecisionAction::class)->execute(
        $application,
        auth()->user(),
        $request->decision,
        $request->reason_codes ?? [],
        $request->narrative
    );

    return redirect()->route('applications-pipeline')
        ->with('success', "Application {$request->decision} successfully.");
}
```

**Step 2 — Add routes** in `routes/web.php`:
```php
Route::middleware(['auth', 'role:loan-provider'])->group(function () {
    Route::get('/decisioning/{application}', [DecisioningController::class, 'show'])
        ->name('decisioning.show');
    Route::post('/decisioning/{application}/decide', [DecisioningController::class, 'decide'])
        ->name('decisioning.decide');
});
```

**Step 3 — Build `resources/js/Pages/Lender/DecisioningAndXAI.tsx`:**

UI structure (top to bottom):

**A) Application Header:**
- Business name, sector
- Requested: X ETB / Y months
- Status badge

**B) AI Recommendation Cards (row of 4):**
- NPV Credit Limit: X ETB (this is what AI recommends)
- Risk Band: low/medium/high (colored badge)
- Default Probability: X%
- Recommended APR: X%

**C) Forecast Chart** (same ECharts component as Task 2.4 section B)

**D) SHAP Waterfall** (same ECharts component as Task 2.4 section C)

**E) Decision Panel** (only if `alreadyDecided === false`):
- Two buttons: "✓ Approve" (green) | "✗ Reject" (red)
- Clicking "Reject" expands a panel:
  - Multi-select of reason codes from `application.reason_codes`
  - Each reason code shows as a checkbox with its `message`
  - At least one must be selected
  - Optional: "Additional narrative" textarea
- Clicking "Approve" shows a confirmation dialog, then submits
- Form submits via Inertia `useForm` to `POST /decisioning/{id}/decide`

**F) Already Decided Banner** (if `alreadyDecided === true`):
- Show the decision (approved/rejected), by whom, when
- If rejected: show the selected reason codes

**Expected output:** Loan officer can see full AI results and make a compliant approve/reject decision.

---

## TASK 3.3 — Risk & Forecast Detail Page (upgrade existing)

**What this task does:**
The existing `Lender/RiskAndForecast.tsx` shows only a table.
Upgrade it to show a proper historical + forecast chart.

**File to EDIT:** `resources/js/Pages/Lender/RiskAndForecast.tsx`
**Laravel controller to EDIT:** `app/Http/Controllers/Web/RiskAndForecastController.php`

**Step 1 — Update controller to pass heartbeat history:**

```php
public function show(Request $request, LoanApplication $application): Response
{
    $business = $application->business;

    // Last 60 days of actual heartbeat data
    $history = SmeDailyHeartbeat::where('business_id', $business->id)
        ->orderBy('heartbeat_date')
        ->take(60)
        ->get(['heartbeat_date', 'inflow', 'outflow'])
        ->map(fn($h) => [
            'date' => $h->heartbeat_date->format('M d'),
            'net_inflow' => $h->inflow - $h->outflow,
        ]);

    $valuation = $application->valuations()->latest()->first();

    return Inertia::render('Lender/RiskAndForecast', [
        'application' => [...],
        'history' => $history,
        'forecast' => $valuation ? [
            'p10' => $valuation->p10_net_inflow_etb,
            'p50' => $valuation->p50_net_inflow_etb,
            'p90' => $valuation->p90_net_inflow_etb,
        ] : null,
    ]);
}
```

**Step 2 — Build combined history + forecast chart in `RiskAndForecast.tsx`:**

The chart shows:
- Left side (60 bars): actual historical daily net inflow (bar chart, blue)
- Right side (30 lines): P10/P50/P90 forecast (3 lines: red/blue/green)
- A vertical dashed line separating "History" from "Forecast"
- X-axis: dates for history + "Day 1"..."Day 30" for forecast

This combined chart is the most visually impressive element of the thesis demo.
Use ECharts with mixed series types (bar + line).

**Expected output:** Loan officer sees 60 days of actual data smoothly transitioning
into the 30-day AI forecast with confidence bands.

---

# ═══════════════════════════════════════════════
# MODULE 4 — SUPER ADMIN FLOW (2 tasks)
# ═══════════════════════════════════════════════

---

## TASK 4.1 — Macroeconomic Factors Admin Page

**What this task does:**
Builds the admin page to view and update macro factors
(NBE policy rate, inflation rate, USD-ETB exchange rate).
These feed into the NPV discount rate calculation.

**Backend already exists:**
- `GET /api/v1/admin/exogenous-factors` → list
- `POST /api/v1/admin/exogenous-factors` → upsert

**Step 1 — Create web controller:**
Create `app/Http/Controllers/Web/Admin/MacroeconomicFactorsController.php`:

```php
public function index(): Response
{
    $factors = ExogenousFactor::orderByDesc('effective_date')->take(12)->get();

    return Inertia::render('Admin/MacroeconomicFactors', [
        'factors' => $factors->map(fn($f) => [
            'id' => $f->id,
            'nbe_policy_rate' => $f->nbe_policy_rate,
            'inflation_rate' => $f->inflation_rate,
            'usd_etb_rate' => $f->usd_etb_rate,
            'effective_date' => $f->effective_date->format('Y-m-d'),
        ]),
    ]);
}

public function store(Request $request): RedirectResponse
{
    $request->validate([
        'nbe_policy_rate' => 'required|numeric|min:0|max:100',
        'inflation_rate' => 'required|numeric|min:0|max:100',
        'usd_etb_rate' => 'required|numeric|min:1',
        'effective_date' => 'required|date',
    ]);

    app(UpsertExogenousFactorsAction::class)->execute($request->validated());

    return back()->with('success', 'Macro factors updated.');
}
```

**Step 2 — Build `resources/js/Pages/Admin/MacroeconomicFactors.tsx`:**

UI structure:
- "Current Macro Factors" card (latest values, large display)
- "Update Factors" form: 4 fields + submit
- "History" table: last 12 entries

**Expected output:** Super admin can see and update macro factors.

---

## TASK 4.2 — Fairness Audit Admin Page

**What this task does:**
Builds the admin page to run and view fairness audits.
Shows SPD (Statistical Parity Difference) and EOD (Equal Opportunity Difference)
metrics — these prove the AI is not biased by sector or region.

**Backend already exists:**
- `GET /api/v1/admin/fairness-audits` → list audits
- `POST /api/v1/admin/fairness-audits` → run new audit

**Step 1 — Create web controller** (similar pattern to 4.1).

**Step 2 — Build `resources/js/Pages/Admin/FairnessAudit.tsx`:**

UI structure:
- "Run New Fairness Audit" button (POST → triggers calculation)
- Results table for latest audit:
  - Cohort (e.g. "sector=pharmacy vs all")
  - SPD value (green if |SPD| < 0.1, yellow if < 0.2, red if >= 0.2)
  - EOD value (same color logic)
  - Interpretation text

- History: previous audits with dates

**Why this matters for the defense:** The committee will ask "is your AI fair?".
This page is your answer.

**Expected output:** Admin can run fairness audit and see bias metrics per cohort.

---

# ═══════════════════════════════════════════════
# MODULE 5 — BACKEND WIRING & RELIABILITY
# ═══════════════════════════════════════════════

---

## TASK 5.1 — AI Service Fallback (Demo Safety Net)

**What this task does:**
The AI service is a single point of failure.
If the Python service is down during the defense, the whole demo fails.
This task adds a graceful fallback that returns synthetic but realistic
fake AI results so the demo always works.

**File to edit:** `app/Domain/Valuation/Services/AiEngineClient.php`

Add a fallback method:

```php
private function syntheticFallback(string $businessUuid): array
{
    // Generate realistic-looking fake inference response
    $riskScore = round(mt_rand(30, 75) / 100, 2);
    $riskBand = match(true) {
        $riskScore < 0.40 => 'low',
        $riskScore < 0.65 => 'medium',
        default => 'high',
    };

    // Generate 30 days of forecast values
    $base = mt_rand(2000, 8000);
    $p10 = array_map(fn($i) => (string)round($base * 0.70 + mt_rand(-200, 200), 2), range(1, 30));
    $p50 = array_map(fn($i) => (string)round($base + mt_rand(-300, 300), 2), range(1, 30));
    $p90 = array_map(fn($i) => (string)round($base * 1.35 + mt_rand(-200, 200), 2), range(1, 30));

    return [
        'contract_version' => 'v2',
        'request_id' => (string) Str::uuid(),
        'forecast' => [
            'horizon_days' => 30,
            'p10_net_inflow_etb' => $p10,
            'p50_net_inflow_etb' => $p50,
            'p90_net_inflow_etb' => $p90,
            'source' => 'synthetic_fallback',
            'is_fallback' => true,
        ],
        'risk' => [
            'score' => $riskScore,
            'prob_default' => round($riskScore * 0.30, 2),
            'risk_band' => $riskBand,
        ],
        'explainability' => [
            'expected_value' => 0.41,
            'shap_values' => [
                ['feature' => 'net_inflow_trend_30d', 'value' => round(mt_rand(-15, 15) / 100, 2)],
                ['feature' => 'failure_rate_14d', 'value' => round(mt_rand(-12, 8) / 100, 2)],
                ['feature' => 'unique_cust_count_avg', 'value' => round(mt_rand(0, 10) / 100, 2)],
                ['feature' => 'psychometric_integrity', 'value' => round(mt_rand(0, 8) / 100, 2)],
            ],
            'reason_codes' => [],
        ],
    ];
}
```

Wrap the actual HTTP call in try-catch:
```php
try {
    $response = Http::withToken($this->token)->post(...);
    // existing code
} catch (\Exception $e) {
    Log::warning('AI service unavailable, using fallback', ['error' => $e->getMessage()]);
    return $this->syntheticFallback($businessUuid);
}
```

Also add an `.env` flag: `AI_SERVICE_FALLBACK_ENABLED=true`
Only use fallback if this flag is true.

**Expected output:** If AI service is down and fallback is enabled,
the demo still runs with synthetic but realistic numbers.

---

## TASK 5.2 — Seed CSV transaction data into the database

**What this task does:**
The synthetic CSV data we generated (`sme_daily_transactions.csv`)
needs to be seeded into the `sme_daily_heartbeat` table in PostgreSQL
so the AI service can read it.

**Create a new seeder:** `database/seeders/HeartbeatFromCsvSeeder.php`

```php
class HeartbeatFromCsvSeeder extends Seeder
{
    public function run(): void
    {
        $csvPath = database_path('data/sme_daily_transactions.csv');

        if (!file_exists($csvPath)) {
            $this->command->warn('CSV not found at ' . $csvPath);
            return;
        }

        $file = fopen($csvPath, 'r');
        $headers = fgetcsv($file);

        $chunk = [];
        while (($row = fgetcsv($file)) !== false) {
            $data = array_combine($headers, $row);

            // Find or create business by UUID
            $business = Business::where('uuid', $data['Business_UUID'])->first();
            if (!$business) continue;

            $chunk[] = [
                'business_id' => $business->id,
                'heartbeat_date' => $data['Transaction_Date'],
                'inflow' => (float) $data['Daily_Total_Inflow'],
                'outflow' => (float) $data['Daily_Total_Outflow'],
                'end_of_day_balance' => (float) $data['End_of_Day_Balance'],
                'transaction_count' => (int) $data['Txn_Count'],
                'unique_customer_count' => (int) $data['Unique_Cust_Count'],
                'channel' => $data['Channel'],
                'is_holiday' => false,
                'is_payday' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            if (count($chunk) >= 500) {
                SmeDailyHeartbeat::insertOrIgnore($chunk);
                $chunk = [];
            }
        }

        if (!empty($chunk)) {
            SmeDailyHeartbeat::insertOrIgnore($chunk);
        }

        fclose($file);
        $this->command->info('Heartbeat data seeded from CSV.');
    }
}
```

Also copy `sme_daily_transactions.csv` into `database/data/sme_daily_transactions.csv`.

Register the seeder in `DatabaseSeeder.php`:
```php
$this->call(HeartbeatFromCsvSeeder::class);
```

**Expected output:**
```bash
php artisan db:seed --class=HeartbeatFromCsvSeeder
```
Populates `sme_daily_heartbeat` table. AI service can now find data.

---

# ═══════════════════════════════════════════════
# MODULE 6 — DEFENSE DEMO PREPARATION
# ═══════════════════════════════════════════════

---

## TASK 6.1 — Prepare three demo scenarios

**What this task does:**
The defense needs three distinct scenarios to show the AI behaving differently:
1. Creditworthy business → approved with high limit
2. Borderline business → evaluated, loan officer decides carefully
3. High-risk business → rejected with SHAP reason codes

**Update `DevDemoSeeder.php`** to ensure exactly three SME businesses exist
with pre-loaded heartbeat data representing these three profiles.

The three businesses should already exist (from initial seeder).
Verify they have:
- 60+ days of heartbeat data each
- Completed psychometric assessments
- A loan application with status `queued_for_ai` (so loan officer can trigger AI)

Add comments in the seeder explaining which business is which scenario:
```php
// Scenario 1: Creditworthy — Ato Girma's Merkato Retail
// High inflow, low failure rate, high psychometric scores
// Expected outcome: NPV ~200,000 ETB credit limit, low risk band

// Scenario 2: Borderline — Woizero Sara's Cafe
// Moderate inflow, some volatility, medium psychometric
// Expected outcome: NPV ~80,000 ETB, medium risk band

// Scenario 3: High Risk — Dawit's Electronics
// Declining inflow trend, high failure rate, low conscientiousness
// Expected outcome: NPV ~20,000 ETB or rejection, high risk band
```

**Expected output:** Running `php artisan migrate:fresh --seed` produces three
ready-to-evaluate businesses that will tell three different stories during the defense.

---

## TASK 6.2 — Final smoke test checklist

**What this task does:**
A verification script to confirm every part of the demo works
before the defense.

**Create `tests/Feature/DefenseDemoTest.php`:**

```php
it('completes the full borrower to officer flow', function () {
    // 1. Login as SME owner
    // 2. Verify heartbeat data exists (>= 45 days)
    // 3. Verify psychometric assessment exists
    // 4. Create a loan application
    // 5. Login as loan officer
    // 6. See application in pipeline
    // 7. Trigger AI evaluation
    // 8. See application status changes to 'evaluated'
    // 9. Approve the application
    // 10. Login back as SME owner
    // 11. See approved status with credit limit
});
```

Write this as a Pest test. Use the demo seeder users.
Make sure the test passes before defense day.

**Run command:**
```bash
php artisan test --filter=DefenseDemoTest
```

---

## TASK 6.3 — Loading states and error handling

**What this task does:**
Ensures that every button that triggers a slow operation
(AI evaluation, data simulation) shows a loading spinner
and every error shows a clear message.

**For each Inertia form `useForm` hook in the pages built in Modules 2 and 3:**

1. Buttons that submit should disable and show a spinner when `processing === true`:
   ```tsx
   <button disabled={form.processing}>
     {form.processing ? <Spinner /> : 'Submit'}
   </button>
   ```

2. Flash messages: Read `usePage().props.flash` for `success` and `error`:
   ```tsx
   const { flash } = usePage().props as any;
   // Show green banner if flash.success, red if flash.error
   ```

3. If an application is in `processing` status (AI running):
   - Show a pulsing animation / skeleton loader
   - Add "Refresh" button that does `Inertia.reload()`

4. If `is_fallback: true` is in the valuation data:
   - Show a subtle yellow notice: "Note: AI service unavailable. Showing estimated results."

**Expected output:** No blank screens, no silent failures during the demo.

---

# ═══════════════════════════════════════════════
# APPENDIX A — Full Task Execution Order
# ═══════════════════════════════════════════════

Run tasks in this exact order:

```
DAY 1 (Backend + Foundation):
  Task 0.1 — Verify environment
  Task 0.2 — Fix application status transitions      ← CRITICAL
  Task 0.3 — Install ECharts, clean dead pages
  Task 5.1 — AI Service fallback                     ← CRITICAL for demo safety
  Task 5.2 — Seed CSV transaction data

DAY 2 (SME Owner + Loan Officer UI):
  Task 1.1 — Role-aware Dashboard
  Task 2.1 — Psychometric Quiz Page
  Task 2.2 — Transaction Data Integration Page
  Task 2.3 — Submit Loan Application Page
  Task 3.1 — Applications Pipeline Page
  Task 3.2 — Decisioning & XAI Page

DAY 3 (Charts + Admin + Polish):
  Task 2.4 — SME Valuation Result Page (with charts)
  Task 3.3 — Risk & Forecast Detail Page (with charts)
  Task 4.1 — Macroeconomic Factors Admin Page
  Task 4.2 — Fairness Audit Admin Page
  Task 6.1 — Prepare three demo scenarios
  Task 6.2 — Final smoke test
  Task 6.3 — Loading states and error handling
```

---

# ═══════════════════════════════════════════════
# APPENDIX B — Database Tables Quick Reference
# ═══════════════════════════════════════════════

| Table | Key columns for frontend |
|-------|--------------------------|
| `users` | id, name, email, role (via Spatie) |
| `businesses` | id, uuid, owner_id, name, sector, sub_city, established_year |
| `psychometric_assessments` | id, business_id, integrity, conscientiousness, risk_tolerance, raw_answers |
| `sme_daily_heartbeat` | id, business_id, heartbeat_date, inflow, outflow, transaction_count |
| `loan_applications` | id, business_id, status, requested_amount, tenure_months, npv_credit_limit, apr, ai_risk_band, ai_risk_score, prob_default, reason_codes |
| `valuations` | id, loan_application_id, p10/p50/p90 arrays, xgboost_score, status |
| `shap_explanations` | id, valuation_id, feature_key, shap_value, sort_order |
| `adverse_action_notices` | id, loan_application_id, officer_id, reason_codes, narrative |
| `exogenous_factors` | id, nbe_policy_rate, inflation_rate, usd_etb_rate, effective_date |
| `fairness_audits` | id, cohort_definition, spd, eod, created_at |

---

# ═══════════════════════════════════════════════
# APPENDIX C — How to use with Cursor
# ═══════════════════════════════════════════════

## Template for each Cursor session:

```
[Paste the full MASTER CONTEXT section above]

---

I am now working on:
[Paste the specific TASK section you want to build]

Current working directory: /path/to/ethiosme-project
PHP version: 8.2
Node version: 20
Database: PostgreSQL, already running

Please implement this task exactly as described.
Do not modify any files not mentioned in the task.
Do not rebuild things that already exist.
After each file you create or edit, tell me what to run to test it.
```

## Rules when working with Cursor:

1. **One task per session.** Never paste two tasks at once.
2. **Always paste the Master Context.** Cursor forgets between sessions.
3. **Tell Cursor what already works.** This prevents it from rebuilding existing things.
4. **After each task, test before moving on.** A broken task 2.1 will break 2.2.
5. **If Cursor gets confused,** restart the session with the master context + just the task.
```