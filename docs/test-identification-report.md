# Test Identification Report — EthioSME Valuation System
**Generated:** 2026-05-27  
**Scope:** Full monorepo — Laravel 12 backend, FastAPI Python AI service, React/Inertia frontend

---

## SECTION 1 — Existing Test Inventory

### 1.1 Laravel Backend — PHPUnit (tests/)

| File | Tests | What It Tests | Status | Recommendation |
|---|---|---|---|---|
| `tests/Unit/ExampleTest.php` | 1 | `assertTrue(true)` | Passing — trivial | Delete |
| `tests/Feature/ExampleTest.php` | 1 | `GET /` returns 200 | Passes only if landing route resolves | Keep as smoke test; annotate |
| `tests/Feature/Auth/AuthenticationTest.php` | 4 | Web session login, logout, dashboard redirect | Likely passing — uses standard Breeze scaffold | Keep as-is |
| `tests/Feature/Auth/RegistrationTest.php` | 2 | Web registration form; redirects to dashboard | Likely passing | Keep as-is |
| `tests/Feature/Auth/EmailVerificationTest.php` | 3 | Signed URL verification, Verified event dispatch | Likely passing | Keep as-is |
| `tests/Feature/Auth/PasswordConfirmationTest.php` | 3 | `/confirm-password` route | Likely passing | Keep as-is |
| `tests/Feature/Auth/PasswordResetTest.php` | 4 | Password reset flow via notification token | Likely passing | Keep as-is |
| `tests/Feature/Auth/PasswordUpdateTest.php` | 2 | `PUT /password` | Likely passing | Keep as-is |
| `tests/Feature/ProfileTest.php` | 5 | Profile edit, update, delete account | Likely passing | Keep as-is |
| `tests/Feature/LoanApplicationSubmitTest.php` | 2 | Full submit flow with CSV upload; minimum-rows rejection | **Likely passing** — well-written, seeds roles, fakes storage | Keep as-is — this is a high-value test |
| `tests/Feature/Valuation/RunAiEvaluationTest.php` | 7 | AI evaluation, fallback, approve/reject flows, SHAP, role guard | **Likely passing** — uses `Http::fake()`, seeds complete fixtures | Keep as-is — highest value test in the suite |
| `tests/Unit/ImportTransactionHeartbeatServiceTest.php` | 2 | CSV parsing (pre-aggregated and transaction-level formats) | Likely passing — uses reflection to test private methods | Keep as-is — critical unit test |

**Key finding:** The existing test suite has no gaps at the bottom (trivial passing tests) but critical coverage gaps at the top. Zero tests exist for the NPV formula, psychometric scoring, state machine enforcement, multi-tenancy isolation, or the API layer.

**Notable architectural issue in existing tests:** `RunAiEvaluationTest` seeds `RoleName::LoanProvider` (correct) but the `ApplicationStatus` enum does not define `Evaluated` — it is defined only as `LoanApplication::STATUS_EVALUATED = 'evaluated'` on the model. The tests use the model constant, so they are correct, but this inconsistency between the enum and the model constants is itself a bug worth a test.

**Debug log pollution:** `RunValuationAction::execute()` and `LoanApplicationPolicy::viewPipeline()` contain `@file_put_contents` debug log writes to `.cursor/debug-054501.log`. These are side-effectful in tests and should be removed, but will not cause test failures since `@` suppresses errors.

---

### 1.2 Python AI Service — pytest (tests/)

| File | Tests | What It Tests | Status | Recommendation |
|---|---|---|---|---|
| `tests/test_features.py` | 5 | Heartbeat features, loan features, label extraction, psychometric defaults, composite fallback, feature assembly | **Likely passing** — pure unit tests, fixtures in conftest | Keep as-is |
| `tests/test_npv.py` | 4 | NPV positive result, insufficient history (RC-12), below-minimum threshold (RC-11), cap at maximum | **Likely passing** — pure math, no DB | Keep as-is |
| `tests/test_predict.py` | 12 | Full pipeline with trained registry and mocked DB, degraded mode, SHAP integrity, reason code logic, auth, timeout, business-not-found | **Likely passing** — well-structured, uses `mock_db` fixture | Keep as-is; see gap note below |

**Key gap in Python tests:** `tests/test_predict.py` mocks the database via `patch("app.database.execute_query", ...)`. This is the only strategy available without a real DB, but the `conftest.py` mock `side_effect` does not cover every SQL pattern. Specifically, the `fetch_training_heartbeat_rows` path (used by `/train`) is not covered, and the drift endpoint SQL patterns for `business_id`-filtered queries are not exercised. The `test_degraded_mode_when_forced` test trains a model but does not assert that the forecast lengths match `horizon_days`.

**Missing Python tests:** No test for `/train` endpoint (job acceptance, background task queuing, status polling). No test for `/drift` endpoint. No test for LSTM model training or LSTM sequence builder.

---

### 1.3 React Frontend — No Tests Found

No `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` files exist anywhere in `resources/js/`. No `jest.config.*` or `vitest.config.*` was found. The frontend has zero test coverage.

---

## SECTION 2 — Feature Inventory Requiring Tests

### 2A — Laravel Backend: Unit-Level Features

#### Domain: Auth

