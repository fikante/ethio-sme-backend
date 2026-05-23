# Codebase Status Report

**Project:** Ethio-SME Valuation System (Thesis PoC)  
**Repo:** Monorepo — Laravel 13 backend + React 18 (Inertia) frontend in `resources/js/`  
**PRD alignment:** Backend domain logic largely matches PRD v3; frontend is mostly scaffolded except valuation/admin slices.  
**External dependency:** Python FastAPI AI engine (`AI_SERVICE_URL`, `AI_SERVICE_TOKEN`) — not in this repo; `docker-compose.yml` only runs Laravel + Postgres.

---

## Executive Summary

| Area | Estimated completion | Notes |
|------|---------------------|--------|
| **Backend (Laravel API + domain)** | **~78%** | Strong DDD modules, schema, JWT API, valuation/NPV/SHAP pipeline, Chapa simulation, governance/compliance endpoints |
| **Frontend (Inertia/React UI)** | **~38%** | Polished shell (layout, auth, theme); 6/10 thesis pages are placeholders; no ECharts/Plotly; no JWT API client layer |
| **End-to-end demo readiness** | **~50%** | `DevDemoSeeder` can populate a defense path; UI does not yet expose full borrower → lender → admin flows |

**Biggest strengths**
- Clean `app/Domain/*` structure (Actions/Services/Policies/Requests) aligned with `docs/architechture.md`
- Database schema covers PRD tables (heartbeat, SHAP, adverse action, exogenous factors, compliance)
- Valuation orchestration (`RunValuationAction` → FastAPI → NPV → SHAP persist) is implemented
- Role/permission model (Spatie) with API + web guard aliases (`sme-owner` ↔ `sme_owner`)

**Biggest risks**
- **AI engine coupling:** Defense demo fails if FastAPI is down or contract mismatches
- **Post-valuation status:** Applications remain `processing` after AI run (officer decision not auto-advanced)
- **Frontend gaps vs PRD:** No probabilistic forecast chart (P10 red cone), no SHAP waterfall, no psychometric UI, no reject-with-reason UI
- **Orphan domain actions:** `RecordDriftMetricsAction`, `LogSecurityIncidentAction` exist but have no HTTP/schedule callers
- **Zero business-logic tests** (only Breeze auth/profile tests)

---

## Backend Status

### Database

**27 migrations** → PostgreSQL-oriented schema (SQLite possible locally).

| Table | Purpose | Key columns / FKs |
|-------|---------|-------------------|
| `users` | Identity (session + JWT) | Standard Breeze fields |
| `businesses` | SME static covariates | `uuid`, `owner_id`→users, `sector`, `sub_city`, `established_year`; soft deletes |
| `psychometric_assessments` | Willingness-to-repay scores | `integrity/conscientiousness/risk_tolerance` (0–1), `raw_answers` JSON |
| `raw_transactions` | Append-only Chapa ledger | `provider_tx_ref`, `amount`, `status`, `metadata` JSONB, `source`, `idempotency_key` |
| `sme_daily_heartbeat` | LSTM/DeepAR input series | `inflow/outflow`, `transaction_failure_rate`, `is_payday`, `is_holiday`, `mape_score`; unique `(business_id, heartbeat_date)` |
| `exogenous_factors` | Admin macro covariates | `nbe_policy_rate`, `inflation_rate`, `usd_etb_rate`, effective date |
| `loan_applications` | Origination + AI snapshot | Status enum (8 states), forecast JSON, SHAP/reason_codes, `npv_credit_limit`, `apr`; soft deletes |
| `valuations` | Per-inference run | P10/P50/P90 series, XGBoost score/class, NPV/limit, idempotency |
| `shap_explanations` | Normalised SHAP rows | `feature_key`, `shap_value`, `sort_order` → `valuation_id` |
| `adverse_action_notices` | NBE rejection audit | `reason_codes`, `narrative`, officer FK |
| `ai_evaluation_logs` | Inference audit trail | Request/response JSON, latency |
| `ai_training_jobs` | Model retrain tracking | `external_job_id`, status |
| `fairness_audits` | SPD/EOD results | `cohort_definition`, `spd`, `eod` |
| `drift_metrics` | MAPE drift storage | Schema present; population not wired |
| `consents`, `data_subject_requests`, `audit_logs`, `security_incidents` | PDPP compliance | APIs exist; incident logging action unused |
| `refresh_token_families` | JWT refresh rotation | Used by auth actions |
| Spatie `roles`/`permissions` + `audits` (Owen-it) | RBAC + model auditing | Dual guard (`api`, `web`) |

