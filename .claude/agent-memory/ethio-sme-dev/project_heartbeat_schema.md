---
name: project-heartbeat-schema
description: SmeDailyHeartbeat has a dual-schema (Supabase vs SQLite) — always use SupabaseHeartbeatSchema helpers, never hardcode column names
metadata:
  type: project
---

`SmeDailyHeartbeat` uses `SupabaseHeartbeatSchema` to resolve column names at runtime:
- `dateColumn()` → `heartbeat_date` (Supabase/Postgres) or `transaction_date` (SQLite)
- `txnCountColumn()` → `transaction_count` (Supabase) or `txn_count` (SQLite)
- `inflowColumn()` / `outflowColumn()` → similar dual mapping
- `businessFkColumn()` → `business_id` (Supabase) or `business_uuid` (SQLite)

The model has a `scopeForBusiness(Builder $query, Business $business)` scope that handles the FK switching automatically.

`net_cashflow` may be a GENERATED column on Postgres — never include it in inserts.

**How to apply:** When querying `SmeDailyHeartbeat` by column name directly (e.g., `orderByDesc`, `avg`, `where`), always call `SupabaseHeartbeatSchema::dateColumn()` etc. instead of hardcoding `'heartbeat_date'`.
