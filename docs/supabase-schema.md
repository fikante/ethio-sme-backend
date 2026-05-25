# Supabase schema (source of truth)

Production PostgreSQL on Supabase is the canonical schema for this project. The AI microservice and Laravel app share this database.

**Do not run `php artisan migrate` against production Supabase** — tables already exist. Laravel migrations under `database/migrations/` are **historical** (local/dev reference only).

## Tables not on Supabase (intentional)

| Table | Notes |
|-------|--------|
| `raw_transactions` | Removed; heartbeat comes from CSV/AI seed data only |

## `sme_daily_heartbeat`

| Column | Type | Notes |
|--------|------|--------|
| `id` | bigint | PK |
| `business_uuid` | uuid | Join to `businesses.uuid` |
| `transaction_date` | date | |
| `daily_total_inflow` | numeric | |
| `daily_total_outflow` | numeric | |
| `net_cashflow` | numeric | **GENERATED** on production (`inflow - outflow`); never insert from Laravel |
| `source_type` | varchar(16) | e.g. `app_upload`, `csv_seed` — max 16 chars |
| `end_of_day_balance` | numeric | |
| `txn_count` | int | |
| `unique_cust_count` | int | |
| `channel` | varchar | |
| `sector_mcc` | varchar | |
| `location_region` | varchar | |
| `acct_opening_date` | date | nullable |
| `ingest_seed` | bigint | nullable |
| `created_at`, `updated_at` | timestamp | |

## `valuations`

AI inference output. Linked from `loan_applications.valuation_id`.

| Column | Type |
|--------|------|
| `id` | bigint |
| `business_id` | bigint FK |
| `ai_risk_score`, `ai_risk_band`, `prob_default` | numeric/varchar |
| `cashflow_haircut`, `horizon_days` | numeric/int |
| `effective_discount_rate`, `apr` | numeric |
| `npv_credit_limit`, `dscr_p10` | numeric |
| `p10_cashflow_forecast`, `p50_cashflow_forecast`, `p90_cashflow_forecast` | jsonb |
| `shap_values`, `reason_codes`, `model_versions` | jsonb |
| `forecaster_mode`, `contract_version`, `feature_snapshot_hash` | varchar |
| `inferred_at` | timestamp |
| `created_at`, `updated_at` | timestamp |

## `loan_applications`

| Column | Type | Notes |
|--------|------|--------|
| `valuation_id` | bigint | FK → `valuations.id` |
| `snapshot_limit_etb` | numeric | |
| `contract_version`, `model_versions`, `feature_snapshot_hash` | | |
| `ai_risk_band`, `prob_default`, `snapshot_risk_score` | | |
| No `npv_credit_limit` / forecast JSON on this row — use `valuation` relation |

## `exogenous_factors`

| Column | Type |
|--------|------|
| `nbe_policy_rate` | numeric |
| `food_inflation`, `non_food_inflation`, `inflation_composite` | numeric |
| `usd_etb_rate`, `fuel_price_retail` | numeric |
| `is_current` | boolean |
| `effective_date` | date |
| `updated_by` | bigint FK |

Laravel maps admin `inflation_rate` ↔ `inflation_composite`.

## `businesses` (extra columns)

`tin_number`, `trade_license_no`, `premises_status`, `employee_count`, `monthly_rent`, `data_source`, `simulation_seed`, `uuid`, soft deletes.

## `sme_loan_history`

AI-only table; optional read-only use from Laravel. Not in Laravel migrations.

## Data requirement

`businesses.uuid` must match `sme_daily_heartbeat.business_uuid` for the loan application UI to show transaction history.

## Demo accounts (after `php artisan db:seed`)

| Email | Password | Role |
|-------|----------|------|
| `admin@ethiosme.test` | `password` | Super admin |
| `officer@ethiosme.test` | `password` | Loan officer |
| `ato-girma-merkato-retail@test.et` | `password` | SME owner (demo) |

Web **registration** always creates an **SME owner** only. Admin and loan officer accounts come from the seeder, not the register form.