| Class | Method / Logic | Test Needed |
|---|---|---|
| `RegisterUserAction` | Creates user, assigns role, issues JWT pair in one transaction | Unit test: role is assigned; token pair returned |
| `IssueTokensAction` | Attempts auth via `Auth::guard('api')`, throws `AuthenticationException` on failure | Unit test: bad credentials throw; good credentials return `TokenPairData` |
| `RefreshTokensAction` | Refreshes JWT pair | Unit test: valid token refreshes; expired token fails |
| `RevokeTokensAction` | Invalidates current JWT | Unit test: token blacklisted after revoke |
| `WebRoleAlias::aliasFor()` | Maps canonical role names to web aliases; consolidates loan_officer → loan_provider | Unit test: all mappings are correct; loan_officer maps to loan_provider alias |
| `WebRoleAlias::middlewareRoleList()` | Expands role aliases for route middleware | Unit test: `sme-owner` expands to `sme_owner`; `loan_provider` includes legacy aliases |
| `RegistrationData` / `LoginRequest` | Required fields, email uniqueness | FormRequest validation unit test |

#### Domain: Business

| Class | Method / Logic | Test Needed |
|---|---|---|
| `CreateBusinessAction::execute()` | Creates business and returns it | Unit test with mocked DB |
| `UpdateBusinessAction::execute()` | Updates business fields | Unit test: only owner can update |
| `BusinessPolicy::view()` | Loan provider/admin can view any; sme_owner can view only own | Policy unit test with different user roles |
| `BusinessPolicy::update()` / `delete()` | Only owner with permission | Policy unit test |
| `BusinessPolicy::run()` | Valuation run permission | Policy unit test |

#### Domain: Lending

| Class | Method / Logic | Test Needed |
|---|---|---|
| `CreateLoanApplicationAction::execute()` | Creates application; idempotency key deduplication | Unit test: duplicate key returns existing record; unique key creates new |
| `SubmitLoanDecisionAction::execute()` | Terminal state guard; rejection requires reason codes; writes AdverseActionNotice | Unit test: reject without reason codes throws ValidationException; terminal application throws DomainException; approve path sets STATUS_APPROVED; reject path creates AdverseActionNotice |
| `LoanApplicationPolicy::evaluate()` | Only loan_provider roles; only for QUEUED_FOR_AI / SUBMITTED / PROCESSING statuses | Policy unit test for each non-evaluable status |
| `LoanApplicationPolicy::decide()` | Only for EVALUATED status | Policy unit test |
| `LoanApplicationPolicy::viewPipeline()` | Loan provider or admin only | Policy unit test |
| `ApplicationStatus::isTerminal()` | Approved / Rejected / Withdrawn | Unit test for each case |
| `LoanApplication::isReadyForValuation()` | Returns true for QUEUED_FOR_AI / SUBMITTED / PENDING_DATA_SYNC | Unit test |
| `LoanApplication::isDegradedEvaluation()` | Evaluated + npv_credit_limit null | Unit test |
| `LoanApplication::scopeForProvider()` | Scopes query to loan_provider_id | Feature test: provider A cannot see provider B's applications |
| `LoanApplication::npvCreditLimit` accessor | Falls back through valuation → snapshot_limit_etb | Unit test both paths |
| `LoanApplication::aiRiskScore` accessor | Falls back through valuation → snapshot_risk_score | Unit test both paths |

#### Domain: Valuation

| Class | Method / Logic | Test Needed |
|---|---|---|
| `CalculateNpvAction::execute()` | NPV = Σ CF_t / (1 + r_monthly)^t; discount rate clamped to [min_rate, max_rate]; mapped limit = min(max(npv, 0), avg_cf * limit_multiple) | Unit test with known inputs and expected outputs (formula correctness) |
| `CalculateNpvAction` — rate computation | rate = nbe_rate + base_premium - psychometric_relief * composite + xgboost_uplift * xgboost_score | Unit test: higher composite score → lower rate; higher xgboost_score → higher rate |
| `CalculateNpvAction` — min/max clamp | effectiveRate never below 5% or above 60% | Unit test boundary values |
| `PersistShapExplanationsAction::execute()` | Deletes existing SHAP rows, sorts by |abs(shap)|, creates new rows in sorted order | Unit test: correct sort order; idempotent (re-run produces same count) |
| `InferenceOrchestratorService::call()` | Happy path calls client; AiEngineException triggers fallback when enabled; generic Throwable triggers fallback when enabled; logs evaluation regardless | Feature test with Http::fake() |
| `InferenceOrchestratorService::call()` | fallback_enabled=false re-throws exception | Feature test |
| `ValuationFallbackService::build()` | Returns deterministic degraded InferenceResponseData with xgboostScore=0.55, isFallback=true | Unit test |
| `RunValuationAction::execute()` | Sets status to PROCESSING then EVALUATED; rolls back to QUEUED_FOR_AI on failure; idempotency guard on completed valuation | Feature test with Http::fake() |
| `InferenceResponseData::fromPredictV1()` | Parses all v1 fields; nullable npv_credit_limit; reason code string parsing ("RC-01: message" → {code, message}) | Unit test with sample payloads including null npv |
| `InferenceResponseData::isDegraded()` | True when forecasterMode=degraded OR npvCreditLimit=null | Unit test |
| `ReasonCodeBuilder::fromMlResponse()` | Parses ML reason codes; limits to 3 | Unit test |
| `ReasonCodeBuilder::build()` | Maps SHAP features to reason codes via negative threshold | Unit test with SHAP fixture |
| `CheckAiEngineHealthAction` | Calls health endpoint; returns status | Feature test with Http::fake() |
| `SupabaseValuationSchema::isSupabaseLayout()` | Branch logic: SQLite vs Supabase column presence | Unit test: must return false in in-memory SQLite test environment |

