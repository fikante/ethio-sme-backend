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

Here is the redesigned module structure and the full Cursor prompt for it.

---

## What changes from the original plan

The original plan had 4 separate pages (`/psychometrics`, `/integrations`, `/apply`, `/sme-valuation`). **Throw that away for the input flow.** Replace it with one beautiful multi-step wizard modal that lives on top of the dashboard. The result page (`/sme-valuation`) stays as its own page — that's fine because it's a read-only view after the decision.

**New structure:**

| Step | What happens | Backend route |
|------|-------------|---------------|
| 1 | Personal info confirmation | `PATCH /profile` |
| 2 | Business info | `POST /web/businesses` |
| 3 | Psychometric test | `POST /psychometrics` (idle placeholder now) |
| 4 | Transaction data | `POST /integrations/simulate` |
| 5 | Submit application | `POST /apply` |

---

## The Cursor Prompt

```
## PROJECT CONTEXT
[paste master context here as always]

---

## CURRENT TASK — Module 2: SME Owner Loan Application Wizard

---

## WHAT WE ARE BUILDING

A single full-screen modal wizard that guides the SME owner through
the entire loan application process in 5 sequential steps.

This replaces the original separate pages for psychometrics, integrations,
and apply. Those separate pages can still exist as routes but the PRIMARY
experience is this modal.

The modal is triggered by a button on the dashboard.
It covers the full screen with a blurred backdrop.
Inside is a centered card with a beautiful step-by-step form.

---

## DESIGN SYSTEM (same as dashboard — use these exact values)

Colors:
  Primary green dark:   #085041
  Primary green light:  #5DCAA5
  Navy dark:            #0C447C
  Navy light:           #85B7EB
  Gold:                 #D4A017
  Surface dark:         #0F1A16
  Surface light:        #F0F7F4
  Card dark:            #162820
  Card light:           #FFFFFF
  Border dark:          #1E3A2F
  Border light:         #D1E8DF
  Text muted dark:      #6EBF9A
  Text muted light:     #4B7A64

Modal backdrop: backdrop-blur-md bg-black/60
Modal card: max-w-2xl w-full mx-auto rounded-3xl shadow-2xl
  dark: bg-[#162820] border border-[#1E3A2F]
  light: bg-white border border-[#D1E8DF]

All colors must support dark: variant.
Use lucide-react for all icons.

---

## FILES TO CREATE

1. resources/js/Components/LoanApplicationModal.tsx  ← the entire wizard
2. app/Http/Controllers/Web/BusinessWebController.php
3. app/Http/Controllers/Web/PsychometricWebController.php
4. app/Http/Controllers/Web/IntegrationsWebController.php
5. app/Http/Controllers/Web/LoanApplicationWebController.php

## FILES TO EDIT

1. resources/js/Pages/Dashboard.tsx
   → add the "Apply for Loan" trigger button
   → import and render <LoanApplicationModal />
2. routes/web.php
   → add all new web routes

---

## THE MODAL ARCHITECTURE

The modal is managed entirely with React local state.
No Inertia router.visit() between steps — the page does NOT reload between steps.
Each step submits its data to its own Laravel web route via fetch() with
the CSRF token from the page props, then on success moves to the next step locally.

Exception: Step 4 (transaction simulation) and Step 5 (submit application)
use Inertia's router.post() because they need a full redirect after completion.

State shape inside the modal:
```tsx
const [isOpen, setIsOpen] = useState(false)
const [currentStep, setCurrentStep] = useState(1)
const [completedSteps, setCompletedSteps] = useState<number[]>([])
const [formData, setFormData] = useState({
  // Step 1
  name: '',
  phone: '',
  // Step 2
  businessName: '',
  sector: '',
  subCity: '',
  establishedYear: '',
  description: '',
  // Step 3 — psychometric answers (15 items)
  answers: {} as Record<number, number>,
  // Step 4 — no input, just a trigger
  // Step 5
  requestedAmount: '',
  tenureMonths: 12,
  purpose: '',
})
```

---

## STEP INDICATOR (top of modal, always visible)

Design:
```
  ①────②────③────④────⑤
