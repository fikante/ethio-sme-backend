# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start all dev services (Laravel + queue + Vite hot reload)
composer run dev

# Run all tests (clears config cache first)
composer run test

# Run a single test file
php artisan test tests/Feature/Auth/RegistrationTest.php

# Run a single test method
php artisan test --filter=testMethodName

# PHP style linting
vendor/bin/pint

# Frontend build
npm run build
```

## Architecture Overview

This is an **SME lending valuation system** (thesis proof-of-concept) built with Laravel 12 + React/Inertia.js, following strict **Domain-Driven Design**.

### Domain Structure

All business logic lives in `app/Domain/`, organized into 10 modules:

| Domain | Responsibility |
|---|---|
| `Auth` | JWT issuance, user registration, role assignment |
| `Business` | SME business profile management |
| `Lending` | Loan applications, status machine, decisions |
| `Valuation` | AI-driven NPV scoring orchestration + SHAP persistence |
| `Psychometric` | Psychometric assessment submission & scoring |
| `Governance` | Fairness audits, model drift metrics, MLOps jobs |
| `Compliance` | Audit logs, GDPR consent, erasure requests |
| `Payments` | Chapa payment gateway + webhook simulator |
| `Macroeconomics` | Exogenous factor ingestion (inflation, interest rates) |
| `TimeSeries` | Business transaction heartbeat data ingestion |

Each domain follows this layout:
```
Domain/{Name}/
├── Actions/      # Single-purpose business operations (execute() method)
├── Services/     # Stateful domain services
├── Data/         # Spatie DTOs (type-safe request/response shapes)
├── Enums/        # Domain-specific enums
├── Policies/     # Laravel authorization policies
├── Requests/     # Form request validation
└── Exceptions/   # Domain exceptions
```

### Key Patterns

**Actions as command objects** — Each action encapsulates one business operation. Controllers call `Action::execute(SomeData $data)`. Actions own DB transactions.

**Spatie DTOs** — `laravel-data` DTOs are used for type-safe data passing across layers. Include `fromRequest()` factory methods. Never pass raw arrays between layers.

**Thin controllers** — Controllers authorize via policies, delegate to Actions/Services, and return responses only. Target ~30-50 lines per controller.

**Dual-guard auth** — JWT (`auth:api`) for API consumers; session-based (`auth:web`) for the Inertia frontend. Role middleware uses aliases: `sme-owner` (web) ↔ `sme_owner` (API).

### Loan Application State Machine

```
draft → submitted → pending_psychometric → pending_data_sync
     → queued_for_ai → processing → evaluated → {approved|rejected|withdrawn}
```

Status constants live on the `LoanApplication` model. Status transitions are guarded in `LoanApplicationService`.

### AI Engine Integration

The Python FastAPI valuation engine is called from `ValuationService`. Key env vars:
- `AI_SERVICE_URL` — base URL of the FastAPI service
- `AI_SERVICE_TOKEN` — shared secret
- `AI_SERVICE_CONTRACT_VERSION=v2`

Contract: `POST /valuation/run` → returns NPV score + SHAP values. Tests that invoke this will fail if the AI service is down.

### Frontend

React 18 + TypeScript + Inertia.js + Tailwind CSS 3. Pages live in `resources/js/Pages/`, shared components in `resources/js/Components/`. Vite 6 for bundling.

### Idempotency

`CreateLoanApplicationAction` checks for an existing application matching the `Idempotency-Key` header before creating a new one.

### Audit Trail

Models that implement `Auditable` (e.g., `LoanApplication`, `LoanProvider`) are automatically tracked by `owen-it/laravel-auditing` — every mutation is logged for compliance.

## Environment

Copy `.env.example` → `.env`. Key non-obvious variables:

```
JWT_SECRET           # Generate with: php artisan jwt:secret
AI_SERVICE_URL       # FastAPI Python valuation engine
AI_SERVICE_TOKEN     # Shared secret for AI service
```

Tests use SQLite in-memory (`:memory:`) as configured in `phpunit.xml`. Production targets PostgreSQL (Supabase).

## Seeding Demo Data

```bash
php artisan db:seed --class=DevDemoSeeder
```

Populates realistic demo data for thesis defense scenarios (borrowers, applications, valuations).