**Gaps:** No DB-level check that `users.role` matches Spatie (roles are Spatie-only). `drift_metrics` / `security_incidents` likely empty in practice.

---

### Models (19)

All Eloquent models under `app/Models/`. Core relationships:

- **User** — `HasRoles`, `JWTSubject`, `businesses()`, refresh tokens, consents
- **Business** — `owner`, psychometric, transactions, heartbeat, applications, valuations; `Auditable`, `SoftDeletes`
- **LoanApplication** — lifecycle constants, JSON casts for forecasts/SHAP; `isReadyForValuation()` = `queued_for_ai` \| `pending_data_sync`
- **Valuation** — `shapExplanations()`, status `pending|completed|failed`
- **PsychometricAssessment**, **RawTransaction**, **SmeDailyHeartbeat**, **ExogenousFactor** — as per PRD
- **AdverseActionNotice**, **ShapExplanation**, **AiEvaluationLog**, **AiTrainingJob**, **FairnessAudit**, **DriftMetric**, **Consent**, **DataSubjectRequest**, **AuditLog**, **SecurityIncident**, **RefreshTokenFamily**

Business roles match PRD personas when seeded (`sme_owner`, `loan_officer`, `super_admin`).

---

### Routes Overview

**API** (`routes/api.php`, prefix `/api/v1`, guard `auth:api` JWT):

| Method | Endpoint | Controller | Status |
|--------|----------|------------|--------|
| GET | `/ai/health` | `AiHealthController` | Public |
| POST | `/auth/register`, `/login`, `/refresh` | `AuthController` | Complete |
| POST | `/auth/logout` | `AuthController` | Permission-gated |
| GET | `/auth/me` | `AuthController` | Complete |
| GET/POST/PATCH | `/businesses`, `/businesses/{id}` | `BusinessController` | Complete |
| GET | `/psychometric/questions` | `PsychometricController` | Complete |
| POST | `/businesses/{id}/psychometric-assessments` | `PsychometricController` | Complete |
| POST | `/businesses/{id}/valuate` | `ValuationController` | Requires queued application |
| GET | `/businesses/{id}/valuation/latest` | `ValuationController` | Complete |
| POST | `/payments/chapa/webhook`, `/simulate` | Chapa controllers | Complete |
| GET/POST | `/applications`, `/applications/{id}` | `LoanApplicationController` | Pipeline + self scopes |
| POST | `/applications/{id}/decision` | `LoanDecisionController` | Reject requires reason codes |
| POST | `/me/consents`, `/me/privacy/erasure-requests` | Compliance | Complete |
| GET | `/admin/fairness-audits`, `/admin/drift-metrics` | Governance | Read |
| GET/POST | `/admin/exogenous-factors` | `ExogenousFactorController` | `super_admin` |
| POST | `/admin/fairness-audits` | `FairnessAuditController` | `super_admin` |
| GET | `/admin/audit-logs` | `AuditLogController` | `super_admin` |
| GET/POST | `/admin/training/jobs`, `.../{jobId}` | `TrainingJobController` | Proxies FastAPI |

**Web** (`routes/web.php`, session auth + Inertia):