Personal Business Psych  Data   Apply
```

Each step circle:
- Completed: solid bg-[#5DCAA5] with white checkmark icon, circle w-9 h-9
- Current: ring-2 ring-[#5DCAA5] bg-[#085041] text-white font-bold, circle w-9 h-9
- Future: bg-[#1E3A2F] text-[#6EBF9A], circle w-9 h-9

Connecting line between circles:
- Completed segment: bg-[#5DCAA5] h-0.5
- Incomplete segment: bg-[#1E3A2F] h-0.5

Labels below each circle: text-[10px] uppercase tracking-wider
- Current: text-[#5DCAA5] font-semibold
- Others: text-[#6EBF9A]

Step indicator is sticky at the top of the modal card.
Below it: a thin progress bar (h-1 bg-[#1E3A2F]) with a green fill
that animates width from 0% to 100% as steps complete.
Width = (currentStep - 1) / 4 * 100 + '%'

---

## MODAL HEADER (below step indicator)

Left side: step title + subtitle
Right side: X close button (only allow close on step 1; other steps show
a warning "You will lose your progress" confirmation)

Step titles:
1. "Personal Information" / "Confirm your identity"
2. "Business Details" / "Tell us about your business"
3. "Creditworthiness Assessment" / "15 questions · Takes 3 minutes"
4. "Transaction Data" / "Connect your CBE payment history"
5. "Loan Application" / "Final step — submit your request"

---

## STEP 1 — Personal Information

Purpose: confirm/update user's name and phone number.

Pre-fill from the `auth.user` Inertia prop.

Fields:
- Full Name (text input, required)
- Phone Number (text input, placeholder: +251 9XX XXX XXX)
- Email (disabled/read-only, shown as info — cannot be changed here)

Submit behavior:
- PATCH to `/profile` using fetch() with CSRF header
- On success: mark step 1 complete, move to step 2
- Show inline validation errors if any

Visual:
- Show a circular avatar placeholder with the user's initials in
  bg-[#085041] text-[#5DCAA5] font-bold at the top of this step
- Below avatar: the two fields

Button row (bottom of every step):
- Left: "Cancel" ghost button (step 1 only) or "Back" ghost button (steps 2-5)
- Right: solid brand-green "Continue →" button
  When loading: disabled + spinner inside button

---

## STEP 2 — Business Details

Purpose: create or update the business record.

Fields:
- Business Name (text, required)
- Sector (select, required):
  Options:
  - 5411 - Grocery
  - 5812 - Food / Cafe
  - 5912 - Pharmacy
  - 5732 - Electronics
  - 5651 - Retail Apparel
- Sub-city / Location (select, required):
  Options: Addis Ketema, Akaki Kaliti, Arada, Bole, Gullele,
           Kirkos, Kolfe Keranio, Lideta, Nifas Silk-Lafto, Yeka
- Year Established (number input, min: 1990, max: current year)
- Business Description (textarea, max 300 chars, optional)
  Show character counter: "243 / 300"

Submit behavior:
- POST to `/web/businesses` using fetch() with CSRF
- Laravel controller creates Business record linked to current user
- On success: mark step 2 complete, move to step 3

Create app/Http/Controllers/Web/BusinessWebController.php:
```php
public function store(Request $request): JsonResponse
{
    $validated = $request->validate([
        'name' => 'required|string|max:255',
        'sector' => 'required|string',
        'sub_city' => 'required|string',
        'established_year' => 'required|integer|min:1990|max:' . date('Y'),
        'description' => 'nullable|string|max:300',
    ]);

    $user = auth()->user();

    // Create or update (one business per user)
    $business = Business::updateOrCreate(
        ['owner_id' => $user->id],
        array_merge($validated, ['uuid' => (string) Str::uuid()])
    );

    return response()->json(['success' => true, 'business_id' => $business->id]);
}
```

Add route: POST /web/businesses → BusinessWebController@store (auth middleware)

Visual notes:
- The sector select: show a small colored emoji/icon next to each option
  🛒 Grocery  ☕ Cafe  💊 Pharmacy  📱 Electronics  👕 Retail
- On selecting sector, show a subtle animated highlight on the selected card
  (make the select look like clickable icon cards, not a plain dropdown)

---

## STEP 3 — Psychometric Assessment (PLACEHOLDER — build shell only)

⚠️ THIS STEP IS IDLE FOR NOW. Build the shell but show a placeholder.
The full psychometric UI will be built in a separate dedicated task after this.

What to build NOW:
- Show a card with a lock icon in brand green
- Title: "Creditworthiness Assessment"
- Description: "This 15-question assessment evaluates your integrity,
  financial conscientiousness, and risk tolerance. Your answers help our
  AI make a fairer credit decision."
- Three dimension pills:
  [🤝 Integrity] [📊 Conscientiousness] [⚖️ Risk Tolerance]
- A "Begin Assessment" button that is DISABLED and shows tooltip:
  "Assessment module coming soon"
- A small "Skip for now →" text link that moves to step 4

The "Skip for now" should be the ONLY way to advance from step 3 for now.
Mark step 3 as completed when skipped (we will replace this logic later).

---

## STEP 4 — Transaction Data

Purpose: load 60 days of synthetic CBE transaction data.

This step has no text input — it's an action step.

Layout:
- Explanation box (rounded-xl bg-[#085041]/10 border border-[#5DCAA5]/20 p-4):
  Icon: Database
  Title: "Why do we need this?"
  Text: "Your daily transaction history is the primary input to our AI
  forecasting model. We use 60 days of inflow and outflow data to predict
  your future cash flow and calculate a fair credit limit."

- Status card (changes based on heartbeatDaysLoaded prop):

  If 0 days:
  ```
  ┌─────────────────────────────────────────┐
  │  ⚠️  No transaction data found          │
  │  Click below to load your CBE history   │
  └─────────────────────────────────────────┘
  ```
  Red/amber border.

  If >= 45 days:
  ```
  ┌─────────────────────────────────────────┐
  │  ✅  60 days of data loaded             │
  │  Your data is ready for AI analysis     │
  └─────────────────────────────────────────┘
  ```
  Green border.

- "Load Transaction Data" button:
  - Full width, large (py-4)
  - Brand green background
  - Icon: Zap (lightning bolt) on the left
  - Label: "Load 60 Days of CBE Transaction Data"
  - When clicked: button shows spinner + "Loading data..." text
  - Uses Inertia router.post('/integrations/simulate') — NOT fetch()
    because this is a slow operation and we want the page to update
  - After redirect back (Inertia), if heartbeatDaysLoaded >= 45:
    show the green status and auto-advance to step 5 after 1.5 seconds

- Mini data preview (show after data is loaded):
  5 rows of fake transaction previews:
  ```
  May 20   Inflow   ETB 3,240   ●
  May 19   Outflow  ETB 1,890   ●
  May 18   Inflow   ETB 4,100   ●
  ...
  ```
  These are visual decoration only — hardcoded fake rows.
  They give the impression the real data loaded.

Create IntegrationsWebController:
```php
public function show(): Response {
    $business = auth()->user()->businesses()->first();
    $heartbeatCount = $business
        ? SmeDailyHeartbeat::where('business_id', $business->id)->count()
        : 0;
    return Inertia::render('Dashboard', [ // returns to dashboard with modal state
        'heartbeatDaysLoaded' => $heartbeatCount,
        'openModalAtStep' => 4,
    ]);
}