#### Domain: Psychometric

| Class | Method / Logic | Test Needed |
|---|---|---|
| `PsychometricNormalizer::normalizeV1()` | Reverse-scored Likert items (value = 6 - raw); dimension average | Unit test with reverse-scored question |
| `PsychometricNormalizer::normalizeV2()` | Choice questions (scored by option index); Likert with reverse scoring; social desirability flag (both positive and reversed items >= 4.0) | Unit test: SD flag triggers correctly; choice scoring; missing question ID skipped |
| `ScorePsychometricAssessmentAction::execute()` | Transitions application from PENDING_PSYCHOMETRIC → PENDING_DATA_SYNC after upsert | Feature test: verify status transition |
| Psychometric composite formula | composite = (integrity × 0.35) + (conscientiousness × 0.30) + (delayed_gratification × 0.20) + (financial_risk × 0.15) | Unit test: verify weights sum to 1.0 and formula matches Python service |

#### Domain: TimeSeries

| Class | Method / Logic | Test Needed |
|---|---|---|
| `ImportTransactionHeartbeatService::import()` | Full import: parse → aggregate → validate minimum rows → delete old → insert | Feature test (already partially covered by `LoanApplicationSubmitTest`) |
| `ImportTransactionHeartbeatService` — Excel parsing | `.xlsx` file parsed correctly via PhpSpreadsheet | Unit test with fake Excel file |
| `ImportTransactionHeartbeatService` — unsupported extension | `.pdf` throws `TransactionImportException` | Unit test |
| `ImportTransactionHeartbeatService` — pre-aggregated vs transaction-level detection | `isPreAggregatedDailyFormat()` correctly identifies format | Unit test: daily format with `daily_total_inflow`; transaction format with `credit`/`debit` columns |
| `ImportTransactionHeartbeatService` — Excel serial date | Numeric date value in CSV parsed via `ExcelDate::excelToDateTimeObject()` | Unit test |
| `ImportTransactionHeartbeatService` — unknown DR/CR type | Amount-only row with no type column treated as inflow | Unit test |
| `DailyHeartbeatAggregatorService` | Aggregation service methods | Unit tests |
| `SupabaseHeartbeatSchema` | Static helpers return correct column names | Unit tests |

#### Domain: Payments

| Class | Method / Logic | Test Needed |
|---|---|---|
| `SyntheticStatementGeneratorService::generate()` | Deterministic seeding; payday multiplier (day >= 25); holiday multiplier; 8% failure rate | Unit test: same seed → same output; payday days have higher txCount; holidays have higher multiplier |
| `EthiopianHolidayCalendar::isHoliday()` | Returns true for 9 defined holidays | Unit test all 9 dates |
| `IngestChapaWebhookAction` | Persists Chapa payload | Unit test |
| `InjectSyntheticStatementAction` | Calls generator and persists | Feature test |

#### Domain: Governance

| Class | Method / Logic | Test Needed |
|---|---|---|
| `FairnessMetricsCalculatorService::calculate()` | SPD = max(approval_rates) - min(approval_rates); EOD = max(TPR) - min(TPR); single cohort yields SPD=0 | Unit test: two cohorts with known rates produce expected SPD/EOD values |
| `RunFairnessAuditAction` | Calls calculator, persists FairnessAudit | Feature test |
| `RecordDriftMetricsAction` | Persists drift metrics | Unit test |

#### Domain: Compliance

| Class | Method / Logic | Test Needed |
|---|---|---|
| `AppendAuditLogAction::execute()` | Creates AuditLog row in transaction | Unit test |
| `AuditLogger::append()` | Swallows exceptions and logs warning on failure | Unit test: exception → returns null, does not throw |
| `RecordConsentAction` / `RequestErasureAction` | Create consent and erasure records | Unit tests |
| `LogSecurityIncidentAction` | Creates security incident record | Unit test |

#### Domain: Macroeconomics

| Class | Method / Logic | Test Needed |
|---|---|---|
| `UpsertExogenousFactorsAction::execute()` | Sets all existing rows `is_current=false`, then upserts by `effective_date` | Unit test: only one `is_current=true` row exists after multiple upserts; same date is idempotent |

#### Domain: Dashboard

| Class | Method / Logic | Test Needed |
|---|---|---|
| `DashboardStatsService::resolveRole()` | Prefers super_admin > loan_provider > sme_owner | Unit test with multi-role user |
| `DashboardStatsService::getForRole()` | Returns correct stat keys for each role | Feature test for each role |

---

### 2B — Laravel Backend: HTTP / Feature-Level Features

#### Web Routes (Inertia)