| Method | Route | Page / controller | Status |
|--------|-------|-------------------|--------|
| GET | `/` | `Landing` | Marketing shell |
| GET | `/dashboard` | `Dashboard` | **Generic placeholder** (sales/inventory copy) |
| GET | `/psychometrics`, `/integrations` | Placeholders | Not built |
| GET/POST | `/sme-valuation` | `SmeValuationController` → `Borrower/SmeValuation` | **Partial** (run valuation works) |
| GET | `/applications-pipeline`, `/decisioning-xai` | Placeholders | Not built |
| GET | `/risk-forecast` | `RiskAndForecastController` → `Lender/RiskAndForecast` | **Table only** (no charts) |
| GET | `/admin/macroeconomic-factors`, `/admin/fairness-audit` | Placeholders | Not built |
| GET/POST | `/admin/model-training` | `ModelTrainingController` | **Functional** |
| Breeze | `/login`, `/register`, `/profile` | Auth/profile | Standard |

---

### Controllers

**API (thin, delegate to Domain Actions):** All major PRD modules have controllers. Heaviest logic lives in Actions, not controllers — good.

**Web:** Only 3 custom controllers (`SmeValuation`, `RiskAndForecast`, `ModelTraining`); rest are closures rendering placeholders.

**Notable gaps**
- `RunValuationRequest` exists but `ValuationController` uses raw `Request`
- No web routes calling compliance or Chapa simulate (API-only)
- `RecordDriftMetricsAction` / `LogSecurityIncidentAction` — **no controller or scheduler**

---

### Requests / Validation

**15 Domain FormRequests** under `app/Domain/*/Requests/` covering auth, business, psychometric, lending, payments, valuation, macro, governance, compliance.

Legacy Breeze: `app/Http/Requests/ProfileUpdateRequest.php`, `LoginRequest.php` (web).

**Missing validation surfaces:** Web POST endpoints (`ModelTrainingController::store`) use DTO `fromRequest` without dedicated FormRequest.

---

### Services / Actions / Helpers

| Module | Key pieces | Wired? |
|--------|------------|--------|
| **Auth** | JWT issue/refresh/revoke, `RegisterUserAction` | Yes |
| **Business** | CRUD actions + policies | Yes |
| **Psychometric** | `QuestionBank` (15 Q v1), `PsychometricNormalizer`, scoring action | API yes; UI no |
| **Payments** | `SyntheticStatementGeneratorService`, Chapa ingest/simulate, Ethiopian holiday calendar | API yes; UI no |
| **TimeSeries** | `DailyHeartbeatAggregatorService`, `RebuildDailyHeartbeatAction`, `heartbeat:aggregate` scheduled 01:00 | Yes |
| **Valuation** | `InferenceOrchestratorService`, `AiEngineClient`, `CalculateNpvAction`, `RunValuationAction`, `PersistShapExplanationsAction` | Yes |
| **Lending** | Create application, submit decision + adverse action | API yes; UI no |
| **Macroeconomics** | `UpsertExogenousFactorsAction` | API yes; UI no |
| **Governance** | Fairness calculator, training job submit/sync | API + admin UI partial |
| **Compliance** | Consent, erasure request, audit append | API only |

**Pattern:** DDD-style Actions + thin Services; config in `config/valuation.php`, `config/services.php` (AI engine).

---

### Auth & Permissions

- **API:** `tymon/jwt-auth`, guard `api`, refresh token families
- **Web:** Laravel session (Breeze), guard `web`
- **RBAC:** Spatie Permission; canonical roles `sme_owner`, `loan_officer`, `super_admin`; web aliases `sme-owner`, `loan-provider`, `super-admin`
- **Policies:** Registered in `AppServiceProvider` for 9 models
- **JWT claims:** `role`, `email` (single role name)

**PRD note:** API enforces permissions; web uses `role:` middleware on routes — dual system works but must seed both guards (`RolesAndPermissionsSeeder` does).

---

### API Status by module