public function simulate(): RedirectResponse {
    $business = auth()->user()->businesses()->firstOrFail();
    app(SyntheticStatementGeneratorService::class)->generateForBusiness($business, days: 60);
    app(RebuildDailyHeartbeatAction::class)->execute($business);
    return redirect()->route('dashboard')
        ->with('openModalAtStep', 4)
        ->with('heartbeatSuccess', true);
}
```

Route: POST /integrations/simulate → IntegrationsWebController@simulate

---

## STEP 5 — Submit Application

Purpose: final form — loan amount, duration, purpose.

Fields:

**Loan Amount:**
- Label: "How much do you need? (ETB)"
- Slider + number input combined:
  - Show a range slider from 10,000 to 5,000,000
  - Below slider: a large formatted number display: "ETB 250,000"
  - The number is also editable directly
  - Slider thumb: brand green (#5DCAA5), track filled in green

**Loan Duration:**
- Label: "Repayment Period"
- NOT a select dropdown — use 4 clickable cards in a 2x2 grid:
  ```
  ┌──────────┐  ┌──────────┐
  │ 6 months │  │ 12 months│
  └──────────┘  └──────────┘
  ┌──────────┐  ┌──────────┐
  │18 months │  │ 24 months│
  └──────────┘  └──────────┘
  ```
  Selected card: bg-[#085041] border-[#5DCAA5] text-white
  Unselected: bg-transparent border-[#1E3A2F] text-muted

**Purpose of Loan:**
- Textarea, 4 rows
- Placeholder: "e.g., Purchase additional inventory for the upcoming holiday season"
- Character counter: "0 / 500"

**Summary box** (above submit button):
Show a read-only summary of everything entered:
```
┌─────────────────────────────────────────┐
│  Application Summary                    │
│  Business:     Ato Girma's Retail       │
│  Amount:       ETB 250,000              │
│  Duration:     12 months                │
│  Sector:       Retail Apparel           │
│  Data:         ✅ 60 days loaded        │
└─────────────────────────────────────────┘
```

Submit button:
- Full width, extra large (py-5)
- Background: linear gradient from #085041 to #0C447C
  (use style={{ background: 'linear-gradient(135deg, #085041, #0C447C)' }})
- Icon: Send on the right
- Label: "Submit Application for AI Evaluation"
- When loading: "Submitting..." + spinner, fully disabled

Submit behavior:
- Inertia router.post('/apply', formData)
- On success: close modal, show a full-page success state on dashboard:
  A centered card with:
  - Large checkmark animation (use CSS: scale 0→1 with bounce easing)
  - "Application Submitted!" in large text
  - "Your application is now queued for AI evaluation.
     The loan officer will review your results shortly."
  - A status tracker showing: Submitted ✓ → AI Processing → Officer Review → Decision

---

## CREATE LoanApplicationWebController.php

```php
public function store(Request $request): RedirectResponse
{
    $request->validate([
        'requested_amount' => 'required|numeric|min:10000|max:5000000',
        'tenure_months'    => 'required|integer|in:6,12,18,24',
        'purpose'          => 'required|string|max:500',
    ]);

    $business = auth()->user()->businesses()->firstOrFail();
    app(CreateLoanApplicationAction::class)->execute($business, $request->all());

    return redirect()->route('dashboard')->with('applicationSubmitted', true);
}
```

Route: POST /apply → LoanApplicationWebController@store

---

## MODAL OPEN/CLOSE BEHAVIOR

Open trigger: "Apply for Loan" button on dashboard
  - Only show this button if role === 'sme_owner'
  - If application already exists and status is not 'draft': show
    "View Application Status" button instead, linking to /sme-valuation

Close behavior:
  - Step 1: close immediately
  - Steps 2-5: show a small inline warning inside the modal:
    "Are you sure? Your progress will be saved." with "Stay" and "Exit" buttons
  - On close: animate the modal out (opacity 0 + scale 0.95, 200ms)

Open animation: backdrop fades in (opacity 0→1, 150ms),
card slides up (translateY 20px→0 + opacity 0→1, 250ms, ease-out)

---

## TRANSITIONS BETWEEN STEPS

When moving forward (Next):
  - Current step content: slides left (translateX 0→-40px + opacity 1→0, 200ms)
  - Next step content: slides in from right (translateX 40px→0 + opacity 0→1, 250ms)

When moving backward (Back):
  - Current step content: slides right (translateX 0→40px + opacity 1→0, 200ms)
  - Prev step content: slides in from left (translateX -40px→0 + opacity 0→1, 250ms)

Implement this with a simple useState for animationDirection ('forward'|'backward')
and CSS transition classes applied to the step content wrapper.

---

## DASHBOARD INTEGRATION

In Dashboard.tsx, add:

```tsx
// State
const [modalOpen, setModalOpen] = useState(false)
const [initialStep, setInitialStep] = useState(1)