| Route | Method + Path | Auth | Missing Test |
|---|---|---|---|
| Landing | `GET /` | None | Smoke test exists (ExampleTest) |
| Dashboard | `GET /dashboard` | auth+verified | Test role-based component data passed to Inertia |
| Loan Application Show | `GET /loan-application` | sme_owner | SME owner sees own application data |
| Loan Application Submit | `POST /loan-application/submit` | sme_owner | Covered by LoanApplicationSubmitTest; test: non-owner cannot access |
| Loan Application EnsureBusiness | `POST /loan-application/ensure-business` | sme_owner | No test — creates business if none exists |
| Psychometrics | `GET /psychometrics` | sme_owner | No test |
| Psychometric Submit | `POST /psychometric-test/submit` | None (token-based) | No test — public endpoint with token auth |
| Psychometric Test | `GET /psychometric-test` | None | No test |
| Integrations | `GET /integrations` | sme_owner | No test |
| Simulate Chapa | `POST /integrations/simulate-chapa` | sme_owner | No test |
| SME Valuation | `GET /sme-valuation` | sme_owner | No test |
| SME Valuation Run | `POST /sme-valuation/{business}/run` | sme_owner | No test |
| Applications Pipeline | `GET /applications-pipeline` | loan_provider | No test for provider scoping (provider A cannot see provider B data) |
| Applications Evaluate | `POST /applications/{application}/evaluate` | loan_provider | Covered by RunAiEvaluationTest; test: provider cannot evaluate other provider's application |
| Application Detail | `GET /lender/applications/{application}/detail` | loan_provider | No test for cross-provider 403 |
| Risk Forecast | `GET /risk-forecast` | loan_provider | No test |
| Risk Forecast Show | `GET /risk-forecast/{application}` | loan_provider | No test |
| Decisioning Decide | `POST /decisioning/{application}/decide` | loan_provider | Covered by RunAiEvaluationTest; missing: cross-provider 403 |
| Decisioning XAI | `GET /decisioning-xai` | loan_provider | No test — complex data assembly |
| Decisioning XAI Application | `GET /decisioning-xai/{application}` | loan_provider | No test |
| Admin Users | `GET /admin/users` | super_admin | No test; non-admin should get 403 |
| Admin Users Store | `POST /admin/users` | super_admin | No test |
| Admin Users Update | `PATCH /admin/users/{user}` | super_admin | No test |
| Admin Users Destroy | `DELETE /admin/users/{user}` | super_admin | No test |
| Admin Loan Providers | `GET /admin/loan-providers` | super_admin | No test |
| Admin Loan Providers Store | `POST /admin/loan-providers` | super_admin | No test |
| Admin Loan Providers Update | `PATCH /admin/loan-providers/{loanProvider}` | super_admin | No test |
| Admin Loan Providers Toggle | `POST /admin/loan-providers/{loanProvider}/toggle-active` | super_admin | No test |
| Admin Audit Logs | `GET /admin/audit-logs` | super_admin | No test |
| Admin Audit Logs Export | `GET /admin/audit-logs/export` | super_admin | No test |
| Admin Model Training | `GET /admin/model-training` | super_admin | No test |
| Admin Model Training Store | `POST /admin/model-training` | super_admin | No test |
| Admin Model Training Sync | `POST /admin/model-training/{jobId}/sync` | super_admin | No test |

#### API Routes (JWT, `/api/v1`)

| Route | Method + Path | Auth | Missing Test |
|---|---|---|---|
| Register | `POST /v1/auth/register` | None | No JWT API test; web version tested |
| Login | `POST /v1/auth/login` | None | No test |
| Refresh | `POST /v1/auth/refresh` | None | No test |
| Logout | `POST /v1/auth/logout` | auth:api | No test |
| Me | `GET /v1/auth/me` | auth:api | No test |
| Businesses Index | `GET /v1/businesses` | auth:api | No test |
| Business Store | `POST /v1/businesses` | auth:api + permission | No test |
| Business Show | `GET /v1/businesses/{business}` | auth:api | No test |
| Business Update | `PATCH /v1/businesses/{business}` | auth:api + permission | No test |
| Psychometric Submit (API) | `POST /v1/businesses/{business}/psychometric-assessments` | auth:api + permission | No test |
| Valuate | `POST /v1/businesses/{business}/valuate` | auth:api + permission | No test |
| Valuation Latest | `GET /v1/businesses/{business}/valuation/latest` | auth:api + permission | No test |
| Psychometric Questions | `GET /v1/psychometric/questions` | auth:api | No test — question bank content |
| Chapa Webhook | `POST /v1/payments/chapa/webhook` | auth:api + permission | No test |
| Chapa Simulate | `POST /v1/payments/chapa/simulate` | auth:api + permission | No test |
| Loan Providers Public | `GET /v1/public/loan-providers` | None | No test |
| Loan Providers | `GET /v1/loan-providers` | auth:api | No test |
| Loan Provider Show | `GET /v1/loan-providers/{loanProvider}` | auth:api | No test |
| Loan Provider Store (API) | `POST /v1/loan-providers` | auth:api + super_admin | No test — role guard |
| Loan Provider Update (API) | `PATCH /v1/loan-providers/{loanProvider}` | auth:api + super_admin | No test |
| Applications Index | `GET /v1/applications` | auth:api | No test — scoping by role |
| Application Store | `POST /v1/applications` | auth:api + permission | No test; idempotency key behavior |
| Application Show | `GET /v1/applications/{application}` | auth:api | No test |
| Application Decision | `POST /v1/applications/{application}/decision` | auth:api + permission | No test |
| Consents Store | `POST /v1/me/consents` | auth:api + permission | No test |
| Erasure Request | `POST /v1/me/privacy/erasure-requests` | auth:api + permission | No test |
| Fairness Audits Index | `GET /v1/admin/fairness-audits` | auth:api + permission | No test |
| Fairness Audits Store | `POST /v1/admin/fairness-audits` | auth:api + super_admin | No test |
| Drift Metrics | `GET /v1/admin/drift-metrics` | auth:api + permission | No test |
| Exogenous Factors Index | `GET /v1/admin/exogenous-factors` | auth:api + super_admin | No test |
| Exogenous Factors Store | `POST /v1/admin/exogenous-factors` | auth:api + super_admin | No test |
| Training Jobs | `GET /v1/admin/training/jobs` | auth:api + super_admin | No test |
| Training Jobs Store | `POST /v1/admin/training/jobs` | auth:api + super_admin | No test |
| Training Jobs Show | `GET /v1/admin/training/jobs/{jobId}` | auth:api + super_admin | No test |
| AI Health | `GET /v1/ai/health` | None | No test |