| Module | API | Notes |
|--------|-----|-------|
| Auth | Complete | |
| Business | Complete | |
| Psychometric | Complete | No frontend |
| Payments (Chapa sim) | Complete | No frontend |
| Valuation | Complete | Depends on AI service + application state |
| Lending | Complete | Decisioning UI missing |
| Macroeconomics | Complete | Admin UI missing |
| Governance | Partial | Fairness/drift read; drift write action orphaned |
| Compliance | Partial | Erasure is request-only (no fulfilment job) |
| Training jobs | Complete | Proxied to Python |

---

### Architecture (backend)

- **Quality:** High for a thesis PoC — consistent domain boundaries, idempotency keys, audit logging on inference
- **Separation:** Controllers thin; good
- **Technical debt:** Dual auth (JWT API vs session web); post-valuation `processing` status; unused actions; Breeze dashboard copy unrelated to domain
- **Risks:** AI contract v2 drift; no integration tests; seeder required for demo data

### Current Backend Completion

**~78%** — Core thesis backend paths exist; finish = wire drift/incidents, web proxies for demo, status transitions, tests.

---

## Frontend Status

**Stack:** React 18 + Inertia 2 + Tailwind 3 + Headless UI. **No** Redux/Zustand/Context for domain state. **No** ECharts, Plotly, or Recharts in `package.json`.

**API layer:** `axios` in `bootstrap.ts` (CSRF only). **No** `/api/v1` hooks, no JWT storage, no React Query — web uses **server-driven Inertia props** only.

---

### Pages Overview

| Route / page | Role | Implementation | API / data |
|--------------|------|----------------|------------|
| `Landing` | Public | Complete (static) | None |
| `Auth/*` (Login, Register, etc.) | All | Complete (Breeze) | Session |
| `Dashboard` | All | **Placeholder** (wrong domain — “sales/stock”) | None |
| `Borrower/SmeValuation` | SME owner | **Partial** — summary, SHAP bars, forecast **table** | Inertia from `SmeValuationController`; POST run valuation |
| `Lender/RiskAndForecast` | Loan officer | **Partial** — pipeline table | Inertia; no detail/charts |
| `Admin/ModelTraining` | Super admin | **Partial** — health JSON, job table, queue/sync | Inertia POST to web routes |
| `Placeholders/Psychometrics` | SME owner | Placeholder | — |
| `Placeholders/Integrations` | SME owner | Placeholder | — |
| `Placeholders/ApplicationsPipeline` | Lender | Placeholder | — |
| `Placeholders/DecisioningAndXAI` | Lender | Placeholder | — |
| `Placeholders/MacroeconomicFactors` | Admin | Placeholder | — |
| `Placeholders/FairnessAudit` | Admin | Placeholder | — |
| `Profile/Edit` | All | Complete (Breeze) | Session |
| `Welcome` | Public | Legacy Laravel page | Likely unused (`/` → `Landing`) |

**Dead / unreferenced pages**
- `Pages/Placeholders/SMEValuation.tsx` — superseded by `Borrower/SmeValuation.tsx`
- `Pages/Placeholders/RiskAndForecast.tsx` — superseded by `Lender/RiskAndForecast.tsx`

---

### Components

**Shared (`resources/js/Components/`):** Breeze UI kit (buttons, inputs, modal, dropdown, `ThemeToggle`).

**Feature (`resources/js/features/valuation/`):**
- `ValuationSummary` — limit, NPV, risk class
- `ForecastBands` — **HTML table** (14 rows), not PRD chart
- `ShapDrivers` — horizontal bars, **not** SHAP waterfall

**Layout:** `AuthenticatedLayout` — production-quality sidebar, role-based nav, dark mode.

**Large/complex:** `AuthenticatedLayout.tsx` (~800 lines) — maintainable but heavy.

---

### State Management

- Inertia page props + `usePage()` only
- `localStorage` for sidebar UI preferences
- No global app store

---

### Forms

| Form | Backend connected |
|------|-------------------|
| Login / Register / Profile | Yes (session) |
| Run valuation (button) | Yes (web POST) |
| Model training queue/sync | Yes |
| Psychometric, Chapa connect, loan decision, macro factors | **No UI** |