// Check if we should auto-open modal at a specific step (from redirect)
// Read from Inertia page props: openModalAtStep
useEffect(() => {
  if (props.openModalAtStep) {
    setInitialStep(props.openModalAtStep)
    setModalOpen(true)
  }
}, [])

// Render
<LoanApplicationModal
  isOpen={modalOpen}
  onClose={() => setModalOpen(false)}
  initialStep={initialStep}
  heartbeatDaysLoaded={props.stats?.heartbeatDays ?? 0}
  user={props.user}
  stats={props.stats}
/>
```

The trigger button (for sme_owner role, in the KPI section or header):
```tsx
<button
  onClick={() => setModalOpen(true)}
  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm
             bg-[#085041] hover:bg-[#0a6350] text-white
             transition-all duration-200 shadow-lg
             hover:shadow-[0_0_20px_rgba(93,202,165,0.3)]"
>
  <Plus className="w-4 h-4" />
  Apply for Loan
</button>
```

---

## RESULT PAGE (existing, keep as separate page)

DO NOT touch resources/js/Pages/Borrower/SmeValuation.tsx in this task.
That page is upgraded in Task 2.4 separately.
Just make sure the "View Full Result" link goes to /sme-valuation.

---

## ROUTES SUMMARY (add all to routes/web.php)

```php
// SME Owner routes (session auth, sme-owner role)
Route::middleware(['auth', 'role:sme-owner'])->group(function () {
    Route::post('/web/businesses', [BusinessWebController::class, 'store']);
    Route::get('/psychometrics', [PsychometricWebController::class, 'show'])->name('psychometrics');
    Route::post('/psychometrics', [PsychometricWebController::class, 'store']);
    Route::get('/integrations', [IntegrationsWebController::class, 'show'])->name('integrations');
    Route::post('/integrations/simulate', [IntegrationsWebController::class, 'simulate'])->name('integrations.simulate');
    Route::get('/apply', [LoanApplicationWebController::class, 'create'])->name('apply');
    Route::post('/apply', [LoanApplicationWebController::class, 'store'])->name('apply.store');
    Route::get('/sme-valuation', [SmeValuationController::class, 'show'])->name('sme-valuation');
});
```

---

## QUALITY BAR — every item must be checked before you finish

[ ] Modal opens and closes with smooth animation
[ ] Step indicator updates correctly as user moves through steps
[ ] Progress bar width animates between steps
[ ] Step 1 pre-fills user's existing name
[ ] Step 2 sector selection uses icon cards, not plain select
[ ] Step 3 shows placeholder with "Skip for now" that advances to step 4
[ ] Step 4 shows correct status indicator based on heartbeatDaysLoaded prop
[ ] Step 5 loan amount slider and number input stay in sync
[ ] Step 5 duration uses clickable cards, not a select
[ ] Submit button has the gradient background
[ ] After submission: success state shows on dashboard with status tracker
[ ] Dark mode and light mode both look correct on every step
[ ] No TypeScript errors
[ ] Back button works on every step
[ ] Closing from step 2+ shows confirmation before closing

---

## AFTER YOU FINISH, TELL ME

1. Every file created or modified (with full path)
2. Command to run: php artisan serve + npm run dev
3. Whether any migration needs to run
4. Any prop types I should define in resources/js/types/index.ts
```

---

**Three things before you run this:**

Step 3 is intentionally a placeholder. Tell Cursor this explicitly when it asks — otherwise it will try to build the full psychometric UI inside the modal and get confused. The psychometric quiz is complex enough to deserve its own dedicated task where you wire it into step 3 after.

The slider in step 5 is the most impressive UI element in the whole form. If Cursor uses a plain `<input type="range">`, ask it to style the thumb and track using this exact CSS:
```css
input[type=range]::-webkit-slider-thumb { background: #5DCAA5; }
input[type=range]::-webkit-slider-runnable-track { background: #1E3A2F; }
```

After Cursor finishes, test by logging in as the creditworthy SME owner (`ato-girma-merkato-retail@test.et`) and clicking "Apply for Loan". Walk through all 5 steps. If step 4 redirect back to the modal at step 4 works — everything is wired correctly.
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