---

### 2C — Python AI Service: Unit-Level Features

| Module | Function / Class | What Needs Testing |
|---|---|---|
| `app/features/heartbeat_features.py` | `compute_heartbeat_features()` | Partially covered. Missing: empty rows returns all-zero defaults; rows < 14 uses all rows for 14d window; cashflow_trend sign for clearly declining series |
| `app/features/heartbeat_features.py` | `build_lstm_sequence()` | Not tested. Returns None when rows < seq_len=60; returns (60, n_features) array when sufficient rows |
| `app/features/heartbeat_features.py` | `extract_net_cashflow_series()` | Not tested. Returns list of net_cashflow floats |
| `app/features/loan_features.py` | `compute_loan_features()` | Covered for basic case. Missing: zero loans returns defaults; multiple loans aggregate correctly |
| `app/features/loan_features.py` | `get_monthly_installment_for_dscr()` | Not tested. Returns installment from first active loan |
| `app/features/feature_assembler.py` | `compute_business_features()` | Not tested. Age calculation; premises encoding (online=0, rented=1, owned=2); missing business_row returns zeros |
| `app/features/feature_assembler.py` | `compute_exogenous_features()` | Not tested. Missing exo_row returns defaults (0.15, 0.20, 55.0) |
| `app/features/feature_assembler.py` | `assemble_features()` with lstm_features | Covered for base case. Missing: LSTM features extend vector to 27 dimensions; snapshot hash is 64-char hex |
| `app/services/npv_service.py` | `compute_npv_credit_limit()` | 4 tests exist. Missing: risk_band "low" vs "high" produces different rates; psychometric score = 1.0 gives maximum relief; rate formula `r_annual = nbe + risk_premium * (1 - 0.3 * composite)` |
| `app/models/xgboost_model.py` | `XGBoostScorer.predict()` | Partially covered. Missing: untrained model raises ScorerNotReadyError; risk band thresholds (< 0.35 = low, <= 0.65 = medium, > 0.65 = high) |
| `app/models/xgboost_model.py` | `_feature_triggers_reason_code()` | Partially covered by reason code tests. All 11 feature conditions not exhaustively tested |
| `app/models/xgboost_model.py` | `_build_monotone_constraints()` | Not tested. Produces correct constraint tuple from feature names |
| `app/models/xgboost_model.py` | `XGBoostScorer.save()` / `load()` | Not tested. Round-trip persistence; corrupt artifact is skipped |
| `app/models/deepar_model.py` | `FallbackForecaster.predict()` | 1 test exists. Missing: empty history returns zero series; holiday multiplier increases values on known holiday dates |
| `app/models/deepar_model.py` | `DeepARModel` | Not tested independently beyond training in integration test |
| `app/ethiopian_calendar.py` | `calendar_features_for_date()` | Not tested. Ethiopian public holiday logic |
| `app/services/model_registry.py` | `get_registry()` singleton | Tested via reset_registry fixture. Standalone test for `load_all()` with no artifacts |

---

### 2D — Python AI Service: API-Level Features

| Endpoint | Test Gap |
|---|---|
| `POST /predict` — auth | Covered: missing key returns 401 |
| `POST /predict` — business not found | Covered: raises 404 |
| `POST /predict` — scorer not ready | Covered: raises 503 |
| `POST /predict` — timeout | Covered (via `asyncio.wait_for`) but no test for partial completion |
| `POST /predict` — invalid `horizon_days` (< 1 or > 365) | Not tested — Pydantic validation |
| `POST /predict` — invalid `cashflow_haircut` (< 0 or > 1) | Not tested — Pydantic validation |
| `GET /health` | Partially covered via mock. Missing: real model loaded → `loaded=true` |
| `POST /train` | Not tested — job accepted (202), background task queued |
| `GET /train/{job_id}` | Not tested — 404 for unknown job; status returned for known job |
| `GET /drift` | Not tested — returns empty list; filters by `business_uuid` |
| All routes — wrong key | Covered for `/predict`. Not tested for `/train`, `/drift` |

---

### 2E — React Frontend: Component-Level Features

No testing infrastructure exists. Features that would need tests:

| Component / Page | Key Behaviors |
|---|---|
| `Components/ApplyModal.tsx` | 5-step modal flow; Step 0 lender selection; form validation; Inertia submit; step-back navigation |
| `Pages/Borrower/LoanApplication.tsx` | Conditional rendering based on application status; modal open/close |
| `Pages/Lender/ApplicationsPipeline.tsx` | Table renders with `applications` prop; `can_run_ai` gate; `is_degraded` badge |
| `Pages/Lender/DecisioningAndXAI.tsx` | SHAP bar chart renders; approve/reject form submission with reason codes |
| `Pages/Lender/RiskAndForecast.tsx` | Recharts forecast chart renders with P10/P50/P90 series |
| `Pages/Dashboard.tsx` | Renders correct stats section based on `userRoles` prop |
| `Pages/Admin/Users.tsx` | Role badge colors match spec; create/edit/delete modals |
| `Pages/Admin/LoanProviders.tsx` | Provider CRUD; toggle-active state |
| `Layouts/AuthenticatedLayout.tsx` | Navigation shows/hides links based on role |
| `Pages/Borrower/PsychometricTest.tsx` | Question rendering; answer collection; submit |
| `Components/Lender/EvaluationPanel.tsx` | Slide-over renders; fetches application detail via JSON; decision submission |

---

### 2F — Cross-Service Integration Points

| Integration Point | What Can Break | Test Gap |
|---|---|---|
| `AiEngineClient::predict()` → `POST /predict` | Contract version mismatch; field name changes; null npv_credit_limit deserialization | `RunAiEvaluationTest` covers this via `Http::fake()` — no live integration test |
| `InferenceResponseData::fromPredictV1()` parses `reason_codes` | Python sends `["RC-01: msg"]` (string list); PHP parses to `{code, message}` tuples | Partially covered by `RunAiEvaluationTest` fixtures. Not tested for malformed strings or empty array |
| `InferenceOrchestratorService::buildPredictPayload()` | `business_uuid`, `horizon_days`, `cashflow_haircut`, `requested_amount` passed correctly | Not unit tested — relies on config values |
| `AiEngineClient` 503 retry logic | 5-second sleep + one retry on 503 | Not tested — would require real HTTP mocking |
| Auth: `X-Internal-Key` header | PHP sets it; Python validates it | PHP side: tested via `RunAiEvaluationTest` with Http::fake(). Python side: tested in `test_predict_requires_api_key` |
| Laravel → Python: `business_uuid` must exist in Python's DB | Python raises `BusinessNotFoundError` → PHP catches as `AiEngineException` → fallback applied | PHP fallback behavior tested; Python 404 tested separately |
| `SupabaseValuationSchema` layout detection | Tests run SQLite (in-memory), production runs Supabase. Column presence checks affect insert shape | `isSupabaseLayout()` will return false in tests — this is correct but must be explicitly asserted |
| `SupabaseHeartbeatSchema` layout detection | Same dual-schema risk for heartbeat column names | Partial coverage in `LoanApplicationSubmitTest` |

---

### 2G — Database Integrity Features

| Feature | Location | Test Gap |
|---|---|---|
| No FK constraints (by design) | All migrations | No test verifying cascading behavior does not exist |
| Soft deletes on `LoanApplication` | `SoftDeletes` trait | No test: deleted applications excluded from pipeline queries |
| `SmeDailyHeartbeat::insert()` deduplication | `ImportTransactionHeartbeatService` deletes by source_type before insert | Covered in `LoanApplicationSubmitTest` |
| `ExogenousFactor` single active row | `UpsertExogenousFactorsAction` | Not tested |
| `Valuation` → `ShapExplanation` one-to-many | `PersistShapExplanationsAction` | Not tested |
| `LoanApplication::scopeForProvider()` | Filters by `loan_provider_id` | Not tested — critical for data isolation |
| `AuditLog` created on state changes | `AppendAuditLogAction` | Not tested |

---

## SECTION 3 — Recommended Testing Stack

### Laravel Backend

**Framework:** PHPUnit 11 (already installed via `phpunit.xml`). Do not switch to Pest — the existing tests use PHPUnit style and the codebase has no Pest conventions. Introducing Pest requires a migration decision that adds scope without benefit.

**Database strategy:** Keep SQLite in-memory for unit and feature tests (already configured in `phpunit.xml`). This is valid because `SupabaseValuationSchema::isSupabaseLayout()` returns false in SQLite, triggering the correct non-Supabase code path. This must be explicitly asserted in tests.

**HTTP faking:** Use `Http::fake()` for all AI service calls — already demonstrated in `RunAiEvaluationTest`. Never make real HTTP calls in tests.

**Factory completeness:** Only `UserFactory` exists. New factories needed: `BusinessFactory`, `LoanApplicationFactory`, `LoanProviderFactory`, `ValuationFactory`, `PsychometricAssessmentFactory`, `SmeDailyHeartbeatFactory`. All existing tests use `User::create()` directly — this works but factories enable faster test data setup.

**Seeder dependency:** All tests that need roles must call `$this->seed(RolesAndPermissionsSeeder::class)`. This pattern is correct and already used in the existing high-value tests.

### Python AI Service

**Framework:** pytest with asyncio (already configured in `pytest.ini` with `asyncio_mode = auto`).

**Mocking strategy:** The `mock_db` fixture in `conftest.py` is the correct approach — patch `execute_query` at every import site. This is already implemented for the predict pipeline. Extend it to cover `/train` and `/drift` SQL patterns.

**ML model strategy:** The `trained_registry` fixture in `test_predict.py` trains real XGBoost/DeepAR models in-memory with minimal data. This is the correct approach — avoid mocking the ML models themselves, as SHAP integrity depends on the real booster internals. Training with 10 synthetic samples is sufficient for interface-level tests.