---

### UI/UX Status

**Production-ready:** Auth flows, app shell, theme toggle, SME valuation layout (structure).

**Unfinished:** All PRD visualisations (P10 cone, 60-day history, SHAP waterfall), gamified psychometric, pipeline triage, reject modal with reason codes, macro admin form, fairness metrics display.

---

### Frontend Architecture

- **Organisation:** Pages + small `features/valuation` — good start, needs more feature folders
- **Maintainability:** OK; placeholder duplication risk
- **Debt:** Dashboard copy from unrelated template; no chart library; API-only features invisible to web users
- **Risks:** Defense depends on Leykun’s charts; 3-day sprint must prioritise Inertia pages over separate SPA

### Current Frontend Completion

**~38%** — Shell + 2.5 real pages; 6 PRD epics still placeholders.

---

## Major Problems

1. **PRD visual acceptance criteria unmet on frontend** — No ECharts P10/red cone, no SHAP waterfall summing to score, no 60-day historical heartbeat chart.
2. **Borrower onboarding not exposed in UI** — Psychometric + Chapa simulate exist only via API/`DevDemoSeeder`.
3. **Lender decisioning not exposed** — Reject-with-SHAP-reason-codes is API-only (`SubmitLoanDecisionAction`).
4. **Applications stuck in `processing` after valuation** — May be intentional pre-decision, but pipeline UX must clarify.
5. **AI engine single point of failure** — No graceful demo mode if Python service unavailable.
6. **Governance drift/security actions orphaned** — Tables empty without manual/script invocation.
7. **No domain tests** — Regression risk during 3-day push.
8. **Dead placeholder pages** — Confusing for navigation vs real routes.

---

## Recommended Next Priorities

### Day 1 — Demo path works end-to-end (backend + seed)

1. Run `RolesAndPermissionsSeeder` + `DevDemoSeeder`; verify FastAPI health and one full `POST .../valuate`.
2. Fix/document application status after valuation (`processing` → visible in lender pipeline with scores).
3. Add minimal web route or Inertia action to **trigger Chapa simulate** for logged-in SME owner (wrap existing API action via controller).

### Day 2 — Critical PRD screens (frontend)

4. **Psychometrics page** — fetch `GET /api/v1/psychometric/questions` or Inertia props; POST answers (may need web proxy or Sanctum-style session API).
5. **Integrations page** — “Connect Chapa” → simulate 60 days + heartbeat aggregate trigger.
6. **Applications pipeline** — replace placeholder; sort by `ai_risk_score`; link to detail.
7. Install **ECharts** (or agreed lib) — **Risk & Forecast** detail: history + P10/P50/P90 cone; upgrade `ShapDrivers` toward waterfall.

### Day 3 — Lender/admin + defense polish

8. **Decisioning & XAI** — approve/reject UI; reject forces reason code multi-select from application `reason_codes`/SHAP.
9. **Macroeconomic factors** + **Fairness audit** admin forms (wire to existing API).
10. Replace **Dashboard** with role-aware KPIs (pending apps, latest valuation, AI health).
11. Delete or redirect dead placeholder files; smoke-test role middleware (`sme-owner`, `loan-provider`, `super-admin`).
12. Optional: 2–3 feature tests for `RunValuationAction` / `CalculateNpvAction` / loan decision.

---

## Quick reference: demo users (`DevDemoSeeder`)

| Email | Role | Password |
|-------|------|----------|
| `admin@ethiosme.test` | super_admin | `password` |
| `officer@ethiosme.test` | loan_officer | `password` |
| `ato-girma-merkato-retail@test.et` (etc.) | sme_owner | `password` |

Three seeded SMEs: creditworthy / borderline / high_risk — psychometric + 60d transactions + loan application prepped for valuation.

---

*Generated from static analysis of the repository and PRD v3. Re-run after major merges.*