**Do not use real database connections** in any test — the Supabase connection is not available in CI and all SQL is already abstracted behind `execute_query`.

### React Frontend

**Framework:** Vitest (preferred over Jest for this stack — Vite 6 is already the bundler; Vitest integrates natively without additional config). Requires `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`.

**Inertia.js mocking:** Use `@inertiajs/react`'s `createInertiaApp` in tests or mock `useForm` and `router` directly. Inertia forms are not straightforward to test — focus on rendering logic and user interactions, not the Inertia submission mechanism itself.

**Scope:** Given the thesis defense timeline, frontend testing should be limited to the highest-risk components: `ApplyModal` multi-step flow, SHAP bar chart rendering in `DecisioningAndXAI`, and role-based nav visibility in `AuthenticatedLayout`.

### End-to-End

**Framework:** Playwright is recommended over Cypress for this stack. Playwright has native async support matching the React/Inertia async patterns, runs faster in headless mode, and handles Inertia page transitions (which are full-page XHR swaps) without special configuration.

**Scope for thesis defense:** 3 critical user journeys only: (1) SME owner registers, uploads CSV, completes psychometric, (2) Loan officer views pipeline and triggers AI evaluation, (3) Loan officer approves an evaluated application.

**AI service dependency:** E2E tests must either run against the live AI service or use Laravel's `Http::fake()` via a test-mode flag. A dedicated `.env.testing` with `AI_SERVICE_FALLBACK_ENABLED=true` is the simplest path — this forces the fallback path and avoids the Python service dependency entirely.

---

## SECTION 4 — Prioritized Test Plan

The following is ordered by business criticality for the thesis defense. Items at the top would cause public demo failure or invalidate the thesis claims if broken.

### Priority 1 — Formula Correctness (Thesis Claims)

| # | Test Description | Why Critical |
|---|---|---|
| 1 | `CalculateNpvAction`: given known P10 series, NBE rate, psychometric score, and XGBoost score, assert the exact NPV and mapped limit in ETB | The NPV formula is the core thesis contribution. An incorrect formula invalidates all credit limit outputs shown in the defense |
| 2 | `CalculateNpvAction`: assert discount rate formula matches Python's `npv_service.py` formula — the two implementations use different risk premium structures (PHP: `base_premium - psychometric_relief × composite + xgboost_uplift × xgboost_score`; Python: `risk_premium_by_band × (1 - 0.3 × composite)`). These are divergent formulas applied to the same data — document and test both independently | This discrepancy will be a thesis committee question |
| 3 | Python `compute_npv_credit_limit()`: assert daily discount rate conversion `r_daily = (1 + r_annual)^(1/365) - 1` is used correctly, not monthly | Formula correctness |
| 4 | Python `compute_npv_credit_limit()`: assert RC-12 returned when `history_days < 45` | Boundary condition for minimum data requirement |
| 5 | Python `compute_npv_credit_limit()`: assert NPV capped at 5,000,000 ETB | Maximum credit limit constraint |

### Priority 2 — SHAP Integrity (AI Explainability Claim)

| # | Test Description | Why Critical |
|---|---|---|
| 6 | Python `XGBoostScorer.predict()`: `shap_integrity_passed = True` when `|sigmoid(base + sum(shap)) - prob| < 1e-4` | Thesis claims SHAP explains AI decisions; if integrity fails, the explanation is mathematically incorrect |
| 7 | Python `XGBoostScorer.predict()`: `shap_integrity_passed = False` when explainer is corrupted or feature vector is misaligned | Edge case guard |
| 8 | PHP `PersistShapExplanationsAction`: SHAP rows are sorted by descending `|shap_value|`; re-running deletes and recreates correctly | SHAP importance chart depends on correct ordering |
| 9 | PHP `InferenceResponseData::fromPredictV1()`: `shapIntegrityPassed` field is preserved correctly from Python response | Cross-service integrity check |

### Priority 3 — Loan Provider Data Scoping (Security)

| # | Test Description | Why Critical |
|---|---|---|
| 10 | `GET /applications-pipeline` with Loan Provider A cannot see applications assigned to Loan Provider B | Multi-tenancy failure is a demo-breaking security bug |
| 11 | `POST /decisioning/{application}/decide` with Loan Provider A's user attempting to decide on Loan Provider B's application returns 403 | Same |
| 12 | `GET /decisioning-xai` stats are scoped to the authenticated user's `loan_provider_id` | XAI dashboard leaks cross-provider data if scoping fails |
| 13 | `GET /lender/applications/{application}/detail` returns 403 for cross-provider access | Same |

### Priority 4 — State Machine Enforcement

| # | Test Description | Why Critical |
|---|---|---|
| 14 | `SubmitLoanDecisionAction`: terminal application throws `DomainException` | Prevents double-deciding |
| 15 | `SubmitLoanDecisionAction`: reject without reason codes throws `ValidationException` | ECOA-style adverse action requirement |
| 16 | `LoanApplicationPolicy::evaluate()`: evaluating an application in EVALUATED or APPROVED status returns false | Prevents re-evaluation overwriting a completed valuation |
| 17 | `ScorePsychometricAssessmentAction`: transitions PENDING_PSYCHOMETRIC → PENDING_DATA_SYNC | State machine correctness |
| 18 | `RunValuationAction`: sets PROCESSING before calling AI; rolls back to QUEUED_FOR_AI on exception | Prevents stuck-in-processing applications |
| 19 | `ApplicationStatus::isTerminal()`: Approved, Rejected, Withdrawn are terminal; Evaluated is not | Enum correctness |

### Priority 5 — AI Service 15-Step Pipeline

| # | Test Description | Why Critical |
|---|---|---|
| 20 | Python `PredictService.run()`: full pipeline with `mock_db` and `trained_registry` returns all required fields — already covered in `test_predict.py` | Validate pipeline integration |
| 21 | Python `PredictService.run()`: LSTM padding path — model trained with 27 features but only 24 available at inference pads correctly — already covered | LSTM feature mismatch regression |
| 22 | PHP `InferenceOrchestratorService::call()`: `AiEngineException` triggers fallback when `fallback_enabled=true` | Live AI unreachability during demo |
| 23 | PHP `InferenceOrchestratorService::call()`: connection refused triggers fallback (Hugging Face cold start scenario) | Common in demo environment |
| 24 | PHP `ValuationFallbackService::build()`: returns `xgboostScore=0.55`, `isFallback=true`, `forecasterMode='degraded'` | Fallback content correctness |

### Priority 6 — Psychometric Scoring Formula

| # | Test Description | Why Critical |
|---|---|---|
| 25 | `PsychometricNormalizer::normalizeV2()`: reverse-scored Likert item uses `6 - raw_value` | Incorrect scoring inverts the psychometric dimension |
| 26 | `PsychometricNormalizer::normalizeV2()`: social desirability flag triggers when both positive and reversed items average >= 4.0 in same dimension | Fraud detection signal |
| 27 | Python `compute_psychometric_features()`: `composite_score = None` in DB falls back to weighted formula `0.35*integrity + 0.30*conscientiousness + 0.20*delayed_gratification + 0.15*financial_risk` — already covered in `test_features.py` | Formula correctness |
| 28 | Verify psychometric weights: PHP system spec says `0.35/0.30/0.20/0.15`; Python `conftest.py` `sample_psychometric_row` has `composite_score = 0.74` — verify this equals the weighted formula given the sample scores | Cross-service formula consistency |

### Priority 7 — Minimum Viable Coverage for Remaining Domains

| # | Test Description |
|---|---|
| 29 | `UpsertExogenousFactorsAction`: only one `is_current=true` row after multiple upserts |
| 30 | `FairnessMetricsCalculatorService`: two cohorts with known approval rates produce correct SPD value |
| 31 | `CreateLoanApplicationAction`: idempotency key returns existing record without creating a duplicate |
| 32 | `EthiopianHolidayCalendar`: all 9 known holidays return `isHoliday() = true` |
| 33 | `AuditLogger::append()`: exception in DB write returns null without throwing |
| 34 | JWT API: `POST /v1/auth/register` creates user with correct role and returns token pair |
| 35 | JWT API: `POST /v1/auth/login` with wrong password returns 401 |
| 36 | JWT API: authenticated request without token returns 401 |
| 37 | JWT API: `GET /v1/applications` scoped to authenticated SME owner's business |

---

## SECTION 5 — Known Issues Identified During Analysis

The following are not test gaps but defects observed while reading the code. They should inform test design.

1. **`ApplicationStatus` enum missing `Evaluated` case.** The enum defines Draft, PendingPsychometric, PendingDataSync, QueuedForAi, Processing, Approved, Rejected, Withdrawn — but `'evaluated'` is only a string constant on `LoanApplication`. The `isTerminal()` method on the enum does not know about the Evaluated state. Tests using `ApplicationStatus::isTerminal()` must use the model constants, not the enum.

2. **Dual NPV formula implementations.** PHP's `CalculateNpvAction` uses monthly discounting with `r_annual/12` as the period rate. Python's `npv_service.py` uses daily discounting with `(1 + r_annual)^(1/365) - 1`. For a 30-day horizon these produce materially different credit limits. The Python service's formula is authoritative (it runs first and sets `npv_credit_limit`), while the PHP action appears to be a redundant client-side calculation. A test that asserts both produce the same result for the same inputs will fail — this discrepancy needs to be documented as a design decision or resolved.

3. **Debug log writes in production code.** `RunValuationAction::execute()` and `LoanApplicationPolicy::viewPipeline()` contain `@file_put_contents(base_path('.cursor/debug-054501.log'), ...)` calls. These will attempt filesystem writes in the test environment and, while suppressed by `@`, represent technical debt.

4. **`SupabaseValuationSchema` and `SupabaseHeartbeatSchema` dual-layout branching.** Tests run against SQLite where `isSupabaseLayout()` returns false. Production runs Supabase where it returns true. The insert attribute shapes differ between the two paths. The only way to test the Supabase path is to mock `Schema::hasColumn()` — this should be added as a test.

5. **`ApplicationsPipelineController` aborts with 403 when `loan_provider_id` is null.** There is no factory or seeder that creates a `loan_provider` user with `loan_provider_id` set. `RunAiEvaluationTest` seeds an officer but does not set `loan_provider_id`, so the pipeline index route would 403 if called directly. The test avoids this by only calling the evaluate route.

---

## Report File Location

`/home/fikir/Documents/Thesis/ethio-sme-backend/docs/test-identification-report.md`
